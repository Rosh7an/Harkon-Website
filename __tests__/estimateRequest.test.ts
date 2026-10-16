import { describe, expect, it } from 'vitest'
import { estimateFromRequest, parseEstimateRequest } from '../utils/estimateRequest'

describe('estimate request validation', () => {
  const validRequest = {
    projectTypeId: 'website',
    featureIds: ['website_booking'],
    followUpAnswers: {},
    riskProfile: 'standard',
    timelineSpeed: 'standard',
  }

  it('resolves pricing from the canonical server catalog', () => {
    const request = parseEstimateRequest(validRequest)
    const result = estimateFromRequest(request)
    expect(result.rawFeatureTotal).toBe(80)
    expect(result.lowEstimateCost).toBeGreaterThan(0)
    expect(result.highEstimateCost).toBeGreaterThan(result.lowEstimateCost)
  })

  it('accepts an empty optional-feature selection', () => {
    const request = parseEstimateRequest({ ...validRequest, featureIds: [] })
    expect(request.featureIds).toEqual([])
    expect(estimateFromRequest(request).rawFeatureTotal).toBe(50)
  })

  it('rejects null, unknown, duplicate, and incompatible selections', () => {
    expect(() => parseEstimateRequest(null)).toThrow(/object/)
    expect(() => parseEstimateRequest({ ...validRequest, projectTypeId: 'unknown' })).toThrow(/project type/)
    expect(() => parseEstimateRequest({ ...validRequest, featureIds: ['website_booking', 'website_booking'] })).toThrow(/duplicates/)
    expect(() => parseEstimateRequest({ ...validRequest, featureIds: ['enterprise_sso'] })).toThrow(/does not apply/)
  })

  it('rejects caller-supplied commercial values and invalid follow-up answers', () => {
    const parsed = parseEstimateRequest({ ...validRequest, rate: -9999, riskMultiplier: -10 })
    expect(estimateFromRequest(parsed).lowEstimateCost).toBeGreaterThan(0)
    expect(() => parseEstimateRequest({
      ...validRequest,
      projectTypeId: 'webapp',
      featureIds: ['webapp_stripe'],
      followUpAnswers: { stripe_billing: 'Lifetime' },
    })).toThrow(/follow-up/)
  })
})
