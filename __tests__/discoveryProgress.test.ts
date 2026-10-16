import { describe, expect, it } from 'vitest'
import { createDiscovery, recordAnswer } from '../utils/discovery'
import { emptyScope, type SolutionScope } from '../utils/solutionCatalog'
import { discoveryProgress, scopeProgress, REVIEW_FIELDS } from '../utils/discoveryProgress'

const allReviewed = Object.fromEntries(REVIEW_FIELDS.map(field => [field, true]))
describe('field-based workflow progress', () => {
  it('starts both approaches at zero, even when manual starts in review', () => {
    expect(discoveryProgress(null).percent).toBe(0)
    for (const mode of ['guided', 'manual'] as const) expect(discoveryProgress(createDiscovery(mode)).percent).toBe(0)
  })
  it('counts a choice group once rather than rewarding larger purchases', () => {
    const scope = { ...emptyScope(), surfaceIds: ['website'] as SolutionScope['surfaceIds'] }
    expect(scopeProgress(scope, { surfaceIds: true })).toBe(20)
    scope.surfaceIds.push('mobile', 'portal')
    expect(scopeProgress(scope, { surfaceIds: true })).toBe(20)
    expect(scopeProgress(emptyScope(), { surfaceIds: true })).toBe(0)
  })
  it('does not count default assumptions, prechecked suggestions or unchecked extras', () => {
    expect(scopeProgress({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['seo'] })).toBe(0)
    expect(scopeProgress(emptyScope())).toBe(0)
    expect(scopeProgress(emptyScope(), { capabilityIds: true })).toBe(20)
  })
  it('allows unchanged defaults and unknown follow-ups to be explicitly reviewed', () => {
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], integrationIds: ['existing_crm'] }
    expect(scopeProgress(scope, allReviewed)).toBe(90)
    expect(scope.billing).toBe('undecided')
    expect(scope.crmProvider).toBe('undecided')
    expect(scopeProgress(scope, { billing: true })).toBe(10)
  })
  it('counts uncertain topics as covered, not as confirmed requirements', () => {
    const answered = recordAnswer(createDiscovery('guided'), 'I’m not sure yet')
    expect(discoveryProgress(answered)).toMatchObject({ percent: 10, topics: 1, uncertain: 1 })
    expect(discoveryProgress({ ...answered, stage: 'review' }).percent).toBe(10)
  })
  it('only reaches 100 when a server-confirmed result actually exists', () => {
    const session = { ...createDiscovery('manual'), scope: { ...emptyScope(), surfaceIds: ['website'] as SolutionScope['surfaceIds'] } }
    const input = { reviewed: allReviewed, planStep: 3 as const, approved: true }
    expect(discoveryProgress(session, input).percent).toBe(95)
    expect(discoveryProgress({ ...session, stage: 'confirmed' }, input).percent).toBe(90)
    expect(discoveryProgress({ ...session, stage: 'confirmed' }, { ...input, hasResult: true }).percent).toBe(100)
  })
  it('does not count invalid/null scope or truthy non-boolean review values', () => {
    expect(scopeProgress(null as unknown as SolutionScope, allReviewed)).toBe(0)
    expect(scopeProgress({ ...emptyScope(), billing: 'bad' } as unknown as SolutionScope, allReviewed)).toBe(0)
    expect(scopeProgress(emptyScope(), { capabilityIds: 'yes' } as never)).toBe(0)
    expect(scopeProgress(emptyScope(), null as never)).toBe(0)
  })
})
