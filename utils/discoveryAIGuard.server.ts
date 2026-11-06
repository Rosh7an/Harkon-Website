import { consult } from './discoveryAgent.server'
import { aiReviewProviderDetails } from './discoveryAIStatus'
import type { DiscoverySession } from './discovery'
import { createRateLimiter } from './requestGuard.server'
import { isRecord } from './solutionCatalog'

// A retry cooldown stored only in the customer's sealed token can be skipped by
// resending an older token. These checks live on the server instead:
// 1. Provider cooldown: after the AI provider answers 429 with Retry-After, no
//    caller reaches the provider until that time. The limit applies to our API
//    key, not to one customer.
// 2. Per-client budget: caps AI calls per address, whatever token is sent.
export const AI_CALLS_PER_CLIENT = 20
export const AI_CLIENT_WINDOW_MS = 10 * 60 * 1000
// Ignore absurd Retry-After values so a bad header cannot disable AI for long.
export const MAX_PROVIDER_COOLDOWN_MS = 60 * 60 * 1000

const clientBudget = createRateLimiter({ limit: AI_CALLS_PER_CLIENT, windowMs: AI_CLIENT_WINDOW_MS })
let providerBlockedUntil = 0

/** Shaped like a provider 429, so existing failure handling reports rate_limit and retryAt. */
export class AIReviewCooldownError extends Error {
  readonly status = 429
  readonly headers: Headers
  constructor(retryAt: number, now: number) {
    super('AI review is cooling down')
    this.name = 'AIReviewCooldownError'
    this.headers = new Headers({ 'retry-after': String(Math.max(1, Math.ceil((retryAt - now) / 1000))) })
  }
}

export async function guardedConsult(client: string, session: DiscoverySession, answer: string) {
  const now = Date.now()
  if (providerBlockedUntil > now) throw new AIReviewCooldownError(providerBlockedUntil, now)
  const budget = clientBudget.take(client, now)
  if (!budget.allowed) throw new AIReviewCooldownError(budget.resetAt, now)
  try {
    return await consult(session, answer)
  } catch (error) {
    if (isRecord(error) && error.status === 429) {
      const failedAt = Date.now()
      const retryAt = aiReviewProviderDetails(error, failedAt).retryAt
      if (retryAt !== undefined) providerBlockedUntil = Math.max(providerBlockedUntil, Math.min(retryAt, failedAt + MAX_PROVIDER_COOLDOWN_MS))
    }
    throw error
  }
}

/** Test isolation only: module state otherwise persists between test cases. */
export function resetAIGuard() {
  providerBlockedUntil = 0
  clientBudget.reset()
}
