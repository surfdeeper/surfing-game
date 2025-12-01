import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, './packages/game'),
  resolve: {
    alias: {
      '@surf/core': path.resolve(__dirname, './packages/core'),
    },
  },
});
