---
name: visual-testing
description: Visual regression testing with Ladle stories and Playwright. Use when working with stories, snapshots, or visual comparisons. Auto-apply when editing files in src/stories/ or tests/visual/. (project)
---

# Visual Testing Skill

Visual regression tests verify rendering output hasn't changed unexpectedly.

## Architecture

```
stories/*.mdx                → MDX story pages with visual strips
stories/components/*.tsx     → Strip rendering components
tests/visual/*.spec.ts       → Playwright visual tests
tests/visual/snapshots/      → Baseline screenshots
src/render/*Progressions.ts  → Progression data + strip definitions
```

## Commands

```bash
# Verify stories compile (fast, no dev server)
npm run stories:build

# Run visual regression tests
npm run test:visual:headless      # CI/agents
npm run test:visual:headed        # Debugging with browser UI

# Update baselines after intentional changes
npm run test:visual:update:headless

# Clear test artifacts
npm run reset:visual              # Clear results/reports
npm run reset:visual:all          # Clear results + baselines
```

## Interactive Debugging with Chrome DevTools MCP

When user wants to visually debug or iterate on a specific story/strip:

### 1. Launch Stories in Browser

```
mcp__chrome-devtools__new_page({ url: "http://localhost:5174" })
```

Or navigate to a specific page:
```
mcp__chrome-devtools__new_page({ url: "http://localhost:5174/?page=01-bathymetry" })
```

### 2. Take Snapshot to See Current State

```
mcp__chrome-devtools__take_snapshot()
```

The snapshot shows all elements with their `uid` attributes. Look for:
- `data-testid="strip-*"` - Visual test strips
- Section headings and navigation

### 3. Identify Selected/Target Strip

From the snapshot, find the strip the user wants to fix:
- Look for elements with `data-testid` matching strip IDs like `strip-bathymetry-basic`
- The testId maps to progression files in `src/render/*Progressions.ts`

### 4. Screenshot Specific Element

```
mcp__chrome-devtools__take_screenshot({ uid: "<strip-uid-from-snapshot>" })
```

This captures just the strip for focused comparison.

### 5. Iterate on Code

After identifying the strip:
1. Find the progression file (e.g., `src/render/bathymetryProgressions.ts`)
2. Modify the rendering logic or progression data
3. Reload and re-screenshot:

```
mcp__chrome-devtools__navigate_page({ type: "reload" })
mcp__chrome-devtools__take_screenshot({ uid: "<strip-uid>" })
```

### 6. Update Baseline When Satisfied

```bash
npm run test:visual:update:headless
```

### Workflow Example

User: "The bathymetry strip looks wrong, fix it"

1. Take snapshot → Find `data-testid="strip-bathymetry-basic"` with uid `e42`
2. Screenshot element → `take_screenshot({ uid: "e42" })`
3. Read progression file → `src/render/bathymetryProgressions.ts`
4. Identify issue in `BATHYMETRY_STRIP_BASIC` definition
5. Edit the matrix generation or color scale
6. Reload → Re-screenshot → Compare
7. When correct, update baselines

## Verifying Stories

After code changes (TypeScript migration, refactoring), verify stories still build:

```bash
npm run stories:build
```

This catches:
- Broken imports (wrong extensions, missing exports)
- Type errors in story components
- Missing dependencies

**Do NOT start dev server** just to verify - use the build.

## Common Issues

### Import Extensions After TS Migration

Remove `.js` extensions when importing from TypeScript files:

```typescript
// ❌ Broken after JS→TS migration
import { foo } from '../state/waveModel.js';

// ✅ Correct
import { foo } from '../state/waveModel';
```

### Missing Exports from Progression Files

Stories import strip definitions. Ensure they're exported:

```typescript
// In *Progressions.ts - export strips for visual tests
export const BATHYMETRY_STRIPS = [BATHYMETRY_STRIP_BASIC, BATHYMETRY_STRIP_FEATURES];
```

## Strip-Based Visual Tests

Visual tests are driven by strip definitions in progression files:

```typescript
// tests/visual/all-strips.spec.ts
import { BATHYMETRY_STRIPS } from '../../src/render/bathymetryProgressions';

for (const strip of BATHYMETRY_STRIPS) {
  test(`${strip.testId} matches baseline`, async ({ page }) => {
    await page.goto(`/?page=${strip.pageId}`);
    const element = page.locator(`[data-testid="${strip.testId}"]`);
    await expect(element).toHaveScreenshot(`${strip.testId}.png`);
  });
}
```

### Strip Definition Pattern

Each progression file exports strips with:
- `testId` - Unique identifier for visual tests (e.g., `strip-bathymetry-basic`)
- `pageId` - MDX page where strip is rendered (e.g., `01-bathymetry`)
- `snapshots` - Array of progression snapshots to render

### Best Practices

1. **Wait for render** - Use `data-testid` selector which waits for React
2. **Capture strip only** - Not full page (avoids UI noise)
3. **Colocate data** - Strip definitions live with progression data
4. **Meaningful testIds** - `strip-{category}-{variant}`

## Workflow: Unit Tests Before Visual Tests

**CRITICAL**: When modifying progression data, follow this order:

1. **Design with ASCII** - Sketch the expected matrix values as ASCII art
2. **Update unit test** - Modify the progression definition and verify matrix output
3. **Run unit tests** - `npx vitest run <test-file>` to confirm data is correct
4. **Then update visuals** - Only after unit tests pass, update visual snapshots

```
Wrong workflow:
  Change coefficient → Update visual snapshot → "Looks the same, try higher"

Correct workflow:
  Change coefficient → Check matrix values in unit test → Verify difference → Update visual
```

The matrix data is the source of truth. If the numbers don't show meaningful difference, adjusting coefficients and re-rendering visuals won't help.

## File Organization

```
src/render/*Progressions.ts     → Progression data + strip definitions
  ├── PROGRESSION_* exports     → Individual progression definitions
  ├── *_STRIP_* exports         → Strip groupings for visual tests
  └── *_STRIPS export           → All strips for test discovery

stories/*.mdx                   → MDX pages rendering strips
stories/components/*.tsx        → Reusable strip components

tests/visual/all-strips.spec.ts → Imports all *_STRIPS, runs visual tests
tests/visual/snapshots/         → Baseline PNG files
```

## Mapping testId to Source Code

When a visual test fails or user points to a strip:

1. **testId** like `strip-bathymetry-basic` maps to:
   - Export `BATHYMETRY_STRIP_BASIC` in `src/render/bathymetryProgressions.ts`

2. **pageId** like `01-bathymetry` maps to:
   - MDX file `stories/01-bathymetry.mdx`

3. **Pattern**: `strip-{category}-{variant}` → `src/render/{category}Progressions.ts`
