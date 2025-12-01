// Public API for Layer 05: Energy Transfer
// Energy dissipation from breaking waves to foam intensity

// Shared utilities
export { GRID_WIDTH, GRID_HEIGHT, createMatrix } from './shared';
export type { Matrix } from './shared';

// Individual story exports
export {
  PROGRESSION_SINGLE_BREAK,
  PROGRESSION_LINE_BREAK,
  PROGRESSION_SCATTERED_BREAKS,
  ENERGY_TRANSFER_STRIP_BREAKING,
} from './stories/01-breaking-release';
export {
  PROGRESSION_NO_BLUR,
  PROGRESSION_WITH_BLUR,
  PROGRESSION_HIGH_BLUR,
  ENERGY_TRANSFER_STRIP_SPREAD,
} from './stories/02-spatial-spread';

// Aggregated exports for convenience
import {
  PROGRESSION_SINGLE_BREAK,
  PROGRESSION_LINE_BREAK,
  PROGRESSION_SCATTERED_BREAKS,
  ENERGY_TRANSFER_STRIP_BREAKING,
} from './stories/01-breaking-release';
import {
  PROGRESSION_NO_BLUR,
  PROGRESSION_WITH_BLUR,
  PROGRESSION_HIGH_BLUR,
  ENERGY_TRANSFER_STRIP_SPREAD,
} from './stories/02-spatial-spread';

export const ENERGY_TRANSFER_PROGRESSIONS = {
  singleBreak: PROGRESSION_SINGLE_BREAK,
  lineBreak: PROGRESSION_LINE_BREAK,
  scatteredBreaks: PROGRESSION_SCATTERED_BREAKS,
  noBlur: PROGRESSION_NO_BLUR,
  withBlur: PROGRESSION_WITH_BLUR,
  highBlur: PROGRESSION_HIGH_BLUR,
};

export const ENERGY_TRANSFER_STRIPS = [
  ENERGY_TRANSFER_STRIP_BREAKING,
  ENERGY_TRANSFER_STRIP_SPREAD,
];
