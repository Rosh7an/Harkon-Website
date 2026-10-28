import { describe, expect, it, vi } from 'vitest'
import { applyAgentOutput, createDiscovery, editFact, manualReviewItems, nextQuestion, recordAnswer, validateAgentOutput } from '../utils/discovery'
import { openSession, sealSession } from '../utils/discoverySession.server'

describe('bounded discovery', () => {
  it('combines evidence-backed facts for the same topic from one answer', () => {
    const answer = 'Staff need individual logins. Only managers can see monthly sales reports.'
    const output = validateAgentOutput({ acknowledgment: 'Staff access and reporting.', facts: [
      { field: 'users', value: 'Staff need individual logins', evidence: 'Staff need individual logins' },
      { field: 'users', value: 'Managers have report access', evidence: 'Only managers can see monthly sales reports' },
    ], recommendations: [], excludedCapabilities: [], reviewItems: [] }, answer)
    expect(output.facts).toHaveLength(1)
    expect(output.facts[0].value).toContain('Staff need individual logins')
    expect(output.facts[0].value).toContain('Managers have report access')
    expect(answer).toContain(output.facts[0].evidence)
    expect(() => validateAgentOutput({ ...output, facts: [{ field: 'users', value: 'An invented role', evidence: 'not in the answer' }] }, answer)).toThrow(/evidence/)
  })
  it('does not infer SEO, staff accounts, reports or AI from a public brochure website alone', () => {
    const answer = 'We need a website showing our services and contact details.'
    const reviewed = applyAgentOutput(recordAnswer(createDiscovery('guided'), answer), { acknowledgment: 'Public business information.', facts: [], recommendations: [], reviewItems: [] })
    expect(reviewed.scope.surfaceIds).toEqual(['website'])
    expect(reviewed.scope.capabilityIds).toEqual([])
  })
  it('maps SEO, staff accounts, reports and AI suggestions without adding unrelated capabilities', () => {
    const answer = 'We need a website people can find on Google. Staff need secure logins and monthly sales reports. We want an AI assistant to draft customer replies.'
    const recommendations = [
      { group: 'surfaceIds', id: 'website', evidence: 'We need a website', reason: 'Publish services.' },
      { group: 'surfaceIds', id: 'admin', evidence: 'Staff need secure logins', reason: 'Staff workspace.' },
      ...['seo', 'accounts', 'reports', 'ai'].map(id => ({ group: 'capabilityIds', id, evidence: answer, reason: 'Meet the stated business requirement.' })),
    ]
    const session = recordAnswer(createDiscovery('guided'), answer)
    const reviewed = applyAgentOutput(session, validateAgentOutput({ acknowledgment: 'Reviewed.', facts: [], recommendations, reviewItems: [] }, answer))
    expect(reviewed.scope.capabilityIds.sort()).toEqual(['accounts', 'ai', 'reports', 'seo'])
    expect(reviewed.scope.surfaceIds).toEqual(expect.arrayContaining(['website', 'admin']))
    const later = recordAnswer(reviewed, 'Launch as soon as practical.')
    expect(applyAgentOutput(later, { acknowledgment: 'Saved.', facts: [], recommendations: [], reviewItems: [] }).scope.capabilityIds.sort()).toEqual(['accounts', 'ai', 'reports', 'seo'])
  })
  it('removes an earlier AI SEO suggestion when the customer explicitly postpones it', () => {
    const answer = 'We need a website with search visibility.'
    let session = recordAnswer(createDiscovery('guided'), answer)
    session = applyAgentOutput(session, validateAgentOutput({ acknowledgment: 'Reviewed.', facts: [], recommendations: [{ group: 'capabilityIds', id: 'seo', reason: 'Search visibility.', evidence: answer }], reviewItems: [] }, answer))
    const correction = 'We do not need SEO in the first release.'
    session = recordAnswer(session, correction)
    const output = validateAgentOutput({ acknowledgment: 'SEO is postponed.', facts: [], recommendations: [], excludedCapabilities: [{ id: 'seo', evidence: correction }], reviewItems: [] }, correction, [answer])
    const reviewed = applyAgentOutput(session, output)
    expect(reviewed.scope.capabilityIds).not.toContain('seo')
    expect(reviewed.recommendations.some(item => item.id === 'seo')).toBe(false)
    const later = recordAnswer(reviewed, 'Our staff will use the system.')
    expect(applyAgentOutput(later, { acknowledgment: 'Saved.', facts: [], recommendations: [], reviewItems: [] }).scope.capabilityIds).not.toContain('seo')
    expect(() => validateAgentOutput({ ...output, excludedCapabilities: [{ id: 'seo', evidence: 'invented refusal' }] }, correction)).toThrow(/evidence/)
    expect(() => validateAgentOutput({ ...output, excludedCapabilities: [{ id: 'unknown', evidence: correction }] }, correction)).toThrow()
  })
  it('keeps a model-understood tracking refusal across unrelated answers and permits a later request', () => {
    const original = 'We need to track customers and follow-ups.'
    let session = recordAnswer(createDiscovery('guided'), original)
    const refusal = 'കസ്റ്റമർ ട്രാക്കിംഗ് ആദ്യ ഘട്ടത്തിൽ വേണ്ട.'
    session = recordAnswer(session, refusal)
    session = applyAgentOutput(session, validateAgentOutput({ acknowledgment: 'Tracking is postponed.', facts: [], recommendations: [], excludedCapabilities: [{ id: 'crm', evidence: refusal }], reviewItems: [] }, refusal))
    expect(session.scope.capabilityIds).not.toContain('crm')
    session = recordAnswer(session, 'WhatsApp and spreadsheets')
    expect(session.scope.capabilityIds).not.toContain('crm')
    const request = 'Actually we need customer tracking in this release.'
    session = recordAnswer(session, request)
    session = applyAgentOutput(session, validateAgentOutput({ acknowledgment: 'Tracking is included.', facts: [], recommendations: [{ group: 'capabilityIds', id: 'crm', reason: 'Requested for this release.', evidence: request }], excludedCapabilities: [], reviewItems: [] }, request))
    expect(session.scope.capabilityIds).toContain('crm')
  })
  it('excludes legacy AI outage notices without removing unresolved requirements', () => {
    const session = createDiscovery('manual')
    session.reviewItems = ['AI scope mapping was unavailable. Please request a team review.', 'Confirm the external tool connection.']
    expect(manualReviewItems(session)).toEqual(['Confirm the external tool connection.'])
    const recovered = applyAgentOutput(session, { acknowledgment: 'Reviewed successfully.', facts: [], recommendations: [], reviewItems: [] })
    expect(recovered.providerStatus).toBe('available')
    expect(recovered.reviewItems).toEqual(['Confirm the external tool connection.'])
    expect(manualReviewItems(createDiscovery('manual'))).toEqual([])
  })
  it('keeps website and mobile requests even if AI suggests only a website', () => {
    const answer = 'I think I need a website and mobile app for my customers.'
    const session = recordAnswer(createDiscovery('guided'), answer)
    const output = validateAgentOutput({ acknowledgment: 'Saved', facts: [{ field: 'users', value: 'Customers need a website', evidence: 'website' }], recommendations: [{ group: 'surfaceIds', id: 'website', reason: 'Reach customers', evidence: 'website' }], reviewItems: [] }, answer)
    const mapped = applyAgentOutput(session, output)
    expect(mapped.scope.surfaceIds).toEqual(['website', 'mobile'])
    expect(mapped.allowPartial).toBe(false)
    expect(mapped.stage).not.toBe('confirmed')
    const later = recordAnswer(mapped, 'Bookings get lost.')
    expect(applyAgentOutput(later, { acknowledgment: 'Saved', facts: [], recommendations: [], reviewItems: [] }).scope.surfaceIds).toEqual(['website', 'mobile'])
    const declined = recordAnswer(mapped, 'We do not need a website after all.')
    expect(declined.scope.surfaceIds).toEqual(['mobile'])
  })
  it('maps explicit surfaces even when the AI provider is unavailable', () => {
    const session = recordAnswer(createDiscovery('guided'), 'We want a website and a mobile application.')
    expect(session.scope.surfaceIds).toEqual(['website', 'mobile'])
    expect(session.providerStatus).toBe('guided_fallback')
  })
  it('does not turn negated, existing, or uncertain apps into selected requirements', () => {
    for (const answer of ['We need a website, not a mobile app.', 'We need a website but do not need a mobile app.', 'We already have a mobile app. We need a website.']) {
      expect(recordAnswer(createDiscovery('guided'), answer).scope.surfaceIds).toEqual(['website'])
    }
    const undecided = recordAnswer(createDiscovery('guided'), 'Do I need a mobile app?')
    expect(undecided.scope.surfaceIds).toEqual([])
    expect(manualReviewItems(undecided).join()).toMatch(/mobile app.*discussion/i)
    expect(manualReviewItems(recordAnswer(createDiscovery('guided'), 'Why do I need a mobile app?')).join()).toMatch(/mobile app.*discussion/i)
  })
  it('honours a later withdrawal and an edited platform answer', () => {
    let session = recordAnswer(createDiscovery('guided'), 'We need a website and mobile app.')
    session = recordAnswer(session, 'We do not need a mobile app after all.')
    expect(session.scope.surfaceIds).toEqual(['website'])
    session = editFact(session, 'business', 'We need only a website.')
    expect(session.scope.surfaceIds).toEqual(['website'])
    expect(session.stage).toBe('discovery')
  })
  it('accepts a plain multi-platform answer to the platform question', () => {
    let session = createDiscovery('guided')
    for (const answer of ['A studio', 'Lost bookings', 'Spreadsheets', 'Customers should book']) session = recordAnswer(session, answer)
    session = recordAnswer(session, 'Website and mobile app for my customers')
    expect(session.scope.surfaceIds).toEqual(['website', 'mobile'])
  })
  it('treats a later website-only answer as a change, not an additive app request', () => {
    let session = createDiscovery('guided')
    for (const answer of ['We need a website and mobile app.', 'Lost bookings', 'Spreadsheets', 'Customers should book']) session = recordAnswer(session, answer)
    session = recordAnswer(session, 'We only need a website')
    expect(session.scope.surfaceIds).toEqual(['website'])
  })
  it('extracts several evidence-backed answers and skips questions already answered', () => {
    let session = recordAnswer(createDiscovery('guided'), 'We run a studio. Leads get lost. We use WhatsApp.')
    const output = validateAgentOutput({ acknowledgment: 'Let’s make follow-up easier.', facts: [{ field: 'pain', value: 'Leads get lost', evidence: 'Leads get lost' }, { field: 'current', value: 'WhatsApp', evidence: 'We use WhatsApp' }], recommendations: [], reviewItems: [] }, 'We run a studio. Leads get lost. We use WhatsApp.')
    session = applyAgentOutput(session, output)
    expect(nextQuestion(session)?.id).toBe('workflow')
    expect(session.facts.pain?.source).toBe('ai')
    expect(session.stage).toBe('discovery')
  })
  it('accepts uncertainty without presenting it as confirmed or repeating forever', () => {
    let session = createDiscovery('guided')
    for (let index = 0; index < 7; index++) session = recordAnswer(session, 'I’m not sure yet')
    expect(session.stage).toBe('review')
    expect(nextQuestion(session)).toBeNull()
    expect(manualReviewItems(session)).toHaveLength(4)
    expect(() => recordAnswer(session, 'one more')).toThrow(/review/)
  })
  it('rejects empty, null, oversized and unsupported model facts', () => {
    expect(() => recordAnswer(createDiscovery('guided'), '')).toThrow()
    expect(() => recordAnswer(createDiscovery('guided'), null)).toThrow()
    expect(() => recordAnswer(createDiscovery('guided'), 'a'.repeat(2001))).toThrow()
    expect(() => validateAgentOutput({ acknowledgment: 'Hello', facts: [{ field: 'pain', value: 'Millions lost', evidence: 'Millions lost' }], recommendations: [], reviewItems: [] }, 'Hello')).toThrow(/evidence/)
    expect(() => validateAgentOutput({ acknowledgment: 'Hello', facts: [], recommendations: [{ group: 'surfaceIds', id: 'constructor', reason: 'x', evidence: 'x' }], reviewItems: [] }, 'x')).toThrow(/unknown/)
  })
  it('retains evidence-backed recommendations and ignores unsupported recommendation evidence', () => {
    const session = recordAnswer(createDiscovery('guided'), 'We need a website')
    const output = validateAgentOutput({ acknowledgment: 'Saved', facts: [], recommendations: [{ group: 'surfaceIds', id: 'website', reason: 'Reach customers', evidence: 'website' }, { group: 'surfaceIds', id: 'mobile', reason: 'No evidence', evidence: 'app requested' }], reviewItems: [] }, 'We need a website')
    expect(applyAgentOutput(session, output).recommendations.map(item => item.id)).toEqual(['website'])
  })
  it('invalidates confirmation, recommendations and the previous scope on correction', () => {
    const session = { ...createDiscovery('guided'), stage: 'confirmed' as const }
    const corrected = editFact(session, 'pain', 'Follow-up is now handled; booking is the issue.')
    expect(corrected.stage).toBe('review')
    expect(corrected.scope.surfaceIds).toEqual([])
    expect(corrected.facts.pain?.source).toBe('edit')
    expect(() => editFact(session, 'toString', 'x')).toThrow(/Unknown/)
  })
  it('detects scope needing human review', () => {
    const session = recordAnswer(createDiscovery('guided'), 'We need HIPAA compliance and legacy data migration')
    expect(manualReviewItems(session).join()).toMatch(/human scoping/)
  })
})
describe('encrypted discovery sessions', () => {
  it('fails closed in production without a sufficiently long dedicated secret', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      for (const secret of ['', 'short']) {
        vi.stubEnv('DISCOVERY_SESSION_SECRET', secret)
        expect(() => sealSession(createDiscovery('guided'))).toThrow(/configuration/)
      }
      vi.stubEnv('DISCOVERY_SESSION_SECRET', 'synthetic-test-secret-with-at-least-32-characters')
      const session = createDiscovery('guided')
      expect(openSession(sealSession(session))).toEqual(session)
    } finally { vi.unstubAllEnvs() }
  })
  it('round-trips state without putting readable business answers in the token', () => {
    const session = recordAnswer(createDiscovery('guided'), 'Private business details')
    const token = sealSession(session)
    expect(openSession(token)).toEqual(session)
    expect(Buffer.from(token, 'base64url').toString()).not.toContain('Private business')
  })
  it('rejects tampering, null and expired sessions', () => {
    const token = sealSession(createDiscovery('guided'))
    const bytes = Buffer.from(token, 'base64url')
    bytes[30] ^= 1
    expect(() => openSession(bytes.toString('base64url'))).toThrow(/invalid/)
    expect(() => openSession(null)).toThrow()
    expect(() => openSession(token, Date.now() + 25 * 60 * 60 * 1000)).toThrow(/expired/)
  })
  it('can resume all maximum-length multilingual answers', () => {
    let session = createDiscovery('guided')
    for (let index = 0; index < 7; index++) session = recordAnswer(session, 'അ'.repeat(2000))
    const token = sealSession(session)
    expect(token.length).toBeLessThan(400000)
    expect(openSession(token).facts.priority?.value).toHaveLength(2000)
  })
})
