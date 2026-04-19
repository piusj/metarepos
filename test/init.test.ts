import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  readlink,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInitProgrammatic } from "../src/commands/init.js";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = resolve(here, "..", "..", "samples");

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

test("init scaffolds a metarepo with symlinked samples", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    const fakeApiPath = resolve(samplesDir, "fake-api");
    const fakeWebPath = resolve(samplesDir, "fake-web");
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
    for (const f of [
      "AGENTS.md",
      "CLAUDE.md",
      "META-ROOT.md",
      "META-ARCH-PROMPT.md",
      "README.md",
      ".gitignore",
      "metarepo.config.json",
      "scripts/init-repos.mjs",
      "scripts/git-status.sh",
      ".claude/commands/git-status.md",
    ]) {
      assert.ok(await exists(join(metaPath, f)), `missing ${f}`);
    }

    // /git-status Claude command is installed and points at the status script
    const cmdMd = await readFile(
      join(metaPath, ".claude/commands/git-status.md"),
      "utf8",
    );
    assert.match(cmdMd, /allowed-tools: Bash\(bash scripts\/git-status\.sh\)/);
    assert.match(cmdMd, /META_ROOT.*META-ROOT\.md/);
    assert.match(cmdMd, /bash "\$META_ROOT\/scripts\/git-status\.sh"/);
    assert.ok(await exists(join(metaPath, ".git")));
    assert.ok(await exists(join(metaPath, "repos/.gitkeep")));

    assert.ok(
      await exists(join(metaPath, "meta.code-workspace")),
      "missing meta.code-workspace",
    );

    const workspace = JSON.parse(
      await readFile(join(metaPath, "meta.code-workspace"), "utf8"),
    );
    assert.ok(
      Array.isArray(workspace.folders),
      "workspace.folders should be an array",
    );
    assert.equal(
      workspace.folders.length,
      3,
      "expected 3 folders: metarepo + 2 repos",
    );
    assert.equal(
      workspace.folders[0].path,
      ".",
      "first folder should be the metarepo root",
    );
    assert.equal(
      workspace.folders[0].name,
      "my-meta",
      "first folder name should be metarepo name",
    );
    assert.deepEqual(
      workspace.folders
        .slice(1)
        .map((f: { name: string }) => f.name)
        .sort(),
      ["api", "web"],
    );
    assert.deepEqual(
      workspace.folders
        .slice(1)
        .map((f: { path: string }) => f.path)
        .sort(),
      ["repos/api", "repos/web"],
    );
    assert.equal(workspace.settings["files.exclude"].repos, true);

    const statusPath = join(metaPath, "scripts/git-status.sh");
    const statusStat = await stat(statusPath);
    assert.ok(
      (statusStat.mode & 0o100) !== 0,
      "git-status.sh should be executable",
    );

    // META-ROOT.md interpolates name
    const metaRoot = await readFile(join(metaPath, "META-ROOT.md"), "utf8");
    assert.match(metaRoot, /root of the my-meta meta-repo/);

    const archPrompt = await readFile(
      join(metaPath, "META-ARCH-PROMPT.md"),
      "utf8",
    );
    assert.match(archPrompt, /Metarepo Architecture Analysis/);

    // Config is correct
    const cfg = JSON.parse(
      await readFile(join(metaPath, "metarepo.config.json"), "utf8"),
    );
    assert.equal(cfg.name, "my-meta");
    assert.equal(cfg.symlinks.length, 2);
    assert.deepEqual(cfg.symlinks.map((e: { name: string }) => e.name).sort(), [
      "api",
      "web",
    ]);
    assert.deepEqual(cfg.clones, []);

    // Symlinks resolve to the samples
    const apiLink = await readlink(join(metaPath, "repos/api"));
    const webLink = await readlink(join(metaPath, "repos/web"));
    assert.equal(apiLink, relApi);
    assert.equal(webLink, relWeb);

    // Reachable through the symlink
    const apiReadme = await readFile(
      join(metaPath, "repos/api/README.md"),
      "utf8",
    );
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
        { kind: "symlink", name: "api", path: relApi },
        { kind: "symlink", name: "web", path: relWeb },
      ],
    });

    // User edit preserved
    const after = await readFile(agentsPath, "utf8");
    assert.ok(
      after.endsWith(sentinel),
      "AGENTS.md user edit was not preserved",
    );

    // Both symlinks present
    assert.ok(await exists(join(metaPath, "repos/api")));
    assert.ok(await exists(join(metaPath, "repos/web")));

    // Config has both entries
    const cfg = JSON.parse(
      await readFile(join(metaPath, "metarepo.config.json"), "utf8"),
    );
    assert.equal(cfg.symlinks.length, 2);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("init with zero repos produces a valid scaffold (no symlinks, empty clones)", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    await runInitProgrammatic({ cwd, name: "empty-meta", repos: [] });
    const metaPath = join(cwd, "empty-meta");

    assert.ok(await exists(join(metaPath, "AGENTS.md")));
    assert.ok(await exists(join(metaPath, "META-ROOT.md")));
    assert.ok(await exists(join(metaPath, "metarepo.config.json")));
    assert.ok(await exists(join(metaPath, "meta.code-workspace")));
    assert.ok(await exists(join(metaPath, ".git")));

    const cfg = JSON.parse(
      await readFile(join(metaPath, "metarepo.config.json"), "utf8"),
    );
    assert.deepEqual(cfg.symlinks, []);
    assert.deepEqual(cfg.clones, []);

    const ws = JSON.parse(
      await readFile(join(metaPath, "meta.code-workspace"), "utf8"),
    );
    assert.equal(ws.folders.length, 1);
    assert.equal(ws.folders[0].name, "empty-meta");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("init sets main as the default branch in git init", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    await runInitProgrammatic({ cwd, name: "branch-meta", repos: [] });
    const metaPath = join(cwd, "branch-meta");
    const head = (await readFile(join(metaPath, ".git/HEAD"), "utf8")).trim();
    assert.equal(head, "ref: refs/heads/main");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("init-repos.mjs script is executable and includes the meta-root walk-up", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "mr-itest-"));
  try {
    await runInitProgrammatic({ cwd, name: "exec-meta", repos: [] });
    const metaPath = join(cwd, "exec-meta");
    const scriptPath = join(metaPath, "scripts/init-repos.mjs");
    const { stat } = await import("node:fs/promises");
    const s = await stat(scriptPath);
    assert.ok((s.mode & 0o100) !== 0, "init-repos.mjs should be executable");
    const src = await readFile(scriptPath, "utf8");
    assert.match(src, /findMetarepoRoot/);
    assert.match(src, /META-ROOT\.md/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
