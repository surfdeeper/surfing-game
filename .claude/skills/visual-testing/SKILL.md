---
name: visual-testing
description: Visual regression testing with Ladle stories and Playwright. Use when working with stories, snapshots, or visual comparisons. Auto-apply when editing files in src/stories/ or tests/visual/.
---

# Visual Testing Skill

Visual regression tests verify rendering output hasn't changed unexpectedly.

## Architecture

```
src/stories/*.stories.tsx    → Ladle stories (visual fixtures)
tests/visual/*.spec.js       → Playwright visual tests
tests/visual/*.spec.js-snapshots/  → Baseline screenshots
```

## Commands

```bash
# Verify stories compile (fast, no dev server)
npm run ladle:build

# Run visual regression tests
npm run test:visual:headless      # CI/agents
npm run test:visual:headed        # Debugging with browser UI

# Update baselines after intentional changes
npm run test:visual:update:headless

# Clear test artifacts
npm run reset:visual              # Clear results/reports
npm run reset:visual:all          # Clear results + baselines
```

## Verifying Stories

After code changes (TypeScript migration, refactoring), verify stories still build:

```bash
npm run ladle:build
```

This catches:
- Broken imports (wrong extensions, missing exports)
- Type errors in story components
- Missing dependencies

**Do NOT start `npm run ladle` dev server** just to verify - use the build.

## Common Issues

### Import Extensions After TS Migration

Remove `.js` extensions when importing from TypeScript files:

```typescript
// ❌ Broken after JS→TS migration
import { foo } from '../state/waveModel.js';

// ✅ Correct
import { foo } from '../state/waveModel';
```

### Missing Exports from Test Files

Stories often import test fixtures. Ensure they're exported:

```typescript
// In *.test.ts - export for stories
export const PROGRESSION_NO_DAMPING = defineProgression({...});
```

## Writing Visual Tests

### Story-Based Tests

```javascript
// tests/visual/foam-rendering.spec.js
const stories = [
  { id: 'foam-rendering--current-behavior', name: 'Current Behavior' },
  { id: 'foam-rendering--option-a', name: 'Option A' },
];

for (const story of stories) {
  test(`${story.name} matches snapshot`, async ({ page }) => {
    await page.goto(`/?story=${story.id}`);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500); // Ensure render complete

    const canvas = page.locator('canvas').first();
    await expect(canvas).toHaveScreenshot(`${story.id}.png`);
  });
}
```

### Best Practices

1. **Wait for render** - Canvas takes time to draw
2. **Capture canvas only** - Not full page (avoids UI noise)
3. **Descriptive names** - `{feature}--{scenario}.png`
4. **Check story IDs** - Use Ladle's `/meta.json` to find valid IDs

## Integration with Plan 200

Plan 200 (MDX Visual Docs) is building a progression-based visual testing system:

1. Unit tests define progressions with `defineProgression()`
2. Visual tests render progressions and compare frames
3. Unit tests gate visual tests (skip visuals if data is wrong)

See `plans/tooling/200-mdx-visual-docs.md` for details.
