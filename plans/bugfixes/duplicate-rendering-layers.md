# Duplicate Rendering Layers in main.jsx

## Status: Analysis Complete - Awaiting Decision

## Problem

`src/main.jsx` contains inline rendering code that duplicates extracted helper modules. This creates maintenance burden and inconsistency between the game and Storybook.

## Findings

### 1. Bathymetry Heat Map - Unused Module

| Location | Lines | Description |
|----------|-------|-------------|
| `src/main.jsx` | 670-698 | Inline cache building |
| `src/render/bathymetryRenderer.js` | 19-43 | Extracted helper (unused) |

**History**: `bathymetryRenderer.js` was added in commit `d2f03e6` but never integrated.

**Inline code (main.jsx:670-698)**:
```javascript
if (!bathymetryCache || bathymetryCache.width !== w || bathymetryCache.height !== oceanBottom) {
    bathymetryCache = document.createElement('canvas');
    bathymetryCache.width = w;
    bathymetryCache.height = oceanBottom;
    const cacheCtx = bathymetryCache.getContext('2d');
    // ... identical loop to bathymetryRenderer.js
}
```

**Impact**: Two implementations to maintain. If color scheme changes, must update both.

---

### 2. Contour Drawing Loop - Repeated 4 Times

| Location | Lines | Layer |
|----------|-------|-------|
| `src/main.jsx` | 796-835 | LAYER 1: Base foam contours |
| `src/main.jsx` | 859-884 | LAYER: Option A (red/orange) |
| `src/main.jsx` | 888-913 | LAYER: Option B (green) |
| `src/main.jsx` | 917-942 | LAYER: Option C (blue/purple) |

All four blocks follow this pattern:
```javascript
const thresholds = [ /* different colors per option */ ];
for (const { value, color, lineWidth } of thresholds) {
    const segments = extractLineSegments(blurred, GRID_W, GRID_H, value);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const seg of segments) {
        ctx.moveTo(seg.x1 * w, seg.y1 * oceanBottom);
        ctx.lineTo(seg.x2 * w, seg.y2 * oceanBottom);
    }
    ctx.stroke();
}
```

**Existing helpers NOT being used**:
- `src/main.jsx:838-855` - `drawContours()` - defined but never called
- `src/render/marchingSquares.js` - `renderMultiContour()`, `renderMultiContourOptionA/B/C()` - used only in Storybook

---

### 3. Dead Code

| Location | Code |
|----------|------|
| `src/main.jsx:838-855` | `function drawContours()` - never called |

---

## Options

### Option A: Consolidate to Use Existing Helpers

**Bathymetry**:
- Replace inline code with `buildBathymetryCache()` from `bathymetryRenderer.js`
- Or use `createBathymetryCacheManager()` for cleaner cache invalidation

**Contours**:
- Either use the local `drawContours()` helper (fix and use it)
- Or use `renderMultiContour*()` from `marchingSquares.js` (like Storybook does)

**Pros**: DRY, consistent with Storybook, easier maintenance
**Cons**: Minor refactoring effort, need to verify performance

### Option B: Delete Unused Helpers

- Remove `bathymetryRenderer.js` (or mark it as "for Storybook only")
- Delete the unused `drawContours()` function in main.jsx
- Keep inline code as-is

**Pros**: Less code to maintain, no refactoring risk
**Cons**: Storybook uses different code paths than game

### Option C: Hybrid Approach

- Use `bathymetryRenderer.js` for bathymetry (simple, low risk)
- Keep contour loops inline (they have subtle color differences per option)
- Delete dead `drawContours()` function

**Pros**: Pragmatic balance
**Cons**: Partial solution

---

## Recommendation

**Option C (Hybrid)** seems most practical:

1. **Bathymetry**: Use the extracted helper - it's identical and reduces duplication
2. **Contours**: Keep inline - the color schemes differ per option and performance is critical
3. **Dead code**: Delete the unused `drawContours()` function

---

## Implementation Steps

If proceeding with Option C:

1. [ ] Import `buildBathymetryCache` or `createBathymetryCacheManager` from `bathymetryRenderer.js`
2. [ ] Replace inline bathymetry cache building (lines 670-698) with helper call
3. [ ] Delete unused `drawContours()` function (lines 838-855)
4. [ ] Run `npm run lint`
5. [ ] Run `npm test`
6. [ ] Run visual tests to verify no rendering changes

---

## Questions for Decision

1. Should we consolidate bathymetry rendering?
2. Should we consolidate contour drawing (accept slight refactoring)?
3. Should we delete the dead `drawContours()` function?
