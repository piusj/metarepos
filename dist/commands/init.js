import { Listr } from "listr2";
import chalk from "chalk";
import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { promptMetarepoName } from "../scripts/01-prompt-metarepo-name.js";
import { promptRepos } from "../scripts/02-prompt-repos.js";
import { createTargetDirectory } from "../scripts/03-create-target-directory.js";
import { writeScaffoldFiles } from "../scripts/04-write-scaffold-files.js";
import { writeInitReposScript } from "../scripts/05-write-init-repos-script.js";
import { mergeConfig } from "../scripts/06-merge-config.js";
import { writeGitStatusScript } from "../scripts/09-write-git-status-script.js";
import { runGitInit } from "../scripts/07-run-git-init.js";
import { runInitRepos } from "../scripts/08-run-init-repos.js";
import { writeCodeWorkspace } from "../scripts/10-write-code-workspace.js";
import { printBanner, printSummary } from "../lib/logger.js";
async function readExistingRepoNames(metarepoPath) {
    const cfg = join(metarepoPath, "metarepo.config.json");
    try {
        await access(cfg);
    }
    catch {
        return [];
    }
    try {
        const parsed = JSON.parse(await readFile(cfg, "utf8"));
        return [
            ...(parsed.symlinks ?? []).map((e) => e.name),
            ...(parsed.clones ?? []).map((e) => e.name),
        ];
    }
    catch {
        return [];
    }
}
function countWrites(writes) {
    let c = 0, s = 0;
    for (const w of writes)
        (w.status === "created" ? c++ : s++);
    return [c, s];
}
export async function runInitProgrammatic(args) {
    const start = Date.now();
    const metarepoPath = join(args.cwd, args.name);
    const ctx = {
        metarepoPath,
        name: args.name,
        repos: args.repos,
        createdCount: 0,
        skippedCount: 0,
    };
    const tasks = new Listr([
        {
            title: "Create target directory",
            task: async (ctx, task) => {
                const result = await createTargetDirectory({ metarepoPath: ctx.metarepoPath });
                task.title = `Create target directory ${chalk.dim(ctx.metarepoPath)} ${chalk.dim(`(${result.status})`)}`;
                if (result.status === "created")
                    ctx.createdCount++;
                else
                    ctx.skippedCount++;
            },
        },
        {
            title: "Write scaffold files",
            task: async (ctx, task) => {
                const { writes } = await writeScaffoldFiles({
                    metarepoPath: ctx.metarepoPath,
                    name: ctx.name,
                });
                const [c, s] = countWrites(writes);
                ctx.createdCount += c;
                ctx.skippedCount += s;
                task.title = `Write scaffold files ${chalk.dim(`(${c} created, ${s} skipped)`)}`;
            },
        },
        {
            title: "Install scripts/init-repos.mjs",
            task: async (ctx, task) => {
                const { write } = await writeInitReposScript({ metarepoPath: ctx.metarepoPath });
                if (write.status === "created")
                    ctx.createdCount++;
                else
                    ctx.skippedCount++;
                task.title = `Install scripts/init-repos.mjs ${chalk.dim(`(${write.status})`)}`;
            },
        },
        {
            title: "Install scripts/git-status.sh",
            task: async (ctx, task) => {
                const { write } = await writeGitStatusScript({ metarepoPath: ctx.metarepoPath });
                if (write.status === "created")
                    ctx.createdCount++;
                else
                    ctx.skippedCount++;
                task.title = `Install scripts/git-status.sh ${chalk.dim(`(${write.status})`)}`;
            },
        },
        {
            title: "Merge metarepo.config.json",
            task: async (ctx, task) => {
                const result = await mergeConfig({
                    metarepoPath: ctx.metarepoPath,
                    name: ctx.name,
                    repos: ctx.repos,
                });
                if (result.status === "created")
                    ctx.createdCount++;
                else {
                    ctx.createdCount += result.addedCount;
                    ctx.skippedCount += result.skippedCount;
                }
                task.title =
                    result.status === "created"
                        ? "Merge metarepo.config.json (created)"
                        : `Merge metarepo.config.json ${chalk.dim(`(+${result.addedCount}, ~${result.skippedCount})`)}`;
            },
        },
        {
            title: "Install meta.code-workspace",
            task: async (ctx, task) => {
                const { write } = await writeCodeWorkspace({
                    metarepoPath: ctx.metarepoPath,
                    name: ctx.name,
                });
                if (write.status === "created")
                    ctx.createdCount++;
                else
                    ctx.skippedCount++;
                task.title = `Install meta.code-workspace ${chalk.dim(`(${write.status})`)}`;
            },
        },
        {
            title: "Run git init",
            task: async (ctx, task) => {
                const result = await runGitInit({
                    metarepoPath: ctx.metarepoPath,
                    forward: (line) => { task.output = line; },
                });
                if (result.status === "initialized")
                    ctx.createdCount++;
                else
                    ctx.skippedCount++;
                task.title = `Run git init ${chalk.dim(`(${result.status})`)}`;
            },
            rendererOptions: { persistentOutput: false, outputBar: 5 },
        },
        {
            title: "Run scripts/init-repos.mjs",
            task: async (ctx, task) => {
                const result = await runInitRepos({
                    metarepoPath: ctx.metarepoPath,
                    forward: (line) => { task.output = line; },
                });
                if (result.exitCode !== 0) {
                    throw new Error(`init-repos exited with code ${result.exitCode}`);
                }
                task.title = "Run scripts/init-repos.mjs";
            },
            rendererOptions: { persistentOutput: true, outputBar: 10 },
        },
    ], {
        concurrent: false,
        rendererOptions: {
            collapseSubtasks: false,
            showSubtasks: true,
        },
        renderer: "default",
        fallbackRenderer: "verbose",
    });
    await tasks.run(ctx);
    printSummary({
        created: ctx.createdCount,
        skipped: ctx.skippedCount,
        warnings: 0,
        elapsedMs: Date.now() - start,
        metarepoPath,
    });
    const { printNextSteps } = await import("../lib/logger.js");
    printNextSteps(metarepoPath);
}
export async function runInitInteractive(cwd) {
    printBanner();
    const { name, metarepoPath } = await promptMetarepoName({ cwd });
    const existingRepoNames = await readExistingRepoNames(metarepoPath);
    const { repos } = await promptRepos({ existingRepoNames });
    await runInitProgrammatic({ cwd, name, repos });
}
