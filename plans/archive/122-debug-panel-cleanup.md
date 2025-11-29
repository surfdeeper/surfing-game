# Plan 122: Debug Panel Cleanup

## Problem

The debug panel has several usability issues:

1. **Wave state labels overflow** - Text like `[approaching]` pushes content off the right edge
1. **Waves shown after reaching shore** - Waves appear in debug panel even after passing the shore line, with "at shore" status. They should be removed when they reach shore.
1. **Wave order is counterintuitive** - Waves are listed in spawn order (oldest first), not screen order (top to bottom). The first wave in the list should be the one closest to the horizon.

## Solution

### Changes to `src/main.js`

1. **Remove wave state labels** - Delete the `[approaching]`/`[visible]`/`[at shore]` text
1. **Filter waves at shore** - Only show waves where `wave.y < shoreY` in the debug panel
1. **Sort waves by position** - Display waves sorted by `y` ascending (smallest y = closest to horizon = first in list)

## Implementation

```js
// In draw(), replace the wave list section:

// Filter and sort waves for display (exclude at-shore, sort by distance from horizon)
const displayWaves = world.waves
    .filter(wave => wave.y < shoreY)
    .sort((a, b) => a.y - b.y);  // ascending: horizon first

ctx.fillText(`Active waves: ${displayWaves.length}`, w - 210, 115);

for (let i = 0; i < displayWaves.length; i++) {
    const wave = displayWaves[i];
    const distanceToShore = shoreY - wave.y;
    const timeToShore = (distanceToShore / world.swellSpeed).toFixed(1);
    const ampPercent = Math.round(wave.amplitude * 100);
    ctx.fillStyle = '#aaa';
    ctx.fillText(`  • ${ampPercent}% amp, ${timeToShore}s`, w - 210, 130 + i * 16);
}
```

## Testing

- Visual inspection: waves should disappear from debug panel as they reach shore
- Wave order should match screen (top wave in list = top wave on screen)
- No text overflow on the right side

## Scope

This is a quick fix focused only on debug panel UX. Does not change:
- Wave spawning/removal logic
- Rendering
- Game state architecture
