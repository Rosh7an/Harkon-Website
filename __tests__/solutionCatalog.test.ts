import { describe, expect, it } from 'vitest'
import { emptyScope, estimateSolution, parseScope, resolveWork, reviewScope, scopeIssues } from '../utils/solutionCatalog'
import { parseEstimateRequest } from '../utils/estimateRequest'

describe('solution composition', () => {
  it('keeps undecided work requested but out of a partial estimate without inventing answers', () => {
    const scope = parseScope({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], integrationIds: ['existing_crm', 'external_api'] })
    const review = reviewScope(scope)
    expect(review.issues).toEqual([])
    expect(review.reviewItems).toHaveLength(3)
    expect(scope.capabilityIds).toEqual(['payments'])
    expect(scope.billing).toBe('undecided')
    expect(review.pricedScope.capabilityIds).toEqual([])
    expect(review.pricedScope.integrationIds).toEqual([])
    expect(estimateSolution(review.pricedScope)).toEqual(estimateSolution({ ...emptyScope(), surfaceIds: ['website'] }))
    expect(() => estimateSolution(scope)).toThrow(/billing/)
  })
  it('ignores inactive follow-ups and never adds unchecked capabilities', () => {
    const scope = parseScope({ ...emptyScope(), surfaceIds: ['website'], billing: 'recurring', crmProvider: 'hubspot' })
    expect(scope.billing).toBe('undecided')
    expect(scope.crmProvider).toBe('undecided')
    expect(reviewScope(scope).reviewItems).toEqual([])
    expect(resolveWork(scope).map(item => item.id)).not.toContain('recurring_billing')
    expect(scope.capabilityIds).toEqual([])
  })
  it('retains valid selected follow-ups and blocks invalid dependencies even in partial scope', () => {
    const valid = parseScope({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'], billing: 'recurring', integrationIds: ['existing_crm'], crmProvider: 'zoho' })
    expect(reviewScope(valid).reviewItems).toEqual([])
    expect(resolveWork(valid).map(item => item.id)).toContain('recurring_billing')
    expect(reviewScope({ ...emptyScope(), capabilityIds: ['payments', 'seo'] }).issues).not.toHaveLength(0)
    expect(reviewScope(emptyScope()).issues).toHaveLength(1)
  })
  it('counts one shared foundation and CRM core across three surfaces', () => {
    const scope = parseScope({ ...emptyScope(), surfaceIds: ['website', 'portal', 'mobile'], capabilityIds: ['crm', 'seo', 'accounts'] })
    const work = resolveWork(scope)
    expect(work.filter(item => item.id === 'foundation')).toHaveLength(1)
    expect(work.filter(item => item.id === 'crm')).toHaveLength(1)
    expect(work.map(item => item.id)).toContain('crm:mobile')
    expect(work.map(item => item.id)).not.toContain('crm:website')
    expect(work.filter(item => item.id === 'coordination')).toHaveLength(1)
    expect(estimateSolution(scope).highEstimateCost).toBeGreaterThan(estimateSolution(scope).lowEstimateCost)
  })
  it('accepts a website with no optional features and preserves its 50-hour base allocation', () => {
    const scope = parseScope({ ...emptyScope(), surfaceIds: ['website'] })
    expect(estimateSolution(scope).rawFeatureTotal).toBe(50)
  })
  it('rejects empty, null, inherited, duplicate and unknown selections', () => {
    expect(() => parseScope(null)).toThrow(/object/)
    expect(() => parseScope({ ...emptyScope(), surfaceIds: ['toString'] })).toThrow(/unknown/)
    expect(() => parseScope({ ...emptyScope(), capabilityIds: ['constructor'] })).toThrow(/unknown/)
    expect(() => parseScope({ ...emptyScope(), surfaceIds: ['website', 'website'] })).toThrow(/duplicates/)
    expect(() => estimateSolution(emptyScope())).toThrow(/at least one/)
  })
  it('requires dependencies and price-critical details', () => {
    expect(scopeIssues({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['crm'] }).join()).toMatch(/Add .*or remove this feature/)
    expect(scopeIssues({ ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] }).join()).toMatch(/billing/)
    expect(scopeIssues({ ...emptyScope(), surfaceIds: ['portal'], integrationIds: ['existing_crm'] }).join()).toMatch(/provider/)
    expect(scopeIssues({ ...emptyScope(), surfaceIds: ['mobile'], integrationIds: ['external_api'] }).join()).toMatch(/human/)
  })
  it('rejects coerced billing and provider choices rather than bypassing follow-up checks', () => {
    const scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] }
    for (const billing of [['undecided'], ['one_time'], null, 1, {}]) {
      expect(() => parseScope({ ...scope, billing })).toThrow(/Billing/)
    }
    for (const crmProvider of [['undecided'], ['hubspot'], null, 1, {}]) {
      expect(() => parseScope({ ...scope, crmProvider })).toThrow(/provider/)
    }
  })
  it('ignores caller-supplied hours and rates and separates expedited cost from hours', () => {
    const scope = parseScope({ ...emptyScope(), surfaceIds: ['mobile'], rate: 0, hours: -20 })
    const standard = estimateSolution(scope)
    const expedited = estimateSolution({ ...scope, timelineSpeed: 'expedited' })
    expect(standard.hourlyRate).toBe(240)
    expect(expedited.lowEstimateHours).toBe(standard.lowEstimateHours)
    expect(expedited.lowEstimateCost).toBeGreaterThan(standard.lowEstimateCost)
  })
  it('closes legacy inherited-ID and missing follow-up gaps', () => {
    const base = { projectTypeId: 'webapp', featureIds: ['webapp_stripe'], followUpAnswers: {}, riskProfile: 'standard', timelineSpeed: 'standard' }
    expect(() => parseEstimateRequest(base)).toThrow(/required/)
    expect(() => parseEstimateRequest({ ...base, projectTypeId: 'toString' })).toThrow(/valid/)
    expect(() => parseEstimateRequest({ ...base, featureIds: ['constructor'] })).toThrow(/unknown/)
  })
})
