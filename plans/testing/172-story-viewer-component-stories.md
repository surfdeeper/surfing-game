# Plan 172: Story Viewer Component Stories

**Status**: Proposed  
**Category**: testing  
**Depends On**: 170 (Visual Regression Harness Hardening), 171 (Presentation Header Visual Coverage)

## Problem

The stories viewer UI (header shell, control clusters, navigation buttons) is untested in isolation. We lack standalone stories for its subcomponents, so layout/overflow issues (e.g., header clutter) are hard to see and protect with visual checks.

## Goal

Decompose the stories viewer into component-level stories that can be viewed and snapshot-tested inside the same viewer. This enables focused visual coverage of header/controls without relying on full MDX pages.

## Scope

- Components: presentation header shell, navigation controls block (prev/next, file/section), autoplay/TTS button states, progress indicator, keyboard hints bar.
- States: long labels, disabled nav (start/end), active/idle autoplay, mixed widths, overflow/ellipsis behavior.
- Viewports: sm/md/lg presets reused across all stories.

## Approach

1. **Extract UI Facets**
   - Define lightweight components/props for the header and control clusters (if not already separated) or wrap existing JSX with stable props.
1. **Add Stories**
   - Create stories under `stories/viewer/` (or `stories/testing/viewer/`) for each facet with deterministic props and long-text fixtures.
   - Include a knobs/args pattern to toggle states (disabled, active autoplay, long labels).
1. **Deterministic Layout**
   - Fix container widths per story (sm/md/lg) to match visual test breakpoints and avoid flake.
1. **Visual Hooks**
   - Tag these stories as “visual-test-ready” (opt-in) so Playwright visual tests can target them directly.
1. **Documentation**
   - Brief README in the folder describing story names, states covered, and how to add new facets.

## Deliverables

- New story files for header, control cluster, and footer/keyboard hints rendered in isolation.
- Deterministic fixture data (long labels, disabled/enabled combinations, autoplay on/off).
- Notes on how these stories are consumed by visual tests (linking to Plan 170 harness rules).

## Acceptance Criteria

- Each viewer facet has at least one deterministic story covering long-label and disabled/enabled states.
- Stories render correctly in the stories viewer at sm/md/lg widths without overflow.
- Visual tests can target these stories directly to catch regressions in header/controls layout.
