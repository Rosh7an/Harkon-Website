import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDiscovery, nextQuestion, recordAnswer } from '../utils/discovery'
import { requestDiscovery, RejectedSession } from '../utils/discoveryRequest'

function view() {
  const session = recordAnswer(createDiscovery('guided', 1900000000000), 'A small studio')
  return { token: 'next-token', session, question: nextQuestion(session), reviewItems: [], result: null }
}
const ok = (data: unknown) => ({ ok: true, json: async () => data })
afterEach(() => vi.unstubAllGlobals())

describe('discovery transport', () => {
  it('retries a network failure with an identical token, revision and answer snapshot', async () => {
    const data = view()
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValueOnce(ok(data))
    vi.stubGlobal('fetch', fetcher)
    const payload = { action: 'answer', token: 'previous-token', revision: 0, answer: 'A small studio' }
    const pending = requestDiscovery(payload, new AbortController().signal)
    payload.answer = 'Later edit'
    expect(await pending).toEqual(data)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls.map(call => JSON.parse(call[1].body))).toEqual([
      { ...payload, answer: 'A small studio' }, { ...payload, answer: 'A small studio' },
    ])
  })
  it.each([502, 503, 504])('retries transient HTTP %i once', async status => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'Unavailable' }) }).mockResolvedValueOnce(ok(view()))
    vi.stubGlobal('fetch', fetcher)
    await expect(requestDiscovery({}, new AbortController().signal)).resolves.toEqual(view())
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('limits repeated network failures and gives an actionable error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Load failed'))
    vi.stubGlobal('fetch', fetcher)
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toThrow('Your current input is still here')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('retries when the connection drops while reading the response body', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => { throw new TypeError('Load failed') } }).mockResolvedValueOnce(ok(view()))
    vi.stubGlobal('fetch', fetcher)
    await expect(requestDiscovery({}, new AbortController().signal)).resolves.toEqual(view())
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([{ mode: ['guided'] }, { stage: 'unknown' }, { version: 999 }, { catalogVersion: 'old' }, { providerStatus: ['available'] }, { revision: -1 }, { messages: null }, { recommendations: null }])('rejects invalid session fields: %j', async fields => {
    const data = view()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...data, session: { ...data.session, ...fields } })))
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toThrow('invalid response')
  })
  it.each([400, 403, 413, 429])('does not retry HTTP %i validation or rate-limit errors', async status => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ error: 'Please pause' }) })
    vi.stubGlobal('fetch', fetcher)
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toThrow('Please pause')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('preserves the rejected-session signal for existing draft recovery', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ code: 'DISCOVERY_SESSION_INVALID', error: 'Expired' }) }))
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toBeInstanceOf(RejectedSession)
  })
  it.each([null, {}, { session: null }, { ...view(), token: '' }, { ...view(), session: { ...view().session, scope: null } }, { ...view(), question: null }, { ...view(), session: { ...view().session, facts: { business: null } } }, { ...view(), session: { ...view().session, stage: 'confirmed' }, question: null }])('rejects incomplete or inconsistent successful payloads: %j', async data => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(data)))
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toThrow('invalid response')
  })
  it('handles non-JSON errors without exposing a JSON parser exception', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError('Unexpected <') } }))
    await expect(requestDiscovery({}, new AbortController().signal)).rejects.toThrow('temporarily unavailable')
  })
  it('never retries an aborted request', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn().mockImplementation(async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError') })
    vi.stubGlobal('fetch', fetcher)
    await expect(requestDiscovery({}, controller.signal)).rejects.toThrow('Aborted')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
