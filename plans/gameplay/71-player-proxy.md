# Plan 71: Player Proxy (Pre-Surfer Movement Test)

## Purpose

Before implementing the full surfer physics (Plan 70), we need a **minimal player proxy** to:
1. Test the feel of movement on shore vs water
1. Validate whitewater interaction mechanics
1. Prove the "fight the current" gameplay loop works
1. Establish input handling patterns

This is a **stepping stone** - a simple dot that lets us iterate on the core "struggle against the ocean" feel before adding surfboard physics.

---

## The Concept

A small circle/dot that:
- **Moves freely** with arrow keys
- **Different speeds** on shore vs water
- **Gets pushed shoreward** by whitewater (breaking wave foam)
- **Must paddle out** (hold up arrow) to resist/escape the push

This creates immediate gameplay: paddle out through the whitewater zone to reach the lineup.

---

## Player Proxy State

```javascript
playerProxy = {
    x: float,           // Screen X position (pixels)
    y: float,           // Screen Y position (pixels)
    vx: float,          // Velocity X
    vy: float,          // Velocity Y
    radius: 8,          // Visual size (pixels)
}
```

Position is stored directly in screen coordinates for simplicity. No wave-relative positioning yet - that's Plan 70.

---

## Movement Zones

### Zone Detection
```javascript
function getZone(y) {
    if (y > shoreY) return 'SHORE';
    return 'WATER';
}
```

### Movement Speeds
| Zone | Base Speed | Notes |
|------|------------|-------|
| Shore | 150 px/s | Walking on sand, fast |
| Water (calm) | 80 px/s | Paddling, slower |
| Water (in foam) | 40 px/s | Fighting turbulence |

### Movement Model
```javascript
const input = getKeyboardState();  // {left, right, up, down}

// Determine target velocity from input
let targetVx = 0, targetVy = 0;
if (input.left) targetVx -= 1;
if (input.right) targetVx += 1;
if (input.up) targetVy -= 1;    // Up = toward horizon (negative Y)
if (input.down) targetVy += 1;  // Down = toward shore (positive Y)

// Normalize diagonal movement
const mag = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
if (mag > 0) {
    targetVx /= mag;
    targetVy /= mag;
}

// Apply zone-based speed
const speed = getSpeedForZone(playerProxy.y);
targetVx *= speed;
targetVy *= speed;

// Smooth acceleration (not instant)
const accel = 500;  // px/s^2
playerProxy.vx += (targetVx - playerProxy.vx) * Math.min(1, accel * dt);
playerProxy.vy += (targetVy - playerProxy.vy) * Math.min(1, accel * dt);

// Update position
playerProxy.x += playerProxy.vx * dt;
playerProxy.y += playerProxy.vy * dt;
```

---

## Whitewater Interaction

### The Core Mechanic

When the player is in a **foam zone** (where waves have broken), they experience a **shoreward push**:

```javascript
function getWhitewaterPush(x, y, foamRows) {
    // Sample foam intensity at player position
    const intensity = sampleFoamIntensity(x, y, foamRows);

    if (intensity > 0) {
        // Push toward shore (positive Y direction)
        const pushStrength = intensity * FOAM_PUSH_FORCE;  // e.g., 100-200 px/s
        return { x: 0, y: pushStrength };
    }
    return { x: 0, y: 0 };
}
```

### Sampling Foam Intensity

The foam system already stores rows with span data. We can query it:

```javascript
function sampleFoamIntensity(x, y, foamRows) {
    // Find foam row closest to player Y
    const row = foamRows.find(r => Math.abs(r.y - y) < SAMPLE_THRESHOLD);
    if (!row) return 0;

    // Check if player X is within any foam segment
    for (const seg of row.segments) {
        if (x >= seg.startX && x <= seg.endX) {
            return seg.intensity;  // 0-1 value
        }
    }
    return 0;
}
```

### The Fight

- **Whitewater push**: Constant force toward shore
- **Up arrow**: Player paddles against it
- **No input**: Player drifts shoreward
- **Paddle speed < push**: Slowly dragged in despite effort
- **Paddle speed > push**: Can make progress outward

This creates the **struggle loop**:
1. Wait for lull (less foam)
1. Paddle hard toward horizon
1. Get caught by set wave foam
1. Hold position or get pushed back
1. Repeat until you reach the lineup

---

## Physics Update

```javascript
function updatePlayerProxy(dt, input, foamRows) {
    // 1. Get zone and base movement
    const zone = getZone(playerProxy.y);
    const baseSpeed = ZONE_SPEEDS[zone];

    // 2. Calculate input velocity
    const inputVel = getInputVelocity(input, baseSpeed);

    // 3. Get whitewater push
    const push = getWhitewaterPush(playerProxy.x, playerProxy.y, foamRows);

    // 4. If in foam, reduce movement speed
    const foamIntensity = sampleFoamIntensity(playerProxy.x, playerProxy.y, foamRows);
    const speedMultiplier = 1 - (foamIntensity * 0.5);  // Up to 50% slower in heavy foam

    // 5. Combine forces
    const targetVx = inputVel.x * speedMultiplier;
    const targetVy = inputVel.y * speedMultiplier + push.y;

    // 6. Apply acceleration smoothing
    smoothAccelerate(playerProxy, targetVx, targetVy, dt);

    // 7. Update position
    playerProxy.x += playerProxy.vx * dt;
    playerProxy.y += playerProxy.vy * dt;

    // 8. Clamp to screen bounds
    playerProxy.x = clamp(playerProxy.x, 0, canvasWidth);
    playerProxy.y = clamp(playerProxy.y, 0, canvasHeight);
}
```

---

## Rendering

### Simple Circle
```javascript
function drawPlayerProxy(ctx, player) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B6B';  // Coral red, visible against water/foam
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
}
```

### Visual Feedback
- **Normal**: Solid circle
- **In foam**: Add ripple effect or pulsing
- **Paddling hard**: Trail/wake behind
- **Being pushed**: Slight stretch in push direction

---

## Toggle Control

Add to existing hotkey system in main.jsx:
- **P key** - Toggle player proxy on/off

```javascript
// In keyboard handler
case 'p':
case 'P':
    showPlayer = !showPlayer;
    break;
```

Player starts **off** by default - opt-in when you want to test movement.

---

## Debug Panel Additions

Add to DebugPanel.jsx (only shown when player is enabled):
```
Player Position: (x, y)
Zone: SHORE | WATER
In Foam: Yes/No (intensity: 0.XX)
Velocity: (vx, vy)
Push Force: (px, py)
```

---

## Constants (Tuning)

```javascript
const PLAYER_PROXY_CONFIG = {
    radius: 8,

    // Movement speeds (px/s)
    shoreSpeed: 150,
    waterSpeed: 80,
    foamSpeed: 40,

    // Acceleration
    acceleration: 500,      // px/s^2
    deceleration: 300,      // px/s^2 (when releasing keys)

    // Whitewater
    maxPushForce: 120,      // px/s at intensity 1.0
    foamSpeedPenalty: 0.5,  // 50% speed reduction at max foam

    // Spawn
    spawnX: canvasWidth / 2,
    spawnY: shoreY + 30,    // Start on shore
};
```

---

## Implementation Steps

### Step 1: Basic Movement
- [ ] Create `src/state/playerProxyModel.js`
- [ ] Add `P` hotkey toggle (off by default)
- [ ] Add keyboard input integration (arrow keys)
- [ ] Implement shore/water zone detection
- [ ] Basic position update with zone speeds
- [ ] Render simple circle

### Step 2: Whitewater Interaction
- [ ] Add foam intensity sampling function
- [ ] Implement shoreward push force
- [ ] Add speed penalty in foam
- [ ] Test with actual foam data

### Step 3: Polish & Debug
- [ ] Add debug panel section
- [ ] Visual feedback for foam interaction
- [ ] Tune constants for good feel
- [ ] Screen boundary clamping

### Step 4: Integration
- [ ] Hook into main game loop
- [ ] Ensure it works with time scaling
- [ ] Test during set waves and lulls

---

## Success Criteria

1. **Movement feels responsive** - Arrow keys give immediate feedback
1. **Zone transition is obvious** - Clearly slower in water than on shore
1. **Foam creates tension** - Getting caught in whitewater is stressful
1. **Escape is possible** - Can paddle out during lulls
1. **The struggle is fun** - Core loop of "time your paddle out" works

---

## What This Validates for Plan 70

- Input handling patterns
- Foam query interface
- Zone-based physics
- The "fight the whitewater" mechanic
- Tuning for movement feel

Once this feels good, we layer on surfboard physics and wave-riding mechanics.

---

## What This Is NOT

- A surfer (no board physics)
- Wave-relative positioning (that's Plan 70)
- Catching waves (not yet)
- Any tricks or scoring

This is purely: **move around, don't get pushed to shore**.
