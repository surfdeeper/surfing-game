/**
 * Sandbar Damping - High damping zone in mid-water
 *
 * Input: Sandbar depth (shallow feature in mid-water) from Layer 1
 * Output: Localized high damping zone (secondary breaking/energy loss area)
 */
import { defineProgression } from '../../../test-utils';
import { PROGRESSION_SANDBAR as DEPTH_SANDBAR } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

const STATIC_CAPTURE = [0];

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SANDBAR.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SANDBAR = defineProgression({
  id: 'bottom-damping/sandbar',
  description: 'Localized high damping zone - secondary breaking area over sandbar',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  updateFn: () => {},
  metadata: {
    label: 'Sandbar Damping',
    inputLayer: 'bottom-depth/sandbar',
    dampingRange: 'localized high (sandbar feature)',
  },
});

export const DAMPING_STRIP_SANDBAR = {
  testId: 'strip-damping-sandbar',
  pageId: '02-bottom-damping/07-sandbar',
  snapshots: PROGRESSION_SANDBAR.snapshots,
};
