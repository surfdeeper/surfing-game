# Bug: Progress Bars Visual Glitches

**Status**: Fixed
**Root Cause**: CSS transition conflicting with 60fps React re-renders

## Symptom
- Circular progress bars "tweaking out" / flickering
- Progress stuck at constant value (~0.69) visually despite correct text values
- Text showing correct countdown (e.g., "5.0s / 15.0s") but progress bar not matching

## Expected Behavior
Progress bars should smoothly drain from 100% to 0% as countdown progresses, matching the text display.

## Root Cause Analysis

### Investigation Process
1. Initially suspected calculation error - text was correct but progress bar wrong
1. Added `console.log` and asked user to check browser - **wrong approach**
1. User requested automated debugging via Vitest - **correct approach**
1. Wrote integration tests that proved calculation was correct
1. Tests passed, meaning calculation logic is fine
1. Identified CSS transition as the culprit

### The Bug
`src/ui/DebugPanel.css` had:
```css
.circular-progress-fill {
  transition: stroke-dashoffset 0.1s ease-out;
}
```

When React re-renders at 60fps, the CSS transition tries to animate each change over 100ms. But by the time the transition completes, React has already updated the value dozens of times. This creates visual artifacts where the transition keeps restarting from different values.

## Fix Applied

1. **Removed CSS transition** from `.circular-progress-fill`
1. **Added debug text format** showing `remaining / total` (e.g., "5.0s / 15.0s") for easier debugging
1. **Added integration tests** that verify progress changes correctly over simulated time

### Files Changed
- `src/ui/DebugPanel.css` - Removed transition
- `src/ui/DebugPanel.jsx` - Added total to CountdownReadOnly component
- `src/ui/DebugPanel.test.jsx` - Added time progression integration tests

## Testing
```bash
npm run lint                    # Pass
npx vitest run src/ui/DebugPanel.test.jsx  # 60 tests pass
```

## Lessons Learned

1. **CSS transitions + 60fps React don't mix** - Never use CSS transitions on elements that re-render every frame
1. **Test in Vitest first** - Don't ask user to check console; write automated tests
1. **Integration tests catch calculation bugs** - Unit tests for components should include time progression scenarios

---

# Context Engineering Gap Analysis

## What Went Wrong in the Debugging Process

| Step | What Happened | What Should Have Happened |
|------|---------------|---------------------------|
| 1 | Added console.log, asked user to check | Write Vitest test to verify calculation |
| 2 | User had to request automated approach | Agent should default to automated debugging |
| 3 | Suspected calculation error | Should have suspected CSS/rendering earlier |
| 4 | Multiple rounds of back-and-forth | Single automated test suite should have isolated issue |

## Existing Context Engineering Review

### CLAUDE.md
**Strengths:**
- Clear command reference
- Tight feedback loops principle
- Plan organization

**Gaps:**
- No guidance on debugging methodology
- No mention of automated vs manual debugging
- No CSS + React anti-patterns

### react-ui Skill
**Strengths:**
- Component patterns
- Performance optimization with useMemo/useCallback
- Testing patterns

**Gaps:**
- **Missing: CSS transition warning for 60fps elements**
- **Missing: Separation of calculation from rendering**
- **Missing: Debug state exposure patterns**

### testing Skill
**Strengths:**
- Comprehensive test type documentation
- Visual test patterns
- Performance test patterns

**Gaps:**
- **Missing: CSS/rendering bug detection**
- **Missing: Integration tests for time-based UI**
- **Missing: Browser-specific vs logic-specific test guidance**

### performance Skill
**Strengths:**
- Frame budget documentation
- Memory optimization patterns
- Canvas rendering patterns

**Gaps:**
- **Missing: CSS transition performance impact**
- **Missing: React re-render + CSS animation conflicts**

## Recommended Context Engineering Updates

### 1. Add to react-ui Skill

```markdown
## CSS Anti-Patterns for 60fps Updates

NEVER use CSS transitions on elements updated via requestAnimationFrame or every-frame React renders:

```css
/* BAD - transition fights with 60fps updates */
.progress-fill {
  transition: stroke-dashoffset 0.1s ease-out;
}

/* GOOD - no transition for frequently-updated elements */
.progress-fill {
  /* Direct value updates, no transition */
}
```

If smooth animation is needed, use JavaScript animation (RAF) or React Spring, not CSS transitions.

## Debugging UI Issues

1. **Never ask user to check console** - write automated tests instead
1. **Expose debug state** for browser inspection:
   ```javascript
   if (import.meta.env.DEV) {
     window.__debug = { state, gameTime };
   }
   ```
1. **Separate calculation from rendering** - extract to testable pure functions
```

### 2. Add to testing Skill

```markdown
## Testing UI Behavior Over Time

For components that update every frame, write integration tests that simulate time progression:

```javascript
it('progress increases as gameTime advances', () => {
  const { rerender } = render(<Component gameTime={0} />);
  const offset0 = getProgressOffset();

  rerender(<Component gameTime={5000} />);
  const offset5 = getProgressOffset();

  expect(offset5).toBeLessThan(offset0); // Progress increased
});
```

## CSS vs Logic Bugs

| Symptom | Likely Cause | Test Strategy |
|---------|--------------|---------------|
| Calculation wrong | Logic bug | Unit test with known inputs |
| Value correct, visual wrong | CSS/rendering | Integration test + CSS inspection |
| Flickering/tweaking | CSS transition conflict | Remove transitions, test in browser |

```

### 3. Add to CLAUDE.md

```markdown
## Debugging Methodology

When debugging UI issues:

1. **Write a failing test first** - reproduce the bug in Vitest
2. **Never ask user to manually check** - automate everything
3. **Separate concerns**: Is the bug in calculation or rendering?
4. **Check CSS interactions** - transitions, animations, transforms can conflict with React

### Debug State Exposure

For complex debugging, expose state to browser:
```javascript
// In game loop (dev only)
if (import.meta.env.DEV) {
  window.__debug = { setLullState, gameTime };
}
```

Then inspect in browser console: `window.__debug.setLullState`
```

### 4. Create New Skill: debugging

```markdown
---
name: debugging
description: Apply systematic debugging methodology. Use when investigating bugs, unexpected behavior, or when user reports issues. Auto-apply when conversation includes "bug", "broken", "not working", "wrong".
---

# Debugging Skill

## Core Principle

**Automate first, ask questions never.** If you can write a test to verify behavior, do that instead of asking the user to manually check something.

## Debugging Decision Tree

1. **Can I reproduce in a test?** → Write failing test first
2. **Is the calculation correct?** → Unit test with known inputs
3. **Is the rendering correct?** → Integration test, check CSS
4. **Is it browser-specific?** → Playwright test
5. **Is it timing-related?** → Time progression integration test

## Common Pitfalls

| Pitfall | Correct Approach |
|---------|------------------|
| Adding console.log and asking user to check | Write Vitest test |
| Guessing at the problem | Systematically isolate with tests |
| Fixing symptoms not causes | Identify root cause first |
| Manual browser debugging | Playwright automation |

## CSS + React Conflicts

Common issue: CSS transitions on elements updated every frame cause visual glitches.

**Detection**: Value is correct but visual is wrong/flickering.

**Fix**: Remove CSS transitions from frequently-updated elements.
```

## Summary

This bug took longer to fix than necessary because:

1. **No guidance against manual debugging** - I defaulted to asking user to check console
1. **No CSS + 60fps warning** - Common pitfall not documented
1. **No debugging skill** - No systematic methodology documented

The fix was simple (remove one CSS line), but the debugging process was inefficient. Adding the recommended context engineering updates would prevent similar issues in the future.
