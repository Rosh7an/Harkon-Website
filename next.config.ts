import type { NextConfig } from 'next'

// Sent on every response. The CSP deliberately has no script-src: pages are
// prerendered and rely on Next.js inline scripts, so a script policy would need
// per-request nonces (dynamic rendering). These directives block clickjacking,
// <base> hijacking, form redirection and plugins without affecting scripts.
export const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  // Older browsers ignore frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  // Browsers ignore this over plain http, so local development is unaffected.
  // No includeSubDomains: other subdomains may not serve https yet.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Old page addresses from the previous site design.
  async redirects() {
    return [
      { source: '/why', destination: '/about', permanent: true },
      { source: '/process', destination: '/#how-we-work', permanent: true },
      { source: '/pricing', destination: '/cost-estimator', permanent: false },
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}

export default nextConfig
