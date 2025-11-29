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
