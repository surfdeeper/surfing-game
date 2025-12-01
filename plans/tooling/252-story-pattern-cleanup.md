# Plan 252: Story Pattern Cleanup

**Status**: Draft
**Category**: Tooling
**Related**: Plan 251 (Layer Colocation)

## Problem

After colocating layers (Plan 251), several patterns in story files have accumulated technical debt:

1. **Duplicated utilities** - `type Matrix`, `createMatrix()`, `GRID_WIDTH/HEIGHT`, `STATIC_CAPTURE` are copy-pasted across 9+ layer `shared.ts` files
2. **AI slop** - `updateFn: () => {}` is required but meaningless for static progressions (layers 01-02)
3. **No inline ASCII** - Initial matrices are defined programmatically with no visual representation; tests use snapshot files instead of inline snapshots
4. **Metadata duplication** - `metadata.label` often duplicates MDX headings

## Solution

### 1. Centralize Matrix Utilities in test-utils

Create `/src/test-utils/matrix.ts`:

```typescript
/**
 * Standard matrix type used across all layers
 */
export type Matrix = number[][];

/**
 * Standard grid dimensions for the layer pipeline
 * All layers use consistent dimensions for composability
 */
export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 10;

/**
 * Capture times for static (non-animated) progressions
 */
export const STATIC_CAPTURE = [0];

/**
 * Create a zero-filled matrix with standard dimensions
 */
export function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Create a matrix filled with a specific value
 */
export function createFilledMatrix(value: number): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(value));
}
```

Export from `src/test-utils/index.ts`.

### 2. Make updateFn Optional for Static Progressions

Modify `defineProgression` in `/src/test-utils/progression.ts`:

```typescript
export function defineProgression(config) {
  const {
    id,
    description,
    initialMatrix,
    updateFn = null,  // <-- Make optional, default to null
    captureTimes = [0, 1, 2, 3, 4, 5],
    renderFn = null,
    metadata = {},
  } = config;

  // Remove the updateFn validation
  // if (!updateFn) throw new Error(...)  <-- DELETE

  // In captureSnapshots, skip simulation if no updateFn
  const snapshots = captureSnapshots({
    initialMatrix,
    updateFn: updateFn ?? (() => {}),  // Provide no-op if null
    captureTimes,
  });
  // ...
}
```

This allows static progressions to omit `updateFn` entirely:

```typescript
// BEFORE (AI slop)
defineProgression({
  id: 'bathymetry/flat-shallow',
  initialMatrix: matrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},  // Meaningless
});

// AFTER (clean)
defineProgression({
  id: 'bathymetry/flat-shallow',
  initialMatrix: matrix,
  captureTimes: STATIC_CAPTURE,
  // No updateFn needed for static progressions
});
```

### 3. Inline ASCII Snapshots via Vitest

Instead of snapshot files, use Vitest's inline snapshots with `asciiToMatrix`:

```typescript
import { asciiToMatrix, defineProgression, STATIC_CAPTURE } from '../../test-utils';

export const PROGRESSION_FLAT_SHALLOW = defineProgression({
  id: 'bathymetry/flat-shallow',
  description: 'Constant shallow depth (25%)',
  initialMatrix: asciiToMatrix(`
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
    2 2 2 2 2 2 2 2
  `),
  captureTimes: STATIC_CAPTURE,
});
```

Benefits:
- Visual representation directly in code
- Can't go out of sync (it IS the source of truth)
- ASCII characters map to values: `0-9` = 0.0-0.9, `A-Z` = additional levels

For tests that verify output, use `toMatchInlineSnapshot`:

```typescript
test('damping computed from depth', () => {
  expect(matrixToAscii(dampingMatrix)).toMatchInlineSnapshot(`
    "8 8 8 8 8 8 8 8
     8 8 8 8 8 8 8 8
     ..."
  `);
});
```

### 4. Derive metadata.label from MDX (Optional)

Two options:

**Option A: Keep duplication but document it**
- MDX heading is for humans reading docs
- `metadata.label` is for programmatic access (SingleSnapshot component)
- Accept the duplication as intentional

**Option B: Generate label from id**
- Remove `metadata.label` from progression definitions
- Have `SingleSnapshot` derive display name from `progression.id`:
  ```typescript
  const label = progression.metadata?.label
    ?? progression.id.split('/').pop().replace(/-/g, ' ');
  ```

Recommend **Option A** initially - low ROI for the complexity.

## Migration Plan

### Phase 1: Add centralized utilities (non-breaking)

1. Create `src/test-utils/matrix.ts` with `Matrix`, `GRID_WIDTH`, `GRID_HEIGHT`, `STATIC_CAPTURE`, `createMatrix`
2. Export from `src/test-utils/index.ts`
3. Run lint + tests

### Phase 2: Make updateFn optional (non-breaking)

1. Modify `defineProgression` to default `updateFn` to null
2. Remove validation that requires updateFn
3. Run tests - all existing code still works

### Phase 3: Migrate layer shared.ts files

For each layer:
1. Replace local `type Matrix = number[][]` with import
2. Replace local `GRID_WIDTH/HEIGHT` with imports (if using 8x10)
3. Replace local `STATIC_CAPTURE` with import
4. Replace local `createMatrix()` with import
5. Remove `updateFn: () => {}` from static progressions
6. Run lint + tests

Order: 01 -> 02 -> 04 -> 05 (all use 8x10), then evaluate 03, 06-09 (may need different sizes)

### Phase 4: Convert to ASCII matrices (incremental)

For each static progression:
1. Replace programmatic matrix creation with `asciiToMatrix()`
2. Verify visual representation matches
3. Consider adding inline snapshot tests for computed outputs

### Phase 5: Cleanup layer 09 special case

Layer 09 (foam-contours) uses 16x16 grid and has additional utilities (`drawCircle`, `drawHLine`). Options:
- Keep as layer-specific utilities
- Promote to test-utils if needed elsewhere

## Files Changed

### New Files
- `src/test-utils/matrix.ts`

### Modified Files
- `src/test-utils/index.ts` - add exports
- `src/test-utils/progression.ts` - make updateFn optional
- `src/layers/01-bottom-depth/stories/*.ts` - use centralized utils
- `src/layers/02-bottom-damping/stories/*.ts` - use centralized utils
- `src/layers/04-shoaling/shared.ts` - use centralized utils
- `src/layers/05-wave-breaking/shared.ts` - use centralized utils
- (etc. for other layers)

## Verification

After each phase:
```bash
npm run lint
npm run test:smoke
npm run test:unit
npm run test:visual:headless
```

## Open Questions

1. **Layer 09 grid size**: Uses 16x16 while others use 8x10. 
   - YOU MUST Standardize all to one size

2. **Layer 03 (energy-field)**: Uses custom dimensions and update functions. MUST ALSO BE centralized - DO NOT evaluate separately.

3. **STRIP export pattern**: The `*_STRIP_*` exports are used by visual tests. Should we:
   - MUST NOT Keep as-is (CLUTTER)
   - MUST INSTEAD Create a GENERIC CENTRAL `createStrip(progression, pageId)` helper
