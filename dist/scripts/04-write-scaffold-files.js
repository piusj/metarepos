import { join } from "node:path";
import { writeFileIfMissing } from "../lib/skip-if-exists.js";
import { agentsMd } from "../templates/agents-md.js";
import { claudeMd } from "../templates/claude-md.js";
import { gitignoreContent } from "../templates/gitignore.js";
import { metaArchPromptMd } from "../templates/meta-arch-prompt-md.js";
import { metaRootMd } from "../templates/meta-root-md.js";
import { readmeMd } from "../templates/readme-md.js";
export async function writeScaffoldFiles(args) {
    const { metarepoPath, name } = args;
    const writes = [];
    writes.push(await writeFileIfMissing(join(metarepoPath, "AGENTS.md"), agentsMd(name)));
    writes.push(await writeFileIfMissing(join(metarepoPath, "CLAUDE.md"), claudeMd()));
    writes.push(await writeFileIfMissing(join(metarepoPath, "META-ROOT.md"), metaRootMd(name)));
    writes.push(await writeFileIfMissing(join(metarepoPath, "README.md"), readmeMd(name)));
    writes.push(await writeFileIfMissing(join(metarepoPath, ".gitignore"), gitignoreContent()));
    writes.push(await writeFileIfMissing(join(metarepoPath, "META-ARCH-PROMPT.md"), metaArchPromptMd()));
    writes.push(await writeFileIfMissing(join(metarepoPath, "repos/.gitkeep"), ""));
    return { writes };
}
