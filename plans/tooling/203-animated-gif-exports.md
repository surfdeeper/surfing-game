# Plan 203: Animated GIF Exports

Status: PLACEHOLDER (future)
Owner: agents
Depends on: 200-mdx-visual-docs (Phase 2 complete)

## Problem

Static film strips are good for regression testing but animated GIFs would be useful for:
- Sharing progressions in GitHub issues/PRs
- Documentation that shows motion
- Quick visual debugging without running the dev server

## Solution

Add GIF export capability after Phase 2 (Playwright screenshots) is stable.

## Possible Approaches

### Option A: Browser-based encoding
- Use a library like `gif.js` in the browser
- Add "Export GIF" button to ProgressionPlayer
- Renders frames to canvas, encodes client-side

### Option B: Playwright + ffmpeg
- Capture individual frame PNGs with Playwright
- Use ffmpeg to stitch into GIF
- Command-line workflow: `npm run export:gif progression-name`

### Option C: Node.js encoding
- Use `gifenc` or similar in Node
- Render frames headlessly
- Previous attempt had corruption issues - would need investigation

## Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | Decide on approach (A, B, or C) | |
| 2 | Implement frame capture | |
| 3 | Implement GIF encoding | |
| 4 | Add export command or UI button | |
| 5 | Test with various progressions | |

## Notes

- Not blocking for visual regression testing (Phase 2 uses static PNGs)
- Lower priority than getting core visual tests working
- Consider whether animated comparison is needed for regression (probably not)
