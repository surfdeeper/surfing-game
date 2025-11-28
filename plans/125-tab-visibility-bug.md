# Plan 125: Fix Tab Visibility / Background Freeze Bug

## Bug Report

When the browser tab goes to background and returns, the game sometimes freezes. Animation stops or behaves erratically.

## Root Cause Analysis

### The Problem

When a tab is backgrounded, browsers throttle or pause `requestAnimationFrame`:
- Chrome pauses rAF entirely for background tabs
- When tab returns, `timestamp` in the callback may have a huge gap
- `deltaTime = (timestamp - lastTime) / 1000` becomes very large (seconds or minutes)
- This causes:
  - Waves to "teleport" huge distances
  - State machine timers to skip states entirely
  - Potential overflow or NaN issues

### Current Code (`src/main.js:352-360`)
```js
let lastTime = 0;

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(deltaTime);  // deltaTime could be 30+ seconds after tab restore!
    draw();

    requestAnimationFrame(gameLoop);
}
```

### Why It Freezes

Possible scenarios:
1. **Huge deltaTime** causes waves to skip past shore, state to become invalid
2. **NaN propagation** if calculations overflow
3. **rAF not resuming** if Chrome garbage collected the callback (unlikely but possible)

## Solution

### 1. Clamp Delta Time

Never let deltaTime exceed a reasonable maximum:

```js
const MAX_DELTA = 1/30;  // Cap at ~30fps worth of time (33ms)

function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Clamp to prevent huge jumps after tab restore
    deltaTime = Math.min(deltaTime, MAX_DELTA);

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}
```

### 2. Handle Visibility Change Event

Listen for tab visibility changes to reset timing:

```js
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Reset lastTime to prevent huge deltaTime on next frame
        lastTime = performance.now();
    }
});
```

### 3. Detect and Handle Large Gaps

More sophisticated: detect gap and handle gracefully:

```js
function gameLoop(timestamp) {
    const rawDelta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (rawDelta > 1) {
        // Tab was backgrounded for more than 1 second
        // Option A: Skip this frame entirely
        requestAnimationFrame(gameLoop);
        return;

        // Option B: Run multiple small updates to "catch up"
        // (only if deterministic state is important)
    }

    const deltaTime = Math.min(rawDelta, MAX_DELTA);
    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}
```

### 4. Ensure rAF Continues

Add a safety check that rAF is running:

```js
let animationFrameId = null;

function gameLoop(timestamp) {
    // ... game logic ...
    animationFrameId = requestAnimationFrame(gameLoop);
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        lastTime = performance.now();
        // Ensure loop is running
        if (animationFrameId === null) {
            animationFrameId = requestAnimationFrame(gameLoop);
        }
    }
});

// Start the loop
animationFrameId = requestAnimationFrame(gameLoop);
```

## Recommended Implementation

Minimal fix (do this first):

```js
// At top of file
const MAX_DELTA_TIME = 0.1;  // 100ms max (10fps minimum)

// In gameLoop
function gameLoop(timestamp) {
    let deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Prevent huge time jumps when returning from background
    if (deltaTime > MAX_DELTA_TIME) {
        deltaTime = MAX_DELTA_TIME;
    }

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Add visibility change handler
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        lastTime = performance.now();
    }
});
```

## Testing

1. Open game in browser
2. Switch to another tab for 10+ seconds
3. Switch back
4. Verify:
   - Game resumes smoothly
   - No frozen screen
   - Waves are in reasonable positions (not teleported)
   - No console errors

## Future Consideration (Plan 123)

Once we have the time-based wave model (plan 123), this problem becomes easier:
- Wave position = `f(currentTime)`, not accumulated deltas
- Can simply recalculate all positions on tab restore
- No accumulated error from deltaTime jumps

## Priority

**High** - This is a user-facing bug that breaks the experience. Should be fixed before adding new features.

## Files to Modify

- `src/main.js` - Game loop and visibility handling
