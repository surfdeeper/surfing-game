# Plan 132: Layered Foam Rendering System

## Status: Planned

## Problem

The current foam rendering uses discrete rectangles sampled at grid positions. Even with high resolution (80 X samples, 3px Y spacing), the result looks blocky:

1. **Staircase edges** - Breaking zone boundaries form rigid steps instead of smooth contours
2. **Visible grid structure** - Even with overlap, individual rectangles are apparent
3. **Opacity stacking** - Overlapping rectangles create visible seams
4. **No interpolation** - We know where breaking occurs but render boxes, not regions

The underlying sampling is fine - the problem is purely in rendering.

---

## Solution: Layered Architecture

Separate the foam system into distinct layers, each with its own purpose:

### Layer 1: Breaking Zone Geometry (Smooth Fill)

**Purpose:** Define the *shape* of where breaking occurs as smooth filled polygons.

**Approach:**
- Per Y row, scan samples to find contiguous breaking regions
- Store as spans: `{ y, segments: [{startX, endX}, ...] }`
- Render as filled horizontal bands from startX to endX
- Optionally smooth edges between rows using interpolation or canvas paths

**Result:** Solid filled shapes that follow bathymetry contours without visible grid.

### Layer 2: Foam Intensity Map (Gradient)

**Purpose:** Within the breaking zone, show *how much* breaking is occurring.

**Approach:**
- Compute intensity based on depth or distance from breaking threshold
- Shallower water = more intense foam
- Edges of breaking zone = softer/less foam
- Render as gradient within the Layer 1 polygon

**Result:** Visual variation within the foam zone - not uniform white.

### Layer 3: Foam Particles (Future - Presentation Only)

**Purpose:** Add texture and visual interest on top of the solid foam zones.

**Approach:**
- Spawn particles within the breaking zone
- Density driven by Layer 2 intensity map
- Purely cosmetic - the underlying shape is defined by Layer 1

**Result:** Organic, animated foam texture.

### Debug Layer: Sample Points (Current System)

**Purpose:** Visualize the underlying sample grid for debugging.

**Approach:**
- Keep current rectangle rendering as a toggle
- Useful for verifying bathymetry and breaking logic

---

## Data Model Changes

### Current: Individual Foam Points
```js
foam = {
    id, spawnTime, x, y, opacity, sourceWaveId
}
world.foamSegments = [foam, foam, ...] // thousands of points
```

### New: Foam Spans Per Row
```js
foamRow = {
    y: number,              // Y position (screen pixels)
    spawnTime: number,      // for opacity fade
    segments: [             // contiguous breaking regions
        { startX: 0.2, endX: 0.45 },
        { startX: 0.7, endX: 0.85 },  // can have multiple per row (e.g., two sandbars)
    ]
}
world.foamRows = [foamRow, ...]  // one per Y position, much fewer entries
```

This reduces data volume and naturally represents the breaking zone shape.

---

## Implementation Steps

### Step 1: Add Toggle Buttons
- Add "Foam Zones" button (Layer 1 - smooth polygons)
- Add "Foam Samples" button (debug view - current rectangles)
- Wire up to `showFoamZones` and `showFoamSamples` state

### Step 2: Collect Spans Instead of Points
- During foam deposition, instead of pushing individual foam points:
  - Scan across X samples to find contiguous breaking regions
  - Store as `{ y, segments: [{startX, endX}, ...] }`
- Or: Keep current point collection but convert to spans at render time

### Step 3: Render Spans as Filled Regions
- For each foam row, draw horizontal bands from startX to endX
- Use canvas `fillRect` or path-based fill

### Step 4: Smooth the Edges via Marching Squares

The key insight: blur the *data*, not the *pixels*.

**Approach:**
1. Build a low-resolution intensity grid (e.g., 80×60 cells)
2. Apply box blur to the grid values (simple number averaging, very fast)
3. Run marching squares algorithm to extract polygon contours at threshold
4. Render contours as bezier curves

**Why this is fast:**
- Grid blur: ~80×60×9 = 43,200 additions (sub-millisecond)
- Marching squares: O(grid cells) = 4,800 iterations
- Canvas draw: single `fill()` call per contour

**Why canvas blur was slow:**
- `ctx.filter = 'blur()'` processes every pixel
- At 800×600 = 480,000 pixels × multiple passes
- GPU-accelerated but still 100x more work

**Marching Squares lookup table:**
```
Cell corners: TL TR BL BR (each 0 or 1 based on threshold)
16 cases → line segment configurations
Output: list of {x,y} points forming contour
```

**Implementation:**
```js
// 1. Build intensity grid
const grid = new Float32Array(GRID_W * GRID_H);
for (const row of foamRows) {
    for (const seg of row.segments) {
        // Map world coords to grid coords and fill cells
    }
}

// 2. Box blur the grid (3x3 kernel)
const blurred = boxBlur(grid, GRID_W, GRID_H);

// 3. Marching squares at threshold (e.g., 0.3)
const contours = marchingSquares(blurred, GRID_W, GRID_H, 0.3);

// 4. Render as bezier paths
for (const contour of contours) {
    ctx.beginPath();
    drawSmoothContour(ctx, contour);
    ctx.fill();
}
```

### Step 5: Add Intensity Gradient (Layer 2)
- Within each span, compute intensity based on depth
- Render as gradient fill instead of solid white

---

## Toggle Button Layout

Current:
```
[Set Waves] [Background] [Depth Map]
```

After:
```
[Set Waves] [Background] [Depth Map] [Foam Zones] [Foam Samples]
```

- **Foam Zones**: Layer 1 smooth filled polygons (default ON)
- **Foam Samples**: Debug view showing individual sample rectangles (default OFF)

---

## Files to Modify

- `src/main.js` - Add toggle state, modify foam collection, add layer rendering
- `src/state/foamModel.js` - Add span-based data structures (optional, could stay in main.js)

---

## Success Criteria

1. Foam zones render as smooth filled shapes, not visible rectangles
2. Contours follow bathymetry naturally (cone for point break, lobe for sandbar)
3. Toggle allows switching between smooth view and debug sample view
4. No visible staircase or grid artifacts in smooth view
5. Performance remains acceptable (fewer draw calls with spans vs points)

---

## Future Extensions

- Layer 2: Intensity gradients within foam zones
- Layer 3: Particle effects driven by intensity map
- Animated foam edges (subtle wobble/movement)
- Per-wave foam coloring (set waves vs background)
