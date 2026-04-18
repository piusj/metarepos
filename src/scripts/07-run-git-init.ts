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
