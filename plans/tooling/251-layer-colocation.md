# Plan 251: Layer System Colocation

**Status**: Proposed
**Category**: tooling
**Depends On**: 232 (Unified Filmstrip), 233 (Nested Story Organization), 160 (Visual Integration Testing)

## Problem

The 8-layer visualization pipeline has files scattered across multiple directories:

```
src/state/bathymetryModel.ts          # Model
src/render/bathymetryRenderer.ts      # Renderer
src/render/bathymetryProgressions.ts  # Test fixtures
stories/01-bathymetry/*.mdx           # Documentation
```

This scattering creates friction:
1. **Discoverability**: Finding all files for a layer requires searching multiple directories
2. **Inconsistency**: Energy field progressions are in `src/state/`, others in `src/render/`
3. **Integration gaps**: Layers don't explicitly export outputs for downstream consumption (Plan 160)
4. **Missing tests**: Bathymetry has no visual.spec.ts unlike layers 02-08

## Proposed Solution

Colocate each layer into a self-contained module:

```
src/layers/01-bathymetry/
├── index.ts              # Public API exports
├── model.ts              # Physics/simulation (getDepth, shouldBreak)
├── model.test.ts         # Model unit tests
├── renderer.ts           # Production rendering
├── renderer.test.ts      # Renderer tests
├── progressions.ts       # Test fixtures, strips, outputs
└── stories/
    ├── 01-flat-shallow.mdx
    ├── ...
    ├── visual.spec.ts
    └── baselines/*.png
```

### Design Principles

1. **One folder = one layer**: Everything for a layer lives together
2. **Clean public API**: `index.ts` exports only what other layers need
3. **Explicit outputs**: Each layer exports `*_OUTPUTS` for downstream layers (Plan 160)
4. **Numbered prefixes**: Preserve `01-`, `02-` ordering for navigation and dependencies

### Layer Dependency Chain

Layers form a pipeline where each consumes the previous layer's output:

```
01-bathymetry
    ↓ BATHYMETRY_OUTPUTS (depth matrices)
02-energy-field
    ↓ ENERGY_FIELD_OUTPUTS (energy state)
03-shoaling
    ↓ SHOALING_OUTPUTS (transformed waves)
04-wave-breaking
    ↓ BREAKING_OUTPUTS (break events)
05-energy-transfer
    ↓ TRANSFER_OUTPUTS (released energy)
06-foam-grid
    ↓ FOAM_GRID_OUTPUTS (foam accumulation)
07-foam-dispersion
    ↓ DISPERSION_OUTPUTS (dispersed foam)
08-foam-contours
    ↓ (final render output)
```

## Implementation Phases

### Phase 1: Infrastructure Setup

1. [ ] Create `src/layers/` directory
2. [ ] Add Vite path alias: `@layers` → `src/layers`
3. [ ] Update `tsconfig.json` for IDE support
4. [ ] Document pattern in CLAUDE.md

### Phase 2: Layer 01 - Bathymetry (Pilot)

**Files to move:**

| From | To |
|------|-----|
| `src/state/bathymetryModel.ts` | `src/layers/01-bathymetry/model.ts` |
| `src/state/bathymetryModel.test.ts` | `src/layers/01-bathymetry/model.test.ts` |
| `src/render/bathymetryRenderer.ts` | `src/layers/01-bathymetry/renderer.ts` |
| `src/render/bathymetryRenderer.test.ts` | `src/layers/01-bathymetry/renderer.test.ts` |
| `src/render/bathymetryProgressions.ts` | `src/layers/01-bathymetry/progressions.ts` |
| `stories/01-bathymetry/*.mdx` | `src/layers/01-bathymetry/stories/*.mdx` |

**New files to create:**

| File | Purpose |
|------|---------|
| `src/layers/01-bathymetry/index.ts` | Public API exports |
| `src/layers/01-bathymetry/stories/visual.spec.ts` | Visual regression tests (currently missing) |

**Consumers to update:**

| File | Current Import | New Import |
|------|---------------|------------|
| `src/main.tsx` | `./state/bathymetryModel.js` | `@layers/01-bathymetry` |
| `src/main.tsx` | `./render/bathymetryRenderer.js` | `@layers/01-bathymetry` |
| `src/update/index.ts` | `../state/bathymetryModel.js` | `@layers/01-bathymetry` |
| `src/state/aiPlayerModel.ts` | `./bathymetryModel.js` | `@layers/01-bathymetry` |
| `src/state/eventStore.ts` | `./bathymetryModel.js` | `@layers/01-bathymetry` |

**index.ts structure:**
```typescript
// Public API - what other modules can import
export {
  DEFAULT_BATHYMETRY,
  getDepth,
  getMinDepth,
  getPeakX,
  shouldBreak,
  amplitudeToHeight,
} from './model';

export {
  buildBathymetryCache,
  createBathymetryCacheManager,
  depthToColor,
} from './renderer';

export {
  BATHYMETRY_PROGRESSIONS,
  BATHYMETRY_STRIPS,
} from './progressions';

// Outputs for downstream layers (Plan 160)
export { BATHYMETRY_OUTPUTS } from './progressions';
```

**Acceptance criteria:**
- [ ] All bathymetry files moved to `src/layers/01-bathymetry/`
- [ ] All imports updated and working
- [ ] `npm run lint` passes
- [ ] `npm run test:unit` passes
- [ ] `npm run test:smoke` passes
- [ ] Stories viewer loads bathymetry stories
- [ ] Visual spec created and baselines captured

### Phase 3: Layer 02 - Energy Field

**Files to move:**

| From | To |
|------|-----|
| `src/state/energyFieldModel.ts` | `src/layers/02-energy-field/model.ts` |
| `src/state/energyFieldModel.test.ts` | `src/layers/02-energy-field/model.test.ts` |
| `src/state/energyFieldProgressions.ts` | `src/layers/02-energy-field/progressions.ts` |
| `src/state/energyFieldPropagation.test.ts` | `src/layers/02-energy-field/propagation.test.ts` |
| `src/render/energyFieldRenderer.ts` | `src/layers/02-energy-field/renderer.ts` |
| `stories/02-energy-field/*` | `src/layers/02-energy-field/stories/*` |

**Integration with Layer 01:**
```typescript
// src/layers/02-energy-field/progressions.ts
import { BATHYMETRY_OUTPUTS } from '@layers/01-bathymetry';

export const PROGRESSION_ENERGY_SANDBAR_INTEGRATION = defineProgression({
  id: 'energy-field/integration/sandbar',
  description: 'Energy damping over real sandbar bathymetry',
  bathymetry: BATHYMETRY_OUTPUTS.sandbar,
  // ...
});
```

### Phase 4: Layer 03 - Shoaling

| From | To |
|------|-----|
| `src/render/shoalingProgressions.ts` | `src/layers/03-shoaling/progressions.ts` |
| `stories/03-shoaling/*` | `src/layers/03-shoaling/stories/*` |

Note: Shoaling may not have a separate model.ts if logic is inline in progressions.

### Phase 5: Layer 04 - Wave Breaking

| From | To |
|------|-----|
| `src/render/waveBreakingProgressions.ts` | `src/layers/04-wave-breaking/progressions.ts` |
| `stories/04-wave-breaking/*` | `src/layers/04-wave-breaking/stories/*` |

### Phase 6: Layer 05 - Energy Transfer

| From | To |
|------|-----|
| `src/render/energyTransferProgressions.ts` | `src/layers/05-energy-transfer/progressions.ts` |
| `stories/05-energy-transfer/*` | `src/layers/05-energy-transfer/stories/*` |

### Phase 7: Layer 06 - Foam Grid

| From | To |
|------|-----|
| `src/state/foamGridModel.ts` | `src/layers/06-foam-grid/model.ts` |
| `src/render/foamGridProgressions.ts` | `src/layers/06-foam-grid/progressions.ts` |
| `stories/06-foam-grid/*` | `src/layers/06-foam-grid/stories/*` |

### Phase 8: Layer 07 - Foam Dispersion

| From | To |
|------|-----|
| `src/render/foamDispersionProgressions.ts` | `src/layers/07-foam-dispersion/progressions.ts` |
| `stories/07-foam-dispersion/*` | `src/layers/07-foam-dispersion/stories/*` |

### Phase 9: Layer 08 - Foam Contours

| From | To |
|------|-----|
| `src/render/foamContoursProgressions.ts` | `src/layers/08-foam-contours/progressions.ts` |
| `src/render/foamContourRenderer.ts` | `src/layers/08-foam-contours/renderer.ts` |
| `stories/08-foam-contours/*` | `src/layers/08-foam-contours/stories/*` |

### Phase 10: Integration Testing Layer

Create a new layer for full-pipeline integration tests:

```
src/layers/09-integration/
├── index.ts
├── progressions.ts         # Full pipeline progressions
└── stories/
    ├── full-pipeline.mdx   # Bathymetry → Foam in one view
    ├── visual.spec.ts
    └── baselines/*.png
```

This layer imports outputs from all previous layers and creates end-to-end integration progressions (Plan 160 Phase 4).

### Phase 11: Cleanup

1. [ ] Remove empty directories in `src/state/` and `src/render/`
2. [ ] Update `src/render/index.ts` and `src/state/index.ts` to re-export from layers
3. [ ] Archive superseded re-export files if no longer needed
4. [ ] Update CLAUDE.md with new structure documentation

## File Structure After Completion

```
src/layers/
├── 01-bathymetry/
│   ├── index.ts
│   ├── model.ts
│   ├── model.test.ts
│   ├── renderer.ts
│   ├── renderer.test.ts
│   ├── progressions.ts
│   └── stories/
│       ├── 01-flat-shallow.mdx
│       ├── ...
│       ├── visual.spec.ts
│       └── baselines/*.png
├── 02-energy-field/
│   ├── index.ts
│   ├── model.ts
│   ├── model.test.ts
│   ├── renderer.ts
│   ├── progressions.ts
│   └── stories/...
├── 03-shoaling/
│   └── ...
├── 04-wave-breaking/
│   └── ...
├── 05-energy-transfer/
│   └── ...
├── 06-foam-grid/
│   └── ...
├── 07-foam-dispersion/
│   └── ...
├── 08-foam-contours/
│   └── ...
└── 09-integration/
    └── ...
```

## Stories Viewer Updates

The stories viewer (`stories/App.tsx`) needs to discover MDX files from the new location:

```typescript
// Before
const mdxModules = import.meta.glob('./**/*.mdx');

// After - include layer stories
const mdxModules = import.meta.glob([
  './**/*.mdx',
  '../src/layers/**/stories/*.mdx'
]);
```

Alternatively, keep stories in `stories/` and only colocate source code. This is a design decision to make during Phase 2.

## Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@layers': path.resolve(__dirname, 'src/layers'),
      '@src': path.resolve(__dirname, 'src'),
      '@stories': path.resolve(__dirname, 'stories'),
    },
  },
});
```

## Testing Strategy

Each phase should pass before moving to the next:

1. `npm run lint` - No import errors
2. `npm run test:smoke` - App loads without JS errors
3. `npm run test:unit` - All unit tests pass
4. `npm run test:visual:headless` - Visual regression passes
5. Stories viewer renders correctly

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking imports across codebase | Update all imports in same commit; run full test suite |
| Stories viewer can't find MDX | Update glob patterns before moving files |
| Visual baselines break | Regenerate baselines after structure change |
| Circular dependencies between layers | Layers only import from lower-numbered layers |

## Open Questions

1. **Stories location**: Keep stories in layer folders, or keep in `stories/` directory?
   - Pro colocated: Everything for a layer is together
   - Pro separate: Clear separation of src (runtime) and stories (docs/tests)

2. **Re-export strategy**: Should `src/render/index.ts` re-export from layers for backwards compatibility?

3. **Shared components**: Where do `stories/components/` (Filmstrip, SingleSnapshot) live?
   - Option A: `src/layers/shared/components/`
   - Option B: Keep in `stories/components/`

## Success Criteria

- [ ] All 8 layers colocated in `src/layers/NN-*/`
- [ ] Each layer has `index.ts` with clean public API
- [ ] Each layer exports `*_OUTPUTS` for downstream consumption
- [ ] Integration layer (09) demonstrates full pipeline
- [ ] All tests pass (unit, smoke, visual)
- [ ] Stories viewer works with new structure
- [ ] No circular dependencies between layers
- [ ] CLAUDE.md updated with new patterns

## Related Plans

- **Plan 160**: Visual Integration Testing - defines `*_OUTPUTS` pattern
- **Plan 232**: Unified Filmstrip Component - rendering infrastructure
- **Plan 233**: Nested Story Organization - story file structure
- **Plan 150**: Test/Production Parity - code reuse principles
