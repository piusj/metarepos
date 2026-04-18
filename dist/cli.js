#!/usr/bin/env node
import { runInitInteractive } from "./commands/init.js";
import chalk from "chalk";
const [, , ...args] = process.argv;
const sub = args[0];
async function main() {
    if (!sub || sub === "init") {
        await runInitInteractive(process.cwd());
        return;
    }
    if (sub === "--version" || sub === "-v") {
        const { readFile } = await import("node:fs/promises");
        const { fileURLToPath } = await import("node:url");
        const { dirname, join } = await import("node:path");
        const here = dirname(fileURLToPath(import.meta.url));
        const pkg = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));
        console.log(pkg.version);
        return;
    }
    if (sub === "--help" || sub === "-h") {
        console.log(`Usage:\n  metarepos init    Scaffold a new metarepo in the current directory.`);
        return;
    }
    console.error(chalk.red(`Unknown command: ${sub}`));
    console.error(`Run ${chalk.bold("metarepos --help")} for usage.`);
    process.exit(1);
}
main().catch((err) => {
    // @inquirer/prompts throws ExitPromptError on Ctrl+C; treat as clean exit.
    const name = err?.name;
    if (name === "ExitPromptError") {
        console.error(chalk.yellow("\nAborted."));
        process.exit(130);
    }
    console.error(chalk.red(`\nError: ${err.message}`));
    process.exit(1);
});
