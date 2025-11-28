# Plan 120: Multiplayer

## Overview

Multiplayer comes in three phases, each building on the previous. Phase 1 is a prerequisite for everything else.

---

## Phase 1: Single Player (Foundational)

**Prerequisite for all multiplayer work.**

Before we can have multiple players, we need ONE player working properly.

### Requirements

1. **Player entity on screen**
   - Rendered surfer (even simple geometry)
   - Positioned correctly on wave surface
   - Responds to input

2. **Player state**
   - Position (x, z, derived y from wave)
   - Velocity
   - Orientation (derived from wave surface + movement)
   - Animation state (cruising, turning, etc.)

3. **Input handling**
   - Clean separation between input and player state
   - Input produces "intent", physics produces movement
   - This separation is critical for later phases

### Why This First

- Can't have two players until we have one
- Forces us to architect player state cleanly
- Establishes the "player entity" pattern we'll replicate

---

## Phase 2: Synchronized Viewing ("Cheap Multiplayer")

**Two people see the same waves at the same time, no server required.**

### Concept

Use deterministic wave generation seeded by wall-clock time. Anyone viewing the simulation at the same moment sees identical waves.

### How It Works

1. **Deterministic wave generation**
   - Seed random number generator with time bucket (e.g., hour or day)
   - Wave parameters (period, height, sets, lulls) derived from seed
   - Given same time = same seed = same waves

2. **Time synchronization**
   - Use wall-clock time (Date.now() or similar)
   - Round to common reference point
   - All clients use same time reference

3. **Wave state calculation**
   - `waveState = generateWaves(floor(time / BUCKET_SIZE))`
   - Phase within bucket: `localTime = time % BUCKET_SIZE`
   - Position waves based on localTime

### Example

```javascript
function getWaveSeed(timestamp) {
    // New seed every hour
    return Math.floor(timestamp / (1000 * 60 * 60));
}

function initWaves(timestamp) {
    const seed = getWaveSeed(timestamp);
    const rng = seededRandom(seed);

    return {
        swellPeriod: lerp(10, 18, rng()),
        swellHeight: lerp(2, 8, rng()),
        setInterval: lerp(300, 600, rng()),
        // ... etc
    };
}
```

### What This Enables

- **Shared experience**: "Check out this wave!" actually means something
- **Spectator mode**: Watch the same lineup as a friend
- **Recordings**: Timestamp = reproducible session
- **Competition**: Same conditions for everyone

### What This Doesn't Enable

- Seeing other players
- Interacting with other players
- Real-time communication

### Implementation Complexity: Low

- No server required
- No networking code
- Just math determinism

---

## Phase 3: True Multiplayer

**Two or more players in the same session, seeing each other.**

### Architecture Options

#### Option A: Peer-to-Peer (WebRTC)

- Direct connection between browsers
- Lower latency
- No server costs
- Complex NAT traversal
- Harder to scale beyond 2-4 players

#### Option B: Server-Authoritative

- Central server manages game state
- Easier to scale
- Anti-cheat possible
- Requires hosted server
- Higher latency

#### Option C: Relay Server (Hybrid)

- Server just relays messages, doesn't run physics
- Simpler server logic
- Clients still authoritative over own player
- Good middle ground

### State Synchronization

Each player needs to broadcast:
```javascript
playerState = {
    id: string,
    position: { x, z },
    velocity: { x, z },
    orientation: float,
    animationState: string,
    timestamp: number
}
```

### Interpolation & Prediction

Remote players need smoothing:
- **Interpolation**: Render slightly in the past, smooth between known states
- **Extrapolation**: Predict forward when packets delayed
- **Snap correction**: Handle large desync gracefully

```javascript
function renderRemotePlayer(player, localTime) {
    const renderTime = localTime - INTERPOLATION_DELAY;
    const state = interpolateStates(
        player.stateHistory,
        renderTime
    );
    render(player, state);
}
```

### Wave Synchronization

Waves MUST be identical for all players. Two approaches:

1. **Deterministic (from Phase 2)**: All clients generate same waves from same seed
2. **Server-sent**: Server broadcasts wave parameters at session start

Option 1 is preferred - builds on Phase 2, no additional bandwidth.

### Collision / Interaction

**Start simple:**
- No collision between surfers (they pass through each other)
- Just visual presence

**Later:**
- "Priority" rules (who has right of way)
- Interference detection
- Snaking penalties

### Session Management

- How do players find each other?
- Room codes? Matchmaking? Friends list?
- Session lifecycle (join, leave, timeout)

### Implementation Complexity: High

- Networking code
- State synchronization
- Latency handling
- Session management
- Possibly server infrastructure

---

## Build Sequence

1. **Phase 1** - Get single player working perfectly
   - Clean player state architecture
   - Input → intent → physics → render pipeline
   - This is the foundation

2. **Phase 2** - Add deterministic wave generation
   - Refactor wave system to be seedable
   - Time-bucket seeding
   - Verify determinism (same seed = same waves)

3. **Phase 3** - Add networking
   - Start with 2-player peer-to-peer
   - Broadcast player state
   - Interpolate remote players
   - Handle disconnection gracefully

---

## What We're NOT Planning

- Voice chat (use Discord)
- Text chat (maybe later)
- Competitive matchmaking
- Leaderboards
- Spectator camera controls
- Replays (though Phase 2 enables this cheaply)

Keep scope minimal. Two surfers in the water together is the goal.

---

## Success Criteria

### Phase 1
- One surfer on screen, controllable, looks right

### Phase 2
- Open two browser tabs, see identical waves
- Share timestamp with friend, they see same waves

### Phase 3
- Two players in same session
- Each sees the other's surfer
- Movement is smooth (no obvious jank)
- Waves are identical for both players
