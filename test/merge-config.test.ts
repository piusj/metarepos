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
