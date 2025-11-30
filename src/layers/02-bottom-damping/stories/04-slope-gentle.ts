/**
 * Gentle Slope Damping - Gradual damping gradient from deep to shallow
 *
 * Input: Gentle slope depth (deep at horizon, shallow at shore) from Layer 1
 * Output: Damping gradient (low damping offshore, high damping nearshore)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_SLOPE_GENTLE as DEPTH_SLOPE_GENTLE } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SLOPE_GENTLE.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SLOPE_GENTLE = defineProgression({
  id: 'bottom-damping/slope-gentle',
  description: 'Gradual damping gradient - low offshore, high nearshore',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Gentle Slope Damping',
    inputLayer: 'bottom-depth/slope-gentle',
    dampingRange: 'gradient (low to high)',
  },
});

export const DAMPING_STRIP_SLOPE_GENTLE = {
  testId: 'strip-damping-slope-gentle',
  pageId: '02-bottom-damping/04-slope-gentle',
  snapshots: PROGRESSION_SLOPE_GENTLE.snapshots,
};
