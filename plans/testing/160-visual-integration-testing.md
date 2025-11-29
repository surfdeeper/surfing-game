# Plan 160: Visual Integration Testing

**Status**: Proposed
**Category**: testing
**Depends On**: 110 (Testing Strategy), 130 (Testing Expansion), 141 (Energy-Driven Waves/Foam)

## Problem

Our 8-layer visual testing pipeline validates each layer in isolation:

```
Layer 1: Bathymetry      ← tested alone
Layer 2: Energy Field    ← tested alone
Layer 3: Shoaling        ← tested alone
Layer 4: Wave Breaking   ← tested alone
Layer 5: Energy Transfer ← tested alone
Layer 6: Foam Grid       ← tested alone
Layer 7: Foam Dispersion ← tested alone
Layer 8: Foam Contours   ← tested alone
```

This is analogous to unit testing - each layer's progressions use synthetic/hardcoded inputs rather than outputs from previous layers. We're **not verifying the integration points**:

- Does bathymetry output correctly drive energy field damping?
- Does energy field state correctly trigger wave breaking?
- Does breaking energy correctly feed foam accumulation?

A bug in how Layer N passes data to Layer N+1 would go undetected.

## Options Analysis

### Option A: Separate Integration Test Suite

Create a new file `tests/visual/integration-strips.spec.ts` with dedicated integration progressions.

**Pros:**
- Clear separation between unit and integration tests
- Can run integration tests independently
- Doesn't clutter existing layer files

**Cons:**
- Duplicates setup logic
- Another file to maintain
- Integration tests live far from the code they test

### Option B: Each Layer References Previous Layer's Scenarios

Modify each layer's progressions to explicitly build on prior layer outputs.

Example: `ENERGY_FIELD_STRIPS` would import `BATHYMETRY_PROGRESSIONS.sandbar` and use it as input rather than hardcoded depth values.

```typescript
// energyFieldProgressions.ts
import { BATHYMETRY_PROGRESSIONS } from './bathymetryProgressions';

export const PROGRESSION_ENERGY_WITH_SANDBAR = defineProgression({
  id: 'energy/sandbar-damping',
  description: 'Energy damping over sandbar bathymetry',
  // Uses REAL bathymetry output, not synthetic depths
  bathymetry: BATHYMETRY_PROGRESSIONS.sandbar.snapshots.at(-1),
  ...
});
```

**Pros:**
- Integration is explicit and documented
- Catches interface mismatches at the source
- Progressions show real data flow
- Colocated with layer code

**Cons:**
- Creates coupling between progression files
- Import cycles possible if not careful
- Muddies "unit test" purity of individual layers

### Option C: Multi-Layer Filmstrips

Create combined strips that show multiple layers side-by-side in the same visual test.

```typescript
export const INTEGRATION_STRIP_ENERGY_CHAIN = {
  testId: 'integration-bathymetry-to-energy',
  pageId: '09-integration',
  snapshots: [
    { layer: 'bathymetry', data: BATHYMETRY_PROGRESSIONS.sandbar },
    { layer: 'energy', data: ENERGY_FROM_SANDBAR },
    { layer: 'foam', data: FOAM_FROM_ENERGY },
  ],
};
```

**Pros:**
- Visual comparison shows data flow
- Single glance reveals integration issues
- Great for documentation/communication

**Cons:**
- Requires new rendering component
- More complex test infrastructure
- Horizontal space constraints

### Option D: Hybrid - Integration Progressions within Each Layer

Add `*_INTEGRATION` progressions to each layer file that use real upstream outputs, but keep them separate from the pure unit progressions.

```typescript
// energyFieldProgressions.ts

// Unit progressions (synthetic inputs)
export const ENERGY_FIELD_STRIPS = [...];

// Integration progressions (real upstream inputs)
export const ENERGY_FIELD_INTEGRATION_STRIPS = [
  {
    testId: 'energy-integration-sandbar',
    pageId: '02-energy-field',
    snapshots: PROGRESSION_ENERGY_SANDBAR_INTEGRATION.snapshots,
  },
];
```

**Pros:**
- Clear unit vs integration distinction
- Colocated with layer code
- Easy to run all integration tests: `ALL_INTEGRATION_STRIPS`
- No new files/infrastructure needed

**Cons:**
- Files get longer
- Need discipline to maintain separation

## Recommendation

**Option D (Hybrid)** offers the best balance:

1. **Preserves unit test purity** - existing progressions unchanged
1. **Explicit integration coverage** - new `*_INTEGRATION_STRIPS` arrays
1. **Colocated** - integration tests live with the layer they test
1. **Incremental** - add integration progressions one layer at a time
1. **Discoverable** - single `ALL_INTEGRATION_STRIPS` export for running all

## Implementation Steps

### Phase 1: Infrastructure (Layer 2 - Energy Field)

1. [ ] Add `BATHYMETRY_OUTPUTS` export from bathymetryProgressions.ts
   - Export final snapshots in a format energy field can consume

1. [ ] Create `PROGRESSION_ENERGY_SANDBAR_INTEGRATION` in energyFieldProgressions.ts
   - Import and use `BATHYMETRY_OUTPUTS.sandbar`
   - Verify damping behaves correctly over sandbar profile

1. [ ] Add `ENERGY_FIELD_INTEGRATION_STRIPS` array

1. [ ] Update all-strips.spec.ts to optionally include integration strips

### Phase 2: Wave Breaking Integration

1. [ ] Add `ENERGY_FIELD_OUTPUTS` export
1. [ ] Create breaking integration progressions that use real energy field state
1. [ ] Verify breaking triggers at correct energy thresholds

### Phase 3: Foam Chain Integration

1. [ ] Add integration progressions for:
   - Energy Transfer (from breaking)
   - Foam Grid (from energy transfer)
   - Foam Dispersion (from foam grid)
   - Foam Contours (from dispersion)

### Phase 4: End-to-End Integration Strip

1. [ ] Create single "full pipeline" progression showing:
   - Sandbar bathymetry → energy damping → breaking → foam
   - All layers in one filmstrip for visual verification

## Files Affected

- `src/render/bathymetryProgressions.ts` - Add `BATHYMETRY_OUTPUTS` export
- `src/state/energyFieldProgressions.ts` - Add integration progressions
- `src/render/waveBreakingProgressions.ts` - Add integration progressions
- `src/render/energyTransferProgressions.ts` - Add integration progressions
- `src/render/foamGridProgressions.ts` - Add integration progressions
- `src/render/foamDispersionProgressions.ts` - Add integration progressions
- `src/render/foamContoursProgressions.ts` - Add integration progressions
- `tests/visual/all-strips.spec.ts` - Include integration strips
- `stories/09-integration.mdx` - New MDX page for integration docs (optional)

## Testing

- Run `npm run test:visual:headless` to verify integration strips render
- Integration strips should fail if upstream layer output format changes
- Visual regression catches subtle integration bugs

## Open Questions

1. **Import cycle prevention** - Should we create a separate `layerOutputs.ts` that re-exports all layer outputs to avoid A→B→A cycles?

1. **Snapshot format** - Do layers need a standardized "output" format, or can we use existing snapshot structures?

1. **MDX documentation** - Should integration tests get their own MDX page (09-integration.mdx) or live on each layer's page?

## Success Criteria

- [ ] At least one integration progression per layer boundary (7 total)
- [ ] Integration tests catch a simulated interface change (verify by breaking one)
- [ ] Full pipeline strip shows bathymetry→foam in single visual
- [ ] No import cycles or circular dependencies
