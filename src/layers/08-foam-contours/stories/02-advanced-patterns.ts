import { createMatrix, drawCircle, toProgression, progressionsToStrip, GRID_SIZE } from '../shared';

export const PROGRESSION_NESTED = toProgression(
  'foam-contours/nested-levels',
  'Nested Levels',
  'Concentric rings with increasing intensity toward center',
  () => {
    const matrix = createMatrix();
    drawCircle(matrix, 8, 8, 7, 0.3);
    drawCircle(matrix, 8, 8, 5, 0.5);
    drawCircle(matrix, 8, 8, 3, 0.8);
    return matrix;
  }
);

export const PROGRESSION_SCATTERED = toProgression(
  'foam-contours/scattered',
  'Scattered Patches',
  'Separated foam deposits across the grid',
  () => {
    const matrix = createMatrix();
    drawCircle(matrix, 4, 4, 3, 0.6);
    drawCircle(matrix, 12, 4, 2, 0.8);
    drawCircle(matrix, 4, 12, 2, 0.7);
    drawCircle(matrix, 12, 12, 3, 0.5);
    return matrix;
  }
);

export const PROGRESSION_EDGE = toProgression(
  'foam-contours/edge-foam',
  'Edge Foam',
  'Foam touching grid boundaries without clipping artifacts',
  () => {
    const matrix = createMatrix();
    drawCircle(matrix, 0, 8, 4, 0.7);
    drawCircle(matrix, 15, 8, 4, 0.7);
    return matrix;
  }
);

export const FOAM_STRIP_ADVANCED = {
  testId: 'strip-foam-advanced',
  pageId: '08-foam-contours/02-advanced-patterns',
  snapshots: progressionsToStrip([
    { progression: PROGRESSION_NESTED },
    { progression: PROGRESSION_SCATTERED },
    { progression: PROGRESSION_EDGE },
  ]),
};
