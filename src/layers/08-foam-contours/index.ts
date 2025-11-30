// Public API for Layer 08: Foam Contours
// Marching squares visualization of foam intensity

// Shared utilities
export {
  GRID_SIZE,
  STATIC_CAPTURE,
  createMatrix,
  setCell,
  drawCircle,
  drawHLine,
  toProgression,
  snapshotToContourFrame,
  progressionsToStrip,
} from './shared';
export type { Matrix } from './shared';

// Individual story exports
export {
  PROGRESSION_SINGLE_CIRCLE,
  PROGRESSION_OVERLAPPING,
  PROGRESSION_WAVE_LINE,
  FOAM_STRIP_BASIC,
} from './stories/01-basic-shapes';
export {
  PROGRESSION_NESTED,
  PROGRESSION_SCATTERED,
  PROGRESSION_EDGE,
  FOAM_STRIP_ADVANCED,
} from './stories/02-advanced-patterns';
export {
  PROGRESSION_EMPTY,
  PROGRESSION_FULL,
  FOAM_STRIP_EDGE_CASES,
} from './stories/03-edge-cases';
export { FOAM_STRIP_NO_BLUR, FOAM_STRIP_HIGH_BLUR } from './stories/04-blur-effect';

// Aggregated exports for convenience
import {
  PROGRESSION_SINGLE_CIRCLE,
  PROGRESSION_OVERLAPPING,
  PROGRESSION_WAVE_LINE,
  FOAM_STRIP_BASIC,
} from './stories/01-basic-shapes';
import {
  PROGRESSION_NESTED,
  PROGRESSION_SCATTERED,
  PROGRESSION_EDGE,
  FOAM_STRIP_ADVANCED,
} from './stories/02-advanced-patterns';
import {
  PROGRESSION_EMPTY,
  PROGRESSION_FULL,
  FOAM_STRIP_EDGE_CASES,
} from './stories/03-edge-cases';
import { FOAM_STRIP_NO_BLUR, FOAM_STRIP_HIGH_BLUR } from './stories/04-blur-effect';

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

export const FOAM_CONTOUR_STRIPS = [
  FOAM_STRIP_BASIC,
  FOAM_STRIP_ADVANCED,
  FOAM_STRIP_EDGE_CASES,
  FOAM_STRIP_NO_BLUR,
  FOAM_STRIP_HIGH_BLUR,
];
