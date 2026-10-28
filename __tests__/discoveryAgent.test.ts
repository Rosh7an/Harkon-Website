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
    expect(mocks.create.mock.calls[0][0].max_completion_tokens).toBe(4096)
  })
  it('does not call a provider when fallback is explicitly enabled', async () => {
    vi.stubEnv('DISCOVERY_AI_ENABLED', 'false')
    expect(await consult(createDiscovery('guided'), 'x')).toBeNull()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('provides feature compatibility and customer intent guidance for every capability', async () => {
    vi.stubEnv('GROQ_API_KEY', 'synthetic-test-key')
    vi.stubEnv('DISCOVERY_AI_ENABLED', 'true')
    mocks.create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] }) } }] })
    await consult(recordAnswer(createDiscovery('guided'), 'Staff need secure access and monthly sales summaries.'), 'Staff need secure access and monthly sales summaries.')
    const messages = mocks.create.mock.calls[0][0].messages
    const policy = messages.filter((message: { role: string }) => message.role === 'system').map((message: { content: string }) => message.content).join('\n')
    for (const id of ['crm', 'seo', 'accounts', 'booking', 'payments', 'reports', 'ai']) expect(policy).toContain(`"${id}"`)
    expect(policy).toContain('compatibleSurfaceIds')
    expect(policy).toContain('search visibility')
    expect(policy).toContain('staff sign-in')
    expect(policy).toContain('operational summaries')
    expect(policy).toContain('do not select the ai capability merely because this planner uses AI')
    expect(policy).toContain('Malayalam')
    expect(policy).toContain('Our team will then use an internal CRM')
    expect(policy).toContain('The word internal does not prove that a CRM already exists')
    expect(policy).toContain('We will use our existing CRM')
    expect(JSON.parse(messages.at(-1).content).originalAnswers[0].text).toContain('monthly sales summaries')
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
