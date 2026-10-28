import { describe, expect, it } from 'vitest'
import { createDiscovery, nextQuestion } from '../utils/discovery'
import { migrateBatchCollection, parseRequirementAnswers, prepareBatchReview, restoreRequirementAnswers } from '../utils/discoveryBatch'
const answers = { business: 'A shop', pain: 'Lost enquiries', current: 'Spreadsheets', workflow: 'Track enquiries', users: 'Staff', constraints: 'Not sure', priority: 'Start small' }
describe('locally collected requirements', () => {
  it('keeps the sealed revision while restoring a partial draft', () => {
    const initial = createDiscovery('guided')
    const local = restoreRequirementAnswers(initial, { business: answers.business, pain: answers.pain })
    expect(local.revision).toBe(initial.revision)
    expect(local.turns).toBe(2)
    expect(nextQuestion(local)?.id).toBe('current')
    const edited = restoreRequirementAnswers(local, { business: 'A studio' })
    expect(edited.answers?.business).toBe('A studio')
    expect(edited.turns).toBe(2)
    expect(initial.facts).toEqual({})
  })
  it('migrates actual legacy answers without treating inferred facts as answered questions', () => {
    const legacy = restoreRequirementAnswers(createDiscovery('guided'), { business: 'A shop' })
    legacy.facts.users = { value: 'Staff', evidence: 'A shop', source: 'ai', status: 'reported' }
    legacy.aiReviewFailure = 'rate_limit'
    legacy.pendingAIReview = { field: 'business', action: 'answer' }
    const migrated = migrateBatchCollection(legacy)
    expect(migrated.answers).toEqual({ business: 'A shop' })
    expect(migrated.facts.users).toBeUndefined()
    expect(migrated.aiReviewFailure).toBeUndefined()
    expect(migrated.turns).toBe(1)
    expect(nextQuestion(migrated)?.id).toBe('pain')
  })
  it('builds all seven answers with one server revision and preserves expiry', () => {
    const initial = createDiscovery('guided')
    const reviewed = prepareBatchReview(initial, answers)
    expect(reviewed.answers).toEqual(answers)
    expect(reviewed.turns).toBe(7)
    expect(reviewed.stage).toBe('review')
    expect(reviewed.revision).toBe(1)
    expect(reviewed.expiresAt).toBe(initial.expiresAt)
  })
  it('accepts an empty local draft but requires every answer for submission', () => {
    expect(parseRequirementAnswers({})).toEqual({})
    expect(() => prepareBatchReview(createDiscovery('guided'), {})).toThrow('all seven')
  })
  it.each([null, [], { toString: 'x' }, { business: '' }, { business: 42 }, { business: 'x'.repeat(2001) }].map(value => ({ value })))('rejects invalid stored inputs %j', ({ value }) => {
    expect(() => parseRequirementAnswers(value)).toThrow()
  })
  it('rejects gaps and supports boundary-length answers', () => {
    expect(() => restoreRequirementAnswers(createDiscovery('guided'), { pain: 'Missing business answer' })).toThrow('out of order')
    expect(parseRequirementAnswers({ business: 'x'.repeat(2000) }).business).toHaveLength(2000)
  })
})
