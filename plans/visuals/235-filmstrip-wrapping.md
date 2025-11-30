# Plan 235: Filmstrip Wrapping Instead of Scrolling

## Problem

Filmstrips currently use horizontal scrolling when they exceed the container width. This causes:

1. **Nested scrollbars** - Page scrollbar + filmstrip scrollbar = confusing UX
2. **Hidden content** - Users may not realize there are more snapshots to the right
3. **Awkward navigation** - Horizontal scrolling is less natural than vertical
4. **Print/export issues** - Scrolled content gets cut off

### Current Behavior

```
┌─────────────────────────────────────────────────┐
│ Container (fixed width)                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Snap1] [Snap2] [Snap3] [Snap4] ══►scroll   │ │ ← horizontal scroll
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                                    [Snap5] [Snap6] hidden →
```

### Desired Behavior

```
┌─────────────────────────────────────────────────┐
│ Container (fixed width)                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │  Snap1   │ │  Snap2   │ │  Snap3   │         │
│ │  t=0.0   │ │  t=0.5   │ │  t=1.0   │         │
│ └──────────┘ └──────────┘ └──────────┘         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │  Snap4   │ │  Snap5   │ │  Snap6   │  ← wraps│
│ │  t=1.5   │ │  t=2.0   │ │  t=2.5   │         │
│ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────┘
```

## Proposed Solution

Change filmstrip layout from `display: flex` with `overflow-x: scroll` to `display: flex` with `flex-wrap: wrap`.

### Implementation

#### Option A: Always Wrap (Simplest)

**File**: `stories/components/Filmstrip.tsx`

```tsx
// Before:
<div style={{
  display: 'flex',
  gap: 8,
  overflowX: 'auto',  // causes scrollbar
}}>

// After:
<div style={{
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  // no overflow - content wraps naturally
}}>
```

#### Option B: Configurable (More Flexible)

```tsx
interface FilmstripProps {
  // ... existing props ...

  /** Layout behavior when content exceeds width */
  overflow?: 'wrap' | 'scroll';
}

export function Filmstrip({
  overflow = 'wrap',  // new default
  ...props
}: FilmstripProps) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: overflow === 'wrap' ? 'wrap' : 'nowrap',
      overflowX: overflow === 'scroll' ? 'auto' : 'visible',
      gap: props.gap ?? 8,
    }}>
      {/* snapshots */}
    </div>
  );
}
```

**Recommendation**: Start with Option A. Add Option B only if we find cases where scrolling is preferred.

## Files to Update

| File | Change |
|------|--------|
| `stories/components/Filmstrip.tsx` | Add `flex-wrap: wrap`, remove `overflow-x` |
| `stories/components/BathymetryStrip.tsx` | Same if it has its own flex container |
| `stories/components/FoamContourStrip.tsx` | Same if applicable |

## Visual Regression Impact

Existing baseline screenshots may need updating since layout will change. Snapshots will now stack vertically when they don't fit horizontally.

## Success Criteria

1. Filmstrips wrap to multiple rows when container is narrow
2. No horizontal scrollbars on filmstrip containers
3. All snapshots visible without scrolling (vertical page scroll is fine)
4. Existing visual tests updated with new baselines
5. Works in both light and dark themes

## Edge Cases

- **Very long progressions** (20+ snapshots): Will create tall filmstrips, but vertical scrolling is more natural
- **Very small viewports**: May wrap to 1 column, which is acceptable
- **Print/PDF export**: Wrapping ensures all content is captured

## Future Considerations

- **Responsive breakpoints**: Could adjust snapshot size based on viewport
- **Grid layout**: CSS Grid with `auto-fit` could provide more control over column count
- **Pagination**: For very long progressions, consider paginated view instead of single filmstrip
