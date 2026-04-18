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
