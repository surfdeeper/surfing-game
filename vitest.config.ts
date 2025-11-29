import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Only include tests in src/ directory
    include: ['src/**/*.test.{ts,tsx}'],
    // Exclude Playwright tests and performance tests
    exclude: ['tests/**', 'node_modules/**', 'src/**/*.perf.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
