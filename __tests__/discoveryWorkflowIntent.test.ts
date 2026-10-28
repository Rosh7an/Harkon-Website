import { describe, expect, it } from 'vitest'
import { applyAgentOutput, createDiscovery, recordAnswer, type Recommendation } from '../utils/discovery'
import { workflowRecommendations } from '../utils/discoveryWorkflowIntent'

describe('customer-tracking intent', () => {
  it.each([
    'We want to use a website to track customers and follow-ups.',
    'Our staff will use the dashboard to track customers and follow-ups.',
    'We do not have a CRM and need customer tracking and follow-ups.',
    'We use WhatsApp and spreadsheets and need to track customers and follow-ups.',
    'We need customer tracking.',
  ])('preserves AI tracking suggestions through reconciliation: %s', text => {
    const recommendation: Recommendation = { group: 'capabilityIds', id: 'crm', reason: 'Organise customer follow-ups.', evidence: text }
    const session = recordAnswer(createDiscovery('guided'), text)
    const reviewed = applyAgentOutput(session, { acknowledgment: 'Reviewed.', facts: [], recommendations: [recommendation], reviewItems: [] })
    expect(reviewed.providerStatus).toBe('available')
    expect(reviewed.recommendations.some(item => item.id === 'crm')).toBe(true)
    expect(reviewed.scope.capabilityIds).toContain('crm')
    expect(reviewed.scope.surfaceIds).toContain('admin')
  })
  it.each([
    'Our team will then use an internal CRM.',
    'Our team will use a CRM.',
    'We need to use a CRM.',
    'We want to use an internal CRM.',
  ])('suggests a CRM for a planned workflow even if the model omitted it: %s', text => {
    const reviewed = applyAgentOutput(recordAnswer(createDiscovery('guided'), text), { acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] })
    expect(reviewed.scope.capabilityIds).toContain('crm')
    expect(reviewed.scope.surfaceIds).toContain('admin')
    expect(reviewed.recommendations.find(item => item.id === 'crm')?.evidence).toBe(text.slice(0, -1))
  })
  it.each([
    'We need to connect our existing CRM for follow-ups.',
    'We use a CRM for customer follow-ups.',
    'Our team currently uses an internal CRM.',
    'Our team will use our existing CRM.',
    'We will connect an internal CRM.',
    'We do not want to use a CRM.',
    'We do not need customer tracking or follow-ups.',
    'We need a website without a CRM.',
  ])('respects existing systems and explicit refusals: %s', text => {
    const existing: Recommendation[] = [{ group: 'capabilityIds', id: 'crm', reason: 'AI suggestion', evidence: text }]
    expect(workflowRecommendations([{ field: 'workflow', text }], existing).some(item => item.id === 'crm')).toBe(false)
  })
  it('does not auto-select an uncertain future CRM', () => {
    expect(workflowRecommendations([{ field: 'workflow', text: 'We might use an internal CRM later.' }], [])).toEqual([])
  })
  it('handles empty context and preserves supported non-English AI recommendations', () => {
    expect(workflowRecommendations([], [])).toEqual([])
    const text = 'കസ്റ്റമർമാരെ ട്രാക്ക് ചെയ്യാനും ഫോളോ അപ്പ് ചെയ്യാനും സംവിധാനം വേണം.'
    const recommendation: Recommendation = { group: 'capabilityIds', id: 'crm', reason: 'Track customer enquiries.', evidence: text }
    const reviewed = applyAgentOutput(recordAnswer(createDiscovery('guided'), text), { acknowledgment: 'Reviewed.', facts: [], recommendations: [recommendation], reviewItems: [] })
    expect(reviewed.scope.capabilityIds).toContain('crm')
  })
  it('rejects unsupported AI evidence rather than selecting unrelated tracking', () => {
    const reviewed = applyAgentOutput(recordAnswer(createDiscovery('guided'), 'A bakery website.'), { acknowledgment: 'Reviewed.', facts: [], recommendations: [{ group: 'capabilityIds', id: 'crm', reason: 'Track customers', evidence: 'unrelated source' }], reviewItems: [] })
    expect(reviewed.scope.capabilityIds).not.toContain('crm')
  })
})
