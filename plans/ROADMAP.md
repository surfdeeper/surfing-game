# Wave System Roadmap

High-level tracker for wave physics implementation. Plans are executed sequentially due to dependencies.

## Current Status

**Active Plan**: 40-shoaling (next)
**Last Completed**: 124-bathymetry

---

## Phase 1: Foundation Cleanup

| Plan | Status | Description |
|------|--------|-------------|
| [125-unified-wave-array](model/125-unified-wave-array.md) | ✅ Done | Merge background/set waves into single array, remove artificial layering |

**Why first**: Cleans up wave array structure before adding physics complexity.

---

## Phase 2: Wave Physics Chain

These must be done in order - each depends on the previous.

| Plan | Status | Description | Depends On |
|------|--------|-------------|------------|
| [124-bathymetry](model/124-bathymetry.md) | ✅ Done | Add ocean floor depth map, shallow "peak" where waves break | 125 |
| [40-shoaling](model/40-shoaling.md) | ⏳ Pending | Wave height increases over shallow water | 124 |
| [50-wave-breaking](model/50-wave-breaking.md) | ⏳ Pending | Breaking physics (H > 0.78d), foam, whitewater | 40 |
| Peeling | ⏳ Pending | Break propagates laterally along wave | 50 |

### Interference & Double-Ups (Parallel-ready)

| Plan | Status | Description | Depends On |
|------|--------|-------------|------------|
| [126-wave-interference-and-double-ups](model/126-wave-interference-and-double-ups.md) | 📝 Proposal | Superposition-based amplitude at spawn; optional merge for near-coincident waves | 125 |

---

## Phase 3: UI & Performance (Parallel with Wave Physics)

These improve developer experience and UI responsiveness.

| Plan | Status | Description | Depends On |
|------|--------|-------------|------------|
| [127-declarative-ui-layer](tooling/127-declarative-ui-layer.md) | 📝 Ready | Migrate debug panel to Preact components | None |
| [128-react-performance-optimization](tooling/128-react-performance-optimization.md) | 📝 Ready | Fix laggy buttons with time-slicing & concurrent features | 127 |
| [129-react-18-concurrent-migration](tooling/129-react-18-concurrent-migration.md) | 📝 Future | Full React 18 upgrade with Concurrent Mode | 128 |
| 131-react-three-fiber | 📝 Future | Canvas 2D → WebGL (Three.js) | 129 |

**Why important**:
- Button clicks currently laggy during animations (128 fixes this)
- React 18 Concurrent Mode enables priority-based rendering
- Preact → React migration prepares for Three.js integration

---

## Phase 4: Visual Polish (Future)

| Plan | Status | Description |
|------|--------|-------------|
| 3D Perspective | ⏳ Pending | Render waves with depth/perspective |
| Foam particles | ⏳ Pending | Particle effects for spray/foam |
| Curved wave lines | ⏳ Pending | Waves bend over bathymetry |

---

## Completed

| Plan | Date | Notes |
|------|------|-------|
| 124-bathymetry | 2025-11-27 | Ocean floor depth, depth-based breaking, decoupled foam |
| 125-unified-wave-array | 2025-11-27 | Single wave array with type property |
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
