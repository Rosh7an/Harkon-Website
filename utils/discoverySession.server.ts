import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { DISCOVERY_VERSION, DiscoveryValidationError, type DiscoverySession } from './discovery'
import { SOLUTION_CATALOG_VERSION } from './solutionCatalog'

// Next development reloads modules without ending the server process. Keep the
// fallback key on that process so existing tokens survive those reloads.
function developmentSessionSecret() {
  const serverGlobal = globalThis as typeof globalThis & { __exterDiscoveryDevelopmentSecret?: string }
  return serverGlobal.__exterDiscoveryDevelopmentSecret ??= randomBytes(32).toString('hex')
}
export class DiscoverySessionError extends DiscoveryValidationError {
  readonly code = 'DISCOVERY_SESSION_INVALID'
}
function sessionKey() {
  const secret = process.env.DISCOVERY_SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? developmentSessionSecret() : '')
  if (!secret || secret.length < 32) throw new Error('Discovery session configuration unavailable')
  return createHash('sha256').update(`exter-discovery-v1:${secret}`).digest()
}
// Client carries only an authenticated, encrypted snapshot. It cannot forge facts,
// stage, confirmation or price. Production uses a stable dedicated server-only key.
export function sealSession(session: DiscoverySession): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
}
export function openSession(token: unknown, now = Date.now()): DiscoverySession {
  if (typeof token !== 'string' || token.length > 400000 || token.length < 40) throw new DiscoverySessionError('Your discovery session is invalid. Start a new session.')
  // A missing server key is an outage, not evidence that the customer's draft is
  // invalid. Keep this outside the token-validation catch so recovery preserves it.
  const key = sessionKey()
  try {
    const bytes = Buffer.from(token, 'base64url')
    if (bytes.length < 29) throw new Error('short token')
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const decoded = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
    const session = JSON.parse(decoded) as DiscoverySession
    if (session.version !== DISCOVERY_VERSION || session.catalogVersion !== SOLUTION_CATALOG_VERSION || session.expiresAt <= now) throw new Error('expired session')
    return session
  } catch {
    throw new DiscoverySessionError('Your discovery session expired or is invalid. Start a new session.')
  }
}
