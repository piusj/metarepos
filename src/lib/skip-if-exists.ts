import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

export type WriteResult = {
  path: string;
  status: "created" | "skipped";
};

export async function writeFileIfMissing(
  filePath: string,
  contents: string,
): Promise<WriteResult> {
  try {
    await access(filePath);
    return { path: filePath, status: "skipped" };
  } catch {
    // not accessible => doesn't exist (or no perms; rethrow on write below)
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
  return { path: filePath, status: "created" };
}
