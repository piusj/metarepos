export function readmeMd(name: string): string {
  return `# ${name}

This is a **metarepo** — a root folder that groups several git repos into a single working directory, providing shared context for coding agents.

## Why a metarepo?

If your work spans several repos, coding agents like Claude Code can't see the bigger picture — each repo is just a working directory with no shared view of how the services relate, who depends on whom, or which branches belong together.

A metarepo fixes that without forcing you to either extreme:

- **Not a monorepo.** Repos keep their own history, ownership, CI, and deploy pipelines.
- **Not a custom context MCP.** No server to build, host, or maintain — it's just a folder with symlinks (or clones) and a few markdown files.

Once the shared-context lens is in place, the agent can:

- Make coordinated changes across services in one flow — migrations, CI tweaks, infra updates, consumer patches — figuring out which repos to touch without being told.
- Work across different languages, build tools, and test setups, adapting per repo.
- Create matching branches (and optional worktrees) across every affected repo for a single feature or fix.
- Open, review, and merge PRs per repo, then sequence the deploys.
- Reason about how a change in one service will break others before you ship.

Tested on real cross-cutting work including infra, CI/CD, and test changes.

## Structure

- \`repos/\` — managed service repos (symlinked or cloned; see \`metarepo.config.json\`).
- \`docs/\` — shared context, plans, designs.
- \`scripts/init-repos.mjs\` — idempotent materializer. Re-run after editing the config.
- \`AGENTS.md\` / \`CLAUDE.md\` — instructions for coding agents.
- \`META-ARCH-PROMPT.md\` — a ready-to-use prompt for generating a shared architecture doc with your coding agent.
- \`META-ROOT.md\` — root marker file.

## Materializing repos

\`\`\`bash
node scripts/init-repos.mjs
\`\`\`

Edit \`metarepo.config.json\` to add or remove repos, then re-run the command. It only touches missing entries.

## Git status across all repos

\`\`\`bash
bash scripts/git-status.sh
\`\`\`

Prints a colour-coded summary of each repo under \`repos/\` plus any active worktrees under \`.worktrees/\`: current branch, ahead/behind upstream, staged/modified/untracked counts. Useful for checking the state of coordinated cross-repo work at a glance.

**Tip:** If you're using Claude Code, you can turn this script into a skill by creating \`.claude/skills/metarepo-git-status/SKILL.md\` that invokes \`bash scripts/git-status.sh\` — then just say "check git status" to trigger it.

## Open in VSCode

\`\`\`bash
code meta.code-workspace
\`\`\`

Or in VSCode: **File → Open Workspace from File…** and select \`meta.code-workspace\`.

The workspace registers the metarepo root plus each repo under \`repos/\` as separate workspace folders. Benefits:

- **Cleaner VSCode UI without constraining the agent.** The editor shows one tree per repo, while the agent still operates against the full metarepo on disk.
- **Per-folder include/exclude tuning.** Narrow VSCode's indexing and search to just the files you care about (e.g. only frontend, only backend) by editing per-folder \`files.exclude\` / \`search.exclude\` rules — without affecting what the agent can read.
- **Clear separation between VSCode's view and the agent's view.** Useful when you want your editor scoped tightly but still want the agent to reason across every service.
`;
}
