/**
 * Bathymetry Progressions - Re-exports from sister story files
 *
 * This file provides a centralized export point for all bathymetry progressions.
 * Each progression is now colocated with its corresponding story MDX file.
 */

// Re-export individual progressions from sister .ts files
export { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow';
export { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium';
export { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep';
export { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle';
export { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual';
export { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep';
export { PROGRESSION_SANDBAR } from './stories/07-sandbar';
export { PROGRESSION_REEF } from './stories/08-reef';
export { PROGRESSION_CHANNEL } from './stories/09-channel';

// Grouped export for convenience
import { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow';
import { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium';
import { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep';
import { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle';
import { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual';
import { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep';
import { PROGRESSION_SANDBAR } from './stories/07-sandbar';
import { PROGRESSION_REEF } from './stories/08-reef';
import { PROGRESSION_CHANNEL } from './stories/09-channel';

export const BATHYMETRY_PROGRESSIONS = {
  flatShallow: PROGRESSION_FLAT_SHALLOW,
  flatMedium: PROGRESSION_FLAT_MEDIUM,
  flatDeep: PROGRESSION_FLAT_DEEP,
  slopeGentle: PROGRESSION_SLOPE_GENTLE,
  slopeGradual: PROGRESSION_SLOPE_GRADUAL,
  slopeSteep: PROGRESSION_SLOPE_STEEP,
  sandbar: PROGRESSION_SANDBAR,
  reef: PROGRESSION_REEF,
  channel: PROGRESSION_CHANNEL,
};
