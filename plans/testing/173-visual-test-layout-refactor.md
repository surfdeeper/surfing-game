# Plan 173: Visual Test Layout Refactor

**Status**: In Progress  
**Category**: testing  
**Depends On**: 170 (Visual Regression Harness Hardening), 171 (Presentation Header Visual Coverage), 172 (Story Viewer Component Stories)

## Problem

Visual stories, Playwright specs, and snapshot images live in different directories (`tests/visual`, `tests/stories`, nested `__snapshots__`), making it hard to see which story a baseline belongs to. Folder depth (`__visual__/__snapshots__`) is annoying to navigate and obscure for inspection. Breakpoint permutations apply to some stories (e.g., header) but not others (canvas filmstrips), yet the layout does not encode that distinction.

## Goal

Co-locate each visual story, its Playwright visual spec, and its baseline images in a single folder with clear, suffix-free names. Apply breakpoint suffixes only where needed.

## Target Layout

```
stories/
  visual-docs-viewer/
    presentation-header.mdx
    presentation-header.visual.spec.ts
    presentation-header-sm.png
    presentation-header-md.png
    presentation-header-lg.png

  visual-docs-viewer-self-test/
    good.mdx
    offset.mdx
    viewer-self-test.visual.spec.ts
    viewer-self-test-good.png
    viewer-self-test-offset.png

  canvas-rendering/
    exercise-matrix.mdx
    exercise-matrix.visual.spec.ts
    exercise-matrix.png
```

Conventions:
- One folder per subject; MDX + visual spec + baselines side-by-side.
- Breakpoint suffixes only when the component is responsive (e.g., header). Canvas filmstrips get a single baseline.
- No `__visual__` or `__snapshots__` nesting; names stay literal and short.
- Playwright functional (non-visual) tests live in `tests/viewer/*.e2e.spec.ts`. Non-visual unit/integration remain under `tests/`.

## Steps

1. **Rename/move existing visual specs**: e.g., `tests/visual/all-strips.spec.ts` → `stories/game/exercise-matrix.visual.spec.ts` (or aligned with actual story name).
1. **Relocate baselines**: move snapshot images next to their story folder, renaming to match the subject and breakpoint where applicable.
1. **Update Playwright configs**: adjust testDir/globs to pick up `stories/**/.visual.spec.ts` files.
1. **Update docs**: add a short README in `stories/` (or `tests/visual/` if needed) describing the co-location rule and naming for breakpoints.
1. **Clean up legacy artifacts**: remove stale `__snapshots__` dirs after migration; ensure `.gitignore` matches new paths.

## Acceptance Criteria

- Each visual story folder contains its MDX, visual spec, and baselines together with consistent names.
- Playwright visual runs pick up the relocated specs without manual path tweaks.
- Breakpoint suffixes appear only where the component is responsive; canvas filmstrips remain single-snapshot.
- No lingering `__visual__`/`__snapshots__` directories for active stories.

## Findings

- Visual specs and baselines now live beside their MDX pages under `stories/<page-id>/`, discovered via `*.visual.spec.ts` in `playwright.visual.config.js`.
- Snapshot naming drops platform suffixes; `snapshotPathTemplate` writes PNGs next to specs (`strip-*.png`). `reset:visual:all` clears colocated baselines before re-recording.
- Legacy `tests/visual/snapshots` and unused foam-rendering artifacts were removed; lint ignores story PNGs and `stories/README.md` documents the co-location rule.
