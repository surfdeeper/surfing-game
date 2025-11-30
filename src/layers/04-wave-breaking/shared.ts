export const GRID_WIDTH = 8;
export const GRID_HEIGHT = 8;
export type Matrix = number[][];

export function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}
