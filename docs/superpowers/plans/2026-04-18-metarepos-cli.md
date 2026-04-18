# Metarepos CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-shot TypeScript Node CLI (`metarepos init`) distributed via `npx piusj/metarepos init` that scaffolds a "metarepo" directory structure with agent-context files, an editable config, and an idempotent repo-materialization script.

**Architecture:** Single `init` command orchestrates 8 numbered script modules (two prompt steps + six filesystem/subprocess steps). Each script is a focused async function with typed input/output. Rich terminal UX via `listr2`, `@inquirer/prompts`, `chalk`, `boxen`, `figlet`, `gradient-string`, `log-symbols`, `cli-table3`. Distribution: committed `dist/` via GitHub-shorthand `npx`.

**Tech Stack:** TypeScript (Node 20+, ESM), `@inquirer/prompts`, `listr2`, `chalk`, `boxen`, `figlet`, `gradient-string`, `log-symbols`, `cli-table3`, `node:test`, `tsc`.

---

## File Structure

**CLI source:**
- `src/cli.ts` — entrypoint with shebang, dispatches subcommand.
- `src/commands/init.ts` — orchestrates the 8 scripts; exposes a programmatic entry for tests.
- `src/scripts/01-prompt-metarepo-name.ts` — prompts for the metarepo directory name.
- `src/scripts/02-prompt-repos.ts` — loop-prompts for repos (symlink | clone).
- `src/scripts/03-create-target-directory.ts` — `mkdir` the metarepo root (idempotent).
- `src/scripts/04-write-scaffold-files.ts` — writes AGENTS.md, CLAUDE.md, META-ROOT.md, README.md, .gitignore, repos/.gitkeep (skip-if-exists).
- `src/scripts/05-write-init-repos-script.ts` — installs `scripts/init-repos.mjs` into the metarepo.
- `src/scripts/06-merge-config.ts` — loads/merges/writes `metarepo.config.json`.
- `src/scripts/07-run-git-init.ts` — runs `git init` inside the metarepo.
- `src/scripts/08-run-init-repos.ts` — runs `node scripts/init-repos.mjs` inside the metarepo.
- `src/lib/logger.ts` — banner, step headers, summary block, color/symbol helpers.
- `src/lib/skip-if-exists.ts` — shared idempotent file-write helper.
- `src/templates/agents-md.ts` — AGENTS.md template (interpolates name).
- `src/templates/claude-md.ts` — one-liner CLAUDE.md.
- `src/templates/meta-root-md.ts` — META-ROOT.md (interpolates name).
- `src/templates/readme-md.ts` — user's metarepo README.
- `src/templates/gitignore.ts` — scaffolded `.gitignore`.
- `src/templates/init-repos-mjs.ts` — the init-repos.mjs script source as a string.

**Tests and fixtures:**
- `test/init.test.ts` — integration + idempotency test using `samples/`.
- `samples/fake-api/`, `samples/fake-web/`, `samples/fake-worker/` — symlink test fixtures with minimal but realistic code.

**Config and distribution:**
- `package.json`, `tsconfig.json`, `.gitignore`, `.npmignore`, `README.md`, `dist/` (committed).

---

## Task 1: Project bootstrap (package.json, tsconfig, ignores)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmignore`
- Create: `src/.gitkeep`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "metarepos",
  "version": "0.1.0",
  "description": "Scaffolder CLI for setting up a metarepo — a root folder grouping multiple repos with shared agent context.",
  "type": "module",
  "bin": { "metarepos": "dist/cli.js" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "npm run build && node --test dist-test/init.test.js",
    "test:build": "tsc -p tsconfig.test.json",
    "prepare": "npm run build"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "boxen": "^8.0.0",
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "figlet": "^1.8.0",
    "gradient-string": "^3.0.0",
    "listr2": "^8.2.5",
    "log-symbols": "^7.0.0"
  },
  "devDependencies": {
    "@types/figlet": "^1.7.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  },
  "engines": { "node": ">=20" }
}
```

Note: `test` script builds both production and test TypeScript, then runs Node's test runner against compiled JS. `prepare` runs on `npx piusj/metarepos` from GitHub so dist is rebuilt if missing; we still commit `dist/` for reliability.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": false,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `tsconfig.test.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist-test",
    "rootDir": ".",
    "noEmit": false
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist-test/
*.log
.DS_Store
# NOTE: dist/ is intentionally committed so `npx piusj/metarepos` works without a build step.
```

- [ ] **Step 5: Create `.npmignore`**

```
samples/
test/
dist-test/
tsconfig*.json
.gitignore
src/
docs/
```

- [ ] **Step 6: Initialize src dir placeholder**

```bash
mkdir -p src
touch src/.gitkeep
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: creates `package-lock.json` and `node_modules/`, exits 0.

- [ ] **Step 8: Verify TypeScript compiles against empty src**

Run: `npx tsc --noEmit`
Expected: exits 0 with no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.test.json .gitignore .npmignore src/.gitkeep
git commit -m "chore: bootstrap metarepos CLI project"
```

---

## Task 2: `src/lib/skip-if-exists.ts` (idempotent write helper) with tests

**Files:**
- Create: `src/lib/skip-if-exists.ts`
- Create: `test/skip-if-exists.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/skip-if-exists.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileIfMissing } from "../src/lib/skip-if-exists.js";

test("writeFileIfMissing creates file when missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    const p = join(dir, "a.txt");
    const result = await writeFileIfMissing(p, "hello");
    assert.equal(result.status, "created");
    assert.equal(await readFile(p, "utf8"), "hello");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("writeFileIfMissing skips when file exists", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    const p = join(dir, "a.txt");
    await writeFile(p, "original");
    const result = await writeFileIfMissing(p, "new");
    assert.equal(result.status, "skipped");
    assert.equal(await readFile(p, "utf8"), "original");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("writeFileIfMissing creates parent directories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    const p = join(dir, "nested/deep/a.txt");
    const result = await writeFileIfMissing(p, "hello");
    assert.equal(result.status, "created");
    assert.equal(await readFile(p, "utf8"), "hello");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npm run test:build && node --test dist-test/test/skip-if-exists.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/skip-if-exists.ts`**

```typescript
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

export type WriteResult = {
  path: string;
  status: "created" | "skipped";
};

export async function writeFileIfMissing(
  filePath: string,
  contents: string,
): Promise<WriteResult> {
  try {
    await access(filePath);
    return { path: filePath, status: "skipped" };
  } catch {
    // not accessible => doesn't exist (or no perms; rethrow on write below)
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
  return { path: filePath, status: "created" };
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `npm run test:build && node --test dist-test/test/skip-if-exists.test.js`
Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/skip-if-exists.ts test/skip-if-exists.test.ts
git commit -m "feat(lib): add idempotent writeFileIfMissing helper"
```

---

## Task 3: `src/lib/logger.ts` (banner, step headers, summary)

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: Implement `src/lib/logger.ts`**

```typescript
import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import gradient from "gradient-string";
import logSymbols from "log-symbols";
import Table from "cli-table3";

const isTTY = process.stdout.isTTY === true;

export function printBanner(): void {
  if (!isTTY) {
    console.log("metarepos · scaffold a metarepo\n");
    return;
  }
  const ascii = figlet.textSync("metarepos", { font: "Small" });
  const banner = gradient(["#00b4ff", "#7a5cff", "#ff4fa3"])(ascii);
  console.log(banner);
  console.log(chalk.dim("  scaffold a metarepo\n"));
}

export function info(msg: string): void {
  console.log(chalk.cyan(msg));
}

export function warn(msg: string): void {
  console.log(`${logSymbols.warning} ${chalk.yellow(msg)}`);
}

export function error(msg: string): void {
  console.log(`${logSymbols.error} ${chalk.red(msg)}`);
}

export function created(path: string): void {
  console.log(`  ${chalk.green(logSymbols.success)} ${chalk.bold(path)} ${chalk.dim("(created)")}`);
}

export function skipped(path: string, reason = "exists"): void {
  console.log(`  ${chalk.yellow("○")} ${chalk.bold(path)} ${chalk.dim(`(skip: ${reason})`)}`);
}

export type Summary = {
  created: number;
  skipped: number;
  warnings: number;
  elapsedMs: number;
  metarepoPath: string;
};

export function printSummary(s: Summary): void {
  const table = new Table({
    chars: {
      top: "", "top-mid": "", "top-left": "", "top-right": "",
      bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
      left: "", "left-mid": "", mid: "", "mid-mid": "",
      right: "", "right-mid": "", middle: " ",
    },
    style: { "padding-left": 0, "padding-right": 2 },
  });
  table.push(
    [chalk.dim("Created"), chalk.green(String(s.created))],
    [chalk.dim("Skipped"), chalk.yellow(String(s.skipped))],
    [chalk.dim("Warnings"), s.warnings > 0 ? chalk.yellow(String(s.warnings)) : chalk.dim("0")],
    [chalk.dim("Time"), chalk.cyan(`${(s.elapsedMs / 1000).toFixed(2)}s`)],
  );

  const body =
    table.toString() +
    "\n\n" +
    chalk.dim(
      `Edit ${chalk.bold("metarepo.config.json")} and re-run\n` +
        `${chalk.bold("node scripts/init-repos.mjs")} any time — it's idempotent.`,
    );

  console.log(
    "\n" +
      boxen(body, {
        title: chalk.cyan(" Summary "),
        titleAlignment: "left",
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }),
  );
  console.log(chalk.dim(`\nMetarepo: ${chalk.bold(s.metarepoPath)}`));
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/logger.ts
git commit -m "feat(lib): add logger with banner, step helpers, summary"
```

---

## Task 4: Templates — AGENTS.md, CLAUDE.md, META-ROOT.md, README.md, .gitignore

**Files:**
- Create: `src/templates/agents-md.ts`
- Create: `src/templates/claude-md.ts`
- Create: `src/templates/meta-root-md.ts`
- Create: `src/templates/readme-md.ts`
- Create: `src/templates/gitignore.ts`

- [ ] **Step 1: Create `src/templates/meta-root-md.ts`**

```typescript
export function metaRootMd(name: string): string {
  return `# Meta-Repo Root Marker

This file exists solely as a marker to identify the root of the ${name} meta-repo. Shell scripts and commands walk up the directory tree looking for this file to determine the meta-repo root path.

Nothing reads the contents of this file.
`;
}
```

- [ ] **Step 2: Create `src/templates/claude-md.ts`**

```typescript
export function claudeMd(): string {
  return `# Claude Code instructions

See [AGENTS.md](./AGENTS.md) for metarepo context and conventions.
`;
}
```

- [ ] **Step 3: Create `src/templates/agents-md.ts`**

```typescript
export function agentsMd(name: string): string {
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
```

- [ ] **Step 4: Create `src/templates/readme-md.ts`**

```typescript
export function readmeMd(name: string): string {
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
```

- [ ] **Step 5: Create `src/templates/gitignore.ts`**

```typescript
export function gitignoreContent(): string {
  return `# Nested repos have their own git history
repos/*
!repos/.gitkeep

# Worktrees are local working state
.worktrees/
`;
}
```

- [ ] **Step 6: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/templates/agents-md.ts src/templates/claude-md.ts src/templates/meta-root-md.ts src/templates/readme-md.ts src/templates/gitignore.ts
git commit -m "feat(templates): add agents/claude/meta-root/readme/gitignore templates"
```

---

## Task 5: Template — `scripts/init-repos.mjs` (zero-dep ESM string)

**Files:**
- Create: `src/templates/init-repos-mjs.ts`

- [ ] **Step 1: Create `src/templates/init-repos-mjs.ts`**

```typescript
export function initReposMjs(): string {
  return `#!/usr/bin/env node
// Idempotent materializer for the metarepo.
// Reads metarepo.config.json at the metarepo root and ensures every symlink
// and clone entry exists under repos/.
// Re-running is safe; existing entries are left untouched.

import { readFile, access, symlink, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

async function findMetarepoRoot(start) {
  let cur = start;
  while (true) {
    try {
      await access(join(cur, "META-ROOT.md"));
      return cur;
    } catch {}
    const parent = dirname(cur);
    if (parent === cur) throw new Error("Could not find META-ROOT.md walking up from " + start);
    cur = parent;
  }
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

function run(cmd, args, opts) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(cmd + " exited with code " + code));
    });
  });
}

const root = await findMetarepoRoot(here);
const configPath = join(root, "metarepo.config.json");
const raw = await readFile(configPath, "utf8");
const config = JSON.parse(raw);

const reposDir = join(root, "repos");
await mkdir(reposDir, { recursive: true });

let createdCount = 0;
let skippedCount = 0;
let warningCount = 0;

for (const entry of config.symlinks ?? []) {
  const target = join(reposDir, entry.name);
  if (await exists(target)) {
    console.log("○ skip (exists): repos/" + entry.name);
    skippedCount++;
    continue;
  }
  const source = isAbsolute(entry.path) ? entry.path : resolve(root, entry.path);
  if (!(await exists(source))) {
    console.log("⚠ warning: symlink source does not exist for repos/" + entry.name + " → " + source);
    warningCount++;
    continue;
  }
  await symlink(source, target, "dir");
  console.log("✓ symlink: repos/" + entry.name + " → " + entry.path);
  createdCount++;
}

for (const entry of config.clones ?? []) {
  const target = join(reposDir, entry.name);
  if (await exists(target)) {
    console.log("○ skip (exists): repos/" + entry.name);
    skippedCount++;
    continue;
  }
  console.log("→ git clone " + entry.url + " repos/" + entry.name);
  await run("git", ["clone", entry.url, target], { cwd: root });
  createdCount++;
}

console.log("");
console.log(createdCount + " created, " + skippedCount + " skipped, " + warningCount + " warnings");
`;
}
```

Note: This template is a **string** — it is not executed at build time. When written to disk it becomes an executable ESM script in the user's metarepo. Dollar signs inside template literals are escaped (`\$`) where needed; there are none in this body so no escaping required.

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Smoke-test the template runs as a standalone script**

Run:
```bash
mkdir -p /tmp/mr-smoke/repos
touch /tmp/mr-smoke/META-ROOT.md
cat > /tmp/mr-smoke/metarepo.config.json <<'JSON'
{ "name": "smoke", "symlinks": [], "clones": [] }
JSON
node -e "import('./dist/templates/init-repos-mjs.js').then(m => process.stdout.write(m.initReposMjs()))" > /tmp/mr-smoke/scripts/init-repos.mjs 2>/dev/null || true
mkdir -p /tmp/mr-smoke/scripts
node -e "import('./src/templates/init-repos-mjs.ts')" 2>&1 | head -1  # sanity
```

Then after the CLI is built (Task 13), this script will be produced by `05-write-init-repos-script.ts`. Skip to next step for now.

- [ ] **Step 4: Commit**

```bash
git add src/templates/init-repos-mjs.ts
git commit -m "feat(templates): add init-repos.mjs template (idempotent materializer)"
```

---

## Task 6: Script 01 — `prompt-metarepo-name.ts`

**Files:**
- Create: `src/scripts/01-prompt-metarepo-name.ts`

- [ ] **Step 1: Implement script**

```typescript
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type PromptMetarepoNameInput = {
  cwd: string;
};

export type PromptMetarepoNameResult = {
  name: string;
  metarepoPath: string;
};

export async function promptMetarepoName(
  args: PromptMetarepoNameInput,
): Promise<PromptMetarepoNameResult> {
  console.log(chalk.cyan.bold("\nStep 1/3 — Name your metarepo"));
  console.log(
    chalk.dim(
      "  This will be the directory name created in your current working directory.",
    ),
  );

  const name = await input({
    message: "Metarepo name:",
    validate: (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return "Name cannot be empty.";
      if (/[\/\\]/.test(trimmed)) return "Name cannot contain slashes.";
      if (/^\./.test(trimmed)) return "Name cannot start with a dot.";
      return true;
    },
  });

  const metarepoPath = resolve(args.cwd, name.trim());

  if (existsSync(metarepoPath)) {
    console.log(
      chalk.yellow(
        `  Directory ${chalk.bold(name.trim())} already exists — will enter and merge idempotently.`,
      ),
    );
  }

  return { name: name.trim(), metarepoPath };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/01-prompt-metarepo-name.ts
git commit -m "feat(scripts): 01 prompt for metarepo name"
```

---

## Task 7: Script 02 — `prompt-repos.ts`

**Files:**
- Create: `src/scripts/02-prompt-repos.ts`

- [ ] **Step 1: Implement script**

```typescript
import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";

export type RepoEntry =
  | { kind: "symlink"; name: string; path: string }
  | { kind: "clone"; name: string; url: string };

export type PromptReposInput = {
  existingRepoNames: string[];
};

export type PromptReposResult = {
  repos: RepoEntry[];
};

export async function promptRepos(
  args: PromptReposInput,
): Promise<PromptReposResult> {
  console.log(chalk.cyan.bold("\nStep 2/3 — Add your repos"));
  console.log(
    chalk.dim(
      "  For each repo, choose symlink (link an existing local clone) or clone (git clone from GitHub).\n" +
        "  You can add as many as you want, or skip and edit metarepo.config.json later.",
    ),
  );

  if (args.existingRepoNames.length > 0) {
    console.log(
      chalk.dim(
        `  Existing repos in config: ${chalk.bold(
          args.existingRepoNames.join(", "),
        )} (these will be preserved).`,
      ),
    );
  }

  const repos: RepoEntry[] = [];
  const taken = new Set(args.existingRepoNames);

  while (true) {
    const addMore = await confirm({
      message: repos.length === 0 ? "Add a repo?" : "Add another repo?",
      default: repos.length === 0,
    });
    if (!addMore) break;

    const name = await input({
      message: "  Repo name (folder name under repos/):",
      validate: (v: string) => {
        const t = v.trim();
        if (!t) return "Name cannot be empty.";
        if (/[\/\\]/.test(t)) return "Name cannot contain slashes.";
        if (taken.has(t)) return `Name "${t}" is already used.`;
        return true;
      },
    });

    const kind = await select<"clone" | "symlink">({
      message: "  Source:",
      choices: [
        { name: "clone (git clone from GitHub)", value: "clone" },
        { name: "symlink (link an existing local clone)", value: "symlink" },
      ],
    });

    if (kind === "clone") {
      const url = await input({
        message: "  Git URL:",
        validate: (v: string) =>
          v.trim().length > 0 || "URL cannot be empty.",
      });
      repos.push({ kind: "clone", name: name.trim(), url: url.trim() });
    } else {
      const path = await input({
        message: "  Local path (relative to the metarepo root):",
        validate: (v: string) =>
          v.trim().length > 0 || "Path cannot be empty.",
      });
      repos.push({ kind: "symlink", name: name.trim(), path: path.trim() });
    }

    taken.add(name.trim());
  }

  return { repos };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/02-prompt-repos.ts
git commit -m "feat(scripts): 02 prompt for repos (symlink or clone)"
```

---

## Task 8: Script 03 — `create-target-directory.ts`

**Files:**
- Create: `src/scripts/03-create-target-directory.ts`

- [ ] **Step 1: Implement script**

```typescript
import { mkdir } from "node:fs/promises";

export type CreateTargetDirectoryInput = {
  metarepoPath: string;
};

export type CreateTargetDirectoryResult = {
  metarepoPath: string;
};

export async function createTargetDirectory(
  args: CreateTargetDirectoryInput,
): Promise<CreateTargetDirectoryResult> {
  await mkdir(args.metarepoPath, { recursive: true });
  await mkdir(`${args.metarepoPath}/repos`, { recursive: true });
  await mkdir(`${args.metarepoPath}/docs`, { recursive: true });
  await mkdir(`${args.metarepoPath}/scripts`, { recursive: true });
  return { metarepoPath: args.metarepoPath };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/03-create-target-directory.ts
git commit -m "feat(scripts): 03 create target directory structure"
```

---

## Task 9: Script 04 — `write-scaffold-files.ts`

**Files:**
- Create: `src/scripts/04-write-scaffold-files.ts`

- [ ] **Step 1: Implement script**

```typescript
import { join } from "node:path";
import { writeFileIfMissing, type WriteResult } from "../lib/skip-if-exists.js";
import { agentsMd } from "../templates/agents-md.js";
import { claudeMd } from "../templates/claude-md.js";
import { metaRootMd } from "../templates/meta-root-md.js";
import { readmeMd } from "../templates/readme-md.js";
import { gitignoreContent } from "../templates/gitignore.js";

export type WriteScaffoldFilesInput = {
  metarepoPath: string;
  name: string;
};

export type WriteScaffoldFilesResult = {
  writes: WriteResult[];
};

export async function writeScaffoldFiles(
  args: WriteScaffoldFilesInput,
): Promise<WriteScaffoldFilesResult> {
  const { metarepoPath, name } = args;
  const writes: WriteResult[] = [];

  writes.push(await writeFileIfMissing(join(metarepoPath, "AGENTS.md"), agentsMd(name)));
  writes.push(await writeFileIfMissing(join(metarepoPath, "CLAUDE.md"), claudeMd()));
  writes.push(await writeFileIfMissing(join(metarepoPath, "META-ROOT.md"), metaRootMd(name)));
  writes.push(await writeFileIfMissing(join(metarepoPath, "README.md"), readmeMd(name)));
  writes.push(await writeFileIfMissing(join(metarepoPath, ".gitignore"), gitignoreContent()));
  writes.push(await writeFileIfMissing(join(metarepoPath, "repos/.gitkeep"), ""));

  return { writes };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/04-write-scaffold-files.ts
git commit -m "feat(scripts): 04 write scaffold files (idempotent)"
```

---

## Task 10: Script 05 — `write-init-repos-script.ts`

**Files:**
- Create: `src/scripts/05-write-init-repos-script.ts`

- [ ] **Step 1: Implement script**

```typescript
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing, type WriteResult } from "../lib/skip-if-exists.js";
import { initReposMjs } from "../templates/init-repos-mjs.js";

export type WriteInitReposScriptInput = {
  metarepoPath: string;
};

export type WriteInitReposScriptResult = {
  write: WriteResult;
};

export async function writeInitReposScript(
  args: WriteInitReposScriptInput,
): Promise<WriteInitReposScriptResult> {
  const target = join(args.metarepoPath, "scripts/init-repos.mjs");
  const write = await writeFileIfMissing(target, initReposMjs());
  if (write.status === "created") {
    await chmod(target, 0o755);
  }
  return { write };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/05-write-init-repos-script.ts
git commit -m "feat(scripts): 05 install scripts/init-repos.mjs"
```

---

## Task 11: Script 06 — `merge-config.ts` (with unit tests)

**Files:**
- Create: `src/scripts/06-merge-config.ts`
- Create: `test/merge-config.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/merge-config.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeConfig } from "../src/scripts/06-merge-config.js";

test("mergeConfig writes new config when none exists", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    const result = await mergeConfig({
      metarepoPath: dir,
      name: "my-repo",
      repos: [
        { kind: "symlink", name: "a", path: "../local/a" },
        { kind: "clone", name: "b", url: "git@github.com:o/b.git" },
      ],
    });
    assert.equal(result.status, "created");
    assert.equal(result.addedCount, 2);
    const written = JSON.parse(
      await readFile(join(dir, "metarepo.config.json"), "utf8"),
    );
    assert.equal(written.name, "my-repo");
    assert.deepEqual(written.symlinks, [{ name: "a", path: "../local/a" }]);
    assert.deepEqual(written.clones, [{ name: "b", url: "git@github.com:o/b.git" }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("mergeConfig preserves existing entries and appends new ones", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    await writeFile(
      join(dir, "metarepo.config.json"),
      JSON.stringify({
        name: "existing",
        symlinks: [{ name: "a", path: "../orig-a" }],
        clones: [{ name: "b", url: "git@github.com:o/b.git" }],
      }),
    );
    const result = await mergeConfig({
      metarepoPath: dir,
      name: "ignored-on-merge",
      repos: [
        { kind: "symlink", name: "a", path: "../DIFFERENT" }, // should be ignored
        { kind: "symlink", name: "c", path: "../local/c" },
      ],
    });
    assert.equal(result.status, "merged");
    assert.equal(result.addedCount, 1);
    assert.equal(result.skippedCount, 1);
    const written = JSON.parse(
      await readFile(join(dir, "metarepo.config.json"), "utf8"),
    );
    assert.equal(written.name, "existing"); // existing name preserved
    assert.deepEqual(written.symlinks, [
      { name: "a", path: "../orig-a" },
      { name: "c", path: "../local/c" },
    ]);
    assert.deepEqual(written.clones, [{ name: "b", url: "git@github.com:o/b.git" }]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test (expect fail)**

Run: `npm run test:build && node --test dist-test/test/merge-config.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/scripts/06-merge-config.ts`**

```typescript
import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import type { RepoEntry } from "./02-prompt-repos.js";

type SymlinkEntry = { name: string; path: string };
type CloneEntry = { name: string; url: string };

export type MetarepoConfig = {
  name: string;
  symlinks: SymlinkEntry[];
  clones: CloneEntry[];
};

export type MergeConfigInput = {
  metarepoPath: string;
  name: string;
  repos: RepoEntry[];
};

export type MergeConfigResult = {
  status: "created" | "merged";
  addedCount: number;
  skippedCount: number;
};

async function fileExists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

export async function mergeConfig(
  args: MergeConfigInput,
): Promise<MergeConfigResult> {
  const configPath = join(args.metarepoPath, "metarepo.config.json");
  const existed = await fileExists(configPath);

  let config: MetarepoConfig;
  if (existed) {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<MetarepoConfig>;
    config = {
      name: parsed.name ?? args.name,
      symlinks: Array.isArray(parsed.symlinks) ? parsed.symlinks : [],
      clones: Array.isArray(parsed.clones) ? parsed.clones : [],
    };
  } else {
    config = { name: args.name, symlinks: [], clones: [] };
  }

  const taken = new Set<string>([
    ...config.symlinks.map((e) => e.name),
    ...config.clones.map((e) => e.name),
  ]);

  let addedCount = 0;
  let skippedCount = 0;

  for (const repo of args.repos) {
    if (taken.has(repo.name)) {
      skippedCount++;
      continue;
    }
    if (repo.kind === "symlink") {
      config.symlinks.push({ name: repo.name, path: repo.path });
    } else {
      config.clones.push({ name: repo.name, url: repo.url });
    }
    taken.add(repo.name);
    addedCount++;
  }

  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

  return {
    status: existed ? "merged" : "created",
    addedCount,
    skippedCount,
  };
}
```

- [ ] **Step 4: Run test (expect pass)**

Run: `npm run test:build && node --test dist-test/test/merge-config.test.js`
Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/06-merge-config.ts test/merge-config.test.ts
git commit -m "feat(scripts): 06 merge metarepo.config.json idempotently"
```

---

## Task 12: Script 07 — `run-git-init.ts`

**Files:**
- Create: `src/lib/spawn-with-forward.ts`
- Create: `src/scripts/07-run-git-init.ts`

- [ ] **Step 1: Implement `src/lib/spawn-with-forward.ts`**

```typescript
import { spawn, type SpawnOptions } from "node:child_process";

export type ForwardFn = (line: string) => void;

export type SpawnWithForwardOptions = SpawnOptions & {
  forward?: ForwardFn;
};

/**
 * Spawn a subprocess and forward its output.
 * - If `forward` is provided: stdio is "pipe", each line of stdout/stderr
 *   is passed to forward(line). Used for listr2-managed output.
 * - If not: stdio is "inherit". Used when the caller wants native streaming.
 */
export async function spawnWithForward(
  cmd: string,
  args: string[],
  opts: SpawnWithForwardOptions = {},
): Promise<{ exitCode: number }> {
  const { forward, ...rest } = opts;
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(cmd, args, {
      ...rest,
      stdio: forward ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    if (forward && child.stdout && child.stderr) {
      let outBuf = "";
      let errBuf = "";
      const onOut = (chunk: Buffer) => {
        outBuf += chunk.toString("utf8");
        let idx: number;
        while ((idx = outBuf.indexOf("\n")) >= 0) {
          forward(outBuf.slice(0, idx));
          outBuf = outBuf.slice(idx + 1);
        }
      };
      const onErr = (chunk: Buffer) => {
        errBuf += chunk.toString("utf8");
        let idx: number;
        while ((idx = errBuf.indexOf("\n")) >= 0) {
          forward(errBuf.slice(0, idx));
          errBuf = errBuf.slice(idx + 1);
        }
      };
      child.stdout.on("data", onOut);
      child.stderr.on("data", onErr);
      child.on("close", () => {
        if (outBuf) forward(outBuf);
        if (errBuf) forward(errBuf);
      });
    }

    child.on("error", rejectPromise);
    child.on("exit", (code) => resolvePromise({ exitCode: code ?? 0 }));
  });
}
```

- [ ] **Step 2: Implement `src/scripts/07-run-git-init.ts`**

```typescript
import { access } from "node:fs/promises";
import { join } from "node:path";
import { spawnWithForward, type ForwardFn } from "../lib/spawn-with-forward.js";

export type RunGitInitInput = {
  metarepoPath: string;
  forward?: ForwardFn;
};

export type RunGitInitResult = {
  status: "initialized" | "skipped";
};

async function hasGitDir(p: string): Promise<boolean> {
  try { await access(join(p, ".git")); return true; } catch { return false; }
}

export async function runGitInit(
  args: RunGitInitInput,
): Promise<RunGitInitResult> {
  if (await hasGitDir(args.metarepoPath)) {
    return { status: "skipped" };
  }
  const { exitCode } = await spawnWithForward("git", ["init", "-b", "main"], {
    cwd: args.metarepoPath,
    forward: args.forward,
  });
  if (exitCode !== 0) throw new Error(`git init exited with code ${exitCode}`);
  return { status: "initialized" };
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/spawn-with-forward.ts src/scripts/07-run-git-init.ts
git commit -m "feat(scripts): 07 run git init (idempotent) with output forwarding"
```

---

## Task 13: Script 08 — `run-init-repos.ts`

**Files:**
- Create: `src/scripts/08-run-init-repos.ts`

- [ ] **Step 1: Implement script**

```typescript
import { join } from "node:path";
import { spawnWithForward, type ForwardFn } from "../lib/spawn-with-forward.js";

export type RunInitReposInput = {
  metarepoPath: string;
  forward?: ForwardFn;
};

export type RunInitReposResult = {
  exitCode: number;
};

export async function runInitRepos(
  args: RunInitReposInput,
): Promise<RunInitReposResult> {
  const scriptPath = join(args.metarepoPath, "scripts/init-repos.mjs");
  return await spawnWithForward("node", [scriptPath], {
    cwd: args.metarepoPath,
    forward: args.forward,
  });
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/08-run-init-repos.ts
git commit -m "feat(scripts): 08 run scripts/init-repos.mjs"
```

---

## Task 14: `commands/init.ts` — orchestration with `listr2`

**Files:**
- Create: `src/commands/init.ts`

The orchestrator uses `listr2` for the 6 execution steps (scripts 03–08). Subprocess output (git init, git clone, init-repos) is captured via the `forward` callback introduced in Task 12 and routed into each task's output.

- [ ] **Step 1: Implement orchestrator**

```typescript
import { Listr } from "listr2";
import chalk from "chalk";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";

import { promptMetarepoName } from "../scripts/01-prompt-metarepo-name.js";
import { promptRepos, type RepoEntry } from "../scripts/02-prompt-repos.js";
import { createTargetDirectory } from "../scripts/03-create-target-directory.js";
import { writeScaffoldFiles } from "../scripts/04-write-scaffold-files.js";
import { writeInitReposScript } from "../scripts/05-write-init-repos-script.js";
import { mergeConfig } from "../scripts/06-merge-config.js";
import { runGitInit } from "../scripts/07-run-git-init.js";
import { runInitRepos } from "../scripts/08-run-init-repos.js";
import { printBanner, printSummary } from "../lib/logger.js";
import type { WriteResult } from "../lib/skip-if-exists.js";

type Ctx = {
  metarepoPath: string;
  name: string;
  repos: RepoEntry[];
  createdCount: number;
  skippedCount: number;
};

async function readExistingRepoNames(metarepoPath: string): Promise<string[]> {
  const cfg = join(metarepoPath, "metarepo.config.json");
  try { await access(cfg); } catch { return []; }
  try {
    const parsed = JSON.parse(await readFile(cfg, "utf8")) as {
      symlinks?: { name: string }[];
      clones?: { name: string }[];
    };
    return [
      ...(parsed.symlinks ?? []).map((e) => e.name),
      ...(parsed.clones ?? []).map((e) => e.name),
    ];
  } catch {
    return [];
  }
}

function countWrites(writes: WriteResult[]): [number, number] {
  let c = 0, s = 0;
  for (const w of writes) (w.status === "created" ? c++ : s++);
  return [c, s];
}

export type InitProgrammaticInput = {
  cwd: string;
  name: string;
  repos: RepoEntry[];
};

export async function runInitProgrammatic(args: InitProgrammaticInput): Promise<void> {
  const start = Date.now();
  const metarepoPath = join(args.cwd, args.name);

  const ctx: Ctx = {
    metarepoPath,
    name: args.name,
    repos: args.repos,
    createdCount: 0,
    skippedCount: 0,
  };

  const tasks = new Listr<Ctx>(
    [
      {
        title: "Create target directory",
        task: async (ctx, task) => {
          await createTargetDirectory({ metarepoPath: ctx.metarepoPath });
          task.title = `Create target directory ${chalk.dim(ctx.metarepoPath)}`;
          ctx.createdCount += 1;
        },
      },
      {
        title: "Write scaffold files",
        task: async (ctx, task) => {
          const { writes } = await writeScaffoldFiles({
            metarepoPath: ctx.metarepoPath,
            name: ctx.name,
          });
          const [c, s] = countWrites(writes);
          ctx.createdCount += c;
          ctx.skippedCount += s;
          task.title = `Write scaffold files ${chalk.dim(`(${c} created, ${s} skipped)`)}`;
        },
      },
      {
        title: "Install scripts/init-repos.mjs",
        task: async (ctx, task) => {
          const { write } = await writeInitReposScript({ metarepoPath: ctx.metarepoPath });
          if (write.status === "created") ctx.createdCount++;
          else ctx.skippedCount++;
          task.title = `Install scripts/init-repos.mjs ${chalk.dim(`(${write.status})`)}`;
        },
      },
      {
        title: "Merge metarepo.config.json",
        task: async (ctx, task) => {
          const result = await mergeConfig({
            metarepoPath: ctx.metarepoPath,
            name: ctx.name,
            repos: ctx.repos,
          });
          if (result.status === "created") ctx.createdCount++;
          else {
            ctx.createdCount += result.addedCount;
            ctx.skippedCount += result.skippedCount;
          }
          task.title =
            result.status === "created"
              ? "Merge metarepo.config.json (created)"
              : `Merge metarepo.config.json ${chalk.dim(`(+${result.addedCount}, ~${result.skippedCount})`)}`;
        },
      },
      {
        title: "Run git init",
        task: async (ctx, task) => {
          const result = await runGitInit({
            metarepoPath: ctx.metarepoPath,
            forward: (line) => { task.output = line; },
          });
          if (result.status === "initialized") ctx.createdCount++;
          else ctx.skippedCount++;
          task.title = `Run git init ${chalk.dim(`(${result.status})`)}`;
        },
        rendererOptions: { persistentOutput: false, outputBar: 5 },
      },
      {
        title: "Run scripts/init-repos.mjs",
        task: async (ctx, task) => {
          const result = await runInitRepos({
            metarepoPath: ctx.metarepoPath,
            forward: (line) => { task.output = line; },
          });
          if (result.exitCode !== 0) {
            throw new Error(`init-repos exited with code ${result.exitCode}`);
          }
          task.title = "Run scripts/init-repos.mjs";
        },
        rendererOptions: { persistentOutput: true, outputBar: 10 },
      },
    ],
    {
      concurrent: false,
      rendererOptions: {
        collapseSubtasks: false,
        showSubtasks: true,
      },
      renderer: process.stdout.isTTY ? "default" : "verbose",
      fallbackRenderer: "verbose",
    },
  );

  await tasks.run(ctx);

  printSummary({
    created: ctx.createdCount,
    skipped: ctx.skippedCount,
    warnings: 0,
    elapsedMs: Date.now() - start,
    metarepoPath,
  });
}

export async function runInitInteractive(cwd: string): Promise<void> {
  printBanner();
  const { name, metarepoPath } = await promptMetarepoName({ cwd });
  const existingRepoNames = await readExistingRepoNames(metarepoPath);
  const { repos } = await promptRepos({ existingRepoNames });
  await runInitProgrammatic({ cwd, name, repos });
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/commands/init.ts
git commit -m "feat(commands): orchestrate init with interactive and programmatic entries"
```

---

## Task 15: `src/cli.ts` — entrypoint with shebang

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement entrypoint**

```typescript
#!/usr/bin/env node
import { runInitInteractive } from "./commands/init.js";
import chalk from "chalk";

const [, , ...args] = process.argv;
const sub = args[0];

async function main() {
  if (!sub || sub === "init") {
    await runInitInteractive(process.cwd());
    return;
  }
  if (sub === "--version" || sub === "-v") {
    // package.json version is embedded at build time via tsc by reading manually.
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      await readFile(join(here, "..", "package.json"), "utf8"),
    ) as { version: string };
    console.log(pkg.version);
    return;
  }
  if (sub === "--help" || sub === "-h") {
    console.log(`Usage:\n  metarepos init    Scaffold a new metarepo in the current directory.`);
    return;
  }
  console.error(chalk.red(`Unknown command: ${sub}`));
  console.error(`Run ${chalk.bold("metarepos --help")} for usage.`);
  process.exit(1);
}

main().catch((err) => {
  // @inquirer/prompts throws ExitPromptError on Ctrl+C; treat as clean exit.
  const name = (err as { name?: string } | null)?.name;
  if (name === "ExitPromptError") {
    console.error(chalk.yellow("\nAborted."));
    process.exit(130);
  }
  console.error(chalk.red(`\nError: ${(err as Error).message}`));
  process.exit(1);
});
```

- [ ] **Step 2: Verify compile produces `dist/cli.js`**

Run: `npm run build && head -1 dist/cli.js`
Expected: first line is `#!/usr/bin/env node`.

Note: `tsc` does not preserve the shebang automatically in all configurations. If the first line is not `#!/usr/bin/env node`, add a post-build step. Verify by inspecting the compiled file; if missing, add to `package.json` scripts:

```json
"build": "tsc && node -e \"import('node:fs').then(({default:fs})=>{const p='dist/cli.js';const s=fs.readFileSync(p,'utf8');if(!s.startsWith('#!'))fs.writeFileSync(p,'#!/usr/bin/env node\\n'+s);fs.chmodSync(p,0o755);})\""
```

(TypeScript does emit the shebang when it's at the very top of the source file; the post-build step is a belt-and-braces chmod + ensure.)

- [ ] **Step 3: Run CLI --help**

Run: `node dist/cli.js --help`
Expected: prints usage line.

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts package.json
git commit -m "feat(cli): add entrypoint with init/--version/--help and clean Ctrl+C"
```

---

## Task 16: Samples — fake-api, fake-web, fake-worker

**Files:**
- Create: `samples/README.md`
- Create: `samples/fake-api/README.md`
- Create: `samples/fake-api/package.json`
- Create: `samples/fake-api/src/server.js`
- Create: `samples/fake-api/.gitignore`
- Create: `samples/fake-web/README.md`
- Create: `samples/fake-web/package.json`
- Create: `samples/fake-web/src/index.html`
- Create: `samples/fake-web/src/main.js`
- Create: `samples/fake-web/.gitignore`
- Create: `samples/fake-worker/README.md`
- Create: `samples/fake-worker/package.json`
- Create: `samples/fake-worker/src/worker.js`
- Create: `samples/fake-worker/.gitignore`

- [ ] **Step 1: Create `samples/README.md`**

```markdown
# Test fixtures

These directories are not real repos. They exist only as symlink targets for the integration test at `test/init.test.ts`. Excluded from `npm pack` via `.npmignore`.
```

- [ ] **Step 2: Create `samples/fake-api/`**

`samples/fake-api/README.md`:
```markdown
# fake-api

Test fixture — pretends to be a minimal Node HTTP service exposing `GET /health`.
```

`samples/fake-api/package.json`:
```json
{
  "name": "fake-api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/server.js",
  "scripts": { "start": "node src/server.js" }
}
```

`samples/fake-api/src/server.js`:
```javascript
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "fake-api" }));
    return;
  }
  res.writeHead(404).end();
});

server.listen(port, () => {
  console.log(`fake-api listening on :${port}`);
});
```

`samples/fake-api/.gitignore`:
```
node_modules/
```

- [ ] **Step 3: Create `samples/fake-web/`**

`samples/fake-web/README.md`:
```markdown
# fake-web

Test fixture — pretends to be a minimal web frontend that pings the `fake-api` health endpoint.
```

`samples/fake-web/package.json`:
```json
{
  "name": "fake-web",
  "version": "0.0.0",
  "private": true,
  "type": "module"
}
```

`samples/fake-web/src/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>fake-web</title>
  </head>
  <body>
    <h1>fake-web</h1>
    <p id="status">checking…</p>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

`samples/fake-web/src/main.js`:
```javascript
const apiUrl = window.__API_URL__ ?? "http://localhost:3000";

async function checkHealth() {
  const el = document.getElementById("status");
  if (!el) return;
  try {
    const res = await fetch(`${apiUrl}/health`);
    const data = await res.json();
    el.textContent = `api: ${data.status}`;
  } catch (err) {
    el.textContent = `api unreachable: ${err.message}`;
  }
}

checkHealth();
```

`samples/fake-web/.gitignore`:
```
node_modules/
dist/
```

- [ ] **Step 4: Create `samples/fake-worker/`**

`samples/fake-worker/README.md`:
```markdown
# fake-worker

Test fixture — pretends to be a background worker that processes a queue on a timer.
```

`samples/fake-worker/package.json`:
```json
{
  "name": "fake-worker",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/worker.js",
  "scripts": { "start": "node src/worker.js" }
}
```

`samples/fake-worker/src/worker.js`:
```javascript
const intervalMs = Number(process.env.TICK_MS ?? 1000);
let tick = 0;

const timer = setInterval(() => {
  tick++;
  console.log(`[fake-worker] tick=${tick} processed=0 pending=0`);
}, intervalMs);

process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("[fake-worker] shutdown");
  process.exit(0);
});
```

`samples/fake-worker/.gitignore`:
```
node_modules/
```

- [ ] **Step 5: Commit**

```bash
git add samples/
git commit -m "test: add samples/ fixtures (fake-api, fake-web, fake-worker)"
```

---

## Task 17: Integration test — symlink flow + idempotency

**Files:**
- Create: `test/init.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readlink, stat, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInitProgrammatic } from "../src/commands/init.js";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = resolve(here, "..", "samples");

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

test("init scaffolds a metarepo with symlinked samples", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    const fakeApiPath = resolve(samplesDir, "fake-api");
    const fakeWebPath = resolve(samplesDir, "fake-web");
    // Paths must be relative to the metarepo root (cwd/my-meta).
    const metaPath = join(cwd, "my-meta");
    const relApi = resolve(fakeApiPath);
    const relWeb = resolve(fakeWebPath);

    await runInitProgrammatic({
      cwd,
      name: "my-meta",
      repos: [
        { kind: "symlink", name: "api", path: relApi },
        { kind: "symlink", name: "web", path: relWeb },
      ],
    });

    // Files exist
    for (const f of ["AGENTS.md", "CLAUDE.md", "META-ROOT.md", "README.md", ".gitignore", "metarepo.config.json", "scripts/init-repos.mjs"]) {
      assert.ok(await exists(join(metaPath, f)), `missing ${f}`);
    }
    assert.ok(await exists(join(metaPath, ".git")));
    assert.ok(await exists(join(metaPath, "repos/.gitkeep")));

    // META-ROOT.md interpolates name
    const metaRoot = await readFile(join(metaPath, "META-ROOT.md"), "utf8");
    assert.match(metaRoot, /root of the my-meta meta-repo/);

    // Config is correct
    const cfg = JSON.parse(await readFile(join(metaPath, "metarepo.config.json"), "utf8"));
    assert.equal(cfg.name, "my-meta");
    assert.equal(cfg.symlinks.length, 2);
    assert.deepEqual(cfg.symlinks.map((e: { name: string }) => e.name).sort(), ["api", "web"]);
    assert.deepEqual(cfg.clones, []);

    // Symlinks resolve to the samples
    const apiLink = await readlink(join(metaPath, "repos/api"));
    const webLink = await readlink(join(metaPath, "repos/web"));
    assert.equal(apiLink, relApi);
    assert.equal(webLink, relWeb);

    // Reachable through the symlink
    const apiReadme = await readFile(join(metaPath, "repos/api/README.md"), "utf8");
    assert.match(apiReadme, /fake-api/);

    // Symlinks are directories
    const apiStat = await stat(join(metaPath, "repos/api"));
    assert.ok(apiStat.isDirectory());
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("init is idempotent on re-run", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    const relApi = resolve(samplesDir, "fake-api");
    const metaPath = join(cwd, "my-meta");

    await runInitProgrammatic({
      cwd,
      name: "my-meta",
      repos: [{ kind: "symlink", name: "api", path: relApi }],
    });

    // Capture AGENTS.md contents, then modify it — a re-run must not overwrite.
    const agentsPath = join(metaPath, "AGENTS.md");
    const sentinel = "\n\n<!-- user edit -->\n";
    const { writeFile } = await import("node:fs/promises");
    const orig = await readFile(agentsPath, "utf8");
    await writeFile(agentsPath, orig + sentinel);

    // Re-run with a new repo to also confirm merge.
    const relWeb = resolve(samplesDir, "fake-web");
    await runInitProgrammatic({
      cwd,
      name: "my-meta",
      repos: [
        { kind: "symlink", name: "api", path: relApi }, // already present
        { kind: "symlink", name: "web", path: relWeb }, // new
      ],
    });

    // User edit preserved
    const after = await readFile(agentsPath, "utf8");
    assert.ok(after.endsWith(sentinel), "AGENTS.md user edit was not preserved");

    // Both symlinks present
    assert.ok(await exists(join(metaPath, "repos/api")));
    assert.ok(await exists(join(metaPath, "repos/web")));

    // Config has both entries
    const cfg = JSON.parse(await readFile(join(metaPath, "metarepo.config.json"), "utf8"));
    assert.equal(cfg.symlinks.length, 2);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run integration tests**

Run: `npm test`
Expected: all tests (including skip-if-exists and merge-config from earlier) pass.

- [ ] **Step 3: Commit**

```bash
git add test/init.test.ts
git commit -m "test: add integration test for init (symlink flow + idempotency)"
```

---

## Task 18: Build and commit `dist/`

**Files:**
- Create/update: `dist/**` (all compiled output)

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: `dist/cli.js` exists with shebang, exit 0.

- [ ] **Step 2: Smoke test built CLI**

Run: `node dist/cli.js --help`
Expected: prints usage line.

- [ ] **Step 3: Commit dist**

```bash
git add dist/
git commit -m "build: commit compiled dist/ for npx distribution"
```

---

## Task 19: Project README (user-facing)

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with prerequisites and usage"
```

---

## Self-Review Notes

**Spec coverage check:**
- §2 architecture → Task 1 (bootstrap), 14 (commands/init), 15 (cli.ts) ✓
- §3 interactive flow → Tasks 6, 7, 14 ✓
- §4 idempotency → Tasks 2, 9, 11, 12, 17 ✓
- §5 config shape → Task 11 ✓
- §6 init-repos.mjs behavior → Task 5 ✓
- §7 agent instructions → Task 4 ✓
- §8 gitignore → Task 4 ✓
- §9 UX (listr2/chalk/etc.) → Task 3 (banner, summary, colors), Task 12 (output forwarding utility), Task 14 (`listr2` wrapping orchestrator with subprocess output streamed via `forward`) ✓
- §10 script contract → Tasks 6–13 (typed inputs/outputs, no shared state) ✓
- §11 package.json → Task 1 ✓
- §12 samples → Task 16 ✓
- §13 testing → Tasks 2, 11, 17 ✓
- §14 project README → Task 19 ✓

**Placeholder scan:** no TBDs, no "handle edge cases", all code inline. ✓

**Type consistency:** `RepoEntry` discriminated union defined in `02-prompt-repos.ts`, consumed by `06-merge-config.ts` and `commands/init.ts`. `WriteResult` defined in `lib/skip-if-exists.ts`, re-used in script results. `ForwardFn` defined in `lib/spawn-with-forward.ts`, consumed by scripts 07 and 08. ✓
