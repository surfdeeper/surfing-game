# Plan: Background Waves & Visual Scaling Improvements

## Summary of Feedback

The current wave system has three issues:

1. **Lulls treated as weak sets** - Currently lulls generate smaller waves, but real ocean lulls are the *absence* of set waves while background chop continues
2. **Missing background wave layer** - The ocean should never be flat; small choppy waves should always be present
3. **Amplitude doesn't visually scale well** - Large waves don't look significantly bigger than small ones (gradient thickness and contrast don't scale enough)

---

## Phase 1: Background Wave Layer

**Goal**: Add an always-present layer of small, frequent, choppy waves that creates ocean "texture"

### 1.1 Create Background Wave Model

**New file**: `src/state/backgroundWaveModel.js`

```javascript
// Background waves have different characteristics than set waves:
// - Smaller amplitude (0.05 - 0.15)
// - More frequent (every 2-5 seconds vs 10-20 for sets)
// - More random spacing (higher variation)
// - Shorter visual "thickness"

export const BACKGROUND_CONFIG = {
    minAmplitude: 0.05,
    maxAmplitude: 0.15,
    baseInterval: 3,        // seconds between waves
    intervalVariation: 2,   // ±seconds (so 1-5 second gaps)
    visualThickness: 0.5,   // multiplier on gradient band size
};
```

### 1.2 Separate Wave Arrays

In `main.js`, maintain two wave arrays:
- `backgroundWaves[]` - Always spawning, small amplitude
- `setWaves[]` - Only during SET state, larger amplitude

### 1.3 Render Layers

Background waves render first (behind), set waves render on top:
```javascript
// Render order:
1. Ocean base color
2. Background waves (subtle, always present)
3. Set waves (prominent, only during sets)
4. Shore
```

### 1.4 Visual Differentiation

Background waves should look different:
- Lower opacity (0.3-0.5)
- Narrower gradient bands
- Possibly slightly different color tint

---

## Phase 2: Redefine Lull State

**Goal**: Lulls become "no set waves" rather than "weak set waves"

### 2.1 Modify Set/Lull State Machine

In `src/state/setLullModel.js`:

**Current behavior**:
- LULL: Spawns 2-4 waves at 0.15-0.35 amplitude
- SET: Spawns 4-8 waves at 0.3-1.0 amplitude (bell curve)

**New behavior**:
- LULL: Spawns **zero** set waves (background waves continue independently)
- SET: Unchanged - spawns 4-8 waves at 0.3-1.0 amplitude

### 2.2 Update State Machine Returns

```javascript
// Current: { state, shouldSpawn, amplitude }
// New: { state, shouldSpawnSetWave, setWaveAmplitude }

// Background wave spawning is handled separately, not by this state machine
```

### 2.3 Update Tests

Modify `src/state/setLullModel.test.js` to reflect:
- LULL state returns `shouldSpawnSetWave: false` always
- Remove lull wave amplitude calculations
- Keep transition timing tests

---

## Phase 3: Visual Amplitude Scaling

**Goal**: Make wave amplitude clearly visible through gradient thickness and contrast

### 3.1 Scale Gradient Band Thickness

Currently `swellSpacing` is fixed at 80px. Make it amplitude-dependent:

```javascript
// Proposed scaling
const baseThickness = 40;  // minimum visible thickness
const maxThickness = 120;  // maximum at amplitude 1.0
const thickness = baseThickness + (maxThickness - baseThickness) * amplitude;
```

This means:
- Amplitude 0.3 → 64px thick bands
- Amplitude 0.5 → 80px thick bands
- Amplitude 1.0 → 120px thick bands

### 3.2 Increase Color Contrast Range

Current `getTroughColor()` interpolates between peak and trough colors based on amplitude, but the range may be too subtle.

**Options**:
1. Increase the color difference between peak (#1a4a6e) and trough (#4a90b8)
2. Add opacity scaling (higher amplitude = more opaque)
3. Use a non-linear curve (quadratic) so high amplitudes are more distinct

```javascript
// Proposed: quadratic scaling for more visible high-amplitude waves
const scaledAmplitude = amplitude * amplitude;  // 0.5 → 0.25, 1.0 → 1.0
```

### 3.3 Debug Panel Amplitude Visualization

Update the debug panel to show amplitude more clearly:
- Wider progress bars for higher amplitude waves
- Color-coded by amplitude (green→yellow→red)

---

## Phase 4: Integration & Polish

### 4.1 Timing Coordination

Ensure background waves don't visually "stack" with set waves awkwardly:
- Slightly reduce background wave frequency during SET state
- Or, allow natural overlap (may look good as "texture")

### 4.2 Performance Consideration

More waves on screen = more rendering. Profile to ensure:
- 60fps maintained with ~10-15 active waves (background + set)
- Consider wave culling for off-screen waves

### 4.3 Configuration Tuning

Add tuning controls to debug panel:
- Background wave frequency slider
- Background wave amplitude range slider
- Gradient thickness multiplier slider

---

## Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | **Remove lull waves** - stop spawning waves during LULL state | `src/state/setLullModel.js` |
| 2 | Update set/lull tests for new lull behavior | `src/state/setLullModel.test.js` |
| 3 | Create background wave model | `src/state/backgroundWaveModel.js` |
| 4 | Add background wave spawning to main loop | `src/main.js` |
| 5 | Render background waves (separate layer, behind set waves) | `src/main.js` |
| 6 | Add amplitude-based thickness scaling | `src/main.js` |
| 7 | Improve color contrast formula | `src/main.js` |
| 8 | Integration tests for new behavior | `src/integration/` |
| 9 | Debug panel enhancements | `src/main.js` |
| 10 | Performance profiling & tuning | - |

**Rationale for order change**: By removing lull waves first (step 1), the ocean will be completely empty during lulls. This makes it immediately obvious when background waves are working - they'll be the only thing visible during lulls. The stark contrast helps verify the feature is correct.

---

## Success Criteria

1. **Background waves always visible** - Ocean never appears flat, even during lulls
2. **Clear lull/set distinction** - Lulls feel like "waiting" periods, sets feel like "action"
3. **Amplitude clearly visible** - A 1.0 amplitude wave should look obviously bigger than a 0.3 wave
4. **Natural ocean feel** - The two-layer system creates realistic rhythm

---

## Open Questions

1. Should background waves slow down or stop when a large set wave passes? (visual clarity vs realism)
2. Should background waves be a different color/tint, or just smaller versions of the same?
3. Do we want background waves to be "catchable" by the surfer, or purely decorative?

---

## Reference: Current Architecture

```
src/
├── state/
│   ├── waveModel.js        # Wave objects & position calculation
│   ├── setLullModel.js     # Set/lull state machine (modify)
│   └── backgroundWaveModel.js  # NEW: Background wave spawning
├── render/
│   └── coordinates.js      # Screen position mapping
└── main.js                 # Game loop & rendering (modify)
```
