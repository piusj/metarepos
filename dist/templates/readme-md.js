export function readmeMd(name) {
    return `# ${name}

This is a **metarepo** — a root folder that groups several git repos into a single working directory, providing shared context for coding agents.

## Structure

- \`repos/\` — managed service repos (symlinked or cloned; see \`metarepo.config.json\`).
- \`docs/\` — shared context, plans, designs.
- \`scripts/init-repos.mjs\` — idempotent materializer. Re-run after editing the config.
- \`AGENTS.md\` / \`CLAUDE.md\` — instructions for coding agents.
- \`META-ROOT.md\` — root marker file.

## Materializing repos

\`\`\`bash
node scripts/init-repos.mjs
\`\`\`

Edit \`metarepo.config.json\` to add or remove repos, then re-run the command. It only touches missing entries.
`;
}
