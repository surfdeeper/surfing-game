import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@layers': path.resolve(__dirname, './src/layers'),
      '@src': path.resolve(__dirname, './src'),
      '@stories': path.resolve(__dirname, './stories'),
    },
  },
  test: {
    // Only include tests in src/ directory
    include: ['src/**/*.test.{ts,tsx}'],
    // Exclude Playwright tests and performance tests
    exclude: ['tests/**', 'node_modules/**', 'src/**/*.perf.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
