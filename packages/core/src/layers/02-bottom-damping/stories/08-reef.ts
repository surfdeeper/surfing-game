/**
 * Reef Damping - Abrupt damping transition
 *
 * Input: Reef depth (abrupt shelf) from Layer 1
 * Output: Sharp damping transition (sudden energy loss at reef edge)
 */
import { defineProgression, STATIC_CAPTURE, createStrip } from '../../../test-utils';
import { PROGRESSION_REEF as DEPTH_REEF } from '../../01-bottom-depth/index.js';
import { depthMatrixToDamping } from '../index';

// Get depth matrix from Layer 1 and compute damping
const depthMatrix = DEPTH_REEF.snapshots[0].matrix;
const dampingMatrix = depthMatrixToDamping(depthMatrix);

export const PROGRESSION_REEF = defineProgression({
  id: 'bottom-damping/reef',
  description: 'Sharp damping transition - sudden energy loss at reef edge',
  initialMatrix: dampingMatrix,
  captureTimes: STATIC_CAPTURE,
  metadata: {
    label: 'Reef Damping',
    inputLayer: 'bottom-depth/reef',
    dampingRange: 'abrupt transition',
  },
});

export const DAMPING_STRIP_REEF = createStrip(PROGRESSION_REEF, '02-bottom-damping/08-reef');
