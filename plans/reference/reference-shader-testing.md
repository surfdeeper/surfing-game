# Shader Testing & Development Workflow

Research on best practices for developing and testing WebGL graphics.

---

## The Reality: Manual Visual Testing is Common

For creative/artistic shader work, **manual visual testing** (refresh and look) is actually the standard approach in the industry. Shaders are inherently visual - you're crafting an aesthetic, not just correctness.

However, there are ways to make this process more efficient and catch regressions.

---

## Recommended Development Workflow

### 1. Live Shader Editing (Best for Iteration)

**Firefox Shader Editor** (built-in)
- View and edit vertex/fragment shaders in real-time
- See changes instantly without page refresh
- Great for tweaking values and experimenting

**How to use:**
1. Open Firefox DevTools (F12)
1. Go to "..." menu → Settings → Enable "Shader Editor"
1. Refresh page, find Shader Editor tab
1. Click any shader to edit live

**Shadertoy-style Development**
- Develop complex shader logic in isolation first
- Use sites like [Shadertoy](https://shadertoy.com) or [GLSL Sandbox](http://glslsandbox.com)
- Port proven shaders into your game

### 2. Debug Tools

**Spector.js** (Browser Extension)
- Captures every WebGL call in a frame
- Inspect textures, buffers, draw calls
- Step through rendering pipeline
- Find why something isn't rendering correctly

Install: [Spector.js Chrome Extension](https://chrome.google.com/webstore/detail/spectorjs/denbgaamihkadbghdceggmchnflmhpmk)

**webgl-lint**
- Catches WebGL errors your code might miss
- Provides helpful error messages
- Add to project: `<script src="https://greggman.github.io/webgl-lint/webgl-lint.js"></script>`

### 3. Visual Regression Testing (For CI/Stability)

When you have a working visual you want to protect from regressions:

**Screenshot Comparison Approach:**
```javascript
// Pseudocode workflow
1. Render scene to canvas
2. canvas.toDataURL() → save as baseline image
3. On future test runs, compare new render to baseline
4. Flag if pixel difference exceeds threshold
```

**Tools:**
- **Puppeteer** + **pixelmatch** - Headless Chrome screenshots + image diff
- **Playwright** - Cross-browser visual testing
- **Percy** / **Chromatic** - Cloud visual regression services
- **jest-image-snapshot** - Jest integration

**Example with Puppeteer:**
```javascript
const puppeteer = require('puppeteer');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;

async function captureAndCompare() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:5173');

    // Wait for WebGL to render
    await page.waitForTimeout(1000);

    // Capture screenshot
    const screenshot = await page.screenshot();

    // Compare with baseline...
    // pixelmatch(baseline, screenshot, diff, width, height, {threshold: 0.1});

    await browser.close();
}
```

**When to use visual regression:**
- After shader is "done" and you want to prevent breaking it
- For CI pipelines to catch accidental changes
- NOT during active development (too many intentional changes)

---

## Shader-Specific Testing Strategies

### Isolate Shader Components

Create test scenes that isolate specific shader features:

```javascript
// Test scenes
const testScenes = {
    'foam-only': { showWave: false, showFoam: true },
    'wave-geometry': { wireframe: true, showFoam: false },
    'lighting-only': { solidColor: true, showLighting: true },
    'normals-debug': { showNormals: true }  // Render normals as RGB
};
```

### Debug Outputs

Add debug modes to your shader:

```glsl
// In fragment shader
uniform int uDebugMode;

void main() {
    vec3 color;

    if (uDebugMode == 1) {
        // Show normals as colors
        color = vNormal * 0.5 + 0.5;
    } else if (uDebugMode == 2) {
        // Show UV coordinates
        color = vec3(vUV, 0.0);
    } else if (uDebugMode == 3) {
        // Show foam mask
        color = vec3(vFoam);
    } else if (uDebugMode == 4) {
        // Show wave face mask
        color = vec3(vWaveFace);
    } else {
        // Normal rendering
        color = calculateFinalColor();
    }

    gl_FragColor = vec4(color, 1.0);
}
```

### Parameter Sliders (GUI)

Add runtime controls with **dat.GUI** or **lil-gui**:

```javascript
import GUI from 'lil-gui';

const params = {
    waveHeight: 5.0,
    peelSpeed: 4.0,
    foamIntensity: 1.0,
    debugMode: 0
};

const gui = new GUI();
gui.add(params, 'waveHeight', 0, 10);
gui.add(params, 'peelSpeed', 0, 10);
gui.add(params, 'foamIntensity', 0, 2);
gui.add(params, 'debugMode', { Off: 0, Normals: 1, UVs: 2, Foam: 3, Face: 4 });
```

This lets you tweak values without code changes.

---

## Performance Testing

Shader performance is hard to measure accurately because GPU operations are async.

### Basic FPS Monitoring

```javascript
let frameCount = 0;
let lastTime = performance.now();

function gameLoop(timestamp) {
    frameCount++;

    if (timestamp - lastTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = timestamp;
    }

    render();
    requestAnimationFrame(gameLoop);
}
```

### GPU Timing (WebGL 2)

```javascript
const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
if (ext) {
    const query = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    // ... draw calls ...
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    // Check result later (async)
}
```

### Comparative Testing

To compare two shader approaches:
1. Render 1000+ frames with shader A
1. Force GPU sync with `gl.readPixels()`
1. Measure total time
1. Repeat with shader B
1. Compare

---

## Our Recommended Workflow

### During Active Development (Now)
1. **Hot reload** with Vite (already set up)
1. **Firefox Shader Editor** for live tweaking
1. **You describe what you see** → I adjust
1. Add **debug modes** to visualize specific parts
1. Add **GUI sliders** for key parameters

### Once Wave Looks Good
1. Save **baseline screenshots** at key camera angles
1. Set up **Puppeteer visual regression** tests
1. Run before commits to catch regressions

### For Complex Debugging
1. Install **Spector.js** to inspect draw calls
1. Add **webgl-lint** for error catching
1. Use **debug shader outputs** (normals, UVs, masks)

---

## Tools Summary

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Firefox Shader Editor | Live editing | Active development |
| Spector.js | WebGL inspection | Debugging render issues |
| webgl-lint | Error catching | Always (dev mode) |
| lil-gui | Runtime parameters | Tuning values |
| Puppeteer + pixelmatch | Visual regression | CI / stability |
| Chrome DevTools Performance | FPS / GPU monitoring | Optimization |

---

## Sources

- [Best Practices for Testing and Debugging WebGL Applications](https://blog.pixelfreestudio.com/best-practices-for-testing-and-debugging-webgl-applications/)
- [Visual Regression Testing - Real-Time 3D Graphics with WebGL 2](https://www.oreilly.com/library/view/real-time-3d-graphics/9781788629690/64889426-ed73-4110-a95f-6102e8501158.xhtml)
- [Stack Overflow - Testing Visual Parts of WebGL/Canvas Games](https://stackoverflow.com/questions/26088864/what-are-the-possible-ways-of-testing-visual-parts-of-a-webgl-canvas-based-game)
- [Stack Overflow - Benchmarking WebGL Shaders](https://stackoverflow.com/questions/38710140/how-do-i-benchmark-a-webgl-shader)
