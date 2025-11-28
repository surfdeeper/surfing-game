---
description: Visual regression test workflows
argument-hint: [run|update|reset|compare]
---

# Visual Test Context

## Commands
| Command | Purpose |
|---------|---------|
| `npm run test:visual:headless` | Run visual tests (CI/agent) |
| `npm run test:visual:headed` | Run with browser UI (debugging) |
| `npm run test:visual:update:headless` | Update baseline snapshots |
| `npm run test:visual:update:headed` | Update baselines with UI |
| `npm run reset:visual` | Clear results and reports |
| `npm run reset:visual:all` | Also clear baseline snapshots |

## Baseline Location
`tests/visual/baseline/` - committed reference images

## Results Location
`tests/visual/results/` - generated during test runs (gitignored)

## Request
$ARGUMENTS

## Workflow by Action

**run** (default): Run visual tests
1. `npm run test:visual:headless`
2. Report pass/fail and any visual diffs

**update**: Update baselines after intentional visual changes
1. `npm run test:visual:update:headless`
2. Show which baselines changed
3. Remind to commit new baselines

**reset**: Clear test artifacts
1. `npm run reset:visual`

**compare**: Investigate visual differences
1. Check `tests/visual/results/` for diff images
2. Compare against `tests/visual/baseline/`
