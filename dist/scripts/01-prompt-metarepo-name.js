import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
export async function promptMetarepoName(args) {
    console.log(chalk.cyan.bold("\nStep 1/3 — Name your metarepo"));
    console.log(chalk.dim("  This will be the directory name created in your current working directory."));
    const name = await input({
        message: "Metarepo name:",
        validate: (value) => {
            const trimmed = value.trim();
            if (!trimmed)
                return "Name cannot be empty.";
            if (/[/\\]/.test(trimmed))
                return "Name cannot contain slashes.";
            if (/^\./.test(trimmed))
                return "Name cannot start with a dot.";
            return true;
        },
    });
    const metarepoPath = resolve(args.cwd, name.trim());
    if (existsSync(metarepoPath)) {
        console.log(chalk.yellow(`  Directory ${chalk.bold(name.trim())} already exists — will enter and merge idempotently.`));
    }
    return { name: name.trim(), metarepoPath };
}
