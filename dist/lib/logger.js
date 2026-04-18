import chalk from "chalk";
import boxen from "boxen";
import figlet from "figlet";
import gradient from "gradient-string";
import logSymbols from "log-symbols";
import Table from "cli-table3";
const isTTY = process.stdout.isTTY === true;
export function printBanner() {
    if (!isTTY) {
        console.log("metarepos · scaffold a metarepo\n");
        return;
    }
    const ascii = figlet.textSync("metarepos", { font: "Small" });
    const banner = gradient(["#00b4ff", "#7a5cff", "#ff4fa3"])(ascii);
    console.log(banner);
    console.log(chalk.dim("  scaffold a metarepo\n"));
}
export function info(msg) {
    console.log(chalk.cyan(msg));
}
export function warn(msg) {
    console.warn(`${logSymbols.warning} ${chalk.yellow(msg)}`);
}
export function error(msg) {
    console.error(`${logSymbols.error} ${chalk.red(msg)}`);
}
export function created(path) {
    console.log(`  ${chalk.green(logSymbols.success)} ${chalk.bold(path)} ${chalk.dim("(created)")}`);
}
export function skipped(path, reason = "exists") {
    console.log(`  ${chalk.yellow("○")} ${chalk.bold(path)} ${chalk.dim(`(skip: ${reason})`)}`);
}
export function printSummary(s) {
    if (!isTTY) {
        console.log(`Summary: created=${s.created} skipped=${s.skipped} warnings=${s.warnings} time=${(s.elapsedMs / 1000).toFixed(2)}s`);
        console.log(`Metarepo: ${s.metarepoPath}`);
        console.log("Edit metarepo.config.json and re-run node scripts/init-repos.mjs any time — it's idempotent.");
        return;
    }
    const table = new Table({
        chars: {
            top: "", "top-mid": "", "top-left": "", "top-right": "",
            bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
            left: "", "left-mid": "", mid: "", "mid-mid": "",
            right: "", "right-mid": "", middle: " ",
        },
        style: { "padding-left": 0, "padding-right": 2 },
    });
    table.push([chalk.dim("Created"), chalk.green(String(s.created))], [chalk.dim("Skipped"), chalk.yellow(String(s.skipped))], [chalk.dim("Warnings"), s.warnings > 0 ? chalk.yellow(String(s.warnings)) : chalk.dim("0")], [chalk.dim("Time"), chalk.cyan(`${(s.elapsedMs / 1000).toFixed(2)}s`)]);
    const body = table.toString() +
        "\n\n" +
        chalk.dim(`Edit ${chalk.bold("metarepo.config.json")} and re-run\n` +
            `${chalk.bold("node scripts/init-repos.mjs")} any time — it's idempotent.`);
    console.log("\n" +
        boxen(body, {
            title: chalk.cyan(" Summary "),
            titleAlignment: "left",
            padding: 1,
            borderStyle: "round",
            borderColor: "cyan",
        }));
    console.log(chalk.dim(`\nMetarepo: ${chalk.bold(s.metarepoPath)}`));
}
export function printNextSteps(metarepoPath) {
    const promptPath = `${metarepoPath}/META-ARCH-PROMPT.md`;
    const statusPath = `${metarepoPath}/scripts/status.sh`;
    if (!isTTY) {
        console.log(`Next:`);
        console.log(`  1. Open ${promptPath} and give it to your coding agent to map out how your services fit together. Modify the result as needed.`);
        console.log(`  2. Run ${statusPath} any time for a cross-repo status report (branches + worktrees). Tip: wrap it as a Claude Code skill under .claude/skills/metarepo-status/ so "check status" triggers it.`);
        return;
    }
    console.log("\n" +
        chalk.cyan.bold("Next steps") +
        "\n" +
        `  ${chalk.cyan("1.")} Open ${chalk.bold("META-ARCH-PROMPT.md")} and give it to your coding agent\n` +
        `     to map out how your services fit together. Modify the result as needed.\n` +
        "\n" +
        `  ${chalk.cyan("2.")} Run ${chalk.bold("bash scripts/status.sh")} any time for a cross-repo\n` +
        `     status report — branches, ahead/behind, uncommitted changes, and worktrees.\n` +
        `     ${chalk.dim("Tip: wrap it as a Claude Code skill at ")}${chalk.bold(".claude/skills/metarepo-status/")}${chalk.dim(" so")}\n` +
        `     ${chalk.dim(`\"check status\" triggers it automatically.`)}`);
}
