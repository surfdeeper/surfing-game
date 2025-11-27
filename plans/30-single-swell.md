# Plan 30: Single Traveling Swell

## Purpose
Add ONE swell - a single bump of energy traveling through the water toward shore. No breaking yet. Just watch it move.

This validates that we understand wave propagation.

---

## What Is a Swell?

A swell is a wave that has traveled far from its source (usually a distant storm). By the time it reaches us:
- It's very organized (clean sine-like shape)
- Long wavelength (distance between crests)
- Long period (time between crests)
- Relatively low height in deep water

As it approaches shore, it will transform - but that's the next plan.

---

## The Math: Linear Wave Theory

For a simple traveling wave in deep water:

**Surface elevation at position (x,z) and time t:**
```
η(x, z, t) = A × sin(k·z - ω·t + φ)
```

Where:
- `A` = amplitude (half the wave height)
- `k` = wave number = 2π / wavelength
- `ω` = angular frequency = 2π / period
- `φ` = phase offset (where the wave starts)
- `z` = position toward shore (wave travels in +Z direction)

**Wave speed (celerity) in deep water:**
```
c = wavelength / period = ω / k
```

For deep water: `c = sqrt(g × wavelength / 2π)` where g = 9.8 m/s²

---

## What We're Building

### One Swell Parameters
```javascript
const swell = {
    amplitude: 1.0,       // meters (so wave height = 2m)
    wavelength: 50.0,     // meters between crests
    period: 6.0,          // seconds between crests
    direction: [0, 1],    // traveling toward +Z (shore)
};
```

### Surface Displacement
The water surface Y position at any point:
```javascript
function getWaveHeight(x, z, time) {
    const k = 2 * Math.PI / swell.wavelength;
    const omega = 2 * Math.PI / swell.period;
    return swell.amplitude * Math.sin(k * z - omega * time);
}
```

### Visualization
- Water surface deforms up and down as swell passes
- Can see crest lines parallel to shore (perpendicular to wave direction)
- Watch a crest travel from horizon toward camera

---

## Implementation

### Vertex Shader Change
Instead of flat Y = 0, displace vertices:
```glsl
float waveHeight = amplitude * sin(k * position.z - omega * uTime);
vec3 displaced = vec3(position.x, waveHeight, position.z);
```

### Normal Calculation
The surface normal changes with the wave slope:
```glsl
// Derivative of sin is cos
float dHeight_dZ = amplitude * k * cos(k * position.z - omega * uTime);
vec3 normal = normalize(vec3(0.0, 1.0, -dHeight_dZ));
```

### Files to Create/Modify
```
src/
  ocean/
    swell.js          # Swell parameters and calculation
  shaders/
    water.vert.js     # Add displacement
```

### Debug Features
- Show wave height at probe position
- Draw a line at current crest position
- Display wave speed in UI
- Pause to see wave shape frozen

---

## Success Criteria

1. See a smooth bump (swell) traveling toward camera
2. Wave maintains its shape as it travels (doesn't deform yet)
3. Correct speed: should take (wavelength / speed) seconds to travel one wavelength
4. Probe shows correct wave height as wave passes
5. Surface normals correct (lighting changes on wave face vs back)
6. Can adjust wavelength, amplitude, period in UI and see changes

---

## Validation Tests

### Speed Test
```
wavelength = 50m
deep water speed ≈ sqrt(9.8 × 50 / 6.28) ≈ 8.8 m/s
period = 50 / 8.8 ≈ 5.7 seconds

Watch a crest travel 50m. Should take ~5.7 seconds.
```

### Shape Test
- Pause the simulation
- Measure distance between crests - should equal wavelength
- Measure height from trough to crest - should equal 2 × amplitude

---

## What We're NOT Doing Yet
- Shoaling (wave growing in shallow water)
- Breaking
- Multiple swells
- Orbital motion of particles (just surface height for now)

One simple traveling bump. Validate. Then evolve it.
