import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import path from 'path';

export default defineConfig({
  root: 'stories',
  plugins: [{ enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) }, react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@stories': path.resolve(__dirname, './stories'),
    },
  },
  build: {
    outDir: '../dist-stories',
  },
  server: {
    port: 3001,
  },
});
