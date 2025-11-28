---
description: Create or explore bug fix plans in plans/bugfixes/
argument-hint: [bug-description]
---

# Bug Fix Plan Context

I need to work with a bug fix plan. Here's the current bugfixes directory:

## Current Bug Plans
! ls -la plans/bugfixes/

## Bug Plan Template
When creating a new bug plan, use this structure:
```markdown
# Bug: [Title]

**Status**: Investigating | Proposed | In Progress | Fixed | Won't Fix
**Depends On**: [plan numbers, if any]

## Symptom
[What the user observes]

## Expected Behavior
[What should happen]

## Root Cause Analysis
[Investigation findings]

## Proposed Fix
[Technical approach]

## Files Affected
- [file paths]

## Testing
[How to verify the fix]
```

## Request
$ARGUMENTS

If this is a new bug:
1. Create a plan in `plans/bugfixes/` with descriptive name (e.g., `fix-wave-timing-drift.md`)
2. Document the symptom and expected behavior
3. Investigate root cause before proposing a fix

If exploring existing bugs:
1. Show relevant bug plans
2. Summarize current status and proposed fixes
