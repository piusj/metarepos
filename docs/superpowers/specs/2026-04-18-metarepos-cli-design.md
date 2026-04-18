# Metarepos CLI — Design Spec

**Date:** 2026-04-18
**Status:** Design approved, pending user review before planning

## 1. Summary

Metarepos is a one-shot TypeScript Node CLI that scaffolds a "metarepo" — a root directory that surrounds several git repos and groups them into a single working directory, giving coding agents (e.g., Claude Code) shared context across those repos. The CLI's sole command is `init`. After `init`, the CLI is discardable — the user manages the generated metarepo themselves.

The CLI is distributed via GitHub shorthand: `npx piusj/metarepos init`. No npm publish.

**Out of scope (by design):** worktree management, cross-repo branch sync, daily repo maintenance. Those behaviors live in the generated `AGENTS.md`/`CLAUDE.md` as instructions for the coding agent to perform in the finished metarepo — not as features of this CLI.

## 2. Architecture

Two artifacts:

1. **The Metarepos CLI repo** (`github.com/piusj/metarepos`) — this project.
2. **The scaffolded metarepo** — what `init` produces in the user's filesystem.

### 2.1 Scaffolded metarepo layout

```
<name>/
├── repos/                  # empty; target for clones/symlinks (.gitkeep preserves in git)
├── docs/                   # empty; user's shared context, plans, designs
├── scripts/
│   └── init-repos.mjs      # idempotent materializer (ESM, zero deps)
├── .worktrees/             # ignored; agent-created worktrees land here
├── AGENTS.md               # main agent-context doc
├── CLAUDE.md               # one-liner pointing to AGENTS.md
├── META-ROOT.md            # metarepo-root marker (content interpolates <name>)
├── README.md               # user's metarepo README (editable)
├── metarepo.config.json    # symlinks + clones definitions
└── .gitignore              # ignores repos/*, .worktrees/
```

### 2.2 CLI repo layout

```
metarepos/
├── src/
│   ├── cli.ts                           # entrypoint, arg dispatch
│   ├── commands/
│   │   └── init.ts                      # orchestrates scripts in order
│   ├── scripts/
│   │   ├── 01-prompt-metarepo-name.ts
│   │   ├── 02-prompt-repos.ts
│   │   ├── 03-create-target-directory.ts
│   │   ├── 04-write-scaffold-files.ts
│   │   ├── 05-write-init-repos-script.ts
│   │   ├── 06-merge-config.ts
│   │   ├── 07-run-git-init.ts
│   │   └── 08-run-init-repos.ts
│   ├── lib/
│   │   ├── logger.ts                    # step headers, created/skipped/warning output, color
│   │   └── skip-if-exists.ts            # shared file-write helper (idempotent writes)
│   └── templates/                       # raw string templates for generated files
│       ├── agents-md.ts
│       ├── claude-md.ts
│       ├── meta-root-md.ts
│       ├── readme-md.ts
│       ├── gitignore.ts
│       └── init-repos-mjs.ts
├── dist/                                # committed, shipped via npx
├── samples/                             # fixture repos used by integration tests
│   ├── README.md
│   ├── fake-api/
│   ├── fake-web/
│   └── fake-worker/
├── test/
│   └── init.test.ts                     # integration smoke + idempotency test
├── package.json
├── tsconfig.json
├── .gitignore                           # ignores node_modules (NOT dist)
├── .npmignore                           # excludes samples/ and test/
└── README.md                            # project README with prerequisites
```

## 3. Interactive flow

Three user-facing steps (1–2 are prompts; 3 is execution with a visible task list). Each prompt has a short description explaining what it does and why.

1. **Step 1 — Metarepo name.** "This will be the directory name created in your current working directory." Validated: non-empty, no slashes.
2. **Step 2 — Add your repos.** "For each repo, choose symlink (link an existing local clone) or clone (git clone from GitHub). You can add as many as you want, or skip and edit `metarepo.config.json` later."
   - Loop: "Add a repo? (y/n)" → name → kind (symlink/clone) → path (symlink) or git URL (clone).
   - On re-run in an existing metarepo, existing repo entries are listed before the loop starts so the user doesn't re-enter them.
3. **Step 3 — Scaffolding.** Runs scripts 03–08 in order as a 6-item `listr2` task list (prompts in scripts 01–02 already completed by this point). Stdout/stderr of subprocesses (e.g., `git clone`, `git init`, `scripts/init-repos.mjs`) is streamed beneath its task, dimmed.

**Ctrl+C during prompts (steps 1–2) aborts cleanly with no partial writes.** All filesystem side effects happen in steps 03–08, after prompts are fully collected.

## 4. Idempotency

Both the CLI and the generated `scripts/init-repos.mjs` are idempotent. Re-running either is safe.

### 4.1 CLI (`init`) idempotency
- Target directory exists → do not fail, enter it.
- Each scaffolded file already exists → skip, log `○ skip (exists): <file>`. Never overwrite user edits.
- `metarepo.config.json` exists → load, merge new repo entries by `name`; existing entries left as-is.
- `git init` → natively idempotent.
- Final run of `scripts/init-repos.mjs` → already idempotent (see 4.2).

### 4.2 `scripts/init-repos.mjs` idempotency
- For each `symlinks[]` entry: if `repos/<name>` does not exist → create symlink; if it exists → skip; if the source path does not exist on disk → log warning and continue.
- For each `clones[]` entry: if `repos/<name>` does not exist → `git clone`; if it exists → skip.
- Exit 0 unless a clone subprocess fails.

## 5. Config file: `metarepo.config.json`

Shape:
```json
{
  "name": "my-metarepo",
  "symlinks": [
    { "name": "service-a", "path": "../local/service-a" }
  ],
  "clones": [
    { "name": "service-b", "url": "git@github.com:org/service-b.git" }
  ]
}
```

- `symlinks[].path` is resolved **relative to the metarepo root** (not relative to `repos/`).
- `clones[].url` is any URL accepted by `git clone`.
- `name` in each entry is the folder name inside `repos/`.

## 6. `scripts/init-repos.mjs` behavior

- Plain ESM, zero dependencies — runs via `node scripts/init-repos.mjs`.
- Locates the metarepo root by walking up from the script's location until it finds `META-ROOT.md`. Reads `metarepo.config.json` from there.
- For each entry, applies the rules in §4.2.
- Streams subprocess output (inherits stdio) so the user sees `git clone` progress.
- Prints a final summary: `N created, M skipped, K warnings`.

## 7. Agent instructions

### 7.1 `META-ROOT.md`
Exact content, with `<name>` interpolated from the user's answer:
```
# Meta-Repo Root Marker

This file exists solely as a marker to identify the root of the <name> meta-repo. Shell scripts and commands walk up the directory tree looking for this file to determine the meta-repo root path.

Nothing reads the contents of this file.
```

### 7.2 `CLAUDE.md`
```
# Claude Code instructions

See [AGENTS.md](./AGENTS.md) for metarepo context and conventions.
```

### 7.3 `AGENTS.md`
Sections:

1. **Overview.** Describes what a metarepo is and why it exists (shared context for coding agents across multiple service repos).
2. **META-ROOT.md marker.** Explains: `META-ROOT.md` at the metarepo root is a marker file. To determine whether you are operating inside this metarepo, walk up from your current directory until you find `META-ROOT.md`. Its contents are irrelevant — only its presence matters.
3. **Directory structure.** Describes `repos/`, `docs/`, `scripts/`, `.worktrees/`, and top-level files.
4. **Managed repos.** The repos under `repos/` are listed in `metarepo.config.json`. Each is either a symlink to an existing local clone or a direct `git clone`. Both are real working directories.
5. **Cross-repo branch naming.** When a change spans multiple repos for the same feature/bugfix, create branches with the same name in each affected repo (e.g., `feat/checkout-redesign` in both `repos/web` and `repos/api`). This lets humans and other agents correlate work across repos.
6. **Worktrees.** If the user asks for a worktree to work on a feature, create it under `.worktrees/<branch-name>/<repo-name>` at the metarepo root. Use the same branch name across all affected repos. Only create worktrees for repos the feature actually touches.
7. **Adding / removing repos.** Edit `metarepo.config.json` and re-run `node scripts/init-repos.mjs`. It is idempotent.
8. **Shared context in `docs/`.** Prefer writing plans, designs, and cross-cutting notes into `docs/` at the metarepo root so they apply across repos. Per-repo docs still live inside the repo.

## 8. Scaffolded `.gitignore`
```
# Nested repos have their own git history
repos/*
!repos/.gitkeep

# Worktrees are local working state
.worktrees/
```

## 9. CLI UX

### 9.1 Principles
- Every async step shows a spinner while in progress, resolves to ✓ (green) or ✗ (red) with duration.
- Every subprocess's stdout/stderr is streamed to the user, dimmed and nested under the step.
- Idempotent skips render as ○ (yellow) with a short reason (`skip: exists`).
- Final summary block: counts + reminder that the config can be edited and `init-repos` re-run.
- Non-TTY (CI, piped): spinners, gradients, and the banner are disabled; plain-text logs remain.

### 9.2 Dependencies
| Package | Purpose |
|---|---|
| `@inquirer/prompts` | Interactive prompts (steps 1–2) |
| `listr2` | Multi-step task list with spinners + streaming output |
| `chalk` | Semantic colors |
| `boxen` | Welcome banner frame + final summary frame |
| `figlet` | ASCII-art banner |
| `gradient-string` | Colored gradient over the banner |
| `log-symbols` | Cross-platform ✓/✗/⚠/ⓘ symbols |
| `cli-table3` | Summary table |

### 9.3 Color semantics (chalk)
- **cyan** — step headers, echoed user input
- **green** — success, created
- **yellow** — skipped, warnings
- **red** — errors
- **dim gray** — streamed subprocess output
- **magenta** — prompt accents
- **bold** — file paths and repo names

### 9.4 Flow (illustrative)
```
  ┌────────────────────────────────────────┐
  │   (figlet + gradient banner)           │
  │   metarepos · scaffold a metarepo      │
  └────────────────────────────────────────┘

  ? Metarepo name: my-metarepo
  ? Add a repo? (Y/n) y
  ?   Repo name: api
  ?   Source:    [clone] symlink
  ?   Git URL:   git@github.com:org/api.git
  ? Add another? (y/N) n

  [1/6] Create target directory
    ✓ my-metarepo/ (3ms)
  [2/6] Write scaffold files
    ✓ AGENTS.md, CLAUDE.md, META-ROOT.md, README.md, .gitignore, repos/.gitkeep
  [3/6] Install scripts/init-repos.mjs
  [4/6] Merge metarepo.config.json
  [5/6] Run git init
  [6/6] Run scripts/init-repos
    → git clone git@github.com:org/api.git repos/api
      Cloning into 'repos/api'...
    ✓ repos/api (cloned)

  ╭─ Summary ───────────────────────────────╮
  │  Created    8                           │
  │  Skipped    2                           │
  │  Warnings   0                           │
  │  Time       1.4s                        │
  │                                          │
  │  Edit metarepo.config.json and          │
  │  re-run node scripts/init-repos.mjs     │
  │  any time — it's idempotent.            │
  ╰──────────────────────────────────────────╯
```

## 10. Script module contract (`src/scripts/`)

Each `src/scripts/NN-*.ts` exports one async function with:
- A plain-object input (typed).
- A plain-object result (typed) including `created`, `skipped`, `warnings` counts where applicable.
- No shared mutable state. `commands/init.ts` threads results across steps.
- All user-visible output goes through `src/lib/logger.ts` for consistent formatting.

This separation keeps each step small (single responsibility), individually testable, and swappable if the flow grows.

## 11. `package.json` essentials

```json
{
  "name": "metarepos",
  "version": "0.1.0",
  "type": "module",
  "bin": { "metarepos": "dist/cli.js" },
  "scripts": {
    "build": "tsc",
    "test": "node --test",
    "prepublishOnly": "npm run build"
  },
  "engines": { "node": ">=20" }
}
```

Dependencies per §9.2. `dist/cli.js` begins with `#!/usr/bin/env node`. `dist/` is committed so `npx piusj/metarepos init` runs without a build step on the user's machine.

## 12. Samples (test fixtures)

`samples/` at the CLI repo root contains fake repos used by integration tests of the symlink flow. Each has enough content to look like a real service.

```
samples/
├── README.md                           # explains these are fixtures, not published
├── fake-api/
│   ├── README.md
│   ├── package.json                    # name "fake-api"
│   ├── src/server.js                   # minimal Node HTTP server with GET /health
│   └── .gitignore                      # node_modules
├── fake-web/
│   ├── README.md
│   ├── package.json                    # name "fake-web"
│   ├── src/index.html                  # bare page
│   ├── src/main.js                     # fetches /health from a configurable API URL
│   └── .gitignore
└── fake-worker/
    ├── README.md
    ├── package.json                    # name "fake-worker"
    ├── src/worker.js                   # setInterval tick logger, pretends to process a queue
    └── .gitignore
```

Each source file is 5–20 lines. Nothing is expected to actually run — the tests verify only that symlinks resolve and files are reachable through them. `.npmignore` excludes `samples/` from any future package publish.

## 13. Testing

Lightweight; the tool is meant to be discarded after use, so heavy testing is overkill.

- **Integration smoke test** (`test/init.test.ts`, `node --test`): runs `init` programmatically (bypassing interactive prompts — the prompt modules in `01-` and `02-` are replaced by a pre-built answers object) against a temp-dir cwd, using `samples/fake-api` and `samples/fake-web` as symlink sources. Asserts:
  - All expected files exist.
  - `META-ROOT.md` contains the interpolated metarepo name.
  - `metarepo.config.json` parses and has the correct entries.
  - `repos/fake-api` and `repos/fake-web` are symlinks whose resolved targets exist inside `samples/`.
- **Idempotency test**: runs `init` twice against the same temp dir; asserts second run reports skips for all files and preserves the config.
- **No clone test by default** — network-dependent and flaky in CI. The clone code path shares its logic with the symlink path, which is covered.

## 14. Project README (the CLI's own)

Sections:
1. One-paragraph intro (what a metarepo is, what the CLI does).
2. **Prerequisites:**
   - GitHub CLI (`gh`) installed and authenticated (`gh auth status` succeeds).
   - Claude Code installed and authenticated.
   - Node.js ≥ 20 and npm.
3. Usage: `npx piusj/metarepos init`, what it prompts for, link to example output.
4. What gets generated (list of scaffolded files with one-line descriptions).
5. After init: editing `metarepo.config.json` and re-running `node scripts/init-repos.mjs`; the CLI is discardable.
6. Contributing / local dev: clone, `npm install`, `npm run build`, `npm test`.

## 15. Open items (none)

No unresolved questions at the time of writing. Ready for planning.
