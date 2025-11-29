# Plan 10: 3D Scene Debugger

## Purpose
Before building anything complex, we need a way to SEE what's happening. A debugger/sandbox environment where we can:
- Visualize 3D space with clear coordinates
- Place test objects and see their positions
- Move the camera freely
- Inspect values at any point
- Toggle visualizations on/off

This is our foundation - everything else builds on this.

---

## Features

### 1. Coordinate System Visualization
- **Grid on the XZ plane** (water level) - shows horizontal positions
- **Axis indicators** - X (red), Y (green), Z (blue) arrows at origin
- **Axis labels** - Which way is shore, which way is along the wave
- **Scale markers** - Every 10 units labeled

```
Coordinate convention:
  X = Along the wave (left/right as you face shore)
  Y = Up (height)
  Z = Toward shore (negative = horizon, positive = beach)
```

### 2. Camera Controls
- **Orbit** - Click and drag to rotate around a focus point
- **Pan** - Right-click drag or shift+drag to move focus
- **Zoom** - Scroll wheel
- **Preset views** - Buttons for: top-down, side view, beach view, surfer POV
- **Camera position display** - Show current XYZ in UI

### 3. Test Objects
- **Point markers** - Place spheres at specific coordinates
- **Line segments** - Draw lines between points
- **Plane slices** - Show cross-sections of water at given Z
- **Moveable probe** - A point you can drag around, shows coordinates and any computed values at that position

### 4. Value Inspector
- **Hover info** - Hover over any point, see coordinates
- **Probe readout** - At probe position, show:
  - XYZ coordinates
  - "Water depth" at that point
  - "Wave height" at that point (once we have waves)
  - Any other computed values
- **Time control** - Pause, play, step frame-by-frame, adjust speed

### 5. Visualization Toggles
- Grid on/off
- Axes on/off
- Wireframe mode
- Normals visualization
- Depth coloring

---

## Implementation

### Tech Approach
Keep using raw WebGL for learning, but add:
- Separate shader for debug primitives (lines, points)
- Immediate-mode style drawing for debug stuff
- Simple UI overlay (HTML/CSS, not WebGL)

### Files to Create
```
src/
  debug/
    debugger.js       # Main debugger controller
    grid.js           # Grid rendering
    axes.js           # Axis arrows and labels
    camera-controls.js # Orbit/pan/zoom
    probe.js          # Moveable inspection point
    ui.js             # HTML overlay for readouts
  shaders/
    debug.vert.js     # Simple colored vertex shader
    debug.frag.js     # Simple colored fragment shader
```

### UI Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Top] [Side] [Beach] [Reset]     Camera: X Y Z          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    3D VIEWPORT                          │
│                                                         │
│                                                         │
│                                          ┌────────────┐ │
│                                          │ Probe:     │ │
│                                          │ X: 0.00    │ │
│                                          │ Y: 0.00    │ │
│                                          │ Z: 0.00    │ │
│                                          │ Depth: --  │ │
│                                          └────────────┘ │
├─────────────────────────────────────────────────────────┤
│ ☑ Grid  ☑ Axes  ☐ Wireframe    Time: [|<][<][>][>|] 1x  │
└─────────────────────────────────────────────────────────┘
```

---

## Success Criteria

Before moving to the next plan, we should be able to:

1. See a grid at Y=0 representing the water surface plane
1. See XYZ axes at the origin
1. Orbit the camera around with mouse drag
1. Zoom with scroll wheel
1. Click preset buttons to jump to standard views
1. See camera coordinates update in real-time
1. Have a probe point we can move and see its coordinates

---

## What This Enables

With this debugger, when we add water and waves, we can:
- See exactly where the wave is at any moment
- Verify wave is traveling in the right direction
- Check wave height at specific points
- Visualize the "break zone"
- Debug surfer position relative to wave
- Step through time to see motion frame by frame

This is the foundation. Don't skip it.
