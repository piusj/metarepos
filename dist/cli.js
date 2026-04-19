#!/usr/bin/env node
import chalk from "chalk";
import { runInitInteractive } from "./commands/init.js";
const [, , ...args] = process.argv;
const sub = args[0];
async function main() {
    if (!sub || sub === "init") {
        const configIdx = args.indexOf("--config");
        if (configIdx !== -1) {
            const configPath = args[configIdx + 1];
            if (!configPath) {
                console.error(chalk.red("--config requires a file path"));
                process.exit(1);
            }
            const { readFile } = await import("node:fs/promises");
            const { resolve: resolvePath } = await import("node:path");
            const raw = await readFile(resolvePath(process.cwd(), configPath), "utf8");
            const parsed = JSON.parse(raw);
            const { runInitProgrammatic } = await import("./commands/init.js");
            await runInitProgrammatic({
                cwd: process.cwd(),
                name: parsed.name,
                repos: parsed.repos,
            });
            return;
        }
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
        console.log(`Usage:\n` +
            `  metarepos init                       Scaffold a new metarepo (interactive).\n` +
            `  metarepos init --config <path>       Scaffold from a JSON answers file (non-interactive).\n` +
            `\n` +
            `Answer file shape:\n` +
            `  { "name": "<metarepo-name>", "repos": [ { "kind": "symlink"|"clone", "name": "<n>", "path"|"url": "..." } ] }\n`);
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
