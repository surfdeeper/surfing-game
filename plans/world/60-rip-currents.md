# Rip Currents

Purpose: localized seaward flows that add strategic depth and realistic hazard awareness.

## Goals
- Realism: simulate channels where water flows back out to sea after waves break.
- Strategy: rips can help paddle out quickly or pull unwary players offshore.
- Education: subtle UI cues teach players to recognize and escape rips.

## Mechanics
- Formation: spawn in gaps between sandbars or near jetties/points.
- Flow model: vector field pulling seaward within a narrow corridor.
- Strength: varies with wave size and tide; stronger during larger sets.
- Escape: lateral paddling exits the current; fighting it drains stamina.

## Visual Indicators
- Darker water color in rip channel (less foam, deeper appearance).
- Surface texture: smoother, faster-moving ripples heading offshore.
- Optional: floating debris or foam streaks marking the flow.

## Integration
- Reads `bathymetryModel` for sandbar gaps and channel locations.
- Interacts with `dynamicOceanModel` current vectors.
- Hooks into player physics for drift and stamina effects.
- Debug panel toggle to visualize rip zones and flow vectors.

## Gameplay Considerations
- Risk/reward: experienced players use rips to paddle out faster.
- Hazard mode: optional setting where rips pose real danger (stamina drain, rescue timer).
- Accessibility: toggle to disable or reduce rip strength.

## Testing
- Unit tests for rip spawn logic based on bathymetry.
- Integration tests for player drift within rip zones.
- Visual tests for rip indicators and flow direction.
