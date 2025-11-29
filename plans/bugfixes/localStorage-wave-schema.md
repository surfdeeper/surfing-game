# Bug Fix: localStorage Wave Schema Migration

## Problem

Production build crashes with:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'length')
    at updateWaveRefraction
```

**Root cause**: Waves saved to localStorage before `progressPerX` was added lack that property. On load, `updateWaveRefraction` crashes.

## Quick Fix

In `loadGameState()` (main.jsx:287), migrate loaded waves:

```javascript
world.waves = (state.waves || []).map(wave => ({
    ...wave,
    progressPerX: wave.progressPerX || new Array(WAVE_X_SAMPLES).fill(0),
    lastUpdateTime: wave.lastUpdateTime ?? wave.spawnTime,
}));
```

## Why This Happened

1. No schema versioning for localStorage
1. No validation of loaded objects
1. Code assumes waves always have `progressPerX`

## Long-term Fix

See Plan 150: State Management Refactor - introduces schema versioning and event sourcing.

## Status

- [ ] Apply quick fix
- [ ] Add WAVE_X_SAMPLES import if needed
- [ ] Test with stale localStorage data
