/**
 * Matrix Utilities
 *
 * Centralized matrix type and utilities used across all layers.
 * All layers use consistent dimensions for composability.
 */

/**
 * Standard matrix type used across all layers
 */
export type Matrix = number[][];

/**
 * Standard grid dimensions for the layer pipeline (8x10).
 * Most layers use these dimensions for composability.
 */
export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 10;

/**
 * Alternative grid dimensions for layers that need different sizes.
 * Layer 09 (foam-contours) uses 16x16, layers 05-08 use 10x10.
 */
export const GRID_10x10 = { width: 10, height: 10 };
export const GRID_16x16 = { width: 16, height: 16 };

/**
 * Capture times for static (non-animated) progressions.
 * Used by layers 01-02 which show bathymetry/damping that don't change over time.
 */
export const STATIC_CAPTURE = [0];

/**
 * Create a zero-filled matrix with standard 8x10 dimensions
 */
export function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}

/**
 * Create a zero-filled matrix with custom dimensions
 */
export function createMatrixWithSize(width: number, height: number): Matrix {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

/**
 * Create a matrix filled with a specific value (standard 8x10 dimensions)
 */
export function createFilledMatrix(value: number): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(value));
}

/**
 * Create a matrix filled with a specific value and custom dimensions
 */
export function createFilledMatrixWithSize(value: number, width: number, height: number): Matrix {
  return Array.from({ length: height }, () => Array(width).fill(value));
}
