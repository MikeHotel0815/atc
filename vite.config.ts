// filepath: vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Läuft unter games.himmelreich.cloud/atc/
  base: '/atc/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/atc/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/atc/, ''),
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
