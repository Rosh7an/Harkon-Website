import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', () => ({ consult: vi.fn() }))
import { consult } from '../utils/discoveryAgent.server'
import { POST } from '../app/api/discovery/route'
import { emptyScope } from '../utils/solutionCatalog'
const answers = { business: 'A shop', pain: 'Lost enquiries', current: 'Spreadsheets', workflow: 'Track enquiries', users: 'Staff', constraints: 'Not sure', priority: 'Start small' }
let client = 0
async function send(body: unknown) {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': `198.51.100.${client}` }, body: JSON.stringify(body) }))
  return { status: response.status, data: await response.json() }
}
beforeEach(() => { client++; vi.mocked(consult).mockReset().mockResolvedValue({ acknowledgment: 'Reviewed all answers.', facts: [], recommendations: [], reviewItems: [] }) })
describe('one AI review for all seven answers', () => {
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
})
