import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', () => ({ consult: vi.fn() }))
import { consult } from '../utils/discoveryAgent.server'
import { POST } from '../app/api/discovery/route'
import { emptyScope } from '../utils/solutionCatalog'

async function send(body: unknown) {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', body: JSON.stringify(body) }))
  return { status: response.status, data: await response.json() }
}
beforeEach(() => { vi.mocked(consult).mockReset() })
describe('discovery API', () => {
  it('confirms unchanged planning defaults without selecting optional work', async () => {
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    const confirmed = await send({ action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.scope).toEqual({ ...emptyScope(), surfaceIds: ['website'] })
    expect(confirmed.data.session.allowPartial).toBe(false)
  })
  it('allows undecided payment and customer-system defaults only as explicitly unpriced partial work', async () => {
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    const body = { action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], integrationIds: ['existing_crm', 'external_api'] } }
    expect((await send(body)).status).toBe(400)
    const partial = await send({ ...body, allowPartial: true })
    expect(partial.status).toBe(200)
    expect(partial.data.session.scope.capabilityIds).toEqual(['payments'])
    expect(partial.data.session.scope.billing).toBe('undecided')
    expect(partial.data.session.scope.crmProvider).toBe('undecided')
    expect(partial.data.session.allowPartial).toBe(true)
    expect(partial.data.reviewItems).toHaveLength(3)
    const included = partial.data.result.work.map((item: { id: string }) => item.id)
    for (const id of ['payments', 'payments:website', 'recurring_billing', 'existing_crm', 'external_api']) expect(included).not.toContain(id)
    const restored = await send({ action: 'restore', token: partial.data.token })
    expect(restored.data.result).toEqual(partial.data.result)
    expect(restored.data.reviewItems).toEqual(partial.data.reviewItems)
    const review = (await send({ action: 'review', token: restored.data.token, revision: restored.data.session.revision })).data
    const complete = await send({ action: 'confirm', token: review.token, revision: review.session.revision, confirmed: true, scope: { ...review.session.scope, billing: 'one_time', crmProvider: 'hubspot', integrationIds: ['existing_crm'] } })
    expect(complete.status).toBe(200)
    expect(complete.data.reviewItems).toEqual([])
    expect(complete.data.session.allowPartial).toBe(false)
    expect(complete.data.result.work.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining(['payments', 'payments:website', 'existing_crm']))
  })
  it('does not allow partial consent to bypass invalid dependencies or forged values', async () => {
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    const body = { action: 'confirm', token: manual.token, revision: 0, confirmed: true, allowPartial: true }
    for (const scope of [emptyScope(), null, { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['crm'] }, { ...emptyScope(), surfaceIds: ['website'], billing: ['one_time'] }]) {
      expect((await send({ ...body, scope })).status).toBe(400)
    }
  })
  it('starts without a provider call and returns a server-owned next question', async () => {
    const { status, data } = await send({ action: 'start', mode: 'guided' })
    expect(status).toBe(200)
    expect(data.question.id).toBe('business')
    expect(data.result).toBeNull()
    expect(consult).not.toHaveBeenCalled()
  })
  it('saves the answer and continues safely when the provider fails', async () => {
    vi.mocked(consult).mockRejectedValue(new Error('provider down'))
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const answer = await send({ action: 'answer', token: start.token, revision: 0, answer: 'We run a shop' })
    expect(answer.status).toBe(200)
    expect(answer.data.session.facts.business.value).toBe('We run a shop')
    expect(answer.data.question.id).toBe('pain')
    expect(answer.data.session.providerStatus).toBe('guided_fallback')
  })
  it('replays a failed transport request from the same snapshot without accumulating answers', async () => {
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const body = { action: 'answer', token: start.token, revision: 0, answer: 'We run a shop' }
    const first = await send(body)
    const retry = await send(body)
    expect(first.status).toBe(200)
    expect(retry.status).toBe(200)
    expect(retry.data.session).toEqual(first.data.session)
    expect(retry.data.session.revision).toBe(1)
    expect(retry.data.session.turns).toBe(1)
    expect(retry.data.session.messages.filter((message: { role: string }) => message.role === 'user')).toHaveLength(1)
    expect(retry.data.question.id).toBe('pain')
  })
  it('reviews a successful multi-topic AI extraction before pricing confirmed recommendations', async () => {
    const facts = [
      { field: 'business' as const, value: 'We run a studio', evidence: 'We run a studio' },
      { field: 'pain' as const, value: 'Leads get lost', evidence: 'Leads get lost' },
      { field: 'current' as const, value: 'We use spreadsheets', evidence: 'We use spreadsheets' },
      { field: 'workflow' as const, value: 'Capture and assign enquiries in a CRM', evidence: 'Capture and assign enquiries in a CRM' },
      { field: 'users' as const, value: 'Customers need a website and staff need a portal', evidence: 'Customers need a website and staff need a portal' },
      { field: 'constraints' as const, value: 'No existing systems or special requirements', evidence: 'No existing systems or special requirements' },
      { field: 'priority' as const, value: 'Start small', evidence: 'Start small' },
    ]
    vi.mocked(consult).mockResolvedValue({ acknowledgment: 'We can shape a small first release.', facts, recommendations: [
      { group: 'surfaceIds', id: 'website', reason: 'Capture customer enquiries', evidence: 'Customers need a website' },
      { group: 'surfaceIds', id: 'portal', reason: 'Give staff a shared workspace', evidence: 'staff need a portal' },
      { group: 'capabilityIds', id: 'crm', reason: 'Assign and follow up on enquiries', evidence: 'Capture and assign enquiries in a CRM' },
    ], reviewItems: [] })
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const review = (await send({ action: 'answer', token: start.token, revision: 0, answer: facts.map(fact => fact.evidence).join('. ') })).data
    expect(review.session.stage).toBe('review')
    expect(review.question).toBeNull()
    expect(review.result).toBeNull()
    expect(review.reviewItems).toEqual([])
    expect(review.session.scope.surfaceIds).toEqual(['website', 'portal'])
    const confirmed = await send({ action: 'confirm', token: review.token, revision: review.session.revision, confirmed: true, scope: review.session.scope })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.allowPartial).toBe(false)
    expect(confirmed.data.result.work.filter((item: { id: string }) => item.id === 'crm')).toHaveLength(1)
  })
  it('requires review and explicit confirmation before pricing', async () => {
    const guided = (await send({ action: 'start', mode: 'guided' })).data
    const blocked = await send({ action: 'confirm', token: guided.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(blocked.status).toBe(400)
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    const unapproved = await send({ action: 'confirm', token: manual.token, revision: 0, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(unapproved.status).toBe(400)
    const confirmed = await send({ action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website', 'portal', 'mobile'], capabilityIds: ['crm', 'seo'] }, rate: 0 })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.result.hourlyRate).toBe(240)
    expect(confirmed.data.session.stage).toBe('confirmed')
  })
  it('blocks a complete estimate for unanswered discovery, permits only explicit partial scope', async () => {
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const review = (await send({ action: 'review', token: start.token, revision: 0 })).data
    const body = { action: 'confirm', token: review.token, revision: 1, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } }
    expect((await send(body)).status).toBe(400)
    const partial = await send({ ...body, allowPartial: true })
    expect(partial.status).toBe(200)
    expect(partial.data.session.allowPartial).toBe(true)
    expect(partial.data.reviewItems).not.toHaveLength(0)
  })
  it('rejects null, unknown IDs, missing follow-ups, stale revisions and tampering', async () => {
    expect((await send(null)).status).toBe(400)
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    const base = { action: 'confirm', token: manual.token, revision: 0, confirmed: true }
    expect((await send({ ...base, scope: { ...emptyScope(), surfaceIds: ['constructor'] } })).status).toBe(400)
    expect((await send({ ...base, scope: { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] } })).status).toBe(400)
    expect((await send({ ...base, revision: 9 })).status).toBe(400)
    expect((await send({ action: 'restore', token: 'forged' })).status).toBe(400)
  })
  it('uses the public request host behind a proxy and rejects foreign or malformed origins', async () => {
    const make = (origin: string) => new Request('http://internal-server/api/discovery', { method: 'POST', headers: { host: '127.0.0.1:3000', origin }, body: JSON.stringify({ action: 'start', mode: 'manual' }) })
    expect((await POST(make('http://127.0.0.1:3000'))).status).toBe(200)
    expect((await POST(make('https://unrelated.example'))).status).toBe(403)
    expect((await POST(make('null'))).status).toBe(403)
  })
  it('identifies rejected sessions separately from other validation errors', async () => {
    const invalid = await send({ action: 'restore', token: 'forged' })
    expect(invalid.status).toBe(400)
    expect(invalid.data.code).toBe('DISCOVERY_SESSION_INVALID')
    expect((await send({ action: 'start', mode: 'wrong' })).data.code).toBeUndefined()
  })
  it('reports missing production session configuration as unavailable, not an invalid customer draft', async () => {
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISCOVERY_SESSION_SECRET', '')
    try {
      const restored = await send({ action: 'restore', token: manual.token })
      expect(restored.status).toBe(503)
      expect(restored.data.code).toBeUndefined()
    } finally { vi.unstubAllEnvs() }
  })
})
