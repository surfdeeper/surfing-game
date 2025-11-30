// Public API for Layer 04: Wave Breaking
// Energy dissipation when waves become unstable in shallow water

// Shared utilities
export { GRID_WIDTH, GRID_HEIGHT, createMatrix } from './shared';
export type { Matrix } from './shared';

// Individual story exports
export {
  PROGRESSION_BREAKING_CRITERION,
  WAVE_BREAKING_STRIP_CRITERION,
} from './stories/01-breaking-criterion';
export {
  PROGRESSION_SPILLING,
  PROGRESSION_PLUNGING,
  PROGRESSION_SURGING,
  WAVE_BREAKING_STRIP_TYPES,
} from './stories/02-breaking-types';
export {
  PROGRESSION_ENERGY_TO_FOAM,
  WAVE_BREAKING_STRIP_ENERGY,
} from './stories/03-energy-to-foam';

// Aggregated exports for convenience
import {
  PROGRESSION_BREAKING_CRITERION,
  WAVE_BREAKING_STRIP_CRITERION,
} from './stories/01-breaking-criterion';
import {
  PROGRESSION_SPILLING,
  PROGRESSION_PLUNGING,
  PROGRESSION_SURGING,
  WAVE_BREAKING_STRIP_TYPES,
} from './stories/02-breaking-types';
import {
  PROGRESSION_ENERGY_TO_FOAM,
  WAVE_BREAKING_STRIP_ENERGY,
} from './stories/03-energy-to-foam';

export const WAVE_BREAKING_PROGRESSIONS = {
  criterion: PROGRESSION_BREAKING_CRITERION,
  spilling: PROGRESSION_SPILLING,
  plunging: PROGRESSION_PLUNGING,
  surging: PROGRESSION_SURGING,
  energyToFoam: PROGRESSION_ENERGY_TO_FOAM,
};

export const WAVE_BREAKING_STRIPS = [
  WAVE_BREAKING_STRIP_CRITERION,
  WAVE_BREAKING_STRIP_TYPES,
  WAVE_BREAKING_STRIP_ENERGY,
];
