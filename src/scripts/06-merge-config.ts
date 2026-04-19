import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RepoEntry } from "./02-prompt-repos.js";

type SymlinkEntry = { name: string; path: string };
type CloneEntry = { name: string; url: string };

export type MetarepoConfig = {
  name: string;
  symlinks: SymlinkEntry[];
  clones: CloneEntry[];
};

export type MergeConfigInput = {
  metarepoPath: string;
  name: string;
  repos: RepoEntry[];
};

export type MergeConfigResult = {
  status: "created" | "merged";
  addedCount: number;
  skippedCount: number;
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function mergeConfig(
  args: MergeConfigInput,
): Promise<MergeConfigResult> {
  const configPath = join(args.metarepoPath, "metarepo.config.json");
  const existed = await fileExists(configPath);

  let config: MetarepoConfig;
  if (existed) {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<MetarepoConfig>;
    config = {
      name: parsed.name ?? args.name,
      symlinks: Array.isArray(parsed.symlinks) ? parsed.symlinks : [],
      clones: Array.isArray(parsed.clones) ? parsed.clones : [],
    };
  } else {
    config = { name: args.name, symlinks: [], clones: [] };
  }

  const taken = new Set<string>([
    ...config.symlinks.map((e) => e.name),
    ...config.clones.map((e) => e.name),
  ]);

  let addedCount = 0;
  let skippedCount = 0;

  for (const repo of args.repos) {
    if (taken.has(repo.name)) {
      skippedCount++;
      continue;
    }
    if (repo.kind === "symlink") {
      config.symlinks.push({ name: repo.name, path: repo.path });
    } else {
      config.clones.push({ name: repo.name, url: repo.url });
    }
    taken.add(repo.name);
    addedCount++;
  }

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

  return {
    status: existed ? "merged" : "created",
    addedCount,
    skippedCount,
  };
}
