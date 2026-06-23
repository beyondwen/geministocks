import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Generic same-origin CORS proxy.
 *
 * Many OpenAI-compatible providers (and relay services) do not return
 * Access-Control-Allow-Origin headers, so the browser cannot call them
 * directly (it reports "Failed to fetch"). The frontend routes those requests
 * through this proxy: GET/POST /api/cors-proxy?target=<absolute https url>.
 *
 * The dev/preview environment uses the equivalent dynamic proxy configured in
 * vite.config.ts. This function is the production (Vercel) counterpart.
 *
 * Security: only https targets to public hosts are allowed (blocks SSRF to
 * localhost / private network ranges).
 */

function isDisallowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const target = (Array.isArray(req.query.target) ? req.query.target[0] : req.query.target) || ''

  let targetUrl: URL
  try {
    targetUrl = new URL(target)
  } catch {
    res.status(400).json({ error: 'Invalid or missing target URL' })
    return
  }

  if (targetUrl.protocol !== 'https:') {
    res.status(400).json({ error: 'Only https targets are allowed' })
    return
  }
  if (isDisallowedHost(targetUrl.hostname)) {
    res.status(403).json({ error: 'Target host not allowed' })
    return
  }

  // Forward request headers, dropping hop-by-hop / host-specific ones
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    const key = k.toLowerCase()
    if (['host', 'connection', 'content-length', 'accept-encoding', 'origin', 'referer'].includes(key)) continue
    if (typeof v === 'string') headers[k] = v
    else if (Array.isArray(v)) headers[k] = v.join(', ')
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (!headers['content-type']) headers['content-type'] = 'application/json'
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
    })

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.status(upstream.status)
    const contentType = upstream.headers.get('content-type')
    if (contentType) res.setHeader('content-type', contentType)
    res.send(buf)
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Proxy fetch failed' })
  }
}
