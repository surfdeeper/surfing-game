# Plan: Wave Timing & Debug Panel Fixes

## Issues Identified

### 1. Negative "Time to Shore" in Debug Panel
**Problem**: The debug panel shows negative seconds for waves near/past the shore.

**Root Cause** (`src/main.js:341-342`):
```js
const distanceToShore = shoreY - wave.y;
const timeToShore = (distanceToShore / world.swellSpeed).toFixed(1);
```
When `wave.y > shoreY`, the distance becomes negative. Waves aren't removed until `wave.y >= shoreY + swellSpacing` (line 234), so there's a window where waves exist past the shore line but are still tracked.

**Fix**: Clamp `timeToShore` to minimum 0, or don't display waves that have passed the shore in the debug panel.

### 2. Waves Use Screen Bottom Instead of Shore Line
**Problem**: Debug panel calculates time based on `shoreY` which is correct, but the conceptual issue is that `shoreY` is derived from screen dimensions (`canvas.height - world.shoreHeight`).

**Current State**: Actually, this is working correctly - `shoreY` IS the shore position. The issue is more about making this explicit in the data model.

**Future Consideration**: The shore line is currently a fixed visual boundary. When we add wave physics with crashing waves, the "water line" will need to oscillate. This should be a separate plan.

### 3. Waves Appear Suddenly Instead of Coming From Horizon
**Problem**: Waves spawn at `y: 0` (line 142), which IS the top edge. However, the debug panel immediately shows them as "on screen" even when they're barely visible.

**Root Cause**: The debug panel counts ALL waves in `world.waves`, including those just spawned at `y: 0` that haven't yet become clearly visible.

**Fix Options**:
- A) Keep tracking all waves, but label section as "Active Waves" instead of "Waves on screen"
- B) Only show waves in debug panel once they pass a visibility threshold (e.g., `y > 20`)
- C) Add a "visibility" concept where waves fade in from the horizon

Recommendation: Option A (rename) plus Option C (visual fade-in for polish)

### 4. Debug Panel Terminology
**Current**: "Waves on screen: X"
**Problem**: Technically waves start off-screen (at y=0 which is top edge) and the count includes barely-visible waves

**Fix**: Rename to "Active waves" or add context like showing which waves are "approaching" vs "visible" vs "at shore"

---

## Proposed Changes

### Phase 1: Quick Fixes (This Task)

1. **Fix negative time display** (`src/main.js:342`)
   - Clamp time to shore to minimum 0
   - Or: Skip displaying waves that have passed the shore line

2. **Improve debug panel terminology** (`src/main.js:336`)
   - Change "Waves on screen" to "Active waves"
   - Add wave state indicator (approaching/visible/at shore)

3. **Add wave visibility states** (enhance wave display)
   - Show wave position relative to screen: "approaching", "visible", "at shore"
   - Maybe show distance from horizon for context

### Phase 2: Visual Polish (Future)

4. **Fade-in waves from horizon**
   - Waves should visually fade in as they approach from the top
   - First ~50px could have alpha ramp from 0 to 1

---

## Future Plans to Create

### Plan: Dynamic Shoreline System
When implementing realistic wave physics:
- Shore line should oscillate as waves crash
- Define "base shore line" as the average/mean position
- Wave crests push water up the beach temporarily
- Between waves, water recedes
- This affects:
  - Wave removal logic (when does a wave "end"?)
  - Visual rendering of water/sand boundary
  - Eventually: gameplay (timing paddle-outs between waves)

### Plan: Wave Lifecycle Enhancement
Expand wave data model to track full lifecycle:
```js
{
  y: number,           // position (derived from time)
  amplitude: number,   // wave size
  spawnTime: number,   // when wave was created
  state: 'approaching' | 'visible' | 'breaking' | 'foam'
}
```
This enables:
- Time-based source of truth (position calculated from spawnTime)
- Visual state transitions (waves break, become foam)
- Better debug information

---

## Current Rendering System Architecture

### Overview
The current renderer is a simple **immediate-mode Canvas 2D** system in `src/main.js`. Every frame, it clears the canvas and redraws everything from scratch based on the `world` state object.

### Rendering Pipeline (`draw()` function, lines 237-346)

1. **Clear canvas** with ocean color (line 243-244)
2. **Draw shore** - tan-colored strip at bottom (lines 246-248)
3. **Draw waves** - each wave rendered as two gradient bands (lines 250-277):
   - Peak (dark) → Trough (light) gradient
   - Trough (light) → Next Peak (dark) gradient
   - Gradients are vertical only (`createLinearGradient(0, y1, 0, y2)`)
   - Full-width rectangles (`ctx.fillRect(0, y, w, height)`)
4. **Draw grid lines** - vertical reference lines every 100px (lines 279-292)
5. **Draw labels** - "Wave sets and lulls" title, "Shore" label (lines 294-298)
6. **Draw debug panel** - state info, wave list (lines 300-346)

### The Vertical Lines You're Seeing

Those are **intentional grid lines** for visual reference (lines 284-290):
```js
// Vertical grid lines
for (let x = 0; x < w; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, shoreY);
    ctx.stroke();
}
```
They're drawn at 30% opacity (`globalAlpha = 0.3`). These could be removed or made toggleable in debug mode.

### Current Data Model

**World State** (lines 21-60):
```js
world = {
  shoreHeight: 100,        // pixels
  swellSpacing: 80,        // visual spacing between wave crests
  swellSpeed: 50,          // pixels/second
  waves: [],               // Array of { y, amplitude }
  swellPeriod: 15,         // seconds between waves
  setState: 'LULL'|'SET',  // state machine
  // ... timing state
}
```

**Wave Object**:
```js
{ y: number, amplitude: number }
```
- `y` is the source of truth for position (mutated each frame)
- No time-based tracking (position is not derived from spawn time)

### Problems with Current Architecture for React/Three.js Migration

1. **Mutable state**: Position (`y`) is mutated directly, not derived from time
2. **No component boundaries**: Everything in one `draw()` function
3. **Immediate mode**: No retained scene graph or component tree
4. **Tightly coupled**: Rendering logic mixed with game state
5. **No testability**: Can't unit test rendering separate from state

---

## Future Plans to Create

### Plan: Dynamic Shoreline System
When implementing realistic wave physics:
- Shore line should oscillate as waves crash
- Define "base shore line" as the average/mean position
- Wave crests push water up the beach temporarily
- Between waves, water recedes
- This affects:
  - Wave removal logic (when does a wave "end"?)
  - Visual rendering of water/sand boundary
  - Eventually: gameplay (timing paddle-outs between waves)

### Plan: Wave Lifecycle Enhancement
Expand wave data model to track full lifecycle:
```js
{
  id: string,            // unique identifier
  spawnTime: number,     // when wave was created (source of truth)
  amplitude: number,     // wave size
  state: 'approaching' | 'visible' | 'breaking' | 'foam'
}

// Position derived from time:
function getWaveY(wave, currentTime) {
  return (currentTime - wave.spawnTime) * world.swellSpeed;
}
```
This enables:
- Time-based source of truth (position calculated from spawnTime)
- Visual state transitions (waves break, become foam)
- Better debug information
- Pure functions for testing

### Plan: React + Three.js Migration

**Target Architecture**:
```
┌─────────────────────────────────────────────────┐
│  Game State (Pure Data)                         │
│  - Immutable or managed by state library        │
│  - Time-based wave model                        │
│  - Testable without rendering                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  React Component Tree                           │
│  <Ocean>                                        │
│    <WaveSet>                                    │
│      <Wave amplitude={0.8} spawnTime={...} />  │
│      <Wave amplitude={0.6} spawnTime={...} />  │
│    </WaveSet>                                   │
│    <Shore />                                    │
│    <Surfer position={...} />                   │
│  </Ocean>                                       │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Three.js / React-Three-Fiber                   │
│  - WebGL rendering                              │
│  - Shader-based wave visuals                    │
│  - 3D camera perspectives                       │
└─────────────────────────────────────────────────┘
```

**Benefits**:
- Each wave/surfer is a React component
- State changes trigger re-renders automatically
- Three.js handles GPU-accelerated rendering
- Shaders can create realistic water effects
- Components are testable in isolation

**Migration Steps**:
1. Extract pure game logic into separate module (✅ Done - Plan 123)
2. Convert wave model to time-based (✅ Done - Plan 123)
3. Add React UI layer (✅ Done - Plan 127: Preact)
4. Optimize for performance (📋 Plan 128: Concurrent Mode)
5. Migrate to React 18 (📋 Plan 129: React 18 Migration)
6. Incrementally convert rendering to React Three Fiber (📋 Plan 131)
7. Add WebGL shaders for water effects (📋 Plan 131)

**Note**: React migration now split into focused plans:
- **Plan 127**: Preact UI Layer (UI components)
- **Plan 128**: React Performance Optimization (time-slicing, concurrent features)
- **Plan 129**: React 18 Concurrent Mode Migration (full React 18)
- **Plan 131**: React Three Fiber (Canvas 2D → WebGL)

### Plan: Debug Grid Toggle
- Make grid lines toggleable via debug panel
- Add checkbox or keyboard shortcut (G key?)
- Store preference in world state

---

## Implementation Steps

1. Fix the negative time issue (clamp to 0)
2. Rename "Waves on screen" to "Active waves"
3. Add wave state labels in debug list (approaching/visible/at shore)
4. Test the changes
5. Create the future plan files:
   - `plans/122-dynamic-shoreline.md`
   - `plans/123-wave-lifecycle-model.md` (✅ Done)
   - `plans/127-declarative-ui-layer.md` (✅ Done)
   - `plans/128-react-performance-optimization.md` (✅ Done)
   - `plans/129-react-18-concurrent-migration.md` (✅ Done)
   - `plans/131-react-three-fiber-migration.md` (📋 TODO)
