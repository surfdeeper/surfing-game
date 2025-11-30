import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import path from 'path';

export default defineConfig({
  root: 'packages/visual-regression-testing-viewer-react-application/src',
  plugins: [{ enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) }, react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './packages/core/src'),
      '@stories': path.resolve(
        __dirname,
        './packages/visual-regression-testing-viewer-react-application/src'
      ),
    },
  },
  build: {
    outDir: '../../../dist-stories',
  },
  server: {
    port: 3001,
  },
});
