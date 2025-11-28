# Tsunami

Purpose: dramatic rare event featuring a massive wave for high-stakes gameplay moments.

## Goals
- Spectacle: visually impressive wall of water that dwarfs normal swells.
- Challenge: optional high-risk, high-reward gameplay mode.
- Rarity: extremely infrequent or explicitly triggered (bonus round, unlockable mode).

## Mechanics
- Warning phase: distant rumble audio, water receding, birds fleeing, visual cues.
- Approach: massive wave visible on horizon, grows as it approaches.
- Interaction options:
  - Outrun: paddle desperately toward shore or deep water.
  - Ride: expert players attempt to catch and survive the monster wave.
  - Escape: find high ground or safe zones.
- Aftermath: altered bathymetry, debris in water, calm before next set.

## Modes
- Story/Campaign: scripted tsunami event as climax.
- Survival: random tsunami triggers after extended sessions.
- Challenge: dedicated tsunami-riding mode with leaderboards.
- Sandbox: debug toggle to trigger on demand.

## Integration
- Extends `waveModel` with extreme amplitude and speed parameters.
- Reads `bathymetryModel` for realistic shoaling behavior.
- Event bus notification for UI overlays and audio triggers.
- Camera system: zoom out to show scale, dramatic angles.

## Visual Design
- Towering wave height (10x+ normal).
- Foam and spray at crest.
- Darkened water color, ominous lighting shift.
- Particle effects for mist and debris.

## Testing
- Visual tests for wave scaling and rendering at extreme sizes.
- E2E scenarios for warning sequence and player escape.
- Performance tests to ensure frame rate stability during event.
