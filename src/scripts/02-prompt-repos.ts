import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";

export type RepoEntry =
  | { kind: "symlink"; name: string; path: string }
  | { kind: "clone"; name: string; url: string };

export type PromptReposInput = {
  existingRepoNames: string[];
};

export type PromptReposResult = {
  repos: RepoEntry[];
};

export async function promptRepos(
  args: PromptReposInput,
): Promise<PromptReposResult> {
  console.log(chalk.cyan.bold("\nStep 2/3 — Add your repos"));
  console.log(
    chalk.dim(
      "  For each repo, choose symlink (link an existing local clone) or clone (git clone from GitHub).\n" +
        "  You can add as many as you want, or skip and edit metarepo.config.json later.",
    ),
  );

  if (args.existingRepoNames.length > 0) {
    console.log(
      chalk.dim(
        `  Existing repos in config: ${chalk.bold(
          args.existingRepoNames.join(", "),
        )} (these will be preserved).`,
      ),
    );
  }

  const repos: RepoEntry[] = [];
  const taken = new Set(args.existingRepoNames);

  while (true) {
    const addMore = await confirm({
      message: repos.length === 0 ? "Add a repo?" : "Add another repo?",
      default: repos.length === 0,
    });
    if (!addMore) break;

    const name = await input({
      message: "  Repo name (folder name under repos/):",
      validate: (v: string) => {
        const t = v.trim();
        if (!t) return "Name cannot be empty.";
        if (/[\/\\]/.test(t)) return "Name cannot contain slashes.";
        if (/^\./.test(t)) return "Name cannot start with a dot.";
        if (taken.has(t)) return `Name "${t}" is already used.`;
        return true;
      },
    });

    const kind = await select<"clone" | "symlink">({
      message: "  Source:",
      choices: [
        { name: "clone (git clone from GitHub)", value: "clone" },
        { name: "symlink (link an existing local clone)", value: "symlink" },
      ],
    });

    if (kind === "clone") {
      const url = await input({
        message: "  Git URL:",
        validate: (v: string) =>
          v.trim().length > 0 || "URL cannot be empty.",
      });
      repos.push({ kind: "clone", name: name.trim(), url: url.trim() });
    } else {
      const path = await input({
        message: "  Local path (relative to the metarepo root):",
        validate: (v: string) =>
          v.trim().length > 0 || "Path cannot be empty.",
      });
      repos.push({ kind: "symlink", name: name.trim(), path: path.trim() });
    }

    taken.add(name.trim());
  }

  return { repos };
}
