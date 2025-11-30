# Plan 241: GitHub Actions CI Pipeline

**Status**: Complete
**Category**: tooling
**Depends On**: 240 (Agentic Workflow Architecture)

## Problem

Currently relying on Vercel for deployment checks, but there's no CI pipeline that:
1. Runs the full test suite (lint, typecheck, unit, visual)
2. Gates merges to master with required status checks
3. Provides fast feedback on PRs before Vercel deployment

The pre-commit hooks help locally, but can be bypassed (as we discovered with the `depthToViridis` bug that broke master).

## Goals

1. Run all checks on every PR: lint, typecheck, unit tests, smoke test
2. Run visual regression tests (optional/separate job due to time)
3. Block merges if checks fail (branch protection)
4. Cache dependencies for fast CI runs
5. Keep it simple - single workflow file

## Completion Summary

**Implemented in PR #2** (`feature/ci-setup`):

- Created `.github/workflows/ci.yml` with two jobs:
  - `check`: Lint, typecheck, smoke test, unit tests (~2 min)
  - `visual`: Visual regression tests, depends on `check` passing
- Added concurrency control to cancel in-progress runs on new pushes
- Configured artifact upload on visual test failure for debugging
- Uses npm cache for faster dependency installation

**Remaining (manual steps)**:
- Configure branch protection rules in GitHub Settings after merge

## Solution

### Workflow Structure

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:smoke
      - run: npm run test:unit

  visual:
    runs-on: ubuntu-latest
    needs: check  # Only run if checks pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:visual:headless
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-test-results
          path: tests/visual/results/
```

### Branch Protection Rules

After CI is working, configure in GitHub Settings → Branches → master:

1. **Require status checks to pass before merging**
   - Required checks: `check` (the fast job)
   - Optional: `visual` (longer running)
2. **Require branches to be up to date before merging**
3. **Do not allow bypassing the above settings** (optional for solo dev)

## Implementation Steps

### Phase 1: Basic CI Workflow

1. Create `.github/workflows/ci.yml` with the `check` job
2. Push to a PR branch and verify it runs
3. Confirm all checks pass

### Phase 2: Visual Tests Job

1. Add the `visual` job that depends on `check`
2. Configure Playwright for CI (headless, chromium only)
3. Upload artifacts on failure for debugging

### Phase 3: Branch Protection

1. Go to GitHub repo Settings → Branches
2. Add rule for `master` branch
3. Enable "Require status checks to pass"
4. Select `check` as required

### Phase 4: (Optional) Caching Improvements

1. Cache Playwright browsers between runs
2. Consider splitting visual tests by category for parallelism

## Files Affected

- `.github/workflows/ci.yml` - New file
- GitHub repo settings - Branch protection rules

## Testing

1. Create PR with intentional lint error → verify CI fails
2. Create PR with passing code → verify CI passes
3. Attempt to merge with failing CI → verify blocked (after branch protection)

## Open Questions

1. **Visual test flakiness**: Should visual tests be required or advisory?
2. **Playwright browser caching**: Worth the complexity?
3. **Concurrency**: Cancel in-progress runs when new commits pushed?

## References

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [actions/setup-node](https://github.com/actions/setup-node)
- [Playwright CI guide](https://playwright.dev/docs/ci-intro)
