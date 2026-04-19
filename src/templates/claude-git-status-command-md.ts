export function claudeGitStatusCommandMd(): string {
  return `---
description: Run the metarepo git-status report — branch, dirty files, ahead/behind, and active worktrees for every repo under repos/
allowed-tools: Bash(bash scripts/git-status.sh)
---

Run the metarepo's cross-repo git status report:

Find the meta-repo root (walks up until it finds \`META-ROOT.md\`), then run the status script:

\`\`\`
META_ROOT="$PWD"; while [ ! -f "$META_ROOT/META-ROOT.md" ] && [ "$META_ROOT" != "/" ]; do META_ROOT="$(dirname "$META_ROOT")"; done; bash "$META_ROOT/scripts/git-status.sh"
\`\`\`

If the user passes arguments after \`/git-status\`, treat them as additional context about what they're trying to learn from the report (e.g. "which repos are behind?") and follow up with a focused answer included in the summary below.

After running, summarize the results for the user in a readable table showing:
- Project name
- Current branch
- Whether there are uncommitted changes (staged, modified, untracked)
- Active worktrees (name, parent project, branch, and any uncommitted changes)
`;
}
