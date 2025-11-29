````markdown
# Plan 127: Declarative UI Layer

## Problem

The current UI implementation is **imperative and tightly coupled** to the rendering loop:

### Current State (`src/main.js`)

1. **Button registration** (lines 164-175):
   - Buttons manually registered each frame with `registerButton()`
   - Click handlers stored in an array
   - Manual hit-testing in canvas click event listener

2. **Button rendering** (lines 459-486):
   - Buttons drawn imperatively in `draw()` function
   - Text measurement, rect drawing, stroke styling all manual
   - State (hover, active) not tracked - just visual appearance

3. **Debug panel** (lines 488-574):
   - All layout hardcoded with pixel positions
   - State display mixed with rendering code
   - No component boundaries or reusability

4. **Toggle state** (lines 140-147):
   - Boolean flags (`showBathymetry`, `showSetWaves`, etc.)
   - Manual localStorage save/load
   - No reactive updates - just read during render

### Problems

- **Tight coupling**: UI logic mixed with rendering
- **No reusability**: Can't extract button as component
- **Manual state sync**: localStorage writes scattered
- **Brittle layout**: Pixel math for positioning
- **No separation of concerns**: Data, rendering, and interaction all intertwined
- **Hard to test**: Can't test UI logic without canvas
- **Maintenance burden**: Adding a new toggle requires touching multiple places

## Proposed Solution: Preact for All UI

**Why Preact**:
- Tiny bundle size (~3KB gzipped) - negligible overhead
- Same API as React - aligns with future React+Three.js migration (Plan 121)
- Fast rendering - perfect for game UI overlays
- Well-maintained and production-ready
- **No special-purpose libraries needed** - one tool for all UI
- Component model makes debug panel reusable and testable

**Why NOT lil-gui**:
- Currently an **unused dependency** (should be removed)
- Adds another library to learn/maintain
- Current canvas debug panel is only ~100 lines - not complex
- Better to use one UI framework (Preact) for everything

**Architecture**:
```
┌────────────────────────────────────────────────┐
│  Canvas (Game Rendering)                       │
│  - Wave simulation                             │
│  - Bathymetry visualization                    │
│  - Foam effects                                │
└────────────────────────────────────────────────┘
                 ↕ (state)
┌────────────────────────────────────────────────┐
│  Preact UI Overlay (HTML/CSS)                  │
│  <DebugPanel>                                  │
│    <ToggleButton label="Bathymetry" />         │
│    <ToggleButton label="Set Waves" />          │
│    <TimeScaleControl />                        │
│    <WaveList waves={displayWaves} />           │
│    <SetLullStatus state={setLullState} />      │
│  </DebugPanel>                                 │
└────────────────────────────────────────────────┘
```

This gives us:
1. **One UI framework** for debug panel AND future game UI
2. **Simple components** - ToggleButton is just a few lines
3. **CSS styling** - full control over appearance
4. **Testable** - can unit test components
5. **Future-ready** - same API when migrating to React+Three.js

## Implementation Plan

### Phase 1: Setup Preact

#### 1.1 Install Preact

```bash
npm install preact
npm uninstall lil-gui  # Remove unused dependency
```

#### 1.2 Create UI Components

**File**: `src/ui/DebugPanel.jsx`
```jsx
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './DebugPanel.css';

export function DebugPanel({ world, displayWaves }) {
  const [, forceUpdate] = useState();
  
  // Re-render every frame to show live updates
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 100);
    return () => clearInterval(interval);
  }, []);

  const sls = world.setLullState;
  const setWaves = displayWaves.filter(w => w.wave.type === 'SET').length;
  const bgWaves = displayWaves.filter(w => w.wave.type === 'BACKGROUND').length;

  return (
    <div class="debug-panel">
      <h3>Wave Simulation Debug</h3>
      
      <Section title="View Layers">
        <Toggle 
          label="🗺️ Bathymetry" 
          checked={world.debug.showBathymetry}
          onChange={v => world.debug.showBathymetry = v}
          hotkey="B"
        />
        <Toggle 
          label="🌊 Set Waves" 
          checked={world.debug.showSetWaves}
          onChange={v => world.debug.showSetWaves = v}
          hotkey="S"
        />
        <Toggle 
          label="🌊 Background" 
          checked={world.debug.showBackgroundWaves}
          onChange={v => world.debug.showBackgroundWaves = v}
          hotkey="G"
        />
      </Section>

      <Section title="Simulation">
        <Select
          label="⏩ Speed"
          value={world.timeScale}
          options={[1, 2, 4, 8]}
          onChange={v => world.timeScale = v}
          hotkey="T"
        />
      </Section>

      <Section title="Wave Status">
        <ReadOnly label="Set Waves" value={setWaves} />
        <ReadOnly label="Background" value={bgWaves} />
        <ReadOnly label="Foam Segments" value={world.foamSegments.length} />
      </Section>

      <Section title="Set/Lull State">
        <ReadOnly label="State" value={`${sls.setState} (${sls.wavesSpawned}/${sls.currentSetWaves})`} />
        <ReadOnly label="Next Wave" value={`${Math.max(0, sls.nextWaveTime - sls.timeSinceLastWave).toFixed(1)}s`} />
        <ReadOnly label="Time Left" value={`${Math.max(0, sls.setDuration - sls.setTimer).toFixed(1)}s`} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <details open>
      <summary>{title}</summary>
      <div class="section-content">{children}</div>
    </details>
  );
}

function Toggle({ label, checked, onChange, hotkey }) {
  return (
    <label class="control">
      <span class="label">
        {label} {hotkey && <kbd>{hotkey}</kbd>}
      </span>
      <input 
        type="checkbox" 
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  );
}

function Select({ label, value, options, onChange, hotkey }) {
  return (
    <label class="control">
      <span class="label">
        {label} {hotkey && <kbd>{hotkey}</kbd>}
      </span>
      <select value={value} onChange={e => onChange(Number(e.target.value))}>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}x</option>
        ))}
      </select>
    </label>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div class="control read-only">
      <span class="label">{label}</span>
      <span class="value">{value}</span>
    </div>
  );
}
```

**File**: `src/ui/DebugPanel.css`
```css
.debug-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  width: 280px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  font-family: monospace;
  font-size: 12px;
  padding: 10px;
  border-radius: 4px;
  z-index: 1000;
}

.debug-panel h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #4a90b8;
}

.debug-panel details {
  margin-bottom: 8px;
}

.debug-panel summary {
  cursor: pointer;
  padding: 4px;
  background: rgba(74, 144, 184, 0.2);
  border-radius: 2px;
  user-select: none;
}

.debug-panel summary:hover {
  background: rgba(74, 144, 184, 0.3);
}

.section-content {
  padding: 8px 4px;
}

.control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.control .label {
  flex: 1;
}

.control kbd {
  font-size: 10px;
  padding: 2px 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-left: 4px;
}

.control input[type="checkbox"],
.control select {
  margin-left: 8px;
}

.read-only {
  color: #aaa;
}

.read-only .value {
  font-weight: bold;
}
```

#### 1.3 Update main.js

**File**: `src/main.js`
```js
import { render, h } from 'preact';
import { DebugPanel } from './ui/DebugPanel.jsx';

// Move debug toggles to world.debug
const world = {
  // ... existing world state ...
  debug: {
    showBathymetry: localStorage.getItem('showBathymetry') === 'true',
    showSetWaves: localStorage.getItem('showSetWaves') !== 'false',
    showBackgroundWaves: localStorage.getItem('showBackgroundWaves') !== 'false',
  },
};

// Create UI container
const uiContainer = document.createElement('div');
document.body.appendChild(uiContainer);

// Render Preact UI (will re-render automatically)
function renderUI() {
  const displayWaves = world.waves
    .map(wave => ({
      wave,
      progress: getWaveProgress(wave, world.gameTime, travelDuration)
    }))
    .filter(({ progress }) => progress < 1);
    
  render(h(DebugPanel, { world, displayWaves }), uiContainer);
}

// In draw() function
function draw() {
  // ... existing rendering code ...

  // Remove all debug panel drawing code (lines 459-574)
  // Remove button drawing and registration (lines 459-486)
  
  // Render UI at end of frame
  renderUI();
}

// Keep keyboard handlers - they work with Preact components too
// The DebugPanel will reactively update when world.debug changes
```

#### 1.4 Update index.html

Add Vite's JSX support is automatic, but make sure your `vite.config.js` has:

**File**: `vite.config.js` (create if needed)
```js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'preact'`
  }
});
```

## Benefits

- ✅ **One framework** - Preact for all UI needs (debug + game)
- ✅ **Declarative** - Components instead of imperative drawing
- ✅ **Less code** - ~150 lines deleted from main.js
- ✅ **Better UX** - Collapsible sections, clean styling
- ✅ **Separation of concerns** - UI logic in components, not render loop
- ✅ **Component model** - Reusable Toggle, Select, ReadOnly components
- ✅ **Testable** - Can unit test components separately
- ✅ **Flexible layout** - CSS instead of canvas pixel math
- ✅ **Rich interactions** - Forms, animations, transitions
- ✅ **Migration path** - Same API as React for Three.js integration
- ✅ **Remove dead dependency** - Uninstall unused lil-gui

## Migration Impact

### Dependencies
```bash
npm install preact @preact/preset-vite
npm uninstall lil-gui
```

### Files Changed
- `src/main.js` - Remove ~200 lines of debug/button code
- `src/ui/DebugPanel.jsx` - New file (~120 lines)
- `src/ui/DebugPanel.css` - New file (~80 lines)
- `vite.config.js` - Add Preact plugin
- `package.json` - Add preact, remove lil-gui

### Files Deleted
- None (button system removal is just code deletion)

### Breaking Changes
- None - visual appearance changes but functionality identical
- Keyboard shortcuts remain (components read world.debug directly)

### Testing Impact
- Existing tests should pass unchanged (no game logic changes)
- Can add new tests for UI components using @testing-library/preact

## Success Criteria

1. ✅ Debug panel appears as Preact component overlay
2. ✅ All toggles work (bathymetry, waves, background)
3. ✅ Time scale control works
4. ✅ Wave counts update in real-time
5. ✅ Set/lull state info displays correctly
6. ✅ Collapsible sections work (native `<details>` element)
7. ✅ Keyboard shortcuts still work (components react to world.debug changes)
8. ✅ No visual regressions in game rendering
9. ✅ lil-gui removed from package.json

## Future Enhancements

### After this plan:

1. **Wave detail panel** - Expandable list showing each wave's properties
2. **Bathymetry editor** - GUI controls to adjust ocean floor shape
3. **Preset manager** - Save/load different simulation configurations
4. **Performance metrics** - FPS, draw calls, memory usage
5. **Recording mode** - Capture/replay simulation states

### Next Plans (Performance & React Migration):

- **Plan 128: React Performance Optimization** - Fix laggy button clicks with concurrent features
  - Phase 1: Preact + manual time-slicing (immediate fix)
  - Phase 2: React 18 Concurrent Mode (future upgrade)
  - Addresses: Laggy UI during animations
  
- **Plan 129: React 18 Concurrent Migration** - Full React 18 upgrade
  - Automatic concurrency & priority scheduling
  - `startTransition`, `useDeferredValue` hooks
  - Zustand state management
  - Prerequisite for React Three Fiber

- **Plan 131: React Three Fiber Migration** - Canvas 2D → WebGL
  - Three.js for 3D rendering
  - React components for scene graph
  - Shader-based water effects
  
- **Plan 130: TypeScript Migration** - Type safety for growing codebase

## Why This Is Simple

The debug panel is just a few small components:
- **Toggle** - checkbox with label (~5 lines)
- **Select** - dropdown (~5 lines)  
- **ReadOnly** - label + value display (~3 lines)
- **Section** - collapsible folder using native `<details>` (~4 lines)

Total: **~120 lines of JSX** to replace **~200 lines of canvas drawing code**, plus you get:
- Better separation of concerns
- Reusable components
- CSS styling
- One framework for all UI

**No library needed for "making a panel"** - just simple Preact components!

## References

- [Preact Documentation](https://preactjs.com/)
- [Plan 121: Wave Timing & Debug Fixes](121-wave-timing-debug-fixes.md) - Previous discussion of React migration
- [Plan 10: 3D Scene Debugger](10-debugger.md) - Original debug vision (for future 3D work)

````
