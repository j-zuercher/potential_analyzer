/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // maps.zh.ch requires a GIS-ZH account — kept for future authenticated use.
      '/zh': {
        target: 'https://maps.zh.ch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zh/, ''),
      },
      // ogd.stadt-zuerich.ch is the public open-data WFS — no account needed.
      '/ogd': {
        target: 'https://www.ogd.stadt-zuerich.ch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ogd/, ''),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
