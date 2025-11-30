// Public API for Layer 02: Bottom Damping
// Maps ocean floor depth to damping coefficients - shallow water = high damping

/**
 * Convert water depth to damping coefficient.
 *
 * @param depth - Normalized water depth (0 = shallow, 1 = deep)
 * @returns Damping coefficient (0 = no damping, 1 = full damping)
 */
export function depthToDamping(depth: number): number {
  // Parameters (tunable)
  const SHALLOW_THRESHOLD = 0.2; // normalized - below this, maximum damping
  const DEEP_THRESHOLD = 0.8; // normalized - above this, minimum damping
  const MIN_DAMPING = 0.05; // deep water baseline
  const MAX_DAMPING = 0.95; // shallow water maximum

  if (depth <= SHALLOW_THRESHOLD) return MAX_DAMPING;
  if (depth >= DEEP_THRESHOLD) return MIN_DAMPING;

  // Linear interpolation between thresholds
  const t = (depth - SHALLOW_THRESHOLD) / (DEEP_THRESHOLD - SHALLOW_THRESHOLD);
  return MAX_DAMPING - t * (MAX_DAMPING - MIN_DAMPING);
}

/**
 * Convert a depth matrix to a damping matrix
 *
 * @param depthMatrix - 2D array of normalized depth values (0-1)
 * @returns 2D array of damping coefficients (0-1)
 */
export function depthMatrixToDamping(depthMatrix: number[][]): number[][] {
  return depthMatrix.map((row) => row.map((depth) => depthToDamping(depth)));
}

// Individual story exports
export { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow';
export { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium';
export { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep';
export { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle';
export { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual';
export { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep';
export { PROGRESSION_SANDBAR } from './stories/07-sandbar';
export { PROGRESSION_REEF } from './stories/08-reef';
export { PROGRESSION_CHANNEL } from './stories/09-channel';

// Aggregated exports for convenience
import { PROGRESSION_FLAT_SHALLOW } from './stories/01-flat-shallow';
import { PROGRESSION_FLAT_MEDIUM } from './stories/02-flat-medium';
import { PROGRESSION_FLAT_DEEP } from './stories/03-flat-deep';
import { PROGRESSION_SLOPE_GENTLE } from './stories/04-slope-gentle';
import { PROGRESSION_SLOPE_GRADUAL } from './stories/05-slope-gradual';
import { PROGRESSION_SLOPE_STEEP } from './stories/06-slope-steep';
import { PROGRESSION_SANDBAR } from './stories/07-sandbar';
import { PROGRESSION_REEF } from './stories/08-reef';
import { PROGRESSION_CHANNEL } from './stories/09-channel';

export const DAMPING_PROGRESSIONS = {
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
