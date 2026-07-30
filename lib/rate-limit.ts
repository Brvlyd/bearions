// Best-effort in-memory rate limiting for public API routes.
//
// Scope: one server instance. It resets on redeploy and is not shared between
// serverless instances, so treat it as a speed bump against casual abuse rather
// than a guarantee. Anything that must hold under real attack belongs at the
// edge (Vercel WAF, Cloudflare) or in a shared store.

type Bucket = number[]

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

const SWEEP_INTERVAL_MS = 10 * 60 * 1000

/** Drop buckets whose newest hit is older than the widest window we might use. */
const sweep = (now: number) => {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now

  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > SWEEP_INTERVAL_MS * 6) {
      buckets.delete(key)
    }
  }
}

export type RateLimitOptions = {
  /** Unique per caller and per route, e.g. `contact:1.2.3.4`. */
  key: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  /** Seconds until the oldest hit in the window expires. */
  retryAfterSeconds: number
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const hits = (buckets.get(key) || []).filter((at) => now - at < windowMs)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)),
    }
  }

  hits.push(now)
  buckets.set(key, hits)

  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 }
}

/**
 * Best available client identifier. Proxy headers are spoofable, so this only
 * ever widens who shares a bucket — never who gets authorised.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return request.headers.get('x-real-ip') || 'unknown'
}
