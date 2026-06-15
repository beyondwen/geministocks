import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
        proxy: {
          // Same-origin proxy for Ollama Cloud (ollama.com does not send CORS
          // headers, so the browser cannot call it directly). The frontend uses
          // a relative base URL "/ollama-api/v1" which is forwarded here.
          '/ollama-api': {
            target: 'https://ollama.com',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/ollama-api/, ''),
          },
          // Same-origin proxy for Exa (api.exa.ai does not return
          // Access-Control-Allow-Origin, so the browser cannot read responses
          // directly). The frontend calls "/exa-api/search" which is forwarded here.
          '/exa-api': {
            target: 'https://api.exa.ai',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/exa-api/, ''),
          },
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
