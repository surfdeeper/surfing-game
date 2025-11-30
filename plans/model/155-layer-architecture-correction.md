# Plan 155: Layer Architecture Correction

**Status**: In Progress
**Category**: model
**Depends On**: 140 (Energy Field Model), 160 (Visual Integration Testing)
**Supersedes**: Current layer 2 story semantics

## Problem

The current 8-layer visual testing pipeline has incorrect semantics for Layer 2 (Energy Field):

### Current (Incorrect) Structure

```
Layer 1: Bathymetry
├── 01-flat-shallow     (depth grid)
├── 02-flat-medium      (depth grid)
├── ...
└── 09-channel          (depth grid)

Layer 2: Energy Field   ← PROBLEM: Stories frame damping as global parameters
├── 01-no-damping       (coefficient = 0)
├── 02-low-damping      (coefficient = 0.05)
├── 03-high-damping     (coefficient = 2.0)
└── 04-with-drain       (discrete removal)
```

**What's wrong:**
1. Damping is NOT a global coefficient - it's **spatially varying**, derived from depth
2. Layer 2 stories use synthetic/hardcoded values, not actual bathymetry output
3. No 1:1 mapping between bathymetry scenarios and energy field scenarios
4. The layer pipeline is broken - Layer 2 doesn't actually consume Layer 1 output

### Correct Understanding

Damping coefficient should be **per-cell**, derived from the bathymetry:
- Shallow water → high damping (waves lose energy faster)
- Deep water → low damping (waves propagate further)

This requires inserting a **Damping Layer** between Bathymetry and Energy Field.

## Solution: Insert Damping Layer

### Corrected Layer Pipeline

```
Layer 1: Bottom Depth (rename from Bathymetry)
    │ Physical ocean floor depth at each cell
    │ Output: depth grid (8x8 matrix of depth values in meters)
    ↓
Layer 2: Bottom Damping (NEW)
    │ Maps depth → damping coefficient per cell
    │ Input: depth grid from Layer 1
    │ Output: damping grid (8x8 matrix of damping coefficients 0-1)
    │ Formula: damping = f(depth) where shallow→high, deep→low
    ↓
Layer 3: Energy Field (currently Layer 2)
    │ Simulates wave energy propagation using damping grid
    │ Input: damping grid from Layer 2
    │ Output: energy grid over time
    ↓
Layer 4: Shoaling (currently Layer 3)
    ...
```

### 1:1 Story Mapping

Each layer's stories should map directly to the same scenarios:

| Scenario | Layer 1 (Depth) | Layer 2 (Damping) | Layer 3 (Energy) |
|----------|-----------------|-------------------|------------------|
| Flat Shallow | Uniform 2m | Uniform high (0.8) | Rapid dissipation |
| Flat Medium | Uniform 5m | Uniform medium (0.4) | Moderate dissipation |
| Flat Deep | Uniform 10m | Uniform low (0.1) | Slow dissipation |
| Slope Gentle | 10m→2m gradient | Gradient low→high | Progressive dissipation |
| Sandbar | Valley profile | High in middle | Secondary breaking zone |
| Reef | Abrupt shelf | Sharp transition | Sudden energy loss |
| Channel | Deeper center | Low in center | Energy corridor |

### Story Files Structure

**Layer 1: `src/layers/01-bottom-depth/stories/`** (renamed)
```
01-flat-shallow.ts      → Exports PROGRESSION_FLAT_SHALLOW
02-flat-medium.ts       → Exports PROGRESSION_FLAT_MEDIUM
03-flat-deep.ts         → Exports PROGRESSION_FLAT_DEEP
04-slope-gentle.ts      → Exports PROGRESSION_SLOPE_GENTLE
05-slope-gradual.ts     → Exports PROGRESSION_SLOPE_GRADUAL
06-slope-steep.ts       → Exports PROGRESSION_SLOPE_STEEP
07-sandbar.ts           → Exports PROGRESSION_SANDBAR
08-reef.ts              → Exports PROGRESSION_REEF
09-channel.ts           → Exports PROGRESSION_CHANNEL
```

**Layer 2: `src/layers/02-bottom-damping/stories/`** (NEW)
```
01-flat-shallow.ts      → Imports PROGRESSION_FLAT_SHALLOW, computes damping
02-flat-medium.ts       → Imports PROGRESSION_FLAT_MEDIUM, computes damping
03-flat-deep.ts         → Imports PROGRESSION_FLAT_DEEP, computes damping
... (same 9 scenarios, derived from Layer 1)
```

**Layer 3: `src/layers/03-energy-field/stories/`** (renumbered)
```
01-flat-shallow.ts      → Imports damping from 02-*, simulates energy
02-flat-medium.ts       → ...
03-flat-deep.ts         → ...
... (same 9 scenarios, derived from Layer 2)
```

## Damping Function

The depth-to-damping mapping formula:

```typescript
/**
 * Convert water depth to damping coefficient.
 *
 * @param depth - Water depth in meters (0 = surface, positive = deeper)
 * @returns Damping coefficient (0 = no damping, 1 = full damping)
 */
export function depthToDamping(depth: number): number {
  // Parameters (tunable)
  const SHALLOW_THRESHOLD = 2;   // meters - below this, maximum damping
  const DEEP_THRESHOLD = 10;     // meters - above this, minimum damping
  const MIN_DAMPING = 0.05;      // deep water baseline
  const MAX_DAMPING = 0.95;      // shallow water maximum

  if (depth <= SHALLOW_THRESHOLD) return MAX_DAMPING;
  if (depth >= DEEP_THRESHOLD) return MIN_DAMPING;

  // Linear interpolation between thresholds
  const t = (depth - SHALLOW_THRESHOLD) / (DEEP_THRESHOLD - SHALLOW_THRESHOLD);
  return MAX_DAMPING - t * (MAX_DAMPING - MIN_DAMPING);
}
```

This can be visualized in the damping layer stories - each story shows:
1. Input: depth grid from Layer 1 (displayed as reference)
2. Output: damping grid computed from depth (main visualization)

## Implementation Steps

### Phase 1: Rename Layer 1 ✅ COMPLETE

1. [x] Rename `src/layers/01-bathymetry/` → `src/layers/01-bottom-depth/`
2. [x] Update all imports referencing the old path
3. [x] Update MDX files to reflect new naming
4. [x] Verify tests still pass

### Phase 2: Create Layer 2 (Damping) ✅ COMPLETE

1. [x] Create `src/layers/02-bottom-damping/` directory structure
2. [x] Implement `depthToDamping()` function in `index.ts`
3. [x] Create 9 story files matching Layer 1 scenarios
4. [x] Each story imports Layer 1 output and computes damping grid
5. [x] Add visual tests for damping layer

### Phase 3: Renumber Remaining Layers ✅ COMPLETE

1. [x] Move `src/layers/02-energy-field/` → `src/layers/03-energy-field/`
2. [x] Move `src/layers/03-shoaling/` → `src/layers/04-shoaling/`
3. [x] Continue renumbering through Layer 9
4. [x] Update all imports and references
5. [x] Update visual test page IDs

### Phase 4: Wire Up Integration

1. [ ] Update Layer 3 (Energy Field) stories to import damping from Layer 2
2. [ ] Replace synthetic damping values with real computed values
3. [ ] Create same 9 scenarios derived from Layer 2 output
4. [ ] Update downstream layers to use new numbering

### Phase 5: Update Documentation

1. [x] Update Plan 160 (Visual Integration Testing) to reflect new structure
2. [ ] Update CLAUDE.md layer references
3. [ ] Update any MDX documentation mentioning layer numbers

## Files Affected

### Renames
- `src/layers/01-bathymetry/` → `src/layers/01-bottom-depth/`
- `src/layers/02-energy-field/` → `src/layers/03-energy-field/`
- `src/layers/03-shoaling/` → `src/layers/04-shoaling/`
- `src/layers/04-wave-breaking/` → `src/layers/05-wave-breaking/`
- `src/layers/05-energy-transfer/` → `src/layers/06-energy-transfer/`
- `src/layers/06-foam-grid/` → `src/layers/07-foam-grid/`
- `src/layers/07-foam-dispersion/` → `src/layers/08-foam-dispersion/`
- `src/layers/08-foam-contours/` → `src/layers/09-foam-contours/`

### New Files
- `src/layers/02-bottom-damping/index.ts`
- `src/layers/02-bottom-damping/shared.ts`
- `src/layers/02-bottom-damping/stories/*.ts` (9 files)
- `src/layers/02-bottom-damping/stories/*.mdx` (9 files)
- `src/layers/02-bottom-damping/stories/visual.spec.ts`

### Updates
- All visual test spec files (page ID updates)
- `plans/testing/160-visual-integration-testing.md`
- `CLAUDE.md` (if layer numbers mentioned)

## Visual Representation

Each damping story should show:

```
┌──────────────────────────────────────────────────┐
│ Input: Bottom Depth                               │
│ ┌────────────────────────────────┐               │
│ │ [8x8 depth grid visualization] │ ← from Layer 1│
│ └────────────────────────────────┘               │
├──────────────────────────────────────────────────┤
│ Output: Damping Coefficient                       │
│ ┌────────────────────────────────┐               │
│ │ [8x8 damping grid visualization]│ ← computed   │
│ └────────────────────────────────┘               │
│                                                   │
│ Legend: Low (0.0) ████████████████ High (1.0)    │
└──────────────────────────────────────────────────┘
```

## Success Criteria

- [x] All 9 bathymetry scenarios have corresponding damping stories
- [ ] All 9 damping scenarios have corresponding energy field stories
- [x] Damping layer imports from depth layer (Layer 2 → Layer 1)
- [ ] Energy field layer imports from damping layer (Layer 3 → Layer 2)
- [ ] Visual tests verify the layer chain: depth → damping → energy
- [ ] Stories viewer shows clear input→output relationship
- [ ] No hardcoded damping coefficients in energy field stories

## Open Questions

1. **Color scale for damping** - What palette distinguishes it from depth and energy?
   - Proposal: Use sequential orange/red scale (warm = high damping)

2. **Should damping be time-varying?** - Currently static, derived from static bathymetry
   - Probably not for v1, but could support dynamic bathymetry later

3. **Alternative: Skip damping layer, embed in energy field?**
   - Rejected: Explicit layers are better for testing/visualization

## References

- `plans/00-principles.md` - Wave physics fundamentals
- `plans/model/140-energy-field-model.md` - Energy field architecture
- `plans/testing/160-visual-integration-testing.md` - Integration testing strategy
