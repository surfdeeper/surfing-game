# Plan 175: Story Viewer E2E Testing

**Status**: Proposed
**Category**: testing
**Depends On**: 170 (Visual Regression Harness Hardening), 172 (Story Viewer Component Stories)

## Problem

The story viewer (`stories/App.tsx`) has grown complex with multiple layers:

### Layer 1: Navigation Tree Data Model (Pure Logic)
- `buildNavigationTree()` - parses file paths into hierarchical tree
- `getLeaves()`, `findNode()`, `getFirstLeaf()` - tree traversal
- `getAncestorIds()`, `getBreadcrumbs()` - path utilities
- `isBranchPage()`, `getAllNodes()` - node classification

### Layer 2: UI Behavior (E2E / Integration)
- Sidebar expand/collapse on click
- URL routing (`?page=`, `?mode=`, `?theme=`)
- Branch click → assembled page + sidebar expand
- Leaf click → single page navigation
- Keyboard shortcuts (P for presentation, arrows, etc.)

### Layer 3: Visual Layout (Screenshot Regression)
- Header breakpoints and overflow
- Sidebar at various widths
- Presentation mode controls
- Theme variations

**Current state**: Only Filmstrip canvas content is tested. None of these layers have coverage.

## Goal

Establish test coverage for each layer with the appropriate tool:

1. **Unit tests (Vitest)** - Navigation tree data model logic
2. **E2E tests (Playwright)** - UI behavior, navigation, expand/collapse
3. **Visual tests (Playwright screenshots)** - Layout regression (covered by Plan 172)

## Current Test Architecture

```
tests/
├── smoke.spec.js          # Game app smoke tests
├── visual/                 # Viewer visual tests (Filmstrip strips)
│   └── results/

stories/
├── **/*.visual.spec.ts    # Per-folder Filmstrip visual tests
├── visual-test-helpers.ts # defineStripVisualTests() helper
```

Visual tests use `defineStripVisualTests()` which:
- Navigates to `/?page={pageId}` (leaf pages only)
- Waits for `[data-testid]` elements
- Screenshots specific Filmstrip strips

**Gap**: No tests for branch pages, assembled views, or viewer navigation.

## Proposed Test Structure

```
tests/
├── smoke.spec.js              # Game smoke tests (unchanged)
├── viewer/                    # NEW: Viewer E2E tests
│   ├── navigation.spec.ts     # URL routing, sidebar clicks
│   ├── assembled-pages.spec.ts # Branch page rendering
│   ├── presentation.spec.ts   # Presentation mode behavior
│   └── viewer.visual.spec.ts  # Viewer UI screenshots
```

## Test Cases

### Layer 1: Unit Tests - Navigation Tree Data Model

**File**: `stories/navigationTree.test.ts` (Vitest)

These are pure functions that can be extracted and tested without React/DOM.

| Test | Description |
|------|-------------|
| `parseSegment extracts number and label` | `"01-bathymetry"` → `{ num: 1, slug: "bathymetry", label: "Bathymetry" }` |
| `parseSegment handles multi-word slugs` | `"01-depth-profiles"` → label `"Depth Profiles"` |
| `parseSegment returns null for invalid` | `"readme"` → `null` |
| `buildNavigationTree creates hierarchy` | Flat paths → nested TreeNode structure |
| `buildNavigationTree sorts by number` | `02-*` comes after `01-*` |
| `getLeaves returns only leaf nodes` | Skips branch nodes, returns leaves in order |
| `findNode locates by id` | `findNode(tree, "01-bathymetry/01-depth-profiles")` → node |
| `findNode returns null for missing` | `findNode(tree, "nonexistent")` → `null` |
| `getFirstLeaf finds deepest first child` | Branch → first leaf descendant |
| `getAncestorIds builds path` | `"a/b/c"` → `["a", "a/b"]` |
| `isBranchPage true for nodes with children` | `"01-bathymetry"` → `true` |
| `isBranchPage false for leaf nodes` | `"01-bathymetry/.../01-linear-slope"` → `false` |

### Layer 2: E2E Tests - UI Behavior

**File**: `tests/viewer/navigation.spec.ts` (Playwright)

| Test | Description |
|------|-------------|
| `branch URL loads assembled page` | `/?page=01-bathymetry` renders all 6 children |
| `leaf URL loads single page` | `/?page=01-bathymetry/.../01-linear-slope` renders single doc |
| `invalid page falls back to first` | `/?page=nonexistent` → first page loads |
| `sidebar branch click navigates to assembled` | Click "1. Bathymetry" → URL changes, assembled renders |
| `sidebar branch click expands children` | Click branch → children visible in sidebar |
| `sidebar leaf click navigates to leaf` | Click leaf → URL changes, single doc renders |
| `clicking expanded branch collapses it` | Click expanded branch → children hidden |
| `ancestors auto-expand on deep link` | `/?page=01-bathymetry/.../01-linear-slope` → bathymetry expanded |

**File**: `tests/viewer/assembled-pages.spec.ts` (Playwright)

| Test | Description |
|------|-------------|
| `assembled page shows branch title` | H1 contains "1. Bathymetry" |
| `assembled page renders all leaf children` | 6 sections for bathymetry |
| `children render in tree order` | First child before second child |
| `nested branch assembles its subtree` | `/?page=01-bathymetry/01-depth-profiles` → 3 children |

**File**: `tests/viewer/presentation.spec.ts` (Playwright)

| Test | Description |
|------|-------------|
| `P key enters presentation mode` | Press P → URL has `mode=presentation` |
| `Escape exits presentation mode` | Press Escape → URL loses `mode=` |
| `arrow keys navigate sections` | Right arrow → next section visible |
| `theme toggle persists in URL` | Click theme → `?theme=light` in URL |

### Layer 3: Visual Tests - Layout Regression

Covered by **Plan 172** (Story Viewer Component Stories). This plan focuses on Layers 1 and 2.

## Implementation Approach

### Phase 1: Extract and Unit Test Navigation Tree Logic

1. Extract pure functions from `App.tsx` into `stories/lib/navigationTree.ts`
   - `parseSegment()`, `buildNavigationTree()`, `getLeaves()`, `findNode()`
   - `getFirstLeaf()`, `getAncestorIds()`, `isBranchPage()`, `getAllNodes()`
2. Create `stories/lib/navigationTree.test.ts` with Vitest tests
3. Run with `npx vitest run stories/lib/`

**Why extract?** These are pure functions with no React/DOM dependency. Unit tests are faster and more precise than E2E for this logic.

### Phase 2: E2E Tests for UI Behavior

1. Create `tests/viewer/` directory
2. Add `navigation.spec.ts` - URL routing, sidebar clicks, expand/collapse
3. Add `assembled-pages.spec.ts` - branch page child rendering
4. Add `presentation.spec.ts` - mode switching, keyboard nav
5. Run with `npx playwright test tests/viewer/`

**Why E2E?** These behaviors involve React state, URL history, and DOM interactions that can't be unit tested.

### Phase 3: Integration with CI

1. Add `npm run test:viewer` script
2. Include in CI pipeline alongside other test suites
3. Document in `tests/viewer/README.md`

## Considerations

### Test Data Stability

Assembled pages render actual MDX content, which may change. Options:
- **Option A**: Accept content changes affect screenshots (update baselines when MDX changes)
- **Option B**: Create test-only stub MDX files with fixed content
- **Option C**: Mask content areas, only test chrome/layout

Recommendation: **Option A** for now - simpler, real coverage. Revisit if flaky.

### Viewport Consistency

Use fixed viewport for visual tests:
```typescript
test.use({ viewport: { width: 1280, height: 720 } });
```

### Relationship to Plan 172

Plan 172 proposes component-level stories for viewer parts (header, controls). This plan (175) covers E2E behavior of the assembled viewer. They complement each other:
- 172: Unit-level visual coverage of isolated components
- 175: Integration-level coverage of viewer as a whole

## Files Affected

### New Files:
- `stories/lib/navigationTree.ts` - extracted pure functions
- `stories/lib/navigationTree.test.ts` - Vitest unit tests
- `tests/viewer/navigation.spec.ts` - Playwright E2E
- `tests/viewer/assembled-pages.spec.ts` - Playwright E2E
- `tests/viewer/presentation.spec.ts` - Playwright E2E
- `tests/viewer/README.md`

### Modified:
- `stories/App.tsx` - import from `navigationTree.ts` instead of inline
- `package.json` - add `test:viewer` script
- `playwright.config.ts` - may need project config for viewer tests

## Acceptance Criteria

### Layer 1 (Unit Tests)
- [ ] Navigation tree functions extracted to `stories/lib/navigationTree.ts`
- [ ] Unit tests cover: `parseSegment`, `buildNavigationTree`, `getLeaves`, `findNode`, `isBranchPage`
- [ ] `npx vitest run stories/lib/` passes

### Layer 2 (E2E Tests)
- [ ] Navigation tests verify URL ↔ UI state (branch/leaf pages)
- [ ] Assembled page tests verify child count and order
- [ ] Presentation tests verify mode switching and keyboard nav
- [ ] `npx playwright test tests/viewer/` passes

### Integration
- [ ] `npm run test:viewer` script added
- [ ] README documents test structure and how to run

## Open Questions

1. Should the viewer E2E tests run against dev server or built stories?
2. Do we need mobile viewport coverage for the viewer?
3. Should presentation mode auto-play (TTS) be tested? (involves timing/audio)
