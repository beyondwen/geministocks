import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import react from '@vitejs/plugin-react';

/**
 * Dev/preview counterpart of the serverless function api/indicators.ts.
 *
 * The Vite dev server doesn't run Vercel functions, so without this the
 * preview would silently fall back to "configure your own model" mode.
 * Reuses the same compute core (services/indicatorPrecomputeCore.ts) via
 * ssrLoadModule, with a simple in-memory cache standing in for the CDN.
 */
function indicatorsDevPlugin(env: Record<string, string>): Plugin {
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // mirror prod s-maxage=6h
  const cache = new Map<string, { payload: unknown; at: number }>();
  const inflight = new Map<string, Promise<unknown>>();

  return {
    name: 'dev-indicators',
    configureServer(server) {
      server.middlewares.use('/api/indicators', async (req: IncomingMessage, res: ServerResponse) => {
        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(payload));
        };
        const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
        if (!apiKey) return send(503, { error: 'Precompute not configured' });

        const fullUrl = (req as any).originalUrl || req.url || '';
        const locale = new URL(fullUrl, 'http://x').searchParams.get('locale') === 'en' ? 'en' : 'zh';

        const cached = cache.get(locale);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) return send(200, cached.payload);

        try {
          let promise = inflight.get(locale);
          if (!promise) {
            promise = server
              .ssrLoadModule('/services/indicatorPrecomputeCore.ts')
              .then(mod => mod.computeIndicators(
                locale,
                apiKey,
                env.BUFFETT_PERCENTILE || process.env.BUFFETT_PERCENTILE,
                env.INDICATORS_MODEL || process.env.INDICATORS_MODEL
              ))
              .finally(() => inflight.delete(locale));
            inflight.set(locale, promise);
          }
          const payload = await promise;
          cache.set(locale, { payload, at: Date.now() });
          send(200, payload);
        } catch (err) {
          console.error('[dev] indicators precompute failed:', err instanceof Error ? err.message : err);
          send(503, { error: 'Indicator precompute temporarily unavailable' });
        }
      });
    },
  };
}

/**
 * Dev/preview counterpart of the serverless function api/cors-proxy.ts.
 *
 * Many OpenAI-compatible providers (and third-party relays) don't return CORS
 * headers, so the browser can't call them directly. The frontend routes those
 * requests through /api/cors-proxy?target=<absolute https url>. node-http-proxy
 * (used by Vite's `server.proxy`) can't pick the target dynamically per request,
 * so we implement the forwarding as a small Node middleware instead.
 */
function corsProxyDevPlugin(): Plugin {
  return {
    name: 'dev-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/cors-proxy', async (req: IncomingMessage, res: ServerResponse) => {
        const send = (status: number, payload: string) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(payload);
        };
        try {
          const fullUrl = (req as any).originalUrl || req.url || '';
          const target = new URL(fullUrl, 'http://x').searchParams.get('target');
          if (!target) return send(400, JSON.stringify({ error: 'Missing target' }));

          const t = new URL(target);
          if (t.protocol !== 'https:') return send(400, JSON.stringify({ error: 'Only https allowed' }));

          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            const key = k.toLowerCase();
            if (['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer'].includes(key)) continue;
            if (typeof v === 'string') headers[k] = v;
            else if (Array.isArray(v)) headers[k] = v.join(', ');
          }

          let body: Buffer | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve) => {
              req.on('data', (c) => chunks.push(c as Buffer));
              req.on('end', () => resolve());
              req.on('error', () => resolve());
            });
            if (chunks.length) body = Buffer.concat(chunks);
          }

          const upstream = await fetch(t.toString(), { method: req.method, headers, body });
          res.statusCode = upstream.status;
          const ct = upstream.headers.get('content-type');
          if (ct) res.setHeader('content-type', ct);
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch (err) {
          send(502, JSON.stringify({ error: err instanceof Error ? err.message : 'Proxy fetch failed' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    // Load ALL env vars (no VITE_ prefix filter): the dev indicators middleware
    // runs in Node and needs OPENROUTER_API_KEY, which Vite doesn't put on
    // process.env by itself.
    const env = loadEnv(mode, process.cwd(), '');
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
          // Same-origin proxy for AnySearch (api.anysearch.com). The frontend
          // calls "/anysearch-api/v1/search" which is forwarded here.
          '/anysearch-api': {
            target: 'https://api.anysearch.com',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/anysearch-api/, ''),
          },
        },
      },
      plugins: [corsProxyDevPlugin(), indicatorsDevPlugin(env), react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
