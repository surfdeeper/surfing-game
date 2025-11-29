# 232 - Unified Filmstrip Component

**Status**: Complete
**Category**: tooling
**Depends On**: None

## Problem

Multiple story strip components duplicate layout logic and some hardcode colors/thresholds that should come from production code:

| Component | Color Source | Issue |
|-----------|--------------|-------|
| `BathymetryStrip.tsx` | `depthToColor` (prod) | Duplicated strip layout |
| `ProgressionPlayer.tsx` | `energyToColor` (prod) | Duplicated strip layout |
| `FoamContourStrip.tsx` | `DEFAULT_THRESHOLDS` (hardcoded) | **Violates test/prod parity** |

This violates the Code Reuse Principle: tests may render differently than production if hardcoded values drift.

## Current Duplication

All three components share identical strip layout:
```tsx
<div data-testid={testId} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '1em 0' }}>
  {snapshots.map((snapshot, idx) => (
    <div key={idx} style={{ textAlign: 'center' }}>
      {/* Canvas rendering differs */}
      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{snapshot.label}</div>
    </div>
  ))}
</div>
```

### FoamContourStrip Specific Issues
- Hardcodes `DEFAULT_THRESHOLDS` with values `[0.15, 0.3, 0.5]`
- Hardcodes `backgroundColor = '#1a4a6e'`
- Calls `extractLineSegments`, `boxBlur` directly (should use production renderer)

## Proposed Solution

### Option A: Generic Filmstrip + Render Functions (Recommended)

Create a single `<Filmstrip>` component that delegates rendering to production code:

```tsx
// stories/components/Filmstrip.tsx
interface FilmstripProps<T> {
  snapshots: T[];
  renderSnapshot: (snapshot: T, canvas: HTMLCanvasElement) => void;
  getLabel: (snapshot: T) => string;
  canvasSize?: { width: number; height: number };
  testId: string;
}

export function Filmstrip<T>({ snapshots, renderSnapshot, getLabel, canvasSize, testId }: FilmstripProps<T>) {
  return (
    <div data-testid={testId} style={{ display: 'flex', gap: 8, ... }}>
      {snapshots.map((snapshot, idx) => (
        <SnapshotFrame
          key={idx}
          snapshot={snapshot}
          render={renderSnapshot}
          label={getLabel(snapshot)}
          size={canvasSize}
        />
      ))}
    </div>
  );
}
```

Usage in MDX:
```tsx
import { Filmstrip } from '../components/Filmstrip';
import { renderBathymetry } from '../../src/render/bathymetryRenderer';

<Filmstrip
  snapshots={BATHYMETRY_STRIP_BASIC.snapshots}
  renderSnapshot={(snap, canvas) => renderBathymetry(canvas, snap.matrix)}
  getLabel={(snap) => snap.label}
  testId="strip-bathymetry-basic"
/>
```

### Benefits
1. **Single strip layout** - DRY
2. **Production renderers** - Tests use same code as game
3. **Type-safe** - Generic `<T>` allows different snapshot shapes
4. **Composable** - Easy to add new layer types

## Implementation Steps

### Phase 1: Create Generic Filmstrip
1. Create `stories/components/Filmstrip.tsx` with generic props
2. Add tests for the component itself

### Phase 2: Migrate BathymetryStrip
1. Create `src/render/bathymetryRenderer.ts` if not exists (extract from BathymetryStrip)
2. Update `01-bathymetry.mdx` to use `<Filmstrip>` with bathymetry renderer
3. Delete `BathymetryStrip.tsx`

### Phase 3: Migrate ProgressionPlayer/Strip
1. Ensure `energyToColor` renderer is available
2. Update energy field MDX files to use `<Filmstrip>`
3. Keep `ProgressionPlayer` (interactive player is different from strip)
4. Delete `ProgressionStrip` export

### Phase 4: Migrate FoamContourStrip (Critical)
1. **Extract production thresholds** from wherever they're defined in game code
2. Create `src/render/foamContourRenderer.ts` that uses production thresholds
3. Update foam contour MDX to use `<Filmstrip>` with production renderer
4. Delete `FoamContourStrip.tsx`
5. Verify visual tests still pass (or update baselines if intentional change)

## Acceptance Criteria
- [x] Single `Filmstrip` component handles all strip layouts
- [x] All renderers imported from `src/render/` (production code)
- [x] No hardcoded thresholds/colors in story components
- [ ] Visual regression tests pass (or baselines updated with explanation)
- [x] `BathymetryStrip.tsx`, `FoamContourStrip.tsx` deleted
- [x] `ProgressionStrip` removed from `ProgressionPlayer.tsx`

## Risks & Mitigations
- **Visual diff**: Production thresholds may differ from hardcoded values → Run visual tests, update baselines if needed, document why
- **Missing renderers**: Some layers may not have extracted renderers → Create them during migration

## Follow-ups
- Add lint rule to prevent direct color/threshold definitions in `stories/` directory
- Document pattern for adding new layer visualizations
