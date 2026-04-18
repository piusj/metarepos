import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { initReposMjs } from "../templates/init-repos-mjs.js";
export async function writeInitReposScript(args) {
    const target = join(args.metarepoPath, "scripts/init-repos.mjs");
    const write = await writeFileIfMissing(target, initReposMjs());
    if (write.status === "created") {
        await chmod(target, 0o755);
    }
    return { write };
}
