# Plan 220: Presentation Mode Viewer

**Status**: Active (Iteration 2)
**Category**: tooling
**Depends On**: 200-mdx-visual-docs (complete)

## Problem

The current MDX story viewer shows all stories in a sidebar with scrollable content. This works well for documentation browsing, but not for:

1. **Presentations** - Walking through physics concepts step-by-step
1. **Code reviews** - Showing one visualization at a time for focused discussion
1. **Accessibility** - Reading documentation aloud for learning/accessibility

Current pain points:
- Multiple strips visible at once creates visual clutter during demos
- No keyboard navigation between pages
- No way to read documentation aloud for accessibility or hands-free learning

## Proposed Solution

Add a "presentation mode" to the stories viewer:

1. **Single story per page** - Full viewport, one MDX page at a time
1. **Keyboard navigation** - Arrow keys to move between pages
1. **Web Speech API** - Read prose sections aloud (TTS)
1. **Progress indicator** - Show current position (e.g., "3 of 8")
1. **Toggle** - Button/shortcut to switch between normal and presentation mode

### User Experience

```
┌─────────────────────────────────────────────────────────────────┐
│  [Exit]                           ◀ 3 of 8 ▶                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    # Shoaling                                   │
│                                                                 │
│    As waves approach shore, decreasing depth causes             │
│    wavelength compression and height amplification...           │
│                                                                 │
│    [▶ Read aloud]                                               │
│                                                                 │
│    ┌─────────────────────────────────────────────────┐          │
│    │  [Progression visualization - full width]       │          │
│    │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │          │
│    └─────────────────────────────────────────────────┘          │
│                                                                 │
│                                                                 │
│    Press ← → to navigate, Space to read aloud                   │
└─────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` | Previous page |
| `→` | Next page |
| `Home` | First page |
| `End` | Last page |
| `Space` | Toggle read aloud |
| `Escape` | Exit presentation mode |
| `P` | Enter presentation mode (from normal view) |

### Web Speech API Integration

```typescript
// Read prose sections aloud
function readAloud(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0; // Normal speed
  utterance.pitch = 1.0;
  // Use default system voice
  speechSynthesis.speak(utterance);
}

// Extract prose from MDX (skip code blocks, component tags)
function extractProseFromMdx(content: HTMLElement): string {
  const paragraphs = content.querySelectorAll('p, h1, h2, h3, li');
  return Array.from(paragraphs)
    .map(el => el.textContent)
    .filter(Boolean)
    .join('. ');
}
```

### URL Structure

```
/?page=03-shoaling&mode=presentation
```

Query params:
- `page` - Current MDX file (existing)
- `mode` - `normal` (default) or `presentation`

## Implementation Steps

### Phase 1: Core Navigation

| Step | Task |
|------|------|
| 1 | Add `mode` state to App.tsx (normal/presentation) |
| 2 | Create PresentationMode component with full-viewport layout |
| 3 | Hide sidebar when in presentation mode |
| 4 | Add page counter (e.g., "3 of 8") |
| 5 | Add keyboard event listener for arrow keys |
| 6 | Persist mode in URL query param |

### Phase 2: Text-to-Speech

| Step | Task |
|------|------|
| 7 | Add "Read aloud" button to presentation header |
| 8 | Extract prose text from rendered MDX content |
| 9 | Implement Web Speech API integration |
| 10 | Add Space key shortcut to toggle reading |
| 11 | Show visual indicator when reading (pulsing icon) |
| 12 | Stop reading when navigating to new page |

### Phase 3: Polish

| Step | Task |
|------|------|
| 13 | Add enter/exit presentation mode button |
| 14 | Add keyboard shortcut hints at bottom of page |
| 15 | Smooth page transitions (fade or slide) |
| 16 | Auto-focus content for immediate keyboard control |
| 17 | Store voice preferences in localStorage |

## Files Affected

- `stories/App.tsx` - Add presentation mode state and routing
- `stories/components/PresentationMode.tsx` - New component (create)
- `stories/components/SpeechControls.tsx` - TTS controls (create)
- `stories/main.tsx` - Global keyboard handlers

## Testing

1. **Manual testing**:
   - Arrow keys navigate between pages
   - Space triggers TTS
   - Escape exits presentation mode

1. **E2E tests** (optional):
   - Navigation works in presentation mode
   - URL updates correctly
   - Mode persists on refresh

## Browser Support

Web Speech API is widely supported:
- Chrome, Edge, Safari: Full support
- Firefox: Partial support (may need polyfill)

Fallback: Hide TTS button if `speechSynthesis` is undefined.

## Future Enhancements

- **Section-level navigation**: Shift+Arrow to jump between sections within a page
- **Voice selection**: Choose between available system voices
- **Speed control**: 0.5x, 1x, 1.5x, 2x speech rate
- **Auto-advance**: Option to auto-navigate after TTS finishes
- **Dark/light theme**: Better for projector presentations

## Completion Summary

**Implemented**: 2024-11-29

All Phase 1, Phase 2, and most Phase 3 features were implemented in a single file (`stories/App.tsx`) rather than creating separate components as originally planned.

### What Was Implemented

- **Presentation mode toggle** - `mode` state with URL persistence (`?mode=presentation`)
- **Full-viewport layout** - Sidebar hidden, content centered with max-width 900px
- **Page navigation** - Previous/next buttons with page counter ("3 of 8")
- **Keyboard shortcuts** - All planned shortcuts work:
  - `←` / `→` - Navigate pages
  - `Home` / `End` - Jump to first/last
  - `Space` - Toggle TTS
  - `Escape` - Exit presentation mode
  - `P` - Enter presentation mode from normal view
- **Text-to-speech** - Web Speech API integration with prose extraction
- **Visual feedback** - Pulsing indicator when reading, disabled button states
- **Keyboard hints** - Footer showing available shortcuts
- **Entry point** - ▶ button added to sidebar header

### Deviations from Plan

1. **Single file implementation** - All logic kept in `App.tsx` rather than creating `PresentationMode.tsx` and `SpeechControls.tsx`. The component is small enough that extraction wasn't necessary.
1. **Skipped smooth transitions** - Page transitions (step 15) not implemented; instant switching works well.
1. **Skipped voice preferences** - localStorage persistence for voice settings (step 17) deferred to future enhancement.

### Files Modified

- `stories/App.tsx` - Added presentation mode, TTS, and keyboard navigation

---

## Bugs / Critiques (2024-11-29)

- **Auto-play skips sections/files**: When a section finishes, the auto-play effect runs before the pending `setCurrentReadingIndex(0)` for the next section. Because the old index is still present, `currentReadingIndex >= elements.length` is true and the effect immediately calls `goToNextSection(true)`, skipping the newly loaded section (and potentially chaining skips across files). Fix: reset `currentReadingIndex` synchronously before the auto-play effect runs, or gate the advance on a section-change token instead of the stale index.
- **Auto-play can stall on empty sections**: If a section has no readable elements (`p/h1-4/li/pre`), the auto-play effect bails when `elementsReady` is true but `elements.length === 0`, leaving `isAutoPlaying` stuck true with no advancement. Fix: detect zero elements and either advance to the next section or stop playback.

## Iteration 2: Enhanced Navigation & Click-to-Jump

**Status**: In Progress
**Started**: 2024-11-29

### Vision

Transform the presentation mode into an interactive documentation reader where users can:

1. **Click any sentence to jump there** - Click on any paragraph, heading, or list item to start reading from that point
1. **Section-level navigation** - Navigate between sections within a page (not just page-level)
1. **Visual highlighting** - Current element being read is highlighted with a blue left border
1. **Auto-advance through sections** - TTS continues through all sections/pages automatically
1. **Speed controls** - Playback speed options (0.25x, 0.5x, 1x, 1.5x, 2x)

### What's Implemented

| Feature | Status |
|---------|--------|
| Section-level navigation (←/→ moves between sections, Shift+←/→ between files) | ✅ Done |
| Click-to-jump on any readable element | ✅ Done |
| Visual highlight for current reading position | ✅ Done |
| Auto-advance through sections and files | ✅ Done |
| Playback speed controls | ✅ Done |
| Section labels in nav header | ✅ Done |
| Sidebar section links in normal mode | ✅ Done |
| Dark/light theme toggle | ✅ Done |

### Bug Fixes (This Session)

| Issue | Fix |
|-------|-----|
| Clicking sidebar section links scrolled to top of page | Changed `window.location.hash` to `history.pushState()` to prevent browser's native anchor navigation from fighting with `scrollIntoView()` |

### Architecture Notes

The implementation keeps everything in `stories/App.tsx` rather than extracting components. Key state:

- `currentSectionId` - Which section is visible in presentation mode
- `currentReadingIndex` - Which element (0-indexed) is being read within the section
- `isAutoPlaying` - Whether TTS auto-advance is active
- `readableElementsRef` - Cached list of readable elements in current section
- `playbackSpeed` - TTS rate multiplier

Click handlers are attached dynamically to readable elements (`p`, `h1-h4`, `li`, `pre`) when in presentation mode.

### Remaining Work

| Task | Priority |
|------|----------|
| Test click-to-jump across all MDX pages | High |
| Consider extracting presentation mode to separate component | Low |
| Add visual tests for presentation mode | Medium |
| Voice selection (choose system voice) | Low |
| Store theme/speed preferences in localStorage | Low |
