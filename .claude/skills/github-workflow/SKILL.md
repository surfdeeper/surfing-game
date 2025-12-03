# GitHub Workflow Skill

Use this skill when working with PRs, branches, worktrees, GitHub Actions CI, or MCP-based GitHub operations.

## Trigger Keywords

Auto-apply when user mentions:
- PR, pull request, merge
- branch, worktree
- CI, GitHub Actions, workflow
- check status, failing, passing
- visual regression CI, baseline update, update-baselines

## Inspecting CI Failures (Step by Step)

### 1. Find the PR and Check Status

```
# Get PR status (includes Vercel, but NOT GitHub Actions)
mcp__github__pull_request_read(method="get_status", owner="surfdeeper", repo="surfing-game", pullNumber=2)

# List recent workflow runs
WebFetch: https://api.github.com/repos/surfdeeper/surfing-game/actions/runs?per_page=5
Prompt: "Show run IDs, status, and conclusion for each run"
```

### 2. Get Job Details for a Failed Run

```
# Get jobs and their steps
WebFetch: https://api.github.com/repos/surfdeeper/surfing-game/actions/runs/<RUN_ID>/jobs
Prompt: "Show all jobs, their steps, status, and which step failed"
```

### 3. Get Actual Log Output

The GitHub API doesn't expose raw logs without auth. Use these approaches:

```
# Option A: Fetch the Actions page (may have limited log excerpts)
WebFetch: https://github.com/surfdeeper/surfing-game/actions/runs/<RUN_ID>
Prompt: "Extract all error messages and log output shown on this page"

# Option B: Ask user to paste logs from GitHub UI
# The user can click on the failed step and copy the log output
```

### 4. Common Exit Codes

| Exit Code | Meaning | Common Causes |
|-----------|---------|---------------|
| 1 | General error | Test failures, script errors |
| 127 | Command not found | Missing tool, wrong command syntax |
| 137 | OOM killed | Out of memory |
| 139 | Segfault | Crash in native code |

## GitHub MCP Tools Reference

### Pull Requests

```
# List open PRs
mcp__github__list_pull_requests(owner="surfdeeper", repo="surfing-game", state="open")

# Search PRs (e.g., by author)
mcp__github__search_pull_requests(query="author:joshribakoff", owner="surfdeeper", repo="surfing-game")

# Get PR details
mcp__github__pull_request_read(method="get", owner="surfdeeper", repo="surfing-game", pullNumber=2)

# Get PR diff
mcp__github__pull_request_read(method="get_diff", owner="surfdeeper", repo="surfing-game", pullNumber=2)

# Get PR status (CI checks)
mcp__github__pull_request_read(method="get_status", owner="surfdeeper", repo="surfing-game", pullNumber=2)

# Create PR
mcp__github__create_pull_request(
  owner="surfdeeper",
  repo="surfing-game",
  title="feat: description",
  head="feature/branch-name",
  base="master",
  body="## Summary\n..."
)
```

### Branches

```
# Create branch
mcp__github__create_branch(
  owner="surfdeeper",
  repo="surfing-game",
  branch="feature/name",
  from_branch="master"
)

# List branches
mcp__github__list_branches(owner="surfdeeper", repo="surfing-game")
```

### Commits

```
# List recent commits
mcp__github__list_commits(owner="surfdeeper", repo="surfing-game", perPage=10)

# Get commit details
mcp__github__get_commit(owner="surfdeeper", repo="surfing-game", sha="abc123")
```

## Git Worktrees

Worktrees enable concurrent development on multiple branches.

### Create Worktree

```bash
# Create worktree for feature branch
git worktree add ../surfing-game-wt-<name> -b feature/<name>

# CRITICAL: Always run npm install after creating worktree
cd ../surfing-game-wt-<name> && npm install
```

### List Worktrees

```bash
git worktree list
```

### Remove Worktree

```bash
# Remove worktree (keeps branch)
git worktree remove ../surfing-game-wt-<name>

# Or delete and prune
rm -rf ../surfing-game-wt-<name>
git worktree prune
```

### Worktree Conventions

- Worktrees are sibling directories: `../surfing-game-wt-<name>`
- Always run `npm install` after creation (sets up husky hooks)
- Delete worktree after PR is merged
- Run Claude from main worktree to access `.claude/` context

## Common CI Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Docker Compose v1 vs v2 | Exit code 127 on `docker-compose` | Use `docker compose` (space) on GitHub Actions |
| Docker volume busy | "Device or resource busy" on rm | Use `rm -rf dir/*` instead of `rm -rf dir` |
| Visual tests fail | Screenshots differ | Regenerate baselines with Docker: `npm run test:visual:docker:update` |
| Lint warnings | Unused variables | Fix or prefix with `_` |
| Type errors | Type mismatch | Run `npm run typecheck` locally first |
| Pre-commit hooks slow | Long running tests | Use `--no-verify` for quick commits, ensure hooks pass in CI |

## Visual Regression CI Workflows

The CI uses Docker for consistent visual regression screenshots across all platforms.

### Two Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Push/PR to master | Validates screenshots match baselines |
| **Update Baselines** | `update-baselines.yml` | Manual | Generates new baselines, auto-commits |

### When PR Fails Visual Regression

**Quick Reference:**
```bash
# Option 1: Trigger auto-update workflow
gh workflow run update-baselines.yml --ref your-branch
gh run list --workflow=update-baselines.yml --limit=1
git pull  # Get the auto-committed baselines

# Option 2: Compare locally in Docker
git checkout main && npm run test:visual:docker
git checkout your-branch && npm run test:visual:docker
# Review diffs in tests/visual/results/
```

### Update Baselines Workflow Details

The `update-baselines.yml` workflow:
1. Runs visual tests with `--update-snapshots` in Docker (Linux)
2. Validates baseline count (prevents accidental deletions)
3. Commits updated PNGs with `[skip ci]` message
4. Pushes commit to your branch automatically
5. You review PNG diffs in GitHub PR UI

**Trigger from CLI:**
```bash
gh workflow run update-baselines.yml --ref feature/my-branch
```

**Trigger from GitHub UI:**
1. Go to Actions → "Update Visual Baselines"
2. Click "Run workflow"
3. Select your branch
4. Click "Run workflow"

### Why Docker is Required

Screenshots differ between operating systems (font rendering, anti-aliasing, etc.). CI runs on Linux, so all baselines **must** be generated in Docker to match.

```yaml
# .github/workflows/ci.yml uses:
run: docker compose run --rm visual-tests
```

Key points:
- Uses `docker compose` (v2 syntax) not `docker-compose` (v1)
- Volumes mount `./stories` to persist baseline PNGs
- Reset scripts use `rm -rf dir/*` to avoid "device busy" errors on mount points

### Reviewing Visual Changes in PRs

After baselines are updated:
1. GitHub automatically renders PNG diffs side-by-side
2. Review each changed screenshot in the PR "Files changed" tab
3. Approve if changes are intentional
4. Request changes if something looks wrong

## Reference

- [Plan 240: Agentic Workflow Architecture](plans/tooling/240-agentic-workflow-architecture.md)
- [Plan 241: GitHub Actions CI](plans/tooling/241-github-actions-ci.md)
- [Plan 242: Auto-Commit Visual Baselines](plans/tooling/242-auto-commit-visual-baselines.md)
- [Git Worktrees Documentation](https://git-scm.com/docs/git-worktree)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
