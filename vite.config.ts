import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy SSGoo API requests in development mode
          '/api/ssgoo-direct': {
            target: 'https://ai.ssgoo.net',
            changeOrigin: true,
            rewrite: () => '/v1/chat/completions',
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                // Set SSGoo API authorization header
                const apiKey = env.SSGOO_API_KEY || 'sk-8777097c73ebb54f18086ca0378cc930b3a03da32d983869146425bea6e9219c';
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
