import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@layers': path.resolve(__dirname, './src/layers'),
      '@src': path.resolve(__dirname, './src'),
      '@stories': path.resolve(__dirname, './stories'),
    },
  },
});
