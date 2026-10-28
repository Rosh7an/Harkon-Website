import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const modalMock = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null))
const pdfMock = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }))
vi.mock('../components/QueryModal', () => ({ default: modalMock }))
vi.mock('../utils/estimatePdf', () => ({ createEstimatePdf: pdfMock.create }))
import SolutionDiscovery, { proposalSummary, type DiscoveryResponse } from '../components/SolutionDiscovery'
import { QUESTIONS, applyAgentOutput, createDiscovery, editFact, nextQuestion, recordAnswer, validateAgentOutput } from '../utils/discovery'
import { emptyScope, estimateSolution, reviewScope } from '../utils/solutionCatalog'
import { CONTACT_MESSAGE_MAX } from '../utils/contactLimits'
import { prepareBatchReview } from '../utils/discoveryBatch'
import { DRAFT_STORAGE_KEY } from '../utils/discoveryDraft'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
function response(mode: 'manual' | 'guided'): DiscoveryResponse {
  const session = createDiscovery(mode)
  return { token: `${mode}-token`, session, question: nextQuestion(session), reviewItems: [], result: null }
}
function guidedReview(): DiscoveryResponse {
  let session = createDiscovery('guided')
  for (const answer of ['A local shop', 'Manual enquiries', 'Spreadsheets', 'Track enquiries', 'Staff need a website', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
  // Model a completed fallback session with no preselected suggestions; these
  // cases exercise the customer's local selections rather than inference.
  session.scope = emptyScope()
  session.recommendations = []
  return { token: 'guided-token', session, question: null, reviewItems: [], result: null }
}
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(item => item.textContent === name)
  if (!found) throw new Error(`Button not found: ${name}`)
  return found
}
function namedButton(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.getAttribute('aria-label') === name)
  if (!found) throw new Error(`Named button not found: ${name}`)
  return found
}
function input(label: string): HTMLInputElement {
  const found = [...container.querySelectorAll('label')].find(item => item.textContent?.includes(label))?.querySelector('input')
  if (!found) throw new Error(`Input missing: ${label}`)
  return found
}
async function click(target: HTMLElement) { await act(async () => { target.click() }) }
async function chooseApproach(mode: 'guided' | 'manual') {
  const buttons = () => [...container.querySelectorAll<HTMLButtonElement>('button')]
  const label = mode === 'guided' ? 'Guide me' : 'Build my own plan'
  const initial = buttons().find(item => item.textContent === label)
  if (initial) { await click(initial); return }
  const saved = `Resume saved ${mode === 'guided' ? 'guided' : 'build-your-own'} plan`
  if (container.querySelector('[aria-label="Session recovery"]')) {
    const resume = buttons().find(item => item.textContent === saved)
    if (resume) { await click(resume); return }
    await click(button(`Start a fresh ${mode === 'guided' ? 'guided' : 'build-your-own'} plan`)); return
  }
  await click(namedButton('Plan menu'))
  const resume = buttons().find(item => item.textContent === saved)
  await click(resume ?? button(`Start a new ${mode === 'guided' ? 'guided' : 'build-your-own'} plan`))
}
async function freshSession() {
  const fresh = [...container.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent?.startsWith('Start a fresh '))
  if (!fresh) throw new Error('A fresh-session action is required')
  await click(fresh)
}

async function choosePlaces(labels = ['Public website']) {
  for (const label of labels) await click(input(label))
  await click(button('Continue to features'))
}
async function chooseFeatures(labels: string[] = []) {
  for (const label of labels.length ? labels : ['No extra features for now']) await click(input(label))
  await click(button('Continue to details'))
}
async function review() { await click(button('Review these details')) }
async function remount() { await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) }) }
const invalidSession = { ok: false, status: 400, json: async () => ({ code: 'DISCOVERY_SESSION_INVALID', error: 'Your discovery session expired or is invalid. Start a new session.' }) }
async function typeAnswer(value: string) {
  const textarea = container.querySelector('textarea')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // The current planner debounces draft storage; wait for the persisted input
  // before comparing snapshots across a failed request or a remount.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 200)) })
}
function percent() { return container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') ?? '0' }
beforeEach(async () => {
  pdfMock.create.mockReset().mockResolvedValue({ save: pdfMock.save })
  pdfMock.save.mockReset()
  sessionStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root.render(<SolutionDiscovery />) })
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})
describe('discovery interface', () => {
  it('reveals an offscreen question only on navigation, without scrolling while typing', async () => {
    const initial = response('guided')
    initial.session.reviewMode = 'batch'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => initial }))
    await chooseApproach('guided')
    const heading = container.querySelector<HTMLElement>('h2')!
    const reveal = vi.fn()
    heading.scrollIntoView = reveal
    heading.getBoundingClientRect = () => ({ top: -20, bottom: 0, left: 0, right: 100, width: 100, height: 20, x: 0, y: -20, toJSON() {} })
    await typeAnswer('A fictional shop')
    expect(reveal).not.toHaveBeenCalled()
    await click(button('Continue'))
    expect(reveal).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior: 'instant' })
    await typeAnswer('An enquiry problem')
    expect(reveal).toHaveBeenCalledTimes(1)
  })
  it('does not duplicate a local answer when Continue is clicked twice before rerender', async () => {
    const initial = response('guided')
    initial.session.reviewMode = 'batch'
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => initial })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('A fictional shop')
    const next = button('Continue')
    await act(async () => { next.click(); next.click() })
    expect(button('2Main problemCurrent')).toBeTruthy()
    expect(button('3Current processNot answered').disabled).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).drafts.guided.requirementAnswers).toEqual({ business: 'A fictional shop' })
  })
  it('collects six answers locally, restores and edits them, then reviews all seven with one request', async () => {
    const initial = response('guided')
    initial.session.reviewMode = 'batch'
    const answers = ['A shop', 'Lost enquiries', 'Spreadsheets', 'Track enquiries', 'Staff', 'Not sure', 'Start small']
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'review_answers') {
        const session = prepareBatchReview(initial.session, body.answers)
        session.providerStatus = 'available'
        return { ok: true, json: async () => ({ token: 'reviewed-batch-token', session, question: null, reviewItems: [], result: null, aiReview: { status: 'succeeded', requestId: 'batch-test' } }) }
      }
      return { ok: true, json: async () => initial }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    for (const answer of answers.slice(0, 3)) { await typeAnswer(answer); await click(button('Continue')) }
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-ai-understanding]')).toBeNull()
    await remount()
    expect(container.textContent).toContain('Walk me through')
    expect(container.querySelector('[aria-label="AI review status"]')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const answer of answers.slice(3, 6)) { await typeAnswer(answer); await click(button('Continue')) }
    await click(button('1BusinessCompleted'))
    await typeAnswer('A furniture shop')
    await click(button('Save and continue'))
    await click(button('7PriorityCurrent'))
    expect(fetcher).toHaveBeenCalledTimes(2)
    await typeAnswer(answers[6])
    await click(button('Review all answers with AI'))
    const submissions = fetcher.mock.calls.map(call => JSON.parse(call[1].body)).filter(body => body.action === 'review_answers')
    expect(submissions).toHaveLength(1)
    expect(submissions[0].revision).toBe(0)
    expect(submissions[0].answers).toEqual({ business: 'A furniture shop', pain: answers[1], current: answers[2], workflow: answers[3], users: answers[4], constraints: answers[5], priority: answers[6] })
    expect(container.textContent).toContain('Where will people use it?')
    const stored = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(stored.drafts.guided.requirementAnswers).toBeUndefined()
  })

  it('names the estimator consistently on dedicated pages and the home embed', async () => {
    expect(container.querySelector('section[aria-label="Cost Estimator"]')).not.toBeNull()
    expect(container.querySelector('h1')?.textContent).toBe('Cost Estimator')
    await act(async () => { root.render(<SolutionDiscovery headingLevel="h2" />) })
    expect(container.querySelector('h1')).toBeNull()
    expect(container.querySelector('h2')?.textContent).toBe('Cost Estimator')
    expect(container.textContent).not.toContain('Solution Planner')
  })
  it('keeps a failed AI answer pending until the retry succeeds', async () => {
    const initial = response('guided')
    const saved = recordAnswer(initial.session, 'A fictional shop')
    saved.aiReviewFailure = 'rate_limit'
    saved.pendingAIReview = { field: 'business', action: 'answer' }
    saved.aiReviewFailureReference = 'test-failure-reference'
    const failed = { token: 'saved-failure-token', session: saved, question: nextQuestion(saved), reviewItems: [], result: null, code: 'DISCOVERY_AI_REVIEW_FAILED', aiReview: { status: 'failed', reason: 'rate_limit', requestId: 'test-failure-reference' } }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockResolvedValueOnce({ ok: false, status: 429, json: async () => failed })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('A fictional shop')
    await click(button('Continue'))
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain('test-failure-reference')
    expect(container.textContent).not.toContain('Reference:')
    expect(button('1BusinessAwaiting AI review')).toBeTruthy()
    expect(container.textContent).not.toContain('You can continue and check your choices yourself')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Your answer is saved')
    expect(container.querySelector('textarea')?.value).toBe('A fictional shop')
    expect(button('Continue').disabled).toBe(true)
    const store = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(store.drafts.guided.token).toBe('saved-failure-token')
  })
  it('counts down the provider deadline and only unlocks retry until AI succeeds', async () => {
    const initial = response('guided')
    const saved = recordAnswer(initial.session, 'A fictional shop')
    saved.aiReviewFailure = 'rate_limit'
    saved.pendingAIReview = { field: 'business', action: 'answer' }
    saved.aiReviewFailureDetails = { retryAt: Date.now() + 14000 }
    const failed = { code: 'DISCOVERY_AI_REVIEW_FAILED', token: 'pending-token', session: saved, question: nextQuestion(saved), reviewItems: [], result: null, aiReview: { status: 'failed', reason: 'rate_limit', requestId: 'countdown-test' } }
    const recoveredSession = applyAgentOutput(saved, { acknowledgment: 'Reviewed.', facts: [], recommendations: [], reviewItems: [] })
    const recovered = { token: 'recovered-token', session: recoveredSession, question: nextQuestion(recoveredSession), reviewItems: [], result: null, aiReview: { status: 'succeeded', requestId: 'retry-test' } }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockResolvedValueOnce({ ok: false, status: 429, json: async () => failed }).mockResolvedValueOnce({ ok: true, json: async () => ({ ...failed, aiReview: { status: 'not_requested', requestId: 'restore-test' } }) }).mockResolvedValueOnce({ ok: true, json: async () => recovered })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('A fictional shop')
    vi.useFakeTimers()
    vi.setSystemTime(saved.aiReviewFailureDetails.retryAt! - 14000)
    await click(button('Continue'))
    expect(button('Retry in 14s').disabled).toBe(true)
    expect(button('Continue').disabled).toBe(true)
    await remount()
    expect(button('Retry in 14s').disabled).toBe(true)
    expect(container.querySelector('textarea')?.value).toBe('A fictional shop')
    const panel = container.querySelector<HTMLElement>('[aria-label="Your requirements"]')!
    expect(panel.contains(container.querySelector('[aria-label="AI review status"]'))).toBe(true)
    expect(container.querySelector('textarea')?.closest('[role="region"]')).toBe(panel)
    const reveal = vi.fn()
    container.querySelector<HTMLElement>('h2')!.scrollIntoView = reveal
    await act(async () => { vi.advanceTimersByTime(13000) })
    expect(reveal).not.toHaveBeenCalled()
    expect(button('Retry in 1s').disabled).toBe(true)
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(button('Retry AI review').disabled).toBe(false)
    expect(button('Continue').disabled).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(3)
    await click(button('Retry AI review'))
    expect(container.querySelector('[aria-label="AI review status"]')).toBeNull()
    expect(container.textContent).toContain('biggest difficulty')
    expect(container.querySelector('textarea')?.value).toBe('')
    expect(recoveredSession.answers?.business).toBe('A fictional shop')
    expect(recoveredSession.turns).toBe(1)
    expect(reveal).not.toHaveBeenCalled()
  })
  it('keeps secondary plan actions in one dismissible menu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => guidedReview() }))
    await chooseApproach('guided')
    expect(container.querySelector('[aria-label="Saved plans"]')).toBeNull()
    expect(container.textContent).not.toContain('Continue guided plan')
    expect(container.textContent).not.toContain('Start a new guided plan')
    expect(namedButton('Review requirements').closest('ol')?.getAttribute('aria-label')).toBe('Steps to your estimate')
    await click(namedButton('Plan menu'))
    expect(button('Start a new guided plan')).toBeTruthy()
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(container.querySelector('#discovery-plan-options')).toBeNull()
    expect(document.activeElement).toBe(namedButton('Plan menu'))
    await click(namedButton('Plan menu'))
    await act(async () => { container.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })) })
    expect(container.querySelector('#discovery-plan-options')).toBeNull()
  })
  it('saves guided feature selections immediately and restores them after refresh and continue', async () => {
    const view = guidedReview()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => JSON.parse(options.body).mode === 'manual' ? response('manual') : view })))
    await chooseApproach('guided')
    await choosePlaces()
    await click(input('Help customers find your website'))
    const snapshot = sessionStorage.getItem(DRAFT_STORAGE_KEY)!
    expect(JSON.parse(snapshot).drafts.guided.scope.capabilityIds).toEqual(['seo'])
    // A browser refresh uses the snapshot before React's unmount cleanup.
    await act(async () => { root.unmount(); sessionStorage.setItem(DRAFT_STORAGE_KEY, snapshot); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(input('Help customers find your website').checked).toBe(true)
    expect(container.textContent).toContain('Plan restored.')
    await chooseApproach('manual')
    await chooseApproach('guided')
    expect(input('Help customers find your website').checked).toBe(true)
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Back to previous step"]')!)
    expect(input('Public website').checked).toBe(true)
    const back = container.querySelector<HTMLButtonElement>('[aria-label="Back to requirements"]')!
    expect(back.disabled).toBe(false)
    await click(back)
    expect(container.querySelector('nav[aria-label="Discovery questions"]')).not.toBeNull()
  })
  it('flushes a newly typed draft on pagehide before the debounce expires', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('guided') }))
    await chooseApproach('guided')
    await act(async () => {
      const textarea = container.querySelector('textarea')!
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'A draft just before refresh')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    window.dispatchEvent(new Event('pagehide'))
    expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).drafts.guided.answer).toBe('A draft just before refresh')
  })
  it('reopens requirements from feature planning and preserves local scope when saving a correction', async () => {
    let view = guidedReview()
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'edit') view = { ...view, session: editFact({ ...view.session, scope: body.scope }, body.field, body.value) }
      return { ok: true, json: async () => view }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await choosePlaces()
    await click(input('Help customers find your website'))
    await click(namedButton('Review requirements'))
    expect(container.querySelector('textarea')?.value).toBe('A local shop')
    await typeAnswer('A furniture workshop')
    await click(button('Save and continue'))
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).scope).toMatchObject({ surfaceIds: ['website'], capabilityIds: ['seo'] })
    await click(namedButton('Continue planning'))
    expect(input('Help customers find your website').checked).toBe(true)
    await click(namedButton('Review requirements'))
    expect(container.querySelector('textarea')?.value).toBe('A furniture workshop')
  })
  it.each([true, false])('allows both consent checkboxes in either order: approval first %s', async approvalFirst => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    await click(input('Connect another tool'))
    await review()
    await click(input(approvalFirst ? 'I have reviewed' : 'Leave these unanswered'))
    await click(input(approvalFirst ? 'Leave these unanswered' : 'I have reviewed'))
    expect(input('I have reviewed').checked).toBe(true)
    expect(input('Leave these unanswered').checked).toBe(true)
    expect(button('Confirm and estimate selected work only').disabled).toBe(false)
    await click(input('Leave these unanswered'))
    expect(input('I have reviewed').checked).toBe(true)
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })
  it('shows a historical AI warning without treating it as unanswered scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => guidedReview() }))
    await chooseApproach('guided')
    const warning = container.querySelector('[aria-label="AI review status"]')!
    expect(warning.getAttribute('role')).toBe('status')
    expect(warning.textContent).toContain('The last AI review did not complete')
    await choosePlaces()
    await chooseFeatures()
    await review()
    expect(container.textContent).not.toContain('Optional team review')
    await click(input('I have reviewed'))
    expect(button('Confirm my plan and see estimate').disabled).toBe(false)
  })
  it('explains an AI failure and retries saved answers without losing choices or navigation', async () => {
    const initial = guidedReview()
    initial.session.aiReviewFailure = 'rate_limit'
    initial.session.scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['crm'] }
    const recovered = { ...initial, token: 'retried-token', session: { ...initial.session, revision: initial.session.revision + 1, providerStatus: 'available' as const, aiReviewFailure: undefined } }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockResolvedValueOnce({ ok: true, json: async () => recovered })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    expect(container.querySelector('[aria-label="AI review status"]')?.textContent).toContain('request or usage limit')
    expect(button('Continue to features').disabled).toBe(true)
    await click(button('Retry AI review'))
    const payload = JSON.parse(fetcher.mock.calls[1][1].body)
    expect(payload.action).toBe('retry_ai')
    expect(payload.scope.capabilityIds).toEqual(['crm'])
    expect(container.querySelector('[aria-label="AI review status"]')).toBeNull()
    await click(button('Continue to features'))
    expect(input('Track customers and follow-ups').checked).toBe(true)
    expect(button('Continue to details')).toBeTruthy()
  })
  it('replaces the sidebar with labelled navigation and one collapsed AI understanding', async () => {
    let session = recordAnswer(createDiscovery('guided'), 'A local shop')
    session = recordAnswer(session, 'Too much manual work')
    session.providerStatus = 'available'
    session.assistantMessage = 'Your staff handle enquiries manually. A shared enquiry list could reduce repeated work; the workflow still needs clarification.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'token', session, question: nextQuestion(session), reviewItems: [], result: null }) }))
    await chooseApproach('guided')
    expect(container.querySelector('aside')).toBeNull()
    const navigation = container.querySelector('nav[aria-label="Discovery questions"]')!
    expect(navigation.querySelectorAll('button')).toHaveLength(7)
    expect(navigation.querySelector('[aria-current="page"]')?.textContent).toContain('Current process')
    expect([...navigation.querySelectorAll<HTMLButtonElement>('button')].slice(3).every(item => item.disabled)).toBe(true)
    const understanding = container.querySelector('details[data-ai-understanding]') as HTMLDetailsElement
    expect(understanding.open).toBe(false)
    expect(understanding.textContent).toContain(session.assistantMessage)
    await click(understanding.querySelector('summary')!)
    expect(understanding.open).toBe(true)
    await click(button('1BusinessCompleted'))
    expect((container.querySelector('details[data-ai-understanding]') as HTMLDetailsElement).open).toBe(false)
    await typeAnswer('An unsaved business correction')
    await click(button('2Main problemCompleted'))
    await click(button('1BusinessCompleted'))
    expect(container.querySelector('textarea')?.value).toBe('An unsaved business correction')
    await click(button('3Current processCurrent'))
    expect(container.querySelector('textarea')?.value).toBe('')
    expect((container.querySelector('details[data-ai-understanding]') as HTMLDetailsElement).open).toBe(false)
  })
  it('uses compact pen, save and cancel controls while preserving answer corrections', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop selling local furniture', 'Too much manual work', 'Spreadsheets', 'Track enquiries', 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    session.facts.business = { value: 'A shop', evidence: 'A shop', source: 'ai', status: 'reported' }
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'edit') session = editFact(session, body.field, body.value)
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await choosePlaces()
    await chooseFeatures()
    await review()
    const answers = container.querySelector('[aria-label="Review your answers"]')!
    expect(answers.textContent).toContain('A shop selling local furniture')
    expect(answers.querySelectorAll('h4')).toHaveLength(7)
    expect(container.querySelector('aside')).toBeNull()
    expect(button('Edit your business').querySelector('svg')).not.toBeNull()
    expect(button('Edit your business').querySelector('.sr-only')?.textContent).toBe('Edit your business')
    await click(button('Edit your business'))
    const actions = button('Save correction').parentElement!
    expect(actions).toBe(button('Cancel').parentElement)
    expect(actions.className).toContain('gap-3')
    expect(button('Save correction').querySelector('svg')).not.toBeNull()
    expect(button('Cancel').querySelector('svg')).not.toBeNull()
    expect(answers.querySelector('p.whitespace-pre-wrap')?.textContent).not.toBe('A shop selling local furniture')
    await typeAnswer('')
    expect(button('Save correction').disabled).toBe(true)
    await typeAnswer('A furniture workshop')
    await click(button('Cancel'))
    expect(answers.textContent).toContain('A shop selling local furniture')
    await click(button('Edit your business'))
    await typeAnswer('Discard this draft with Escape')
    await act(async () => { container.querySelector('textarea')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(container.querySelector('textarea')).toBeNull()
    expect(answers.textContent).toContain('A shop selling local furniture')
    expect(fetcher.mock.calls.filter(([, options]) => JSON.parse(options.body).action === 'edit')).toHaveLength(0)
    await click(button('Edit your business'))
    await typeAnswer('A furniture workshop')
    await click(button('Save correction'))
    expect(container.querySelector('[aria-label="Review your answers"]')?.textContent).toContain('A furniture workshop')
    expect(input('I have reviewed').checked).toBe(false)
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })
  it('does not present fallback acknowledgements as AI understanding', async () => {
    const session = recordAnswer(createDiscovery('guided'), 'A local shop')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'token', session, question: nextQuestion(session), reviewItems: [], result: null }) }))
    await chooseApproach('guided')
    const understanding = container.querySelector('details[data-ai-understanding]') as HTMLDetailsElement
    expect(understanding.open).toBe(false)
    expect(understanding.textContent).toContain('AI understanding unavailable')
    expect(understanding.textContent).not.toContain(session.assistantMessage)
  })
  it.each(['back', 'pagination'] as const)('restores removable saved choices through %s and preserves the current draft', async entry => {
    let session = recordAnswer(createDiscovery('guided'), 'A local service business')
    session = recordAnswer(session, 'Too much manual work. Enquiries are getting lost. We lose hours daily.')
    let rejectEdit = true
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'edit') {
        if (rejectEdit) return { ok: false, status: 503, json: async () => ({ error: 'Please retry this save.' }) }
        session = editFact(session, body.field, body.value)
      }
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await click(button('WhatsApp and spreadsheets'))
    await typeAnswer('Keep this current-question draft')
    if (entry === 'back') await click(container.querySelector<HTMLButtonElement>('[aria-label="Back to previous question"]')!)
    else await click(button('2Main problemCompleted'))
    const editorId = 'guided-history-answer'
    expect(container.querySelector<HTMLTextAreaElement>(`#${editorId}`)?.value).toBe('We lose hours daily.')
    const editor = container.querySelector(`#${editorId}`)!.closest('form')!
    const remove = (name: string) => editor.querySelector<HTMLButtonElement>(`[aria-label="Remove ${name}"]`)!
    await click(remove('Too much manual work'))
    expect([...editor.querySelectorAll('[data-answer-suggestion]')].some(item => item.textContent === 'Too much manual work')).toBe(true)
    await click(remove('Enquiries are getting lost'))
    const suggestion = [...editor.querySelectorAll<HTMLButtonElement>('[data-answer-suggestion]')].find(item => item.textContent === 'Customers struggle to book or pay')!
    await click(suggestion)
    const save = () => button('Save and continue')
    await click(save())
    expect(container.textContent).toContain('Please retry this save.')
    expect(container.querySelector<HTMLTextAreaElement>(`#${editorId}`)?.value).toBe('We lose hours daily.')
    expect(remove('Customers struggle to book or pay')).not.toBeNull()
    rejectEdit = false
    await click(save())
    const payload = JSON.parse(fetcher.mock.calls.at(-1)![1].body)
    expect(payload).toMatchObject({ action: 'edit', field: 'pain', value: 'Customers struggle to book or pay. We lose hours daily.' })
    expect(container.querySelector<HTMLTextAreaElement>('#discovery-answer')?.value).toBe('Keep this current-question draft')
    expect(container.querySelector('[aria-label="Remove WhatsApp and spreadsheets"]')).not.toBeNull()
  })
  it('prevents empty and overlong revisions and keeps constraints suggestions exclusive', async () => {
    let session = createDiscovery('guided')
    for (const answer of ['A shop', 'Manual work', 'Spreadsheets', 'Automate follow-ups', 'Our staff', 'No existing systems or special requirements']) session = recordAnswer(session, answer)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'token', session, question: nextQuestion(session), reviewItems: [], result: null }) }))
    await chooseApproach('guided')
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Back to previous question"]')!)
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Remove No existing systems or special requirements"]')!)
    expect(button('Save and continue').disabled).toBe(true)
    await click(button('Connect WhatsApp'))
    expect(button('Save and continue').disabled).toBe(false)
    await click(button('No existing systems or special requirements'))
    expect(container.querySelector('[aria-label="Remove Connect WhatsApp"]')).toBeNull()
    await typeAnswer('a'.repeat(2000))
    expect(button('Save and continue').disabled).toBe(true)
  })
  it('uses one forward action when revisiting question one and preserves the current draft', async () => {
    let session = createDiscovery('guided')
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'answer') session = recordAnswer(session, body.answer)
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    expect(container.textContent).not.toContain('Return to current question')
    await typeAnswer('A service business helping local customers')
    await click(button('Continue'))
    await typeAnswer('Keep this unsent second answer')
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Back to previous question"]')!)
    expect(container.textContent).toContain('EARLIER QUESTION')
    expect(container.textContent).not.toContain('Return to current question')
    const form = container.querySelector('form')!
    expect([...form.querySelectorAll('button')].map(item => item.textContent)).toEqual(['Save and continue'])
    expect(form.lastElementChild?.textContent).toBe('Save and continue')
    await click(button('Save and continue'))
    expect(container.querySelector('textarea')?.value).toBe('Keep this unsent second answer')
  })
  it('keeps the scrollbar in an inner region clipped by the rounded frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    const frame = container.querySelector('[data-planner-frame]')!
    const scrollRegion = container.querySelector('[role="region"][aria-label="Your solution plan"]')!
    expect(scrollRegion.parentElement).toBe(frame)
    expect(scrollRegion.getAttribute('tabindex')).toBe('0')
    expect(container.textContent).toContain('Section 1 of 3')
    expect(container.textContent).not.toContain('of 5 steps complete')
  })
  it('keeps milestone labels visible and scopes question counts to the active panel', async () => {
    let session = createDiscovery('guided')
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'answer') session = recordAnswer(session, body.answer)
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    const milestones = () => [...container.querySelectorAll('ol[aria-label="Steps to your estimate"] li')]
    expect(milestones().map(item => item.textContent)).toEqual(['Requirements at 58% — current', 'Your solution at 83% — upcoming', 'Estimate at 100% — upcoming'])
    const stepLabel = [...container.querySelectorAll('p')].find(item => item.textContent === 'Section 1 of 3')!
    expect(stepLabel.classList.contains('sr-only')).toBe(false)
    const panel = container.querySelector('form')!
    expect(panel.textContent).toContain('Question 1 of 7')
    expect(container.querySelector('[role="progressbar"]')?.parentElement?.textContent).not.toContain('Question 1 of 7')
    for (let index = 1; index <= 7; index++) {
      await typeAnswer(`Business answer ${index}`)
      await click(button('Continue'))
      if (index === 3) expect(percent()).toBe('25')
    }
    expect(percent()).toBe('58')
    expect(container.textContent).toContain('Section 2 of 3')
    expect(milestones()[0].textContent).toBe('Requirements at 58% — completed')
    expect(milestones()[1].getAttribute('aria-current')).toBe('step')
    expect(container.textContent).not.toContain('Question 7 of 7')
    await choosePlaces(); await chooseFeatures(); await review()
    expect(container.textContent).toContain('Section 3 of 3')
    expect(milestones()[1].textContent).toBe('Your solution at 83% — completed')
    expect(milestones()[2].getAttribute('aria-current')).toBe('step')
    await click(button('Edit features'))
    expect(container.textContent).toContain('Section 2 of 3')
    expect(milestones()[2].textContent).toBe('Estimate at 100% — upcoming')
  })
  it.each([null, {}, { session: null }, 'not a response'])('preserves the question, draft and progress for malformed next-step data: %j', async data => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('guided') }).mockResolvedValueOnce({ ok: true, json: async () => data })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('Keep this exact answer')
    const before = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    await click(button('Continue'))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('invalid response')
    expect(container.querySelector('textarea')?.value).toBe('Keep this exact answer')
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[0].text)
    expect(percent()).toBe('0')
    expect(button('Continue').disabled).toBe(false)
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before)
  })
  it('advances just one question after a failed request is retried', async () => {
    const start = response('guided')
    const session = recordAnswer(start.session, 'A small studio')
    const next = { ...start, token: 'next-token', session, question: nextQuestion(session) }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => start })
      .mockRejectedValueOnce(new TypeError('Load failed')).mockResolvedValueOnce({ ok: true, json: async () => next })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('A small studio')
    await click(button('Continue'))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[1].text)
    expect(container.querySelector('textarea')?.value).toBe('')
    expect(container.textContent).toContain('Question 2 of 7')
    expect(percent()).toBe('8')
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[2][1].body)
    expect(start.session.revision).toBe(0)
    expect(start.session.facts).toEqual({})
  })
  it.each(['request', 'response'])('preserves question four and three saved topics through Load failed during %s, then retries the same snapshot', async failureAt => {
    let session = createDiscovery('guided')
    let failures = 2
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'answer') {
        if (session.revision === 3 && failures-- > 0) {
          if (failureAt === 'response') return { ok: true, json: async () => { throw new TypeError('Load failed') } }
          throw new TypeError('Load failed')
        }
        session = recordAnswer(session, body.answer)
      }
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    for (const answer of ['We build mobile apps', 'Enquiries get lost', 'We use spreadsheets']) {
      await typeAnswer(answer)
      await click(button('Continue'))
    }
    const answer = 'Integrate APIs, test Android and iOS, deploy the app, and provide ongoing support.'
    await typeAnswer(answer)
    const before = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    await click(button('Continue'))
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[3].text)
    expect(container.querySelector('textarea')?.value).toBe(answer)
    expect(container.textContent).toContain('Question 4 of 7')
    expect(container.textContent).toContain('3 of 7 questions completed')
    expect(percent()).toBe('25')
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before)
    expect(session.revision).toBe(3)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Your current input is still here')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Network connection problem')
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain('Load failed')
    expect(button('Continue').disabled).toBe(false)
    await click(button('Continue'))
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[4].text)
    expect(session.revision).toBe(4)
    expect(session.messages.filter(message => message.role === 'user')).toHaveLength(4)
    expect(fetcher.mock.calls.slice(-3).map(call => JSON.parse(call[1].body))).toEqual(Array(3).fill({ action: 'answer', token: 'token-3', revision: 3, answer }))
  })
  it('shows a distinct timeout message and preserves the answer after 25 seconds', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('guided') })
      .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('Keep my answer when the server takes too long')
    vi.useFakeTimers()
    await click(button('Continue'))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await act(async () => { await vi.advanceTimersByTimeAsync(25000) })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('The request took too long')
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain('Network connection problem')
    expect(container.querySelector('textarea')?.value).toBe('Keep my answer when the server takes too long')
    expect(button('Continue').disabled).toBe(false)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('downloads the confirmed server estimate and displays export failures', async () => {
    const confirmed = response('manual')
    confirmed.session.stage = 'confirmed'
    confirmed.session.scope = { ...emptyScope(), surfaceIds: ['website', 'mobile'] }
    confirmed.result = estimateSolution(confirmed.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => confirmed }))
    await chooseApproach('manual')
    await click(button('Download PDF estimate'))
    expect(pdfMock.create).toHaveBeenCalledWith(confirmed)
    expect(pdfMock.save).toHaveBeenCalledWith('exter-cloud-solution-estimate.pdf')
    pdfMock.create.mockRejectedValueOnce(new Error('The estimate logo could not be loaded. Please retry the download.'))
    await click(button('Download PDF estimate'))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('logo could not be loaded')
    expect(button('Download PDF estimate').disabled).toBe(false)
  })
  it('hands off original platform answers even if the AI summary is narrower', () => {
    const view = response('guided')
    const answer = 'I think I need a website and mobile app for my customers.'
    view.session.messages = [{ role: 'assistant', text: QUESTIONS.find(question => question.id === 'users')!.text }, { role: 'user', text: answer }]
    view.session.facts.users = { value: 'Customers need a website', evidence: 'website', status: 'reported', source: 'ai' }
    expect(proposalSummary(view)).toContain(`${answer} [original customer answer]`)
    expect(proposalSummary(view)).toContain('Assistant summary: Customers need a website')
    expect(proposalSummary(view)).toContain('Question: Who will use the solution')
  })
  it('does not create broken contact links when numbers are unconfigured', async () => {
    const confirmed = response('manual')
    confirmed.session.stage = 'confirmed'
    confirmed.session.scope = { ...emptyScope(), surfaceIds: ['website'] }
    confirmed.result = estimateSolution(confirmed.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => confirmed }))
    await chooseApproach('manual')
    expect(button('Call our consultant').disabled).toBe(true)
    expect(button('WhatsApp our consultant').disabled).toBe(true)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect([...container.querySelectorAll('button')].some(item => /Request.*call/.test(item.textContent ?? ''))).toBe(false)
  })
  it('keeps Call, WhatsApp and PDF available without exposing paused callback actions', async () => {
    const draft = response('manual')
    const confirmed = response('manual')
    confirmed.session.stage = 'confirmed'
    confirmed.session.scope = { ...emptyScope(), surfaceIds: ['website'] }
    confirmed.result = estimateSolution(confirmed.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => draft }).mockResolvedValueOnce({ ok: true, json: async () => confirmed }))
    await act(async () => { root.render(<SolutionDiscovery contactLinks={{ call: 'tel:+919876543210', whatsapp: 'https://wa.me/919876543210?text=Hello' }} />) })
    await chooseApproach('manual')
    await choosePlaces(); await chooseFeatures(); await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    expect(container.querySelector('a[href="tel:+919876543210"]')?.textContent).toBe('Call our consultant')
    expect(container.querySelector('a[href^="https://wa.me/"]')?.textContent).toBe('WhatsApp our consultant')
    expect(button('Download PDF estimate')).toBeTruthy()
    expect(button('Edit solution')).toBeTruthy()
    expect([...container.querySelectorAll('button')].some(item => /Request.*call/.test(item.textContent ?? ''))).toBe(false)
    expect(modalMock).not.toHaveBeenCalled()
    await click(button('Download PDF estimate'))
    expect(pdfMock.create).toHaveBeenCalledWith(confirmed)
  })
  it('accepts untouched valid defaults and never submits unchecked options', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    expect([...container.querySelectorAll('input[type="checkbox"]')].every(item => !(item as HTMLInputElement).checked)).toBe(true)
    expect(percent()).toBe('0')
    await choosePlaces()
    await chooseFeatures()
    await review()
    expect(percent()).toBe('60')
    expect(container.textContent).toContain('Your choices, including defaults you kept.')
    expect(container.textContent).not.toContain('not reported discovery answers')
    await click(input('I have reviewed'))
    expect(percent()).toBe('80')
    expect(button('Confirm my plan and see estimate').disabled).toBe(false)
    await click(button('Confirm my plan and see estimate'))
    expect(JSON.parse(fetcher.mock.calls[1][1].body).scope).toEqual({ ...emptyScope(), surfaceIds: ['website'] })
  })
  it('requires a payment type and permits unresolved CRM only with explicit partial consent', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures(['Payments'])
    await click(input('Connect your current customer system'))
    const followUps = [...container.querySelectorAll('select')].filter(item => item.value === 'undecided')
    expect(followUps).toHaveLength(1)
    for (const select of followUps) {
      expect(select.selectedOptions[0].textContent).toBe('Not decided yet')
      expect(select.getAttribute('aria-describedby')).toBe('scope-followup-hint')
    }
    expect(button('Review these details').disabled).toBe(true)
    expect(input('One-time payments').checked).toBe(false)
    expect(input('Recurring subscriptions').checked).toBe(false)
    await click(input('One-time payments'))
    await review()
    expect(container.querySelector('[aria-label="Your selected plan"]')?.textContent).toContain('Needs discussion · not priced in a partial estimate: Connect your current customer system')
    await click(input('Leave these unanswered'))
    await click(input('I have reviewed'))
    expect(button('Confirm and estimate selected work only').disabled).toBe(false)
    await click(button('Confirm and estimate selected work only'))
    const body = JSON.parse(fetcher.mock.calls[1][1].body)
    expect(body.scope.billing).toBe('one_time')
    expect(body.scope.crmProvider).toBe('undecided')
    expect(body.allowPartial).toBe(true)
  })
  it('clears a hidden payment answer and consent when that feature is removed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures(['Payments'])
    await click(input('Recurring subscriptions'))
    await review()
    await click(input('I have reviewed'))
    await click(button('Edit features'))
    await click(input('Payments'))
    await click(input('Payments'))
    await click(button('Continue to details'))
    expect(input('One-time payments').checked).toBe(false)
    expect(input('Recurring subscriptions').checked).toBe(false)
    expect(button('Review these details').disabled).toBe(true)
    await click(input('One-time payments'))
    await review()
    expect(input('I have reviewed').checked).toBe(false)
  })
  it('clears hidden customer-system answers and partial consent on scope changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures(['Payments'])
    await click(input('One-time payments'))
    await click(input('Connect your current customer system'))
    await click(input('Connect another tool'))
    const select = [...container.querySelectorAll('select')].find(item => item.closest('label')?.textContent?.includes('Which customer system'))!
    await act(async () => { select.value = 'zoho'; select.dispatchEvent(new Event('change', { bubbles: true })) })
    await review()
    await click(input('Leave these unanswered'))
    await click(input('I have reviewed'))
    await click(button('Edit details'))
    await click(input('Connect your current customer system'))
    await click(input('Connect your current customer system'))
    const restored = [...container.querySelectorAll('select')].find(item => item.closest('label')?.textContent?.includes('Which customer system'))!
    expect(restored.value).toBe('undecided')
    await review()
    expect(input('I have reviewed').checked).toBe(false)
    expect(input('Leave these unanswered').checked).toBe(false)
  })
  it('describes chosen defaults without inventing answers to unresolved details in proposals', () => {
    const view = response('manual')
    expect(proposalSummary(view)).toContain('Estimate settings (draft choices; defaults may be kept)')
    expect(proposalSummary(view)).toContain('Payment method: Not applicable')
    expect(proposalSummary(view)).not.toContain('billing: undecided')
    view.session.scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['payments'] }
    view.session.stage = 'confirmed'
    expect(proposalSummary(view)).toContain('Estimate settings (chosen preferences, including defaults kept)')
    expect(proposalSummary(view)).toContain('Payment method: Not decided yet')
    expect(proposalSummary(view)).not.toContain('not discovery answers')
  })
  it('loads without a hidden model request', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect(button('Guide me')).toBeTruthy()
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('preselects supported SEO, logins, reporting and AI assistance without unrelated features', async () => {
    const answer = 'We need a website found on Google. Staff need secure logins and monthly sales reports. An AI assistant should draft replies.'
    let session = createDiscovery('guided')
    for (const text of ['A shop', 'Manual work', 'WhatsApp', answer, 'Staff', 'No special requirements', 'Start small']) session = recordAnswer(session, text)
    const output = validateAgentOutput({ acknowledgment: 'Reviewed.', facts: [], recommendations: [
      { group: 'surfaceIds', id: 'website', evidence: answer, reason: 'Public business information.' },
      { group: 'surfaceIds', id: 'admin', evidence: answer, reason: 'Staff workspace.' },
      ...['seo', 'accounts', 'reports', 'ai'].map(id => ({ group: 'capabilityIds', id, evidence: answer, reason: 'Requested functionality.' })),
    ], excludedCapabilities: [], reviewItems: [] }, answer)
    session = applyAgentOutput(session, output)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'all-features', session, question: null, reviewItems: [], result: null }) }))
    await chooseApproach('guided')
    await click(button('Continue to features'))
    for (const label of ['Help customers find your website', 'Customer and staff logins', 'Business reports', 'AI help for everyday tasks']) expect(input(label).checked).toBe(true)
    for (const label of ['Track customers and follow-ups', 'Booking and scheduling', 'Payments']) expect(input(label).checked).toBe(false)
  })
  it('shows guided customer tracking checked and preserves a later customer deselection on resume', async () => {
    const text = 'We want to use a website to track customers and follow-ups.'
    let session = createDiscovery('guided')
    for (const answer of ['A repair shop', 'Lost enquiries', 'WhatsApp', text, 'Our staff', 'No special requirements', 'Start small']) session = recordAnswer(session, answer)
    session = applyAgentOutput(session, { acknowledgment: 'Track enquiries and follow-ups.', facts: [], recommendations: [{ group: 'capabilityIds', id: 'crm', reason: 'Organise follow-ups.', evidence: text }], reviewItems: [] })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'guided-crm', session, question: null, reviewItems: [], result: null }) }))
    await chooseApproach('guided')
    await click(button('Continue to features'))
    expect(input('Track customers and follow-ups').checked).toBe(true)
    await remount()
    expect(input('Track customers and follow-ups').checked).toBe(true)
    await click(input('Track customers and follow-ups'))
    await remount()
    expect(input('Track customers and follow-ups').checked).toBe(false)
  })
  it('supports simultaneous website, portal, mobile and CRM scope with explicit approval', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces(['Public website', 'Online workspace', 'Mobile app'])
    await chooseFeatures(['Track customers and follow-ups'])
    await review()
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
    const selectedPlan = container.querySelector('[aria-label="Your selected plan"]')!
    expect(selectedPlan.textContent).toContain('Track customers and follow-ups')
    for (const place of ['Public website', 'Online workspace', 'Mobile app']) expect(selectedPlan.textContent).toContain(place)
    expect(container.textContent).not.toContain('0 of 7')
    const approval = [...container.querySelectorAll('label')].find(item => item.textContent?.includes('I have reviewed'))?.querySelector('input')
    await click(approval!)
    await click(button('Confirm my plan and see estimate'))
    const body = JSON.parse(fetcher.mock.calls[1][1].body)
    expect(body.scope.surfaceIds).toEqual(['website', 'portal', 'mobile'])
    expect(body.scope.capabilityIds).toEqual(['crm'])
    expect(body.confirmed).toBe(true)
    expect(body.scope.rate).toBeUndefined()
  })
  it('explains a missing dependency and keeps confirmation disabled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    await choosePlaces(['Online workspace'])
    const seo = [...container.querySelectorAll('label')].find(item => item.textContent?.includes('Help customers find your website'))?.querySelector('input')
    await click(seo!)
    expect(button('Continue to details').disabled).toBe(true)
    expect(container.querySelector('[aria-label="Selection conflicts"]')?.textContent).toContain('Fix this before continuing')
    await click(button('Add Public website'))
    expect(input('Help customers find your website').checked).toBe(true)
    await click(button('Continue to details'))
    await review()
    expect(container.querySelector('[aria-label="Selection conflicts"]')).toBeNull()
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })
  it('shows a recoverable connection error and preserves the typed answer', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('guided') }).mockRejectedValue(new TypeError('Load failed'))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    const textarea = container.querySelector('textarea')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'A small studio')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(button('Continue'))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Your current input is still here')
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(textarea.value).toBe('A small studio')
  })
  it('labels unresolved items in proposal summaries and keeps scope-only pricing separate', () => {
    const scope = { ...emptyScope(), surfaceIds: ['website'] as const }
    const view = response('manual')
    view.session = { ...view.session, stage: 'confirmed', allowPartial: true, scope: { ...scope, surfaceIds: [...scope.surfaceIds] } }
    view.reviewItems = ['Legacy migration needs review']
    view.result = estimateSolution(view.session.scope)
    expect(proposalSummary(view)).toContain('PARTIAL')
    expect(proposalSummary(view)).toContain('Legacy migration needs review')
    expect(proposalSummary(view)).not.toMatch(/\/hour|\/hr/)
    expect(proposalSummary(view)).toContain('Standard build range:')
  })
  it('keeps the largest discovery summary within the shared contact limit', () => {
    const view = response('guided')
    for (const id of ['business', 'pain', 'current', 'workflow', 'users', 'constraints', 'priority'] as const) view.session.facts[id] = { value: 'x'.repeat(2000), evidence: 'x'.repeat(2000), status: 'reported', source: 'answer' }
    view.reviewItems = Array.from({ length: 56 }, (_, index) => `${index}: ${'x'.repeat(295)}`)
    expect(proposalSummary(view).length).toBeLessThan(CONTACT_MESSAGE_MAX)
  })
  it('announces progress without treating uncertain answers as confirmed requirements', async () => {
    const view = response('guided')
    view.session.facts.business = { value: 'I’m not sure yet', evidence: 'I’m not sure yet', status: 'unknown', source: 'answer' }
    view.question = nextQuestion(view.session)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => view }))
    await chooseApproach('guided')
    const progress = container.querySelector('[role="progressbar"]')!
    expect(progress.getAttribute('aria-valuenow')).toBe('8')
    expect(progress.getAttribute('aria-valuetext')).toContain('needs clarification')
    expect(container.querySelector('nav[aria-label="Discovery questions"]')?.textContent).toContain('Needs clarification')
    expect(container.querySelector('aside')).toBeNull()
  })
  it('opens optional connections initially and allows collapse without clearing choices', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    const optional = [...container.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent?.startsWith('Connections and extra needs'))!
    expect(optional.open).toBe(true)
    await act(async () => { optional.open = false; optional.dispatchEvent(new Event('toggle')) })
    expect(optional.open).toBe(false)
    await act(async () => { optional.open = true; optional.dispatchEvent(new Event('toggle')) })
    const whatsapp = [...optional.querySelectorAll('label')].find(item => item.textContent?.includes('WhatsApp connection'))?.querySelector('input')
    await click(whatsapp!)
    expect(optional.querySelector('summary')?.textContent).toContain('1 selected')
    expect(percent()).toBe('40')
  })

  it('preserves independent progress, section and typed inputs across repeated switches', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) }))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('A bakery with a small team')
    expect(percent()).toBe('0')
    await chooseApproach('manual')
    expect(percent()).toBe('0')
    await choosePlaces()
    expect(percent()).toBe('20')
    await chooseApproach('guided')
    expect(percent()).toBe('0')
    expect(container.querySelector('textarea')?.value).toBe('A bakery with a small team')
    await chooseApproach('manual')
    expect(percent()).toBe('20')
    expect(button('Continue to details')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(2)
    const store = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!)
    expect(store.drafts.guided.answer).toBe('A bakery with a small team')
    expect(store.drafts.manual.scope.surfaceIds).toEqual(['website'])
    expect(store.drafts.manual).not.toHaveProperty('approved')
    expect(store.drafts.manual).not.toHaveProperty('result')
  })

  it('requires an explicit no-extras choice and credits defaults only after review', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await chooseApproach('manual')
    expect(button('Continue to features').disabled).toBe(true)
    await choosePlaces()
    expect(button('Continue to details').disabled).toBe(true)
    await chooseFeatures()
    expect(percent()).toBe('40')
    expect([...container.querySelectorAll('select')].map(item => item.value)).toEqual(['standard', 'standard'])
    await review()
    expect(percent()).toBe('60')
  })

  it('recovers unconfirmed local choices after server restore without restoring approval', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ action: 'restore', token: 'manual-token' })
    expect(container.textContent).toContain('Public website')
    expect(percent()).toBe('60')
    expect(input('I have reviewed').checked).toBe(false)
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })

  it('locks switching while a request is pending and rejects a mismatched response', async () => {
    let finish!: (response: unknown) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve })))
    await chooseApproach('guided')
    expect(button('Build my own plan').disabled).toBe(true)
    await act(async () => { finish({ ok: true, json: async () => response('manual') }) })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('approach changed unexpectedly')
    expect(percent()).toBe('0')
  })

  it('only reaches 100 after a server-confirmed estimate, and can revisit the other draft', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      const view = response(body.mode ?? 'manual')
      if (body.action === 'confirm') {
        view.session = { ...view.session, scope: body.scope, stage: 'confirmed' }
        view.result = estimateSolution(body.scope)
      }
      return { ok: true, json: async () => view }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('My saved draft')
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    expect(percent()).toBe('80')
    await click(button('Confirm my plan and see estimate'))
    expect(percent()).toBe('100')
    expect([...container.querySelectorAll('ol[aria-label="Steps to your estimate"] li')].every(item => item.textContent?.includes('— completed'))).toBe(true)
    expect(container.textContent).toContain('Your estimated project cost')
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('My saved draft')
    await chooseApproach('manual')
    expect(percent()).toBe('100')
  })

  it('preserves the review and never reports completion when confirmation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Session expired' }) }))
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    expect(percent()).toBe('80')
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Session expired')
    expect(container.textContent).not.toContain('Your estimated project cost')
  })

  it.each([false, true])('opens the top pen edit action at review with choices retained (partial: %s)', async partial => {
    const initial = response('manual')
    initial.session.scope = { ...emptyScope(), surfaceIds: ['website'], integrationIds: partial ? ['existing_crm'] : [] }
    initial.session.stage = 'confirmed'
    initial.session.allowPartial = partial
    initial.result = estimateSolution(reviewScope(initial.session.scope).pricedScope)
    const edited = { ...initial, session: { ...initial.session, stage: 'review' as const, allowPartial: false }, result: null }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockResolvedValueOnce({ ok: true, json: async () => edited })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    expect(percent()).toBe('100')
    const edit = button('Edit solution')
    expect([...container.querySelectorAll('button')].filter(item => item.textContent === 'Edit solution')).toHaveLength(1)
    expect(edit.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(edit.compareDocumentPosition(button('Download PDF estimate')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await click(edit)
    expect(JSON.parse(fetcher.mock.calls[1][1].body).action).toBe('review')
    expect(container.querySelector('h2')?.textContent).toBe('Review your plan')
    expect(percent()).toBe('60')
    expect(input('I have reviewed').checked).toBe(false)
    if (partial) expect(input('Leave these unanswered').checked).toBe(false)
    expect(container.textContent).not.toContain('Your estimated project cost')
    expect(container.textContent).not.toContain('Download PDF estimate')
    expect(container.textContent).toContain('Public website')
    await click(button('Edit details'))
    expect([...container.querySelectorAll('select')].map(item => item.value)).toEqual(partial ? ['undecided', 'standard', 'standard'] : ['standard', 'standard'])
    await review()
    if (partial) await click(input('Leave these unanswered'))
    await click(input('I have reviewed'))
    expect(button(partial ? 'Confirm and estimate selected work only' : 'Confirm my plan and see estimate').disabled).toBe(false)
  })

  it('keeps the existing estimate visible when opening edit fails', async () => {
    const initial = response('manual')
    initial.session.scope = { ...emptyScope(), surfaceIds: ['website'] }
    initial.session.stage = 'confirmed'
    initial.result = estimateSolution(initial.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockRejectedValue(new TypeError('Load failed')))
    await chooseApproach('manual')
    await click(button('Edit solution'))
    expect(percent()).toBe('100')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Your current input is still here')
    expect(container.textContent).toContain('Your estimated project cost')
    expect(button('Edit solution').disabled).toBe(false)
  })

  it('does not credit preselected suggestions until the customer reviews them', async () => {
    const view = response('guided')
    view.session.stage = 'review'
    view.session.scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: ['seo'] }
    view.question = null
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => view }))
    await chooseApproach('guided')
    expect(input('Public website').checked).toBe(true)
    expect(percent()).toBe('0')
    await click(button('Continue to features'))
    expect(input('Help customers find your website').checked).toBe(true)
    expect(percent()).toBe('8')
    await click(button('Continue to details'))
    await review()
    expect(percent()).toBe('25')
    expect(input('Leave these unanswered').checked).toBe(false)
  })

  it('recovers the inactive draft from storage after reloading and switching', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      return { ok: true, json: async () => response(body.mode ?? (body.token === 'guided-token' ? 'guided' : 'manual')) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('Saved in the other approach')
    await chooseApproach('manual')
    await choosePlaces()
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(percent()).toBe('20')
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('Saved in the other approach')
    expect(JSON.parse(fetcher.mock.calls[3][1].body)).toMatchObject({ action: 'restore', token: 'guided-token' })
  })

  it('restarts only the active approach and retains the other draft', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) }))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('Keep this answer')
    await chooseApproach('manual')
    await choosePlaces()
    await click(namedButton('Plan menu'))
    await click(button('Start a new build-your-own plan'))
    expect(percent()).toBe('0')
    expect(input('Public website').checked).toBe(false)
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('Keep this answer')
  })

  it('keeps in-memory drafts when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) })))
    await chooseApproach('guided')
    await typeAnswer('Private browser draft')
    await chooseApproach('manual')
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('Private browser draft')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('migrates an existing sealed-token draft only after server validation', async () => {
    sessionStorage.setItem('exter-discovery-v1', 'guided-token')
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('guided') })
    vi.stubGlobal('fetch', fetcher)
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: 'restore', token: 'guided-token' })
    expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).activeMode).toBe('guided')
    expect(sessionStorage.getItem('exter-discovery-v1')).toBeNull()
  })

  it('aborts a pending request on unmount and ignores a late response', async () => {
    let finish!: (response: unknown) => void
    const fetcher = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    const signal = fetcher.mock.calls[0][1].signal as AbortSignal
    await act(async () => { root.unmount() })
    expect(signal.aborted).toBe(true)
    await act(async () => { finish({ ok: true, json: async () => response('manual') }) })
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull()
    await act(async () => { root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(percent()).toBe('0')
  })

  it('stops retrying a rejected draft on refresh and opens either approach with retained unconfirmed inputs', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      return body.action === 'restore' ? invalidSession : { ok: true, json: async () => response(body.mode) }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('guided')
    await typeAnswer('Keep my unsent answer')
    await chooseApproach('manual')
    await choosePlaces()
    await remount()
    expect([...container.querySelectorAll('button')].some(item => item.textContent?.startsWith('Start a fresh '))).toBe(true)
    const recovery = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).drafts.manual
    expect(recovery).toMatchObject({ token: '', needsRestart: true, scope: { surfaceIds: ['website'] } })
    const calls = fetcher.mock.calls.length
    await remount()
    expect(fetcher).toHaveBeenCalledTimes(calls)
    await chooseApproach('manual')
    expect(container.querySelector('h2')?.textContent).toBe('Where will people use it?')
    expect(input('Public website').checked).toBe(true)
    expect(container.querySelector('[aria-label="Current approach"]')?.textContent).toContain('Build my own plan')
    expect(percent()).toBe('0')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('Keep my unsent answer')
    expect(container.querySelector('[aria-label="Current approach"]')?.textContent).toContain('Guide me')
    expect(container.querySelector('h2')?.textContent).toBe('Tell me a little about your business and the people you serve.')
    await chooseApproach('manual')
    expect(input('Public website').checked).toBe(true)
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('offers a fresh start when a legacy session is rejected, even with no loaded session', async () => {
    sessionStorage.setItem('exter-discovery-v1', 'invalid-old-token')
    const fetcher = vi.fn().mockResolvedValueOnce(invalidSession).mockResolvedValueOnce({ ok: true, json: async () => response('guided') })
    vi.stubGlobal('fetch', fetcher)
    await remount()
    expect(sessionStorage.getItem('exter-discovery-v1')).toBeNull()
    await freshSession()
    expect(container.querySelector('textarea')).not.toBeNull()
    expect(JSON.parse(fetcher.mock.calls[1][1].body).action).toBe('start')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not erase a saved draft or automatically start over for an outage', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'Temporarily unavailable' }) })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces()
    const before = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    await remount()
    expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).drafts.manual.scope.surfaceIds).toEqual(['website'])
    expect(before).not.toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(button('Try opening again').disabled).toBe(false)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Temporarily unavailable')
  })

  it('recovers a session rejected during confirmation without reusing price or approval', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValueOnce(invalidSession).mockResolvedValueOnce({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    await freshSession()
    expect(input('Public website').checked).toBe(true)
    expect(percent()).toBe('0')
    await click(button('Continue to features'))
    await chooseFeatures()
    await review()
    expect(input('I have reviewed').checked).toBe(false)
    expect(container.textContent).not.toContain('Your estimated project cost')
  })

  it('opens the selected form after an inactive stored draft is rejected, with just one fresh start', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'restore' && body.token === 'manual-token') return invalidSession
      return { ok: true, json: async () => response(body.mode ?? 'guided') }
    })
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await choosePlaces()
    await chooseApproach('guided')
    await typeAnswer('Still here')
    await remount()
    await chooseApproach('manual')
    const actions = fetcher.mock.calls.slice(-2).map(call => JSON.parse(call[1].body).action)
    expect(actions).toEqual(['restore', 'start'])
    expect(input('Public website').checked).toBe(true)
    expect(percent()).toBe('0')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await chooseApproach('guided')
    expect(container.querySelector('textarea')?.value).toBe('Still here')
  })

  it('keeps both approach controls locked until a fresh session response arrives', async () => {
    let finish!: (value: unknown) => void
    const fetcher = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetcher)
    await chooseApproach('manual')
    await chooseApproach('guided')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(button('Guide me').disabled).toBe(true)
    await act(async () => { finish({ ok: true, json: async () => response('manual') }) })
    expect(container.querySelector('h2')?.textContent).toBe('Where will people use it?')
    expect(container.querySelector('[aria-label="Current approach"]')?.textContent).toContain('Build my own plan')
    expect(namedButton('Plan menu').disabled).toBe(false)
  })
})
