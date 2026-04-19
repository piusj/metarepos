import { readdir } from "node:fs/promises";
import { basename, relative, resolve } from "node:path";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";
export async function listSubdirs(dir) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        return entries
            .filter((e) => e.isDirectory() && !e.name.startsWith("."))
            .map((e) => e.name)
            .sort();
    }
    catch {
        return [];
    }
}
export function pathForConfig(metarepoPath, absolutePath) {
    const rel = relative(metarepoPath, absolutePath);
    // On macOS/Linux relative() returns forward-slash paths; if it's absolute we
    // shouldn't happen to land here but guard anyway.
    return rel.length === 0 ? "." : rel;
}
export async function promptRepos(args) {
    console.log(chalk.cyan.bold("\nStep 2/3 — Add your repos"));
    console.log(chalk.dim("  First, link existing repos from a parent directory.\n" +
        "  Then optionally add more one at a time (symlink or git clone URL)."));
    if (args.existingRepoNames.length > 0) {
        console.log(chalk.dim(`  Existing repos in config: ${chalk.bold(args.existingRepoNames.join(", "))} (these will be preserved).`));
    }
    const taken = new Set(args.existingRepoNames);
    const repos = [];
    const metarepoBase = basename(args.metarepoPath);
    // --- Step 2a: scan parent dir + multi-select -----------------------------
    const parentInput = await input({
        message: "Parent directory to scan for repos to symlink (relative to the current working directory):",
        default: ".",
        validate: (v) => v.trim().length > 0 || "Directory cannot be empty.",
    });
    const absoluteParent = resolve(args.cwd, parentInput.trim());
    const candidates = (await listSubdirs(absoluteParent)).filter((name) => name !== metarepoBase && !taken.has(name));
    if (candidates.length === 0) {
        console.log(chalk.dim(`  No subdirectories found under ${chalk.bold(absoluteParent)} to symlink — you can still add repos individually below.`));
    }
    else {
        const selected = await checkbox({
            message: "Select repos to symlink into repos/ (space to toggle, enter to confirm):",
            choices: candidates.map((name) => ({
                name,
                value: name,
                checked: true,
            })),
            loop: false,
        });
        for (const name of selected) {
            const abs = resolve(absoluteParent, name);
            const path = pathForConfig(args.metarepoPath, abs);
            repos.push({ kind: "symlink", name, path });
            taken.add(name);
        }
        if (selected.length > 0) {
            console.log(chalk.dim(`  ${selected.length} repo${selected.length === 1 ? "" : "s"} queued for symlinking.`));
        }
    }
    // --- Step 2b: individual add loop ----------------------------------------
    console.log(chalk.dim("\n  You can also add more repos individually — a git URL to clone,\n" +
        "  or a symlink to any path outside the scanned parent directory."));
    while (true) {
        const addMore = await confirm({
            message: repos.length === 0 ? "Add a repo?" : "Add another repo?",
            default: repos.length === 0,
        });
        if (!addMore)
            break;
        const kind = await select({
            message: "  Source:",
            choices: [
                { name: "clone (git clone from GitHub)", value: "clone" },
                { name: "symlink (link an existing local clone)", value: "symlink" },
            ],
        });
        if (kind === "clone") {
            const name = await input({
                message: "  Repo name (folder name under repos/):",
                validate: (v) => {
                    const t = v.trim();
                    if (!t)
                        return "Name cannot be empty.";
                    if (/[/\\]/.test(t))
                        return "Name cannot contain slashes.";
                    if (/^\./.test(t))
                        return "Name cannot start with a dot.";
                    if (taken.has(t))
                        return `Name "${t}" is already used.`;
                    return true;
                },
            });
            const url = await input({
                message: "  Git URL:",
                validate: (v) => v.trim().length > 0 || "URL cannot be empty.",
            });
            repos.push({ kind: "clone", name: name.trim(), url: url.trim() });
            taken.add(name.trim());
            continue;
        }
        // symlink: ask for path, derive name from basename
        let symlinkName = "";
        let symlinkPath = "";
        while (true) {
            const entered = await input({
                message: "  Local path (relative to the metarepo root or absolute):",
                validate: (v) => v.trim().length > 0 || "Path cannot be empty.",
            });
            const trimmed = entered.trim();
            const derived = basename(trimmed);
            if (!derived || derived === "." || derived === "..") {
                console.log(chalk.yellow("  That path doesn't give a usable folder name; try again."));
                continue;
            }
            if (/[/\\]/.test(derived)) {
                console.log(chalk.yellow("  Derived name contains slashes; try again."));
                continue;
            }
            if (taken.has(derived)) {
                console.log(chalk.yellow(`  Name "${derived}" is already used; pick a path with a different basename.`));
                continue;
            }
            symlinkName = derived;
            symlinkPath = trimmed;
            break;
        }
        console.log(chalk.dim(`  Linking as ${chalk.bold(symlinkName)}.`));
        repos.push({ kind: "symlink", name: symlinkName, path: symlinkPath });
        taken.add(symlinkName);
    }
    return { repos };
}
