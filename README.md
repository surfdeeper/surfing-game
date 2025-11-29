# Surfing Game (WIP)

A WIP canvas-based ocean wave simulation with realistic wave physics , foam rendering, and AI-controlled surfer mechanics.

## Features

- **Wave Physics**: Time-based wave model where position is derived from spawn time, enabling deterministic behavior and testability
- **Energy Field Simulation**: Continuous energy propagation system modeling wave energy across the ocean
- **Foam Rendering**: Multi-contour foam visualization using marching squares algorithm
- **Bathymetry**: Underwater terrain affecting wave behavior (shoaling, refraction)
- **AI Surfer**: Multiple difficulty modes (Beginner, Intermediate, Expert) with autonomous wave-riding behavior
- **Debug Panel**: React-based UI for real-time parameter tuning and visualization toggles

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the game at `http://localhost:5173`

### Keyboard Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move player |
| B | Toggle bathymetry visualization |
| E | Toggle energy field display |
| P | Toggle player visibility |
| A | Toggle AI player |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (includes type checking) |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:visual:headless` | Run visual regression tests |
| `npm run ladle` | Start Ladle for component stories |

## Project Structure

```
src/
├── core/           # Math utilities
├── input/          # Keyboard handling
├── render/         # Canvas rendering (waves, foam, bathymetry)
├── state/          # Game state models (waves, foam, energy field, AI)
├── stories/        # Ladle component stories
├── ui/             # React debug panel
├── update/         # Game loop update logic
└── util/           # Utilities (FPS tracking)
```

## Architecture

The game uses a time-based architecture where wave positions are calculated from their spawn time rather than being incrementally updated. This enables:

- **Deterministic tests**: Same inputs produce same outputs
- **Event sourcing**: State changes through dispatched events
- **Clear separation**: State management (`state/`), update logic (`update/`), rendering (`render/`)

## Testing

The project uses a three-layer testing architecture (see [plans/tooling/200-mdx-visual-docs.md](plans/tooling/200-mdx-visual-docs.md) for details):

1. **Unit tests** (Vitest): Physics calculations and state logic. Must pass before visual tests run.
2. **Progression tests** (Vitest): Time-based matrix snapshots using ASCII format for compact, readable assertions on simulation behavior over time.
3. **Visual regression tests** (Playwright): Screenshot-based tests that only run after unit tests pass, isolating render bugs from data bugs.
4. **E2E tests** (Playwright): Full application integration testing.

```bash
npm test                        # Unit + progression tests
npm run test:visual:headless    # Visual regression (gates on unit tests)
npm run test:e2e                # E2E tests
```

## Tech Stack

- **Framework**: Vanilla TypeScript + React (debug UI)
- **Bundler**: Vite
- **Testing**: Vitest + Playwright
- **Stories**: Ladle

## License

ISC