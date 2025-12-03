---
description: Visual regression test workflows
argument-hint: [run|update|reset|compare|ci-fix]
---

# Visual Test Context

## Commands
| Command | Purpose |
|---------|---------|
| `npm run test:visual:docker` | Run tests in Docker (matches CI) |
| `npm run test:visual:docker:update` | Update baselines via Docker |
| `npm run test:visual:headless` | Run visual tests locally (may differ from CI) |
| `npm run test:visual:headed` | Run with browser UI (debugging) |
| `npm run reset:visual` | Clear results and reports |
| `npm run reset:visual:all` | Also clear baseline snapshots |

## Baseline Location
`stories/**/*.png` - colocated baseline screenshots (committed)

## Results Location
`tests/visual/results/` - generated during test runs (gitignored)

## Request
$ARGUMENTS

## Workflow by Action

**run** (default): Run visual tests locally
1. `npm run test:visual:docker` (recommended - matches CI)
2. Report pass/fail and any visual diffs

**update**: Update baselines after intentional visual changes
1. `npm run test:visual:docker:update`
2. Show which baselines changed
3. Commit new baselines

**reset**: Clear test artifacts
1. `npm run reset:visual`

**compare**: Investigate visual differences
1. Check `tests/visual/results/` for diff images
2. Compare against colocated baselines in `stories/`

**ci-fix**: Fix PR failing visual regression in CI

### When Your PR Fails Visual Regression CI

**Option 1: Inspect & Compare Locally (Recommended First)**
```bash
# Checkout main branch and run tests
git checkout main
npm run test:visual:docker

# Checkout your branch and run again
git checkout your-branch
npm run test:visual:docker

# Compare results in tests/visual/results/
```

**Option 2: Accept Changes via GitHub Action**
If the visual changes are intentional:
```bash
# Trigger the update-baselines workflow on your branch
gh workflow run update-baselines.yml --ref your-branch

# Wait for workflow to complete (creates a commit)
gh run list --workflow=update-baselines.yml --limit=1

# Pull the auto-generated commit
git pull
```

The workflow:
1. Runs visual tests with `--update-snapshots` in Docker (Linux)
2. Commits updated baseline PNGs to your branch
3. You can review the image diffs in the GitHub PR UI
4. CI will re-run and should pass

**Option 3: Download Artifacts from Failed CI**
If the update workflow isn't available:
1. Go to the failed CI run in GitHub Actions
2. Download the `visual-test-results` artifact
3. Extract and review the diff images
4. Manually copy updated baselines to `stories/`
5. Commit and push

## CI Integration

- **CI validates**: `.github/workflows/ci.yml` runs `docker compose run --rm visual-tests`
- **CI updates**: `.github/workflows/update-baselines.yml` (manual trigger)
- **Baselines must match Linux/Docker rendering** - local macOS screenshots will differ!
