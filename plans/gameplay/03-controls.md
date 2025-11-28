# Plan: Controls

## Goal
Responsive, intuitive controls for positioning the surfer on the wave face.

## Steps

### 1. Input Handling
- Keyboard: Arrow keys or A/D
- Touch: Left/right screen halves, or tilt on mobile
- Gamepad: Left stick (stretch goal)

### 2. Movement Axes
- **Lateral (left/right)**: Move across wave face
  - Toward shoulder (safe, but wave ends)
  - Toward pocket (optimal)
  - Toward closeout section (dangerous)

- **Vertical (up/down on face)**: Optional complexity
  - High on face = more potential energy, riskier
  - Low on face = safer, less speed

### 3. Control Feel
- Not direct position control - influence acceleration
- Momentum/inertia so it feels like carving
- Different boards = different responsiveness

```typescript
// Example tuning params
const TURN_ACCELERATION = 2.0;
const MAX_LATERAL_SPEED = 5.0;
const FRICTION = 0.95;
```

### 4. Input Buffering
- Queue inputs slightly for responsiveness
- Prevent accidental double-taps

### 5. Visual Feedback
- Surfer leans into turns
- Spray intensity matches turn sharpness
- Board rail visible on hard carves

### 6. Advanced Moves (Later)
- Pump: tap rhythm for speed boost
- Cutback: hold opposite direction to loop back
- Floater: up + forward at lip

## Success Criteria
- Feels responsive but not twitchy
- Clear connection between input and surfer movement
- Works on keyboard, ready for touch

## Files to Create
- `src/input/keyboard.ts`
- `src/input/touch.ts`
- `src/game/movement.ts`
