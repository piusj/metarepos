export function metaArchPromptMd() {
    return `# Metarepo Architecture Analysis

A ready-to-use prompt for a coding agent (Claude Code, etc.) to produce a shared architectural map of this metarepo. Feed this file to your agent as-is, or tailor it to your stack first.

---

## Goal

Produce a single authoritative document, \`META-ARCH.md\`, that explains how every repo under \`repos/\` fits together. The document will be read by both humans and future agent sessions, so it must be complete, accurate, and easy to navigate.

## Workflow

Spawn multiple specialised subagents in parallel where it saves wall-clock time (for example, one subagent per repo for the per-repo analyses), then consolidate the results.

1. **Per-repo analysis.** For each directory under \`repos/\`, produce a concise summary covering:
   - Purpose of the service (one sentence).
   - Primary language, framework, and runtime.
   - Key entry points (where execution starts).
   - Data stores, queues, and external dependencies.
   - Build, test, and deploy mechanisms.

2. **Relationship mapping.** Determine how services talk to and depend on each other:
   - Synchronous calls (HTTP, gRPC, etc.) — who calls whom, with what payloads.
   - Asynchronous links (events, queues, streams).
   - Shared infrastructure (databases, caches, auth providers).
   - Build-time or library-level dependencies.
   - Deploy ordering constraints.

3. **Architecture diagram.** Produce a Mermaid diagram (inside a fenced \`mermaid\` block) that visualises services as nodes and their interactions as edges. Distinguish synchronous vs asynchronous and show directionality. Follow the diagram with a prose explanation of the moving parts and why the system is shaped this way.

4. **Consolidate.** Write \`META-ARCH.md\` at the metarepo root with this structure:
   - \`## Overview\` — one or two paragraphs.
   - \`## Services\` — one subsection per repo, using the per-repo analyses above.
   - \`## Relationships & Data Flow\`.
   - \`## Architecture Diagram\` — the Mermaid block plus explanation.
   - \`## Operational Notes\` — deploy order, shared infrastructure, known cross-cutting concerns.

5. **Wire it into agent context.** Add a new section to \`AGENTS.md\` (for example \`## System architecture\`) that points at \`META-ARCH.md\` so future agent sessions pick it up automatically.

## Constraints

- Ground every claim in the code. If something is ambiguous after reading, call it out as an open question in the document rather than guessing.
- Keep each service summary short enough to skim — detail belongs in the repo itself.
- If the Mermaid diagram would exceed roughly 30 nodes, break it into layered diagrams (one overview plus subsystem drills) rather than producing a single unreadable graph.
`;
}
