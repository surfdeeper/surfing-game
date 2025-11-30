# Plan 231: Monorepo Tooling Evaluation

**Status**: Implemented (Turborepo)
**Category**: tooling

## Problem

Wireit provides coarse-grained caching via file globs, but cannot determine import-level dependencies. When `src/render/colorScales.ts` changes, wireit re-runs ALL game visual tests because the glob `src/**/*.ts` matches—even if only one story actually imports that module.

For selective testing ("only run tests that transitively depend on changed files"), we need package-aware tooling.

## Goals

1. **Package-aware affected detection** - Only test what changed
2. **Avoid version lockstep tax** - No forced synchronized upgrades
3. **Maintain simplicity** - Appropriate to current scale
4. **Easy to remove** - May split repos later

## Decision: Turborepo

After profiling Turborepo, Nx, and moon, we chose **Turborepo** for the following reasons:

### Profiling Results (November 2024)

| Tool | Install Size | Affected Detection | Granularity |
|------|-------------|-------------------|-------------|
| **Turborepo** | 31 MB | 2.2s | Package-level |
| **Nx** | 26 MB | 1.5s | Import-level |
| **moon** | 33 MB | 3.7s | File-level |

Note: Previous estimates of 500MB for Nx were incorrect. All tools are similar in size.

### Comparison Against Goals

| Goal | npm workspaces | Wireit | Turborepo | Nx |
|------|---------------|--------|-----------|-----|
| **Affected detection** | ❌ | ❌ Glob only | ✅ Package | ✅ Import |
| **No version lockstep** | ✅ | ✅ | ✅ | ⚠️ Defaults to lockstep |
| **Simplicity** | ✅✅✅ | ✅✅ | ✅ | ⚠️ |
| **Easy to remove** | ✅✅✅ | ✅✅ | ✅ | ⚠️ |
| **Config files** | 0 new | wireit in pkg.json | 1 (turbo.json) | 1-2 (nx.json + plugins) |
| **Lock-in** | None | Low | Low | Medium |

### Why Not Nx?

Although Nx is slightly faster (1.5s vs 2.2s) and has finer granularity:

1. **Higher lock-in** - Nx plugins, project.json files, more tooling assumptions
2. **Version lockstep pressure** - Defaults to single-version policy
3. **Harder to remove** - More files/config to clean up if splitting repos
4. **Overkill for 2 packages** - Import-level granularity matters at scale

### Why Not Wireit?

Turborepo replaces Wireit entirely:

| Tool | Purpose | Keep Both? |
|------|---------|-----------|
| Wireit | Task caching via file globs | ❌ Redundant |
| Turborepo | Task caching + affected detection | ✅ |

### Why Not Lerna?

Lerna = Nx + npm publishing. Since we're not publishing packages to npm, Lerna adds complexity without benefit.

## Implementation

### Package Structure

```
packages/
  core/           # @surf/core - game logic, state, coordinates
    src/
      state/      # Wave, foam, energy models
      update/     # Game loop orchestration
      core/       # Math utilities
      coordinates.ts
  render/         # @surf/render - canvas rendering (depends on core)
    src/
      render/     # Rendering functions
```

### Key Files

- `turbo.json` - Task pipeline configuration
- `package.json` - Workspaces configuration
- `packages/*/package.json` - Package definitions

### Commands

```bash
# Run affected tests (vs master)
npm run test:affected  # → turbo run test --filter='...[origin/master]'

# Run all tests with caching
npm run test:all       # → turbo run test

# Clear cache
rm -rf .turbo node_modules/.cache/turbo
```

## Removal Path

If splitting to separate repos later:

1. Move `packages/core/` to new repo
2. Move `packages/render/` to new repo
3. Delete `turbo.json`
4. Remove `turbo` from devDependencies
5. Remove `workspaces` from package.json

Total cleanup: ~5 minutes.

## References

- [Turborepo docs](https://turbo.build/repo/docs)
- [Nx docs](https://nx.dev/)
- [moon docs](https://moonrepo.dev/)
