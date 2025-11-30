# Monorepo Test Drift (App vs Packages)

**Status: TODO**

## Summary
- Vitest is now scoped to `packages/core/src/**`, but the production app still boots from `src/main.tsx` via `index.html`, so unit tests no longer exercise the shipped entrypoint and its code can diverge silently.
- Vite resolves `@src` to `packages/core/src`, while `tsconfig.json` maps `@src/*` to `src/*`; type-checking can pass against a different source tree than what the bundler uses, hiding alias errors.
- Lint is currently blocked on this machine by an old Node runtime that cannot parse optional chaining in the ESLint bin; no tests ran during review.

## Plan
1) Align entrypoints: decide whether the runtime should read from `packages/core/src` or `src`, then update `index.html`, Playwright configs, and imports so the tested code matches the served code (or remove the unused tree).
2) Unify `@src` paths: make Vite, TypeScript, and Vitest share the same alias target; update `tsconfig.json`, `vite.config.ts`, `vite.stories.config.ts`, and viewer Vite configs consistently.
3) Restore fast checks: rerun `npm run lint`, `npm run test:smoke`, and `npm run test:unit` on a Node version that supports the toolchain; add a note if Node ≥14 is required.

## Risks / Notes
- Keeping both `src/**` and `packages/core/**` alive invites further drift; prefer deleting or redirecting one tree.
- Alias mismatches can cause subtle runtime import failures that typechecking misses; fixing path maps should be prioritized before adding new code.
