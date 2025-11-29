# Plan 130: Bathymetry Heat Map Performance Degradation

## Performance Issue Report
Toggling the bathymetry (bottom depth) heat map drops frame rate from ~60 FPS to ~20 FPS. The heat map is visually static yet incurs a large per-frame cost.

## Symptoms
- FPS falls immediately upon enabling heat map toggle.
- CPU usage spikes (JS thread) due to many draw calls & math.
- GPU overdraw increases (thousands of small opaque + transparent composited rectangles).
- Disabling heat map returns FPS to baseline without lingering impact.

## Current Behavior (Inferred)
- Full-screen nested loops iterate over bathymetry sampling points every frame.
- Each cell computes depth via multi-lobe math (abs / sqrt / cos per lobe).
- Each cell sets `fillStyle` string and issues `fillRect` (4–6px patch) ⇒ tens of thousands of calls.
- Waves are rendered semi-transparent on top, increasing blend operations.
- Foam + blur + contour passes still run unthrottled in same frame.

## Root Cause Analysis
1. Uncached static visualization rendered every frame (no offscreen reuse).
1. High draw call count: per-cell `fillRect` + per-cell `fillStyle` string creation.
1. Expensive depth function invoked per cell (multiple lobes + trig).
1. Additional alpha compositing cost (waves made translucent when map visible).
1. Parallel heavy subsystems (foam grid build + blur passes) not downscaled while heat map active.

## Solution Overview
Transform bathymetry rendering from per-frame procedural drawing into a cached bitmap pipeline with adaptive resolution and reduced overdraw.

## Implementation Steps
### Phase 1 (Quick Wins)
1. Offscreen Cache: Build heat map once on toggle/resize into `ImageData` (RGBA) or offscreen canvas.
1. Single Blit: Replace per-frame loop with one `putImageData` (or `drawImage`) when visible.
1. Opaque Waves: Remove wave alpha reduction when bathymetry active (avoid extra blending).
1. Clamp Work: Skip foam layer extra variants (only primary algorithm) while heat map visible.

### Phase 2 (Refinements)
1. Adaptive Resolution: Parameterize cell size; auto-increase (e.g. 4→8px) if FPS < target.
1. Palette Quantization: Map depth ratio to fixed palette (64–128 colors). Precompute color table.
1. Precompute Depth Grid: Build numeric depth grid once; color mapping pass separate.
1. Lobe Influence Tables: Precompute per-x progress + lateral falloff arrays to avoid trig in cache build.
1. Conditional Foam Scheduling: Update foam every N frames (e.g., 2–3) when bathymetry visible.

### Phase 3 (Optional / Future)
1. WebGL Path: Fragment shader for bathymetry (single pass) with uniforms for lobe definitions.
1. Dynamic Animation Support: If future moving seabed/shoaling changes bottom, add dirty-region or timed rebuild.
1. Progressive Build: Incrementally fill cache over initial frames (first frame low-res, refine later) for instant responsiveness.

## Metrics & Validation
- Baseline FPS with heat map ON ≥ 55 (target 60).
- Cache build time < 50ms (one-shot) on typical machine.
- Draw calls per frame reduced from O(N_cells) to O(1–5).
- Memory footprint of cache < 4 *width* height bytes (one RGBA buffer) + small lookup tables.

## Testing Plan
1. Toggle ON: Measure first-frame build duration (performance.now diff).
1. Sustained FPS: Sample over 5 seconds with heat map ON/OFF and compare.
1. Resize: Trigger window resize → verify cache rebuild and stable FPS.
1. Foam Interaction: Confirm foam still animates (at throttled cadence if applied) without artifacts.
1. Visual Fidelity: Ensure color gradient matches prior rendering within tolerance (ΔE < visually noticeable threshold for gameplay).

## Risks & Mitigations
- Large initial build hitch: Mitigate with progressive build or `requestIdleCallback` chunking if needed.
- Future dynamic bathymetry: Add invalidation API early (`invalidateBathymetryCache()`).
- Color Banding after quantization: Optionally dither or increase palette size.
- Over-aggressive throttling harming gameplay readability: Provide debug toggle to disable adaptive scaling.

## Rollback Strategy
Keep old rendering path behind a debug flag (`USE_LEGACY_BATHY_DRAW`). If new path causes issues, flip flag to restore behavior while investigating.

## Dependencies
- Existing depth function / bathymetry definitions (Plan 124).
- Debug toggle infrastructure (tooling plans) for performance flags.

## Priority
High – Direct user-facing performance gain; unlocks further visual complexity without FPS loss.

## File Changes (Expected)
- `src/render/...` (bathymetry drawing module or main render loop segment)
- `src/state/` (flag for bathymetry visibility + cache invalidation)
- `src/core/math.js` (optional: lobe precompute helpers)
- `src/input/keyboard.js` (optional: debug toggle key)

## Implementation Checklist
- [ ] Add cache data structures (offscreen canvas or `ImageData`)
- [ ] Build function (on toggle / resize)
- [ ] Replace per-frame loop with cached blit
- [ ] Remove wave alpha modification when bathy visible
- [ ] Optional: throttle foam subsystem
- [ ] Instrument FPS + build timing (console or debug panel)

## Future Extensions
- Shader-based gradient & contour blending (WebGL)
- Animated sediment transport / dynamic seabed (would revalidate caching approach)
- Multi-layer bathymetry (e.g., hazards overlay) using composition cached separately
