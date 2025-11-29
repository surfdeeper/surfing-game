# Plan 171: Presentation Header Visual Coverage

**Status**: Proposed  
**Category**: testing  
**Depends On**: 170 (Visual Regression Harness Hardening), 220 (Presentation Mode Viewer)

## Problem

The presentation header is cluttered and overflows off-screen at some widths. Without targeted visual checks, regressions in layout, overflow handling, and control visibility will slip through.

## Goal

Add focused visual coverage for the presentation header across key breakpoints and states, so overflow/spacing regressions are caught automatically.

## Scope

- Breakpoints: sm (640px), md (900px), lg (1200px).
- States to capture:
  - Long labels (current/prev/next section names), disabled nav (start/end).
  - Auto-play active (pulsing indicator), auto-play idle.
  - All controls visible: exit, file/section nav, auto-play button.
- Isolation: header rendered in a dedicated story with deterministic text and layout constants.

## Approach

1. **Story Isolation**
   - Create a dedicated story for the header in `stories/testing/presentation-header.mdx` (or TSX) that mounts the header component with fixed props (long strings, disabled flags, active autoplay).
   - Provide deterministic sizing: set container width to the target breakpoint explicitly in the story wrapper.
1. **Visual Snapshots**
   - Playwright visual tests that load the header story and snapshot at sm/md/lg widths.
   - Assertions: no horizontal overflow (e.g., body scrollWidth === clientWidth), critical controls remain visible, long labels ellipsize rather than wrapping off-screen.
1. **States Matrix**
   - Snapshot variants: (a) start of deck (prev disabled), (b) middle (all enabled, long labels), (c) end of deck (next disabled), (d) autoplay active.
1. **Reusable Fixtures**
   - Use the deterministic seeds/helpers from Plan 170 to keep text/props stable.
1. **Failure Guidance**
   - Ensure diffs point to the header story and include hints to check overflow/ellipsis rules.

## Deliverables

- New isolated header story with configurable props and long-label fixtures.
- Playwright visual test file covering the breakpoint/state matrix.
- Optional: a small helper that enforces `overflow: hidden`/`text-overflow: ellipsis` on label slots to keep snapshots deterministic.

## Acceptance Criteria

- Visual tests fail when header controls shift off-screen or overflow horizontally at any covered breakpoint.
- Long labels are ellipsized in snapshots; controls remain visible.
- Tests are deterministic across runs (no layout jitter).
