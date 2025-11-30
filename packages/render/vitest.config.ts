import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      // Handle @surf/core imports
      { find: '@surf/core/src', replacement: path.resolve(__dirname, '../core/src') },
      { find: '@surf/core', replacement: path.resolve(__dirname, '../core/src/index.ts') },
    ],
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**'],
    environment: 'jsdom',
  },
});
