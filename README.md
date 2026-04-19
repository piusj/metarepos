# metarepos

A one-shot CLI that scaffolds a **metarepo** — a root folder grouping several git repos into a single working directory, providing shared context for coding agents (Claude Code, etc.).

After running `metarepos init`, the CLI is no longer needed. The generated metarepo is yours to manage.

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

## Prerequisites

- **GitHub CLI (`gh`)** installed and authenticated (`gh auth status` succeeds). Needed when you clone SSH URLs through `scripts/init-repos.mjs`.
- **Node.js ≥ 20** and **npm** installed (npm ships with Node; no npm account required for running `npx`).

## Usage

```bash
npx piusj/metarepos init
```

You'll be prompted for:

1. The metarepo name (directory to create in your current working directory).
2. A list of repos, each either:
   - **symlink** — link an existing local clone into `repos/`, or
   - **clone** — `git clone <url>` into `repos/`.

The CLI then writes the scaffold files, merges your answers into `metarepo.config.json`, runs `git init`, and runs `scripts/init-repos.mjs` to materialize your repos. Everything it does is idempotent; re-running is safe.

### Non-interactive mode

For CI or scripted setup, pass a JSON answers file:

```bash
npx -y piusj/metarepos init --config answers.json
```

Answer file shape:

```json
{
  "name": "my-metarepo",
  "repos": [
    { "kind": "symlink", "name": "api", "path": "/absolute/path/to/api" },
    { "kind": "clone", "name": "web", "url": "git@github.com:org/web.git" }
  ]
}
```

## What gets generated

```
<name>/
├── repos/                  # target for clones and symlinks
├── docs/                   # shared context, plans, designs
├── scripts/
│   ├── init-repos.mjs      # idempotent materializer (re-run any time)
│   └── git-status.sh       # cross-repo git status report (branches + worktrees)
├── AGENTS.md               # main agent-context doc
├── CLAUDE.md               # one-liner pointing to AGENTS.md
├── META-ROOT.md            # metarepo-root marker
├── META-ARCH-PROMPT.md     # ready-to-use prompt for generating META-ARCH.md with your agent
├── README.md               # editable metarepo README
├── metarepo.config.json    # repo declarations
├── meta.code-workspace     # VSCode multi-root workspace (one folder per repo)
└── .gitignore
```

## After init

Add a repo by editing `metarepo.config.json` and re-running:

```bash
node scripts/init-repos.mjs
```

The script only touches missing entries under `repos/`. It will never overwrite or remove existing ones.

## Git status across all repos

From anywhere inside the metarepo, run:

```bash
bash scripts/git-status.sh
```

It prints a colour-coded summary of each repo under `repos/` plus any active worktrees under `.worktrees/` — current branch, ahead/behind upstream, staged/modified/untracked counts. Great for checking the state of coordinated cross-repo work at a glance.

**Tip:** If you use Claude Code, you can wrap this script as a skill by adding `.claude/skills/metarepo-git-status/SKILL.md` that invokes `bash scripts/git-status.sh`. Then a simple "check git status" prompt will trigger it.

## Open in VSCode

```bash
code meta.code-workspace
```

Or in VSCode: **File → Open Workspace from File…** and select `meta.code-workspace`.

The workspace registers the metarepo root plus each repo under `repos/` as separate workspace folders. Benefits:

- **Cleaner VSCode UI without constraining the agent.** The editor shows one tree per repo, while the agent still operates against the full metarepo on disk.
- **Per-folder include/exclude tuning.** Narrow VSCode's indexing and search to just the files you care about (e.g. only frontend, only backend) by editing per-folder `files.exclude` / `search.exclude` rules — without affecting what the agent can read.
- **Clear separation between VSCode's view and the agent's view.** Useful when you want your editor scoped tightly but still want the agent to reason across every service.

## Contributing / local development

```bash
git clone https://github.com/piusj/metarepos.git
cd metarepos
npm install
npm run build
npm test
```

`dist/` is committed so `npx piusj/metarepos` can run the CLI straight from GitHub without building on the user's machine.

## License

[The Unlicense](LICENSE) — public domain dedication. Use it however you like.
