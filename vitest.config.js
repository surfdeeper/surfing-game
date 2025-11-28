import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // Only include tests in src/ directory
        include: ['src/**/*.test.{js,jsx}'],
        // Exclude Playwright tests in tests/ directory
        exclude: ['tests/**', 'node_modules/**'],
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.js'],
    },
});
