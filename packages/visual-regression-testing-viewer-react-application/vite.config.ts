import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import path from 'path';

export default defineConfig({
  root: 'src',
  plugins: [{ enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) }, react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, '../core/src'),
      '@stories': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
  },
  server: {
    port: 3001,
  },
});
