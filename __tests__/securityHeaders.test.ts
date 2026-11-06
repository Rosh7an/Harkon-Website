// @vitest-environment node
import { describe, expect, it } from 'vitest'
import nextConfig, { SECURITY_HEADERS } from '../next.config'

const header = (key: string) => SECURITY_HEADERS.find(item => item.key === key)?.value

describe('security headers', () => {
  it('applies every header to all paths and hides the framework banner', async () => {
    const rules = await nextConfig.headers!()
    expect(rules).toEqual([{ source: '/:path*', headers: SECURITY_HEADERS }])
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('blocks framing in modern and older browsers', () => {
    expect(header('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    expect(header('X-Frame-Options')).toBe('DENY')
  })

  it('restricts base, forms and plugins without a script policy that would break Next.js inline scripts', () => {
    const csp = header('Content-Security-Policy')!
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toMatch(/script-src|default-src/)
  })

  it('sets the remaining hardening headers once each', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header('Permissions-Policy')).toContain('camera=()')
    expect(header('Strict-Transport-Security')).toBe('max-age=31536000')
    const keys = SECURITY_HEADERS.map(item => item.key.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
  })
})
