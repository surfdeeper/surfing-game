import { defineStripVisualTests } from '../../../../../../stories/visual-test-helpers';
import { FOAM_STRIP_BASIC } from './01-basic-shapes';
import { FOAM_STRIP_ADVANCED } from './02-advanced-patterns';
import { FOAM_STRIP_EDGE_CASES } from './03-edge-cases';
import { FOAM_STRIP_NO_BLUR, FOAM_STRIP_HIGH_BLUR } from './04-blur-effect';

defineStripVisualTests([
  FOAM_STRIP_BASIC,
  FOAM_STRIP_ADVANCED,
  FOAM_STRIP_EDGE_CASES,
  FOAM_STRIP_NO_BLUR,
  FOAM_STRIP_HIGH_BLUR,
]);
