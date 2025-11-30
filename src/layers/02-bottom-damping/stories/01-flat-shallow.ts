/**
 * Flat Shallow Damping - Uniform high damping from shallow depth
 *
 * Input: Flat shallow depth (0.25 uniform) from Layer 1
 * Output: Uniform high damping (waves lose energy quickly everywhere)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_FLAT_SHALLOW as DEPTH_FLAT_SHALLOW } from '@layers/01-bottom-depth';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from T=0 and compute damping
const depthMatrix = DEPTH_FLAT_SHALLOW.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_FLAT_SHALLOW = defineProgression({
  id: 'bottom-damping/flat-shallow',
  description: 'Uniform high damping from shallow depth - waves lose energy quickly everywhere',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Flat Shallow Damping',
    inputLayer: 'bottom-depth/flat-shallow',
    dampingRange: 'high (uniform)',
  },
});

export const DAMPING_STRIP_FLAT_SHALLOW = createStrip(
  PROGRESSION_FLAT_SHALLOW,
  '02-bottom-damping/01-flat-shallow'
);
