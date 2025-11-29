import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only include performance tests
    include: ['src/**/*.perf.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    // Use node environment for minimal overhead
    environment: 'node',
    // Allow longer timeouts for perf tests
    testTimeout: 30000,
    // Run in isolated process for consistent timing
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run sequentially for consistent timing
      },
    },
  },
});
