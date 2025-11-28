# Agent Instructions

Guidelines for AI agents working on this codebase.

## Plans Directory Structure

Plans are organized in `/plans/`:

```
plans/
├── 00-principles.md          # Foundational concepts (never archive)
├── 10-debugger.md            # Feature plans (numbered)
├── 20-still-water.md
├── ...
├── reference-*.md            # Reference docs (never archive)
└── archive/                  # Completed plans
    ├── 01-wave-visuals.md
    └── ...
```

### Numbering Convention
- Plans are numbered in increments of 10 (10, 20, 30...) to allow inserting related plans
- Use the next available number for new plans (e.g., after 120, use 121, 122, or 130)

### Archiving Completed Plans

**When a plan is fully implemented and verified:**
1. Move the plan file to `plans/archive/`
2. Keep the original filename
3. Do NOT archive:
   - `00-principles.md` - foundational reference
   - `reference-*.md` files - ongoing reference material
   - Plans that are only partially complete

### Creating New Plans

When creating future/placeholder plans:
1. Use the next logical number
2. Include clear sections: Problem, Proposed Solution, Implementation Steps
3. Mark dependencies on other plans if any
4. Plans can reference each other by filename

## Code Style

- Vanilla JavaScript (no TypeScript currently)
- Canvas 2D for rendering (future: React + Three.js)
- Vite for dev server and bundling
- Vitest for unit tests
- Playwright for E2E tests

## Testing

Run tests before committing:
```bash
npm test        # Unit tests
npm run test:e2e  # E2E tests (if available)
```
