import { join } from "node:path";
import { spawnWithForward } from "../lib/spawn-with-forward.js";
export async function runInitRepos(args) {
    const scriptPath = join(args.metarepoPath, "scripts/init-repos.mjs");
    return await spawnWithForward("node", [scriptPath], {
        cwd: args.metarepoPath,
        forward: args.forward,
    });
}
