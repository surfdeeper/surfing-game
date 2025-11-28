# Plan 129: React 18 Concurrent Mode Migration

## Prerequisites

- ✅ Plan 127: Declarative UI Layer (Preact)
- ✅ Plan 128: React Performance Optimization (Phase 1)
- ✅ Plan 123: Time-Based Wave Model (for state purity)

## Problem

While Preact with manual optimizations (Plan 128 Phase 1) fixes immediate lag issues, a full **React 18 migration** unlocks:

1. **Automatic concurrency**: No manual `requestIdleCallback` needed
2. **Priority-based rendering**: Built-in scheduling for urgent vs. non-urgent updates
3. **Suspense for data loading**: Future-proof for server data, multiplayer
4. **Better DevTools**: React DevTools Profiler for performance debugging
5. **React Three Fiber compatibility**: Future 3D rendering (Plan 131)

## Architecture: React 18 Concurrent Mode

### Concurrent Rendering Pipeline

```
┌────────────────────────────────────────────────────┐
│  User Event (Button Click)                         │
│  Priority: Urgent                                  │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  React 18 Scheduler                                │
│  - Assigns priority to updates                     │
│  - Urgent: UI interactions (immediate)             │
│  - Transition: Non-critical updates (deferrable)   │
│  - Deferred: Expensive computations (low priority) │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  Concurrent Rendering Engine                       │
│  - Time-slices work into 5ms chunks                │
│  - Yields to browser between chunks                │
│  - Interrupts low-priority work for urgent updates │
│  - Resumes work when idle                          │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│  Commit Phase (Synchronous)                        │
│  - Apply DOM updates                               │
│  - Run effects                                     │
│  - Batched automatically                           │
└────────────────────────────────────────────────────┘
```

### Priority Levels

| Priority | Examples | Max Delay | Interruptible |
|----------|----------|-----------|---------------|
| **Immediate** | Click, input, keyboard | <16ms | No |
| **Urgent** | Hover, scroll | <50ms | No |
| **Normal** | Data fetch response | <100ms | Yes |
| **Low** | Analytics, background tasks | <500ms | Yes |
| **Idle** | Prefetching, cleanup | Whenever | Yes |

## Implementation Plan

### Phase 1: Migrate Dependencies

#### 1.1 Replace Preact with React 18

**File**: `package.json`
```bash
npm uninstall preact @preact/preset-vite
npm install react@^18.3.0 react-dom@^18.3.0
npm install --save-dev @vitejs/plugin-react
```

**File**: `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

#### 1.2 Update Import Statements

Replace all Preact imports with React:

**File**: `src/ui/DebugPanel.jsx`
```jsx
// Before (Preact)
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

// After (React)
import { useState, useEffect, useRef } from 'react';
```

**File**: `src/main.js`
```js
// Before (Preact)
import { render, h } from 'preact';

// After (React)
import { createRoot } from 'react-dom/client';
```

### Phase 2: Enable Concurrent Mode

#### 2.1 Use Concurrent Root

**File**: `src/main.js`
```js
import { createRoot } from 'react-dom/client';
import { DebugPanel } from './ui/DebugPanel.jsx';

// Create concurrent root (React 18)
const uiContainer = document.getElementById('ui-root') || (() => {
  const div = document.createElement('div');
  div.id = 'ui-root';
  document.body.appendChild(div);
  return div;
})();

const root = createRoot(uiContainer); // Concurrent mode enabled!

// Render function
function renderUI() {
  const displayWaves = world.waves
    .map(wave => ({
      wave,
      progress: getWaveProgress(wave, world.gameTime, travelDuration)
    }))
    .filter(({ progress }) => progress < 1);
    
  root.render(<DebugPanel world={world} displayWaves={displayWaves} />);
}
```

#### 2.2 Add Global State Management

**File**: `src/state/gameState.js`
```js
// Centralized game state for React
import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Game time
  gameTime: 0,
  timeScale: 1,
  
  // Waves
  waves: [],
  foamSegments: [],
  
  // Set/Lull state
  setLullState: createInitialState(),
  backgroundState: createInitialBackgroundState(),
  
  // Debug toggles
  debug: {
    showBathymetry: localStorage.getItem('showBathymetry') === 'true',
    showSetWaves: localStorage.getItem('showSetWaves') !== 'false',
    showBackgroundWaves: localStorage.getItem('showBackgroundWaves') !== 'false',
  },
  
  // Actions
  updateGameTime: (time) => set({ gameTime: time }),
  setTimeScale: (scale) => {
    set({ timeScale: scale });
    localStorage.setItem('timeScale', scale);
  },
  toggleDebug: (key) => set((state) => {
    const newValue = !state.debug[key];
    localStorage.setItem(key, newValue);
    return { debug: { ...state.debug, [key]: newValue } };
  }),
  addWave: (wave) => set((state) => ({ waves: [...state.waves, wave] })),
  updateWaves: (waves) => set({ waves }),
  // ... other actions
}));
```

**Install Zustand**:
```bash
npm install zustand
```

**Why Zustand**:
- Tiny (1KB)
- Simple API
- Works great with React 18 Concurrent Mode
- No provider hell
- Easy to test

### Phase 3: Add Concurrent Features

#### 3.1 Use `startTransition` for Non-Urgent Updates

**File**: `src/ui/DebugPanel.jsx`
```jsx
import { useState, useTransition, useMemo } from 'react';
import { useGameStore } from '../state/gameState';

export function DebugPanel({ displayWaves }) {
  const [isPending, startTransition] = useTransition();
  const debug = useGameStore(state => state.debug);
  const toggleDebug = useGameStore(state => state.toggleDebug);
  const timeScale = useGameStore(state => state.timeScale);
  const setTimeScale = useGameStore(state => state.setTimeScale);
  
  // Urgent update: toggle immediately
  const handleToggle = (key) => {
    toggleDebug(key); // No transition needed - urgent!
  };
  
  // Non-urgent update: time scale can wait
  const handleTimeScaleChange = (value) => {
    startTransition(() => {
      setTimeScale(value);
    });
  };
  
  return (
    <div className={`debug-panel ${isPending ? 'updating' : ''}`}>
      {/* UI components */}
    </div>
  );
}
```

#### 3.2 Use `useDeferredValue` for Expensive Calculations

**File**: `src/ui/DebugPanel.jsx`
```jsx
import { useDeferredValue, useMemo } from 'react';

export function DebugPanel({ displayWaves }) {
  // Defer expensive wave calculations
  const deferredWaves = useDeferredValue(displayWaves);
  
  const waveStats = useMemo(() => {
    // This computation can be deferred if UI is busy
    const setWaves = deferredWaves.filter(w => w.wave.type === 'SET').length;
    const bgWaves = deferredWaves.filter(w => w.wave.type === 'BACKGROUND').length;
    const breakingWaves = deferredWaves.filter(w => w.wave.isBreaking).length;
    
    return { setWaves, bgWaves, breakingWaves };
  }, [deferredWaves]);
  
  return (
    <Section title="Wave Status">
      <ReadOnly label="Set Waves" value={waveStats.setWaves} />
      <ReadOnly label="Background" value={waveStats.bgWaves} />
      <ReadOnly label="Breaking" value={waveStats.breakingWaves} />
    </Section>
  );
}
```

#### 3.3 Add Suspense Boundaries (Future-Ready)

**File**: `src/main.js`
```jsx
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <DebugPanel />
    </Suspense>
  );
}

function LoadingPanel() {
  return <div className="debug-panel loading">Loading...</div>;
}
```

Enables future features:
- Lazy-loaded components
- Data fetching with Suspense
- Multiplayer state synchronization

### Phase 4: Optimize Rendering with React 18 Features

#### 4.1 Automatic Batching

React 18 automatically batches updates - no code changes needed!

```jsx
// Before React 18: Two re-renders
setCount(c => c + 1);
setFlag(f => !f);

// React 18: One re-render (automatic batching)
setCount(c => c + 1);
setFlag(f => !f);
// ✅ Batched automatically, even in async callbacks!
```

#### 4.2 Add `useId` for Stable IDs

**File**: `src/ui/DebugPanel.jsx`
```jsx
import { useId } from 'react';

function Toggle({ label, checked, onChange }) {
  const id = useId(); // Stable, unique ID
  
  return (
    <label className="control" htmlFor={id}>
      <span className="label">{label}</span>
      <input 
        id={id}
        type="checkbox" 
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  );
}
```

Benefits:
- Accessibility (label/input association)
- No key warnings
- SSR-safe (future server rendering)

#### 4.3 Performance Monitoring with Profiler

**File**: `src/ui/DevTools.jsx`
```jsx
import { Profiler } from 'react';

export function DebugPanelWithProfiler({ displayWaves }) {
  const onRender = (id, phase, actualDuration) => {
    if (actualDuration > 16) {
      console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms`);
    }
  };
  
  return (
    <Profiler id="DebugPanel" onRender={onRender}>
      <DebugPanel displayWaves={displayWaves} />
    </Profiler>
  );
}
```

### Phase 5: Game Loop Integration

#### 5.1 Sync Game State with React

**File**: `src/main.js`
```js
import { flushSync } from 'react-dom';

function update(deltaTime) {
  const scaledDelta = deltaTime * timeScale;
  
  // Update game state
  world.gameTime += scaledDelta;
  world.setLullState = updateSetLullState(world.setLullState, scaledDelta);
  
  // ... wave updates ...
  
  // Sync to React store (batched automatically)
  useGameStore.setState({
    gameTime: world.gameTime,
    waves: world.waves,
    foamSegments: world.foamSegments,
    setLullState: world.setLullState,
  });
}

function draw() {
  // Canvas rendering (unchanged)
  ctx.clearRect(0, 0, w, h);
  // ... draw waves, foam, etc ...
  
  // React UI renders automatically when store updates
  // No manual renderUI() call needed!
}
```

#### 5.2 Separate Render Cycles

Canvas and React have **independent render cycles**:

```
┌──────────────────────────────────────────┐
│  requestAnimationFrame (Canvas - 60 FPS) │
│  - Update physics                        │
│  - Draw canvas layers                    │
│  - Update Zustand store                  │
└──────────────────────────────────────────┘
                  │
                  ▼ (triggers)
┌──────────────────────────────────────────┐
│  React Concurrent Render (UI - Variable)│
│  - Reads from Zustand store              │
│  - Renders UI components                 │
│  - Defers non-urgent updates             │
│  - Batches DOM commits                   │
└──────────────────────────────────────────┘
```

This separation ensures:
- Canvas animations always run at 60 FPS
- UI updates don't block canvas rendering
- React can defer non-urgent UI updates
- User interactions get highest priority

## Testing Strategy

### 1. Unit Tests (No Changes)

Existing tests continue to work - React 18 is backward compatible:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DebugPanel } from './DebugPanel';

test('toggle updates immediately', () => {
  const { getByLabelText } = render(<DebugPanel displayWaves={[]} />);
  const checkbox = getByLabelText(/bathymetry/i);
  
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
});
```

### 2. Concurrent Mode Tests

```jsx
import { act } from '@testing-library/react';

test('non-urgent updates are deferrable', async () => {
  const { rerender } = render(<DebugPanel displayWaves={waves1} />);
  
  // Trigger urgent update
  act(() => {
    fireEvent.click(screen.getByText('Bathymetry'));
  });
  
  // Trigger non-urgent update
  act(() => {
    rerender(<DebugPanel displayWaves={waves2} />);
  });
  
  // Urgent update should complete first
  expect(screen.getByText(/ON/)).toBeInTheDocument();
});
```

### 3. Performance Regression Tests

```jsx
import { Profiler } from 'react';

test('render time stays under 16ms', (done) => {
  const onRender = (id, phase, actualDuration) => {
    expect(actualDuration).toBeLessThan(16);
    done();
  };
  
  render(
    <Profiler id="test" onRender={onRender}>
      <DebugPanel displayWaves={largeWaveSet} />
    </Profiler>
  );
});
```

## Performance Targets

### Metrics After Migration

| Metric | Before (Preact) | After (React 18) | Improvement |
|--------|----------------|------------------|-------------|
| Button click latency | 30-50ms | <16ms | 2-3x faster |
| Frame time (avg) | 12-14ms | 8-12ms | 15-30% faster |
| FPS (under load) | 50-60 | 60 (locked) | 20% smoother |
| Bundle size | 3KB | 45KB | +42KB (acceptable) |
| Memory usage | ~5MB | ~8MB | +3MB (acceptable) |

### Why Bundle Size Increase Is OK

- Game runs on desktop/modern browsers (not low-end mobile)
- 45KB gzipped is negligible on broadband
- Performance gains outweigh size cost
- Enables future features (R3F, Suspense, etc.)

## Migration Checklist

### Pre-Migration
- [ ] Complete Plan 127 (Preact UI)
- [ ] Complete Plan 128 Phase 1 (manual optimizations)
- [ ] Run all tests, confirm passing
- [ ] Measure current performance (baseline)

### Migration Steps
- [ ] Install React 18 dependencies
- [ ] Remove Preact dependencies
- [ ] Update vite.config.js
- [ ] Update import statements (preact → react)
- [ ] Replace `render()` with `createRoot()`
- [ ] Install Zustand for state management
- [ ] Migrate global state to Zustand store
- [ ] Add `startTransition` for non-urgent updates
- [ ] Add `useDeferredValue` for expensive calculations
- [ ] Add Profiler for performance monitoring
- [ ] Update tests to use @testing-library/react
- [ ] Run all tests, confirm passing
- [ ] Measure new performance (verify improvement)

### Post-Migration
- [ ] Document performance improvements
- [ ] Add React DevTools to recommended extensions
- [ ] Create performance regression tests
- [ ] Plan for React Three Fiber migration (Plan 131)

## Success Criteria

1. ✅ All Preact code migrated to React 18
2. ✅ Concurrent Mode enabled (createRoot)
3. ✅ Button clicks respond <16ms consistently
4. ✅ Frame rate locked at 60 FPS
5. ✅ `startTransition` used for non-urgent updates
6. ✅ `useDeferredValue` used for expensive calculations
7. ✅ All tests passing
8. ✅ No visual regressions
9. ✅ Performance metrics improved vs. baseline
10. ✅ React DevTools Profiler shows optimal rendering

## Future Enhancements

After React 18 migration is complete:

### Plan 130: TypeScript Migration
- Add type safety
- Catch bugs at compile time
- Better IDE support

### Plan 131: React Three Fiber (R3F)
- Migrate from Canvas 2D to WebGL
- Use Three.js for 3D rendering
- React components for 3D objects
- Shader-based water effects

### Plan 132: Server Components (Future)
- Multiplayer server-side rendering
- Real-time state synchronization
- Reduced client bundle size

## References

- [React 18 Release Notes](https://react.dev/blog/2022/03/29/react-v18)
- [Concurrent Features](https://react.dev/reference/react)
- [startTransition](https://react.dev/reference/react/startTransition)
- [useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [Plan 127: Declarative UI Layer](127-declarative-ui-layer.md)
- [Plan 128: React Performance Optimization](128-react-performance-optimization.md)
- [Plan 131: React Three Fiber Migration](../visuals/131-react-three-fiber-migration.md) (to be created)

## Related Plans

- **Plan 127**: Preact setup (prerequisite)
- **Plan 128**: Performance optimization (prerequisite)
- **Plan 130**: TypeScript migration (parallel)
- **Plan 131**: React Three Fiber (next step)
