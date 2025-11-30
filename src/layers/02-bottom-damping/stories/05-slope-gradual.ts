/**
 * Gradual Slope Damping - Moderate damping gradient
 *
 * Input: Gradual slope depth from Layer 1
 * Output: Moderate damping gradient (progressive energy dissipation)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_SLOPE_GRADUAL as DEPTH_SLOPE_GRADUAL } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SLOPE_GRADUAL.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SLOPE_GRADUAL = defineProgression({
  id: 'bottom-damping/slope-gradual',
  description: 'Moderate damping gradient - progressive energy dissipation',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Gradual Slope Damping',
    inputLayer: 'bottom-depth/slope-gradual',
    dampingRange: 'gradient (moderate)',
  },
});

export const DAMPING_STRIP_SLOPE_GRADUAL = {
  testId: 'strip-damping-slope-gradual',
  pageId: '02-bottom-damping/05-slope-gradual',
  snapshots: PROGRESSION_SLOPE_GRADUAL.snapshots,
};
