import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, './packages/game-3d'),
  resolve: {
    alias: {
      '@surf/core': path.resolve(__dirname, './packages/core'),
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
