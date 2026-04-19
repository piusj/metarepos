import { test } from "node:test";
import assert from "node:assert/strict";
import { metaCodeWorkspace } from "../src/templates/meta-code-workspace.js";

test("metaCodeWorkspace produces valid JSON with metarepo root + one folder per repo", () => {
  const raw = metaCodeWorkspace("my-meta", ["api", "web"]);
  const parsed = JSON.parse(raw);
  assert.deepEqual(parsed.folders, [
    { name: "my-meta", path: "." },
    { name: "api", path: "repos/api" },
    { name: "web", path: "repos/web" },
  ]);
  assert.equal(parsed.settings["files.exclude"].repos, true);
  assert.equal(parsed.settings["search.exclude"].repos, true);
  assert.equal(parsed.settings["files.watcherExclude"]["**/repos/**"], true);
  assert.equal(parsed.settings["git.autoRepositoryDetection"], "subFolders");
  assert.equal(parsed.settings["git.repositoryScanMaxDepth"], 5);
  assert.deepEqual(parsed.settings["git.scanRepositories"], [".worktrees"]);
});

test("metaCodeWorkspace handles zero repos (just the metarepo root)", () => {
  const raw = metaCodeWorkspace("solo", []);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.folders.length, 1);
  assert.deepEqual(parsed.folders[0], { name: "solo", path: "." });
});

test("metaCodeWorkspace ends with a newline", () => {
  const raw = metaCodeWorkspace("x", []);
  assert.ok(raw.endsWith("\n"));
});
