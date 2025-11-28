# Plan 70: The Surfer

## Purpose
Only NOW do we add the surfer. The wave system is complete and validated. The surfer interacts with a working wave, not a fake one.

---

## Surfer Physics

The surfer is essentially a vehicle on a moving, sloped surface.

### Forces on a Surfer

**1. Gravity**
- Always pulls down (negative Y)
- On a slope, component pulls you down the slope

**2. Wave Surface**
- Surfer constrained to wave surface
- Normal force perpendicular to surface
- Surface is moving (wave traveling, peel progressing)

**3. Drag/Friction**
- Water resistance
- Rail friction when turning

**4. Thrust**
- Pumping (generating speed)
- Dropping down the face (gravity component)
- Wave push (especially in foam)

---

## Surfer Position and Orientation

### Position
```javascript
surfer = {
    x: float,  // Along the wave
    z: float,  // Toward/away from shore (on wave face)
    y: float,  // Height (calculated from wave surface)
}
```

### Position on Wave Face
Think of it as UV coordinates on the wave:
- **Along the wave (x)**: position relative to the peel
- **On the face (z)**: high on face vs low in trough

### Orientation
```javascript
orientation = {
    pitch: float,  // Nose up/down
    roll: float,   // Rail-to-rail lean
    yaw: float,    // Direction of travel
}
```

Derived from:
- Wave surface normal at position
- Velocity direction
- Player input (leaning)

---

## Core Mechanics

### Staying on the Wave
The surfer must stay in the "rideable zone":
- **Too far back (toward shore)**: run out of wave, end up in foam
- **Too far forward (toward horizon)**: wave hasn't arrived yet
- **Too far behind peel**: caught by whitewater
- **Over the back**: behind the wave, lose it

### Speed
Speed comes from:
- Dropping down the face (gravity → forward motion)
- Wave energy (the wave pushes you)

Speed is lost to:
- Friction
- Going uphill (against gravity)
- Poor positioning

### Turning
- Player input causes rail engagement
- Turn radius depends on speed (faster = wider turns)
- Cutback: turn back toward the breaking section
- Bottom turn: turn at bottom of face to go back up

---

## The Pocket

The ideal position - just ahead of the breaking section:
- Steepest part of the face (maximum gravity assist)
- Maximum wave power
- Where all the speed is

Surfer must continuously adjust to stay in the pocket as it moves with the peel.

---

## Wipeout Conditions

### 1. Caught by Foam
- Surfer in foam zone without enough speed
- Foam overpowers surfer
- Result: tumble

### 2. Over the Falls
- Surfer at the lip when it throws
- Gets sucked up and over
- Result: dramatic wipeout

### 3. Pearl (Nose Dive)
- Going too fast down the face
- Nose digs into water
- Result: pitch forward

### 4. Stall
- Not enough speed
- Wave passes surfer
- Result: sink into foam

### 5. Rail Catch
- Turning too hard at high speed
- Rail catches
- Result: sudden stop + tumble

---

## Implementation

### Surfer as a Point on the Wave
```javascript
class Surfer {
    // Position relative to wave
    waveX: float;           // Along the wave
    facePosition: float;    // 0 = bottom, 1 = lip

    // World position (calculated)
    get position() {
        return wave.getPositionAt(this.waveX, this.facePosition, time);
    }

    // Velocity on the wave
    velocityAlongWave: float;
    velocityOnFace: float;
}
```

### Physics Update
```javascript
function updateSurfer(dt, input) {
    // Get wave properties at surfer position
    const slope = wave.getSlopeAt(surfer.waveX, surfer.facePosition);
    const waveState = wave.getStateAt(surfer.waveX);

    // Gravity component
    const gravityAccel = slope * GRAVITY_FACTOR;
    surfer.velocityOnFace += gravityAccel * dt;

    // Input: left/right steers along wave
    if (input.left) surfer.velocityAlongWave -= TURN_ACCEL * dt;
    if (input.right) surfer.velocityAlongWave += TURN_ACCEL * dt;

    // Input: up/down controls position on face
    if (input.up) surfer.velocityOnFace -= PUMP_ACCEL * dt;
    if (input.down) surfer.velocityOnFace += DROP_ACCEL * dt;

    // Friction
    surfer.velocityAlongWave *= FRICTION;
    surfer.velocityOnFace *= FRICTION;

    // Update position
    surfer.waveX += surfer.velocityAlongWave * dt;
    surfer.facePosition += surfer.velocityOnFace * dt;

    // Clamp to rideable zone
    surfer.facePosition = clamp(surfer.facePosition, 0, 1);

    // Check wipeout conditions
    checkWipeout(surfer, waveState);
}
```

### Wipeout Check
```javascript
function checkWipeout(surfer, waveState) {
    // Caught by foam
    if (waveState === BROKEN && surfer.speed < MIN_SURVIVE_SPEED) {
        triggerWipeout('Caught inside');
    }

    // Over the falls
    if (waveState === BREAKING && surfer.facePosition > 0.9) {
        triggerWipeout('Over the falls');
    }

    // Pearl
    if (surfer.velocityOnFace > PEARL_THRESHOLD && surfer.facePosition < 0.2) {
        triggerWipeout('Pearled');
    }

    // Stall
    if (surfer.totalSpeed < STALL_THRESHOLD) {
        triggerWipeout('Stalled');
    }
}
```

---

## Rendering

### Simple First
- Box or low-poly humanoid
- Positioned on wave surface
- Oriented to surface normal + velocity direction

### Later
- Animated model
- Different poses (cruising, turning, pumping, wipeout)
- Spray when turning

---

## Debug Features

- Show surfer position on wave as a dot
- Display speed, facePosition, waveX
- Show "danger zone" highlighting
- Visualize pocket position
- Wipeout reason display

---

## Success Criteria

1. Surfer stays on wave surface naturally
2. Arrow keys provide intuitive control
3. Going down the face builds speed
4. Must actively stay ahead of peel to survive
5. Wipeouts feel fair and physical
6. The "game" emerges: stay in the pocket, don't wipe out

---

## What We're NOT Doing Yet
- Tricks/aerials
- Scoring
- Multiple waves/sessions
- Other surfers

Basic surfing first. Prove it's fun.
