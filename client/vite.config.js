import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    // The Express API (server/) runs on 5000 in development
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
