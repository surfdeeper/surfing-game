# Plan 124: Add Bathymetry (Ocean Floor Depth)

## Why This Is Next

Per GPT feedback, the dependency order for realistic wave physics is:

1. ✅ Lock 2D timing model (done - sets/lulls/spawn-per-wave)
2. **→ Bathymetry (this plan)**
3. Shoaling (height changes with depth)
4. Breaking logic
5. Peeling logic
6. 3D perspective rendering

**Do NOT skip to shoaling.** Shoaling depends on bathymetry. Breaking depends on shoaling. Peeling depends on breaking.

## Keep It Simple

**Important**: We are NOT curving the swell lines yet. Waves stay as straight horizontal lines.

What we ARE adding:
- A depth map (bathymetry)
- A "break point" x-position where the wave starts breaking
- A "foam width" that expands as the wave approaches shore
- Visual: foam triangle that grows from the break point

```
Horizon
─────────────────────────────  ← wave line (straight)
─────────────────────────────
────────────▓▓▓──────────────  ← wave starts breaking at shallow spot
───────────▓▓▓▓▓─────────────  ← foam width expands
──────────▓▓▓▓▓▓▓────────────  ← triangle of foam
─────────▓▓▓▓▓▓▓▓▓───────────
Shore
```

The wave line itself stays straight. Only the foam/whitewater section expands.

## Current State

Waves are 1D:
```js
wave = { y, amplitude }
```

No concept of:
- Ocean floor depth
- Breaking state
- Foam/whitewater width

## Implementation

### Phase 1: Add Simple Depth Map

One shallow spot (the "peak" where waves break):

```js
world.bathymetry = {
    deepDepth: 20,           // meters in deep water
    shallowDepth: 2,         // meters at the peak
    peakX: 0.4,              // peak location (40% from left, normalized 0-1)
    peakWidth: 0.15,         // how wide the shallow section is

    getDepth: function(normalizedX) {
        // Gaussian-ish bump of shallow water
        const dist = Math.abs(normalizedX - this.peakX) / this.peakWidth;
        if (dist > 1) return this.deepDepth;
        const t = 1 - dist;  // 1 at peak, 0 at edges
        return this.deepDepth - (this.deepDepth - this.shallowDepth) * t * t;
    }
};
```

### Phase 2: Add Breaking State to Waves

Extend wave model:
```js
wave = {
    y: number,              // vertical position (unchanged)
    amplitude: number,      // wave size (unchanged)
    breaking: boolean,      // has this wave started breaking?
    breakX: number | null,  // x-position where break started (normalized 0-1)
    foamWidth: number       // how wide the foam has spread (starts 0)
}
```

### Phase 3: Breaking Logic

Wave breaks when it reaches shallow water AND amplitude is high enough:

```js
function updateWaveBreaking(wave, shoreY) {
    if (wave.breaking) {
        // Foam expands as wave approaches shore
        const progress = wave.y / shoreY;  // 0 at horizon, 1 at shore
        wave.foamWidth = progress * 0.3;   // max 30% of screen width
        return;
    }

    // Check if wave should start breaking
    // Break happens when wave is past 60% to shore AND over shallow spot
    const progress = wave.y / shoreY;
    if (progress > 0.6 && wave.amplitude > 0.5) {
        wave.breaking = true;
        wave.breakX = world.bathymetry.peakX;  // breaks at the peak
        wave.foamWidth = 0.02;  // initial foam width
    }
}
```

### Phase 4: Render Foam Triangle

```js
function drawWave(wave, shoreY) {
    const y = wave.y;

    // Draw the swell line (unchanged - still straight)
    // ... existing gradient code ...

    // Draw foam if breaking
    if (wave.breaking && wave.breakX !== null) {
        const centerX = wave.breakX * canvas.width;
        const halfWidth = (wave.foamWidth * canvas.width) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(centerX - halfWidth, y);
        ctx.lineTo(centerX + halfWidth, y);
        ctx.lineTo(centerX, y + 20);  // small triangle pointing toward shore
        ctx.closePath();
        ctx.fill();
    }
}
```

### Phase 5: Debug Visualization

Show depth map as colored strip:
```js
// Draw depth indicator along shore
for (let x = 0; x < canvas.width; x++) {
    const normalizedX = x / canvas.width;
    const depth = world.bathymetry.getDepth(normalizedX);
    const brightness = Math.floor((depth / world.bathymetry.deepDepth) * 255);
    ctx.fillStyle = `rgb(0, ${brightness}, ${brightness})`;
    ctx.fillRect(x, shoreY, 1, 5);
}
```

## What We're NOT Doing (Yet)

- ❌ Curving the wave lines
- ❌ Per-x-position wave speed differences
- ❌ Complex foam particle systems
- ❌ Realistic shoaling height changes
- ❌ Multiple break points

Keep it simple: straight wave lines + expanding foam triangle.

## Testing

### Unit Tests
```js
describe('bathymetry', () => {
    it('returns shallow depth at peak', () => {
        const depth = world.bathymetry.getDepth(0.4);  // at peakX
        expect(depth).toBe(2);
    });

    it('returns deep depth away from peak', () => {
        const depth = world.bathymetry.getDepth(0.9);  // far from peak
        expect(depth).toBe(20);
    });
});

describe('wave breaking', () => {
    it('large wave breaks over shallow spot', () => {
        const wave = { y: 400, amplitude: 0.8, breaking: false };
        updateWaveBreaking(wave, 600);
        expect(wave.breaking).toBe(true);
    });

    it('small wave does not break', () => {
        const wave = { y: 400, amplitude: 0.3, breaking: false };
        updateWaveBreaking(wave, 600);
        expect(wave.breaking).toBe(false);
    });
});
```

### Visual Tests
- Foam triangle appears when wave is ~60% to shore
- Triangle expands as wave approaches
- Triangle is centered on the shallow spot
- Wave line itself stays straight

## Next Steps After This

Once this works:
1. **Shoaling** - wave gets darker/higher contrast over shallow spot
2. **Variable break point** - break starts at shallowest x, not fixed
3. **Curved waves** - wave line bends (slows over shallow)
4. **Proper peeling** - break spreads laterally along wave

But those are separate plans. This plan = straight lines + foam triangle only.

## Relationship to Plan 123 (Time-Based Model)

Plan 123 (time-based wave model) is orthogonal to this:
- Plan 123 = **how** position is calculated (time-based vs mutable)
- Plan 124 = **what** the wave looks like (add breaking/foam)

Can implement in either order. Recommendation: Do **124 first** because:
1. It's the next physics dependency
2. Smaller change, less risky
3. Produces visible results quickly
4. Plan 123 refactor is bigger and can be done after
