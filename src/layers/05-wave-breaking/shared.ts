/**
 * Shared constants and utilities for Wave Breaking layer
 *
 * Uses 8x8 grid for this layer's specific visualization needs.
 */

import { createMatrixWithSize, Matrix } from '../../test-utils';

export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 8;

export type { Matrix };

export function createMatrix(): Matrix {
  return createMatrixWithSize(GRID_WIDTH, GRID_HEIGHT);
}
