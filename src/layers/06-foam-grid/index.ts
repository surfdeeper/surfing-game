// Public API for Layer 06: Foam Grid
// Grid-based foam accumulation and advection

// Shared utilities
export { GRID_WIDTH, GRID_HEIGHT, createMatrix } from './shared';
export type { Matrix } from './shared';

// Individual story exports
export { PROGRESSION_ACCUMULATION, FOAM_GRID_STRIP_ACCUMULATION } from './stories/01-accumulation';
export { PROGRESSION_ADVECTION, FOAM_GRID_STRIP_ADVECTION } from './stories/02-advection';
export { PROGRESSION_COMBINED, FOAM_GRID_STRIP_COMBINED } from './stories/03-combined';

// Aggregated exports for convenience
import { PROGRESSION_ACCUMULATION, FOAM_GRID_STRIP_ACCUMULATION } from './stories/01-accumulation';
import { PROGRESSION_ADVECTION, FOAM_GRID_STRIP_ADVECTION } from './stories/02-advection';
import { PROGRESSION_COMBINED, FOAM_GRID_STRIP_COMBINED } from './stories/03-combined';

export const FOAM_GRID_PROGRESSIONS = {
  accumulation: PROGRESSION_ACCUMULATION,
  advection: PROGRESSION_ADVECTION,
  combined: PROGRESSION_COMBINED,
};

export const FOAM_GRID_STRIPS = [
  FOAM_GRID_STRIP_ACCUMULATION,
  FOAM_GRID_STRIP_ADVECTION,
  FOAM_GRID_STRIP_COMBINED,
];
