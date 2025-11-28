# Dynamic Ocean

Purpose: currents, wind, and tide effects that subtly shape play.

## Goals
- Strategy: encourage reading conditions and positioning choices.
- Subtlety: avoid overbearing forces; keep surfing fun.
- Variety: session-to-session changes via seeds or time.

## Mechanics
- Currents: vector fields influence paddling and drift.
- Wind: affects surface texture and minor speed adjustments.
- Tides: modulate `waveModel` parameters and breaking behavior.

## Integration
- Parameter bridges to `backgroundWaveModel` and `waveModel`.
- Debug panel sliders for strength and direction.
- Save/load seeds via session state.

## Testing
- Unit tests for deterministic seeds.
- Visual tests for condition overlays.
