import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const modalMock = vi.hoisted(() => vi.fn((_props: Record<string, unknown>) => null))
const pdfMock = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }))
vi.mock('../components/QueryModal', () => ({ default: modalMock }))
vi.mock('../utils/estimatePdf', () => ({ createEstimatePdf: pdfMock.create }))
import SolutionDiscovery, { proposalSummary, type DiscoveryResponse } from '../components/SolutionDiscovery'
import { QUESTIONS, createDiscovery, nextQuestion, recordAnswer } from '../utils/discovery'
import { emptyScope, estimateSolution, reviewScope } from '../utils/solutionCatalog'
import { CONTACT_MESSAGE_MAX } from '../utils/contactLimits'
import { DRAFT_STORAGE_KEY } from '../utils/discoveryDraft'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
function response(mode: 'manual' | 'guided'): DiscoveryResponse {
  const session = createDiscovery(mode)
  return { token: `${mode}-token`, session, question: nextQuestion(session), reviewItems: [], result: null }
}
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll('button')].find(item => item.textContent === name)
  if (!found) throw new Error(`Button not found: ${name}`)
  return found
}
function input(label: string): HTMLInputElement {
  const found = [...container.querySelectorAll('label')].find(item => item.textContent?.includes(label))?.querySelector('input')
  if (!found) throw new Error(`Input missing: ${label}`)
  return found
}
async function click(target: HTMLElement) { await act(async () => { target.click() }) }
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
function percent() { return container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') }
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
})
describe('discovery interface', () => {
  it('keeps milestone labels visible and scopes question counts to the active panel', async () => {
    let session = createDiscovery('guided')
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'answer') session = recordAnswer(session, body.answer)
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
    const milestones = () => [...container.querySelectorAll('ol[aria-label="Steps to your estimate"] li')]
    expect(milestones().map(item => item.textContent)).toEqual(['1Requirements — current', '2Plan Selection — upcoming', '3Estimate — upcoming'])
    const stepLabel = [...container.querySelectorAll('p')].find(item => item.textContent === 'Step 1 of 3')!
    expect(stepLabel.classList.contains('sr-only')).toBe(false)
    const panel = container.querySelector('form')!
    expect(panel.textContent).toContain('Question 1 of 7')
    expect(container.querySelector('[role="progressbar"]')?.parentElement?.textContent).not.toContain('Question 1 of 7')
    for (let index = 1; index <= 7; index++) {
      await typeAnswer(`Business answer ${index}`)
      await click(button('Continue'))
      if (index === 3) expect(percent()).toBe('14')
    }
    expect(percent()).toBe('33')
    expect(container.textContent).toContain('Step 2 of 3')
    expect(milestones()[0].textContent).toBe('✓Requirements — completed')
    expect(milestones()[1].getAttribute('aria-current')).toBe('step')
    expect(container.textContent).not.toContain('Question 7 of 7')
    await choosePlaces(); await chooseFeatures(); await review()
    expect(container.textContent).toContain('Step 3 of 3')
    expect(milestones()[1].textContent).toBe('✓Plan Selection — completed')
    expect(milestones()[2].getAttribute('aria-current')).toBe('step')
    await click(button('Edit features'))
    expect(container.textContent).toContain('Step 2 of 3')
    expect(milestones()[2].textContent).toBe('3Estimate — upcoming')
  })
  it.each([null, {}, { session: null }, 'not a response'])('preserves the question, draft and progress for malformed next-step data: %j', async data => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('guided') }).mockResolvedValueOnce({ ok: true, json: async () => data })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
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
    await click(button('Guide me'))
    await typeAnswer('A small studio')
    await click(button('Continue'))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[1].text)
    expect(container.querySelector('textarea')?.value).toBe('')
    expect(container.textContent).toContain('Question 2 of 7')
    expect(percent()).toBe('5')
    expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[2][1].body)
    expect(start.session.revision).toBe(0)
    expect(start.session.facts).toEqual({})
  })
  it('preserves question four and three saved topics through Load failed, then retries the same snapshot', async () => {
    let session = createDiscovery('guided')
    let failures = 2
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      if (body.action === 'answer') {
        if (session.revision === 3 && failures-- > 0) throw new TypeError('Load failed')
        session = recordAnswer(session, body.answer)
      }
      return { ok: true, json: async () => ({ token: `token-${session.revision}`, session, question: nextQuestion(session), reviewItems: [], result: null }) }
    })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
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
    expect(container.textContent).toContain('3 of 7 topics covered')
    expect(percent()).toBe('14')
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before)
    expect(session.revision).toBe(3)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Your current input is still here')
    await click(button('Continue'))
    expect(container.querySelector('h2')?.textContent).toBe(QUESTIONS[4].text)
    expect(session.revision).toBe(4)
    expect(session.messages.filter(message => message.role === 'user')).toHaveLength(4)
    expect(fetcher.mock.calls.slice(-3).map(call => JSON.parse(call[1].body))).toEqual(Array(3).fill({ action: 'answer', token: 'token-3', revision: 3, answer }))
  })
  it('downloads the confirmed server estimate and displays export failures', async () => {
    const confirmed = response('manual')
    confirmed.session.stage = 'confirmed'
    confirmed.session.scope = { ...emptyScope(), surfaceIds: ['website', 'mobile'] }
    confirmed.result = estimateSolution(confirmed.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => confirmed }))
    await click(button('Build my own plan'))
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
    await click(button('Build my own plan'))
    expect(button('Call the team').disabled).toBe(true)
    expect(button('WhatsApp the team').disabled).toBe(true)
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
    expect(button('Request a team call').disabled).toBe(false)
  })
  it('keeps estimate actions and exposes Call, WhatsApp and a summary-backed team-call request', async () => {
    const draft = response('manual')
    const confirmed = response('manual')
    confirmed.session.stage = 'confirmed'
    confirmed.session.scope = { ...emptyScope(), surfaceIds: ['website'] }
    confirmed.result = estimateSolution(confirmed.session.scope)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => draft }).mockResolvedValueOnce({ ok: true, json: async () => confirmed }))
    await act(async () => { root.render(<SolutionDiscovery contactLinks={{ call: 'tel:+919876543210', whatsapp: 'https://wa.me/919876543210?text=Hello' }} />) })
    await click(button('Build my own plan'))
    await choosePlaces(); await chooseFeatures(); await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    expect(container.querySelector('a[href="tel:+919876543210"]')?.textContent).toBe('Call the team')
    expect(container.querySelector('a[href^="https://wa.me/"]')?.textContent).toBe('WhatsApp the team')
    expect(button('Download PDF estimate')).toBeTruthy()
    expect(button('Edit solution')).toBeTruthy()
    await click(button('Request a team call'))
    expect(modalMock.mock.lastCall?.[0]).toMatchObject({ open: true, purpose: 'callback', initialMessage: expect.stringContaining('Public website') })
    await click(button('Request a detailed proposal'))
    expect(modalMock.mock.lastCall?.[0]).toMatchObject({ purpose: 'query' })
  })
  it('accepts untouched valid defaults and never submits unchecked options', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    expect([...container.querySelectorAll('input[type="checkbox"]')].every(item => !(item as HTMLInputElement).checked)).toBe(true)
    expect(percent()).toBe('0')
    await choosePlaces()
    await chooseFeatures()
    await review()
    expect(percent()).toBe('67')
    expect(container.textContent).toContain('Your choices, including defaults you kept.')
    expect(container.textContent).not.toContain('not reported discovery answers')
    await click(input('I have reviewed'))
    expect(percent()).toBe('95')
    expect(button('Confirm my plan and see estimate').disabled).toBe(false)
    await click(button('Confirm my plan and see estimate'))
    expect(JSON.parse(fetcher.mock.calls[1][1].body).scope).toEqual({ ...emptyScope(), surfaceIds: ['website'] })
  })
  it('keeps undecided payment and CRM defaults and offers explicit partial confirmation', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures(['Payments'])
    await click(input('Connect your current customer system'))
    const followUps = [...container.querySelectorAll('select')].filter(item => item.value === 'undecided')
    expect(followUps).toHaveLength(2)
    for (const select of followUps) {
      expect(select.selectedOptions[0].textContent).toBe('Not decided yet')
      expect(select.getAttribute('aria-describedby')).toBe('scope-followup-hint')
    }
    await review()
    expect(container.textContent).toContain('Payments are not included')
    expect(container.querySelector('[aria-label="Your selected choices — scroll to review"]')?.textContent?.match(/Needs discussion · not priced/g)).toHaveLength(2)
    await click(input('Leave these unanswered'))
    await click(input('I have reviewed'))
    expect(button('Confirm and estimate selected work only').disabled).toBe(false)
    await click(button('Confirm and estimate selected work only'))
    const body = JSON.parse(fetcher.mock.calls[1][1].body)
    expect(body.scope.billing).toBe('undecided')
    expect(body.scope.crmProvider).toBe('undecided')
    expect(body.allowPartial).toBe(true)
  })
  it('clears a hidden payment answer and consent when that feature is removed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures(['Payments'])
    const select = [...container.querySelectorAll('select')].find(item => item.closest('label')?.textContent?.includes('How will customers pay'))!
    await act(async () => { select.value = 'recurring'; select.dispatchEvent(new Event('change', { bubbles: true })) })
    await review()
    await click(input('I have reviewed'))
    await click(button('Edit features'))
    await click(input('Payments'))
    await click(input('Payments'))
    await click(button('Continue to details'))
    const restored = [...container.querySelectorAll('select')].find(item => item.closest('label')?.textContent?.includes('How will customers pay'))!
    expect(restored.value).toBe('undecided')
    await review()
    expect(input('I have reviewed').checked).toBe(false)
  })
  it('clears hidden customer-system answers and partial consent on scope changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures(['Payments'])
    await click(input('Connect your current customer system'))
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
  it('supports simultaneous website, portal, mobile and CRM scope with explicit approval', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await choosePlaces(['Public website', 'Online workspace', 'Mobile app'])
    await chooseFeatures(['Track customers and follow-ups'])
    await review()
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
    const selectedPlan = container.querySelector('[aria-label="Your selected choices — scroll to review"]')!
    expect(selectedPlan.textContent).toContain('Track customers and follow-ups')
    expect(container.textContent).toContain('4 selected')
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
    await click(button('Build my own plan'))
    await choosePlaces(['Online workspace'])
    const seo = [...container.querySelectorAll('label')].find(item => item.textContent?.includes('Help customers find your website'))?.querySelector('input')
    await click(seo!)
    await click(button('Continue to details'))
    await review()
    expect(container.textContent).toContain('Choose a public website before adding search-engine setup.')
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })
  it('shows a recoverable connection error and preserves the typed answer', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('guided') }).mockRejectedValue(new TypeError('Load failed'))
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
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
    expect(proposalSummary(view)).toContain('₹240/hour')
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
    await click(button('Guide me'))
    const progress = container.querySelector('[role="progressbar"]')!
    expect(progress.getAttribute('aria-valuenow')).toBe('5')
    expect(progress.getAttribute('aria-valuetext')).toContain('needs clarification')
    expect(container.textContent).toContain('Let’s clarify this together')
    const summary = container.querySelector('[aria-label="Your answers — scroll to review"]')!
    expect(summary.getAttribute('tabindex')).toBe('0')
  })
  it('keeps optional connections collapsed and reveals the same canonical selections', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') }))
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures()
    const optional = [...container.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent?.startsWith('Connections and extra needs'))!
    expect(optional.open).toBe(false)
    await click(optional.querySelector('summary')!)
    expect(optional.open).toBe(true)
    const whatsapp = [...optional.querySelectorAll('label')].find(item => item.textContent?.includes('WhatsApp connection'))?.querySelector('input')
    await click(whatsapp!)
    expect(optional.querySelector('summary')?.textContent).toContain('1 selected')
    expect(percent()).toBe('48')
  })

  it('preserves independent progress, section and typed inputs across repeated switches', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) }))
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
    await typeAnswer('A bakery with a small team')
    expect(percent()).toBe('0')
    await click(button('Build my own plan'))
    expect(percent()).toBe('0')
    await choosePlaces()
    expect(percent()).toBe('33')
    await click(button('Guide me'))
    expect(percent()).toBe('0')
    expect(container.querySelector('textarea')?.value).toBe('A bakery with a small team')
    await click(button('Build my own plan'))
    expect(percent()).toBe('33')
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
    await click(button('Build my own plan'))
    expect(button('Continue to features').disabled).toBe(true)
    await choosePlaces()
    expect(button('Continue to details').disabled).toBe(true)
    await chooseFeatures()
    expect(percent()).toBe('43')
    expect([...container.querySelectorAll('select')].map(item => item.value)).toEqual(['standard', 'standard'])
    await review()
    expect(percent()).toBe('67')
  })

  it('recovers unconfirmed local choices after server restore without restoring approval', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ action: 'restore', token: 'manual-token' })
    expect(container.textContent).toContain('Public website')
    expect(percent()).toBe('67')
    expect(input('I have reviewed').checked).toBe(false)
    expect(button('Confirm my plan and see estimate').disabled).toBe(true)
  })

  it('locks switching while a request is pending and rejects a mismatched response', async () => {
    let finish!: (response: unknown) => void
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve })))
    await click(button('Guide me'))
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
    await click(button('Guide me'))
    await typeAnswer('My saved draft')
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    expect(percent()).toBe('95')
    await click(button('Confirm my plan and see estimate'))
    expect(percent()).toBe('100')
    expect([...container.querySelectorAll('ol[aria-label="Steps to your estimate"] li')].every(item => item.textContent?.startsWith('✓'))).toBe(true)
    expect(container.textContent).toContain('Your estimated project cost')
    await click(button('Guide me'))
    expect(container.querySelector('textarea')?.value).toBe('My saved draft')
    await click(button('Build my own plan'))
    expect(percent()).toBe('100')
  })

  it('preserves the review and never reports completion when confirmation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Session expired' }) }))
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    expect(percent()).toBe('95')
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Session expired')
    expect(container.textContent).not.toContain('Your estimated project cost')
  })

  it.each([false, true])('opens the top pen edit action at review with choices retained (partial: %s)', async partial => {
    const initial = response('manual')
    initial.session.scope = { ...emptyScope(), surfaceIds: ['website'], capabilityIds: partial ? ['payments'] : [] }
    initial.session.stage = 'confirmed'
    initial.session.allowPartial = partial
    initial.result = estimateSolution(reviewScope(initial.session.scope).pricedScope)
    const edited = { ...initial, session: { ...initial.session, stage: 'review' as const, allowPartial: false }, result: null }
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => initial }).mockResolvedValueOnce({ ok: true, json: async () => edited })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    expect(percent()).toBe('100')
    const edit = button('Edit solution')
    expect([...container.querySelectorAll('button')].filter(item => item.textContent === 'Edit solution')).toHaveLength(1)
    expect(edit.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(edit.compareDocumentPosition(button('Request a detailed proposal')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await click(edit)
    expect(JSON.parse(fetcher.mock.calls[1][1].body).action).toBe('review')
    expect(container.querySelector('h2')?.textContent).toBe('Review your plan')
    expect(percent()).toBe('67')
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
    await click(button('Build my own plan'))
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
    await click(button('Guide me'))
    expect(input('Public website').checked).toBe(true)
    expect(percent()).toBe('33')
    await click(button('Continue to features'))
    expect(input('Help customers find your website').checked).toBe(true)
    expect(percent()).toBe('41')
    await click(button('Continue to details'))
    await review()
    expect(percent()).toBe('67')
    expect(input('Leave these unanswered').checked).toBe(false)
  })

  it('recovers the inactive draft from storage after reloading and switching', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => {
      const body = JSON.parse(options.body)
      return { ok: true, json: async () => response(body.mode ?? (body.token === 'guided-token' ? 'guided' : 'manual')) }
    })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
    await typeAnswer('Saved in the other approach')
    await click(button('Build my own plan'))
    await choosePlaces()
    await act(async () => { root.unmount(); root = createRoot(container); root.render(<SolutionDiscovery />) })
    expect(percent()).toBe('33')
    await click(button('Guide me'))
    expect(container.querySelector('textarea')?.value).toBe('Saved in the other approach')
    expect(JSON.parse(fetcher.mock.calls[3][1].body)).toMatchObject({ action: 'restore', token: 'guided-token' })
  })

  it('restarts only the active approach and retains the other draft', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) }))
    vi.stubGlobal('fetch', fetcher)
    await click(button('Guide me'))
    await typeAnswer('Keep this answer')
    await click(button('Build my own plan'))
    await choosePlaces()
    await click(button('Start a new discovery'))
    expect(percent()).toBe('0')
    expect(input('Public website').checked).toBe(false)
    await click(button('Guide me'))
    expect(container.querySelector('textarea')?.value).toBe('Keep this answer')
  })

  it('keeps in-memory drafts when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => ({ ok: true, json: async () => response(JSON.parse(options.body).mode) })))
    await click(button('Guide me'))
    await typeAnswer('Private browser draft')
    await click(button('Build my own plan'))
    await click(button('Guide me'))
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
    await click(button('Build my own plan'))
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
    await click(button('Guide me'))
    await typeAnswer('Keep my unsent answer')
    await click(button('Build my own plan'))
    await choosePlaces()
    await remount()
    expect(button('Start a new session').disabled).toBe(false)
    const recovery = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!).drafts.manual
    expect(recovery).toMatchObject({ token: '', needsRestart: true, scope: { surfaceIds: ['website'] } })
    const calls = fetcher.mock.calls.length
    await remount()
    expect(fetcher).toHaveBeenCalledTimes(calls)
    await click(button('Build my own plan'))
    expect(container.querySelector('h2')?.textContent).toBe('Where will people use it?')
    expect(input('Public website').checked).toBe(true)
    expect(button('Build my own plan').getAttribute('aria-pressed')).toBe('true')
    expect(percent()).toBe('0')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await click(button('Guide me'))
    expect(container.querySelector('textarea')?.value).toBe('Keep my unsent answer')
    expect(button('Guide me').getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('h2')?.textContent).toBe('Tell me a little about your business and the people you serve.')
    await click(button('Build my own plan'))
    expect(input('Public website').checked).toBe(true)
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('offers a fresh start when a legacy session is rejected, even with no loaded session', async () => {
    sessionStorage.setItem('exter-discovery-v1', 'invalid-old-token')
    const fetcher = vi.fn().mockResolvedValueOnce(invalidSession).mockResolvedValueOnce({ ok: true, json: async () => response('guided') })
    vi.stubGlobal('fetch', fetcher)
    await remount()
    expect(sessionStorage.getItem('exter-discovery-v1')).toBeNull()
    await click(button('Start a new session'))
    expect(container.querySelector('textarea')).not.toBeNull()
    expect(JSON.parse(fetcher.mock.calls[1][1].body).action).toBe('start')
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('does not erase a saved draft or automatically start over for an outage', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'Temporarily unavailable' }) })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await choosePlaces()
    const before = sessionStorage.getItem(DRAFT_STORAGE_KEY)
    await remount()
    expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before)
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(button('Start a new session').disabled).toBe(false)
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Temporarily unavailable')
  })

  it('recovers a session rejected during confirmation without reusing price or approval', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => response('manual') }).mockResolvedValueOnce(invalidSession).mockResolvedValueOnce({ ok: true, json: async () => response('manual') })
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await choosePlaces()
    await chooseFeatures()
    await review()
    await click(input('I have reviewed'))
    await click(button('Confirm my plan and see estimate'))
    await click(button('Start a new session'))
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
    await click(button('Build my own plan'))
    await choosePlaces()
    await click(button('Guide me'))
    await typeAnswer('Still here')
    await remount()
    await click(button('Build my own plan'))
    const actions = fetcher.mock.calls.slice(-2).map(call => JSON.parse(call[1].body).action)
    expect(actions).toEqual(['restore', 'start'])
    expect(input('Public website').checked).toBe(true)
    expect(percent()).toBe('0')
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await click(button('Guide me'))
    expect(container.querySelector('textarea')?.value).toBe('Still here')
  })

  it('keeps both approach controls locked until a fresh session response arrives', async () => {
    let finish!: (value: unknown) => void
    const fetcher = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetcher)
    await click(button('Build my own plan'))
    await click(button('Guide me'))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(button('Guide me').disabled).toBe(true)
    await act(async () => { finish({ ok: true, json: async () => response('manual') }) })
    expect(container.querySelector('h2')?.textContent).toBe('Where will people use it?')
    expect(button('Build my own plan').getAttribute('aria-pressed')).toBe('true')
    expect(button('Guide me').disabled).toBe(false)
  })
})
