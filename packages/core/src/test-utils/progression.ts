/**
 * Progression Test Framework
 *
 * A structured way to define time-progression tests that can be:
 * 1. Asserted on in unit tests (data correctness)
 * 2. Rendered for visual regression tests (render correctness)
 * 3. Displayed in MDX documentation (explanation)
 *
 * The key insight: define the progression ONCE, use it THREE ways.
 */

import { matrixToField, fieldToMatrix } from './matrixField.js';

// Registry of all defined progressions (for discovery by visual test runner)
const progressionRegistry = new Map();

/**
 * Define a progression test
 *
 * @param {object} config - Progression configuration
 * @param {string} config.id - Unique identifier (e.g., 'energy-field/no-damping')
 * @param {string} config.description - Human-readable description
 * @param {number[][]} config.initialMatrix - Initial state as 2D matrix
 * @param {function} config.updateFn - (field, dt) => void - Simulation update function
 * @param {number[]} config.captureTimes - Times (in seconds) to capture snapshots
 * @param {function} [config.renderFn] - Optional render function for visual tests
 * @param {object} [config.metadata] - Optional metadata (parameters, formula, etc.)
 * @returns {object} Progression object with snapshots and metadata
 */
export function defineProgression(config) {
  const {
    id,
    description,
    initialMatrix,
    updateFn,
    captureTimes = [0, 1, 2, 3, 4, 5],
    renderFn = null,
    metadata = {},
  } = config;

  if (!id) {
    throw new Error('defineProgression requires an id');
  }

  if (!initialMatrix) {
    throw new Error('defineProgression requires an initialMatrix');
  }

  if (!updateFn) {
    throw new Error('defineProgression requires an updateFn');
  }

  // Capture snapshots by running the simulation
  const snapshots = captureSnapshots({
    initialMatrix,
    updateFn,
    captureTimes,
  });

  const progression = {
    id,
    description,
    initialMatrix,
    updateFn,
    captureTimes,
    renderFn,
    metadata,
    snapshots,

    // Helper to get snapshot at specific time
    at(time) {
      return snapshots.find((s) => s.time === time);
    },

    // Helper to get matrix at specific time
    matrixAt(time) {
      const snapshot = this.at(time);
      return snapshot?.matrix ?? null;
    },
  };

  // Register for discovery
  progressionRegistry.set(id, progression);

  return progression;
}

/**
 * Run simulation and capture snapshots at specified times
 *
 * @param {object} options - Capture options
 * @param {number[][]} options.initialMatrix - Initial state
 * @param {function} options.updateFn - (field, dt) => void
 * @param {number[]} options.captureTimes - Times to capture
 * @param {number} [options.dt] - Time step (default: 1/60)
 * @returns {object[]} Array of { time, matrix, label } snapshots
 */
export function captureSnapshots(options) {
  const { initialMatrix, updateFn, captureTimes, dt = 1 / 60 } = options;

  const field = matrixToField(initialMatrix);
  const snapshots = [];
  let currentTime = 0;
  let captureIdx = 0;

  // Sort capture times to ensure we process in order
  const sortedTimes = [...captureTimes].sort((a, b) => a - b);

  // Capture t=0 if it's in the list
  if (sortedTimes[0] === 0) {
    snapshots.push({
      time: 0,
      matrix: fieldToMatrix(field),
      label: 't=0s',
    });
    captureIdx++;
  }

  // Run simulation until we've captured all times
  const maxTime = sortedTimes[sortedTimes.length - 1];
  const tolerance = dt / 2;

  while (captureIdx < sortedTimes.length && currentTime <= maxTime + tolerance) {
    // Update simulation
    updateFn(field, dt);
    currentTime += dt;

    // Check if we've reached the next capture time
    const targetTime = sortedTimes[captureIdx];
    if (currentTime >= targetTime - tolerance) {
      snapshots.push({
        time: targetTime,
        matrix: fieldToMatrix(field),
        label: `t=${targetTime}s`,
      });
      captureIdx++;
    }
  }

  return snapshots;
}

/**
 * Run simulation with custom events (e.g., drain at specific time)
 *
 * @param {object} options - Simulation options
 * @param {number[][]} options.initialMatrix - Initial state
 * @param {function} options.updateFn - (field, dt) => void
 * @param {number[]} options.captureTimes - Times to capture
 * @param {object[]} [options.events] - Array of { time, action: (field) => void }
 * @param {number} [options.dt] - Time step (default: 1/60)
 * @returns {object[]} Array of snapshots
 */
export function captureWithEvents(options) {
  const { initialMatrix, updateFn, captureTimes, events = [], dt = 1 / 60 } = options;

  const field = matrixToField(initialMatrix);
  const snapshots = [];
  let currentTime = 0;
  let captureIdx = 0;
  let eventIdx = 0;

  // Sort capture times and events
  const sortedTimes = [...captureTimes].sort((a, b) => a - b);
  const sortedEvents = [...events].sort((a, b) => a.time - b.time);

  // Capture t=0 if it's in the list
  if (sortedTimes[0] === 0) {
    snapshots.push({
      time: 0,
      matrix: fieldToMatrix(field),
      label: 't=0s',
    });
    captureIdx++;
  }

  const maxTime = sortedTimes[sortedTimes.length - 1];
  const tolerance = dt / 2;

  while (captureIdx < sortedTimes.length && currentTime <= maxTime + tolerance) {
    // Update simulation
    updateFn(field, dt);
    currentTime += dt;

    // Process events at this time
    while (
      eventIdx < sortedEvents.length &&
      currentTime >= sortedEvents[eventIdx].time - tolerance
    ) {
      const event = sortedEvents[eventIdx];
      event.action(field);
      eventIdx++;
    }

    // Check if we've reached the next capture time
    const targetTime = sortedTimes[captureIdx];
    if (currentTime >= targetTime - tolerance) {
      // Check if an event just fired to annotate the label
      const eventAtTime = sortedEvents.find(
        (e) => Math.abs(e.time - targetTime) < tolerance && e.label
      );
      const label = eventAtTime ? `t=${targetTime}s (${eventAtTime.label})` : `t=${targetTime}s`;

      snapshots.push({
        time: targetTime,
        matrix: fieldToMatrix(field),
        label,
      });
      captureIdx++;
    }
  }

  return snapshots;
}

/**
 * Get all registered progressions
 * @returns {Map<string, object>} Map of id -> progression
 */
export function getProgressionRegistry() {
  return progressionRegistry;
}

/**
 * Get a specific progression by id
 * @param {string} id - Progression id
 * @returns {object|null} Progression or null if not found
 */
export function getProgression(id) {
  return progressionRegistry.get(id) ?? null;
}

/**
 * Clear the progression registry (useful for tests)
 */
export function clearProgressionRegistry() {
  progressionRegistry.clear();
}

/**
 * Re-export matrix utilities for convenience
 */
export { matrixToField, fieldToMatrix } from './matrixField.js';
