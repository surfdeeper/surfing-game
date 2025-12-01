/**
 * Shared constants and utilities for Foam Dispersion layer
 *
 * Uses 10x10 grid for this layer's visualization needs.
 */

import { createMatrixWithSize, Matrix } from '../../test-utils';

export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 10;

export type { Matrix };

export function createMatrix(): Matrix {
  return createMatrixWithSize(GRID_WIDTH, GRID_HEIGHT);
}
