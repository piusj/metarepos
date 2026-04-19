export function gitStatusSh(): string {
  return `#!/usr/bin/env bash
# Reports git branch and uncommitted changes for every repo under repos/,
# plus any active worktrees per repo. Run from anywhere inside the metarepo.
set -euo pipefail

find_meta_root() {
  local cur="\$1"
  while [ "\$cur" != "/" ]; do
    if [ -f "\$cur/META-ROOT.md" ]; then
      echo "\$cur"
      return 0
    fi
    cur=\$(dirname "\$cur")
  done
  return 1
}

SCRIPT_DIR="\$(cd "\$(dirname "\$0")" && pwd -P)"
ROOT_DIR=\$(find_meta_root "\$SCRIPT_DIR") || {
  echo "Error: could not find META-ROOT.md walking up from \$SCRIPT_DIR" >&2
  exit 1
}
# Resolve to canonical path so comparisons match git's own path reporting
# (on macOS /var/folders symlinks to /private/var/folders, etc.)
ROOT_DIR="\$(cd "\$ROOT_DIR" && pwd -P)"

REPOS_DIR="\$ROOT_DIR/repos"

# Colors only when writing to a terminal. When piped or captured (for example,
# an IDE bash-output panel), emit plain text so ANSI escapes do not leak as
# literal "ESC[...m" noise.
if [ -t 1 ]; then
  RED=\$'\\033[0;31m'
  GREEN=\$'\\033[0;32m'
  YELLOW=\$'\\033[0;33m'
  CYAN=\$'\\033[0;36m'
  BOLD=\$'\\033[1m'
  DIM=\$'\\033[2m'
  RESET=\$'\\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; DIM=''; RESET=''
fi

COL_NAME=34
COL_BRANCH=14
COL_UPSTREAM=10
WT_COL_PATH=44
WT_COL_PROJECT=16
WT_COL_BRANCH=20

# Pad a cell that may contain ANSI SGR sequences to a fixed visible width.
# Visible width == character count after stripping \\033[...m escapes.
pad_cell() {
  local content="\$1" width="\$2"
  local stripped="\$content"
  local esc=\$'\\033['
  while [[ "\$stripped" == *"\$esc"* ]]; do
    local prefix="\${stripped%%"\$esc"*}"
    local rest="\${stripped#*"\$esc"}"
    stripped="\${prefix}\${rest#*m}"
  done
  local vlen=\${#stripped}
  local pad=\$((width - vlen))
  if [ "\$pad" -lt 0 ]; then pad=0; fi
  printf '%s%*s' "\$content" "\$pad" ''
}

print_divider() {
  local len="\$1" i
  printf '     %s' "\$DIM"
  for (( i = 0; i < len; i++ )); do printf '─'; done
  printf '%s\\n' "\$RESET"
}

printf '%sGit status for metarepo at %s%s\\n\\n' "\$BOLD" "\$ROOT_DIR" "\$RESET"

dirs_to_check=()
non_git_entries=()
[ -d "\$ROOT_DIR/.git" ] && dirs_to_check+=("\$ROOT_DIR")
if [ -d "\$REPOS_DIR" ]; then
  shopt -s nullglob
  for d in "\$REPOS_DIR"/*/; do
    entry="\${d%/}"
    # Skip the .gitkeep placeholder (it's a file, not a directory)
    [ "\$(basename "\$entry")" = ".gitkeep" ] && continue
    if [ -e "\$entry/.git" ]; then
      dirs_to_check+=("\$entry")
    else
      non_git_entries+=("\$entry")
    fi
  done
  shopt -u nullglob
fi

if [ "\${#dirs_to_check[@]}" -eq 0 ] && [ "\${#non_git_entries[@]}" -eq 0 ]; then
  printf '%sNo entries found under %s%s\\n' "\$YELLOW" "\$REPOS_DIR" "\$RESET"
  exit 0
fi

printf '%sFetching upstream changes...%s' "\$DIM" "\$RESET" >&2
fetch_pids=()
for dir in "\${dirs_to_check[@]}"; do
  git -C "\$dir" fetch --quiet 2>/dev/null &
  fetch_pids+=(\$!)
done
for pid in "\${fetch_pids[@]}"; do
  wait "\$pid" 2>/dev/null || true
done
if [ -t 2 ]; then
  printf '\\r\\033[K' >&2
else
  printf '\\n' >&2
fi

# Projects header (5-space indent matches body's "  ICON  " prefix)
printf '     %s%-*s  %-*s  %-*s  %s%s\\n' \\
  "\$BOLD" \\
  "\$COL_NAME" "PROJECT" \\
  "\$COL_BRANCH" "BRANCH" \\
  "\$COL_UPSTREAM" "UPSTREAM" \\
  "CHANGES" "\$RESET"
print_divider \$((COL_NAME + COL_BRANCH + COL_UPSTREAM + 2 + 2 + 2 + 7))

total=0
clean=0
dirty=0
behind_count=0

for dir in "\${dirs_to_check[@]}"; do
  total=\$((total + 1))

  if [ "\$dir" = "\$ROOT_DIR" ]; then
    name="(meta-repo)"
  else
    name=\$(basename "\$dir")
  fi

  branch=\$(git -C "\$dir" symbolic-ref --short HEAD 2>/dev/null || git -C "\$dir" rev-parse --short HEAD 2>/dev/null || echo "unknown")

  staged_files=\$(git -C "\$dir" diff --cached --name-only 2>/dev/null)
  modified_files=\$(git -C "\$dir" diff --name-only 2>/dev/null)
  untracked_files=\$(git -C "\$dir" ls-files --others --exclude-standard 2>/dev/null)

  count_lines() { if [ -z "\$1" ]; then echo 0; else echo "\$1" | wc -l | tr -d ' '; fi; }
  staged=\$(count_lines "\$staged_files")
  modified=\$(count_lines "\$modified_files")
  untracked=\$(count_lines "\$untracked_files")

  changes=""
  file_details=""
  if [ "\$staged" -gt 0 ]; then
    changes="\${changes} \${GREEN}+\${staged} staged\${RESET}"
    while IFS= read -r f; do
      file_details+=\$'\\n'"         \${GREEN}+ \${f}\${RESET}"
    done <<< "\$staged_files"
  fi
  if [ "\$modified" -gt 0 ]; then
    changes="\${changes} \${YELLOW}~\${modified} modified\${RESET}"
    while IFS= read -r f; do
      file_details+=\$'\\n'"         \${YELLOW}~ \${f}\${RESET}"
    done <<< "\$modified_files"
  fi
  if [ "\$untracked" -gt 0 ]; then
    changes="\${changes} \${RED}?\${untracked} untracked\${RESET}"
    while IFS= read -r f; do
      file_details+=\$'\\n'"         \${RED}? \${f}\${RESET}"
    done <<< "\$untracked_files"
  fi
  changes="\${changes# }"

  ahead_behind=""
  tracking=\$(git -C "\$dir" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)
  if [ -n "\$tracking" ]; then
    ahead=\$(git -C "\$dir" rev-list --count '@{upstream}..HEAD' 2>/dev/null || echo 0)
    behind=\$(git -C "\$dir" rev-list --count 'HEAD..@{upstream}' 2>/dev/null || echo 0)
    if [ "\$ahead" -gt 0 ] && [ "\$behind" -gt 0 ]; then
      ahead_behind="\${YELLOW}↑\${ahead} ↓\${behind}\${RESET}"
      behind_count=\$((behind_count + 1))
    elif [ "\$ahead" -gt 0 ]; then
      ahead_behind="\${GREEN}↑\${ahead}\${RESET}"
    elif [ "\$behind" -gt 0 ]; then
      ahead_behind="\${RED}↓\${behind}\${RESET}"
      behind_count=\$((behind_count + 1))
    fi
  fi

  if [ "\$branch" = "main" ] || [ "\$branch" = "master" ]; then
    branch_display="\${DIM}\${branch}\${RESET}"
  else
    branch_display="\${CYAN}\${branch}\${RESET}"
  fi

  if [ -z "\$changes" ]; then
    clean=\$((clean + 1))
    icon="\${GREEN}✓\${RESET}"
  else
    dirty=\$((dirty + 1))
    icon="\${YELLOW}●\${RESET}"
  fi

  printf '  %s  ' "\$icon"
  pad_cell "\$name" "\$COL_NAME"
  printf '  '
  pad_cell "\$branch_display" "\$COL_BRANCH"
  printf '  '
  pad_cell "\$ahead_behind" "\$COL_UPSTREAM"
  printf '  %s\\n' "\$changes"

  [ -n "\$file_details" ] && printf '%s\\n' "\$file_details"
done

non_git_count=0
if [ "\${#non_git_entries[@]}" -gt 0 ]; then
  for entry in "\${non_git_entries[@]}"; do
    non_git_count=\$((non_git_count + 1))
    total=\$((total + 1))
    name=\$(basename "\$entry")
    printf '  %s⚠%s  ' "\$YELLOW" "\$RESET"
    pad_cell "\$name" "\$COL_NAME"
    printf "  %snot a git repo — run 'git init' inside repos/%s%s\\n" "\$DIM" "\$name" "\$RESET"
  done
fi

behind_summary=""
[ "\$behind_count" -gt 0 ] && behind_summary=", \${RED}\${behind_count} behind upstream\${RESET}"
non_git_summary=""
[ "\$non_git_count" -gt 0 ] && non_git_summary=", \${YELLOW}\${non_git_count} not a git repo\${RESET}"
printf '\\n%sSummary:%s %d entries — %s%d clean%s, %s%d with changes%s%s%s\\n' \\
  "\$BOLD" "\$RESET" "\$total" \\
  "\$GREEN" "\$clean" "\$RESET" \\
  "\$YELLOW" "\$dirty" "\$RESET" \\
  "\$behind_summary" "\$non_git_summary"

# --- Worktree section ---
worktree_count=0
worktree_rows=()
SEP=\$'\\x1f'

collect_worktree() {
  local wt_path="\$1" wt_branch="\$2" wt_head="\$3" project_name="\$4"
  [ -z "\$wt_path" ] && return
  worktree_count=\$((worktree_count + 1))
  local wt_display="\$wt_path"
  case "\$wt_path" in
    "\$ROOT_DIR/.worktrees/"*)
      wt_display=".worktrees/\${wt_path#\$ROOT_DIR/.worktrees/}"
      ;;
  esac
  local wt_branch_display="\${CYAN}\${wt_branch:-detached}\${RESET}"

  local wt_changes=""
  if [ -d "\$wt_path" ]; then
    local s m u
    s=\$(git -C "\$wt_path" diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
    m=\$(git -C "\$wt_path" diff --name-only 2>/dev/null | wc -l | tr -d ' ')
    u=\$(git -C "\$wt_path" ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
    [ "\$s" -gt 0 ] && wt_changes="\${wt_changes} \${GREEN}+\${s} staged\${RESET}"
    [ "\$m" -gt 0 ] && wt_changes="\${wt_changes} \${YELLOW}~\${m} modified\${RESET}"
    [ "\$u" -gt 0 ] && wt_changes="\${wt_changes} \${RED}?\${u} untracked\${RESET}"
  else
    wt_changes="\${RED}(path missing)\${RESET}"
  fi
  wt_changes="\${wt_changes# }"

  local status_icon="\${GREEN}✓\${RESET}"
  [ -n "\$wt_changes" ] && status_icon="\${YELLOW}●\${RESET}"

  worktree_rows+=("\${status_icon}\${SEP}\${wt_display}\${SEP}\${project_name}\${SEP}\${wt_branch_display}\${SEP}\${wt_changes}")
}

for dir in "\${dirs_to_check[@]}"; do
  if [ "\$dir" = "\$ROOT_DIR" ]; then
    project_name="(meta-repo)"
  else
    project_name=\$(basename "\$dir")
  fi

  worktree_list=\$(git -C "\$dir" worktree list --porcelain 2>/dev/null || true)
  [ -z "\$worktree_list" ] && continue

  is_first=true
  wt_path=""
  wt_branch=""
  wt_head=""
  while IFS= read -r line; do
    case "\$line" in
      "worktree "*)
        if \$is_first; then
          is_first=false
          wt_path=""
          wt_branch=""
          wt_head=""
          continue
        fi
        collect_worktree "\$wt_path" "\$wt_branch" "\$wt_head" "\$project_name"
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
  done <<< "\$worktree_list"

  if [ -n "\$wt_path" ] && ! \$is_first; then
    collect_worktree "\$wt_path" "\$wt_branch" "\$wt_head" "\$project_name"
  fi
done

if [ "\$worktree_count" -gt 0 ]; then
  printf '\\n%sWorktrees:%s %d active\\n\\n' "\$BOLD" "\$RESET" "\$worktree_count"
  printf '     %s%-*s  %-*s  %-*s  %s%s\\n' \\
    "\$BOLD" \\
    "\$WT_COL_PATH" "WORKTREE" \\
    "\$WT_COL_PROJECT" "FROM" \\
    "\$WT_COL_BRANCH" "BRANCH" \\
    "CHANGES" "\$RESET"
  print_divider \$((WT_COL_PATH + WT_COL_PROJECT + WT_COL_BRANCH + 2 + 2 + 2 + 7))

  for row in "\${worktree_rows[@]}"; do
    IFS="\$SEP" read -r icon wt_display project_name wt_branch_display wt_changes <<< "\$row"
    printf '  %s  ' "\$icon"
    pad_cell "\$wt_display" "\$WT_COL_PATH"
    printf '  '
    pad_cell "\$project_name" "\$WT_COL_PROJECT"
    printf '  '
    pad_cell "\$wt_branch_display" "\$WT_COL_BRANCH"
    printf '  %s\\n' "\$wt_changes"
  done
fi
`;
}
