import { mkdir } from "node:fs/promises";

export type CreateTargetDirectoryInput = {
  metarepoPath: string;
};

export type CreateTargetDirectoryResult = {
  metarepoPath: string;
};

export async function createTargetDirectory(
  args: CreateTargetDirectoryInput,
): Promise<CreateTargetDirectoryResult> {
  await mkdir(args.metarepoPath, { recursive: true });
  await mkdir(`${args.metarepoPath}/repos`, { recursive: true });
  await mkdir(`${args.metarepoPath}/docs`, { recursive: true });
  await mkdir(`${args.metarepoPath}/scripts`, { recursive: true });
  return { metarepoPath: args.metarepoPath };
}
