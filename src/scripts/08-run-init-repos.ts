import { join } from "node:path";
import { type ForwardFn, spawnWithForward } from "../lib/spawn-with-forward.js";

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
