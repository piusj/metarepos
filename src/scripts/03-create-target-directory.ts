import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";

export type CreateTargetDirectoryInput = {
  metarepoPath: string;
};

export type CreateTargetDirectoryResult = {
  metarepoPath: string;
  status: "created" | "skipped";
};

export async function createTargetDirectory(
  args: CreateTargetDirectoryInput,
): Promise<CreateTargetDirectoryResult> {
  let existed = true;
  try {
    await access(args.metarepoPath);
  } catch {
    existed = false;
  }
  await mkdir(args.metarepoPath, { recursive: true });
  await mkdir(join(args.metarepoPath, "repos"), { recursive: true });
  await mkdir(join(args.metarepoPath, "docs"), { recursive: true });
  await mkdir(join(args.metarepoPath, "scripts"), { recursive: true });
  return {
    metarepoPath: args.metarepoPath,
    status: existed ? "skipped" : "created",
  };
}
