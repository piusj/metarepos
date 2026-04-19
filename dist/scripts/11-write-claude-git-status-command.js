import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { claudeGitStatusCommandMd } from "../templates/claude-git-status-command-md.js";
export async function writeClaudeGitStatusCommand(args) {
    const target = join(args.metarepoPath, ".claude/commands/git-status.md");
    const write = await writeFileIfMissing(target, claudeGitStatusCommandMd());
    return { write };
}
