/**
 * Bottom Damping Model
 *
 * Maps ocean floor depth to damping coefficients.
 * Shallow water = high damping (waves lose energy quickly)
 * Deep water = low damping (waves propagate freely)
 */

/**
 * Convert water depth to damping coefficient.
 *
 * @param depth - Normalized water depth (0 = shallow, 1 = deep)
 * @returns Damping coefficient (0 = no damping, 1 = full damping)
 */
export function depthToDamping(depth: number): number {
  const SHALLOW_THRESHOLD = 0.2;
  const DEEP_THRESHOLD = 0.8;
  const MIN_DAMPING = 0.05;
  const MAX_DAMPING = 0.95;

  if (depth <= SHALLOW_THRESHOLD) return MAX_DAMPING;
  if (depth >= DEEP_THRESHOLD) return MIN_DAMPING;

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
