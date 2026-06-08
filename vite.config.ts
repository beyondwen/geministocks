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
                const apiKey = env.SSGOO_API_KEY || 'sk-5023f8af5c30c7ff10efa2d9a22997d990836073c2721f39a85860a52d858596';
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
