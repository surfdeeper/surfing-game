---
description: Create or explore feature plans in plans/ directory
argument-hint: [category/name]
---

# Feature Plan Context

I need to work with a feature plan. Here's the current plans directory structure:

## Plans Structure
! tree plans/ -L 2 --dirsfirst

## Available Categories
- `model/` - Wave physics, simulation, timing
- `visuals/` - Rendering, gradients, effects
- `gameplay/` - Surfer, controls, multiplayer
- `tooling/` - Debug panel, dev tools
- `testing/` - Test strategy
- `world/` - Environmental systems

## Numbering Convention
Plans use increments of 10 (10, 20, 30...). Find the next available number in the target category.

## Request
$ARGUMENTS

If creating a new plan:
1. Determine the appropriate category folder
2. Find the next available number in that folder
3. Use this template structure:
   - Problem statement
   - Proposed Solution
   - Implementation Steps (numbered)
   - Files Affected
   - Dependencies (other plan numbers if any)

If exploring existing plans:
1. Search for relevant plans matching the topic
2. Show the plan contents
3. Highlight dependencies and related plans
