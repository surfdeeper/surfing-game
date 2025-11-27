# Plan: Gradient Swells (Sine Wave Effect)

## Goal
Replace the discrete horizontal swell lines with a continuous gradient that creates the illusion of rolling 3D waves.

## Current State
- Horizontal lines drawn at regular intervals (`swellSpacing: 80px`)
- Lines move from top to bottom at `swellSpeed: 50px/s`
- Lines are rendered as simple 2px strokes in `colors.swellLine`

## Desired State
- Each horizontal line position represents a **wave peak** (crest)
- The midpoint between two lines represents a **wave trough** (valley)
- Instead of discrete lines, fill the space with a **vertical gradient**:
  - **Dark** at each peak (current line position)
  - **Light** at the midpoint between peaks (trough)
  - **Dark** again at the next peak
- This creates a smooth sine-wave-like intensity pattern that simulates rolling ocean swells

## Implementation Steps

### 1. Remove Discrete Line Drawing
In `src/main.js`, remove or replace the current swell line drawing loop (lines 62-73) that uses `ctx.stroke()` to draw individual lines.

### 2. Create Gradient Fill Function
Create a function that fills the ocean area with a repeating vertical gradient:
- Use canvas `createLinearGradient()` for each swell "band"
- Or calculate pixel intensity mathematically using a sine/cosine function

### 3. Calculate Wave Intensity
For any given Y position, calculate the intensity using a sine wave:
```javascript
// intensity ranges from 0 (dark/peak) to 1 (light/trough)
const phase = ((y + world.swellOffset) / world.swellSpacing) * Math.PI * 2;
const intensity = (Math.cos(phase) + 1) / 2;  // 0 at peaks, 1 at troughs
```

### 4. Apply Gradient Colors
Define dark (peak) and light (trough) colors:
```javascript
const peakColor = { r: 26, g: 74, b: 110 };    // Dark blue (current ocean color)
const troughColor = { r: 74, g: 144, b: 184 }; // Lighter blue
```

### 5. Render Options (Choose One)

**Option A: Per-pixel rendering (ImageData)**
- Create an ImageData buffer
- Loop through each row, calculate intensity, set RGB values
- Put the image data to canvas
- Pros: Precise control, smooth gradient
- Cons: May be slower for large canvases

**Option B: Stacked gradients**
- For each swell band, create a linear gradient from peak to trough to peak
- Fill rectangles with these gradients
- Pros: Uses GPU-accelerated canvas gradients
- Cons: More complex gradient setup

**Option C: Single full-height gradient with repeating pattern**
- Create one gradient that spans multiple swell spacings
- May need to tile or repeat
- Pros: Simple setup
- Cons: Limited by canvas gradient color stop limits

### 6. Maintain Animation
- Keep the `swellOffset` animation logic
- The gradient pattern should scroll with the offset
- Ensure smooth wrapping when offset resets

## Files to Modify
- `src/main.js` - Main rendering logic

## Success Criteria
- Smooth gradient transitions between wave peaks and troughs
- Dark bands at what were previously discrete lines
- Light bands at midpoints between lines
- Animation continues smoothly (swells roll toward shore)
- No visible "seams" or discontinuities in the gradient
- Performance remains acceptable (target 60fps)
