# Plan 128: React Performance Optimization (Concurrent Mode & Time-Slicing)

## Problem

Current button interactions are **laggy during animations** due to:

1. **Blocking render loop**: Canvas rendering happens synchronously in `requestAnimationFrame`
1. **No work prioritization**: All rendering work has equal priority
1. **UI updates compete with animations**: Button clicks trigger state changes that re-render during heavy animation frames
1. **Single-threaded bottleneck**: JavaScript main thread handles both UI events and canvas rendering

### Current Performance Issues

```
┌──────────────────────────────────────────────┐
│  Main Thread (16.6ms budget @ 60 FPS)        │
│                                              │
│  [Canvas Draw: 12ms]──[Button Click: 2ms]   │  ❌ Laggy
│  └─ Wave rendering                           │
│  └─ Foam effects                             │
│  └─ Debug panel                              │
│                                              │
│  User clicks button → waits for next frame  │
└──────────────────────────────────────────────┘
```

When animation rendering takes >10ms, button clicks feel unresponsive.

## Proposed Solution: React 18 Concurrent Features

**Why React 18 Concurrent Mode**:
- **Time-slicing**: Break render work into chunks, yield to browser
- **Priority-based scheduling**: UI events (clicks) get higher priority than animations
- **Automatic batching**: Multiple state updates batched efficiently
- **Interruptible rendering**: Low-priority work paused for urgent updates
- **Smooth transitions**: `startTransition` for non-urgent updates

**Why This Solves Laggy Buttons**:
```
┌──────────────────────────────────────────────┐
│  Main Thread (React 18 Concurrent Mode)      │
│                                              │
│  [Button Click: 1ms (urgent)]                │  ✅ Instant
│  [Canvas Draw: 4ms chunk 1]                  │
│  [Yield to browser]                          │
│  [Canvas Draw: 4ms chunk 2]                  │
│  [Yield to browser]                          │
│  [Canvas Draw: 4ms chunk 3]                  │
│                                              │
│  User clicks → immediate response            │
└──────────────────────────────────────────────┘
```

## Architecture: React 18 + Preact Compatibility

### Option A: Upgrade to React 18 (Full Features)

**Pros**:
- Native Concurrent Mode support
- `useTransition`, `useDeferredValue` hooks
- Automatic batching everywhere
- Best performance for complex UIs

**Cons**:
- Larger bundle size (~45KB vs 3KB for Preact)
- More complex for simple debug panel

### Option B: Preact + Manual Time-Slicing (Recommended for Now)

**Pros**:
- Keep tiny bundle size (3KB)
- Align with Plan 127 (already uses Preact)
- Add time-slicing manually where needed
- Upgrade path to React 18 later

**Cons**:
- Manual implementation of some concurrent patterns
- Less automatic than React 18

**Decision**: Start with **Option B** for Plan 127, create **Option A** as future plan for full React migration.

## Implementation Plan

### Phase 1: Preact with Manual Debouncing (Immediate Fix)

#### 1.1 Add Request Idle Callback for Non-Urgent Updates

**File**: `src/ui/DebugPanel.jsx`
```jsx
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import './DebugPanel.css';

export function DebugPanel({ world, displayWaves }) {
  const [displayState, setDisplayState] = useState({
    setWaves: 0,
    bgWaves: 0,
    foamSegments: 0,
  });
  
  const updateIdleCallbackRef = useRef(null);
  
  // PRIORITY BREAKDOWN:
  // ==================
  // HIGH PRIORITY (main thread, immediate):
  //   - Button clicks (onChange handlers)
  //   - Toggle state changes
  //   - localStorage writes
  // 
  // LOW PRIORITY (idle callbacks, deferred):
  //   - Filtering displayWaves array (wave counts)
  //   - Calculating derived stats (setWaves, bgWaves, foamSegments)
  //   - Updating read-only display values
  //
  // UNCHANGED (still in game loop):
  //   - Wave physics (update())
  //   - Canvas rendering (draw())
  //   - Game state management
  
  useEffect(() => {
    const scheduleUpdate = () => {
      if (updateIdleCallbackRef.current) {
        cancelIdleCallback(updateIdleCallbackRef.current);
      }
      
      updateIdleCallbackRef.current = requestIdleCallback(() => {
        const setWaves = displayWaves.filter(w => w.wave.type === 'SET').length;
        const bgWaves = displayWaves.filter(w => w.wave.type === 'BACKGROUND').length;
        
        setDisplayState({
          setWaves,
          bgWaves,
          foamSegments: world.foamSegments.length,
        });
      }, { timeout: 100 }); // Fallback if idle never comes
    };
    
    // Update stats at most once per animation frame
    const rafId = requestAnimationFrame(scheduleUpdate);
    
    return () => {
      cancelAnimationFrame(rafId);
      if (updateIdleCallbackRef.current) {
        cancelIdleCallback(updateIdleCallbackRef.current);
      }
    };
  }, [displayWaves, world.foamSegments.length]);
  
  const sls = world.setLullState;

  return (
    <div class="debug-panel">
      <h3>Wave Simulation Debug</h3>
      
      <Section title="View Layers">
        <Toggle 
          label="🗺️ Bathymetry" 
          checked={world.debug.showBathymetry}
          onChange={v => {
            // Immediate update - no lag!
            world.debug.showBathymetry = v;
            localStorage.setItem('showBathymetry', v);
          }}
          hotkey="B"
        />
        <Toggle 
          label="🌊 Set Waves" 
          checked={world.debug.showSetWaves}
          onChange={v => {
            world.debug.showSetWaves = v;
            localStorage.setItem('showSetWaves', v);
          }}
          hotkey="S"
        />
        <Toggle 
          label="🌊 Background" 
          checked={world.debug.showBackgroundWaves}
          onChange={v => {
            world.debug.showBackgroundWaves = v;
            localStorage.setItem('showBackgroundWaves', v);
          }}
          hotkey="G"
        />
      </Section>

      <Section title="Simulation">
        <Select
          label="⏩ Speed"
          value={world.timeScale}
          options={[1, 2, 4, 8]}
          onChange={v => {
            world.timeScale = v;
            localStorage.setItem('timeScale', v);
          }}
          hotkey="T"
        />
      </Section>

      {/* Non-urgent stats - updated during idle time */}
      <Section title="Wave Status">
        <ReadOnly label="Set Waves" value={displayState.setWaves} />
        <ReadOnly label="Background" value={displayState.bgWaves} />
        <ReadOnly label="Foam Segments" value={displayState.foamSegments} />
      </Section>

      <Section title="Set/Lull State">
        <ReadOnly label="State" value={`${sls.setState} (${sls.wavesSpawned}/${sls.currentSetWaves})`} />
        <ReadOnly label="Next Wave" value={`${Math.max(0, sls.nextWaveTime - sls.timeSinceLastWave).toFixed(1)}s`} />
        <ReadOnly label="Time Left" value={`${Math.max(0, sls.setDuration - sls.setTimer).toFixed(1)}s`} />
      </Section>
    </div>
  );
}
```

#### 1.2 Optimize Canvas Rendering Loop

**File**: `src/main.js`
```js
// Separate urgent UI updates from non-urgent canvas rendering
let pendingRenderRequest = null;

function scheduleRender() {
  if (!pendingRenderRequest) {
    pendingRenderRequest = requestAnimationFrame(() => {
      pendingRenderRequest = null;
      gameLoop(performance.now());
    });
  }
}

// Split heavy draw() into chunks if frame budget exceeded
const FRAME_BUDGET_MS = 12; // Leave 4ms for UI events at 60 FPS

function draw() {
  const frameStart = performance.now();
  
  // Critical: Clear canvas and draw ocean
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = oceanColor;
  ctx.fillRect(0, 0, w, h);
  
  // Check frame budget before continuing
  if (performance.now() - frameStart > FRAME_BUDGET_MS) {
    // Defer non-critical rendering to next frame
    requestAnimationFrame(() => drawDebugLayers());
    return;
  }
  
  // Continue with wave rendering...
  drawWaves();
  drawFoam();
  
  if (performance.now() - frameStart > FRAME_BUDGET_MS) {
    requestAnimationFrame(() => drawDebugLayers());
    return;
  }
  
  drawDebugLayers();
}

function drawDebugLayers() {
  // Bathymetry, debug info, etc.
  // Lower priority than core game rendering
}
```

#### 1.3 Add Performance Monitoring

**File**: `src/performance/monitor.js`
```js
// Performance monitoring for identifying bottlenecks

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameTime: 0,
      drawTime: 0,
      updateTime: 0,
      idleTime: 0,
      fps: 60,
    };
    this.history = [];
    this.maxHistory = 60;
  }
  
  startFrame() {
    this.frameStart = performance.now();
  }
  
  endDraw() {
    this.metrics.drawTime = performance.now() - this.frameStart;
  }
  
  endUpdate() {
    this.metrics.updateTime = performance.now() - this.frameStart - this.metrics.drawTime;
  }
  
  endFrame() {
    const frameEnd = performance.now();
    this.metrics.frameTime = frameEnd - this.frameStart;
    this.metrics.fps = 1000 / this.metrics.frameTime;
    this.metrics.idleTime = Math.max(0, 16.67 - this.metrics.frameTime);
    
    this.history.push({ ...this.metrics });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  getAverages() {
    if (this.history.length === 0) return this.metrics;
    
    return this.history.reduce((acc, m) => ({
      frameTime: acc.frameTime + m.frameTime / this.history.length,
      drawTime: acc.drawTime + m.drawTime / this.history.length,
      updateTime: acc.updateTime + m.updateTime / this.history.length,
      idleTime: acc.idleTime + m.idleTime / this.history.length,
      fps: acc.fps + m.fps / this.history.length,
    }), { frameTime: 0, drawTime: 0, updateTime: 0, idleTime: 0, fps: 0 });
  }
  
  shouldYield() {
    // Yield if we're consistently over budget
    const avg = this.getAverages();
    return avg.idleTime < 2; // Less than 2ms idle = over budget
  }
}
```

### Phase 2: React 18 Full Migration (Future)

This becomes a separate plan after Plan 127 is complete.

**File**: `plans/tooling/129-react-18-concurrent-migration.md`

#### Key Features to Use

1. **`startTransition`**: Mark non-urgent updates
1. **`useDeferredValue`**: Defer expensive calculations
1. **Automatic batching**: Multiple setState calls batched
1. **Concurrent rendering**: Interruptible, priority-based
1. **Suspense boundaries**: Loading states for data

**Example**:
```jsx
import { startTransition, useDeferredValue } from 'react';

function DebugPanel({ world, displayWaves }) {
  const [isPending, startTransition] = useTransition();
  
  // Urgent update (button click)
  const handleToggle = (key, value) => {
    world.debug[key] = value; // Immediate
    localStorage.setItem(key, value); // Immediate
  };
  
  // Deferred update (non-urgent stats)
  const deferredWaves = useDeferredValue(displayWaves);
  const stats = useMemo(() => ({
    setWaves: deferredWaves.filter(w => w.wave.type === 'SET').length,
    bgWaves: deferredWaves.filter(w => w.wave.type === 'BACKGROUND').length,
  }), [deferredWaves]);
  
  return (
    <div className={isPending ? 'pending' : ''}>
      {/* UI here */}
    </div>
  );
}
```

### Phase 3: Web Worker for Heavy Computation (Advanced)

⚠️ **WARNING: Communication Overhead Trade-off**

Web Workers add message-passing overhead that can **outweigh** performance gains for lightweight calculations.

**When Web Workers Make Sense:**
- ✅ Calculations take >10ms per frame
- ✅ Data serialization cost is <20% of compute time
- ✅ Work is parallelizable (no shared state)
- ✅ Results can be batched (not needed every frame)

**When Web Workers DON'T Make Sense:**
- ❌ Calculations take <5ms per frame
- ❌ Data needs cloning (large arrays, nested objects)
- ❌ Results needed synchronously
- ❌ Frequent small messages (postMessage overhead)

**Current Wave Calculations:**
- ~100 waves × 2ms = 0.2ms total (❌ too fast for worker)
- Wave objects are small (~200 bytes)
- Results needed every frame
- **Decision: Stay on main thread for now**

**Future Scenarios Where Workers Help:**
- Pathfinding AI for surfers (10+ ms)
- Fluid dynamics simulation (100+ ms)
- Procedural terrain generation (50+ ms)
- Machine learning inference (50-500ms)

**File**: `src/workers/waveCalculator.worker.js` (only if measurements show >10ms compute)
```js
// Offload wave physics calculations to separate thread
self.addEventListener('message', (e) => {
  const { waves, gameTime, travelDuration } = e.data;
  
  // Calculate wave positions (CPU-intensive)
  const results = waves.map(wave => ({
    id: wave.id,
    progress: (gameTime - wave.spawnTime) / travelDuration,
    y: calculateWaveY(wave, gameTime),
    shouldBreak: shouldBreak(wave, gameTime),
  }));
  
  self.postMessage(results);
});
```

**Before implementing, measure with PerformanceMonitor:**
```js
const monitor = new PerformanceMonitor();

function update(deltaTime) {
  const computeStart = performance.now();
  
  // Wave calculations here
  updateWaves(deltaTime);
  
  const computeTime = performance.now() - computeStart;
  console.log(`Wave compute: ${computeTime.toFixed(2)}ms`);
  
  // Only use Web Worker if compute > 10ms consistently
}
```

**If measurements justify it, then implement:**

**File**: `src/main.js`
```js
const waveWorker = new Worker(new URL('./workers/waveCalculator.worker.js', import.meta.url));

waveWorker.addEventListener('message', (e) => {
  // Update wave positions from worker
  applyWaveUpdates(e.data);
  scheduleRender();
});

function update(deltaTime) {
  // Send work to worker
  waveWorker.postMessage({
    waves: world.waves,
    gameTime: world.gameTime,
    travelDuration,
  });
}
```

## Performance Targets

### Before Optimization
- Frame time: 14-18ms (occasional drops to 30 FPS)
- Button response: 50-100ms (laggy)
- Idle time: 0-2ms (CPU-bound)

### After Phase 1 (Preact + Idle Callbacks)
- Frame time: 10-14ms (consistent 60 FPS)
- Button response: 16-33ms (responsive)
- Idle time: 2-6ms (room for interactions)

### After Phase 2 (React 18 Concurrent)
- Frame time: 8-12ms (smooth 60 FPS)
- Button response: <16ms (instant)
- Idle time: 4-8ms (plenty of headroom)

### After Phase 3 (Web Workers)
- Frame time: 4-8ms (potential for 120 FPS)
- Button response: <16ms (instant)
- Idle time: 8-12ms (future-proof)

## Testing Strategy

### 1. Performance Tests
```js
// vitest
describe('Performance', () => {
  it('button clicks respond within 16ms', async () => {
    const start = performance.now();
    await fireEvent.click(bathymetryButton);
    const end = performance.now();
    expect(end - start).toBeLessThan(16);
  });
  
  it('frame rendering stays under budget', () => {
    const frameStart = performance.now();
    draw();
    const frameEnd = performance.now();
    expect(frameEnd - frameStart).toBeLessThan(12);
  });
});
```

### 2. E2E Performance Tests
```js
// Playwright
test('UI remains responsive during heavy animation', async ({ page }) => {
  await page.goto('/');
  
  // Start animation at 8x speed (heavy load)
  await page.keyboard.press('t');
  await page.keyboard.press('t');
  await page.keyboard.press('t');
  
  // Measure button click latency
  const start = Date.now();
  await page.click('text=Bathymetry');
  const latency = Date.now() - start;
  
  expect(latency).toBeLessThan(50); // 50ms acceptable for E2E
});
```

### 3. Profiling
- Chrome DevTools Performance tab
- React DevTools Profiler (after Phase 2)
- `performance.measure()` API

## Migration Impact

### Phase 1 Changes
- ✅ No breaking changes
- ✅ No new dependencies (uses browser APIs)
- ✅ ~50 lines added to DebugPanel.jsx
- ✅ ~30 lines added to main.js
- ✅ Create `src/performance/monitor.js`

### Phase 2 Changes (Future)
- Switch from Preact to React 18
- Update all components to use React hooks
- Add Concurrent Mode features
- Bundle size increase: 3KB → 45KB (acceptable for desktop game)

### Phase 3 Changes (Optional - Only if Profiling Shows >10ms Compute)
- Create Web Worker for physics calculations
- **Communication overhead**: 0.1-0.5ms per postMessage
- **Serialization overhead**: ~0.01ms per KB of data
- Requires SharedArrayBuffer for zero-copy (some browsers restrict)
- Additional complexity (only if measurements justify)

**Example overhead calculation:**
```
100 waves × 200 bytes = 20KB data
Serialize: 0.01ms/KB × 20KB = 0.2ms
PostMessage: 0.3ms
Total overhead: 0.5ms

Break-even point: Compute must be >0.5ms to benefit
Realistic target: Compute should be >10ms (20× overhead)
```

## Success Criteria

### Phase 1
1. ✅ Button clicks feel instant (<33ms response time)
1. ✅ Stats update smoothly without blocking UI
1. ✅ Frame rate stays at 60 FPS during heavy animation
1. ✅ No visual regressions
1. ✅ All tests pass

### Phase 2 (Future)
1. ✅ React 18 Concurrent Mode enabled
1. ✅ `startTransition` used for non-urgent updates
1. ✅ `useDeferredValue` used for expensive calculations
1. ✅ Button response <16ms consistently
1. ✅ Smooth animations at 60+ FPS

### Phase 3 (Optional - Only If Profiling Justifies)
1. ✅ Web Worker handles wave calculations (only if >10ms compute time)
1. ✅ Main thread freed up for UI interactions
1. ✅ Communication overhead <10% of compute time
1. ✅ Measurements show net performance gain (not overhead loss)

## References

- [React 18 Concurrent Features](https://react.dev/blog/2022/03/29/react-v18)
- [startTransition Documentation](https://react.dev/reference/react/startTransition)
- [useDeferredValue Hook](https://react.dev/reference/react/useDeferredValue)
- [requestIdleCallback API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Plan 127: Declarative UI Layer](127-declarative-ui-layer.md)
- [Plan 121: Wave Timing & Debug Fixes](121-wave-timing-debug-fixes.md)

## Related Plans

- **Plan 127**: Preact UI setup (prerequisite)
- **Plan 129**: React 18 full migration (created by this plan)
- **Plan 130**: TypeScript migration (future)
- **Plan 131**: Three.js + React Three Fiber (future)
