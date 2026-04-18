export function gitStatusSh(): string {
  return `#!/usr/bin/env bash
# Reports git branch and uncommitted changes for every repo under repos/,
# plus any active worktrees per repo. Run from anywhere inside the metarepo.
set -euo pipefail

find_meta_root() {
  local cur="$1"
  while [ "$cur" != "/" ]; do
    if [ -f "$cur/META-ROOT.md" ]; then
      echo "$cur"
      return 0
    fi
    cur=$(dirname "$cur")
  done
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR=$(find_meta_root "$SCRIPT_DIR") || {
  echo "Error: could not find META-ROOT.md walking up from $SCRIPT_DIR" >&2
  exit 1
}

REPOS_DIR="$ROOT_DIR/repos"

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
CYAN='\\033[0;36m'
BOLD='\\033[1m'
DIM='\\033[2m'
RESET='\\033[0m'

printf "\${BOLD}Git status for metarepo at %s\${RESET}\\n\\n" "$ROOT_DIR"

dirs_to_check=()
[ -d "$ROOT_DIR/.git" ] && dirs_to_check+=("$ROOT_DIR")
if [ -d "$REPOS_DIR" ]; then
  for d in "$REPOS_DIR"/*/; do
    [ -e "$d/.git" ] || continue
    dirs_to_check+=("\${d%/}")
  done
fi

if [ "\${#dirs_to_check[@]}" -eq 0 ]; then
  printf "\${YELLOW}No git repositories found under %s\${RESET}\\n" "$REPOS_DIR"
  exit 0
fi

printf "\${DIM}Fetching upstream changes...\${RESET}" >&2
fetch_pids=()
for dir in "\${dirs_to_check[@]}"; do
  git -C "$dir" fetch --quiet 2>/dev/null &
  fetch_pids+=($!)
done
for pid in "\${fetch_pids[@]}"; do
  wait "$pid" 2>/dev/null || true
done
printf "\\r\\033[K" >&2

total=0
clean=0
dirty=0
behind_count=0

for dir in "\${dirs_to_check[@]}"; do
  total=$((total + 1))

  if [ "$dir" = "$ROOT_DIR" ]; then
    name="(meta-repo)"
  else
    name=$(basename "$dir")
  fi

  branch=$(git -C "$dir" symbolic-ref --short HEAD 2>/dev/null || git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo "unknown")

  staged_files=$(git -C "$dir" diff --cached --name-only 2>/dev/null)
  modified_files=$(git -C "$dir" diff --name-only 2>/dev/null)
  untracked_files=$(git -C "$dir" ls-files --others --exclude-standard 2>/dev/null)

  count_lines() { if [ -z "$1" ]; then echo 0; else echo "$1" | wc -l | tr -d ' '; fi; }
  staged=$(count_lines "$staged_files")
  modified=$(count_lines "$modified_files")
  untracked=$(count_lines "$untracked_files")

  changes=""
  file_details=""
  if [ "$staged" -gt 0 ]; then
    changes="\${changes} \${GREEN}+$staged staged\${RESET}"
    while IFS= read -r f; do
      file_details="\${file_details}\\n         \${GREEN}+ $f\${RESET}"
    done <<< "$staged_files"
  fi
  if [ "$modified" -gt 0 ]; then
    changes="\${changes} \${YELLOW}~$modified modified\${RESET}"
    while IFS= read -r f; do
      file_details="\${file_details}\\n         \${YELLOW}~ $f\${RESET}"
    done <<< "$modified_files"
  fi
  if [ "$untracked" -gt 0 ]; then
    changes="\${changes} \${RED}?$untracked untracked\${RESET}"
    while IFS= read -r f; do
      file_details="\${file_details}\\n         \${RED}? $f\${RESET}"
    done <<< "$untracked_files"
  fi

  ahead_behind=""
  tracking=$(git -C "$dir" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)
  if [ -n "$tracking" ]; then
    ahead=$(git -C "$dir" rev-list --count '@{upstream}..HEAD' 2>/dev/null || echo 0)
    behind=$(git -C "$dir" rev-list --count 'HEAD..@{upstream}' 2>/dev/null || echo 0)
    if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
      ahead_behind="\${YELLOW}↑$ahead ↓$behind\${RESET}"
      behind_count=$((behind_count + 1))
    elif [ "$ahead" -gt 0 ]; then
      ahead_behind="\${GREEN}↑$ahead\${RESET}"
    elif [ "$behind" -gt 0 ]; then
      ahead_behind="\${RED}↓$behind\${RESET}"
      behind_count=$((behind_count + 1))
    fi
  fi

  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    branch_display="\${DIM}$branch\${RESET}"
  else
    branch_display="\${CYAN}$branch\${RESET}"
  fi

  suffix=""
  [ -n "$ahead_behind" ] && suffix="  $ahead_behind"
  [ -n "$changes" ] && suffix="\${suffix}  $changes"

  if [ -z "$changes" ]; then
    clean=$((clean + 1))
    printf "  \${GREEN}✓\${RESET}  %-35s %b%b\\n" "$name" "$branch_display" "$suffix"
  else
    dirty=$((dirty + 1))
    printf "  \${YELLOW}●\${RESET}  %-35s %b%b\\n" "$name" "$branch_display" "$suffix"
    printf "%b\\n" "$file_details"
  fi
done

behind_summary=""
if [ "$behind_count" -gt 0 ]; then
  behind_summary=", \${RED}$behind_count behind upstream\${RESET}"
fi
printf "\\n\${BOLD}Summary:\${RESET} %d repos — \${GREEN}%d clean\${RESET}, \${YELLOW}%d with changes\${RESET}%b\\n" "$total" "$clean" "$dirty" "$behind_summary"

worktree_count=0
worktree_output=""

emit_worktree() {
  local wt_path="$1" wt_branch="$2" wt_head="$3" project_name="$4"
  [ -z "$wt_path" ] && return
  worktree_count=$((worktree_count + 1))
  local wt_display="$wt_path"
  case "$wt_path" in
    "$ROOT_DIR/.worktrees/"*)
      wt_display=".worktrees/\${wt_path#$ROOT_DIR/.worktrees/}"
      ;;
  esac
  local wt_branch_display="\${CYAN}\${wt_branch:-detached}\${RESET}"

  local wt_changes=""
  if [ -d "$wt_path" ]; then
    local s m u
    s=$(git -C "$wt_path" diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
    m=$(git -C "$wt_path" diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    u=$(git -C "$wt_path" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
    [ "$s" -gt 0 ] && wt_changes="\${wt_changes} \${GREEN}+$s staged\${RESET}"
    [ "$m" -gt 0 ] && wt_changes="\${wt_changes} \${YELLOW}~$m modified\${RESET}"
    [ "$u" -gt 0 ] && wt_changes="\${wt_changes} \${RED}?$u untracked\${RESET}"
  else
    wt_changes=" \${RED}(path missing)\${RESET}"
  fi

  local status_icon="\${GREEN}✓\${RESET}"
  [ -n "$wt_changes" ] && status_icon="\${YELLOW}●\${RESET}"
  worktree_output="\${worktree_output}$(printf "  %b  %-40s ← %-15s %b%b" "$status_icon" "$wt_display" "$project_name" "$wt_branch_display" "$wt_changes")\\n"
}

for dir in "\${dirs_to_check[@]}"; do
  if [ "$dir" = "$ROOT_DIR" ]; then
    project_name="(meta-repo)"
  else
    project_name=$(basename "$dir")
  fi

  worktree_list=$(git -C "$dir" worktree list --porcelain 2>/dev/null || true)
  [ -z "$worktree_list" ] && continue

  is_first=true
  wt_path=""
  wt_branch=""
  wt_head=""
  while IFS= read -r line; do
    case "$line" in
      "worktree "*)
        if $is_first; then
          is_first=false
          wt_path=""
          wt_branch=""
          wt_head=""
          continue
        fi
        emit_worktree "$wt_path" "$wt_branch" "$wt_head" "$project_name"
        wt_path="\${line#worktree }"
        wt_branch=""
        wt_head=""
        ;;
      "branch "*)
        wt_branch="\${line#branch refs/heads/}"
        ;;
      "HEAD "*)
        wt_head="\${line#HEAD }"
        ;;
      "detached")
        wt_branch="detached@\${wt_head:0:7}"
        ;;
    esac
  done <<< "$worktree_list"

  if [ -n "$wt_path" ] && ! $is_first; then
    emit_worktree "$wt_path" "$wt_branch" "$wt_head" "$project_name"
  fi
done

if [ "$worktree_count" -gt 0 ]; then
  printf "\\n\${BOLD}Worktrees:\${RESET} %d active\\n\\n" "$worktree_count"
  printf "%b" "$worktree_output"
fi
`;
}
