import { defineStoryVisualTests } from '../visual-test-helpers';

// Import the progression that App.tsx actually extracts from each story file
// Note: Object.keys().find() doesn't guarantee source order, so we must match
// what the App actually picks (determined empirically via browser testing)
import { PROGRESSION_OVERLAPPING } from '@surf/core/src/layers/09-foam-contours/stories/01-basic-shapes';
import { PROGRESSION_EDGE } from '@surf/core/src/layers/09-foam-contours/stories/02-advanced-patterns';
import { PROGRESSION_EMPTY } from '@surf/core/src/layers/09-foam-contours/stories/03-edge-cases';
// Note: 04-blur-effect has no progressions, only strip re-exports

defineStoryVisualTests('09-foam-contours', [
  ['01-basic-shapes', { id: PROGRESSION_OVERLAPPING.id }],
  ['02-advanced-patterns', { id: PROGRESSION_EDGE.id }],
  ['03-edge-cases', { id: PROGRESSION_EMPTY.id }],
]);
