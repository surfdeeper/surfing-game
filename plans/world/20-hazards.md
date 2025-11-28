# Hazards

Purpose: rare, opt-in tension without dominating gameplay.

## Goals
- Rarity: sharks or large hazards appear infrequently.
- Telegraphing: clear visual/audio cues, safe avoidance paths.
- Fair impact: temporary disruption, not hard failure unless explicitly enabled.

## Mechanics
- Spawn conditions: weather/tide thresholds, distance offshore.
- Interaction: path blocking, speed penalties, brief chase sequences (optional).
- Safety systems: debug toggles, accessibility settings to disable.

## Integration
- Reads `bathymetryModel` and `setLullModel` for context.
- Event bus hooks to notify gameplay layer.
- Non-blocking render overlays.

## Testing
- E2E scenarios for telegraph + avoidance.
- Unit tests for spawn & despawn stability.
