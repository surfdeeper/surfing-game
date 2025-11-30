/**
 * Steep Slope Damping - Sharp damping transition
 *
 * Input: Steep slope depth from Layer 1
 * Output: Sharp damping transition (sudden energy loss)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_SLOPE_STEEP as DEPTH_SLOPE_STEEP } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SLOPE_STEEP.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SLOPE_STEEP = defineProgression({
  id: 'bottom-damping/slope-steep',
  description: 'Sharp damping transition - sudden energy loss at steep slope',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Steep Slope Damping',
    inputLayer: 'bottom-depth/slope-steep',
    dampingRange: 'gradient (steep)',
  },
});

export const DAMPING_STRIP_SLOPE_STEEP = createStrip(
  PROGRESSION_SLOPE_STEEP,
  '02-bottom-damping/06-slope-steep'
);
