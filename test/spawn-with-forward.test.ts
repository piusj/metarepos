import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnWithForward } from "../src/lib/spawn-with-forward.js";

test("spawnWithForward captures exit code 0", async () => {
  const { exitCode } = await spawnWithForward("true", []);
  assert.equal(exitCode, 0);
});

test("spawnWithForward captures non-zero exit code", async () => {
  const { exitCode } = await spawnWithForward("false", []);
  assert.notEqual(exitCode, 0);
});

test("spawnWithForward forwards stdout line-by-line when callback provided", async () => {
  const lines: string[] = [];
  const { exitCode } = await spawnWithForward(
    "sh",
    ["-c", "echo one; echo two; echo three"],
    { forward: (line) => lines.push(line) },
  );
  assert.equal(exitCode, 0);
  assert.deepEqual(lines, ["one", "two", "three"]);
});

test("spawnWithForward forwards stderr too", async () => {
  const lines: string[] = [];
  const { exitCode } = await spawnWithForward(
    "sh",
    ["-c", "echo out1; echo err1 >&2; echo out2"],
    { forward: (line) => lines.push(line) },
  );
  assert.equal(exitCode, 0);
  // Order between stdout and stderr isn't guaranteed, but all three lines should appear
  assert.ok(lines.includes("out1"));
  assert.ok(lines.includes("err1"));
  assert.ok(lines.includes("out2"));
});

test("spawnWithForward forwards partial last line without trailing newline", async () => {
  const lines: string[] = [];
  const { exitCode } = await spawnWithForward(
    "sh",
    ["-c", "printf 'a\\nb\\nno-newline'"],
    { forward: (line) => lines.push(line) },
  );
  assert.equal(exitCode, 0);
  assert.deepEqual(lines, ["a", "b", "no-newline"]);
});
