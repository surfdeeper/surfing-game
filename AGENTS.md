# Agent Instructions

Guidelines for AI agents working on this codebase.

## Core Principles

### Tight Feedback Loops
Always prefer the fastest feedback mechanism available:
1. **Lint first** (`npm run lint`) - catches syntax/import errors in ~1 second
1. **Smoke test** (`npx playwright test tests/smoke.spec.js:3`) - verifies app loads without JS errors (~3 seconds)
1. **Run specific tests** - test files related to your changes, not the entire suite
1. **Don't chain commands** - run `npm run lint` separately from tests; if lint passes, then run tests. Don't `lint && test` which delays test feedback.

**CRITICAL**: Always run the smoke test after changes. Unit tests can pass while the app is broken (e.g., broken imports not exercised by unit tests).

### Use Pre-approved Commands
These commands are pre-approved and won't prompt for confirmation:
- `npm run lint`
- `npm test`
- `npm run test:visual:headless`
- `npm run test:visual:update:headless`
- `npm run reset:visual`
- `npx vitest run <specific-file>`
- `npx playwright test <specific-file>`

Prefer these simple commands over complex chained commands that require permission.

### Scripts Folder Pattern
When you need to run complex bash logic (timeouts, retries, multi-step operations), **create a script in `scripts/`** instead of writing inline bash. This enables:

1. **Pre-approval** - Scripts can be added to the allow-list, avoiding permission prompts
1. **Reusability** - Same script works across sessions
1. **Readability** - Complex logic is documented and version-controlled

**Example**: Instead of `timeout 10 npm run dev & sleep 3 && npm test`, create:
```bash
# scripts/dev-with-test.sh
#!/bin/bash
timeout 10 npm run dev &
sleep 3
npm test
```

Then run: `./scripts/dev-with-test.sh` (can be pre-approved)

**Existing scripts**:
- `scripts/check-no-js.sh` - Verify no JS files remain after TS migration

## Plans Directory

Plans are organized by category in `/plans/`. See [plans/README.md](plans/README.md) for full documentation.

| Folder | Purpose |
|--------|---------|
| `model/` | Wave physics, simulation, timing |
| `visuals/` | Rendering, gradients, effects |
| `gameplay/` | Surfer, controls, multiplayer |
| `tooling/` | Debug panel, dev tools |
| `testing/` | Test strategy |
| `bugfixes/` | Bug fixes |
| `reference/` | Research docs |
| `archive/` | Superseded plans |

## Code Reuse Principle

### Tests Must Test Production Code

**The code that tests exercise MUST be the same code that runs in production.**

❌ **Anti-pattern (what we found)**:
```
Helper module (tested) → Used by Storybook
Inline copy (untested) → Used by main.jsx (production)
```
Tests pass, but production runs different code.

✅ **Correct pattern**:
```
Helper module (tested) → Used by BOTH Storybook AND main.jsx
```
One implementation, tested once, used everywhere.

### When Extracting Helpers

When creating a reusable module (e.g., `src/render/fooRenderer.js`):

1. **Use it immediately** - The caller must import and use it in the same commit
1. **Delete inline code** - Remove any duplicated logic from main.jsx
1. **Never create tested-but-unused helpers** - If nothing imports it, it shouldn't exist

### Detecting Dead Helpers

Before committing, verify helpers are actually used:
```bash
# Check if exports from render modules are imported somewhere
grep -l "export function" src/render/*.js | while read f; do
  funcs=$(grep -o "export function [a-zA-Z]*" "$f" | cut -d' ' -f3)
  for func in $funcs; do
    if ! grep -rq "$func" src/main.jsx src/stories/; then
      echo "⚠️  $f: $func is exported but never imported"
    fi
  done
done
```

## Code Style

- Vanilla JavaScript (no TypeScript currently)
- Canvas 2D for rendering (future: React + Three.js)
- Vite for dev server and bundling
- Vitest for unit tests
- Playwright for E2E tests

## Linting

Run the linter for fast syntax/import feedback:
```bash
npm run lint    # ESLint - catches errors quickly without running tests
```

Run lint before running tests to catch basic issues faster.

## Testing

Run tests before committing (explicit commands only):
```bash
npm run lint    # Lint first - fast feedback on syntax/import errors
npm test        # Unit tests
npm run test:e2e  # E2E tests (if available)
npm run test:visual:headless        # Visual tests in headless mode
npm run test:visual:headed          # Visual tests with browser UI
npm run test:visual:update:headless # Update baseline snapshots (headless)
npm run test:visual:update:headed   # Update baseline snapshots (headed)
npm run reset:visual          # Clear visual results/report
npm run reset:visual:all      # Also clear baseline snapshots
```

Notes:
- Do not use deprecated or ambiguous commands (e.g., `test:visual`).
- Prefer headless for CI/agents; headed is for local debugging.

## Slash Commands

Custom commands for common workflows (`.claude/commands/`):

| Command | Purpose | Example |
|---------|---------|---------|
| `/feat` | Create or explore feature plans | `/feat add foam dispersion` |
| `/bug` | Create or explore bug fix plans | `/bug wave timing drift` |
| `/plan` | Show roadmap status and active plans | `/plan` |
| `/physics` | Load wave physics context | `/physics` |
| `/test` | Run tests with context | `/test unit` or `/test foamDispersion.test.js` |
| `/visual` | Visual regression workflows | `/visual run` or `/visual update` |
| `/refactor` | Find duplicate code, discuss consolidation | `/refactor src/render/` |

## Skills

Skills are auto-applied by Claude based on context (`.claude/skills/`):

| Skill | Auto-triggers when... |
|-------|----------------------|
| `wave-physics` | Editing simulation code, discussing wave behavior |
| `plan-management` | Creating/organizing plans, documentation |
| `testing` | Writing tests, editing `*.test.js` or `tests/` |
| `visualization-algorithms` | Editing `src/render/`, graphics algorithms |
| `react-ui` | JSX files, React component work |
| `performance` | "slow", "fps", "lag", optimization discussions |
| `refactoring` | "duplicate", "refactor", "DRY", "extract", "consolidate" |
| `debugging` | "bug", "broken", "not working", "glitch", "flickering" |

## Debugging Methodology

When debugging issues:

1. **Automate first** - Write a Vitest test to reproduce the bug, never ask user to manually check console
1. **Isolate the layer** - Is it calculation (logic) or rendering (CSS/browser)?
1. **Check CSS interactions** - Transitions, animations, transforms can conflict with React 60fps updates
1. **Time progression tests** - For game loop bugs, test with simulated time advancement

### Debug State Exposure

For complex debugging, expose state to browser console (dev only):
```javascript
if (import.meta.env.DEV) {
  window.__debug = { setLullState, gameTime };
}
```

Then inspect: `window.__debug.setLullState`

### Common Pitfall: CSS + 60fps

If Vitest tests pass but browser visuals are wrong (flickering, stuck values), check for CSS transitions on frequently-updated elements. Remove them - CSS transitions fight with React's 60fps re-renders.

## Context File Hierarchy

When starting work, Claude reads context in this order:
1. `AGENTS.md` (this file) - Guidelines and commands
1. `plans/00-principles.md` - Foundational physics concepts
1. Relevant skill(s) - Auto-loaded based on task
1. Specific plan document - For feature work
- never mark tests skipped without human consent.
- Always try to run the linter and type checker individually instead of relying on the pre-commit hook.
- npm run dev is game, npm run stories is visual testing react app viewer