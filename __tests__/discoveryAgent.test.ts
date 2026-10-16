import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), constructor: vi.fn() }))
vi.mock('groq-sdk', () => ({ default: class { chat = { completions: { create: mocks.create } }; constructor(options: unknown) { mocks.constructor(options) } } }))
import { consult } from '../utils/discoveryAgent.server'
import { createDiscovery, recordAnswer } from '../utils/discovery'
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
describe('structured provider boundary', () => {
  it('uses strict structured output, bounded generation and validated evidence', async () => {
    vi.stubEnv('GROQ_API_KEY', 'synthetic-test-key')
    vi.stubEnv('DISCOVERY_AI_ENABLED', 'true')
    mocks.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ acknowledgment: 'Thanks for the context.', facts: [], recommendations: [], reviewItems: [] }) } }] })
    await consult(recordAnswer(createDiscovery('guided'), 'A fictional shop'), 'A fictional shop')
    expect(mocks.constructor).toHaveBeenCalledWith({ apiKey: 'synthetic-test-key', timeout: 18000, maxRetries: 0 })
    expect(mocks.create.mock.calls[0][0].response_format.json_schema.strict).toBe(true)
    expect(mocks.create.mock.calls[0][0].max_completion_tokens).toBe(1800)
  })
  it('does not call a provider when fallback is explicitly enabled', async () => {
    vi.stubEnv('DISCOVERY_AI_ENABLED', 'false')
    expect(await consult(createDiscovery('guided'), 'x')).toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('rejects malformed or evidence-free output', async () => {
    vi.stubEnv('GROQ_API_KEY', 'synthetic-test-key')
    vi.stubEnv('DISCOVERY_AI_ENABLED', 'true')
    mocks.create.mockResolvedValue({ choices: [{ message: { content: 'broken json' } }] })
    await expect(consult(createDiscovery('guided'), 'x')).rejects.toThrow()
    mocks.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ acknowledgment: 'Saved', facts: [{ field: 'business', value: 'bank', evidence: 'bank' }], recommendations: [], reviewItems: [] }) } }] })
    await expect(consult(createDiscovery('guided'), 'x')).rejects.toThrow(/evidence/)
  })
})
