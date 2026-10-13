import { describe, expect, it } from 'vitest'
import { POST } from '../app/api/estimate/route'

function request(body: unknown) {
  return new Request('http://localhost/api/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/estimate', () => {
  it('returns a canonical estimate for a valid request', async () => {
    const response = await POST(request({
      projectTypeId: 'website',
      featureIds: [],
      followUpAnswers: {},
      riskProfile: 'standard',
      timelineSpeed: 'standard',
    }))
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.result.lowEstimateCost).toBeCloseTo(18696.6)
  })

  it('returns 400 for manipulated and null payloads without leaking internals', async () => {
    const manipulated = await POST(request({
      projectTypeId: 'fake',
      featureIds: [],
      followUpAnswers: {},
      riskProfile: 'standard',
      timelineSpeed: 'standard',
      rate: -9999,
    }))
    const nullPayload = await POST(request(null))
    expect(manipulated.status).toBe(400)
    expect(nullPayload.status).toBe(400)
    expect((await nullPayload.json()).error).not.toMatch(/Cannot read/)
  })
})
