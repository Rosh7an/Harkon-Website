// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isQuotedEvidence, validateAgentOutput } from '../utils/discovery'

const answer = 'We run a salon. Customers struggle to book appointments and repayment is manual.'

describe('isQuotedEvidence', () => {
  it('accepts whole-word quotes and longer phrases', () => {
    expect(isQuotedEvidence('book appointments', answer)).toBe(true)
    expect(isQuotedEvidence('salon', answer)).toBe(true)
    expect(isQuotedEvidence('salon.', answer)).toBe(true)
  })
  it('rejects empty, one- and two-letter quotes', () => {
    expect(isQuotedEvidence('', answer)).toBe(false)
    expect(isQuotedEvidence('   ', answer)).toBe(false)
    expect(isQuotedEvidence('a', answer)).toBe(false)
    expect(isQuotedEvidence('We', answer)).toBe(false)
    expect(isQuotedEvidence('...', answer)).toBe(false)
  })
  it('rejects short quotes that only match inside another word', () => {
    expect(isQuotedEvidence('pay', answer)).toBe(false)
    expect(isQuotedEvidence('ointment', answer)).toBe(false)
  })
  it('accepts a long quote even when it starts mid-word', () => {
    expect(isQuotedEvidence('ustomers struggle to book', answer)).toBe(true)
  })
  it('accepts the whole answer, however short', () => {
    expect(isQuotedEvidence('No', 'No')).toBe(true)
    expect(isQuotedEvidence('CRM', ' CRM ')).toBe(true)
  })
  it('rejects text that is not in the answer at all', () => {
    expect(isQuotedEvidence('online payments', answer)).toBe(false)
  })
  it('respects word boundaries in Malayalam', () => {
    const malayalam = 'ഞങ്ങൾക്ക് ബുക്കിംഗ് വേണം'
    expect(isQuotedEvidence('ബുക്കിംഗ്', malayalam)).toBe(true)
    expect(isQuotedEvidence('ക്കിം', malayalam)).toBe(false)
  })
})

describe('validateAgentOutput evidence', () => {
  const output = (overrides: Record<string, unknown>) => ({ acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [], excludedCapabilities: [], ...overrides })
  it('drops a recommendation backed by one letter but keeps well-quoted ones', () => {
    const result = validateAgentOutput(output({ recommendations: [
      { group: 'capabilityIds', id: 'ai', reason: 'Wants AI', evidence: 'a' },
      { group: 'capabilityIds', id: 'booking', reason: 'Booking', evidence: 'book appointments' },
    ] }), answer)
    expect(result.recommendations.map(item => item.id)).toEqual(['booking'])
  })
  it('fails the review when a fact, review item or exclusion is backed only by a fragment', () => {
    expect(() => validateAgentOutput(output({ facts: [{ field: 'business', value: 'Salon', evidence: 'a' }] }), answer)).toThrow(/fact/)
    expect(() => validateAgentOutput(output({ reviewItems: [{ text: 'Check billing', evidence: 'pay' }] }), answer)).toThrow(/review item/)
    expect(() => validateAgentOutput(output({ excludedCapabilities: [{ id: 'payments', evidence: 'pay' }] }), answer)).toThrow(/exclusion/)
  })
  it('accepts evidence quoted from another current answer', () => {
    const result = validateAgentOutput(output({ facts: [{ field: 'users', value: 'Staff', evidence: 'five staff' }] }), answer, ['We have five staff'])
    expect(result.facts).toHaveLength(1)
  })
})
