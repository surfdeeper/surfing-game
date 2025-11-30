/**
 * Flat Deep Damping - Uniform low damping from deep water
 *
 * Input: Flat deep depth (0.75 uniform) from Layer 1
 * Output: Uniform low damping (waves propagate further)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_FLAT_DEEP as DEPTH_FLAT_DEEP } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_FLAT_DEEP.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_DEEP = defineProgression({
  id: 'bottom-damping/flat-deep',
  description: 'Uniform low damping from deep water - waves propagate further',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Flat Deep Damping',
    inputLayer: 'bottom-depth/flat-deep',
    dampingRange: 'low (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_DEEP = {
  testId: 'strip-damping-flat-deep',
  pageId: '02-bottom-damping/03-flat-deep',
  snapshots: PROGRESSION_FLAT_DEEP.snapshots,
};
