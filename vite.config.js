import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
      '/outputs': { target: 'http://localhost:3000', changeOrigin: true },
      '/assets': { target: 'http://localhost:3000', changeOrigin: true },
      // SSE proxy — must NOT buffer; flush every chunk immediately
      '/xro': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Copy all upstream headers (includes Content-Type: text/event-stream)
            const headers = { ...proxyRes.headers };
            // Ensure no buffering headers sneak in
            delete headers['content-length'];
            headers['cache-control']  = 'no-cache, no-transform';
            headers['x-accel-buffering'] = 'no';

            res.writeHead(proxyRes.statusCode || 200, headers);

            // Pipe each chunk immediately without any buffering
            proxyRes.on('data', (chunk) => {
              res.write(chunk);
              // Flush the chunk to the browser right away
              if (typeof res.flush === 'function') res.flush();
            });
            proxyRes.on('end',   () => { res.end(); });
            proxyRes.on('error', () => { if (!res.writableEnded) res.end(); });
          });
          proxy.on('error', (err, req, res) => {
            if (!res.headersSent) res.writeHead(502);
            if (!res.writableEnded) res.end(`Proxy error: ${err.message}`);
          });
        },
      },
    },
  },
  build: { outDir: 'dist' },
});
