import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // Customers open the page on all kinds of phones: keep CSS that older mobile browsers
    // understand (e.g. min-width media queries instead of the newer width>= syntax)
    cssTarget: ['chrome87', 'safari14', 'firefox78', 'edge88'],
  },
  server: {
    port: 5173,
    // The Express API (server/) runs on 5000 in development
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
