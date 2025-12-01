# @surf/game-3d

Three.js renderer for the surf simulation. This package renders the same physics simulation as `@surf/game`, but using Three.js instead of Canvas 2D.

## Current State

This is a **minimal prototype** that:
- Renders the energy field as a flat 2D texture in a Three.js scene
- Uses an orthographic camera for a top-down view (identical to the 2D game)
- Runs the same simulation physics from `@surf/core`

## Architecture

```
@surf/core                 @surf/game-3d
┌──────────────────┐      ┌──────────────────┐
│ Event Store      │◄─────│ getStore()       │
│ Energy Field     │      │ updateSimulation │
│ Wave Spawning    │      │                  │
│ Physics Models   │      │ Three.js Scene   │
└──────────────────┘      │ DataTexture      │
                          │ Orthographic Cam │
                          └──────────────────┘
```

**Key points:**
- **No duplicated physics**: All simulation logic comes from `@surf/core`
- **Same state model**: Uses the same event store and state shape as the 2D game
- **Different rendering**: Three.js scene with a plane mesh + data texture

## Running

From the repository root:

```bash
# Install dependencies (if not already done)
npm install

# Run the 3D game
npm run dev:3d
```

Or from this package directory:

```bash
npm run dev
```

The dev server runs on **port 5174** (different from the 2D game on 5173).

## How It Works

### Simulation Loop

1. **Update**: Step the simulation using `@surf/core` functions
   - `store.dispatch()` advances game time
   - `updateEnergyField()` propagates wave energy
   - `updateWaveSpawning()` spawns new waves
   - `updateWaves()` manages wave lifecycle

2. **Render**: Convert energy field to Three.js texture
   - Read `field.height[]` array (60x40 Float32Array)
   - Map height values to RGB colors
   - Upload to `DataTexture`

3. **Display**: Render Three.js scene
   - Orthographic camera (flat 2D view)
   - Plane mesh with energy texture
   - Shore strip at bottom

### Color Mapping

| Height Value | Color |
|-------------|-------|
| Positive (wave crest) | White to light blue |
| Zero (calm water) | Ocean blue (#1a4a6e) |
| Negative (wave trough) | Dark blue |

## Future Directions

This package is a foundation for:
- **3D terrain**: Replace flat plane with height-mapped mesh
- **Perspective camera**: View the ocean at an angle
- **3D wave geometry**: Render waves as 3D shapes
- **Shaders**: Custom water shaders for realistic rendering

## Files

```
packages/game-3d/
├── index.html      # Entry point
├── package.json    # Dependencies (three, @surf/core)
├── README.md       # This file
└── src/
    └── main.ts     # Three.js setup + game loop
```

## Relationship to Other Packages

| Package | Purpose |
|---------|---------|
| `@surf/core` | Physics simulation (shared) |
| `@surf/game` | 2D Canvas renderer |
| `@surf/game-3d` | Three.js renderer (this package) |

All renderers use the same physics from `@surf/core`. The simulation state (waves, energy field, etc.) is identical regardless of which renderer is used.
