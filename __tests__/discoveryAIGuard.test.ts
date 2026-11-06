// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', () => ({ consult: vi.fn() }))
import { consult } from '../utils/discoveryAgent.server'
import { AI_CALLS_PER_CLIENT, AIReviewCooldownError, MAX_PROVIDER_COOLDOWN_MS, guardedConsult, resetAIGuard } from '../utils/discoveryAIGuard.server'
import { aiReviewFailureReason, aiReviewProviderDetails } from '../utils/discoveryAIStatus'
import { createDiscovery } from '../utils/discovery'
import { POST } from '../app/api/discovery/route'

const session = createDiscovery('guided')
const ok = { acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] }
const providerLimit = (seconds?: string) => Object.assign(new Error('provider limit'), { status: 429, ...(seconds ? { headers: new Headers({ 'retry-after': seconds }) } : {}) })

beforeEach(() => { resetAIGuard(); vi.mocked(consult).mockReset().mockResolvedValue(ok) })
afterEach(() => { vi.restoreAllMocks() })

describe('guardedConsult', () => {
  it('passes through a successful provider call', async () => {
    await expect(guardedConsult('a', session, 'answer')).resolves.toEqual(ok)
    expect(consult).toHaveBeenCalledTimes(1)
  })

  it('blocks every caller after a provider 429 with Retry-After, until that time', async () => {
    vi.mocked(consult).mockRejectedValueOnce(providerLimit('30'))
    await expect(guardedConsult('a', session, 'answer')).rejects.toMatchObject({ status: 429 })
    const blocked = guardedConsult('another-visitor', session, 'answer')
    await expect(blocked).rejects.toBeInstanceOf(AIReviewCooldownError)
    expect(consult).toHaveBeenCalledTimes(1)

    const start = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(start + 31_000)
    await expect(guardedConsult('a', session, 'answer')).resolves.toEqual(ok)
    expect(consult).toHaveBeenCalledTimes(2)
  })

  it('reports the cooldown as rate_limit with a retry time the UI can show', async () => {
    vi.mocked(consult).mockRejectedValueOnce(providerLimit('30'))
    await guardedConsult('a', session, 'answer').catch(() => {})
    const error = await guardedConsult('a', session, 'answer').catch(failure => failure)
    expect(aiReviewFailureReason(error, false)).toBe('rate_limit')
    const retryAt = aiReviewProviderDetails(error).retryAt!
    expect(retryAt - Date.now()).toBeGreaterThan(25_000)
    expect(retryAt - Date.now()).toBeLessThanOrEqual(31_000)
  })

  it('does not block when the provider gives no Retry-After or fails differently', async () => {
    vi.mocked(consult).mockRejectedValueOnce(providerLimit()).mockRejectedValueOnce(Object.assign(new Error('down'), { status: 503 }))
    await expect(guardedConsult('a', session, 'answer')).rejects.toMatchObject({ status: 429 })
    await expect(guardedConsult('a', session, 'answer')).rejects.toMatchObject({ status: 503 })
    await expect(guardedConsult('a', session, 'answer')).resolves.toEqual(ok)
    expect(consult).toHaveBeenCalledTimes(3)
  })

  it('caps an absurd Retry-After at one hour', async () => {
    vi.mocked(consult).mockRejectedValueOnce(providerLimit(String(7 * 24 * 3600)))
    await guardedConsult('a', session, 'answer').catch(() => {})
    const start = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(start + MAX_PROVIDER_COOLDOWN_MS + 1000)
    await expect(guardedConsult('a', session, 'answer')).resolves.toEqual(ok)
  })

  it('limits AI calls per client without affecting other clients', async () => {
    for (let i = 0; i < AI_CALLS_PER_CLIENT; i++) await guardedConsult('busy', session, 'answer')
    await expect(guardedConsult('busy', session, 'answer')).rejects.toBeInstanceOf(AIReviewCooldownError)
    await expect(guardedConsult('quiet', session, 'answer')).resolves.toEqual(ok)
    expect(consult).toHaveBeenCalledTimes(AI_CALLS_PER_CLIENT + 1)
  })
})

const answers = { business: 'We run a salon', pain: 'Customers struggle to book or pay', current: 'WhatsApp and spreadsheets', workflow: 'Customer books online then pays', users: 'Customers on a website', constraints: 'No existing systems or special requirements', priority: 'Launch as soon as practical' }
const send = async (body: unknown, ip: string) => {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }))
  return { status: response.status, data: await response.json() }
}

describe('discovery route abuse protection', () => {
  it('does not call the AI again when an older token is replayed during the cooldown', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(consult).mockRejectedValueOnce(providerLimit('3600'))
    const start = (await send({ action: 'start', mode: 'guided' }, '192.0.2.50')).data
    const failed = await send({ action: 'review_answers', token: start.token, revision: start.session.revision, answers }, '192.0.2.50')
    expect(failed.status).toBe(429)

    // The attack: resend the pre-failure token, which has no cooldown inside it.
    const replay = await send({ action: 'review_answers', token: start.token, revision: start.session.revision, answers }, '192.0.2.50')
    expect(replay.status).toBe(429)
    expect(replay.data.aiReview).toMatchObject({ status: 'failed', reason: 'rate_limit' })
    expect(replay.data.aiReview.retryAt).toBeGreaterThan(Date.now() + 3_500_000)
    // The customer's answers are still saved in the returned token.
    expect(replay.data.session.answers).toEqual(answers)
    expect(consult).toHaveBeenCalledTimes(1)
  })

  it('a flood of fake addresses no longer locks out genuine visitors', async () => {
    for (let i = 0; i < 1000; i++) await send({ action: 'start', mode: 'manual' }, `10.0.${i >> 8}.${i & 255}`)
    const visitor = await send({ action: 'start', mode: 'manual' }, '203.0.113.7')
    expect(visitor.status).toBe(200)
  })

  it('a spoofed first x-forwarded-for entry does not escape the per-client limit', async () => {
    for (let i = 0; i < 60; i++) await send({ action: 'start', mode: 'manual' }, `6.6.${i}.1, 198.51.100.77`)
    const blocked = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': '7.7.7.7, 198.51.100.77' }, body: JSON.stringify({ action: 'start', mode: 'manual' }) }))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })
})
