// Shared abuse guards for public API routes. These limits live in this server
// instance's memory, so they are a backstop: deployment-wide limits belong at
// the hosting firewall or in a shared store.

const MAX_KEY_LENGTH = 100

/**
 * The caller's IP as seen by the nearest trusted proxy. `x-real-ip` is set by
 * the proxy itself. Otherwise use the LAST `x-forwarded-for` entry: proxies
 * append the address they saw, while earlier entries are whatever the client
 * chose to send.
 */
export function clientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, MAX_KEY_LENGTH)
  const forwarded = req.headers.get('x-forwarded-for')?.split(',').map(part => part.trim()).filter(Boolean)
  return (forwarded?.at(-1) ?? 'unknown').slice(0, MAX_KEY_LENGTH)
}

/**
 * Browsers always send Origin on cross-site POSTs. A missing Origin is a
 * non-browser client, which rate limits handle; a foreign or malformed one is
 * refused. Compare with Host, not req.url: proxies can rebuild req.url with an
 * internal hostname.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    const originUrl = new URL(origin)
    const host = req.headers.get('host') || new URL(req.url).host
    return ['http:', 'https:'].includes(originUrl.protocol) && originUrl.host === host
  } catch {
    return false
  }
}

export interface RateLimitDecision { allowed: boolean; resetAt: number }
export interface RateLimiter {
  take(key: string, now?: number): RateLimitDecision
  reset(): void
}

/**
 * Fixed-window counter per key. When the table is full, the oldest key is
 * evicted instead of refusing new keys, so flooding it with fake addresses
 * cannot lock out genuine visitors.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 1000 }: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  if (![limit, windowMs, maxKeys].every(value => Number.isInteger(value) && value > 0)) throw new RangeError('Rate limiter settings must be positive integers')
  const entries = new Map<string, { count: number; resetAt: number }>()
  return {
    take(key, now = Date.now()) {
      const existing = entries.get(key)
      if (existing && existing.resetAt > now) {
        if (existing.count >= limit) return { allowed: false, resetAt: existing.resetAt }
        existing.count++
        return { allowed: true, resetAt: existing.resetAt }
      }
      if (existing) entries.delete(key)
      if (entries.size >= maxKeys) {
        for (const [storedKey, entry] of entries) if (entry.resetAt <= now) entries.delete(storedKey)
        // Map iterates in insertion order, so the first key is the oldest window.
        while (entries.size >= maxKeys) entries.delete(entries.keys().next().value as string)
      }
      const entry = { count: 1, resetAt: now + windowMs }
      entries.set(key, entry)
      return { allowed: true, resetAt: entry.resetAt }
    },
    reset() { entries.clear() },
  }
}

export function retryAfterSeconds(resetAt: number, now = Date.now()): string {
  return String(Math.max(1, Math.ceil((resetAt - now) / 1000)))
}
