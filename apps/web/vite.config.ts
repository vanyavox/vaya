import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Optional asset CDN, e.g. https://cdn.vanyayana.ru — keep / for same-origin
const rawBase = process.env.VITE_CDN_BASE || '/';

export default defineConfig({
  base: rawBase.endsWith('/') ? rawBase : `${rawBase}/`,
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
