/**
 * Strip Test Utilities
 *
 * Helper for creating strip definitions used by visual regression tests.
 * Strips are filmstrip-like sequences of matrix snapshots rendered to canvas.
 */

/**
 * Strip definition for visual tests
 */
export type StripDefinition = {
  testId: string;
  pageId: string;
  snapshots: Array<{ time: number; matrix: number[][]; label: string }>;
};

/**
 * Progression type from defineProgression
 */
type Progression = {
  id: string;
  snapshots: Array<{ time: number; matrix: number[][]; label: string }>;
};

/**
 * Create a strip definition from a progression.
 *
 * This centralizes the boilerplate for creating STRIP exports that are used
 * by visual regression tests via defineStripVisualTests.
 *
 * @param progression - The progression object from defineProgression
 * @param pageId - The page ID for the visual test (e.g., '02-bottom-damping/01-flat-shallow')
 * @param testIdPrefix - Optional prefix for testId (defaults to 'strip')
 * @returns StripDefinition for use in visual tests
 *
 * @example
 * // Before (boilerplate in each file):
 * export const DAMPING_STRIP_FLAT_SHALLOW = {
 *   testId: 'strip-damping-flat-shallow',
 *   pageId: '02-bottom-damping/01-flat-shallow',
 *   snapshots: PROGRESSION_FLAT_SHALLOW.snapshots,
 * };
 *
 * // After (one-liner):
 * export const DAMPING_STRIP_FLAT_SHALLOW = createStrip(
 *   PROGRESSION_FLAT_SHALLOW,
 *   '02-bottom-damping/01-flat-shallow'
 * );
 */
export function createStrip(
  progression: Progression,
  pageId: string,
  testIdPrefix = 'strip'
): StripDefinition {
  // Convert progression.id (e.g., 'bottom-damping/flat-shallow') to testId format
  // Result: 'strip-bottom-damping-flat-shallow'
  const idSlug = progression.id.replace(/\//g, '-');
  const testId = `${testIdPrefix}-${idSlug}`;

  return {
    testId,
    pageId,
    snapshots: progression.snapshots,
  };
}
