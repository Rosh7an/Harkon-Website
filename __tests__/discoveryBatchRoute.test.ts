import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', () => ({ consult: vi.fn() }))
import { resetAIGuard } from '../utils/discoveryAIGuard.server'
import { consult } from '../utils/discoveryAgent.server'
import { POST } from '../app/api/discovery/route'
import { emptyScope } from '../utils/solutionCatalog'
const answers = { business: 'A shop', pain: 'Lost enquiries', current: 'Spreadsheets', workflow: 'Track enquiries', users: 'Staff', constraints: 'Not sure', priority: 'Start small' }
let client = 0
async function send(body: unknown) {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': `198.51.100.${client}` }, body: JSON.stringify(body) }))
  return { status: response.status, data: await response.json() }
}
beforeEach(() => { resetAIGuard(); client++; vi.mocked(consult).mockReset().mockResolvedValue({ acknowledgment: 'Reviewed all answers.', facts: [], recommendations: [], reviewItems: [] }) })
describe('one AI review for all seven answers', () => {
  it('saves corrections without AI, restores them, blocks stale confirmation and reviews the whole batch once', async () => {
    let view = (await send({ action: 'start', mode: 'guided' })).data
    view = (await send({ action: 'review_answers', token: view.token, revision: 0, answers })).data
    vi.mocked(consult).mockClear()
    const corrected = { ...answers, workflow: 'Staff track customers and follow-ups', users: 'Five staff' }
    for (const field of ['workflow', 'users'] as const) {
      const saved = await send({ action: 'edit', token: view.token, revision: view.session.revision, field, value: corrected[field], scope: view.session.scope })
      expect(saved.status).toBe(200)
      expect(saved.data.aiReview.status).toBe('not_requested')
      view = saved.data
    }
    expect(consult).not.toHaveBeenCalled()
    view = (await send({ action: 'restore', token: view.token })).data
    expect(view.session.requirementsDirty).toBe(true)
    expect(view.session.answers).toEqual(corrected)
    for (const action of ['confirm', 'retry_ai']) expect((await send({ action, token: view.token, revision: view.session.revision, confirmed: true, scope: emptyScope() })).status).toBe(400)
    expect(consult).not.toHaveBeenCalled()
    const reviewed = await send({ action: 'review_answers', token: view.token, revision: view.session.revision, answers: corrected, scope: view.session.scope })
    expect(reviewed.status).toBe(200)
    expect(reviewed.data.session.requirementsDirty).toBe(false)
    expect(consult).toHaveBeenCalledTimes(1)
    expect(vi.mocked(consult).mock.calls[0][0].answers).toEqual(corrected)
  })
  it.each(['', 'x'.repeat(2001)])('rejects invalid corrections without an AI call', async value => {
    let view = (await send({ action: 'start', mode: 'guided' })).data
    view = (await send({ action: 'review_answers', token: view.token, revision: 0, answers })).data
    vi.mocked(consult).mockClear()
    expect((await send({ action: 'edit', token: view.token, revision: view.session.revision, field: 'workflow', value })).status).toBe(400)
    expect(consult).not.toHaveBeenCalled()
  })
  it('preserves corrected answers when the final review fails and retries the batch once', async () => {
    let view = (await send({ action: 'start', mode: 'guided' })).data
    view = (await send({ action: 'review_answers', token: view.token, revision: 0, answers })).data
    view = (await send({ action: 'edit', token: view.token, revision: view.session.revision, field: 'workflow', value: 'x'.repeat(2000) })).data
    vi.mocked(consult).mockClear().mockRejectedValueOnce({ status: 503 })
    const failed = await send({ action: 'review_answers', token: view.token, revision: view.session.revision, answers: view.session.answers })
    expect(failed.status).toBe(502)
    expect(failed.data.session.answers.workflow).toBe('x'.repeat(2000))
    expect((await send({ action: 'confirm', token: failed.data.token, revision: failed.data.session.revision, confirmed: true })).status).toBe(409)
    expect(consult).toHaveBeenCalledTimes(1)
    const retried = await send({ action: 'retry_ai', token: failed.data.token, revision: failed.data.session.revision, scope: failed.data.session.scope })
    expect(retried.status).toBe(200)
    expect(retried.data.session.requirementsDirty).toBe(false)
    expect(vi.mocked(consult).mock.calls[1][0].answers?.workflow).toBe('x'.repeat(2000))
    expect(consult).toHaveBeenCalledTimes(2)
  })
  it('starts in batch mode and submits all requirements in exactly one AI call', async () => {
    const start = (await send({ action: 'start', mode: 'guided' })).data
    expect(start.session.reviewMode).toBe('batch')
    expect(consult).not.toHaveBeenCalled()
    const result = await send({ action: 'review_answers', token: start.token, revision: 0, answers })
    expect(result.status).toBe(200)
    expect(result.data.session.stage).toBe('review')
    expect(result.data.session.answers).toEqual(answers)
    expect(consult).toHaveBeenCalledTimes(1)
    expect(vi.mocked(consult).mock.calls[0][0].answers).toEqual(answers)
    expect(result.data.session.revision).toBe(1)
  })
  it.each([null, {}, { ...answers, business: '' }, { ...answers, pain: 4 }, { ...answers, malicious: 'x' }, { ...answers, workflow: 'x'.repeat(2001) }])('rejects incomplete or malformed input without spending AI calls: %j', async value => {
    const start = (await send({ action: 'start', mode: 'guided' })).data
    expect((await send({ action: 'review_answers', token: start.token, revision: 0, answers: value })).status).toBe(400)
    expect(consult).not.toHaveBeenCalled()
  })
  it('defers AI for old clients sending individual answers and prevents premature confirmation/retry', async () => {
    let view = (await send({ action: 'start', mode: 'guided' })).data
    for (const answer of Object.values(answers).slice(0, 6)) view = (await send({ action: 'answer', token: view.token, revision: view.session.revision, answer })).data
    expect(consult).not.toHaveBeenCalled()
    for (const action of ['review', 'confirm', 'retry_ai']) expect((await send({ action, token: view.token, revision: view.session.revision, scope: emptyScope(), confirmed: true })).status).toBe(400)
    const reviewed = await send({ action: 'answer', token: view.token, revision: view.session.revision, answer: answers.priority })
    expect(reviewed.status).toBe(200)
    expect(consult).toHaveBeenCalledTimes(1)
  })
  it('preserves the full failed submission and retries only after the provider deadline', async () => {
    const start = (await send({ action: 'start', mode: 'guided' })).data
    vi.mocked(consult).mockRejectedValueOnce(Object.assign(new Error('private'), { status: 429, headers: new Headers({ 'retry-after': '14' }) }))
    const failed = await send({ action: 'review_answers', token: start.token, revision: 0, answers })
    expect(failed.status).toBe(429)
    expect(failed.data.session.answers).toEqual(answers)
    const body = { token: failed.data.token, revision: failed.data.session.revision, scope: emptyScope() }
    expect((await send({ ...body, action: 'retry_ai' })).status).toBe(429)
    expect((await send({ ...body, action: 'review_answers', answers })).status).toBe(409)
    expect(consult).toHaveBeenCalledTimes(1)
    expect((await send({ action: 'restore', token: failed.data.token })).data.session.answers).toEqual(answers)
    const clock = vi.spyOn(Date, 'now').mockReturnValue(failed.data.aiReview.retryAt + 1)
    try {
      const retried = await send({ ...body, action: 'retry_ai' })
      expect(retried.status).toBe(200)
      expect(retried.data.session.stage).toBe('review')
      expect(retried.data.session.turns).toBe(7)
      expect(consult).toHaveBeenCalledTimes(2)
    } finally { clock.mockRestore() }
  })
  it('rejects batch submission from manual and confirmed sessions', async () => {
    const manual = (await send({ action: 'start', mode: 'manual' })).data
    expect((await send({ action: 'review_answers', token: manual.token, revision: 0, answers })).status).toBe(400)
    expect(consult).not.toHaveBeenCalled()
  })
  it('keeps the customer on the review screen when re-reviewing edited answers fails, and keeps their chosen features on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let view = (await send({ action: 'start', mode: 'guided' })).data
    view = (await send({ action: 'review_answers', token: view.token, revision: 0, answers })).data
    expect(view.session.stage).toBe('review')
    const chosen = { ...emptyScope(), surfaceIds: ['portal'], capabilityIds: ['crm'] }
    const edited = { ...answers, business: 'Two shops' }
    view = (await send({ action: 'edit', token: view.token, revision: view.session.revision, field: 'business', value: edited.business, scope: chosen })).data
    expect(view.session.requirementsDirty).toBe(true)

    vi.mocked(consult).mockRejectedValueOnce(Object.assign(new Error('private'), { status: 500 }))
    const failed = await send({ action: 'review_answers', token: view.token, revision: view.session.revision, answers: edited, scope: chosen })
    expect(failed.status).toBe(502)
    expect(failed.data.session.stage).toBe('review')
    expect(failed.data.question).toBeNull()
    expect(failed.data.session.pendingAIReview).toBeUndefined()
    expect(failed.data.session.answers).toEqual(edited)
    expect((await send({ action: 'confirm', token: failed.data.token, revision: failed.data.session.revision, confirmed: true, scope: chosen })).status).toBe(409)

    const retried = await send({ action: 'retry_ai', token: failed.data.token, revision: failed.data.session.revision, scope: chosen })
    expect(retried.status).toBe(200)
    expect(retried.data.session.stage).toBe('review')
    expect(retried.data.session.scope.capabilityIds).toEqual(['crm'])
    expect(vi.mocked(consult).mock.calls.at(-1)![0].answers).toEqual(edited)
    vi.restoreAllMocks()
  })
})

