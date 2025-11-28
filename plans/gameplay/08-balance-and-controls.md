# Balance & Controls

Purpose: map inputs to paddle/lean/duck/jump and maintain orientation.

## Controls
- Paddle: accelerate and align for catches.
- Lean/turn: carve radius vs. speed trade-offs.
- Duck/duck-dive: pass under oncoming waves when paddling out.
- Jump (optional): minor aerial pop with risk/reward.

## Balance
- Orientation meter: drift and corrective inputs.
- Whitewater effects: instability and recovery windows.
- Board stats: stability vs. maneuverability curves.

## Integration
- Uses `input/keyboard.js` and future controller mapping.
- Updates player state consumed by render and physics layers.
- Exposes debug toggles for assistance and visualization.

## Testing
- Unit tests for input-to-state mapping.
- Integration tests for balance thresholds and recovery.
