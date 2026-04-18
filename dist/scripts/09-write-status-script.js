import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { statusSh } from "../templates/status-sh.js";
export async function writeStatusScript(args) {
    const target = join(args.metarepoPath, "scripts/status.sh");
    const write = await writeFileIfMissing(target, statusSh());
    if (write.status === "created") {
        await chmod(target, 0o755);
    }
    return { write };
}
