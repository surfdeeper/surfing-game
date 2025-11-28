# Agent Instructions

Guidelines for AI agents working on this codebase.

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

## Testing

Run tests before committing:
```bash
npm test        # Unit tests
npm run test:e2e  # E2E tests (if available)
```
