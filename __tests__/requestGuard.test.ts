// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { clientIp, createRateLimiter, isSameOriginRequest, retryAfterSeconds } from '../utils/requestGuard.server'

const request = (headers: Record<string, string>, url = 'http://localhost/api/x') => new Request(url, { method: 'POST', headers })

describe('clientIp', () => {
  it('prefers the proxy-set x-real-ip', () => {
    expect(clientIp(request({ 'x-real-ip': ' 198.51.100.4 ', 'x-forwarded-for': '1.1.1.1' }))).toBe('198.51.100.4')
  })
  it('uses the last x-forwarded-for entry, so a spoofed first entry is ignored', () => {
    expect(clientIp(request({ 'x-forwarded-for': '6.6.6.6, 198.51.100.9' }))).toBe('198.51.100.9')
    expect(clientIp(request({ 'x-forwarded-for': '198.51.100.9' }))).toBe('198.51.100.9')
  })
  it('falls back to one shared key when no address is available', () => {
    expect(clientIp(request({}))).toBe('unknown')
    expect(clientIp(request({ 'x-forwarded-for': ' , ' }))).toBe('unknown')
  })
  it('bounds the key length', () => {
    expect(clientIp(request({ 'x-real-ip': 'a'.repeat(500) }))).toHaveLength(100)
  })
})

describe('isSameOriginRequest', () => {
  it('allows requests without Origin (non-browser clients are rate limited instead)', () => {
    expect(isSameOriginRequest(request({}))).toBe(true)
  })
  it('allows the public host even when req.url uses an internal hostname', () => {
    expect(isSameOriginRequest(request({ host: 'www.extercloud.in', origin: 'https://www.extercloud.in' }, 'http://internal:3000/api/x'))).toBe(true)
  })
  it('refuses foreign, malformed and non-http origins', () => {
    expect(isSameOriginRequest(request({ host: 'www.extercloud.in', origin: 'https://evil.example' }))).toBe(false)
    expect(isSameOriginRequest(request({ host: 'www.extercloud.in', origin: 'not a url' }))).toBe(false)
    expect(isSameOriginRequest(request({ host: 'www.extercloud.in', origin: 'null' }))).toBe(false)
    expect(isSameOriginRequest(request({ host: 'www.extercloud.in', origin: 'ftp://www.extercloud.in' }))).toBe(false)
  })
})

describe('createRateLimiter', () => {
  it('allows up to the limit, then blocks until the window resets', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 })
    expect(limiter.take('a', 0)).toEqual({ allowed: true, resetAt: 1000 })
    expect(limiter.take('a', 10).allowed).toBe(true)
    expect(limiter.take('a', 20)).toEqual({ allowed: false, resetAt: 1000 })
    expect(limiter.take('a', 999).allowed).toBe(false)
    expect(limiter.take('a', 1000)).toEqual({ allowed: true, resetAt: 2000 })
  })
  it('keeps separate budgets per key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
    expect(limiter.take('a', 0).allowed).toBe(true)
    expect(limiter.take('a', 0).allowed).toBe(false)
    expect(limiter.take('b', 0).allowed).toBe(true)
  })
  it('evicts the oldest key when full instead of locking out new visitors', () => {
    const limiter = createRateLimiter({ limit: 60, windowMs: 600_000, maxKeys: 1000 })
    for (let i = 0; i < 1000; i++) limiter.take(`fake-${i}`, 0)
    expect(limiter.take('genuine-visitor', 1).allowed).toBe(true)
    // fake-0 was evicted, so it starts a fresh window; fake-999 keeps its count.
    expect(limiter.take('fake-0', 2)).toEqual({ allowed: true, resetAt: 600_002 })
  })
  it('purges expired keys before evicting live ones', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 100, maxKeys: 2 })
    limiter.take('old', 0)
    limiter.take('live', 150)
    limiter.take('new', 160)
    // 'old' had expired, so 'live' survived and is still at its limit.
    expect(limiter.take('live', 170).allowed).toBe(false)
  })
  it('forgets addresses as soon as their window ends, even when the table is not full', () => {
    const limiter = createRateLimiter({ limit: 5, windowMs: 100 })
    limiter.take('a', 0)
    limiter.take('b', 10)
    expect(limiter.size()).toBe(2)
    limiter.take('c', 150)
    expect(limiter.size()).toBe(1)
  })
  it('reset clears every key', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
    limiter.take('a', 0)
    limiter.reset()
    expect(limiter.take('a', 1).allowed).toBe(true)
  })
  it('rejects invalid settings', () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow(RangeError)
    expect(() => createRateLimiter({ limit: 1, windowMs: -1 })).toThrow(RangeError)
    expect(() => createRateLimiter({ limit: 1.5, windowMs: 1000 })).toThrow(RangeError)
  })
})

describe('retryAfterSeconds', () => {
  it('rounds up and never returns less than one second', () => {
    expect(retryAfterSeconds(1500, 0)).toBe('2')
    expect(retryAfterSeconds(0, 5000)).toBe('1')
  })
})
