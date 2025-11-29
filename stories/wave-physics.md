# Wave Physics Principles

This document captures the core principles guiding the wave simulation.

## Core Philosophy

**Simulate the physics, don't fake it with shortcuts.**

Timing and behavior should be derived from real oceanographic principles. When we need randomness, keep it simple and limited (±5 seconds, not chaos). The source of truth for timing is always in seconds, not pixels - this ensures behavior remains consistent regardless of rendering or speed changes.

## Fundamental Model

Waves are **discrete objects** that travel independently, not a global amplitude that affects all water at once.

Each wave is a conserved piece of energy spawned at the horizon and traveling toward shore. Once spawned, a wave's amplitude is fixed - it doesn't change based on current set/lull state.

## Timing (Time-Based, Not Pixel-Based)

All timing is specified in seconds:

- **Swell period**: 15 seconds base (time between waves)
- **Period variation**: ±5 seconds
- **Lull duration**: 30 seconds base (time between sets)
- **Lull variation**: ±5 seconds

This means a wave arrives roughly every 10-20 seconds, and sets occur roughly every 25-35 seconds.

## Sets and Lulls

**Sets** are groups of larger, more organized waves. They have:
- More waves (4-8 typically)
- Higher amplitude
- A build-peak-fade envelope (biggest wave ~40% through the set)

**Lulls** are periods of smaller waves. They are NOT "no waves":
- Fewer waves per mini-group (2-4)
- Lower amplitude (subtle, but visible)
- Same timing/period as sets, just smaller

This matches real ocean behavior where there's always *some* wave energy, just varying in intensity.

## Wave Lifecycle

```
spawn (at horizon) → travel (toward shore) → vanish (past shoreline)
```

At spawn time:
- Amplitude is determined by current state (set progression or lull)
- Next wave time is calculated (period ± variation)

During travel:
- Amplitude remains constant
- Wave moves at fixed speed toward shore

## Visual Representation

Waves are rendered as gradient bands:
- Peak (crest): darker blue
- Trough (valley): lighter blue
- Amplitude controls the contrast between peak and trough
- Low amplitude = subtle gradient (trough color closer to peak)
- High amplitude = strong contrast

## Future Considerations (not yet implemented)

- Gaussian amplitude envelope for more natural set shape
- Multi-swell systems (primary + secondary + chop)
- Wave direction and curvature
- Surfer interaction with individual waves
- Lateral wobble / phase noise (only if needed)
