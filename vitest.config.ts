import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './packages/core/src'),
    },
  },
  test: {
    // Only include tests in packages/core/src/ directory
    include: ['packages/core/src/**/*.test.{ts,tsx}'],
    // Exclude Playwright tests and performance tests
    exclude: ['tests/**', 'node_modules/**', 'packages/core/src/**/*.perf.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./packages/core/src/test-setup.ts'],
  },
});
