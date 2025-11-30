# Visual story layout

- Each story lives in its own folder (`stories/<page-id>/`) with the MDX, its `.visual.spec.ts`, and the baseline PNGs side-by-side.
- Baselines are named directly after the captured subject (e.g., `strip-foam-decay.png`). Add breakpoint suffixes only for responsive UIs; filmstrip stories keep a single PNG.
- Playwright visual tests are discovered via `stories/**.visual.spec.ts` and write baselines next to the spec (see `snapshotPathTemplate` in `playwright.visual.config.js`).
- `npm run reset:visual` clears results/reports; `npm run reset:visual:all` also removes the colocated PNG baselines before re-recording.
