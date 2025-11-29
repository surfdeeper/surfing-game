# Plan 201: Stories Anchor Navigation

Status: PLACEHOLDER
Owner: agents
Depends on: 200-mdx-visual-docs

## Problem

The MDX stories viewer has a single page with many stories but only one navigation link. Users cannot:
- Link directly to a specific story/progression
- See a table of contents with all available stories
- Navigate within the page efficiently

## Solution

Add `#anchor` style navigation:
1. Each story/progression gets an `id` attribute
2. Sidebar shows all stories with `href="#anchor"` links
3. Clicking a link scrolls to that story and updates the URL hash
4. Direct links like `/stories#no-damping` work on page load

## Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | Add `id` attributes to each story section in MDX | |
| 2 | Generate sidebar links from story headings | |
| 3 | Handle initial hash on page load (scroll to anchor) | |
| 4 | Update URL hash when clicking sidebar links | |
| 5 | Optional: highlight active section in sidebar on scroll | |

## Files to Modify

- `stories/App.tsx` - sidebar navigation component
- `stories/energy-field.mdx` - add section IDs
- `stories/components/ProgressionPlayer.tsx` - possibly wrap with anchor

## Notes

- Keep it simple - no routing library needed, just native anchor behavior
- Consider auto-generating IDs from progression names
