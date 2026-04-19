import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gitStatusSh } from "../src/templates/git-status-sh.js";

function run(
  cmd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString("utf8");
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

async function gitInit(dir: string): Promise<void> {
  await run("git", ["-C", dir, "init", "-q", "-b", "main"]);
}
async function gitCommit(dir: string, allowEmpty = false): Promise<void> {
  const args = [
    "-C",
    dir,
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "-m",
    "init",
  ];
  if (allowEmpty) args.splice(args.length - 2, 0, "--allow-empty");
  await run("git", args);
}

type Fixture = { root: string; scriptPath: string };

async function setupFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "gss-"));
  await writeFile(join(root, "META-ROOT.md"), "root\n");
  await mkdir(join(root, "scripts"), { recursive: true });
  await mkdir(join(root, "repos"), { recursive: true });
  const scriptPath = join(root, "scripts/git-status.sh");
  await writeFile(scriptPath, gitStatusSh());
  await chmod(scriptPath, 0o755);

  await gitInit(root);
  await gitCommit(root, true);

  const clean = join(root, "repos/clean");
  await mkdir(clean);
  await gitInit(clean);
  await writeFile(join(clean, "README.md"), "x");
  await run("git", ["-C", clean, "add", "."]);
  await gitCommit(clean);

  const dirty = join(root, "repos/dirty");
  await mkdir(dirty);
  await gitInit(dirty);
  await writeFile(join(dirty, "README.md"), "x");
  await run("git", ["-C", dirty, "add", "."]);
  await gitCommit(dirty);
  await writeFile(join(dirty, "README.md"), "y");
  await writeFile(join(dirty, "new.txt"), "z");

  return { root, scriptPath };
}

test("git-status.sh non-TTY output has no raw ANSI escape sequences", async () => {
  const { root, scriptPath } = await setupFixture();
  try {
    const { stdout, code } = await run("bash", [scriptPath]);
    assert.equal(code, 0, "script should exit 0");
    assert.doesNotMatch(
      stdout,
      // biome-ignore lint/suspicious/noControlCharactersInRegex: this test asserts ANSI escape (0x1B) does not leak
      /\x1b\[/,
      "stdout leaked ANSI escapes in non-TTY mode",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("git-status.sh renders the aligned-table header and divider", async () => {
  const { root, scriptPath } = await setupFixture();
  try {
    const { stdout } = await run("bash", [scriptPath]);
    assert.match(
      stdout,
      /PROJECT\s+BRANCH\s+UPSTREAM\s+CHANGES/,
      "header row missing",
    );
    assert.match(stdout, /─{20,}/, "divider line missing");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("git-status.sh marks clean, dirty, and non-git entries with distinct bullets", async () => {
  const { root, scriptPath } = await setupFixture();
  try {
    await mkdir(join(root, "repos/not-git"));
    await writeFile(join(root, "repos/not-git/file.txt"), "hi");

    const { stdout } = await run("bash", [scriptPath]);

    assert.match(stdout, /✓\s+clean\b/, "clean repo should have ✓ bullet");
    assert.match(stdout, /●\s+dirty\b/, "dirty repo should have ● bullet");
    assert.match(stdout, /⚠\s+not-git\b/, "non-git entry should have ⚠ bullet");
    assert.match(
      stdout,
      /not a git repo/,
      "non-git entry should carry guidance text",
    );
    assert.match(
      stdout,
      /~1 modified/,
      "dirty repo should report modified count",
    );
    assert.match(
      stdout,
      /\?1 untracked/,
      "dirty repo should report untracked count",
    );
    assert.match(
      stdout,
      /Summary:.*with changes/,
      "summary line should appear",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
