import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api':     { target: 'http://localhost:3000', changeOrigin: true },
      '/health':  { target: 'http://localhost:3000', changeOrigin: true },
      '/outputs': { target: 'http://localhost:3000', changeOrigin: true },
      '/ws-xro':  { target: 'ws://localhost:3000', ws: true, changeOrigin: true, rewrite: p => p.replace(/^\/ws-xro/, '') },
    },
  },
  build: { outDir: 'dist' },
});
