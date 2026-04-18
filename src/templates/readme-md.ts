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
`;
}
