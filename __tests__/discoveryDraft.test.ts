import { describe, expect, it } from 'vitest'
import { readDraftStore, type LocalDraft } from '../utils/discoveryDraft'
import { emptyScope } from '../utils/solutionCatalog'

const now = 1000
const draft: LocalDraft = { token: 'signed-token', expiresAt: 2000, scope: emptyScope(), answer: '', selectedOptions: [], editing: null, correction: '', planStep: 0, reviewed: {} }
const stored = (manual: unknown = draft, guided: unknown = draft) => JSON.stringify({ version: 2, activeMode: 'manual', drafts: { manual, guided } })
describe('bounded separate draft storage', () => {
  it('restores bounded local requirement answers and rejects malformed answer maps', () => {
    expect(readDraftStore(stored(draft, { ...draft, requirementAnswers: { business: 'A shop', pain: 'Not sure' } }), now)?.drafts.guided?.requirementAnswers).toEqual({ business: 'A shop', pain: 'Not sure' })
    for (const requirementAnswers of [null, [], { malicious: 'x' }, { business: '' }, { business: 'x'.repeat(2001) }]) expect(readDraftStore(stored(draft, { ...draft, requirementAnswers }), now)?.drafts.guided).toBeUndefined()
  })
  it('retains completed-page progress separately from the current page and rejects invalid counts', () => {
    const value = readDraftStore(stored({ ...draft, planStep: 0, completedPlanSteps: 3 }), now)!
    expect(value.drafts.manual?.planStep).toBe(0)
    expect(value.drafts.manual?.completedPlanSteps).toBe(3)
    for (const completedPlanSteps of [-1, 4, 1.5, '3', null]) {
      expect(readDraftStore(stored({ ...draft, completedPlanSteps }), now)?.drafts.manual).toBeUndefined()
    }
  })
  it('restores each draft independently, including unfinished answers and choices', () => {
    const value = readDraftStore(stored({ ...draft, scope: { ...emptyScope(), surfaceIds: ['website'] }, planStep: 2 }, { ...draft, answer: 'Unfinished answer' }), now)!
    expect(value.drafts.manual?.scope.surfaceIds).toEqual(['website'])
    expect(value.drafts.guided?.answer).toBe('Unfinished answer')
    expect(value.drafts.guided?.scope.surfaceIds).toEqual([])
  })
  it.each([null, '', '{}', 'null', '[]', '{broken', 'x'.repeat(900001)])('ignores empty or invalid storage safely', raw => {
    expect(readDraftStore(raw, now)).toBeNull()
  })
  it('ignores expired or malformed drafts while keeping the other approach', () => {
    expect(readDraftStore(stored({ ...draft, expiresAt: now }), now)?.drafts.manual).toBeUndefined()
    expect(readDraftStore(stored({ ...draft, scope: { ...emptyScope(), surfaceIds: ['made-up'] } }), now)?.drafts.guided).toEqual(draft)
    expect(readDraftStore(stored({ ...draft, planStep: 4 }), now)?.drafts.manual).toBeUndefined()
  })
  it('accepts maximum-length input and discards overlong or wrong-type answers', () => {
    expect(readDraftStore(stored({ ...draft, answer: 'a'.repeat(2000) }), now)?.drafts.manual?.answer).toHaveLength(2000)
    for (const answer of ['a'.repeat(2001), null, 7]) expect(readDraftStore(stored({ ...draft, answer }), now)?.drafts.manual).toBeUndefined()
  })
  it('never restores prices, approval, hidden answers or arbitrary review fields', () => {
    const value = readDraftStore(stored({ ...draft, approved: true, result: { lowEstimateCost: 1 }, scope: { ...emptyScope(), billing: 'recurring' }, reviewed: { billing: true, malicious: true, riskProfile: 'yes' } }), now)?.drafts.manual
    expect(value).not.toHaveProperty('approved')
    expect(value).not.toHaveProperty('result')
    expect(value?.scope.billing).toBe('undecided')
    expect(value?.reviewed).toEqual({ billing: true })
  })
  it('retains bounded recovery inputs without a rejected session token', () => {
    const value = readDraftStore(stored({ ...draft, token: '', needsRestart: true, answer: 'Unsent text', scope: { ...emptyScope(), surfaceIds: ['website'] }, approved: true, result: {} }), now)?.drafts.manual
    expect(value?.needsRestart).toBe(true)
    expect(value?.token).toBe('')
    expect(value?.answer).toBe('Unsent text')
    expect(value?.scope.surfaceIds).toEqual(['website'])
    expect(value).not.toHaveProperty('approved')
    expect(value).not.toHaveProperty('result')
    expect(readDraftStore(stored({ ...draft, token: '' }), now)?.drafts.manual).toBeUndefined()
    expect(readDraftStore(stored({ ...draft, needsRestart: 'yes', token: '' }), now)?.drafts.manual).toBeUndefined()
  })
})
