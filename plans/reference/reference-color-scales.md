# Reference: Color Scales for Multi-Layer Visualization

## Problem

When overlaying multiple data layers (bathymetry, energy field, foam), each layer needs a distinct color scale that:
1. Is **perceptually uniform** (equal data steps = equal visual steps)
1. Is **colorblind-friendly**
1. Is **visually distinct** from other layers when overlaid
1. Works well with **alpha blending** for transparency

## Current Implementation

See [colorScales.ts](../../src/render/colorScales.ts):
- `viridisToColor()` - Viridis scale (purple → cyan → yellow) for energy
- `depthToColor()` - Custom blue scale for bathymetry (hand-rolled, not perceptually uniform)

## Recommended Color Scale Library

### d3-scale-chromatic (Recommended)

```bash
npm install d3-scale-chromatic
```

**Why**: Industry standard, includes all matplotlib perceptually-uniform scales, zero config.

```typescript
import { interpolateViridis, interpolateMagma, interpolatePlasma } from 'd3-scale-chromatic';

// Returns CSS color string for t in [0, 1]
interpolateViridis(0.5);  // "rgb(33, 145, 140)"
```

### Alternative: chroma.js

```bash
npm install chroma-js
```

**Why**: More flexible for custom scales, better Lab/Lch interpolation.

```typescript
import chroma from 'chroma-js';

// Create custom scale
const scale = chroma.scale(['#440154', '#21918c', '#fde725']).mode('lab');
scale(0.5).hex(); // Perceptually uniform interpolation
```

## Recommended Layer Color Assignments

For surf sim layers that may be overlaid, assign **orthogonal** color schemes:

| Layer | Scale | Visual Character | Why |
|-------|-------|------------------|-----|
| **Bathymetry** (depth) | `cividis` | Yellow → Blue-gray | Optimized for colorblindness, distinct from Viridis |
| **Energy Field** | `viridis` | Purple → Cyan → Yellow | Current choice, high perceptual range |
| **Wave Breaking** | `inferno` | Black → Red → Yellow | Heat metaphor, distinct warm tones |
| **Foam Intensity** | `plasma` | Purple → Pink → Yellow | Distinct purple-pink hue shift |
| **Foam Age** | Grayscale | White → Gray | Simple, doesn't compete with data layers |

### Visual Separation Strategy

```
Layer 1 (bottom): Bathymetry - cividis (cool/neutral)
Layer 2: Energy - viridis (purple-green-yellow)
Layer 3 (top): Foam - plasma or grayscale with alpha
```

The key insight: **cividis and viridis are specifically designed to be distinguishable** from each other while both being perceptually uniform.

## Implementation Plan

### Phase 1: Replace Hand-Rolled Scales

Replace `depthToColor()` in colorScales.ts with d3-scale-chromatic:

```typescript
import { interpolateCividis } from 'd3-scale-chromatic';

export function depthToColor(depth: number): string {
  // Invert so deep = dark, shallow = light
  return interpolateCividis(1 - depth);
}
```

### Phase 2: Add All Scales

```typescript
// src/render/colorScales.ts
import {
  interpolateViridis,
  interpolateCividis,
  interpolateInferno,
  interpolatePlasma,
  interpolateGreys,
} from 'd3-scale-chromatic';

export const COLOR_SCALES = {
  bathymetry: (t: number) => interpolateCividis(1 - t),
  energy: interpolateViridis,
  breaking: interpolateInferno,
  foamIntensity: interpolatePlasma,
  foamAge: (t: number) => interpolateGreys(1 - t), // White = fresh
};
```

### Phase 3: Layer Toggle UI

In story components, add toggle controls:

```tsx
interface LayerToggleProps {
  showBathymetry: boolean;
  showEnergy: boolean;
  onToggle: (layer: string) => void;
}

// Each layer renders with appropriate alpha when multiple visible
const LAYER_ALPHA = {
  bathymetry: 0.6,  // Base layer, slightly transparent
  energy: 0.8,      // Primary data layer
  foam: 1.0,        // Top layer, opaque
};
```

## Alpha Blending Considerations

When overlaying:
1. **Bottom layer (bathymetry)**: alpha 0.5-0.7, provides context
1. **Middle layer (energy)**: alpha 0.7-0.9, primary focus
1. **Top layer (foam)**: alpha 1.0 or use white with alpha for "foam" effect

Canvas compositing:
```typescript
ctx.globalAlpha = LAYER_ALPHA[layer];
ctx.globalCompositeOperation = 'source-over'; // Default
// or 'multiply' for darker blend, 'screen' for lighter
```

## Color Scale Comparison Chart

```
Value:    0.0   0.25   0.5   0.75   1.0
         ─────────────────────────────────
viridis:  ████   ████   ████   ████   ████
          purp   blue   teal   green  yell

cividis:  ████   ████   ████   ████   ████
          blue   gray   tan    gold   yell

inferno:  ████   ████   ████   ████   ████
          blk    purp   red    orng   yell

plasma:   ████   ████   ████   ████   ████
          purp   pink   orng   gold   yell
```

## Sources

- [d3-scale-chromatic npm](https://www.npmjs.com/package/d3-scale-chromatic)
- [chroma.js documentation](https://gka.github.io/chroma.js/)
- [Introduction to viridis](https://cran.r-project.org/web/packages/viridis/vignettes/intro-to-viridis.html)
- [Scientific Colour Maps project](https://www.fabiocrameri.ch/colourmaps/)
- [ColorBrewer palettes](https://colorbrewer2.org/)

## Open Questions

1. Should we use CSS custom properties for color scales (theming)?
1. Should foam use a dedicated "white foam" appearance rather than a data heatmap?
1. How to handle print/grayscale export?
