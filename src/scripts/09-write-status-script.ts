import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { writeFileIfMissing, type WriteResult } from "../lib/skip-if-exists.js";
import { statusSh } from "../templates/status-sh.js";

export type WriteStatusScriptInput = {
  metarepoPath: string;
};

export type WriteStatusScriptResult = {
  write: WriteResult;
};

export async function writeStatusScript(
  args: WriteStatusScriptInput,
): Promise<WriteStatusScriptResult> {
  const target = join(args.metarepoPath, "scripts/status.sh");
  const write = await writeFileIfMissing(target, statusSh());
  if (write.status === "created") {
    await chmod(target, 0o755);
  }
  return { write };
}
