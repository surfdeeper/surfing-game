# Plan: Surfer Sprite

## Goal
Display a surfer character on the wave surface that moves naturally with the water.

## Steps

### 1. Sprite Asset
- Simple pixel art or vector surfer (side-ish view facing camera)
- Multiple frames: neutral, leaning left, leaning right, crouch, wipeout
- Start with placeholder rectangle, replace with art later

### 2. Position on Wave
- Surfer has (x, z) position on wave grid
- Sample wave height at that position for Y
- Sample wave normal for rotation/tilt

### 3. Billboarding
- Sprite always faces camera
- Rotates to match wave surface angle
- Scales based on distance (closer = bigger)

### 4. Animation States
- Idle/riding: slight bob
- Carving left: lean sprite left
- Carving right: lean sprite right
- Speed crouch: compressed sprite
- Wipeout: tumble animation

### 5. Rendering
- Option A: 2D canvas overlay on WebGL
- Option B: Textured quad in 3D scene (better for depth sorting)
- Need to handle surfer going "behind" spray/lip

### 6. Trail/Wake
- Small foam trail behind board
- Spray when carving hard

## Success Criteria
- Surfer sits on wave surface naturally
- Tilts with wave slope
- Can swap sprite frames based on state

## Files to Create
- `src/sprites/surfer.png` (or .svg)
- `src/game/surfer.ts`
- `src/engine/sprite-renderer.ts`
