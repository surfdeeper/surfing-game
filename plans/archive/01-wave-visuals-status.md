# Wave Visuals - Status & Learnings

## Current State
Basic WebGL wave rendering is working but not realistic. The wave looks more like a wall/ridge than a proper breaking wave with a throwing lip.

## What We Built
- WebGL canvas with vertex/fragment shaders
- 200x200 mesh grid for wave surface
- Gerstner-inspired wave math
- Peel that travels laterally along the wave
- Foam texture using procedural noise (fbm)
- Debug GUI with camera controls, wave params, and visualization modes
- Separate swell lines + breaking wave layers

## What's Working
- Foam/whitewater texture looks decent
- Debug GUI is useful for iteration
- Basic wave shape exists
- Peel travels down the line

## What's NOT Working
- Wave looks like a flat wall, not a 3D breaking wave
- Lip doesn't convincingly "throw" - whole wall bends instead
- Swells approaching from horizon aren't clearly visible
- Missing the characteristic tube/barrel shape
- Face doesn't show water "drawing up"
- Overall feels low-poly despite 200x200 mesh

## Technical Challenges Encountered

### 1. Vertex Shader Limitations
We're displacing vertices, but a breaking wave lip that throws over creates geometry that folds over itself - vertices can't represent that without advanced techniques like:
- Multiple mesh layers (water surface + spray/lip layer)
- Particle systems for the throwing lip
- Ray marching instead of mesh

### 2. 2D Height Field Problem
Our approach treats the ocean as a height field (one Y value per XZ position). A barrel/tube has multiple Y values at the same XZ - it's a 3D surface, not a height map.

### 3. Coordinate Confusion
Spent time debugging which axis is which (X along wave, Z toward shore, Y up). The wave math kept getting tangled.

## Possible Future Approaches

### Option A: Stylized/Simplified
Accept cartoonish waves, focus on gameplay. Many surf games do this successfully.

### Option B: Pre-modeled Wave
Create a 3D wave model in Blender with proper barrel shape, animate the peel/break procedurally.

### Option C: Particle System
Use particles for the throwing lip and spray, mesh only for the base wave surface.

### Option D: Ray Marching
SDF-based rendering could handle the folding geometry better, but more complex.

### Option E: Reference Real Implementations
Study how games like "Surf World Series" or "The Endless Summer" handle wave rendering.

## Decision
Moving on to surfer controls and gameplay. Can revisit wave visuals later with fresh perspective or different approach.

## Files
- `src/shaders/wave.vert.js` - Vertex shader with wave math
- `src/shaders/wave.frag.js` - Fragment shader with water/foam coloring
- `src/engine/wave-renderer.js` - WebGL setup and rendering
- `src/main.js` - Game loop and debug GUI
