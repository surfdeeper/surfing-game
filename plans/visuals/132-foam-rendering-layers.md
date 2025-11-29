# Plan 132: Grid-Based Foam Rendering System

Status: Planned (revised)

## Principles
- Single source of truth per layer; every layer is a grid (typed arrays), not ad-hoc rows/spans.
- Energy is conserved/redirected: swell injection → propagation → dissipation; foam derives from dissipation only.
- Read-only down the stack: rendering only samples grids; no rendering writes back to sim.
- Shared space/time: all grids use the same dimensions and advance on the same tick.

## Layered Grids
1. Energy Field (source)
   - Grid: `energy[y][x]` height/energy.
   - Update: wave equation + depth-based speed + damping; horizon injection for set/background swells. Runs even when not rendered.
   - Output: local energy for breaking/visual thickness.

1. Energy Transfer Grid (energy leaving waves)
   - Grid: `energyTransfer[y][x]` per-frame accumulator (cleared/decayed each tick).
   - Update: when breaking triggers, drain from energy field into this grid; optional box-blur for spread.
   - Purpose: visualizes “areas where energy is being transferred/released”.

1. Foam Grid (visual medium)
   - Grid: `foam[y][x]` scalar density (0–1).
   - Update:
     - Deposit: `foam += kDep * energyTransfer`, capped.
     - Advect (stub now): small constant shoreward drift; later use velocity field.
     - Decay: temporal fade per cell.
   - Purpose: renderable field; future drift/interaction-ready.

1. Optional Velocity Field (future)
   - Grid: `velX[y][x], velY[y][x]` for advection of foam/energy bleed.

## Data Flow Per Frame
1) Inject swells → update energy field.  
1) Detect breaking (H vs depth/energy) → drain into `energyTransfer`.  
1) Deposit/advect/decay into `foam`.  
1) Render: energy gradient/contours from `energy`; foam alpha/contours from `foam`.

## Implementation Steps
1. Define shared grid dimensions/mapping once; apply to all layers (energy, transfer, foam).
1. Add `energyTransferGrid` alongside `energyField`; breaking writes drained amount here each tick; clear or decay it every frame.
1. Add `foamGrid`; per tick: deposit from `energyTransfer`, advect with simple shoreward velocity (stub), decay with configurable rate.
1. Rendering: sample `foamGrid` directly—either per-cell alpha or iso-contours (marching squares) without row spans; keep a debug toggle for the raw grid.
1. (Future) Add velocity field to replace constant advection with flow-driven drift.

## Success Criteria
- Foam intensity/shape matches dissipation footprint without staircase artifacts.
- Background chop deposits little foam; set waves create higher dissipation and denser foam.
- Grids stay spatially/temporally aligned; no ad-hoc row constructs.
- Rendering reads from grids only; no feedback from canvas to sim.

## Files to Modify (when implementing)
- `src/state/energyFieldModel.js`: expose drain hooks and shared grid mapping.
- `src/state/foamModel.js` (or new): manage `energyTransferGrid` and `foamGrid` updates.
- `src/main.jsx` (render): sample `foamGrid` for visualization; add debug toggles.
