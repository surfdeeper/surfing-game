import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@layers': path.resolve(__dirname, './src/layers'),
      '@src': path.resolve(__dirname, './packages/core/src'),
      '@stories': path.resolve(
        __dirname,
        './packages/visual-regression-testing-viewer-react-application/src'
      ),
    },
  },
});
