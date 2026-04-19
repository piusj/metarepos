import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { type WriteResult, writeFileIfMissing } from "../lib/skip-if-exists.js";
import { gitStatusSh } from "../templates/git-status-sh.js";

export type WriteGitStatusScriptInput = {
  metarepoPath: string;
};

export type WriteGitStatusScriptResult = {
  write: WriteResult;
};

export async function writeGitStatusScript(
  args: WriteGitStatusScriptInput,
): Promise<WriteGitStatusScriptResult> {
  const target = join(args.metarepoPath, "scripts/git-status.sh");
  const write = await writeFileIfMissing(target, gitStatusSh());
  if (write.status === "created") {
    await chmod(target, 0o755);
  }
  return { write };
}
