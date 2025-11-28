# Wave Refraction Model

## Status: Implemented

## Overview

Waves now have per-X progress data that interacts with bathymetry, causing them to bend over shallow areas and reform afterward. This mirrors the foam zone system which already had per-X data.

## Data Model

Each wave now stores:

```javascript
{
    id: "wave-1",
    spawnTime: 5000,
    amplitude: 0.8,
    type: "set",
    progressPerX: [0.1, 0.1, 0.09, ...],  // 40 samples across X
    lastUpdateTime: 5000,
}
```

- `progressPerX`: Array of 40 progress values (0-1), one per X slice
- `lastUpdateTime`: Tracks when last updated for incremental computation

## Physics

### Refraction (Bending)

Waves slow down in shallow water according to `c = sqrt(g * depth)`:
- Deep water (30m): ~17 m/s
- Shallow water (2m): ~4.4 m/s

This creates ~4x speed difference which is too extreme visually, so it's dampened by `REFRACTION_STRENGTH` (default 0.3).

### Lateral Diffusion (Reformation)

After bending, waves try to reform into a line via diffusion:
- Each X slice blends toward its neighbors' average
- Simulates the connected nature of wave energy ("tension" along the crest)
- Wave reforms but retains slightly different orientation

## Constants

| Constant | Default | Description |
|----------|---------|-------------|
| `WAVE_X_SAMPLES` | 40 | Number of X slices per wave |
| `REFRACTION_STRENGTH` | 0.3 | Bathymetry effect (0=none, 1=full physics) |
| `LATERAL_DIFFUSION` | 0.15 | Reformation speed (0=never, 1=instant) |

## Key Functions

### `updateWaveRefraction(wave, currentTime, baseTravelDuration, getDepthFn, deepDepth)`

Called each frame for each wave. Two-step process:
1. Apply bathymetry-based speed differences to each X slice
2. Apply lateral diffusion to smooth out bends

### `getProgressAtX(wave, normalizedX)`

Get progress at a specific X position (for rendering or queries).

### `getAverageProgress(wave)`

Get average progress across all X positions (for compatibility).

## Rendering

Waves are rendered as vertical slices, each at its own Y position:

```javascript
for (let i = 0; i < numSlices; i++) {
    const progress = wave.progressPerX[i];
    const peakY = progressToScreenY(progress, oceanTop, oceanBottom);
    // Draw gradient slice at this Y
}
```

## Visual Behavior

1. Wave starts as straight line at horizon
2. As it passes over sandbar/point, shallow sections lag behind → wave bends
3. After passing obstacle, diffusion pulls wave back toward straight
4. Wave continues with slightly rotated orientation

## Tuning

- **More dramatic bending**: Increase `REFRACTION_STRENGTH` toward 1.0
- **Faster reformation**: Increase `LATERAL_DIFFUSION` toward 0.3+
- **Longer-lasting bends**: Decrease `LATERAL_DIFFUSION` toward 0.05
- **More resolution**: Increase `WAVE_X_SAMPLES` (costs more CPU)

## Files Modified

- `src/state/waveModel.js` - Core refraction logic
- `src/main.jsx` - Game loop integration and rendering
