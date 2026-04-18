import { access } from "node:fs/promises";
import { join } from "node:path";
import { spawnWithForward } from "../lib/spawn-with-forward.js";
async function hasGitDir(p) {
    try {
        await access(join(p, ".git"));
        return true;
    }
    catch {
        return false;
    }
}
export async function runGitInit(args) {
    if (await hasGitDir(args.metarepoPath)) {
        return { status: "skipped" };
    }
    const { exitCode } = await spawnWithForward("git", ["init", "-b", "main"], {
        cwd: args.metarepoPath,
        forward: args.forward,
    });
    if (exitCode !== 0)
        throw new Error(`git init exited with code ${exitCode}`);
    return { status: "initialized" };
}
