# Plan 210: TypeScript Migration and Tooling Setup

**Status**: Complete
**Category**: tooling
**Depends On**: None (unit test fixes are prerequisites, included in Phase 0)

## Problem

The project is currently vanilla JavaScript (59 files: 33 production, 26 test). TypeScript provides:
- Compile-time type safety to catch bugs early
- Better IDE autocompletion and navigation
- Self-documenting code via type annotations
- Safer refactoring with type checking

Additionally, the developer tooling needs improvement:
- No Prettier for consistent formatting
- ESLint config lacks TypeScript support
- No lint-staged for pre-commit efficiency
- Pre-commit hooks not set up (no Husky)
- Tests don't run in pre-commit

## Proposed Solution

### TypeScript Strategy: Gradual Migration with Strict Mode Off

1. **Non-strict mode initially** - Set `strict: false` in tsconfig to allow incremental adoption
2. **Rename files from `.js`/`.jsx` to `.ts`/`.tsx`** - TypeScript compiler handles both
3. **Add types incrementally** - Use `any` sparingly, add proper types over time
4. **Future strictness plan** - Document path to enabling strict mode later

### Tooling Stack

| Tool | Purpose |
|------|---------|
| TypeScript 5.x | Type checking, compilation |
| ESLint 9 + typescript-eslint | Linting with TS support |
| Prettier 3.x | Code formatting |
| Husky 9.x | Git hooks management |
| lint-staged | Run linters on staged files only |
| concurrently | Parallel task execution |

### Pre-commit Strategy

Run these in parallel for fast feedback:
```
┌─────────────────────────────────────────────────────────┐
│                    Pre-commit Hook                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  lint-staged    │  │  concurrently               │   │
│  │  (staged files) │  │  ├─ npm run typecheck       │   │
│  │  ├─ prettier    │  │  ├─ npm test                │   │
│  │  └─ eslint      │  │  └─ smoke test (3s)         │   │
│  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 0: Fix Existing Test Failures (Prerequisite)

Before migration, fix the 7 failing tests:

**DebugPanel.test.jsx (6 failures)**:
1. Test expects `Foam Grid Debug` toggle - update test or add toggle
2. Test expects 4 tooltip triggers, component has 6 (Depth Damping + Damping Exponent sliders added)
3. Tests missing `onSettingChange` prop causing `TypeError: onSettingChange is not a function`
4. Slider tests using wrong indices after UI changes
5. Value display format changed (decimals added)

**bathymetryModel.test.js (1 failure)**:
- Snapshot mismatch - update snapshot with `npm test -- -u`

### Phase 1: Install and Configure TypeScript

```bash
npm install -D typescript @types/react @types/react-dom @types/node
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": false,
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings**:
- `strict: false` - Allows gradual adoption
- `allowJs: true` - Mix JS and TS during migration
- `noEmit: true` - Vite handles compilation, TS only type-checks
- `checkJs: false` - Don't type-check JS files (opt-in migration)

### Phase 2: Configure Vite for TypeScript

Update `vite.config.js` → `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

### Phase 3: Install Prettier and Configure

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

**.prettierrc**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**.prettierignore**:
```
node_modules
dist
build
tests/visual/results
tests/visual/report
tests/visual/snapshots
*.md
```

### Phase 4: Update ESLint for TypeScript

```bash
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

**eslint.config.js** (update):
```javascript
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { '@typescript-eslint': tseslint, react },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any during migration
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
    },
  },
  {
    // Keep JS support during migration
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  prettier, // Disable formatting rules that conflict with Prettier
  { ignores: ['node_modules/**', 'dist/**', 'tests/visual/results/**', 'tests/visual/report/**'] },
];
```

### Phase 5: Add JS Ban Check

Create a script that fails if any JS files exist in src/:

**scripts/check-no-js.sh**:
```bash
#!/bin/bash
JS_FILES=$(find src -name "*.js" -o -name "*.jsx" 2>/dev/null)
if [ -n "$JS_FILES" ]; then
  echo "Error: JavaScript files found in src/. Please convert to TypeScript:"
  echo "$JS_FILES"
  exit 1
fi
echo "✓ No JavaScript files in src/"
```

Add to package.json:
```json
"scripts": {
  "check:no-js": "bash scripts/check-no-js.sh"
}
```

### Phase 6: Set Up Husky and lint-staged

```bash
npm install -D husky lint-staged concurrently
npx husky init
```

**.husky/pre-commit**:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged (prettier + eslint on staged files) and tests in parallel
npx concurrently --kill-others-on-fail \
  "npx lint-staged" \
  "npm run typecheck" \
  "npm test" \
  "npx playwright test tests/smoke.spec.js"
```

**lint-staged.config.js**:
```javascript
export default {
  '*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.{js,jsx}': ['prettier --write', 'eslint --fix'],
  '*.{json,css,md}': ['prettier --write'],
};
```

### Phase 7: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check:no-js": "bash scripts/check-no-js.sh",
    "prepare": "husky"
  }
}
```

### Phase 8: Rename Files to TypeScript

Order of conversion (start with leaf modules, work toward entry points):

1. **Utilities first** (no dependencies):
   - `src/core/math.js` → `src/core/math.ts`
   - `src/util/fpsTracker.js` → `src/util/fpsTracker.ts`
   - `src/input/keyboard.js` → `src/input/keyboard.ts`

2. **Models** (pure data/logic):
   - `src/state/*.js` → `src/state/*.ts`
   - `src/render/coordinates.js` → `src/render/coordinates.ts`
   - `src/render/marchingSquares.js` → `src/render/marchingSquares.ts`

3. **Renderers** (depend on models):
   - `src/render/*.js` → `src/render/*.ts`

4. **Update logic**:
   - `src/update/*.js` → `src/update/*.ts`

5. **Input handlers**:
   - `src/input/*.js` → `src/input/*.ts`

6. **UI Components** (React):
   - `src/ui/*.jsx` → `src/ui/*.tsx`
   - `src/stories/*.jsx` → `src/stories/*.tsx`

7. **Entry point last**:
   - `src/main.jsx` → `src/main.tsx`

8. **Test files**:
   - `src/**/*.test.js` → `src/**/*.test.ts`
   - `src/**/*.test.jsx` → `src/**/*.test.tsx`

9. **Config files**:
   - `vite.config.js` → `vite.config.ts`
   - `vitest.config.js` → `vitest.config.ts`
   - `playwright.config.js` → `playwright.config.ts`

### Phase 9: Update Vitest Config

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

## Files Affected

**New files**:
- `tsconfig.json`
- `.prettierrc`
- `.prettierignore`
- `lint-staged.config.js`
- `.husky/pre-commit`
- `scripts/check-no-js.sh`

**Modified files**:
- `package.json` (scripts, devDependencies)
- `eslint.config.js` (TypeScript support)
- `vite.config.js` → `vite.config.ts`
- `vitest.config.js` → `vitest.config.ts`
- All 59 `.js`/`.jsx` files → `.ts`/`.tsx`

## Testing

After each phase:
1. `npm run lint` - Should pass with no errors
2. `npm run typecheck` - Should pass (may have warnings initially)
3. `npm test` - All unit tests pass
4. `npx playwright test tests/smoke.spec.js` - App loads without errors
5. `npm run dev` - Dev server starts, app runs correctly

Final verification:
```bash
# Full pre-commit simulation
git add -A
npx lint-staged
npm run typecheck
npm test
npx playwright test tests/smoke.spec.js
```

## Future Strictness Plan (Phase 10+)

After migration is complete, incrementally enable strict checks:

### Stage 1: Enable basic strict options
```json
{
  "compilerOptions": {
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Stage 2: Enable stricter options
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictBindCallApply": true
  }
}
```

### Stage 3: Full strict mode
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### ESLint strict rules to add later
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/explicit-function-return-type': 'warn',
  '@typescript-eslint/explicit-module-boundary-types': 'warn',
}
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking changes during rename | Convert one file at a time, run tests after each |
| Type errors blocking development | Start with `strict: false`, allow `any` |
| Slow pre-commit | Use concurrently for parallel execution |
| Merge conflicts during migration | Complete migration in a single branch, merge quickly |

## Estimated Scope

- Phase 0 (test fixes): 7 test fixes
- Phases 1-7 (tooling): 8 config files
- Phases 8-9 (conversion): 59 files to rename + add minimal types
- Total: ~70 file changes

## Success Criteria

1. All 59 files converted to TypeScript
2. `npm run lint` passes with no errors
3. `npm run typecheck` passes with no errors
4. All unit tests pass
5. Smoke test passes
6. Pre-commit hook runs in <30 seconds
7. No `.js`/`.jsx` files remain in `src/`
