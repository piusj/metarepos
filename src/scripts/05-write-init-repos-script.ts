import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { type WriteResult, writeFileIfMissing } from "../lib/skip-if-exists.js";
import { initReposMjs } from "../templates/init-repos-mjs.js";

export type WriteInitReposScriptInput = {
  metarepoPath: string;
};

export type WriteInitReposScriptResult = {
  write: WriteResult;
};

export async function writeInitReposScript(
  args: WriteInitReposScriptInput,
): Promise<WriteInitReposScriptResult> {
  const target = join(args.metarepoPath, "scripts/init-repos.mjs");
  const write = await writeFileIfMissing(target, initReposMjs());
  if (write.status === "created") {
    await chmod(target, 0o755);
  }
  return { write };
}
