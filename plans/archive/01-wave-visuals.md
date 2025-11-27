# Plan: Wave Visuals

## Goal
Render a realistic ocean wave using WebGL shaders, viewed from beach looking out to sea.

## Steps

### 1. Basic Setup
- HTML canvas, WebGL context
- Simple vertex/fragment shader pipeline
- Camera positioned at "beach" looking outward

### 2. Wave Mesh
- Flat plane subdivided into grid (e.g., 100x100 vertices)
- Vertex shader displaces Y based on Gerstner wave formula
- Multiple wave components summed for natural look

### 3. Gerstner Wave Math
```glsl
// Single wave component
vec3 gerstner(vec2 pos, float time, vec2 dir, float steepness, float wavelength) {
    float k = 2.0 * PI / wavelength;
    float c = sqrt(9.8 / k);
    float a = steepness / k;
    float phase = k * (dot(dir, pos) - c * time);

    return vec3(
        dir.x * a * cos(phase),
        a * sin(phase),
        dir.y * a * cos(phase)
    );
}
```

### 4. Wave Face / Breaking Zone
- Steepness increases as wave approaches shore
- When steepness > threshold, wave "breaks"
- Fragment shader adds white foam at crest

### 5. Shading
- Normal calculation from neighboring vertices
- Basic diffuse + specular for water look
- Foam/whitewash as white overlay near crest
- Optional: reflection, refraction, fresnel

### 6. Polish
- Spray particles at lip
- Foam trails
- Underwater caustics (stretch goal)

## Success Criteria
- Wave that looks like it's rolling toward camera
- Visible "pocket" area on wave face
- Runs at 60fps

## Files to Create
- `src/shaders/wave.vert`
- `src/shaders/wave.frag`
- `src/engine/wave-renderer.ts`
- `index.html`
