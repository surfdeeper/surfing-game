// Public API for Layer 07: Foam Dispersion
// Foam decay and spreading over time

// Shared utilities
export { GRID_WIDTH, GRID_HEIGHT, createMatrix } from './shared';
export type { Matrix } from './shared';

// Individual story exports
export {
  PROGRESSION_INTENSITY_DECAY,
  PROGRESSION_FAST_DECAY,
  PROGRESSION_SLOW_DECAY,
  FOAM_DISPERSION_STRIP_DECAY,
} from './stories/01-decay-rate';
export {
  PROGRESSION_SPATIAL_SPREADING,
  PROGRESSION_CURRENT_DRIFT,
  FOAM_DISPERSION_STRIP_SPATIAL,
} from './stories/02-spatial-spreading';
export {
  PROGRESSION_DECAY_AND_SPREAD,
  FOAM_DISPERSION_STRIP_COMBINED,
} from './stories/03-combined';

// Aggregated exports for convenience
import {
  PROGRESSION_INTENSITY_DECAY,
  PROGRESSION_FAST_DECAY,
  PROGRESSION_SLOW_DECAY,
  FOAM_DISPERSION_STRIP_DECAY,
} from './stories/01-decay-rate';
import {
  PROGRESSION_SPATIAL_SPREADING,
  PROGRESSION_CURRENT_DRIFT,
  FOAM_DISPERSION_STRIP_SPATIAL,
} from './stories/02-spatial-spreading';
import {
  PROGRESSION_DECAY_AND_SPREAD,
  FOAM_DISPERSION_STRIP_COMBINED,
} from './stories/03-combined';

export const FOAM_DISPERSION_PROGRESSIONS = {
  intensityDecay: PROGRESSION_INTENSITY_DECAY,
  fastDecay: PROGRESSION_FAST_DECAY,
  slowDecay: PROGRESSION_SLOW_DECAY,
  spatialSpreading: PROGRESSION_SPATIAL_SPREADING,
  combined: PROGRESSION_DECAY_AND_SPREAD,
  currentDrift: PROGRESSION_CURRENT_DRIFT,
};

export const FOAM_DISPERSION_STRIPS = [
  FOAM_DISPERSION_STRIP_DECAY,
  FOAM_DISPERSION_STRIP_SPATIAL,
  FOAM_DISPERSION_STRIP_COMBINED,
];
