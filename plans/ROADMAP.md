# Wave System Roadmap

High-level tracker for wave physics implementation. Plans are executed sequentially due to dependencies.

## Current Status

**Active Plan**: 125-unified-wave-array
**Last Completed**: Background waves & visual scaling (archived)

---

## Phase 1: Foundation Cleanup

| Plan | Status | Description |
|------|--------|-------------|
| [125-unified-wave-array](model/125-unified-wave-array.md) | ⏳ Pending | Merge background/set waves into single array, remove artificial layering |

**Why first**: Cleans up wave array structure before adding physics complexity.

---

## Phase 2: Wave Physics Chain

These must be done in order - each depends on the previous.

| Plan | Status | Description | Depends On |
|------|--------|-------------|------------|
| [124-bathymetry](model/124-bathymetry.md) | ⏳ Pending | Add ocean floor depth map, shallow "peak" where waves break | 125 |
| [40-shoaling](model/40-shoaling.md) | ⏳ Pending | Wave height increases over shallow water | 124 |
| [50-wave-breaking](model/50-wave-breaking.md) | ⏳ Pending | Breaking physics (H > 0.78d), foam, whitewater | 40 |
| Peeling | ⏳ Pending | Break propagates laterally along wave | 50 |

---

## Phase 3: Visual Polish (Future)

| Plan | Status | Description |
|------|--------|-------------|
| 3D Perspective | ⏳ Pending | Render waves with depth/perspective |
| Foam particles | ⏳ Pending | Particle effects for spray/foam |
| Curved wave lines | ⏳ Pending | Waves bend over bathymetry |

---

## Completed

| Plan | Date | Notes |
|------|------|-------|
| 123-time-based-wave-model | Done | Wave position derived from time |
| Background waves | 2024-11-27 | Two-layer system (being replaced by 125) |

---

## Execution Notes

- Only one plan active at a time
- Each plan should pass all tests before moving to next
- Commit after each plan completion
- Update this file when starting/completing plans

---

## Quick Commands

```bash
# Run tests
npm test

# Start dev server
npm start

# Run specific test file
npx vitest run src/state/waveModel.test.js
```
