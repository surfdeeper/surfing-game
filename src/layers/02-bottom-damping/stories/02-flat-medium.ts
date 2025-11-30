/**
 * Flat Medium Damping - Uniform medium damping from medium depth
 *
 * Input: Flat medium depth (0.50 uniform) from Layer 1
 * Output: Uniform medium damping (moderate wave energy loss)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_FLAT_MEDIUM as DEPTH_FLAT_MEDIUM } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_FLAT_MEDIUM.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_MEDIUM = defineProgression({
  id: 'bottom-damping/flat-medium',
  description: 'Uniform medium damping from medium depth - moderate wave energy loss',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Flat Medium Damping',
    inputLayer: 'bottom-depth/flat-medium',
    dampingRange: 'medium (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_MEDIUM = {
  testId: 'strip-damping-flat-medium',
  pageId: '02-bottom-damping/02-flat-medium',
  snapshots: PROGRESSION_FLAT_MEDIUM.snapshots,
};
