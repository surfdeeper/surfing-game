# Plan 200: MDX-Based Visual Documentation System

Status: ✅ COMPLETE (All phases done)
Owner: agents
Depends on: none
Supersedes: Ladle/Storybook for component visualization

## Summary

Replaced Ladle with a minimal MDX-based viewer built on Vite. The new system:
- Imports progressions directly from test files (single source of truth)
- Provides animated playback with play/pause/speed controls
- Shows static frame strips for quick comparison
- Uses ~50 lines of config vs Storybook's complexity
- Removed 142 packages (Ladle dependencies)

**Usage:**
```bash
npm run stories        # Start dev server at :3001
npm run stories:build  # Build static site
```

**Files created:**
```
stories/
├── index.html
├── main.tsx
├── App.tsx
├── energy-field.mdx           # MDX doc with prose + component imports
└── components/
    └── ProgressionPlayer.tsx  # Animated player + static strip
vite.stories.config.ts         # Vite config for MDX
```

---

## Problem

Ladle has run its course. We need:
1. Documentation alongside visual screenshots (not just isolated component previews)
1. Tight coupling between unit tests and visual output
1. No interactive controls cluttering the view - just static frames with prose
1. Animated GIFs to show time progressions without requiring interaction

Current pain points:
- Stories lack context - just canvas renders with no explanation
- Can't easily document what each visualization demonstrates
- Ladle doesn't support MDX natively
- Ad hoc duplication of timeline progressions and text patterns in each story
- No way to see animations - only static frame strips

## Vision

A minimal MDX-based documentation system built on Vite that:
1. Renders `.mdx` files that mix prose with React components
1. Imports test matrices directly from unit test files
1. Generates static documentation pages with navigation
1. Zero interactive widgets - pure documentation
1. Animated playback of timeline progressions (rendered live, not pre-baked GIFs)

### Core Testing Framework

The timeline progression system should be part of a core testing framework, not ad hoc code in each test file:

```javascript
// src/test-utils/progression.js

/**
 * Run a simulation and capture snapshots at specified times
 */
export function captureProgression(options) {
  const {
    initialMatrix,
    updateFn,        // (field, dt) => void
    captureTimes,    // [0, 1, 2, 3, 4, 5]
    dt = 1/60,
  } = options;

  const field = createFieldFromMatrix(initialMatrix);
  const snapshots = [];
  // ... simulation loop capturing at each time
  return snapshots;
}

/**
 * Render a progression to canvas frames (for GIF generation)
 */
export function renderProgressionFrames(snapshots, renderFn, options) {
  const { width, height, frameDelay = 500 } = options;
  return snapshots.map(snapshot => ({
    imageData: renderToCanvas(snapshot.matrix, renderFn, width, height),
    delay: frameDelay,
    label: snapshot.label,
  }));
}

/**
 * Generate animated GIF from progression frames
 */
export async function progressionToGif(snapshots, renderFn, options) {
  const frames = renderProgressionFrames(snapshots, renderFn, options);
  return encodeGif(frames); // Returns Uint8Array or data URL
}
```

### Animated Playback Component

Timeline progressions can be played back as animations directly in the browser.
No pre-baked GIFs needed - the component renders each frame live:

```jsx
// docs/components/Visuals.jsx

/**
 * Animated playback of a progression with play/pause and speed controls
 */
export function ProgressionPlayer({ snapshots, renderFn, options = {} }) {
  const {
    width = 200,
    height = 240,
    frameDelay = 500,  // ms between frames
    autoPlay = true,
    loop = true,
  } = options;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1); // 0.5x, 1x, 2x

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setFrameIndex(i => {
        const next = i + 1;
        if (next >= snapshots.length) {
          return loop ? 0 : i;
        }
        return next;
      });
    }, frameDelay / speed);
    return () => clearInterval(interval);
  }, [playing, speed, frameDelay, loop, snapshots.length]);

  const snapshot = snapshots[frameIndex];

  return (
    <div>
      <MatrixCanvas matrix={snapshot.matrix} label={snapshot.label} />
      <div className="player-controls">
        <button onClick={() => setPlaying(!playing)}>
          {playing ? '⏸' : '▶'}
        </button>
        <span>{snapshot.label}</span>
        <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
        </select>
      </div>
    </div>
  );
}
```

### Three-Layer Test Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: Unit Tests (Vitest)                                       │
│  energyFieldPropagation.test.js                                     │
│                                                                     │
│  - Tests data model logic (propagation, damping, drain)             │
│  - Asserts on matrix values at specific time points                 │
│  - MUST pass before visual tests run                                │
│  - Exports: defineProgression() with structured metadata            │
│                                                                     │
│  export const PROGRESSION_NO_DAMPING = defineProgression({          │
│    id: 'energy-field/no-damping',                                   │
│    description: 'No damping (deep water)',                          │
│    initialMatrix: [...],                                            │
│    updateFn: (field, dt) => updateEnergyField(field, ...),          │
│    captureTimes: [0, 1, 2, 3, 4, 5],                                 │
│    renderFn: renderEnergyField,                                     │
│  });                                                                 │
│                                                                     │
│  it('energy propagates to row 3 by t=3s', () => {                   │
│    const snapshots = PROGRESSION_NO_DAMPING.snapshots;              │
│    expect(snapshots[3].matrix[3][2]).toBeGreaterThan(0.2);          │
│  });                                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ MUST PASS
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: Visual Regression Tests                                   │
│  npm run test:visual                                                │
│                                                                     │
│  1. Runs unit tests first - short circuits if any fail              │
│  2. Discovers all defineProgression() exports                       │
│  3. For each progression:                                           │
│     - Renders all frames using renderFn                             │
│     - Encodes as single animated GIF                                │
│     - Compares frame-by-frame against baseline                      │
│  4. Generates HTML report on failure                                │
│                                                                     │
│  Key insight: If unit tests fail, we know the DATA is wrong.        │
│  Visual tests only run when data is correct, isolating RENDER bugs. │
└─────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌───────────────────┐ ┌─────────────┐ ┌───────────────────┐
│  Baseline Storage │ │  HTML Report│ │  MDX Presentation │
│                   │ │             │ │                   │
│  baselines/       │ │  Shows diff │ │  <Progression     │
│    energy-field/  │ │  per frame, │ │    id="..."    /> │
│      no-damping.  │ │  opens in   │ │                   │
│        gif        │ │  browser    │ │  Looks up by ID,  │
│                   │ │             │ │  renders strip or │
│  One GIF per      │ │  Frame-level│ │  animated player  │
│  progression      │ │  diffing    │ │                   │
└───────────────────┘ └─────────────┘ └───────────────────┘
```

### Why Unit Tests Gate Visual Tests

```
$ npm run test:visual

Step 1: Running unit tests...

  ✗ energyFieldPropagation.test.js
    ✗ energy propagates to row 3 by t=3s
      Expected: > 0.2
      Received: 0.05

Unit tests failed. Skipping visual regression tests.

Fix the data model first - visual tests would give misleading results.
Run 'npm test' to debug unit test failures.
```

This prevents:
- Wasting time rendering when the underlying data is broken
- Misdiagnosing data bugs as rendering bugs
- AI agents chasing phantom visual issues when the real bug is in the model

Only when unit tests pass:
```
$ npm run test:visual

Step 1: Running unit tests... ✓ All passed

Step 2: Running visual regression tests...

  ✓ energy-field/no-damping (6 frames)
  ✓ energy-field/with-damping (6 frames)
  ✗ energy-field/drain (6 frames)
    Frame 2 (t=2s): 4.2% pixel diff (threshold: 1%)

Report: file:///path/to/visual-report.html
```

### Terminal Output + File Links

For MVP, the report is terminal-based with links to image files:

```
$ npm run test:visual

Step 1: Running unit tests... ✓ All passed

Step 2: Running visual regression tests...

  ✓ energy-field/no-damping (6 frames)
  ✓ energy-field/with-damping (6 frames)
  ✗ energy-field/drain (6 frames)
    Frame 2 (t=2s): 4.2% pixel diff (threshold: 1%)

    Baseline: test-results/energy-field/drain/baseline.gif
    Current:  test-results/energy-field/drain/current.gif
    Diff:     test-results/energy-field/drain/diff-frame-2.png

  To accept new baseline:
    npm run test:visual:update energy-field/drain

1 of 3 progressions failed.
```

Output files:
- `test-results/{id}/baseline.gif` - copy of baseline for easy viewing
- `test-results/{id}/current.gif` - what was just rendered
- `test-results/{id}/diff-frame-N.png` - pixel diff for each failing frame

### Baseline Commands

```bash
# Update all baselines
npm run test:visual:update

# Update specific progression
npm run test:visual:update energy-field/drain
```

### Future: Rich HTML Report (Plan 201)

A future plan could add a React-based report viewer with:
- Frame-by-frame scrubber
- Side-by-side diff overlay
- Animated playback of baseline vs current
- Accept buttons that call back to CLI

This is out of scope for the MVP.

## Architecture

```
docs/
├── index.mdx                    # Entry point / table of contents
├── energy-field/
│   ├── propagation.mdx          # Imports from energyFieldPropagation.test.js
│   ├── damping.mdx
│   └── drain.mdx
├── foam/
│   ├── contours.mdx
│   └── dispersion.mdx
└── components/
    └── MatrixCanvas.jsx         # Shared visualization components
```

### MDX File Example

```mdx
# Energy Field Propagation

The energy field uses a simple row-blending algorithm to propagate
energy from horizon (row 0) to shore (row N).

## No Damping (Deep Water)

With `depthDampingCoefficient=0`, energy maintains magnitude as it travels:

import { PROGRESSION_NO_DAMPING } from '../../src/state/energyFieldPropagation.test.js';
import { ProgressionStrip } from '../components/MatrixCanvas.jsx';

<ProgressionStrip snapshots={PROGRESSION_NO_DAMPING} />

Notice how the total energy remains constant across all frames.

## With Damping

Setting `depthDampingCoefficient=0.1` causes decay in shallow water:

import { PROGRESSION_WITH_DAMPING } from '../../src/state/energyFieldPropagation.test.js';

<ProgressionStrip snapshots={PROGRESSION_WITH_DAMPING} />

The formula is: `energy *= exp(-coefficient * dt / depth^exponent)`
```

## Implementation

### Dependencies

```json
{
  "@mdx-js/rollup": "^3.0.0",
  "@mdx-js/react": "^3.0.0"
}
```

### Vite Config

```javascript
// vite.docs.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const mdx = await import('@mdx-js/rollup');
  return {
    root: 'docs',
    plugins: [
      react(),
      mdx.default({ providerImportSource: '@mdx-js/react' }),
    ],
    build: {
      outDir: '../dist-docs',
    },
  };
});
```

### Package Scripts

```json
{
  "scripts": {
    "docs": "vite --config vite.docs.config.js",
    "docs:build": "vite build --config vite.docs.config.js"
  }
}
```

### Navigation Component

Simple sidebar generated from file structure:

```jsx
// docs/components/Layout.jsx
export function Layout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <nav style={{ width: 200, padding: 16 }}>
        <h3>Energy Field</h3>
        <ul>
          <li><a href="/energy-field/propagation">Propagation</a></li>
          <li><a href="/energy-field/damping">Damping</a></li>
          <li><a href="/energy-field/drain">Drain</a></li>
        </ul>
        <h3>Foam</h3>
        <ul>
          <li><a href="/foam/contours">Contours</a></li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: 16 }}>
        {children}
      </main>
    </div>
  );
}
```

## Migration Path

1. Keep existing Ladle stories working during transition
1. Create `docs/` directory with MDX equivalents
1. Move visualization components to `docs/components/`
1. Import test data directly from `*.test.js` files
1. Once complete, remove Ladle dependency

## Implementation Steps

### Phase 1: Core Testing Framework ✅ COMPLETE

| Step | Task | Status |
|------|------|--------|
| 1 | Create `src/test-utils/progression.js` with defineProgression() | ✅ Done |
| 2 | Create `src/test-utils/matrixField.js` for matrix↔field conversion | ✅ Done |
| 3 | Refactor energyFieldPropagation.test.js to use defineProgression() | ✅ Done |
| 4 | Unit tests assert on snapshot matrix values | ✅ Done |
| 5 | **Tests for test utilities** (matrixField.test.js, progression.test.js) | ✅ Done |

**Phase 1 Deliverables:**

```
src/test-utils/
├── index.js                # Main exports
├── matrixField.js          # Matrix↔field conversion (29 tests)
├── matrixField.test.js     # Tests for conversion utilities
├── progression.js          # defineProgression() framework (24 tests)
└── progression.test.js     # Tests for progression framework
```

**Why test utilities need tests:**

Test utilities are foundational - if they're broken, the entire test suite becomes
untrustworthy. A bug in `matrixToField()` could silently corrupt all snapshot data.
A bug in `captureSnapshots()` could skip time points. Tests for test utilities are
not optional overhead - they're the foundation of test trustworthiness.

See `.claude/skills/testing/SKILL.md` for the full testing policy.

**Verification:**
```bash
npx vitest run src/test-utils/   # 53 tests pass
npx vitest run src/state/energyFieldPropagation.test.js  # 9 tests pass
```

### Phase 1.5: Matrix Data Verification ✅ COMPLETE

**Why this phase is needed:**

Phase 1 tests the progression *framework* (defineProgression, captureSnapshots, etc.).
But it doesn't verify that the *actual progression matrices* exported from test files
are correct. The current unit tests only spot-check a few cells (e.g., `matrix[2][2] > 0.2`).

When Phase 2 attempted GIF encoding, corrupt output could have been caused by:
1. GIF encoding bugs (encoding layer)
1. Canvas rendering bugs (render layer)
1. Wrong matrix data (data layer)

Without verifying the exact matrices, we can't isolate which layer failed.

**The fix:** Add snapshot tests that capture the full matrix output for each
progression. This creates a clear data correctness gate before any rendering.

| Step | Task | Status |
|------|------|--------|
| 5a | Add matrix snapshot tests for PROGRESSION_NO_DAMPING | ✅ Done |
| 5b | Add matrix snapshot tests for PROGRESSION_WITH_DAMPING | ✅ Done |
| 5c | Add matrix snapshot tests for PROGRESSION_HIGH_DAMPING | ✅ Done |
| 5d | Add matrix snapshot tests for PROGRESSION_WITH_DRAIN | ✅ Done |

**Implementation:** Compact ASCII format inspired by RxJS marble testing.

Instead of verbose Vitest snapshots (1000+ lines), we use inline ASCII diagrams:

```typescript
// In energyFieldPropagation.test.ts

it('PROGRESSION_NO_DAMPING produces expected matrices', () => {
  // Deep water: energy maintains magnitude as it travels
  const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  22222  33333
`.trim();
  expect(progressionToAscii(PROGRESSION_NO_DAMPING.snapshots)).toBe(expected);
});
```

**Character legend:**
- `-` = 0.0 (no energy)
- `1-4` = 0.1-0.4
- `A-B` = 0.5-0.6
- `F` = 1.0 (full energy)

**Why ASCII over Vitest snapshots:**
- **Readable**: Energy propagation is visually obvious (F→B→4→2→1)
- **Compact**: 7 lines vs 1000+ line snapshot file
- **Inline**: Expected values live in the test, not external files
- **Diffable**: Changes show exactly which cells changed
- **Inspired by RxJS marbles**: Proven pattern for time-based testing

**Utilities added:** `src/test-utils/asciiMatrix.ts`
- `matrixToAscii()` / `asciiToMatrix()` - single matrix conversion
- `progressionToAscii()` - multi-frame side-by-side format
- `matricesMatchAscii()` - compare within ASCII precision

### Phase 2: Visual Regression Infrastructure ✅ COMPLETE

**Prerequisite:** Phase 1.5 ✅ complete - matrix data is now verified by snapshots.

**Approach:** Use Playwright to screenshot film strips (one PNG per progression).
GIF encoding deferred to future plan (203).

| Step | Task | Status |
|------|------|--------|
| 6 | Create Playwright test that visits stories page | ✅ Done |
| 7 | Screenshot each ProgressionStrip as a single PNG | ✅ Done |
| 8 | Store baselines in `tests/visual/snapshots/` | ✅ Done |
| 9 | Compare against baselines with pixel diff | ✅ Done |
| 10 | Add `npm run test:visual` command | ✅ Already existed |
| 11 | Add `npm run test:visual:update` to accept new baselines | ✅ Already existed |

**Files created/modified:**
- `tests/visual/progression-strips.spec.js` - Playwright test for 4 progression strips
- `stories/components/ProgressionPlayer.tsx` - Added required `testId` prop to ProgressionStrip
- `stories/energy-field.mdx` - Added testId to each ProgressionStrip
- `playwright.visual.config.js` - Updated to use stories server (port 3001)

**Baselines:**
```
tests/visual/snapshots/progression-strips.spec.js-snapshots/
├── strip-no-damping-chromium-darwin.png
├── strip-with-damping-chromium-darwin.png
├── strip-high-damping-chromium-darwin.png
└── strip-with-drain-chromium-darwin.png
```

**Why Playwright over Node.js GIF encoding:**
- Browser renders the actual React components (tests what users see)
- No encoding bugs - just PNG screenshots
- Playwright's built-in screenshot comparison
- Film strips show all frames at once (no animation needed for regression)

**Related work completed:** Performance test separation (perf-test-separation.md)
- Created `vitest.perf.config.ts` for isolated perf tests
- Moved flaky timing tests to `*.perf.test.ts` files
- Added `npm run test:perf` command

### Phase 3: MDX Documentation + Playback ✅ COMPLETE

| Step | Task | Status |
|------|------|--------|
| 11 | Install @mdx-js/rollup and @mdx-js/react | ✅ Done |
| 12 | Create vite.stories.config.ts | ✅ Done |
| 13 | Create stories/ directory structure | ✅ Done |
| 14 | Create ProgressionStrip component (static frame strip) | ✅ Done |
| 15 | Create ProgressionPlayer component (animated with play/pause/speed) | ✅ Done |
| 16 | Create first MDX doc (energy-field.mdx) | ✅ Done |
| 17 | Add simple navigation/layout component (App.tsx) | ✅ Done |
| 18 | Add package.json scripts (npm run stories) | ✅ Done |
| 19 | Remove old Ladle stories from src/stories/ | ✅ Done |
| 20 | Remove Ladle dependency (142 packages removed) | ✅ Done |

## Benefits

1. **Prose + visuals**: Full markdown documentation alongside renders
1. **Test coupling**: Import directly from test files - docs stay in sync
1. **No framework lock-in**: Just Vite + MDX, ~50 lines of config
1. **Static output**: Can deploy as GitHub Pages
1. **Minimal dependencies**: Two packages vs Storybook's dozens
1. **Animated playback**: See time progressions with play/pause/speed toggle
1. **DRY**: Core framework eliminates ad hoc timeline code in each test
1. **Reusable**: Same progression data powers tests, static strips, and animated playback

## Non-Goals

- Interactive controls/knobs (use debug panel in main app for that)
- Hot module replacement for MDX (nice to have, not critical)
- Automatic story detection (explicit imports are fine)

## Open Questions

- Should we use a routing library or simple file-based navigation?
- Do we need syntax highlighting for code blocks?
- Should docs be deployed somewhere or just local dev tool?

## Example MDX File

See [200-mdx-example-propagation.mdx](./200-mdx-example-propagation.mdx) for a complete example
of what the documentation will look like. Key features demonstrated:

- Direct imports from test files (`energyFieldPropagation.test.js`)
- Prose explaining the physics and parameters
- `<ProgressionStrip>` for static frame sequences (all frames visible)
- `<ProgressionPlayer>` for animated playback with play/pause/speed toggle
- Tables for parameter comparisons
- Code blocks for formulas and API examples

## References

- [MDX Rollup Plugin](https://mdxjs.com/packages/rollup/)
- [Vite + MDX Integration](https://trean.page/posts/2023-08-30-using-mdx-with-vite/)
- Docz (archived Jan 2025) - prior art for MDX-first docs
