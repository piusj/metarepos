import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export async function writeFileIfMissing(filePath, contents) {
    try {
        await access(filePath);
        return { path: filePath, status: "skipped" };
    }
    catch {
        // not accessible => doesn't exist (or no perms; rethrow on write below)
    }
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, "utf8");
    return { path: filePath, status: "created" };
}
