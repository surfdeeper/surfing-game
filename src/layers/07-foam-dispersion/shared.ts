export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 10;
export type Matrix = number[][];

export function createMatrix(): Matrix {
  return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
}
