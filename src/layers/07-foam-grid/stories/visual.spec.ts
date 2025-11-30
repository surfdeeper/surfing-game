import { defineStripVisualTests } from '../../../../stories/visual-test-helpers';
import { FOAM_GRID_STRIP_ACCUMULATION } from './01-accumulation';
import { FOAM_GRID_STRIP_ADVECTION } from './02-advection';
import { FOAM_GRID_STRIP_COMBINED } from './03-combined';

defineStripVisualTests([
  FOAM_GRID_STRIP_ACCUMULATION,
  FOAM_GRID_STRIP_ADVECTION,
  FOAM_GRID_STRIP_COMBINED,
]);
