# 180 - Agent Instructions Consolidation (Claude + Codex)

**Status**: Proposed  
**Category**: tooling  
**Depends On**: None

## Problem
`AGENTS.md` and `CLAUDE.md` are duplicated word-for-word and framed as Claude-only (context hierarchy mentions “Claude reads...”), leaving Codex users unclear on canonical guidance and whether `.claude/` commands/skills apply. Duplication risks drift when one file changes.

## Proposed Solution
Establish a single canonical instructions doc and make tooling-agnostic wording. Keep `.claude/` as the shared commands/skills directory (or rename if desired), but document explicitly how Codex consumes it. Provide a thin redirect/alias for the non-canonical file to avoid breakage.

## Implementation Steps
1. Pick `AGENTS.md` as the canonical source; replace `CLAUDE.md` content with a short pointer linking to `AGENTS.md` (or vice versa) to prevent divergence.
2. Update wording to refer to “agents” generically and clarify that both Claude and Codex read the same instructions/context order.
3. Add a brief note explaining `.claude/commands` and `.claude/skills` are the shared directory for both agents (or plan rename if team prefers symmetry), including how to add new commands/skills.
4. Update any references in docs/README to the canonical file name if present.
5. Run lint on markdown if applicable; verify links resolve.

## Acceptance Criteria
- Only one file contains the full instructions; the other clearly points to it without duplicated content.
- Language is agent-agnostic and explicitly mentions Codex compatibility with `.claude/`.
- All internal links and references resolve and match the canonical path.

## Risks
- External references to the old filename could break if removed; mitigate by keeping the pointer file.
