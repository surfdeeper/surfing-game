# Viewer Theme Regression (Normal Mode)

**Status: COMPLETE**

## Summary
- Normal mode sidebar/main are hard-coded to dark colors while MDX content uses ThemeContext.
- When theme is toggled to light in presentation mode (or via `?theme=light`), returning to normal mode leaves dark backgrounds with light text, making content unreadable.
- Normal mode lacks a theme toggle to recover; URL param syncing is inconsistent between modes.

## Scope / Out of Scope
- In scope: Stories viewer theming, sidebar/main layout, theme toggle UI, URL/query param handling for theme and mode.
- Out of scope: Core gameplay canvas, production app styling, new visual design beyond aligning to existing ThemeContext palettes.

## Hypothesis
- Hard-coded dark values in normal mode block ThemeContext colors, causing theme desync.
- Missing theme toggle in normal mode prevents users from reverting; URL handling may overwrite theme defaults unexpectedly.

## Plan
1) Audit: Identify all normal mode color styles and mode/theme URL handling paths in `stories/App.tsx` and shared theme helpers.
1) Refactor: Replace hard-coded normal mode colors with ThemeContext-driven values; add a theme toggle in normal mode that reuses existing toggle logic and keeps URL/query params in sync across modes.
1) Verify: Run `npm run lint` and `npx playwright test tests/smoke.spec.js:3`; manual check that switching themes in either mode keeps backgrounds/text legible and persists when toggling modes or reloading with query params.

## Risks / Mitigations
- Risk: Style drift between modes after refactor. Mitigation: centralize colors via ThemeContext values and reuse shared style helpers where possible.
- Risk: URL state conflicts when switching modes. Mitigation: test navigation with/without `?theme=` and `?mode=presentation` to confirm persistence.

## Resolution

Fixed in `stories/App.tsx`:

1. **Replaced hard-coded colors with ThemeContext values** in normal mode:
   - Nav background: `#010409` → `colors.bgHeader`
   - Nav border: `#21262d` → `colors.border`
   - Title color: `#58a6ff` → `colors.accent`
   - Button colors: hard-coded hex → `colors.textDim`, `colors.textMuted`, etc.
   - Main content bg: `#0d1117` → `colors.bg`
   - Section link colors: hard-coded hex → `colors.accent`, `colors.textDim`, `colors.borderLight`

1. **Added theme toggle button** to normal mode sidebar header (next to the presentation mode button)

1. **Added dynamic `<style>` block** for MDX content in normal mode (matching presentation mode's approach):
   - Headings, paragraphs, lists, code, links all now respond to theme

1. **URL sync was already working** via the existing `toggleTheme` callback which updates `?theme=` param

Verified with `npm run lint` (0 errors) and `npx playwright test tests/smoke.spec.js:3` (passed).
