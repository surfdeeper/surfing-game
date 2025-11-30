/**
 * Gentle Slope Damping - Gradual damping gradient from deep to shallow
 *
 * Input: Gentle slope depth (deep at horizon, shallow at shore) from Layer 1
 * Output: Damping gradient (low damping offshore, high damping nearshore)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_SLOPE_GENTLE as DEPTH_SLOPE_GENTLE } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_SLOPE_GENTLE.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_SLOPE_GENTLE = defineProgression({
  id: 'bottom-damping/slope-gentle',
  description: 'Gradual damping gradient - low offshore, high nearshore',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Gentle Slope Damping',
    inputLayer: 'bottom-depth/slope-gentle',
    dampingRange: 'gradient (low to high)',
  },
});

export const DAMPING_STRIP_SLOPE_GENTLE = createStrip(
  PROGRESSION_SLOPE_GENTLE,
  '02-bottom-damping/04-slope-gentle'
);
