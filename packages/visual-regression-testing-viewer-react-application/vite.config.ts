import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src',
  plugins: [react()],
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
