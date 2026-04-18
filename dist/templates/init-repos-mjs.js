export function initReposMjs() {
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
