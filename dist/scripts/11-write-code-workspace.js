import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { metaCodeWorkspace } from "../templates/meta-code-workspace.js";
export async function writeCodeWorkspace(args) {
    const configPath = join(args.metarepoPath, "metarepo.config.json");
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw);
    const repoNames = [
        ...(config.symlinks ?? []).map((e) => e.name),
        ...(config.clones ?? []).map((e) => e.name),
    ];
    const target = join(args.metarepoPath, "meta.code-workspace");
    const write = await writeFileIfMissing(target, metaCodeWorkspace(args.name, repoNames));
    return { write };
}
