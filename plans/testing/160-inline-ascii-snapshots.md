# 160 - Inline ASCII Snapshots for Progressions

**Status**: Proposed
**Category**: testing
**Depends On**: None

## Problem

Progression files (`src/render/*Progressions.ts`) define matrix-based test data, but there's no way to see what the data actually looks like without running tests or viewing rendered output. This creates friction when:

1. **Reviewing code** - You can't tell if a matrix-building function is correct without running it
2. **Understanding behavior** - New developers must run tests to see what progressions produce
3. **Detecting drift** - If code changes but output doesn't match expectations, you won't know until visual tests fail

The ASCII matrix system already exists (`src/test-utils/asciiMatrix.ts`) but isn't used to document progressions inline.

## Proposed Solution

Embed computed ASCII snapshots as comments directly in progression source files. A single test validates all embedded comments match actual computed output—no per-file boilerplate needed.

### Example

```typescript
// src/render/bathymetry/linearSlope.ts
export const PROGRESSION_LINEAR_SLOPE = defineProgression({
  id: 'bathymetry/linear-slope',
  // ...config
});

/* @ascii-snapshot bathymetry/linear-slope
FFFFFFFF
EEEEEEEE
DDDDDDDD
CCCCCCCC
BBBBBBBB
44444444
33333333
22222222
11111111
--------
*/
```

### Key Design Decisions

1. **Comment format**: `/* @ascii-snapshot <progression-id> */` followed by the ASCII grid
2. **Single validator test**: One test file discovers all progressions, extracts comments, validates
3. **Update script**: `npm run update:ascii` regenerates all comments from computed output
4. **No per-file tests**: The magic happens in the shared validator—progression files just have the comment

## Implementation Steps

### Phase 1: Infrastructure

1. **Create comment parser** (`src/test-utils/asciiSnapshotParser.ts`)
   - `extractAsciiSnapshots(sourceCode: string): Map<id, asciiString>`
   - `updateAsciiSnapshots(sourceCode: string, snapshots: Map<id, asciiString>): string`

2. **Create validator test** (`src/test-utils/asciiSnapshots.test.ts`)
   - Import progression registry
   - For each registered progression with an `@ascii-snapshot` comment in its source file:
     - Compute actual ASCII from `matrixToAscii(progression.snapshots[0].matrix)`
     - Compare to embedded comment
     - Fail with diff if mismatch

3. **Create update script** (`scripts/update-ascii-snapshots.ts`)
   - Find all `*Progressions.ts` files
   - For each file, update `@ascii-snapshot` comments with computed values
   - Write back to disk

### Phase 2: Migrate bathymetryProgressions.ts

4. **Split into directory structure**:
   ```
   src/render/bathymetry/
   ├── index.ts              # Re-exports + strip definitions
   ├── linearSlope.ts        # Individual progression
   ├── steepShore.ts
   ├── sandbar.ts
   ├── reef.ts
   ├── channel.ts
   └── flat.ts
   ```

5. **Add ASCII comments** to each file using update script

6. **Verify** with validator test

### Phase 3: Migrate remaining progressions

7. Apply same pattern to:
   - `foamContoursProgressions.ts`
   - `shoalingProgressions.ts`
   - `waveBreakingProgressions.ts`
   - `foamDispersionProgressions.ts`

## Files Affected

**New files:**
- `src/test-utils/asciiSnapshotParser.ts` - Comment extraction/update logic
- `src/test-utils/asciiSnapshots.test.ts` - Validator test
- `scripts/update-ascii-snapshots.ts` - Update script
- `src/render/bathymetry/*.ts` - Split progression files

**Modified files:**
- `src/render/bathymetryProgressions.ts` - Eventually deleted, replaced by directory
- `package.json` - Add `update:ascii` script

## Testing

1. **Validator test passes** when comments match computed output
2. **Validator test fails** with clear diff when comments are stale
3. **Update script** correctly regenerates comments
4. **Existing visual tests** continue to pass (no behavior change)

## Example Validator Test Output

```
FAIL  src/test-utils/asciiSnapshots.test.ts
  ✕ bathymetry/linear-slope ASCII snapshot matches computed output

    Expected:
    FFFFFFFF
    EEEEEEEE
    ...

    Received:
    FFFFFFFF
    DDDDDDDD  ← mismatch on row 2
    ...
```

## Benefits

- **Self-documenting code** - See what the progression produces without running anything
- **Git-diffable** - Changes to output are visible in PRs
- **No boilerplate** - One test validates everything
- **Catches drift** - If code changes output, test fails until comment updated
