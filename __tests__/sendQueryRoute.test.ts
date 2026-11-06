import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send } } }))
import { POST } from '../app/api/send-query/route'
import { CONTACT_MESSAGE_MAX } from '../utils/contactLimits'

let client = 0
async function send(body: unknown) {
  client++
  vi.stubEnv('CONTACT_EMAIL', 'team@example.test')
  vi.stubEnv('RESEND_API_KEY', 'synthetic-key')
  return POST(new Request('http://localhost/api/send-query', { method: 'POST', headers: { 'x-forwarded-for': `203.0.113.${client}` }, body: JSON.stringify(body) }))
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
const valid = { name: 'Asha', email: 'asha@example.test', phone: '+91 9876543210', message: 'Please review this fictional project.' }
describe('proposal contact boundary', () => {
  it('sends callback requests with the full summary and escaped optional time', async () => {
    mocks.send.mockResolvedValue({ error: null })
    expect((await send({ ...valid, intent: 'callback', preferredTime: '<Friday> 3pm IST' })).status).toBe(200)
    expect(mocks.send.mock.calls[0][0].subject).toBe('Team call requested by Asha')
    expect(mocks.send.mock.calls[0][0].html).toContain('&lt;Friday&gt; 3pm IST')
    expect(mocks.send.mock.calls[0][0].html).toContain(valid.message)
  })
  it('accepts an unspecified callback time but rejects invalid handoff fields before sending', async () => {
    mocks.send.mockResolvedValue({ error: null })
    expect((await send({ ...valid, intent: 'callback' })).status).toBe(200)
    expect(mocks.send.mock.calls[0][0].html).toContain('Please contact the customer to agree a time')
    mocks.send.mockClear()
    for (const fields of [{ intent: 'booked' }, { intent: null }, { intent: {} }, { intent: [] }, { intent: 'callback', preferredTime: 4 }, { intent: 'callback', preferredTime: 'x'.repeat(201) }]) {
      expect((await send({ ...valid, ...fields })).status).toBe(400)
    }
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('accepts long discovery summaries, escapes content and keeps a validated reply address', async () => {
    mocks.send.mockResolvedValue({ error: null })
    const response = await send({ ...valid, message: `${'<script>unsafe</script>'}${'x'.repeat(14000)}` })
    expect(response.status).toBe(200)
    expect(mocks.send.mock.calls[0][0].html).toContain('&lt;script&gt;')
    expect(mocks.send.mock.calls[0][0].replyTo).toBe(valid.email)
  })
  it('rejects null, empty, wrong types, oversized fields and malformed email before sending', async () => {
    for (const body of [null, {}, { ...valid, name: 5 }, { ...valid, email: 'invalid' }, { ...valid, message: 'x'.repeat(CONTACT_MESSAGE_MAX + 1) }]) {
      expect((await send(body)).status).toBe(400)
    }
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('accepts the exact message boundary and reports provider failure honestly', async () => {
    mocks.send.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { name: 'provider-test-error' } })
    expect((await send({ ...valid, message: 'x'.repeat(CONTACT_MESSAGE_MAX) })).status).toBe(200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await send(valid)).status).toBe(502)
    vi.restoreAllMocks()
  })

  it('refuses other websites without sending', async () => {
    vi.stubEnv('CONTACT_EMAIL', 'team@example.test')
    vi.stubEnv('RESEND_API_KEY', 'synthetic-key')
    const response = await POST(new Request('http://localhost/api/send-query', { method: 'POST', headers: { host: 'localhost', origin: 'https://evil.example', 'x-forwarded-for': '198.51.100.200' }, body: JSON.stringify(valid) }))
    expect(response.status).toBe(403)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('limits each address to 5 messages per window, even with a spoofed first forwarded address', async () => {
    vi.stubEnv('CONTACT_EMAIL', 'team@example.test')
    vi.stubEnv('RESEND_API_KEY', 'synthetic-key')
    mocks.send.mockResolvedValue({ error: null })
    const post = (spoofed: number) => POST(new Request('http://localhost/api/send-query', { method: 'POST', headers: { 'x-forwarded-for': `6.6.6.${spoofed}, 198.51.100.201` }, body: JSON.stringify(valid) }))
    for (let i = 0; i < 5; i++) expect((await post(i)).status).toBe(200)
    const limited = await post(99)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(mocks.send).toHaveBeenCalledTimes(5)
  })
})

