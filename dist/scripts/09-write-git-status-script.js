import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { gitStatusSh } from "../templates/git-status-sh.js";
export async function writeGitStatusScript(args) {
    const target = join(args.metarepoPath, "scripts/git-status.sh");
    const write = await writeFileIfMissing(target, gitStatusSh());
    if (write.status === "created") {
        await chmod(target, 0o755);
    }
    return { write };
}
