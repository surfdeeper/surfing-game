---
description: Launch interactive visual debugging agent with Chrome DevTools
argument-hint: [story-url or description]
---

# Interactive Visual Debugging

Launch the visual-debugging agent to interactively explore stories in the browser, compare screenshots, and debug visual test failures.

## What This Does

Spawns a specialized agent that:
1. Opens Chrome with DevTools MCP integration
2. Navigates to the stories viewer
3. Can take snapshots and screenshots
4. Compares against baseline images
5. Helps debug visual differences

## Stories URL
`http://localhost:61005`

## Request
$ARGUMENTS

## Instructions for Agent

Use the Task tool with `subagent_type: "visual-debugging"` to launch the interactive visual debugging session.

The agent should:
1. Navigate to the stories viewer at http://localhost:61005
2. Take snapshots to understand the page structure
3. Navigate to specific stories if requested
4. Take screenshots for comparison
5. Help identify visual differences from baseline

If a specific story or test failure is mentioned, focus on that. Otherwise, explore the stories viewer interactively.
