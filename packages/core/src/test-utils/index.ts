/**
 * Test Utilities
 *
 * Core testing framework for progression-based tests.
 */

export {
  defineProgression,
  captureSnapshots,
  captureWithEvents,
  getProgressionRegistry,
  getProgression,
  clearProgressionRegistry,
} from './progression.js';

export {
  matrixToField,
  fieldToMatrix,
  cloneField,
  matricesEqual,
  matrixTotalEnergy,
  matrixMax,
  matrixPeakRow,
} from './matrixField.js';

export type { Matrix } from './matrix.js';
export {
  GRID_WIDTH,
  GRID_HEIGHT,
  GRID_10x10,
  GRID_16x16,
  STATIC_CAPTURE,
  createMatrix,
  createMatrixWithSize,
  createFilledMatrix,
  createFilledMatrixWithSize,
} from './matrix.js';

export {
  valueToChar,
  charToValue,
  matrixToAscii,
  asciiToMatrix,
  progressionToAscii,
  asciiToProgression,
  matricesMatchAscii,
} from './asciiMatrix.js';

export type { StripDefinition } from './strip.js';
export { createStrip } from './strip.js';

export type { Story, StoryConfig } from './story.js';
export { defineStory } from './story.js';
