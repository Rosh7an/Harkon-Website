// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../utils/discoveryAgent.server', async original => ({ ...(await original<object>()), consult: vi.fn() }))
import { consult } from '../utils/discoveryAgent.server'
import { resetAIGuard } from '../utils/discoveryAIGuard.server'
import { POST } from '../app/api/discovery/route'
import { emptyScope } from '../utils/solutionCatalog'
import { asksFormChoice, createDiscovery, validateAgentOutput } from '../utils/discovery'
import { sealSession } from '../utils/discoverySession.server'
import { DISCOVERY_OUTPUT_SCHEMA } from '../utils/discoveryAgent.server'

const answers = { business: 'A salon in Kochi', pain: 'Customers struggle to book or pay', current: 'WhatsApp and spreadsheets', workflow: 'Customers book a slot on the website and pay online', users: 'Customers on a website', constraints: 'No existing systems or special requirements', priority: 'Launch as soon as practical' }
let client = 0
async function send(body: unknown) {
  const response = await POST(new Request('http://localhost/api/discovery', { method: 'POST', headers: { 'x-forwarded-for': `192.0.2.${100 + client}` }, body: JSON.stringify(body) }))
  return { status: response.status, data: await response.json() }
}
beforeEach(() => { resetAIGuard(); client++ })

describe('review items the customer already answered in the form', () => {
  it('does not keep asking about one-time vs recurring payments after the customer chooses', async () => {
    vi.mocked(consult).mockResolvedValue({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [
      { text: 'Confirm whether payments will be one-time or recurring subscriptions.', evidence: 'struggle to book or pay' },
    ] })
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const reviewed = (await send({ action: 'review_answers', token: start.token, revision: start.session.revision, answers })).data
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['booking', 'payments'], billing: 'one_time' }
    const confirmed = await send({ action: 'confirm', token: reviewed.token, revision: reviewed.session.revision, confirmed: true, scope })
    expect(confirmed.data.error).toBeUndefined()
    expect(confirmed.status).toBe(200)
    expect(confirmed.data.session.allowPartial).toBe(false)
    expect(confirmed.data.reviewItems).toEqual([])
  })

  it('still requires a choice, via the form item, while billing is undecided', async () => {
    vi.mocked(consult).mockResolvedValue({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] })
    const start = (await send({ action: 'start', mode: 'guided' })).data
    const reviewed = (await send({ action: 'review_answers', token: start.token, revision: start.session.revision, answers })).data
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['booking', 'payments'] }
    const blocked = await send({ action: 'confirm', token: reviewed.token, revision: reviewed.session.revision, confirmed: true, scope })
    expect(blocked.status).toBe(400)
  })

  it('cleans sessions saved before this fix when they are restored', async () => {
    const session = { ...createDiscovery('guided'), stage: 'review' as const, providerStatus: 'available' as const, reviewMode: 'batch' as const,
      reviewItems: ['Confirm whether payments will be one-time or recurring subscriptions.', 'Existing appointment history may need migration.'] }
    const restored = (await send({ action: 'restore', token: sealSession(session) })).data
    expect(restored.session.reviewItems).toEqual(['Existing appointment history may need migration.'])
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], billing: 'recurring' }
    const confirmed = await send({ action: 'confirm', token: restored.token, revision: restored.session.revision, confirmed: true, scope, allowPartial: true })
    expect(confirmed.status).toBe(200)
    // The fake session has no answers, so "still needs confirmation" items appear too.
    expect(confirmed.data.reviewItems).toContain('Existing appointment history may need migration.')
    expect(confirmed.data.reviewItems.some((item: string) => /one-time|recurring/i.test(item))).toBe(false)
  })
})

describe('validateAgentOutput review item topics', () => {
  const output = (reviewItems: unknown[]) => ({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems })
  const answer = 'Customers struggle to book or pay and we use HubSpot today'
  it('drops items tagged as form choices, whatever their wording', () => {
    const result = validateAgentOutput(output([
      { text: 'Clarify how customers will be charged.', evidence: 'struggle to book or pay', topic: 'billing_choice' },
      { text: 'Confirm the customer system.', evidence: 'HubSpot', topic: 'crm_provider_choice' },
      { text: 'Discuss deposit rules for no-shows.', evidence: 'struggle to book', topic: 'other' },
    ]), answer)
    expect(result.reviewItems.map(item => item.text)).toEqual(['Discuss deposit rules for no-shows.'])
  })
  it('accepts items without a topic and rejects an unknown topic', () => {
    expect(validateAgentOutput(output([{ text: 'Discuss deposits.', evidence: 'struggle to book' }]), answer).reviewItems).toHaveLength(1)
    expect(() => validateAgentOutput(output([{ text: 'Discuss deposits.', evidence: 'struggle to book', topic: 'pricing' }]), answer)).toThrow(/topic/)
  })
  it('asks the provider to tag every review item', () => {
    const items = (DISCOVERY_OUTPUT_SCHEMA.properties as Record<string, { items: { properties: Record<string, unknown>; required: string[] } }>).reviewItems.items
    expect(items.required).toContain('topic')
    expect(items.properties.topic).toEqual({ type: 'string', enum: ['billing_choice', 'crm_provider_choice', 'other'] })
  })
})

describe('asksFormChoice', () => {
  it.each([
    'Confirm whether payments will be one-time or recurring subscriptions.',
    'Clarify one-off payments vs monthly subscriptions.',
    'Decide the billing model before estimating.',
    'Which CRM do you currently use?',
    'Confirm the CRM provider.',
    'Is it HubSpot, Salesforce or Zoho?',
  ])('treats "%s" as a question the form already asks', text => expect(asksFormChoice(text)).toBe(true))
  it.each([
    'Recurring subscriptions need a refund and cancellation policy.',
    'Confirm accepted payment methods such as UPI and cards.',
    'One-time setup fee versus recurring maintenance needs team review.',
    'Migrate existing HubSpot and Salesforce contacts.',
    'Sync HubSpot deals with bookings.',
    'Data migration needs human scoping.',
    '',
  ])('keeps "%s" for team review', text => expect(asksFormChoice(text)).toBe(false))
})

