/**
 * @surf/core - Core game logic
 *
 * Pure game state, update logic, and coordinate utilities.
 * No rendering dependencies.
 */

// State models
export * from './state/index.js';

// Update orchestration
export * from './update/index.js';

// Core math utilities
export * from './core/index.js';

// Coordinate utilities
export * from './coordinates.js';

// Test utilities (for other packages' tests)
export * from './test-utils/index.js';
