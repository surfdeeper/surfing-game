# Player–Wave Interaction

Purpose: define how player momentum, orientation, and position couple with wave state.

## Scenarios
- Paddling: counter-propagation vs. drift, current assistance.
- Catching: speed matching threshold, takeoff angle constraints.
- Riding: slope-derived acceleration, whitewater destabilization, carve mechanics.

## Parameters
- Player: momentum, buoyancy, board stats (stability, maneuverability).
- Wave: local slope, amplitude, break state, foam density.
- Environment: current vector, wind bias.

## Interfaces
- Reads from `waveModel` and `bathymetryModel`.
- Writes to `state` for player velocity and orientation.
- Emits events for gameplay progression triggers.

## Testing
- Unit tests around threshold behaviors (catch/miss, wipeout).
- Integration tests in `gameLoop.test.js` for coupling stability.
