/**
 * Flat Shallow Damping - Uniform high damping from shallow depth
 *
 * Input: Flat shallow depth (0.25 uniform) from Layer 1
 * Output: Uniform high damping (waves lose energy quickly everywhere)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_FLAT_SHALLOW as DEPTH_FLAT_SHALLOW } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_FLAT_SHALLOW.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_SHALLOW = defineProgression({
  id: 'bottom-damping/flat-shallow',
  description: 'Uniform high damping from shallow depth - waves lose energy quickly everywhere',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Flat Shallow Damping',
    inputLayer: 'bottom-depth/flat-shallow',
    dampingRange: 'high (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_SHALLOW = {
  testId: 'strip-damping-flat-shallow',
  pageId: '02-bottom-damping/01-flat-shallow',
  snapshots: PROGRESSION_FLAT_SHALLOW.snapshots,
};
