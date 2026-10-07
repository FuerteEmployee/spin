import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // URL path the site is served from:
  //   npm run build             -> https://spin.billingsphere.com/  (subdomain root)
  //   npm run build:subfolder   -> https://billingsphere.com/spinandwin/
  base: '/',
  server: {
    port: 5173,
  },
});
