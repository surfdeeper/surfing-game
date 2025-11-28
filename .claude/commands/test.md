---
description: Run tests with context about what's being validated
argument-hint: [test-type or file]
---

# Test Context

## Available Test Commands
- `npm run lint` - ESLint (fast syntax/import check)
- `npm test` - All unit tests (Vitest)
- `npx vitest run <file>` - Single unit test
- `npm run test:visual:headless` - Visual regression tests
- `npm run test:visual:headed` - Visual tests with browser UI

## Testing Strategy
@ plans/testing/110-testing-strategy.md

## Current Test Files
! find src -name "*.test.js" | head -20

## Request
$ARGUMENTS

## Workflow
1. **Lint first** - Always run `npm run lint` before tests
2. **Target specific tests** when iterating on one feature
3. **Run full suite** before committing

If no specific test requested:
1. Run lint
2. Run unit tests
3. Report results and any failures
