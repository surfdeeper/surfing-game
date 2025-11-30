# Plan 230: Wireit Task Orchestration

**Status**: Proposed
**Category**: tooling
**Depends On**: None

## Problem

Currently, all visual tests run regardless of what changed:
- Changing game code in `src/` re-runs viewer self-tests unnecessarily
- Changing viewer UI in `stories/App.tsx` re-runs game rendering tests unnecessarily
- No enforcement that unit tests pass before visual tests run
- CI time wasted on irrelevant test suites

### Current Test Domains

| Domain | Location | Validates |
|--------|----------|-----------|
| **Unit tests** | `src/**/*.test.ts` | Game logic, state, calculations |
| **Game visual tests** | `stories/**/*.visual.spec.ts` | Wave physics rendering via React components |
| **Viewer self-tests** | `tests/stories/smoke.spec.js` | Stories viewer UI (nav, presentation mode) |
| **Game E2E** | `tests/smoke.spec.js` | Main game loads without errors |

### Dependency Graph

```
src/                         ← Game core
  ↓
stories/components/          ← React wrappers (import from src/)
  ↓
stories/App.tsx              ← Viewer app
  ↓
tests/stories/               ← Viewer self-tests
```

## Proposed Solution

Add [wireit](https://github.com/nicholasalx/wireit) as a **coarse-grained circuit breaker** layer:

1. **Skip heavy tasks when irrelevant files change** - Only markdown changed? Skip all tests entirely
1. **Fail-fast ordering** - Smoke tests fail? Don't bother running expensive visual tests
1. **Dependency enforcement** - Unit tests must pass before visual tests
1. **Output caching** - Skip tasks when inputs unchanged

### What Wireit Is NOT For

Wireit uses file-hash globs, not import-graph analysis. It cannot determine "this specific test depends on this specific module." For fine-grained, import-aware selective testing, see [Plan 231: Monorepo Tooling Evaluation](./231-monorepo-tooling-evaluation.md).

**Layered approach**:
```
Layer 1: wireit (coarse, file-hash based)
  "Did ANY .ts file change?"
  → No: skip all code-related tasks (instant)
  → Yes: proceed to Layer 2

Layer 2: (future) Import-aware tool
  "Which tests actually depend on what changed?"
  → Only run affected tests
```

Wireit is lightweight (~50KB), requires no config files beyond package.json, and integrates with existing npm scripts.

## Implementation Steps

### 1. Install wireit

```bash
npm install --save-dev wireit
```

### 2. Split visual test scripts

Currently there's one visual test command. Split into two:

```json
{
  "test:visual:game": "playwright test --config=playwright.visual.config.js stories/",
  "test:visual:viewer": "playwright test --config=playwright.stories.config.js"
}
```

### 3. Add wireit configuration to package.json

```json
{
  "scripts": {
    "test:smoke": "wireit",
    "test:unit": "wireit",
    "test:visual:game": "wireit",
    "test:visual:viewer": "wireit",
    "test:all": "wireit"
  },
  "wireit": {
    "test:smoke": {
      "command": "playwright test tests/smoke.spec.js",
      "files": ["src/**/*.ts", "src/**/*.tsx", "index.html", "tests/smoke.spec.js"],
      "output": []
    },
    "test:unit": {
      "command": "vitest run",
      "dependencies": ["test:smoke"],
      "files": ["src/**/*.ts", "src/**/*.tsx", "vitest.config.ts"],
      "output": []
    },
    "test:visual:game": {
      "command": "playwright test --config=playwright.visual.config.js stories/",
      "dependencies": ["test:unit"],
      "files": [
        "src/**/*.ts",
        "stories/components/**/*.tsx",
        "stories/**/*.visual.spec.ts",
        "playwright.visual.config.js"
      ],
      "output": ["stories/**/*.png"]
    },
    "test:visual:viewer": {
      "command": "playwright test --config=playwright.stories.config.js",
      "dependencies": ["test:smoke"],
      "files": [
        "stories/App.tsx",
        "stories/main.tsx",
        "stories/ThemeContext.tsx",
        "stories/index.html",
        "tests/stories/**/*.spec.js",
        "playwright.stories.config.js"
      ],
      "output": []
    },
    "test:all": {
      "dependencies": ["test:unit", "test:visual:game", "test:visual:viewer"]
    }
  }
}

**Execution order** (wireit runs dependencies first, parallelizes where possible):
```
test:smoke (fast, ~3s)
    ├── fail? → STOP (don't waste time on broken app)
    └── pass? → continue
         ├── test:unit (parallel with test:visual:viewer)
         │      └── test:visual:game (after unit passes)
         └── test:visual:viewer (parallel with unit)
```

### 4. Update CI workflow (if applicable)

Replace single test command with `npm run test:all` which leverages wireit's caching and dependency ordering.

### 5. Preserve manual overrides

Keep non-wireit versions for debugging:

```json
{
  "test:visual:game:force": "playwright test --config=playwright.visual.config.js stories/",
  "test:visual:viewer:force": "playwright test --config=playwright.stories.config.js"
}
```

### 6. Update CLAUDE.md

Add wireit commands to pre-approved list and document new test workflow.

## Files Affected

- `package.json` - Add wireit dependency and configuration
- `package-lock.json` - Updated by npm install
- `CLAUDE.md` - Document new commands

## Testing

1. **Verify dependency enforcement**:
   ```bash
   # Break a unit test intentionally
   # Run test:visual:game - should fail at unit test step
   ```

1. **Verify selective execution**:
   ```bash
   # Touch only src/render/colorScales.ts
   npm run test:visual:game  # Should run
   npm run test:visual:viewer  # Should skip (cache hit)
   ```

1. **Verify caching**:
   ```bash
   npm run test:all  # First run: executes all
   npm run test:all  # Second run: all cached (near-instant)
   ```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Cache invalidation bugs | Keep `:force` variants for manual override |
| Overly broad file globs | Start conservative, narrow based on actual usage |
| CI caching complexity | Wireit uses local `.wireit/` cache; consider CI cache config later |

## Future Enhancements

If wireit proves insufficient:
- **Nx migration** - For true import-graph-aware affected detection
- **Turborepo** - Alternative to Nx with simpler mental model
- **Granular story testing** - Map each `src/` module to specific story tests

## Alternatives Considered

| Option | Verdict |
|--------|---------|
| **Nx** | Overkill for 71 files; revisit at 100+ files or multiple teams |
| **Lerna** | Designed for multi-package publishing, not task orchestration |
| **Bazel** | Enterprise scale, steep learning curve |
| **Custom script** | No caching, manual maintenance burden |
| **Turborepo** | Similar to wireit but heavier; wireit is sufficient for now |
