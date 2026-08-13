const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST']);

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
];

const REQUEST_HEADERS_TO_REMOVE = [
  'accept-encoding',
  'cdn-loop',
  'cf-connecting-ip',
  'cf-ew-via',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'connection',
  'content-length',
  'host',
  'origin',
  'referer',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
];

const jsonResponse = (body: Record<string, string>, status: number): Response =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

function isSameOriginRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) return origin === requestOrigin;

  const referer = request.headers.get('Referer');
  if (!referer) return false;

  try {
    return new URL(referer).origin === requestOrigin;
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getDynamicProxyTarget(url: URL): URL | null {
  const rawTarget = url.searchParams.get('target');
  if (!rawTarget) return null;

  try {
    const target = new URL(rawTarget);
    if (target.protocol !== 'https:' || isPrivateHost(target.hostname)) return null;

    // The frontend only needs these two OpenAI-compatible endpoints. Keeping
    // this narrow prevents the endpoint from becoming a general-purpose proxy.
    if (!/(?:\/models|\/chat\/completions)\/?$/.test(target.pathname)) return null;
    return target;
  } catch {
    return null;
  }
}

function getFixedProxyTarget(url: URL): URL | null {
  const routes: Array<{ prefix: string; origin: string }> = [
    { prefix: '/ollama-api', origin: 'https://ollama.com' },
    { prefix: '/exa-api', origin: 'https://api.exa.ai' },
    { prefix: '/anysearch-api', origin: 'https://api.anysearch.com' },
  ];

  const route = routes.find(({ prefix }) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (!route) return null;

  const target = new URL(route.origin);
  target.pathname = url.pathname.slice(route.prefix.length) || '/';
  target.search = url.search;
  return target;
}

async function proxyRequest(request: Request, target: URL): Promise<Response> {
  const headers = new Headers(request.headers);
  for (const header of REQUEST_HEADERS_TO_REMOVE) headers.delete(header);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? null : request.body,
      redirect: 'manual',
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return jsonResponse({ error: 'Upstream redirects are not allowed' }, 502);
    }

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('access-control-allow-credentials');
    responseHeaders.delete('access-control-allow-origin');
    responseHeaders.delete('set-cookie');
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(JSON.stringify({
      message: 'Upstream proxy request failed',
      targetHost: target.hostname,
      error: error instanceof Error ? error.message : String(error),
    }));
    return jsonResponse({ error: 'Upstream proxy request failed' }, 502);
  }
}

export default {
  async fetch(request): Promise<Response> {
    if (!ALLOWED_METHODS.has(request.method)) {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    if (!isSameOriginRequest(request)) {
      return jsonResponse({ error: 'Cross-site proxy requests are not allowed' }, 403);
    }

    const url = new URL(request.url);
    const target = url.pathname === '/api/cors-proxy'
      ? getDynamicProxyTarget(url)
      : getFixedProxyTarget(url);

    if (!target) {
      return jsonResponse({ error: 'Proxy target not allowed' }, 400);
    }
    return proxyRequest(request, target);
  },
} satisfies ExportedHandler<Env>;
