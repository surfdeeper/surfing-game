/**
 * Shared constants and utilities for Foam Contours layer
 *
 * Uses 16x16 grid for detailed contour visualization.
 * Includes custom drawing utilities for foam patterns.
 */

import { defineProgression, createMatrixWithSize, Matrix, STATIC_CAPTURE } from '../../test-utils';

export const GRID_SIZE = 16;

export type { Matrix };
export { STATIC_CAPTURE };

export function createMatrix(): Matrix {
  return createMatrixWithSize(GRID_SIZE, GRID_SIZE);
}

export function setCell(matrix: Matrix, x: number, y: number, value: number) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  matrix[y][x] = Math.max(matrix[y][x], value);
}

export function drawCircle(
  matrix: Matrix,
  cx: number,
  cy: number,
  radius: number,
  intensity: number
) {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        setCell(matrix, x, y, intensity * falloff);
      }
    }
  }
}

export function drawHLine(
  matrix: Matrix,
  y: number,
  x1: number,
  x2: number,
  intensity: number,
  thickness = 2
) {
  for (let dy = -thickness; dy <= thickness; dy++) {
    const falloff = 1 - Math.abs(dy) / (thickness + 1);
    for (let x = x1; x <= x2; x++) {
      setCell(matrix, x, y + dy, intensity * falloff);
    }
  }
}

export function toProgression(
  id: string,
  label: string,
  description: string,
  buildMatrix: () => Matrix
) {
  return defineProgression({
    id,
    description,
    initialMatrix: buildMatrix(),
    captureTimes: STATIC_CAPTURE,
    metadata: { label },
  });
}

export function snapshotToContourFrame(
  snapshot: { matrix: Matrix; label: string },
  baseLabel: string
) {
  const height = snapshot.matrix.length;
  const width = snapshot.matrix[0]?.length ?? 0;
  const grid = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y * width + x] = snapshot.matrix[y][x];
    }
  }

  return {
    label: snapshot.label === 't=0s' ? baseLabel : `${baseLabel} (${snapshot.label})`,
    grid,
    width,
    height,
  };
}

export function progressionsToStrip(
  progressions: Array<{ progression: ReturnType<typeof defineProgression>; label?: string }>
) {
  return progressions.flatMap(({ progression, label }) => {
    const baseLabel =
      label ?? progression.metadata?.label ?? progression.description ?? progression.id;
    return progression.snapshots.map((snapshot) => snapshotToContourFrame(snapshot, baseLabel));
  });
}
