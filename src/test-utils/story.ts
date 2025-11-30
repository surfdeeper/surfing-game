/**
 * Story Definition
 *
 * Single-file story format that combines:
 * - Prose (documentation)
 * - Progression (test data)
 * - Expected ASCII (validated at import time)
 */

import { defineProgression } from './progression.js';
import { progressionToAscii } from './asciiMatrix.js';

export interface StoryConfig {
  id: string;
  title: string;
  prose: string;
  initialMatrix: number[][];
  captureTimes?: number[];
  updateFn?: (field: any, dt: number) => void;
  expectedAscii: string;
}

export interface Story {
  id: string;
  title: string;
  prose: string;
  progression: ReturnType<typeof defineProgression>;
}

/**
 * Define a story with built-in ASCII validation.
 * Throws at import time if actual output doesn't match expectedAscii.
 */
export function defineStory(config: StoryConfig): Story {
  const {
    id,
    title,
    prose,
    initialMatrix,
    captureTimes = [0, 1, 2, 3, 4, 5],
    updateFn,
    expectedAscii,
  } = config;

  const progression = defineProgression({
    id,
    description: prose,
    initialMatrix,
    captureTimes,
    updateFn,
    metadata: { label: title },
  });

  // Validate ASCII matches
  const actualAscii = progressionToAscii(progression.snapshots);
  const normalizedExpected = normalizeAscii(expectedAscii);
  const normalizedActual = normalizeAscii(actualAscii);

  if (normalizedActual !== normalizedExpected) {
    throw new Error(
      `Story "${id}" ASCII mismatch:\n\nExpected:\n${normalizedExpected}\n\nActual:\n${normalizedActual}`
    );
  }

  return { id, title, prose, progression };
}

/**
 * Normalize ASCII for comparison (trim, normalize whitespace)
 */
function normalizeAscii(ascii: string): string {
  return ascii
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
}
