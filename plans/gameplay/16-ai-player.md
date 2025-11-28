# AI Player (Autonomous Surfing)

Purpose: Create an AI-controlled player that demonstrates realistic surfing behavior - paddling out, catching waves, riding them, and avoiding whitewater hazards.

## Overview

The AI player uses the existing player proxy system but replaces keyboard input with an autonomous decision-making system. It should look like a skilled surfer who knows how to read the ocean.

---

## Core Behaviors

### 1. Paddle Out (Get to Lineup)
- **Goal**: Reach a target Y position in the water where waves haven't broken yet
- **Strategy**:
  - Move toward the horizon (negative Y direction)
  - Avoid foam zones that would push back toward shore
  - Use side-to-side movement to navigate around breaking sections

### 2. Catch Waves
- **Goal**: Position to catch an incoming wave and ride it toward shore
- **Detection**: Monitor approaching waves by checking wave progress
- **Positioning**: Move to intercept the wave at the right spot (peak area)
- **Timing**: Start riding when the wave is about to break

### 3. Ride Waves
- **Goal**: Stay on the wave as long as possible
- **Strategy**: Move laterally (left/right) along the wave face
- **Avoid**: Getting too far ahead (wave passes) or too far behind (wave closes out)

### 4. Hazard Avoidance
- **Goal**: Avoid getting caught in breaking whitewater while paddling out
- **Memory**: Track where foam has recently appeared
- **Strategy**: Route around danger zones

---

## State Machine

```
                    ┌─────────────┐
                    │   PADDLE    │
      ┌─────────────│    OUT      │◄────────────┐
      │             └─────────────┘             │
      │                    │                    │
      │          reached lineup?                │
      │                    ▼                    │
      │             ┌─────────────┐             │
      │             │    WAIT     │             │
      │             │  IN LINEUP  │             │
      │             └─────────────┘             │
      │                    │                    │
      │          wave approaching?              │
      │                    ▼                    │
      │             ┌─────────────┐             │
      │             │  POSITION   │             │
      │             │  FOR WAVE   │             │
      │             └─────────────┘             │
      │                    │                    │
      │          wave catching?                 │
      │                    ▼                    │
      │             ┌─────────────┐             │
      │             │    RIDE     │─────────────┘
      │             │    WAVE     │  wave ends / wipeout
      │             └─────────────┘
      │                    │
      │          pushed too far in?
      │                    ▼
      │             ┌─────────────┐
      └─────────────│   RECOVER   │
   hit foam zone    │  (in foam)  │
                    └─────────────┘
```

---

## Hazard Memory System

The AI needs to remember where foam has been appearing to avoid paddling into breaking zones.

### Foam Danger Map
- **Grid-based**: Divide screen into cells (e.g., 20x15 grid)
- **Decay**: Each cell has a "danger" value that decays over time
- **Update**: When foam appears, increase danger value for that cell
- **Use**: When planning movement, weight paths by inverse danger

### Danger Calculation
```javascript
// When foam appears at position (x, y)
dangerGrid[cellX][cellY] += foamIntensity;

// Each frame
for (cell in dangerGrid) {
    dangerGrid[cell] *= 0.98;  // Decay 2% per frame
}

// When planning path
pathCost = distance + dangerGrid[targetCell] * DANGER_WEIGHT;
```

---

## Implementation Phases

### Phase 1: Basic Movement
- [ ] Create `aiPlayerModel.js` with state machine
- [ ] Implement PADDLE_OUT: Move toward horizon
- [ ] Implement WAIT: Hold position at target Y
- [ ] Hook into player update loop when AI toggle is on

### Phase 2: Wave Detection
- [ ] Sample wave progress to detect approaching waves
- [ ] Identify wave amplitude and type (set vs background)
- [ ] Calculate wave ETA to player position
- [ ] Transition to POSITION state when wave is X seconds away

### Phase 3: Wave Riding
- [ ] Track when player enters breaking zone of a wave
- [ ] Implement lateral movement during ride
- [ ] Detect ride end (foam fades, reaches shore)
- [ ] Transition back to PADDLE_OUT

### Phase 4: Hazard Avoidance
- [ ] Implement danger grid system
- [ ] Update grid from foamRows data each frame
- [ ] Modify pathfinding to avoid high-danger cells
- [ ] Test that AI navigates around breaking sections

### Phase 5: Polish
- [ ] Add some randomness to prevent robotic behavior
- [ ] Tune timing parameters for natural-looking surfing
- [ ] Add brief pauses/hesitations for realism
- [ ] Visual indicator showing AI decision state (debug)

---

## Key Functions

### `updateAIPlayer(player, world, dt, config)`
Main update function called each frame when AI is enabled.

**Inputs:**
- `player`: Current player state {x, y, vx, vy}
- `world`: Game world state (waves, foamRows, gameTime, etc.)
- `dt`: Delta time
- `config`: AI tuning parameters

**Outputs:**
- `input`: Synthetic input object {left, right, up, down}

### `selectTargetWave(waves, player, gameTime)`
Choose which wave to catch (if any).

**Criteria:**
- Wave is approaching (not past player yet)
- Wave amplitude is above minimum threshold
- Set waves preferred over background waves
- Wave will reach player within catchable window

### `calculatePath(player, target, dangerGrid)`
Simple pathfinding toward a target position.

**Algorithm:**
- Direct path if no obstacles
- Otherwise, find low-danger route (gradient descent on danger + distance)

### `updateDangerGrid(dangerGrid, foamRows, dt)`
Maintain the hazard memory map.

**Operations:**
- Decay all cells by decay factor
- Add danger from current foam positions
- Cap maximum danger value

---

## Configuration

```javascript
const AI_CONFIG = {
    // Lineup positioning
    targetLineupY: 0.3,           // Target Y as fraction of ocean height (0=horizon, 1=shore)
    lineupTolerance: 20,          // Pixels of acceptable variance in lineup position

    // Wave selection
    minWaveAmplitude: 0.3,        // Ignore waves smaller than this
    waveDetectionTime: 3000,      // Start positioning X ms before wave arrives
    preferSetWaves: true,         // Prefer set waves over background

    // Hazard avoidance
    dangerGridSize: [20, 15],     // Grid resolution
    dangerDecay: 0.98,            // Decay per frame
    dangerWeight: 50,             // How much to avoid danger zones
    foamDangerRadius: 2,          // Cells around foam to mark dangerous

    // Behavior tuning
    reactionDelay: 200,           // ms delay before acting (realism)
    movementJitter: 0.1,          // Random variation in movement (realism)
    restProbability: 0.01,        // Chance to pause briefly each frame
};
```

---

## Integration with Existing Systems

### Player Proxy Model
The AI generates synthetic keyboard input that feeds into the existing `updatePlayerProxy()` function. This means:
- Same physics apply to AI and human player
- Same foam interaction and push forces
- Same movement speeds and acceleration

### Debug Panel
- Toggle appears under Player toggle (only visible when Player is on)
- Hotkey: A
- When enabled, keyboard input is ignored and AI takes over

### Foam System
- AI reads from `world.foamRows` to detect hazards
- Same data used for player foam sampling
- No modifications to foam system needed

---

## Testing

### Unit Tests
- State machine transitions correctly
- Wave detection identifies approaching waves
- Danger grid updates and decays properly
- Path calculation avoids high-danger areas

### Visual Tests
- AI successfully paddles out to lineup
- AI catches waves and rides them
- AI avoids getting stuck in foam zones
- AI behavior looks natural, not robotic

### Edge Cases
- Many waves at once (pick best one)
- Continuous foam blocking path (wait or find gap)
- Already in foam when enabled (recover first)
- No waves for extended period (stay in lineup)

---

## Future Enhancements

After basic AI works:
- Multiple AI surfers (use for NPC system)
- Different "personalities" (aggressive wave catching vs patient)
- Skill levels (kook AI makes mistakes)
- Learning from player behavior
- Competition mode (AI tries to catch same waves as player)
