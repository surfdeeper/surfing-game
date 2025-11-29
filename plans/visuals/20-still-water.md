# Plan 20: Still Water

## Purpose
Before simulating waves, we need to render a body of water that looks like water - even when completely still.

This plan creates a flat ocean surface with proper water rendering.

---

## What "Still Water" Needs to Look Like

Even without waves, water has visual characteristics:
- **Color varies with depth** - darker where deep, lighter where shallow
- **Reflects the sky** - especially at glancing angles (Fresnel)
- **Has subtle transparency** - you can see into it somewhat
- **Surface isn't perfectly flat** - micro-ripples, wind chop

For this step, we focus on the first three. Micro-ripples come later.

---

## The Water Surface

### Geometry
- Flat plane at Y = 0
- Extends from shore (positive Z) out to horizon (negative Z)
- Wide enough in X to fill the view
- Subdivided enough for later displacement (but just flat for now)

### Depth Map
We need a concept of "bottom depth" - how deep is the water at each point?

For a simple beach:
```
depth(z) = max(0, -z * slope)
```
- At Z = 0: depth = 0 (shoreline)
- At Z = -10: depth = 3 (if slope = 0.3)
- At Z = -50: depth = 15
- Etc.

Later we can add a reef/sandbar for the break point.

### Rendering

**Color based on depth:**
```glsl
vec3 shallowColor = vec3(0.0, 0.5, 0.5);  // Teal
vec3 deepColor = vec3(0.0, 0.1, 0.2);     // Dark blue
float depthFactor = smoothstep(0.0, 20.0, depth);
vec3 waterColor = mix(shallowColor, deepColor, depthFactor);
```

**Fresnel reflection:**
More reflection at glancing angles (looking across the water vs straight down)
```glsl
float fresnel = pow(1.0 - dot(normal, viewDir), 4.0);
color = mix(waterColor, skyColor, fresnel);
```

**Basic lighting:**
- Diffuse from sun direction
- Specular highlights

---

## Implementation

### New Concepts
- **Depth map** - Function that returns water depth at any (x, z)
- **Water material** - Shader that makes it look like water

### Files to Create/Modify
```
src/
  world/
    ocean.js          # Ocean surface geometry and rendering
    depth-map.js      # Water depth at any point
  shaders/
    water.vert.js     # Vertex shader (just pass-through for now)
    water.frag.js     # Fragment shader with water coloring
```

### Integration with Debugger
- Depth at probe position shown in UI
- Toggle water on/off to see grid underneath
- Option to show depth as color (debug view)

---

## Success Criteria

1. See a flat water surface at Y = 0
1. Water is darker in the distance (deep), lighter near shore (shallow)
1. Sky reflects on water surface, more at glancing angles
1. Specular highlight from "sun"
1. Probe shows depth value when over water
1. Looks like calm water, not just a blue plane

---

## What This Enables

With a working still water render:
- We have the depth map that determines where waves break
- We have the shader foundation to add displacement
- We can see changes clearly when we add wave motion
- We understand the coordinate system (where is shore, where is deep)

---

## What We're NOT Doing Yet
- Wave motion
- Foam or spray
- Underwater visibility/caustics
- Shoreline/beach geometry

Just still water. Validate it works, then move on.
