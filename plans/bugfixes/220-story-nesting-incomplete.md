# Plan 220: Story Nesting Incomplete - Dead Stories and Broken Visual Tests

**Status**: Complete (Phases 1 & 2)
**Category**: bugfixes
**Depends On**: None

## Problem

The story organization refactoring that split stories into nested granular files was not completed properly. This has caused:

1. **Dead parent stories** - Old MDX files like `01-bathymetry/01-bathymetry.mdx` still exist with duplicated content that was split into child files (`01-depth-profiles/01-linear-slope.mdx`, etc.)

2. **Broken visual tests** - The `*.visual.spec.ts` files test `<Filmstrip>` strips that only exist in the dead parent stories, not the live granular `<SingleSnapshot>` pages

3. **Dead strip definitions** - Progressions files export `*_STRIPS` arrays that are only used by dead stories

4. **Missing dynamic assembly** - The original plan was for clicking a parent item (e.g., "1.1 Depth Profiles") to dynamically assemble all nested child docs into one scrollable page. This was never implemented.

## Current State (After Phase 1)

**Audit findings**: Only bathymetry (folder 01) was partially nested. Folders 02-08 still use Filmstrip as their primary live content and were NOT touched.

### Bathymetry (CLEANED UP):
```
stories/01-bathymetry/
├── 01-depth-profiles/
│   ├── 01-linear-slope.mdx        # LIVE - uses SingleSnapshot
│   ├── 02-steep-shore.mdx         # LIVE
│   └── 03-flat-bottom.mdx         # LIVE
└── 02-bottom-features/
    ├── 01-sandbar.mdx             # LIVE
    ├── 02-reef.mdx                # LIVE
    └── 03-channel.mdx             # LIVE
```

### Folders 02-08 (UNCHANGED - still use Filmstrip):
```
stories/02-energy-field/02-energy-field.mdx     # LIVE - uses Filmstrip
stories/02-energy-field/02-energy-field.visual.spec.ts  # LIVE - tests Filmstrip strips
... (same pattern for 03-08)
```

### What was deleted in Phase 1:
- `stories/01-bathymetry/01-bathymetry.mdx` - dead parent (duplicated nested content)
- `stories/01-bathymetry/01-bathymetry.visual.spec.ts` - tested dead parent
- `stories/01-bathymetry/strip-*.png` - baseline images for dead strips
- `BATHYMETRY_STRIP_*` exports from `bathymetryProgressions.ts`

## Proposed Solution

### Phase 1: Clean up dead artifacts

1. Delete dead parent MDX files that duplicate nested content
2. Delete `*.visual.spec.ts` files that test dead strips
3. Remove `*_STRIPS` exports from progressions files
4. Remove `<Filmstrip>` component if no longer used

### Phase 2: Implement dynamic page assembly (original intent)

When clicking a branch node like "1.1 Depth Profiles" in the sidebar:
1. App.tsx should render all child MDX files in sequence
2. Each child becomes a `<section>` within the assembled page
3. Visual tests should test individual snapshots, not assembled strips

### Phase 3: Update visual testing strategy

Option A: Test individual SingleSnapshot components
- Each granular MDX page has its own visual test
- Tests navigate to leaf pages and screenshot the SingleSnapshot

Option B: Test assembled pages
- Tests navigate to branch pages (once assembly is implemented)
- Screenshot the full assembled view

## Implementation Steps

### Phase 1: Cleanup (COMPLETE)

1. [x] Audit all 8 story folders for dead parent MDX files
   - Found: Only bathymetry had nested structure; folders 02-08 unchanged
2. [x] Delete dead `*.visual.spec.ts` files
   - Deleted: `01-bathymetry.visual.spec.ts` only (others are live)
3. [x] Delete dead parent MDX files that duplicate nested content
   - Deleted: `01-bathymetry/01-bathymetry.mdx`
4. [x] Remove `*_STRIPS` exports from progressions files
   - Removed: `BATHYMETRY_STRIP_*` from `bathymetryProgressions.ts` only
5. [x] Check if `<Filmstrip>` component is still used
   - Result: Still used by 7 story files (02-08), KEPT
6. [x] Run lint and smoke test to verify no broken imports
   - Result: All tests pass

### Phase 2: Dynamic Assembly (COMPLETE)

1. [x] Modify App.tsx to track branch vs leaf nodes
   - Added `isBranchPage()` helper function
   - Added `getAllNodes()` to get all tree nodes
2. [x] When rendering a branch node, collect all child MDX files
   - Created `AssembledPage` component that gets all leaf descendants
3. [x] Render children in sequence with section dividers
   - Each child rendered in a `<section>` with left border styling
4. [x] Update URL scheme to support branch pages
   - Branch pages now work: `/?page=01-bathymetry`
   - Clicking sidebar branch navigates to assembled view

### Phase 3: Visual Testing

1. [ ] Decide on testing strategy (individual vs assembled)
2. [ ] Create new visual test pattern for SingleSnapshot components
3. [ ] Update `defineStripVisualTests` or create new helper
4. [ ] Generate new baseline screenshots

## Files Affected

### Deleted (Phase 1):
- `stories/01-bathymetry/01-bathymetry.mdx`
- `stories/01-bathymetry/01-bathymetry.visual.spec.ts`
- `stories/01-bathymetry/strip-bathymetry-basic.png`
- `stories/01-bathymetry/strip-bathymetry-features.png`

### Modified (Phase 1):
- `src/render/bathymetryProgressions.ts` - removed BATHYMETRY_STRIP_* exports

### Still To Modify (Phase 2+):
- `stories/App.tsx` - add dynamic assembly logic
- `stories/visual-test-helpers.ts` - update for new pattern

### Kept (still used by folders 02-08):
- `stories/components/Filmstrip.tsx`
- All `*_STRIPS` exports in other progressions files

## Testing

1. ~~After Phase 1: `npm run lint && npm run test:smoke` passes~~ ✅ DONE
2. ~~After Phase 2: Navigate to branch nodes in viewer, verify children render~~ ✅ DONE
3. After Phase 3: `npm run test:visual:headless` passes with new baselines

## Notes

- **Phase 1 COMPLETE** - bathymetry cleanup done, folders 02-08 untouched (still live)
- **Phase 2 COMPLETE** - clicking branch nodes shows assembled page with all children
- Phase 3 depends on whether we want to test individual frames or assembled pages
- Consider: Should folders 02-08 also be nested like bathymetry? (separate plan)
