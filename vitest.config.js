import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Only include tests in src/ directory
        include: ['src/**/*.test.js'],
        // Exclude Playwright tests in tests/ directory
        exclude: ['tests/**', 'node_modules/**'],
    },
});
