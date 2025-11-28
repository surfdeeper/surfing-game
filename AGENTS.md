# Agent Instructions

Guidelines for AI agents working on this codebase.

## Core Principles

### Tight Feedback Loops
Always prefer the fastest feedback mechanism available:
1. **Lint first** (`npm run lint`) - catches syntax/import errors in ~1 second
2. **Run single tests** - don't run all tests when iterating on one
3. **Don't chain commands** - run `npm run lint` separately from tests; if lint passes, then run tests. Don't `lint && test` which delays test feedback.

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

## Context File Hierarchy

When starting work, Claude reads context in this order:
1. `AGENTS.md` (this file) - Guidelines and commands
2. `plans/00-principles.md` - Foundational physics concepts
3. Relevant skill(s) - Auto-loaded based on task
4. Specific plan document - For feature work
