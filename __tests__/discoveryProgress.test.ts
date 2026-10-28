import { describe, expect, it } from 'vitest'
import { QUESTIONS, createDiscovery, recordAnswer } from '../utils/discovery'
import { emptyScope, type SolutionScope } from '../utils/solutionCatalog'
import { discoveryProgress, scopeProgress, REVIEW_FIELDS } from '../utils/discoveryProgress'

const allReviewed = Object.fromEntries(REVIEW_FIELDS.map(field => [field, true]))
describe('field-based workflow progress', () => {
  it('highlights requirements during review without losing completed planning progress', () => {
    let session = createDiscovery('guided')
    for (const question of QUESTIONS) session = recordAnswer(session, `Answer for ${question.id}`)
    const input = { scope: { ...emptyScope(), surfaceIds: ['website'] } as SolutionScope, reviewed: allReviewed, planStep: 1 as const, completedPlanSteps: 1 }
    const planning = discoveryProgress(session, input)
    const requirements = discoveryProgress(session, { ...input, reviewingRequirements: true })
    expect(planning.step).toBe(2)
    expect(requirements.step).toBe(1)
    expect(requirements.percent).toBe(planning.percent)
    expect(requirements.next).toContain('Your solution')
  })
  it('keeps completed pages on back navigation and requires Continue after an edit', () => {
    const session = createDiscovery('manual')
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'] }
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 0, completedPlanSteps: 3 }).percent).toBe(60)
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 1, completedPlanSteps: 1 }).percent).toBe(20)
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 0, completedPlanSteps: 0 }).percent).toBe(0)
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, completedPlanSteps: 99 }).percent).toBe(0)
    expect(discoveryProgress(session).milestones.map(item => item.position)).toEqual([20, 60, 100])
  })
  it('never lets partial consent replace the required payment-type answer', () => {
    const session = createDiscovery('manual')
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] }
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, completedPlanSteps: 3, approved: true, allowPartial: true }).percent).toBe(40)
    expect(discoveryProgress(session, { scope: { ...scope, billing: 'one_time' }, reviewed: allReviewed, completedPlanSteps: 3, approved: true }).percent).toBe(80)
  })
  it('starts both approaches at zero, even when manual starts in review', () => {
    expect(discoveryProgress(null).percent).toBe(0)
    for (const mode of ['guided', 'manual'] as const) expect(discoveryProgress(createDiscovery(mode)).percent).toBe(0)
  })
  it('counts a choice group once rather than rewarding larger purchases', () => {
    const scope = { ...emptyScope(), surfaceIds: ['website'] as SolutionScope['surfaceIds'] }
    expect(scopeProgress(scope, { surfaceIds: true })).toBe(1)
    scope.surfaceIds.push('mobile', 'portal')
    expect(scopeProgress(scope, { surfaceIds: true })).toBe(1)
    expect(scopeProgress(emptyScope(), { surfaceIds: true })).toBe(0)
  })
  it('does not count default assumptions, prechecked suggestions or unchecked extras', () => {
    expect(scopeProgress({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['seo'] })).toBe(0)
    expect(scopeProgress(emptyScope())).toBe(0)
    expect(scopeProgress(emptyScope(), { capabilityIds: true })).toBe(0)
  })
  it('allows unchanged defaults and unknown follow-ups to be explicitly reviewed', () => {
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], integrationIds: ['existing_crm'] }
    expect(scopeProgress(scope, allReviewed)).toBe(2)
    expect(scope.billing).toBe('undecided')
    expect(scope.crmProvider).toBe('undecided')
    expect(scopeProgress(scope, { billing: true })).toBe(0)
  })
  it('counts uncertain topics as covered, not as confirmed requirements', () => {
    const answered = recordAnswer(createDiscovery('guided'), 'I’m not sure yet')
    expect(discoveryProgress(answered)).toMatchObject({ step: 1, percent: 8, topics: 1, uncertain: 1 })
    expect(discoveryProgress({ ...answered, stage: 'review' }).percent).toBe(8)
  })
  it('only reaches 100 when a server-confirmed result actually exists', () => {
    const session = { ...createDiscovery('manual'), scope: { ...emptyScope(), surfaceIds: ['website'] as SolutionScope['surfaceIds'] } }
    const input = { reviewed: allReviewed, planStep: 3 as const, approved: true }
    expect(discoveryProgress(session, input).percent).toBe(80)
    expect(discoveryProgress({ ...session, stage: 'confirmed' }, input).percent).toBeLessThan(100)
    expect(discoveryProgress({ ...session, stage: 'confirmed' }, { ...input, hasResult: true }).percent).toBe(100)
  })
  it('does not count invalid/null scope or truthy non-boolean review values', () => {
    expect(scopeProgress(null as unknown as SolutionScope, allReviewed)).toBe(0)
    expect(scopeProgress({ ...emptyScope(), billing: 'bad' } as unknown as SolutionScope, allReviewed)).toBe(0)
    expect(scopeProgress(emptyScope(), { capabilityIds: 'yes' } as never)).toBe(0)
    expect(scopeProgress(emptyScope(), null as never)).toBe(0)
  })
  it('gives equal weight to every guided question and completed planning page', () => {
    let session = createDiscovery('guided')
    for (let index = 1; index <= QUESTIONS.length; index++) {
      session = recordAnswer(session, `Answer ${index}`)
      expect(discoveryProgress(session).percent).toBe(Math.round(index / (QUESTIONS.length + 5) * 100))
      expect(discoveryProgress(session).step).toBe(index === QUESTIONS.length ? 2 : 1)
    }
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'] }
    expect(discoveryProgress(session, { scope, reviewed: { surfaceIds: true } })).toMatchObject({ step: 2, percent: 58 })
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 3 })).toMatchObject({ step: 3, percent: 83 })
  })
  it('advances manual requirements and selection with explicit input, including back navigation', () => {
    const session = createDiscovery('manual')
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'] }
    expect(discoveryProgress(session, { scope })).toMatchObject({ step: 1, percent: 0 })
    expect(discoveryProgress(session, { scope, reviewed: { surfaceIds: true } })).toMatchObject({ step: 1, percent: 0 })
    expect(discoveryProgress(session, { scope, reviewed: { surfaceIds: true }, planStep: 1 })).toMatchObject({ step: 2, percent: 20 })
    expect(discoveryProgress(session, { scope, reviewed: { surfaceIds: true, capabilityIds: true }, planStep: 2 })).toMatchObject({ step: 2, percent: 40 })
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 3 })).toMatchObject({ step: 3, percent: 60 })
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 2 }).step).toBe(2)
    expect(discoveryProgress(session, { scope, reviewed: allReviewed, planStep: 0 }).step).toBe(1)
  })
  it('requires partial consent and approval together to complete the review page', () => {
    const session = createDiscovery('manual')
    const scope: SolutionScope = { ...emptyScope(), surfaceIds: ['website'], integrationIds: ['existing_crm'] }
    const input = { scope, reviewed: allReviewed, planStep: 3 as const }
    expect(discoveryProgress(session, input).percent).toBe(60)
    expect(discoveryProgress(session, { ...input, allowPartial: true }).percent).toBe(60)
    expect(discoveryProgress(session, { ...input, allowPartial: true, approved: true }).percent).toBe(80)
    expect(discoveryProgress(session, { ...input, scope: emptyScope(), approved: true }).percent).toBe(0)
  })
})
