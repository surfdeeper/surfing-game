# Plan 190: Debug Panel Consolidation

## Problem
- Foam dispersion has three separate toggles (Options A/B/C) with unique titles and hotkeys; users can enable multiple at once, producing overlapping layers and visual clutter.
- Debug panel sections (`<details>`) always open and do not persist state; advanced sections cannot stay collapsed across sessions, leading to noisy UI.
- Dynamic lists (set wave details) cause layout reflow when items spawn/expire, making controls jump around.
- Control sprawl: many small toggles and sliders are spread across sections without clear “basic vs advanced” grouping.

## Proposed Solution
1) **Single foam dispersion mode selector** (enum + hotkey cycling) to replace the three booleans; render only the chosen mode. Migrate existing saved booleans to the new mode on load.
1) **Persisted section collapse state** with sensible defaults (basic open, advanced closed). Store alongside settings schema; allow per-section defaults (e.g., Player tuning only opens when Player is enabled).
1) **Stable layout for dynamic content** by constraining the wave list (max-height + scroll or capped entries) and avoiding full panel reflow when waves churn.
1) **UI re-organization** into clear groups: Basics (view layers, playback), Foam (single selector, maybe presets), Advanced (player tuning, AI, experimental visuals) default-collapsed.
1) **Tests + smoke**: update DebugPanel tests for new controls and persistence; run lint + smoke to keep the tight feedback loop.

## Implementation Steps
1) **Settings schema + migration**
   - Add `foamDispersionMode: 'none'|'A'|'B'|'C'` with hotkey cycle (1/2/3 to select, maybe shift+1 to disable).
   - Migration: if legacy booleans exist, pick the highest-priority true value (A > B > C) or `none` if none set; remove old keys from persistence to prevent drift.
   - Add persisted `panelSections` map (e.g., `{viewLayers: true, foam: true, playback: true, advanced: false, player: false}`) with schema bump.

1) **Rendering changes**
   - Replace `toggles.showFoamOption*` branches in `main.jsx` with a single switch on `foamDispersionMode`.
   - Map UI selector to mode; hide/disable advanced options when mode is `none`.

1) **DebugPanel UI restructure**
   - Convert Foam Dispersion section to a single select or segmented control; show description/tooltips for modes.
   - Re-group sections: Basics (view layers, playback), Foam (mode selector), Wave Status + Set/Lull (read-only), Advanced (player tuning, AI, experimental layers) collapsed by default.
   - Respect and update persisted section state when `<details>` toggles change.

1) **Layout stabilization**
   - Constrain set wave list height with scroll or cap to N newest waves and provide a “+X more” badge.
   - Ensure panel width/headers stay fixed to avoid jitter when entries update.

1) **Testing & verification**
   - Update `DebugPanel.test.jsx` for new selector, section defaults, and persistence behavior.
   - Add migration unit test for settings model (legacy booleans → enum, section defaults).
   - Run `npm run lint` then `npx playwright test tests/smoke.spec.js:3` per AGENTS.md guidance.

## Notes / Dependencies
- Builds on Plan 127 (Declarative UI Layer) and current settings model. No external libs needed.
- Keep hotkey behavior consistent; document any changes in tooltips/labels.
