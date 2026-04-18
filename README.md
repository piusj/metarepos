# metarepos

A one-shot CLI that scaffolds a **metarepo** — a root folder grouping several git repos into a single working directory, providing shared context for coding agents (Claude Code, etc.).

After running `metarepos init`, the CLI is no longer needed. The generated metarepo is yours to manage.

## Prerequisites

- **GitHub CLI (`gh`)** installed and authenticated (`gh auth status` succeeds). Needed when you clone SSH URLs through `scripts/init-repos.mjs`.
- **Claude Code** installed and authenticated. The generated `AGENTS.md` / `CLAUDE.md` describe the metarepo layout and cross-repo conventions to it.
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

## What gets generated

```
<name>/
├── repos/                  # target for clones and symlinks
├── docs/                   # shared context, plans, designs
├── scripts/
│   └── init-repos.mjs      # idempotent materializer (re-run any time)
├── AGENTS.md               # main agent-context doc
├── CLAUDE.md               # one-liner pointing to AGENTS.md
├── META-ROOT.md            # metarepo-root marker
├── README.md               # editable metarepo README
├── metarepo.config.json    # repo declarations
└── .gitignore
```

## After init

Add a repo by editing `metarepo.config.json` and re-running:

```bash
node scripts/init-repos.mjs
```

The script only touches missing entries under `repos/`. It will never overwrite or remove existing ones.

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

MIT (add a LICENSE file before publishing).
