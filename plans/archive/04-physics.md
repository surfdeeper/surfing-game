# Plan: Physics & Pocket Mechanic

## Goal
Simulate surfing physics where position on wave affects speed, and wrong positioning causes wipeouts.

## Steps

### 1. Core Speed Model
Speed is a function of:
- **Wave slope at surfer position** - steeper = faster
- **Position relative to pocket** - optimal zone gives bonus
- **Board angle** - aligned with wave = efficient

```typescript
function calculateSpeed(surfer, wave) {
    const slope = wave.getSlopeAt(surfer.x, surfer.z);
    const pocketBonus = getPocketMultiplier(surfer, wave);
    const efficiency = getAngleEfficiency(surfer.angle, slope.direction);

    return BASE_SPEED * slope.steepness * pocketBonus * efficiency;
}
```

### 2. The Pocket
- Zone just ahead of the breaking/curl section
- Moves as wave progresses
- Surfer must track it laterally

```typescript
interface Pocket {
    x: number;        // lateral position
    width: number;    // sweet spot size
    speed: number;    // how fast pocket moves
}
```

### 3. Wipeout Conditions

**Nose Dive**
- Too far forward on wave face
- Speed too high relative to wave
- Board angle too steep

**Stall Out**
- Too far back, behind the pocket
- Speed drops below minimum
- Wave breaks on top of surfer

**Rail Catch**
- Turning too hard at high speed
- Board angle exceeds stability threshold

### 4. Speed Decay
- Constant drag/friction
- Must stay in pocket to maintain speed
- Pumping (future) can add speed

### 5. Wave Interaction
- Query wave mesh for:
  - Height at point
  - Surface normal
  - Slope steepness
  - Distance to breaking section

### 6. Tuning Parameters
```typescript
const PHYSICS = {
    gravity: 9.8,
    drag: 0.02,
    minSpeed: 1.0,      // below this = stall
    maxSpeed: 15.0,
    noseDiveAngle: 45,  // degrees
    pocketBonus: 1.5,
};
```

## Success Criteria
- Surfer accelerates on steep sections
- Clear "pocket" that must be chased
- Predictable, fair wipeout conditions
- Feels like surfing, not skating

## Files to Create
- `src/physics/speed.ts`
- `src/physics/wipeout.ts`
- `src/physics/pocket.ts`
- `src/physics/constants.ts`
