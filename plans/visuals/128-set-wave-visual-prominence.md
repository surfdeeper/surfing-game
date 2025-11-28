# Plan 128: Set Wave Visual Prominence

Status: proposal
Owner: agents
Depends on: 125-unified-wave-array.md (done)

## Problem

Set waves and background waves look too similar. While amplitude affects thickness and contrast, this isn't enough visual differentiation:

1. **Same color palette** - both use `swellPeak` → `swellTrough` gradient
2. **Only amplitude varies** - thickness and contrast scale with amplitude, but a high-amplitude background wave looks like a set wave
3. **No visual "weight"** - set waves should feel more powerful, defined, substantial
4. **Hard to spot sets coming** - surfers need to easily identify incoming sets

## Current Rendering

```javascript
// Thickness: amplitude 0.15 → 40px, amplitude 1.0 → 120px
const waveSpacing = minThickness + (maxThickness - minThickness) * wave.amplitude;

// Contrast: low amplitude → trough approaches peak color (less contrast)
const currentTroughColor = getTroughColor(wave.amplitude);

// Gradient: peak (dark) → trough (light) → peak (dark)
grad.addColorStop(0, colors.swellPeak);
grad.addColorStop(1, currentTroughColor);
```

Both wave types use identical rendering logic - only amplitude differs.

## Solution: Type-Based Visual Differentiation

### 1. Color Saturation/Vibrancy

Set waves should have richer, more saturated colors:

```javascript
const colors = {
    // Current (shared)
    swellPeak: '#1a4a6e',
    swellTrough: '#4a90b8',

    // New: type-specific palettes
    setWave: {
        peak: '#0d3a5c',      // Deeper, richer blue
        trough: '#2e7aa8',    // More saturated trough
    },
    backgroundWave: {
        peak: '#2a5a7e',      // Lighter, more muted
        trough: '#6aa0c8',    // Desaturated, subtle
    },
};
```

### 2. Contrast Range

Set waves get full contrast range; background waves get reduced contrast:

```javascript
function getTroughColor(wave) {
    const isSet = wave.type === WAVE_TYPE.SET;

    // Set waves: full contrast based on amplitude
    // Background waves: reduced max contrast (never as vibrant)
    const maxContrast = isSet ? 1.0 : 0.5;
    const contrast = wave.amplitude * maxContrast;

    const palette = isSet ? colors.setWave : colors.backgroundWave;
    return lerpColor(palette.peak, palette.trough, contrast);
}
```

### 3. Edge Definition

Set waves could have a subtle edge/outline for more definition:

```javascript
const drawWave = (wave) => {
    // ... existing gradient drawing ...

    // Add subtle edge line for set waves
    if (wave.type === WAVE_TYPE.SET && wave.amplitude > 0.5) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, peakY);
        ctx.lineTo(w, peakY);
        ctx.stroke();
    }
};
```

### 4. Opacity/Alpha

Background waves slightly more transparent:

```javascript
const drawWave = (wave) => {
    const isSet = wave.type === WAVE_TYPE.SET;

    // Background waves slightly transparent
    ctx.globalAlpha = isSet ? 1.0 : 0.85;

    // ... draw gradient ...

    ctx.globalAlpha = 1.0;
};
```

### 5. Minimum Thickness

Ensure background waves stay thin even at higher amplitudes:

```javascript
const drawWave = (wave) => {
    const isSet = wave.type === WAVE_TYPE.SET;

    // Set waves: 40-120px based on amplitude
    // Background waves: 30-70px (always thinner)
    const minThickness = isSet ? 40 : 30;
    const maxThickness = isSet ? 120 : 70;

    const waveSpacing = minThickness + (maxThickness - minThickness) * wave.amplitude;
};
```

## Implementation Steps

| Step | Task | Files |
|------|------|-------|
| 1 | Add type-specific color palettes to `colors` object | `src/main.jsx` |
| 2 | Update `getTroughColor()` to accept wave object, use type | `src/main.jsx` |
| 3 | Add contrast limiting for background waves | `src/main.jsx` |
| 4 | Add type-specific thickness ranges in `drawWave()` | `src/main.jsx` |
| 5 | Add slight transparency for background waves | `src/main.jsx` |
| 6 | Optional: Add edge highlight for set waves | `src/main.jsx` |
| 7 | Update visual tests to capture differentiation | `tests/visual.spec.js` |

## Visual Comparison

| Property | Background Waves | Set Waves |
|----------|-----------------|-----------|
| Peak color | `#2a5a7e` (muted) | `#0d3a5c` (deep) |
| Trough color | `#6aa0c8` (pale) | `#2e7aa8` (rich) |
| Max contrast | 50% | 100% |
| Thickness range | 30-70px | 40-120px |
| Opacity | 85% | 100% |
| Edge highlight | No | Yes (optional) |

## Success Criteria

1. Set waves immediately recognizable as "the big ones"
2. Background waves feel like subtle chop/texture
3. Clear visual hierarchy without looking artificial
4. Surfer can easily spot incoming sets at the horizon

## Alternative Approaches Considered

### A. Different Gradient Shape
Could use different gradient profiles (e.g., sharper vs softer transitions). Adds complexity for subtle effect.

### B. Texture/Pattern
Could add subtle noise or pattern to set waves. Would require shader or more complex rendering.

### C. Animation Speed
Set waves could have subtle shimmer/animation. Adds complexity, may be distracting.

### D. Glow/Bloom Effect
Set waves could have subtle outer glow. May look too stylized.

The proposed solution (color + contrast + thickness + opacity) achieves clear differentiation with minimal code changes and maintains the clean gradient aesthetic.

## Related Plans

- **125**: Unified wave array (done) - enables type-based rendering
- **127**: Period-based speed - sets move faster, adding to visual distinction
- **126**: Wave interference - double-ups would get even more visual prominence
