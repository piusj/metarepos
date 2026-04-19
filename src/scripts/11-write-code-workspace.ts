import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type WriteResult, writeFileIfMissing } from "../lib/skip-if-exists.js";
import { metaCodeWorkspace } from "../templates/meta-code-workspace.js";

export type WriteCodeWorkspaceInput = {
  metarepoPath: string;
  name: string;
};

export type WriteCodeWorkspaceResult = {
  write: WriteResult;
};

export async function writeCodeWorkspace(
  args: WriteCodeWorkspaceInput,
): Promise<WriteCodeWorkspaceResult> {
  const configPath = join(args.metarepoPath, "metarepo.config.json");
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw) as {
    symlinks?: { name: string }[];
    clones?: { name: string }[];
  };
  const repoNames = [
    ...(config.symlinks ?? []).map((e) => e.name),
    ...(config.clones ?? []).map((e) => e.name),
  ];
  const target = join(args.metarepoPath, "meta.code-workspace");
  const write = await writeFileIfMissing(
    target,
    metaCodeWorkspace(args.name, repoNames),
  );
  return { write };
}
