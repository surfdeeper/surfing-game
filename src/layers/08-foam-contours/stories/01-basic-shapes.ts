import { createMatrix, drawCircle, drawHLine, toProgression, progressionsToStrip } from '../shared';

export const PROGRESSION_SINGLE_CIRCLE = toProgression(
  'foam-contours/single-circle',
  'Single Circle',
  'Radial falloff with peak intensity at center',
  () => {
    const matrix = createMatrix();
    drawCircle(matrix, 8, 8, 6, 0.8);
    return matrix;
  }
);

export const PROGRESSION_OVERLAPPING = toProgression(
  'foam-contours/overlapping-circles',
  'Overlapping Circles',
  'Two circles merging at center seam',
  () => {
    const matrix = createMatrix();
    drawCircle(matrix, 6, 8, 5, 0.7);
    drawCircle(matrix, 10, 8, 5, 0.7);
    return matrix;
  }
);

export const PROGRESSION_WAVE_LINE = toProgression(
  'foam-contours/wave-line',
  'Wave Line',
  'Horizontal breaking line with slight falloff',
  () => {
    const matrix = createMatrix();
    drawHLine(matrix, 8, 2, 13, 0.9, 2);
    return matrix;
  }
);

export const FOAM_STRIP_BASIC = {
  testId: 'strip-foam-basic',
  pageId: '08-foam-contours/01-basic-shapes',
  snapshots: progressionsToStrip([
    { progression: PROGRESSION_SINGLE_CIRCLE },
    { progression: PROGRESSION_OVERLAPPING },
    { progression: PROGRESSION_WAVE_LINE },
  ]),
};
