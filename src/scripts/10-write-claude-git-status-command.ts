import { join } from "node:path";
import { type WriteResult, writeFileIfMissing } from "../lib/skip-if-exists.js";
import { claudeGitStatusCommandMd } from "../templates/claude-git-status-command-md.js";

export type WriteClaudeGitStatusCommandInput = {
  metarepoPath: string;
};

export type WriteClaudeGitStatusCommandResult = {
  write: WriteResult;
};

export async function writeClaudeGitStatusCommand(
  args: WriteClaudeGitStatusCommandInput,
): Promise<WriteClaudeGitStatusCommandResult> {
  const target = join(args.metarepoPath, ".claude/commands/git-status.md");
  const write = await writeFileIfMissing(target, claudeGitStatusCommandMd());
  return { write };
}
