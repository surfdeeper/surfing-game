import { defineProgression } from '../test-utils';

type Matrix = number[][];

const GRID_SIZE = 16;
const STATIC_CAPTURE = [0];

function createMatrix(): Matrix {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function setCell(matrix: Matrix, x: number, y: number, value: number) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  matrix[y][x] = Math.max(matrix[y][x], value);
}

function drawCircle(matrix: Matrix, cx: number, cy: number, radius: number, intensity: number) {
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

function drawHLine(
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

function toProgression(id: string, label: string, description: string, buildMatrix: () => Matrix) {
  return defineProgression({
    id,
    description,
    initialMatrix: buildMatrix(),
    captureTimes: STATIC_CAPTURE,
    updateFn: () => {},
    metadata: { label },
  });
}

function snapshotToContourFrame(snapshot: { matrix: Matrix; label: string }, baseLabel: string) {
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

function progressionsToStrip(
  progressions: Array<{ progression: ReturnType<typeof defineProgression>; label?: string }>
) {
  return progressions.flatMap(({ progression, label }) => {
    const baseLabel =
      label ?? progression.metadata?.label ?? progression.description ?? progression.id;
    return progression.snapshots.map((snapshot) => snapshotToContourFrame(snapshot, baseLabel));
  });
}

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

export const PROGRESSION_EMPTY = toProgression(
  'foam-contours/empty',
  'Empty',
  'No foam data present',
  () => createMatrix()
);

export const PROGRESSION_FULL = toProgression(
  'foam-contours/full',
  'Full Saturation',
  'All cells saturated above contour thresholds',
  () => {
    const matrix = createMatrix();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        matrix[y][x] = 0.9;
      }
    }
    return matrix;
  }
);

export const FOAM_CONTOUR_PROGRESSIONS = {
  singleCircle: PROGRESSION_SINGLE_CIRCLE,
  overlappingCircles: PROGRESSION_OVERLAPPING,
  waveLine: PROGRESSION_WAVE_LINE,
  nestedLevels: PROGRESSION_NESTED,
  scattered: PROGRESSION_SCATTERED,
  edgeFoam: PROGRESSION_EDGE,
  empty: PROGRESSION_EMPTY,
  full: PROGRESSION_FULL,
};

// Visual test strips - colocated with the data they render

export const FOAM_STRIP_BASIC = {
  testId: 'strip-foam-basic',
  pageId: '08-foam-contours',
  snapshots: progressionsToStrip([
    { progression: PROGRESSION_SINGLE_CIRCLE },
    { progression: PROGRESSION_OVERLAPPING },
    { progression: PROGRESSION_WAVE_LINE },
  ]),
};

export const FOAM_STRIP_ADVANCED = {
  testId: 'strip-foam-advanced',
  pageId: '08-foam-contours',
  snapshots: progressionsToStrip([
    { progression: PROGRESSION_NESTED },
    { progression: PROGRESSION_SCATTERED },
    { progression: PROGRESSION_EDGE },
  ]),
};

export const FOAM_STRIP_EDGE_CASES = {
  testId: 'strip-foam-edge-cases',
  pageId: '08-foam-contours',
  snapshots: progressionsToStrip([
    { progression: PROGRESSION_EMPTY },
    { progression: PROGRESSION_FULL },
  ]),
};

// Additional strips with blur variants (these use same data, different render params)
export const FOAM_STRIP_NO_BLUR = {
  testId: 'strip-foam-no-blur',
  pageId: '08-foam-contours',
  snapshots: FOAM_STRIP_BASIC.snapshots,
  blurPasses: 0,
};

export const FOAM_STRIP_HIGH_BLUR = {
  testId: 'strip-foam-high-blur',
  pageId: '08-foam-contours',
  snapshots: FOAM_STRIP_BASIC.snapshots,
  blurPasses: 3,
};

// All strips for this layer
export const FOAM_CONTOUR_STRIPS = [
  FOAM_STRIP_BASIC,
  FOAM_STRIP_ADVANCED,
  FOAM_STRIP_EDGE_CASES,
  FOAM_STRIP_NO_BLUR,
  FOAM_STRIP_HIGH_BLUR,
];
