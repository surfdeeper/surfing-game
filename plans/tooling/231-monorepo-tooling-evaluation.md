# Plan 231: Monorepo Tooling Evaluation

**Status**: Proposed
**Category**: tooling
**Depends On**: 230 (Wireit Task Orchestration)

## Problem

[Plan 230](./230-wireit-task-orchestration.md) adds coarse-grained circuit breakers via wireit, but wireit cannot determine import-level dependencies. When `src/render/colorScales.ts` changes, wireit re-runs ALL game visual tests because the glob `src/**/*.ts` matches—even if only one story actually imports that module.

For fine-grained selective testing ("only run tests that transitively depend on changed files"), we need import-graph-aware tooling.

### Secondary Concern: Repo Structure

Even without monorepo tooling, there's a question of whether the codebase should be:
- **Single repo** (current) with logical boundaries
- **Multi-repo** with separate versioning/releases
- **Monorepo with workspaces** (npm/yarn/pnpm workspaces)

## Goals

1. Evaluate monorepo tools for **import-aware affected detection**
1. Evaluate **repo structure options** (single vs multi vs workspace monorepo)
1. Avoid **version lockstep tax** (forced synchronized upgrades)
1. Maintain **simplicity** appropriate to current scale (~71 files, single developer)

## Current Logical Packages

Even in a flat structure, the code has clear boundaries:

| Logical Package | Location | Responsibility |
|-----------------|----------|----------------|
| `game-core` | `src/state/`, `src/update/`, `src/core/` | Pure game logic, no rendering |
| `game-render` | `src/render/` | Canvas rendering, color scales |
| `game-app` | `src/main.tsx`, `index.html` | Game entry point |
| `story-components` | `stories/components/` | React wrappers for visualizations |
| `story-viewer` | `stories/App.tsx`, `stories/main.tsx` | MDX documentation viewer |

## Options Evaluation

### Option A: Turborepo + npm Workspaces

**Structure**:
```
packages/
  game-core/
    package.json  ← { "name": "@surf/core", "dependencies": {} }
    src/
  game-render/
    package.json  ← { "name": "@surf/render", "dependencies": { "@surf/core": "*" } }
    src/
  game-app/
    package.json  ← depends on @surf/core, @surf/render
  story-components/
    package.json  ← depends on @surf/render
  story-viewer/
    package.json  ← depends on story-components
turbo.json
package.json  ← workspaces: ["packages/*"]
```

**How affected detection works**:
```bash
turbo run test --filter=...[HEAD~1]
# Turborepo traces package.json dependencies
# If @surf/render changed, runs tests in @surf/render + story-components + story-viewer
```

| Pros | Cons |
|------|------|
| Automatic dependency graph from package.json | Structural migration effort |
| Remote caching (Vercel) | 5 package.json files to maintain |
| No version lockstep (each package has own deps) | Import paths change (`@surf/core`) |
| Fast (~10MB install) | |

### Option B: Nx

**Structure**: Similar to Turborepo, but uses `project.json` per package.

**How affected detection works**:
```bash
nx affected:test --base=HEAD~1
# Nx builds project graph from imports (not just package.json)
# More granular than Turborepo
```

| Pros | Cons |
|------|------|
| Most sophisticated affected detection | Heavy (~500MB) |
| Plugins for React, Vite, Playwright | Steeper learning curve |
| Computation caching | Version lockstep pressure (default behavior) |
| | Can feel like "Nx's way or highway" |

**Version lockstep concern**: Nx defaults to single-version policy. You *can* have different versions via `package.json` overrides, but it fights the tool's assumptions.

### Option C: moon (Rust-based)

**Structure**: Similar to Turborepo.

```yaml
# moon.yml
projects:
  game-core: packages/game-core
  game-render: packages/game-render
```

| Pros | Cons |
|------|------|
| Very fast (Rust) | Newer, smaller ecosystem |
| Language-agnostic | Less documentation |
| No version lockstep | |

### Option D: Keep Flat + Custom Script

Stay with current structure. Write a script that:
1. Uses `madge` or `dependency-cruiser` to build import graph
1. Maps changed files → affected test files
1. Passes to Playwright `--grep` or Vitest `--testNamePattern`

```bash
# scripts/affected-tests.sh
CHANGED=$(git diff --name-only HEAD~1)
AFFECTED=$(npx madge --json src/ | node scripts/trace-dependents.js $CHANGED)
npx playwright test $AFFECTED
```

| Pros | Cons |
|------|------|
| No structural changes | Custom code to maintain |
| No new tooling | Less robust than dedicated tools |
| Immediate | No caching benefits |

### Option E: Multi-Repo

Split into separate repositories:
- `surf-game` (game + tests)
- `surf-docs` (story viewer + visual tests)

| Pros | Cons |
|------|------|
| Complete isolation | Coordination overhead |
| Independent versioning | Shared code duplication or npm publishing |
| | Harder to make cross-cutting changes |

**Verdict**: Overkill for current scale. Consider only if teams diverge or release cycles differ significantly.

## Recommendation

**Short-term (now)**: Implement Plan 230 (wireit) for coarse circuit breakers.

**Medium-term (when feeling pain)**: **Turborepo + workspaces**
- Less opinionated than Nx
- No version lockstep
- Good enough affected detection for this scale
- Remote caching is nice-to-have

**Avoid**: Nx (too heavy), multi-repo (premature), custom scripts (maintenance burden).

## Migration Path to Turborepo

If/when we proceed:

### Phase 1: Workspace Structure (no Turborepo yet)
1. Create `packages/` directory
1. Move `src/state/`, `src/core/`, `src/update/` → `packages/game-core/src/`
1. Move `src/render/` → `packages/game-render/src/`
1. Create package.json files with internal dependencies
1. Update import paths (`../../state/` → `@surf/core`)
1. Verify everything builds/tests

### Phase 2: Add Turborepo
1. `npm install turbo --save-dev`
1. Create `turbo.json` with pipeline definitions
1. Replace wireit with turbo for task orchestration
1. Configure CI to use `turbo run test --filter=...[origin/main]`

### Phase 3: (Optional) Remote Caching
1. Sign up for Vercel (free tier)
1. `turbo login && turbo link`
1. CI and local dev share cache

## Decision Criteria

Revisit this plan when:
- [ ] Visual test suite takes > 2 minutes
- [ ] Multiple contributors stepping on each other
- [ ] Need to version/publish packages independently
- [ ] Wireit's coarse caching feels insufficient

## Files Affected (if implementing Turborepo)

- `package.json` → add workspaces config
- `packages/*/package.json` → new files
- `src/**/*.ts` → update import paths
- `turbo.json` → new file
- `tsconfig.json` → path aliases for `@surf/*`
- CI workflow → use `turbo run`

## References

- [Turborepo docs](https://turbo.build/repo/docs)
- [Nx docs](https://nx.dev/)
- [moon docs](https://moonrepo.dev/)
- [Wireit (Plan 230)](./230-wireit-task-orchestration.md)
