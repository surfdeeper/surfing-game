import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, './packages/game-3d'),
  plugins: [react()],
  resolve: {
    alias: {
      '@surf/core': path.resolve(__dirname, './packages/core'),
      '@surf/debug-ui': path.resolve(__dirname, './packages/debug-ui'),
      '@surf/player': path.resolve(__dirname, './packages/player'),
    },
  },
  server: {
    port: 5174, // Different port from 2D game (5173)
  },
  build: {
    outDir: path.resolve(__dirname, './packages/game-3d/dist'),
    emptyOutDir: true,
  },
});
