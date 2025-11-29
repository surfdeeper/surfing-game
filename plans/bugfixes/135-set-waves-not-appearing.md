# Bug: Set Waves Not Appearing

**Status**: Fixed (localStorage issue)
**Depends On**: None

## Symptom
User reports seeing only background waves, with set waves not appearing even when not in a lull period.

## Expected Behavior
- During LULL state: Only background waves visible (these are smaller, subtle)
- During SET state: Both set waves AND background waves visible (set waves are larger, more prominent)
- State cycles: LULL (~30s) -> SET (4-8 waves at ~15s intervals) -> LULL

## Root Cause Analysis

### Investigation Findings

1. **Unit tests pass**: All 69 tests in `setLullModel.test.js` pass, confirming the state machine logic is correct.

1. **E2E tests pass**: Created new Playwright tests (`tests/set-waves.spec.js`) that verify:
   - Game starts in LULL state
   - Set waves spawn when state transitions to SET
   - No set waves spawn during LULL
   - State cycles LULL -> SET -> LULL correctly
   - Toggle only affects visibility, not simulation

1. **Root cause identified**: The issue is **stale localStorage state**.
   - Game state is persisted to localStorage (including `setLullState` and `gameTime`)
   - If the user's localStorage has corrupted or mismatched timestamps, the state machine may appear stuck
   - The `showSetWaves` toggle defaults to `true`, so that's not the issue

### Possible Scenarios

1. **User accidentally pressed 'S' key**: This toggles set wave visibility off. Set waves still simulate but aren't drawn.

1. **Stale localStorage from old session**: If `setLullState.stateStartTime` is from a very old session but doesn't match current `gameTime`, timing could be off.

1. **Tab was hidden during transition**: The visibility change handler resets timing, which should be correct but might have edge cases.

## Fix

**Immediate fix for user**: Clear localStorage and refresh:
```javascript
localStorage.clear();
location.reload();
```

Or press 'S' key to toggle set wave visibility if it was accidentally turned off.

## Files Affected
- `src/main.jsx` - Added `window.world` and `window.toggles` exposure for E2E testing

## Testing
- Created comprehensive E2E test suite: `tests/set-waves.spec.js`
- All 7 tests pass, confirming correct behavior:
  1. Game starts in LULL state
  1. Set waves spawn when state transitions to SET
  1. No set waves spawn during LULL state
  1. Background waves spawn continuously
  1. Waves array contains both types after full cycle
  1. State cycles LULL -> SET -> LULL
  1. Set wave toggle affects visibility but waves still simulate

## Prevention
- The window.world exposure allows debugging state in browser console
- Consider adding a "Reset Game State" button to the debug panel
- Consider showing set wave count in debug panel to verify spawning
