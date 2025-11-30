# Plan 240: Agentic Workflow Architecture

**Status**: Complete
**Category**: tooling
**Depends On**: None

## Problem

Current development uses a single working directory with manual branch switching. As the project grows and AI-assisted development becomes more sophisticated, several pain points emerge:

1. **Context switching friction** - Switching branches loses IDE state, requires rebuilds
2. **No concurrent work** - Can't have agent working on feature branch while reviewing main
3. **Manual GitHub workflow** - Branch creation, PRs, and status checks done outside agent context
4. **No CI gating** - Merges not protected by automated checks

## Completion Summary

**Implemented in PR #1** (`feature/agentic-workflow`):

- Added `/worktree` slash command for creating/listing/removing git worktrees
- Added `/branch` slash command for creating feature branches via GitHub MCP
- Added `/pr` slash command for creating pull requests via GitHub MCP
- Updated CLAUDE.md with Git Worktrees section documenting the workflow
- Documented critical requirement: always run `npm install` after creating worktree (sets up husky hooks)

**Key discovery**: Worktrees that skip `npm install` bypass pre-commit hooks, which led to the `depthToViridis` type error reaching master.

## Goals

1. Enable **concurrent development** across multiple branches/features via git worktrees
2. Integrate **GitHub MCP** for branch/PR/status workflows within agent sessions
3. Establish **CI pipeline** with gated merges (follow-up plan) → See Plan 241
4. Keep **single `.claude/` folder** in main worktree - worktrees are just working directories

## Architecture: Single Repo + Worktrees

### Design Decision

**Single `.claude/` folder in main worktree**. Worktrees are just git working directories - they don't need their own context engineering.

```
surfing-game/                    # Main worktree (main branch)
├── .git/                        # Shared git database
├── .claude/                     # ALL context engineering lives here
│   ├── commands/
│   ├── skills/
│   └── settings.json
├── src/
└── ...

../surfing-game-wt-shoaling/     # Linked worktree (feature/shoaling)
├── .git → surfing-game/.git     # Points to shared git
├── src/                         # Working copy of code
└── (no .claude/)                # Claude accesses via permission prompt
```

### Why This Works

1. **Claude sessions run from main worktree** - All context engineering is available
2. **Worktrees are accessed via `additionalDirectories`** - Claude prompts for permission to write outside workspace
3. **Git operations work normally** - Commits in worktree go to shared `.git`
4. **No context duplication** - Single source of truth for commands/skills

### Worktree Commands

```bash
# Create worktree for feature branch
git worktree add ../surfing-game-wt-shoaling -b feature/shoaling

# List worktrees
git worktree list

# Remove worktree when done (keeps branch)
git worktree remove ../surfing-game-wt-shoaling

# Or just delete directory and prune
rm -rf ../surfing-game-wt-shoaling
git worktree prune
```

### Workflow

1. Run Claude from main worktree (`surfing-game/`)
2. Use `/worktree` command to create worktrees for features
3. Claude edits files in worktree (prompts for permission once)
4. Commit/push from worktree directory
5. Create PR via GitHub MCP
6. Delete worktree after merge

## GitHub MCP Integration

Update `.claude/` documentation to specify GitHub MCP usage for:

### Branch Operations

```
# Agent creates feature branch
mcp__github__create_branch(owner, repo, branch="feature/shoaling", from_branch="main")

# Check branch exists
mcp__github__list_branches(owner, repo)
```

### Pull Request Workflow

```
# Create PR
mcp__github__create_pull_request(
  owner, repo,
  title="feat: implement wave shoaling",
  head="feature/shoaling",
  base="main",
  body="## Summary\n- Adds shoaling physics...\n\n## Test Plan\n- [ ] Unit tests pass..."
)

# Check PR status (CI, reviews)
mcp__github__pull_request_read(method="get_status", owner, repo, pullNumber)

# Add review comments
mcp__github__add_comment_to_pending_review(...)
```

### Status Checks

```
# Get commit status (CI results)
mcp__github__get_commit(owner, repo, sha="HEAD")

# List PR checks
mcp__github__pull_request_read(method="get_status", ...)
```

## CI Pipeline (Follow-up Plan)

This plan focuses on workflow architecture. CI implementation should be a separate plan covering:

1. **GitHub Actions workflow** for:
   - Lint (`npm run lint`)
   - Type check (`npm run typecheck`)
   - Unit tests (`npm run test:unit`)
   - Visual tests (`npm run test:visual:headless`)
   - Build (`npm run build`)

2. **Branch protection rules**:
   - Require status checks to pass
   - Require PR reviews (optional for solo dev)
   - No direct pushes to main

3. **Deployment** (if applicable):
   - Deploy game to GitHub Pages / Vercel
   - Deploy stories to separate URL

## Implementation Steps

### Phase 1: Add `/worktree` Slash Command

Create `.claude/commands/worktree.md`:

```markdown
Create or manage git worktrees for concurrent feature development.

Usage:
- /worktree create <name> - Create new worktree for feature/<name>
- /worktree list - Show all worktrees
- /worktree remove <name> - Remove worktree (keeps branch)

Conventions:
- Worktrees are siblings: ../surfing-game-wt-<name>
- Run `npm install` after creation
- Delete worktree after PR is merged
```

### Phase 2: Add `/branch` Slash Command

Create `.claude/commands/branch.md`:

```markdown
Create a feature branch using GitHub MCP.

Usage: /branch <name>

Steps:
1. Use mcp__github__create_branch to create feature/<name> from main
2. Check out the branch locally (or in worktree if specified)
```

### Phase 3: Add `/pr` Slash Command

Create `.claude/commands/pr.md`:

```markdown
Create a pull request for the current branch using GitHub MCP.

Usage: /pr [title]

Steps:
1. Get current branch name
2. Use mcp__github__create_pull_request with:
   - head: current branch
   - base: main
   - title: provided or inferred from branch name
   - body: Summary of changes + test plan
```

### Phase 4: Update CLAUDE.md

Add section documenting:
- Worktree workflow and conventions
- GitHub MCP usage for branches/PRs
- How to check CI status via MCP

### Phase 5: CI Setup (Separate Plan 241)

Create follow-up plan for:
- GitHub Actions workflow
- Branch protection rules
- Status checks integration

## Files Affected

- `CLAUDE.md` - Add GitHub/worktree workflow section
- `.claude/commands/worktree.md` - New slash command
- `.claude/commands/branch.md` - New slash command
- `.claude/commands/pr.md` - New slash command
- `.github/workflows/ci.yml` - Future (Plan 241)

## Testing

1. **Worktree creation**: Run `/worktree create test-feature`, verify worktree at `../surfing-game-wt-test-feature`
2. **Permission prompt**: Edit a file in worktree, verify Claude prompts for permission once
3. **GitHub MCP**: Use `/branch` and `/pr` commands, verify operations succeed
4. **Concurrent dev**: Run dev servers in main and worktree on different ports

## Open Questions

1. **Worktree port management**: Should dev servers auto-detect available ports? (Vite does this by default)
2. **Node modules**: Each worktree needs its own `npm install` - consider pnpm for shared store later

## Related Plans

- **Plan 231**: Monorepo tooling evaluation (if we outgrow single repo)
- **Plan 241** (proposed): CI pipeline with GitHub Actions

## References

- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
