import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', () => ({ consult: vi.fn() }))
import { consult } from '../utils/discoveryAgent.server'
import { POST } from '../app/api/discovery/route'
import { emptyScope } from '../utils/solutionCatalog'
import { createDiscovery, DiscoveryValidationError, recordAnswer } from '../utils/discovery'
import { sealSession } from '../utils/discoverySession.server'

let testClient = 0
async function send(body: unknown) {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': `192.0.2.${testClient}` }, body: JSON.stringify(body) }))
  return { status: response.status, requestId: response.headers.get('X-Discovery-Request-Id'), data: await response.json() }
}
// Legacy snapshots remain readable during the rollout. Exercise their original
// contract with explicit signed legacy fixtures; batch tests use the real start response.
async function legacySend(body: unknown) {
  const result = await send(body)
  if (body && typeof body === 'object' && 'action' in body && body.action === 'start' && result.data.session?.mode === 'guided') {
    delete result.data.session.reviewMode
    result.data.token = sealSession(result.data.session)
  }
  return result
}
beforeEach(() => { testClient++; vi.mocked(consult).mockReset().mockResolvedValue({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] }) })
describe('discovery API', () => {
  it('keeps the failed question pending, enforces cooldown and advances only after a successful retry', async () => {
    const started = Date.now()
    vi.mocked(consult).mockRejectedValueOnce(Object.assign(new Error('rate limit'), { status: 429, headers: new Headers({ 'retry-after': '14' }) }))
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const failed = (await legacySend({ action: 'answer', token: start.token, revision: 0, answer: 'A fictional shop' })).data
    expect(failed.question.id).toBe('business')
    expect(failed.session.pendingAIReview).toEqual({ field: 'business', action: 'answer' })
    expect(failed.aiReview.retryAt).toBeGreaterThanOrEqual(started + 14000)
    const body = { token: failed.token, revision: failed.session.revision }
    for (const action of ['answer', 'edit', 'review', 'confirm']) expect((await legacySend({ ...body, action, answer: 'Do not advance' })).status).toBe(409)
    expect((await legacySend({ ...body, action: 'retry_ai', scope: emptyScope() })).status).toBe(429)
    expect(consult).toHaveBeenCalledTimes(1)
    const restored = await legacySend({ action: 'restore', token: failed.token })
    expect(restored.data.question.id).toBe('pain')
    expect(restored.data.session.reviewMode).toBe('batch')
    expect(restored.data.session.aiReviewFailureDetails).toBeUndefined()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(failed.aiReview.retryAt + 1)
    try {
      vi.mocked(consult).mockResolvedValueOnce({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] })
      const retried = await legacySend({ ...body, action: 'retry_ai', scope: emptyScope() })
      expect(retried.status).toBe(200)
      expect(retried.data.question.id).toBe('pain')
      expect(retried.data.session.pendingAIReview).toBeUndefined()
      expect(retried.data.session.answers.business).toBe('A fictional shop')
      expect(retried.data.session.turns).toBe(1)
    } finally { clock.mockRestore() }
  })
  it('keeps the last question pending across another failure and releases review only after success', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Paperwork', 'Notes', 'Track orders', 'Staff', 'No constraints']) session = recordAnswer(session, answer)
    vi.mocked(consult).mockRejectedValueOnce(new Error('provider down')).mockRejectedValueOnce(new Error('still down'))
    const failed = await legacySend({ action: 'answer', token: sealSession(session), revision: session.revision, answer: 'Start small' })
    expect(failed.data.session.stage).toBe('discovery')
    expect(failed.data.question.id).toBe('priority')
    const retried = await legacySend({ action: 'retry_ai', token: failed.data.token, revision: failed.data.session.revision, scope: emptyScope() })
    expect(retried.status).toBe(502)
    expect(retried.data.question.id).toBe('priority')
    expect(retried.data.session.turns).toBe(7)
    const success = await legacySend({ action: 'retry_ai', token: retried.data.token, revision: retried.data.session.revision, scope: emptyScope() })
    expect(success.status).toBe(200)
    expect(success.data.session.stage).toBe('review')
    expect(success.data.question).toBeNull()
    expect(success.data.session.turns).toBe(7)
  })
  it.each([
    [429, 'rate_limit', Object.assign(new Error('private'), { status: 429 })],
    [504, 'timeout', Object.assign(new Error('private'), { name: 'APIConnectionTimeoutError' })],
    [502, 'invalid_response', new DiscoveryValidationError('private evidence')],
    [503, 'authentication', Object.assign(new Error('private'), { status: 401 })],
    [502, 'output_limit', Object.assign(new Error('private'), { status: 400, error: { error: { code: 'json_validate_failed', message: 'max completion tokens reached before generating a valid document', failed_generation: 'private customer answer' } } })],
  ])('reports AI failure as HTTP %i with a traceable preserved answer', async (status, reason, failure) => {
    vi.mocked(consult).mockRejectedValue(failure)
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const result = await legacySend({ action: 'answer', token: start.token, revision: 0, answer: 'A fictional shop' })
    expect(result.status).toBe(status)
    expect(result.data.code).toBe('DISCOVERY_AI_REVIEW_FAILED')
    expect(result.data.aiReview).toMatchObject({ status: 'failed', reason, requestId: expect.any(String) })
    expect(result.requestId).toBe(result.data.aiReview.requestId)
    expect(result.data.session.aiReviewFailureReference).toBe(result.requestId)
    if (reason === 'output_limit') expect(result.data.aiReview).toMatchObject({ upstreamStatus: 400, providerCode: 'json_validate_failed' })
    expect(result.data.session.answers.business).toBe('A fictional shop')
    const restored = await legacySend({ action: 'restore', token: result.data.token })
    expect(restored.status).toBe(200)
    expect(restored.data.aiReview.status).toBe('not_requested')
    expect(restored.data.session.answers.business).toBe('A fictional shop')
    expect(restored.data.session.aiReviewFailureReference).toBeUndefined()
    expect(restored.data.session.reviewMode).toBe('batch')
    expect(JSON.stringify(result.data)).not.toContain('private')
  })
  it('preserves a correction and locally selected work when AI fails during edit', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Manual work', 'Paper notes', 'Organise tasks', 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['booking'] }
    vi.mocked(consult).mockRejectedValue(Object.assign(new Error('private provider error'), { status: 403 }))
    const result = await legacySend({ action: 'edit', token: sealSession(session), revision: session.revision, field: 'business', value: 'A furniture shop', scope })
    expect(result.status).toBe(503)
    expect(result.data.session.answers.business).toBe('A furniture shop')
    expect(result.data.session.scope).toEqual(scope)
    expect(result.data.aiReview.reason).toBe('authentication')
  })
  it('retries saved requirements without replacing customer choices or adding answers', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Lost enquiries', 'WhatsApp', 'Track customers and follow-ups', 'Staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const scope = { ...emptyScope(), surfaceIds: ['website'] }
    vi.mocked(consult).mockResolvedValueOnce({ acknowledgment: 'Reviewed saved answers.', facts: [], recommendations: [], reviewItems: [] })
    const retried = await legacySend({ action: 'retry_ai', token: sealSession(session), revision: session.revision, scope })
    expect(retried.status).toBe(200)
    expect(retried.data.session.providerStatus).toBe('available')
    expect(retried.data.session.scope).toEqual(scope)
    expect(retried.data.session.answers).toEqual(session.answers)
    expect(retried.data.session.turns).toBe(session.turns)
    expect(retried.data.session.revision).toBe(session.revision + 1)
    vi.mocked(consult).mockRejectedValueOnce(Object.assign(new Error('sensitive provider detail'), { status: 429 }))
    const failed = await legacySend({ action: 'retry_ai', token: retried.data.token, revision: retried.data.session.revision, scope })
    expect(failed.status).toBe(429)
    expect(failed.data.session.aiReviewFailure).toBe('rate_limit')
    expect(JSON.stringify(failed.data)).not.toContain('sensitive provider detail')
    expect(failed.data.session.scope).toEqual(scope)
  })
  it('rejects AI retry without saved guided requirements or with invalid choices', async () => {
    for (const mode of ['guided', 'manual'] as const) {
      const start = (await legacySend({ action: 'start', mode })).data
      expect((await legacySend({ action: 'retry_ai', token: start.token, revision: 0, scope: null })).status).toBe(400)
    }
    expect(consult).not.toHaveBeenCalled()
  })
  it('keeps evidence-backed AI tracking selected in answer and restore responses', async () => {
    const text = 'Our staff will use the dashboard to track customers and follow-ups.'
    vi.mocked(consult).mockResolvedValue({ acknowledgment: 'Organise customer follow-ups.', facts: [], recommendations: [{ group: 'capabilityIds', id: 'crm', reason: 'Track customers.', evidence: text }], reviewItems: [] })
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const answered = (await legacySend({ action: 'answer', token: start.token, revision: 0, answer: text })).data
    expect(answered.session.scope.capabilityIds).toContain('crm')
    const restored = (await legacySend({ action: 'restore', token: answered.token })).data
    expect(restored.session.scope.capabilityIds).toContain('crm')
    expect(restored.session.answers.business).toBe(text)
  })
  it('logs only a safe failure category and HTTP status, then clears status after recovery', async () => {
    const warning = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.mocked(consult).mockRejectedValueOnce(Object.assign(new Error('private provider body and customer text'), { status: 429 }))
      const start = (await legacySend({ action: 'start', mode: 'guided' })).data
      const failed = (await legacySend({ action: 'answer', token: start.token, revision: 0, answer: 'A fictional shop' })).data
      expect(failed.session.providerStatus).toBe('guided_fallback')
      expect(warning).toHaveBeenCalledWith('[discovery] AI review failed', expect.objectContaining({ reason: 'rate_limit', upstreamStatus: 429, requestId: expect.any(String) }))
      expect(JSON.stringify(warning.mock.calls)).not.toContain('private provider')
      vi.mocked(consult).mockResolvedValueOnce({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] })
      const recovered = (await legacySend({ action: 'retry_ai', token: failed.token, revision: 1, scope: emptyScope() })).data
      expect(recovered.session.providerStatus).toBe('available')
      expect(recovered.session.answers.business).toBe('A fictional shop')
      expect(recovered.session.answers.pain).toBeUndefined()
      expect(recovered.session.turns).toBe(1)
    } finally { warning.mockRestore() }
  })
  it('cleans legacy outage warnings on restore and allows a complete estimate', async () => {
    const session = createDiscovery('manual')
    session.reviewItems = ['AI scope mapping was unavailable. Please request a team review.']
    const restored = await legacySend({ action: 'restore', token: sealSession(session) })
    expect(restored.data.reviewItems).toEqual([])
    expect(restored.data.session.reviewItems).toEqual([])
    const confirmed = await legacySend({ action: 'confirm', token: restored.data.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.allowPartial).toBe(false)
  })
  it('keeps a validated local feature draft when correcting completed requirements', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Paperwork', 'Paper notes', 'Organise tasks', 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const token = sealSession(session)
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['reports'] }
    const edited = await legacySend({ action: 'edit', token, revision: session.revision, field: 'business', value: 'A furniture workshop', scope })
    expect(edited.status).toBe(200)
    expect(edited.data.session.stage).toBe('review')
    expect(edited.data.session.scope).toEqual(scope)
    expect(edited.data.session.answers.business).toBe('A furniture workshop')
    expect(edited.data.result).toBeNull()
    for (const invalid of [null, { ...scope, capabilityIds: ['toString'] }, { ...scope, surfaceIds: 'website' }]) {
      expect((await legacySend({ action: 'edit', token, revision: session.revision, field: 'business', value: 'A workshop', scope: invalid })).status).toBe(400)
    }
  })
  it('does not reselect an AI suggestion the customer has unchecked during a requirement edit', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Paperwork', 'Paper notes', 'Record enquiries and follow up', 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const recommendation = { group: 'capabilityIds' as const, id: 'crm', reason: 'Track enquiries', evidence: 'Record enquiries and follow up' }
    session.recommendations = [recommendation]
    session.scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['crm'] }
    vi.mocked(consult).mockResolvedValue({ acknowledgment: 'Saved', facts: [], recommendations: [recommendation], reviewItems: [] })
    const edited = await legacySend({ action: 'edit', token: sealSession(session), revision: session.revision, field: 'priority', value: 'Start small with reporting', scope: { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['reports'] } })
    expect(edited.status).toBe(200)
    expect(edited.data.session.scope.capabilityIds).toEqual(['reports'])
    // Keep the suggestion separate from selections so a later edit can also
    // recognise this explicit deselection rather than resurrecting it.
    expect(edited.data.session.recommendations.some((item: { id: string }) => item.id === 'crm')).toBe(true)
  })
  it('keeps an interface added during planning unless the edited requirement newly withdraws it', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Paperwork', 'Paper notes', 'Organise tasks', 'Our staff need a browser workspace only', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const scope = { ...emptyScope(), surfaceIds: ['portal', 'website'] }
    const body = { action: 'edit', token: sealSession(session), revision: session.revision, scope }
    const unrelated = await legacySend({ ...body, field: 'priority', value: 'Start small with reports' })
    expect(unrelated.status).toBe(200)
    expect(unrelated.data.session.scope.surfaceIds).toEqual(expect.arrayContaining(['portal', 'website']))
    const withdrawn = await legacySend({ ...body, field: 'users', value: 'We need a browser workspace and do not want a website' })
    expect(withdrawn.status).toBe(200)
    expect(withdrawn.data.session.scope.surfaceIds).toEqual(['portal'])
  })
  it('does not require partial consent solely because an AI attempt failed', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Paperwork', 'Paper notes', 'Organise tasks', 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    const token = sealSession(session)
    expect(session.providerStatus).toBe('guided_fallback')
    const confirmed = await legacySend({ action: 'confirm', token, revision: session.revision, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.reviewItems).toEqual([])
    expect(confirmed.data.session.allowPartial).toBe(false)
  })
  it('confirms unchanged planning defaults without selecting optional work', async () => {
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    const confirmed = await legacySend({ action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.scope).toEqual({ ...emptyScope(), surfaceIds: ['website'] })
    expect(confirmed.data.session.allowPartial).toBe(false)
  })
  it('requires a payment type while allowing unresolved external connections only as partial work', async () => {
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    const body = { action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], integrationIds: ['existing_crm', 'external_api'] } }
    expect((await legacySend(body)).status).toBe(400)
    expect((await legacySend({ ...body, allowPartial: true })).status).toBe(400)
    const partial = await legacySend({ ...body, scope: { ...body.scope, billing: 'one_time' }, allowPartial: true })
    expect(partial.status).toBe(200)
    expect(partial.data.session.scope.capabilityIds).toEqual(['payments'])
    expect(partial.data.session.scope.billing).toBe('one_time')
    expect(partial.data.session.scope.crmProvider).toBe('undecided')
    expect(partial.data.session.allowPartial).toBe(true)
    expect(partial.data.reviewItems).toHaveLength(2)
    const included = partial.data.result.work.map((item: { id: string }) => item.id)
    expect(included).toEqual(expect.arrayContaining(['payments', 'payments:website']))
    for (const id of ['recurring_billing', 'existing_crm', 'external_api']) expect(included).not.toContain(id)
    const restored = await legacySend({ action: 'restore', token: partial.data.token })
    expect(restored.data.result).toEqual(partial.data.result)
    expect(restored.data.reviewItems).toEqual(partial.data.reviewItems)
    const review = (await legacySend({ action: 'review', token: restored.data.token, revision: restored.data.session.revision })).data
    const complete = await legacySend({ action: 'confirm', token: review.token, revision: review.session.revision, confirmed: true, scope: { ...review.session.scope, billing: 'one_time', crmProvider: 'hubspot', integrationIds: ['existing_crm'] } })
    expect(complete.status).toBe(200)
    expect(complete.data.reviewItems).toEqual([])
    expect(complete.data.session.allowPartial).toBe(false)
    expect(complete.data.result.work.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining(['payments', 'payments:website', 'existing_crm']))
  })
  it('does not allow partial consent to bypass invalid dependencies or forged values', async () => {
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    const body = { action: 'confirm', token: manual.token, revision: 0, confirmed: true, allowPartial: true }
    for (const scope of [emptyScope(), null, { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['crm'] }, { ...emptyScope(), surfaceIds: ['website'], billing: ['one_time'] }]) {
      expect((await legacySend({ ...body, scope })).status).toBe(400)
    }
  })
  it('starts without a provider call and returns a server-owned next question', async () => {
    const { status, data } = await legacySend({ action: 'start', mode: 'guided' })
    expect(status).toBe(200)
    expect(data.question.id).toBe('business')
    expect(data.result).toBeNull()
    expect(consult).not.toHaveBeenCalled()
  })
  it('saves the answer without advancing when the provider fails', async () => {
    vi.mocked(consult).mockRejectedValue(new Error('provider down'))
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const answer = await legacySend({ action: 'answer', token: start.token, revision: 0, answer: 'We run a shop' })
    expect(answer.status).toBe(502)
    expect(answer.data.session.facts.business.value).toBe('We run a shop')
    expect(answer.data.question.id).toBe('business')
    expect(answer.data.session.providerStatus).toBe('guided_fallback')
  })
  it('replays a failed transport request from the same snapshot without accumulating answers', async () => {
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const body = { action: 'answer', token: start.token, revision: 0, answer: 'We run a shop' }
    const first = await legacySend(body)
    const retry = await legacySend(body)
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
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const review = (await legacySend({ action: 'answer', token: start.token, revision: 0, answer: facts.map(fact => fact.evidence).join('. ') })).data
    expect(review.session.stage).toBe('review')
    expect(review.question).toBeNull()
    expect(review.result).toBeNull()
    expect(review.reviewItems).toEqual([])
    expect(review.session.scope.surfaceIds).toEqual(['website', 'portal'])
    const confirmed = await legacySend({ action: 'confirm', token: review.token, revision: review.session.revision, confirmed: true, scope: review.session.scope })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.allowPartial).toBe(false)
    expect(confirmed.data.result.work.filter((item: { id: string }) => item.id === 'crm')).toHaveLength(1)
  })
  it('requires review and explicit confirmation before pricing', async () => {
    const guided = (await legacySend({ action: 'start', mode: 'guided' })).data
    const blocked = await legacySend({ action: 'confirm', token: guided.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(blocked.status).toBe(400)
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    const unapproved = await legacySend({ action: 'confirm', token: manual.token, revision: 0, scope: { ...emptyScope(), surfaceIds: ['website'] } })
    expect(unapproved.status).toBe(400)
    const confirmed = await legacySend({ action: 'confirm', token: manual.token, revision: 0, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website', 'portal', 'mobile'], capabilityIds: ['crm', 'seo'] }, rate: 0 })
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.result.hourlyRate).toBe(240)
    expect(confirmed.data.session.stage).toBe('confirmed')
  })
  it('blocks a complete estimate for unanswered discovery, permits only explicit partial scope', async () => {
    const start = (await legacySend({ action: 'start', mode: 'guided' })).data
    const review = (await legacySend({ action: 'review', token: start.token, revision: 0 })).data
    const body = { action: 'confirm', token: review.token, revision: 1, confirmed: true, scope: { ...emptyScope(), surfaceIds: ['website'] } }
    expect((await legacySend(body)).status).toBe(400)
    const partial = await legacySend({ ...body, allowPartial: true })
    expect(partial.status).toBe(200)
    expect(partial.data.session.allowPartial).toBe(true)
    expect(partial.data.reviewItems).not.toHaveLength(0)
  })
  it('rejects null, unknown IDs, missing follow-ups, stale revisions and tampering', async () => {
    expect((await legacySend(null)).status).toBe(400)
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    const base = { action: 'confirm', token: manual.token, revision: 0, confirmed: true }
    expect((await legacySend({ ...base, scope: { ...emptyScope(), surfaceIds: ['constructor'] } })).status).toBe(400)
    expect((await legacySend({ ...base, scope: { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] } })).status).toBe(400)
    expect((await legacySend({ ...base, revision: 9 })).status).toBe(400)
    expect((await legacySend({ action: 'restore', token: 'forged' })).status).toBe(400)
  })
  it('uses the public request host behind a proxy and rejects foreign or malformed origins', async () => {
    const make = (origin: string) => new Request('http://internal-server/api/discovery', { method: 'POST', headers: { host: '127.0.0.1:3000', origin }, body: JSON.stringify({ action: 'start', mode: 'manual' }) })
    expect((await POST(make('http://127.0.0.1:3000'))).status).toBe(200)
    expect((await POST(make('https://unrelated.example'))).status).toBe(403)
    expect((await POST(make('null'))).status).toBe(403)
  })
  it('identifies rejected sessions separately from other validation errors', async () => {
    const invalid = await legacySend({ action: 'restore', token: 'forged' })
    expect(invalid.status).toBe(400)
    expect(invalid.data.code).toBe('DISCOVERY_SESSION_INVALID')
    expect((await legacySend({ action: 'start', mode: 'wrong' })).data.code).toBeUndefined()
  })
  it('reports missing production session configuration as unavailable, not an invalid customer draft', async () => {
    const manual = (await legacySend({ action: 'start', mode: 'manual' })).data
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DISCOVERY_SESSION_SECRET', '')
    try {
      const restored = await legacySend({ action: 'restore', token: manual.token })
      expect(restored.status).toBe(503)
      expect(restored.data.code).toBeUndefined()
    } finally { vi.unstubAllEnvs() }
  })
})
