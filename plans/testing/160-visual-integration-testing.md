# Plan 160: Visual Integration Testing

**Status**: Proposed
**Category**: testing
**Depends On**: 110 (Testing Strategy), 130 (Testing Expansion), 141 (Energy-Driven Waves/Foam), **155 (Layer Architecture Correction)**

## Problem

Our 9-layer visual testing pipeline validates each layer in isolation:

```
Layer 1: Bottom Depth     ← tested alone
Layer 2: Bottom Damping   ← tested alone (derives from depth)
Layer 3: Energy Field     ← tested alone
Layer 4: Shoaling         ← tested alone
Layer 5: Wave Breaking    ← tested alone
Layer 6: Energy Transfer  ← tested alone
Layer 7: Foam Grid        ← tested alone
Layer 8: Foam Dispersion  ← tested alone
Layer 9: Foam Contours    ← tested alone
```

This is analogous to unit testing - each layer's progressions use synthetic/hardcoded inputs rather than outputs from previous layers. We're **not verifying the integration points**:

- Does depth output correctly drive damping calculation?
- Does damping output correctly affect energy field propagation?
- Does energy field state correctly trigger wave breaking?
- Does breaking energy correctly feed foam accumulation?

A bug in how Layer N passes data to Layer N+1 would go undetected.

> **Note**: See [Plan 155](../model/155-layer-architecture-correction.md) for the corrected layer architecture that inserts the Damping layer and establishes 1:1 story mapping.

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

Example: `ENERGY_FIELD_STRIPS` would import damping from Layer 2, which itself imports depth from Layer 1.

```typescript
// src/layers/03-energy-field/stories/07-sandbar.ts
import { PROGRESSION_SANDBAR as DAMPING_SANDBAR } from '../../02-bottom-damping/stories/07-sandbar';

export const PROGRESSION_ENERGY_SANDBAR = defineProgression({
  id: 'energy-field/sandbar',
  description: 'Energy propagation over sandbar damping profile',
  // Uses REAL damping grid from Layer 2, derived from Layer 1 depth
  dampingGrid: DAMPING_SANDBAR.snapshots[0].matrix,
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

### Phase 1: Infrastructure (Layer 2 - Bottom Damping)

> **Prerequisite**: Complete [Plan 155](../model/155-layer-architecture-correction.md) layer restructuring first.

1. [ ] Add `DEPTH_OUTPUTS` export from Layer 1 stories
   - Export final snapshots in a format damping layer can consume

1. [ ] Create Layer 2 (Bottom Damping) with stories that import Layer 1 depth
   - Implement `depthToDamping()` function
   - Each story computes damping grid from corresponding depth scenario

1. [ ] Add `DAMPING_INTEGRATION_STRIPS` array

1. [ ] Update all-strips.spec.ts to include damping layer strips

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
   - Sandbar depth → damping → energy → breaking → foam
   - All layers in one filmstrip for visual verification

## Files Affected

> **Note**: Layer renumbering per [Plan 155](../model/155-layer-architecture-correction.md)

- `src/layers/01-bottom-depth/stories/*.ts` - Add depth exports for Layer 2
- `src/layers/02-bottom-damping/` - NEW: Create damping layer
- `src/layers/03-energy-field/stories/*.ts` - Import damping, add integration stories
- `src/layers/05-wave-breaking/stories/*.ts` - Add integration progressions
- `src/layers/06-energy-transfer/stories/*.ts` - Add integration progressions
- `src/layers/07-foam-grid/stories/*.ts` - Add integration progressions
- `src/layers/08-foam-dispersion/stories/*.ts` - Add integration progressions
- `src/layers/09-foam-contours/stories/*.ts` - Add integration progressions
- `tests/visual/all-strips.spec.ts` - Include integration strips
- `stories/10-integration.mdx` - New MDX page for integration docs (optional)

## Testing

- Run `npm run test:visual:headless` to verify integration strips render
- Integration strips should fail if upstream layer output format changes
- Visual regression catches subtle integration bugs

## Phase 5: Interactive Layer Toggle UI

When viewing a layer's story (e.g., Energy Field), users should be able to toggle input layers on/off to understand causality.

### UI Design

```tsx
// In ProgressionPlayer or StoryViewer
<LayerToggles
  currentLayer="energy"
  availableLayers={['bathymetry']}  // Only upstream layers
  visibleLayers={visibleLayers}
  onToggle={setVisibleLayers}
/>
```

### Color Scale Separation

Each layer needs a **visually distinct** color scale when overlaid. See [reference-color-scales.md](../reference/reference-color-scales.md).

| Layer | Color Scale | Why |
|-------|-------------|-----|
| Bottom Depth | `cividis` | Cool/neutral blues, depth metaphor |
| Bottom Damping | `YlOrRd` | Warm orange-red, high damping = hot |
| Energy Field | `viridis` | Purple-cyan-yellow, high perceptual range |
| Wave Breaking | `inferno` | Warm red-orange, heat metaphor |
| Foam | `plasma` or grayscale | Distinct hue or simple white |

### Alpha Blending

When multiple layers visible:
```typescript
const LAYER_ALPHA = {
  depth: 0.4,       // Base context layer
  damping: 0.5,     // Derived context layer
  energy: 0.8,      // Primary data
  breaking: 0.9,
  foam: 1.0,        // Top layer, opaque
};
```

### Implementation

1. [ ] Add `visibleLayers` state to ProgressionPlayer
1. [ ] Add layer toggle UI component
1. [ ] Implement multi-layer canvas rendering with alpha
1. [ ] Migrate color scales to d3-scale-chromatic library
1. [ ] Assign distinct scales per layer

## Open Questions

1. **Import cycle prevention** - Should we create a separate `layerOutputs.ts` that re-exports all layer outputs to avoid A→B→A cycles?

1. **Snapshot format** - Do layers need a standardized "output" format, or can we use existing snapshot structures?

1. **MDX documentation** - Should integration tests get their own MDX page (09-integration.mdx) or live on each layer's page?

1. **Layer toggle scope** - Should toggles only show upstream dependencies, or allow toggling downstream layers too for "preview"?

## Success Criteria

- [ ] At least one integration progression per layer boundary (8 total with damping layer)
- [ ] Integration tests catch a simulated interface change (verify by breaking one)
- [ ] Full pipeline strip shows depth→damping→energy→foam in single visual
- [ ] No import cycles or circular dependencies
- [ ] Layer toggle UI allows viewing upstream dependencies in stories
- [ ] Each layer uses a distinct, perceptually-uniform color scale (d3-scale-chromatic)
- [ ] All 9 bathymetry scenarios flow through damping to energy (1:1 mapping)
