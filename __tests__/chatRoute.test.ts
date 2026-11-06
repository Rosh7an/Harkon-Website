// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => {
  // The route reads its key at import time.
  process.env.GROQ_API_KEY = 'synthetic-test-key'
  return { create: vi.fn() }
})
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: mocks.create } } } }))
import { POST } from '../app/api/chat/route'

const history = [{ role: 'user', content: 'Hello' }]
const chat = (ip: string, headers: Record<string, string> = {}, body: unknown = { history }) =>
  POST(new Request('http://localhost/api/chat', { method: 'POST', headers: { 'x-forwarded-for': ip, ...headers }, body: JSON.stringify(body) }))

describe('chat API protection', () => {
  it('answers a valid same-site request', async () => {
    mocks.create.mockResolvedValueOnce({ choices: [{ message: { content: 'Hi' } }] })
    const response = await chat('192.0.2.1', { host: 'localhost', origin: 'http://localhost' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ result: 'Hi' })
  })

  it('refuses other websites before any AI call', async () => {
    mocks.create.mockClear()
    const response = await chat('192.0.2.2', { host: 'localhost', origin: 'https://evil.example' })
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects empty or invalid history without an AI call', async () => {
    mocks.create.mockClear()
    expect((await chat('192.0.2.3', {}, { history: [] })).status).toBe(400)
    expect((await chat('192.0.2.3', {}, {})).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('caps each address at 20 requests per window', async () => {
    mocks.create.mockReset().mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })
    for (let i = 0; i < 20; i++) expect((await chat('192.0.2.4')).status).toBe(200)
    const limited = await chat('192.0.2.4')
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(mocks.create).toHaveBeenCalledTimes(20)
    expect((await chat('192.0.2.5')).status).toBe(200)
  })
})
