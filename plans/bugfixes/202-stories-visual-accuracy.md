# Plan 202: Stories Visual Accuracy Bugs

Status: PLACEHOLDER
Owner: agents
Depends on: 200-mdx-visual-docs

## Problem

The MDX stories viewer shows incorrect visuals for some progressions:

1. **"No dissipation" shows dissipation** - The progression labeled as having no dissipation actually shows energy decay, which contradicts its name/purpose

2. **"Hole" example looks odd** - The hole/gap visualization doesn't render as expected (needs more detail on what's wrong)

## Investigation Needed

- Is this a data bug (wrong parameters in `defineProgression()`)?
- Is this a rendering bug (correct data, wrong visualization)?
- Are the labels/descriptions wrong (correct behavior, wrong name)?

## Potential Causes

1. **Wrong damping coefficient** - `depthDampingCoefficient` might not be 0 for "no dissipation"
2. **Matrix interpretation** - Color mapping might not match expected values
3. **Progression definition** - Test file exports might have incorrect config
4. **Render function** - `renderEnergyField` might apply transformations

## Files to Investigate

- `src/state/energyFieldPropagation.test.js` - progression definitions
- `stories/energy-field.mdx` - which progressions are displayed
- `stories/components/ProgressionPlayer.tsx` - rendering logic
- `src/test-utils/progression.js` - snapshot capture logic

## Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | Identify which progressions are affected | |
| 2 | Check progression definitions for correct parameters | |
| 3 | Verify matrix values match expected behavior | |
| 4 | Fix data or rendering as needed | |
| 5 | Update labels if behavior is actually correct | |

## Notes

- Need user to elaborate on what "odd" means for the hole example
- May need screenshots to compare expected vs actual
