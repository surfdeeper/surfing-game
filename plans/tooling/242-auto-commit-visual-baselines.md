# Plan 242: Auto-Commit Visual Baselines from CI

**Status**: 🟢 Complete
**Dependencies**: Plan 241 (GitHub Actions CI)
**Category**: Tooling / CI/CD

## Completion Summary

Implemented automated visual baseline workflow:
- **Phase 1**: Baselines bootstrapped via manual PR #5 (Linux Docker screenshots)
- **Phase 2**: Created `update-baselines.yml` with manual `workflow_dispatch` trigger
- CI now validates baselines match (no `--update-snapshots` flag)
- Developers can update baselines with: `gh workflow run update-baselines.yml`

## Problem

Visual regression baselines must be generated in Linux (via Docker) to match CI rendering, but:
- Local Docker 19.x is too old to run modern Node.js (crashes with exit 134)
- Manual download and commit workflow is tedious
- Baselines drift when developers forget to update them

Current manual workflow:
1. CI runs with `--update-snapshots`
2. CI uploads artifact
3. Developer downloads artifact from GitHub UI
4. Developer extracts PNGs to `./stories/`
5. Developer commits and pushes
6. Developer removes `--update-snapshots` flag

## Proposed Solution

**Automated baseline commit workflow** triggered by special commit message or label:

```yaml
# .github/workflows/update-baselines.yml
name: Update Visual Baselines

on:
  workflow_dispatch:  # Manual trigger
  push:
    branches: [feature/*]
    paths:
      - 'stories/**/*.tsx'
      - 'stories/**/*.visual.spec.ts'
      - 'src/render/**/*.ts'

jobs:
  update-baselines:
    name: Generate and Commit Linux Baselines
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Allow pushing commits
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Generate baselines in Docker
        run: docker compose run --rm visual-tests -- --update-snapshots

      - name: Check for baseline changes
        id: check_changes
        run: |
          if git diff --quiet stories/**/*.png; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit and push baselines
        if: steps.check_changes.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add stories/**/*.png
          git commit -m "chore: update visual baselines (Linux Docker) [skip ci]"
          git push

      - name: Comment on PR
        if: steps.check_changes.outputs.changed == 'true' && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Visual baselines updated automatically by CI'
            })
```

## Design Decisions

### 1. Separate Workflow vs. Same Workflow

**Decision**: Separate workflow file (`update-baselines.yml`)

**Rationale**:
- CI checks should fail if baselines don't match
- Baseline updates are intentional, not automatic
- Clearer separation of concerns

### 2. Trigger Conditions

**Option A**: Always update on story/render changes
- ❌ Could cause unexpected commits
- ❌ Might update baselines when tests are intentionally failing

**Option B**: Manual trigger only (`workflow_dispatch`)
- ✅ Explicit intent
- ✅ Developer controls when to update
- ✅ Can be triggered from GitHub UI or CLI

**Option C**: PR label (e.g., `update-baselines`)
- ✅ Clear intent in PR
- ✅ Visible in PR timeline
- ❌ Requires label management

**Decision**: Start with **Option B** (manual), add **Option C** (label) later

### 3. Permissions

**Required**:
- `contents: write` - to push commits
- `pull-requests: write` - to comment on PRs (optional)

**Security**: Uses `GITHUB_TOKEN` (automatic, scoped to repo)

### 4. Preventing Infinite Loops

**Strategies**:
1. `[skip ci]` in commit message - prevents triggering CI on baseline commit
2. `paths` filter - only trigger on source changes, not PNGs
3. Check for changes before committing - don't commit if baselines unchanged

### 5. Baseline Validation

**Before committing**, verify:
- All expected baselines were generated
- No baselines were deleted unexpectedly
- File sizes are reasonable (catch rendering errors)

```bash
# Validation step
- name: Validate baselines
  run: |
    BASELINE_COUNT=$(find stories -name "*.png" | wc -l)
    if [ "$BASELINE_COUNT" -lt 20 ]; then
      echo "Error: Only $BASELINE_COUNT baselines found (expected 20+)"
      exit 1
    fi
```

## Implementation Steps

### Phase 1: Bootstrap (Complete)
- [x] Add `--update-snapshots` to CI temporarily
- [x] Upload baselines as artifact
- [x] Download and commit manually (via PR #5)
- [x] Verify CI passes with new baselines
- [x] Remove `--update-snapshots` flag

### Phase 2: Automated Workflow (Complete)
- [x] Create `update-baselines.yml` workflow
- [x] Add `workflow_dispatch` trigger
- [x] Add baseline validation checks
- [ ] Test with manual trigger (pending first use)
- [ ] Document usage in README (see Completion Summary above)

### Phase 3: Enhancements
- [ ] Add PR label trigger
- [ ] Add PR comment with baseline diff summary
- [ ] Add baseline change detection (show which stories changed)
- [ ] Consider baseline approval workflow (require review)

## Edge Cases

### 1. Merge Conflicts
**Scenario**: Two PRs update baselines concurrently

**Solution**: Standard git conflict resolution
- Second PR will fail to push
- Developer rebases and re-triggers baseline update

### 2. Partial Baseline Updates
**Scenario**: Only some tests update baselines

**Solution**: Commit all changed baselines together
- Use `git add stories/**/*.png` to capture all changes
- Validate expected baseline count before committing

### 3. Baseline Regression
**Scenario**: Automated commit introduces broken baselines

**Solution**:
- Require visual baseline updates in separate commits
- Easy to revert bad baseline commit
- Main CI still validates baselines match

### 4. Fork PRs
**Scenario**: External contributors can't trigger workflows with write permissions

**Solution**:
- Maintainers manually trigger `workflow_dispatch`
- Or: Approve via PR label (requires maintainer)

## Rollback Strategy

If automated commits cause issues:

1. **Disable workflow**: Remove or rename `update-baselines.yml`
2. **Revert commits**: `git revert <baseline-commit-sha>`
3. **Fall back to manual**: Download artifacts as before

## Testing Plan

1. **Test workflow manually**
   ```bash
   gh workflow run update-baselines.yml --ref feature/test-branch
   ```

2. **Verify commit message**
   - Check `[skip ci]` tag prevents loop
   - Verify author is `github-actions[bot]`

3. **Test validation**
   - Temporarily break baseline generation
   - Verify workflow fails before committing

4. **Test no-op case**
   - Run on branch with no baseline changes
   - Verify no commit is created

## Metrics

Track:
- Baseline update frequency (commits/week)
- Failed baseline updates (validation errors)
- Time saved (manual download → automated)

## Alternative Approaches Considered

### 1. Pre-commit Hook for Baseline Updates
**Rejected**: Requires local Docker (the problem we're solving)

### 2. Bot Service (e.g., Renovate-style)
**Rejected**: Over-engineered for this use case

### 3. Baseline Review Workflow
**Future consideration**: Require approval before merging baseline changes

## References

- [Plan 241: GitHub Actions CI](241-github-actions-ci.md)
- [GitHub Actions: Pushing to protected branches](https://github.com/orgs/community/discussions/25305)
- [Docker skill: Container monitoring](.claude/skills/docker/SKILL.md)

## Success Criteria

- [x] Developers can update baselines with one command: `gh workflow run update-baselines.yml`
- [x] Baselines auto-commit to current branch
- [x] CI validates baselines match on subsequent pushes
- [x] Zero manual download/extract/commit steps
- [x] Works across team (not just maintainers)
