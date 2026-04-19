import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { listSubdirs, pathForConfig } from "../src/scripts/02-prompt-repos.js";

test("listSubdirs returns sorted directory names", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    await mkdir(join(dir, "beta"));
    await mkdir(join(dir, "alpha"));
    await mkdir(join(dir, "gamma"));
    const result = await listSubdirs(dir);
    assert.deepEqual(result, ["alpha", "beta", "gamma"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("listSubdirs skips files and hidden entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mr-"));
  try {
    await mkdir(join(dir, "visible"));
    await mkdir(join(dir, ".hidden"));
    await writeFile(join(dir, "a-file.txt"), "x");
    const result = await listSubdirs(dir);
    assert.deepEqual(result, ["visible"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("listSubdirs returns empty array for non-existent dir", async () => {
  const result = await listSubdirs("/does/not/exist/at/all");
  assert.deepEqual(result, []);
});

test("pathForConfig returns a relative path when target is outside metarepo root", () => {
  const result = pathForConfig("/users/me/meta", "/users/me/repos/api");
  assert.equal(result, "../repos/api");
});

test("pathForConfig returns a relative path when target is inside metarepo root", () => {
  const result = pathForConfig("/users/me/meta", "/users/me/meta/inner");
  assert.equal(result, "inner");
});

test("pathForConfig returns '.' for identical paths", () => {
  const result = pathForConfig("/users/me/meta", "/users/me/meta");
  assert.equal(result, ".");
});
