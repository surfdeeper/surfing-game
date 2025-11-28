# Animals

Purpose: add ambient life and subtle, optional interactions for immersion.

## Goals
- Visual interest: sea lions, birds, fish schooling.
- Optional interactions: gentle bumps, brief blocking, minor wakes.
- Lightweight AI: simple pathing, flocking, or reactive behavior to waves/player.

## Mechanics
- Presence zones: spawn rates tied to bathymetry and time-of-day.
- Wave-reactive movement: animals avoid breaking zones; flocking near calm water.
- Player interaction envelope: minor speed perturbations, no hard failure states.

## Integration
- Reads `waveModel` state: breaking vs. smooth water, swell direction.
- Hooks into render loop: sprite layers above water, below foam.
- Toggle via debug panel for testing.

## Testing
- Visual smoke tests to confirm spawn/despawn and pathing.
- Unit tests for spawn logic and bounds.
