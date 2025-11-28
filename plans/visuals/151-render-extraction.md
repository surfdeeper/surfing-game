# Plan 151: Extract Render Functions

## Problem

`main.jsx` has a 350-line `draw()` function containing:
- Wave rendering (gradient, per-X slices)
- Foam rendering (marching squares, contours)
- Bathymetry overlay
- Player/AI rendering
- Debug overlays
- UI elements

This is hard to test, maintain, and reuse in Storybook.

## Current State

```javascript
// main.jsx draw() - ~350 lines
function draw() {
    // Clear canvas
    // Draw ocean gradient
    // For each wave: draw gradient slices
    // Draw foam polygons
    // Draw bathymetry if toggled
    // Draw player if toggled
    // Draw debug info
}
```

## Proposed Structure

```
src/render/
  index.js              # Re-exports all renderers
  oceanRenderer.js      # Background gradient
  waveRenderer.js       # Individual wave drawing
  foamRenderer.js       # Foam contours (uses marchingSquares.js)
  bathymetryRenderer.js # Depth overlay
  playerRenderer.js     # Player/AI sprites
  debugRenderer.js      # FPS, state info
```

Each renderer is a pure function:
```javascript
// waveRenderer.js
export function renderWave(ctx, wave, bounds, colors, gameTime, travelDuration) {
    // Draw wave gradient slices
}

export function renderWaves(ctx, waves, bounds, colors, gameTime, travelDuration) {
    for (const wave of waves) {
        renderWave(ctx, wave, bounds, colors, gameTime, travelDuration);
    }
}
```

## Implementation Steps

1. **Create `src/render/oceanRenderer.js`**
   - Extract ocean gradient drawing
   - Pure function: `(ctx, width, height, colors) => void`

2. **Create `src/render/waveRenderer.js`**
   - Extract wave gradient slice logic
   - Handle both set and background wave colors
   - Pure function: `(ctx, wave, bounds, toggles, gameTime, travelDuration) => void`

3. **Create `src/render/bathymetryRenderer.js`**
   - Extract depth overlay drawing
   - Already partially in render/ folder

4. **Update `src/render/foamRenderer.js`**
   - Already exists but may need cleanup
   - Ensure it's actually used by main.jsx (not just Storybook)

5. **Create `src/render/playerRenderer.js`**
   - Extract player/AI drawing

6. **Create `src/render/debugRenderer.js`**
   - FPS display
   - Lull state info
   - Toggle state display

7. **Update main.jsx `draw()`**
   - Import and call renderers
   - Should be ~50 lines of orchestration

## Benefits

- **Testable**: Can unit test renderers with mock canvas
- **Storybook**: Each renderer usable in isolation
- **Performance**: Can profile individual renderers
- **Maintainability**: Changes isolated to one file

## Success Criteria

- [ ] main.jsx `draw()` under 60 lines
- [ ] Each renderer has Storybook story
- [ ] No rendering logic duplicated between main.jsx and Storybook

## Dependencies

- Plan 150 (optional, but renderers will read from state store)

## Related

- Existing: `src/render/marchingSquares.js` (foam contour algorithm)
- Existing: `src/render/foamDispersion.js`
