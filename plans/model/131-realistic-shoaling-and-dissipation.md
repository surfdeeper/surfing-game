# Realistic Shoaling and Dissipation

Purpose: make individual waves behave more realistically as they approach shore—compressing, steepening, breaking, and dissipating.

## Goals
- **Shoaling profile**: front compresses and steepens, back stretches slightly as waves enter shallow water.
- **Gradient accuracy**: wave height increases with amplitude; gradient reflects changing profile, not just uniform thickness.
- **Finite energy**: waves dissipate over time/distance, break at threshold steepness, and eventually close out.
- **Foam dynamics**: breaking generates foam that moves shoreward, loses energy, and fades naturally before reaching shore.

## Scope
- Apply to **coarse wave objects** (rideable waves with amplitude, position, velocity).
- Background waves can remain simpler for performance.

## Mechanics

### Shoaling Transform
- As depth decreases (`bathymetryModel`):
  - Front edge: compress wavelength, increase steepness.
  - Back edge: slight stretch to conserve mass/energy.
- Profile shape: asymmetric sine or custom curve (front steeper than back).
  - Retain smooth crest-to-trough gradient for visual clarity—avoid overly sharp spikes.

### Energy Dissipation
- Energy budget per wave: decreases with:
  - Distance traveled (friction, viscous loss).
  - Breaking events (energy → foam).
- Dissipation thresholds:
  - Steepness > critical → breaking begins.
  - Energy < minimum → wave closes out and vanishes.

### Breaking & Foam
- Breaking triggers:
  - Steepness threshold.
  - Depth ratio (wave height vs. water depth).
- Foam particles (purely visual for now):
  - Spawn at break point with initial momentum.
  - Drift shoreward with velocity decay.
  - Fade opacity/size over time.
  - Despawn before shoreline to avoid visual clutter.
  - Do not affect wave energy or player physics yet (future extension).

## Integration
- Reads: `bathymetryModel` for depth, `waveModel` for wave state.
- Writes: updated wave amplitude, wavelength, energy, foam particle arrays.
- Hooks: render layer for gradient and foam overlays.

## Parameters
- `shoalingRate`: compression factor as function of depth.
- `dissipationRate`: energy loss per tick.
- `breakThreshold`: steepness ratio triggering break.
- `foamLifetime`: decay time for foam particles.

## Testing
- Unit tests: shoaling math, energy budgets, foam spawn/despawn.
- Visual tests: verify asymmetric profiles and smooth foam fades.
- Integration: confirm coupling with existing `waveModel` and `bathymetryModel`.

## Future Extensions
- Wave reflection off steep bathymetry.
- Wave-wave interaction affecting shoaling rates (optional; keep waves independent for now).
- Turbulence models for whitewater chaos.
- Foam affecting player physics or wave energy budgets.
