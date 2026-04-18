export function agentsMd(name) {
    return `# Agent Instructions for ${name}

## Overview

This directory is a **metarepo** — a root folder that groups several git repos into a single working directory so coding agents (like you) can hold shared context across them. The repos themselves live under \`repos/\` as either symlinks to existing local clones or direct git clones, defined in [metarepo.config.json](./metarepo.config.json).

## META-ROOT.md marker

A file named \`META-ROOT.md\` lives at the metarepo root. It is a marker — its contents do not matter. To check whether you are operating inside this metarepo, walk up from your current working directory until you find \`META-ROOT.md\`; that directory is the metarepo root.

## Directory structure

- \`repos/\` — managed service repos (each is a real git working directory, either symlinked or cloned).
- \`docs/\` — shared context, plans, and design notes that apply across repos. Prefer writing cross-cutting work here. Per-repo docs still live inside the repo.
- \`scripts/\` — helper scripts, including \`init-repos.mjs\` (the idempotent materializer).
- \`.worktrees/\` — git worktrees created for feature work (see Worktrees below). Gitignored.
- \`metarepo.config.json\` — declares which repos are symlinked and which are cloned.
- \`META-ROOT.md\` — root marker (above).

## Managed repos

The repos listed in \`metarepo.config.json\` are real working directories. Treat them as first-class git repos: commit, branch, push, and pull inside each as normal.

## Cross-repo branch naming

When a change spans multiple repos for the same feature, bugfix, or coordinated set of changes, create branches with the **same name** in each affected repo (e.g., \`feat/checkout-redesign\` in both \`repos/web\` and \`repos/api\`). This lets humans and other agents correlate work across repos at a glance.

Suggested conventions:
- \`feat/<slug>\` for features
- \`fix/<slug>\` for bugfixes
- \`chore/<slug>\` for maintenance

## Worktrees

When the user asks for a worktree to work on a feature, create it under \`.worktrees/<branch-name>/<repo-name>\` at the metarepo root. Use the **same branch name** across all affected repos. Only create worktrees for repos the feature actually touches.

Example for branch \`feat/checkout-redesign\` touching \`web\` and \`api\`:

\`\`\`
.worktrees/feat/checkout-redesign/web
.worktrees/feat/checkout-redesign/api
\`\`\`

## Adding or removing repos

Edit \`metarepo.config.json\`, then re-run:

\`\`\`bash
node scripts/init-repos.mjs
\`\`\`

It is idempotent: it only creates symlinks or clones repos that are missing from \`repos/\`. It does not remove or alter existing entries on disk.

## Shared context in \`docs/\`

Write plans, designs, runbooks, and cross-cutting notes into \`docs/\` at the metarepo root so they apply across all repos. Per-repo documentation (READMEs, per-service runbooks) still belongs inside the repo it describes.
`;
}
