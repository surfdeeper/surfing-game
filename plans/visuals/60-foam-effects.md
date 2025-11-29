# Plan 60: Foam and Visual Effects

## Purpose
With breaking working mechanically, add visual polish: foam textures, spray particles, and the details that make it look like real breaking water.

---

## Types of Foam/Whitewater

### 1. Impact Foam
- Where the lip hits the water
- Brightest, most intense
- Lots of air entrainment
- Short-lived at each point, but continuous at the impact zone

### 2. Surface Foam
- Floating foam after initial impact
- Patterns and swirls on the surface
- Gradually dissipates
- Moves with water flow

### 3. Spray
- Droplets thrown from the lip
- Wind-affected
- Creates mist and drama

### 4. Tube Foam
- Inside the barrel (if there is one)
- Spinning, vortex-like
- Backlit glow effect

---

## Foam Rendering Techniques

### Texture-Based Foam
Use procedural noise to create foam patterns:
```glsl
float foamNoise(vec2 uv, float time) {
    float n1 = noise(uv * 8.0 + time * 0.3);
    float n2 = noise(uv * 16.0 - time * 0.2);
    float n3 = noise(uv * 32.0 + time * 0.5);
    return n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
}
```

### Foam Intensity Map
Different parts of the wave have different foam amounts:
```glsl
float getFoamIntensity(vec3 worldPos, float waveState) {
    if (waveState == UNBROKEN) return 0.0;
    if (waveState == BREAKING) return 0.9;
    if (waveState == BROKEN) {
        // Decay over time/distance
        float decay = smoothstep(10.0, 0.0, distanceFromBreak);
        return 0.7 * decay;
    }
}
```

### Blending Foam with Water
```glsl
vec3 foamColor = vec3(0.95, 0.98, 1.0);
float foam = getFoamIntensity(...) * foamNoise(...);
color = mix(waterColor, foamColor, foam);
```

---

## Spray Particles

### When to Emit
- At the lip during BREAKING state
- At impact zone
- Wind-driven off the crest

### Particle Properties
```javascript
class SprayParticle {
    position: vec3;
    velocity: vec3;
    lifetime: float;
    size: float;
}
```

### Particle Motion
```javascript
function updateParticle(p, dt, wind) {
    // Gravity
    p.velocity.y -= 9.8 * dt;

    // Wind
    p.velocity.x += wind.x * dt;
    p.velocity.z += wind.z * dt;

    // Air resistance
    p.velocity *= 0.98;

    // Move
    p.position += p.velocity * dt;

    // Age
    p.lifetime -= dt;
}
```

### Rendering
- GL_POINTS or small quads
- Additive blending for mist effect
- Size decreases with age
- Alpha decreases with age

---

## Foam on the Face

Water drawing up the face creates streaks/texture:
```glsl
// Vertical streaks on the face
float faceTexture = sin(worldPos.x * 10.0 + worldPos.y * 20.0) * 0.5 + 0.5;
faceTexture *= onFace; // Only on the wave face
color += vec3(0.1) * faceTexture * 0.3;
```

---

## Implementation

### Files
```
src/
  effects/
    foam.js           # Foam intensity calculation
    spray.js          # Particle system for spray
    particles.js      # Generic particle system
  shaders/
    foam.frag.js      # Foam noise and blending
    particle.vert.js  # Particle rendering
    particle.frag.js
```

### Integration Points
- Foam intensity passed from wave state to fragment shader
- Particle emitter positioned at breaking zone
- Wind direction affects spray

---

## Debug Features

- Toggle foam on/off
- Show foam intensity as solid color (debug view)
- Particle count display
- Spray velocity vectors

---

## Success Criteria

1. Foam looks organic, not uniform white
1. Foam patterns move and evolve
1. More foam at breaking zone, dissipates toward shore
1. Spray particles visible at the lip
1. Spray affected by (optional) wind
1. Overall: looks like actual breaking water, not painted foam

---

## Performance Considerations

- Foam noise should be cheap (baked texture or simple procedural)
- Particle count limited (100-500 max)
- LOD: reduce particles/foam detail in distance

---

## What We're NOT Doing Yet
- Sound effects
- Camera shake
- Underwater view
- Interactive foam (surfer creating spray)

Just visual foam and spray for now.
