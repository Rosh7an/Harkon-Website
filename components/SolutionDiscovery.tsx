'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QueryModal from './QueryModal'
import DiscoveryProgress from './DiscoveryProgress'
import styles from './SolutionDiscovery.module.css'
import { QUESTIONS, customerAnswers, discoveryReviewItems, type FactId } from '@/utils/discovery'
import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES, clearInactiveAnswers, emptyScope, reviewScope, type SolutionScope } from '@/utils/solutionCatalog'
import { CAPABILITY_CHOICES, INTEGRATION_CHOICES, MODIFIER_CHOICES, SURFACE_CHOICES, customerWording } from '@/utils/discoveryPresentation'
import { DRAFT_STORAGE_KEY, LEGACY_STORAGE_KEY, readDraftStore, type DiscoveryMode, type DiscoveryResponse, type DraftStore, type LocalDraft } from '@/utils/discoveryDraft'
import { REVIEW_FIELDS, discoveryProgress, type PlanStep, type ReviewedFields } from '@/utils/discoveryProgress'
import type { BusinessContactLinks } from '@/utils/businessContact'

export type { DiscoveryResponse } from '@/utils/discoveryDraft'
const primary = `${styles.primary} min-h-11 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed`
const secondary = `${styles.secondary} min-h-11 px-4 py-2 rounded-xl border border-[var(--border-hi)] text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50`
const field = `${styles.field} query-field w-full rounded-xl border border-[var(--border-hi)] p-3 text-[var(--text)]`
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`
const factLabels: Record<FactId, string> = { business: 'Your business', pain: 'What is difficult', current: 'How you do it now', workflow: 'How you want it to work', users: 'Who will use it', constraints: 'Tools and other needs', priority: 'What matters first' }
const emptyContactLinks: BusinessContactLinks = { call: null, whatsapp: null }
function ContactIcon({ whatsapp = false }: { whatsapp?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {whatsapp ? <><path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.2 7.8c.6 3.9 2.2 5.5 6.1 6.1l1.2-1.5-2-1-1 1c-1.3-.6-2-1.3-2.6-2.6l1-1-1-2-1.7 1Z" /></> : <path d="m8 3 3 5-2 2a14 14 0 0 0 5 5l2-2 5 3c0 3-2 5-4 5C10 21 3 14 3 7c0-2 2-4 5-4Z" />}
  </svg>
}
class RejectedSession extends Error {}
async function readResponse(response: Response): Promise<DiscoveryResponse> {
  const data = await response.json()
  if (!response.ok) {
    if (response.status === 400 && data.code === 'DISCOVERY_SESSION_INVALID') throw new RejectedSession(data.error)
    throw new Error(data.error || 'Could not save your discovery. Please retry.')
  }
  return data
}

function ScopeGroup({ title, catalog, selected, disabled, onToggle, hideLegend = false }: {
  title: string
  catalog: Record<string, { name: string; description: string }>
  selected: string[]
  disabled: boolean
  onToggle: (id: string) => void
  hideLegend?: boolean
}) {
  return <fieldset className="space-y-3">
    <legend className={hideLegend ? 'sr-only' : 'font-semibold mb-3'}>{title}</legend>
    <div className="grid sm:grid-cols-2 gap-3">
      {Object.entries(catalog).map(([id, item]) => <label key={id} className={`${styles.choice} ${selected.includes(id) ? styles.selected : ''} flex items-start gap-3 rounded-xl border border-[var(--border)] p-4 cursor-pointer`}>
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" checked={selected.includes(id)} disabled={disabled} onChange={() => onToggle(id)} />
        <span className="min-w-0"><span className="block font-medium">{item.name}</span><span className="block text-sm text-[var(--muted)] mt-1">{item.description}</span></span>
      </label>)}
    </div>
  </fieldset>
}

export function proposalSummary(view: DiscoveryResponse): string {
  const { session, result } = view
  const reviewItems = [...new Set([...view.reviewItems, ...discoveryReviewItems(session)])]
  const labels = { surfaceIds: 'Where people will use it', capabilityIds: 'Business capabilities', integrationIds: 'External connections', modifierIds: 'Special capabilities' }
  const lines = ['Exter Cloud discovery and solution review', `Catalogue: ${session.catalogVersion}`, `Scope status: ${session.allowPartial ? 'PARTIAL — excludes unresolved requirements' : session.stage === 'confirmed' ? 'Confirmed catalogue scope' : 'Draft for consultation'}`]
  const originalAnswers = customerAnswers(session)
  for (const question of QUESTIONS) {
    const fact = session.facts[question.id]
    const original = originalAnswers.get(question.id)
    if (original && fact?.source !== 'edit') {
      lines.push(`Question: ${question.text}`, `${question.label}: ${original} [original customer answer]`)
      if (fact?.source === 'ai' && fact.value !== original) lines.push(`Assistant summary: ${fact.value} [supporting words: ${fact.evidence}]`)
    } else if (fact) lines.push(`${question.label}: ${fact.value} [${fact.status}; source: ${fact.source}]`)
  }
  for (const [group, catalog] of Object.entries({ surfaceIds: SURFACES, capabilityIds: CAPABILITIES, integrationIds: INTEGRATIONS, modifierIds: MODIFIERS })) {
    const entries = catalog as Record<string, { name: string }>
    lines.push(`${labels[group as keyof typeof labels]}: ${(session.scope[group as keyof Pick<SolutionScope, 'surfaceIds' | 'capabilityIds' | 'integrationIds' | 'modifierIds'>] as string[]).map(id => entries[id].name).join(', ') || 'None selected'}`)
  }
  lines.push('Assumptions: one shared solution foundation; basic agreed workflows; each selected interface is priced separately; allocations are provisional.')
  lines.push(`Estimate settings (${session.stage === 'confirmed' ? 'chosen preferences, including defaults kept' : 'draft choices; defaults may be kept'}): delivery ${session.scope.timelineSpeed}; scope uncertainty ${session.scope.riskProfile}.`)
  lines.push(`Payment method: ${!session.scope.capabilityIds.includes('payments') ? 'Not applicable — payments not selected' : session.scope.billing === 'undecided' ? 'Not decided yet' : session.scope.billing === 'one_time' ? 'One-time payments' : 'Recurring subscriptions'}`)
  lines.push(`Customer-system provider: ${!session.scope.integrationIds.includes('existing_crm') ? 'Not applicable — connection not selected' : session.scope.crmProvider === 'undecided' ? 'Not decided yet' : session.scope.crmProvider}`)
  if (reviewItems.length) lines.push(`${session.allowPartial ? 'Unresolved / excluded from partial estimate' : 'Unresolved — needs team review'}: ${reviewItems.join('; ')}`)
  if (result) lines.push(`Included priced work: ${result.work.map(item => item.name).join('; ')}`)
  if (result) lines.push(`Indicative build range: ${money(result.lowEstimateCost)}–${money(result.highEstimateCost)}`, `Engineering hours: ${Math.round(result.lowEstimateHours)}–${Math.round(result.highEstimateHours)}`, `Rate: ${money(result.hourlyRate)}/hour${session.scope.timelineSpeed === 'expedited' ? ' plus 25% priority uplift' : ''}`, `Planning window: ${result.weeks.low}–${result.weeks.high} weeks, subject to team capacity and scope review`)
  lines.push('Excluded recurring costs: hosting, domains, licenses, messaging, AI usage, maintenance, ongoing SEO/marketing and taxes. Final pricing requires team review.')
  return lines.join('\n')
}

export default function SolutionDiscovery({
  contactLinks = emptyContactLinks,
  headingLevel = 'h1',
}: {
  contactLinks?: BusinessContactLinks
  headingLevel?: 'h1' | 'h2'
}) {
  const [view, setView] = useState<DiscoveryResponse | null>(null)
  const [scope, setScope] = useState<SolutionScope>(emptyScope)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [approved, setApproved] = useState(false)
  const [allowPartial, setAllowPartial] = useState(false)
  const [editing, setEditing] = useState<FactId | null>(null)
  const [correction, setCorrection] = useState('')
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposalPurpose, setProposalPurpose] = useState<'query' | 'callback'>('query')
  const [exporting, setExporting] = useState(false)
  const [planStep, setPlanStep] = useState<PlanStep>(0)
  const [reviewed, setReviewed] = useState<ReviewedFields>({})
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [recovery, setRecovery] = useState<{ mode: DiscoveryMode | null; invalid: boolean } | null>(null)
  const [notice, setNotice] = useState('')
  const currentView = useRef<DiscoveryResponse | null>(null)
  const drafts = useRef<DraftStore['drafts']>({})
  const views = useRef<Partial<Record<DiscoveryMode, DiscoveryResponse>>>({})
  const mounted = useRef(true)
  const locked = useRef(false)
  const pending = useRef<AbortController | null>(null)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const changingMode = useRef(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        (entry.target as HTMLElement).dataset.revealVisible = String(entry.isIntersecting)
      })
    }, { threshold: 0, rootMargin: '-70px 0px -24px 0px' })
    const observed = new Set<HTMLElement>()
    const register = () => {
      observed.forEach(element => {
        if (!section.contains(element)) { observer.unobserve(element); observed.delete(element) }
      })
      const selector = `.${styles.sectionHeading} > *, .${styles.intro} > :not(.${styles.modeBar}), .${styles.modeBar} > button, .${styles.progressPanel} > *, .${styles.questionPanel} > *, .${styles.summaryHeader}, .${styles.summaryBody}, .${styles.summaryFooter}, .${styles.glass} > h2, .${styles.glass} > p, .${styles.glass} > button, .${styles.sessionTools} > details`
      section.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        if (observed.has(element) || element.closest('[data-reveal]')) return
        element.dataset.reveal = ''
        element.style.setProperty('--reveal-enter', `${Math.min(index * 0.09, 0.58)}s`)
        element.style.setProperty('--reveal-exit', `${Math.max(0, 0.24 - index * 0.04)}s`)
        observed.add(element)
        observer.observe(element)
      })
    }
    register()
    const mutations = new MutationObserver(register)
    mutations.observe(section, { childList: true, subtree: true })
    return () => { mutations.disconnect(); observer.disconnect() }
  }, [])

  async function animateModeChange(mode: DiscoveryMode) {
    if (changingMode.current || locked.current || !ready || currentView.current?.session.mode === mode) return
    changingMode.current = true
    const panel = contentRef.current
    const reduceMotion = typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let exits: Animation[] = []
    const visibleElements = () => panel ? Array.from(panel.querySelectorAll<HTMLElement>('[data-reveal-visible="true"]')) : []
    try {
      if (panel && !reduceMotion && typeof panel.animate === 'function') {
        exits = visibleElements().reverse().map((element, index) => element.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(14px)' }], { duration: 160, delay: Math.min(index * 35, 140), easing: 'ease-in', fill: 'forwards' }))
        await Promise.all(exits.map(animation => animation.finished.catch(() => {})))
      }
      if (!mounted.current) return
      await switchMode(mode)
    } finally {
      exits.forEach(animation => animation.cancel())
      if (mounted.current && panel && !reduceMotion && typeof panel.animate === 'function') {
        requestAnimationFrame(() => {
          if (!mounted.current) return
          visibleElements().forEach((element, index) => element.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: Math.min(index * 70, 280), easing: 'ease', fill: 'backwards' }))
        })
      }
      changingMode.current = false
    }
  }
  function openProposal(purpose: 'query' | 'callback') { setProposalPurpose(purpose); setProposalOpen(true) }

  const persistDrafts = useCallback((activeMode: DiscoveryMode) => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 2, activeMode, drafts: drafts.current }))
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch { /* Storage is optional; both in-memory drafts still work. */ }
  }, [])

  const saveDraft = useCallback(() => {
    if (!view) return
    drafts.current[view.session.mode] = { token: view.token, expiresAt: view.session.expiresAt, scope, answer, editing, correction, planStep, reviewed }
    views.current[view.session.mode] = view
    persistDrafts(view.session.mode)
  }, [view, scope, answer, editing, correction, planStep, reviewed, persistDrafts])

  function retireSession(mode?: DiscoveryMode) {
    if (mode) {
      const local = drafts.current[mode]
      if (local) drafts.current[mode] = { ...local, token: '', needsRestart: true, reviewed: {}, planStep: 0, editing: null, correction: '' }
      delete views.current[mode]
      if (currentView.current?.session.mode === mode) {
        currentView.current = null
        setView(null)
      }
    }
    persistDrafts(currentView.current?.session.mode ?? mode ?? 'guided')
    setApproved(false)
    setAllowPartial(false)
    setError('')
    setNotice('')
    setRecovery({ mode: mode ?? null, invalid: true })
  }

  function accept(data: DiscoveryResponse, local?: LocalDraft) {
    currentView.current = data
    views.current[data.session.mode] = data
    setView(data)
    // Only local, unconfirmed inputs may overlay a server-validated review.
    setScope(local && data.session.stage === 'review' ? local.scope : data.session.scope)
    setAnswer(local?.answer ?? '')
    setEditing(local?.editing ?? null)
    setCorrection(local?.correction ?? '')
    setPlanStep(data.session.stage === 'confirmed' ? 3 : local?.planStep ?? 0)
    setReviewed(local?.reviewed ?? {})
    setApproved(false)
    setAllowPartial(false)
    setProposalOpen(false)
    setError('')
    setRecovery(null)
    setNotice('')
  }

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    let active = true
    let token: string | null = null
    let local: LocalDraft | undefined
    let expectedMode: DiscoveryMode | undefined
    try {
      const stored = readDraftStore(sessionStorage.getItem(DRAFT_STORAGE_KEY))
      if (stored) {
        drafts.current = stored.drafts
        expectedMode = stored.activeMode
        local = stored.drafts[expectedMode]
        token = local?.token ?? null
      } else token = sessionStorage.getItem(LEGACY_STORAGE_KEY)
    } catch { /* Private-browser storage may be unavailable. */ }
    const cleanup = () => { active = false; mounted.current = false; controller.abort(); pending.current?.abort() }
    if (local?.needsRestart) { setRecovery({ mode: expectedMode ?? null, invalid: true }); setReady(true); return cleanup }
    if (!token) { setReady(true); return cleanup }
    const timer = setTimeout(() => controller.abort(), 25000)
    void (async () => {
      try {
        const response = await fetch('/api/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restore', token }), signal: controller.signal })
        const data = await readResponse(response)
        if (expectedMode && data.session?.mode !== expectedMode) throw new Error('This saved draft belongs to another approach. Please start again.')
        if (active && !controller.signal.aborted) accept(data, local)
      } catch (failure) {
        if (active) {
          if (failure instanceof RejectedSession) retireSession(expectedMode)
          else {
            setError(controller.signal.aborted ? 'Session recovery took too long. You can start a new session below.' : failure instanceof Error ? failure.message : 'Could not restore your session. Please retry.')
            setRecovery({ mode: expectedMode ?? null, invalid: false })
          }
        }
      } finally {
        clearTimeout(timer)
        if (active) setReady(true)
      }
    })()
    return () => { cleanup(); clearTimeout(timer) }
  }, [])

  useEffect(() => { if (ready) saveDraft() }, [ready, saveDraft])
  useEffect(() => { questionHeading.current?.focus() }, [view?.question?.id, view?.session.stage, view?.session.mode, planStep])

  async function request(payload: Record<string, unknown>, expectedMode?: DiscoveryMode, local?: LocalDraft): Promise<boolean> {
    if (locked.current) return false
    locked.current = true
    setBusy(true)
    setError('')
    const controller = new AbortController()
    pending.current = controller
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const current = currentView.current
      const response = await fetch('/api/discovery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ token: current?.token, revision: current?.session.revision, ...payload }),
      })
      const data = await readResponse(response)
      if (!mounted.current || controller.signal.aborted) return false
      const mode = expectedMode ?? current?.session.mode
      if (mode && data.session?.mode !== mode) throw new Error('The approach changed unexpectedly. Your current draft is still here; please retry.')
      accept(data, local)
      return true
    } catch (failure) {
      if (mounted.current) {
        if (failure instanceof RejectedSession) retireSession(expectedMode ?? currentView.current?.session.mode)
        else setError(controller.signal.aborted ? 'The request took too long. Your current input is still here; please retry.' : failure instanceof Error ? failure.message : 'Connection interrupted. Please retry.')
      }
      return false
    } finally {
      clearTimeout(timer)
      locked.current = false
      pending.current = null
      if (mounted.current) setBusy(false)
    }
  }

  async function startNewSession(mode: DiscoveryMode, keepInputs = false) {
    const saved = keepInputs ? drafts.current[mode] : undefined
    const local: LocalDraft | undefined = saved ? { ...saved, reviewed: {}, planStep: 0, editing: null, correction: '' } : undefined
    if (await request({ action: 'start', mode }, mode, local)) {
      if (saved) setNotice(mode === 'manual' ? 'New session started. Your saved choices are here as an unconfirmed draft—please review them again.' : 'New guided session started. Your unsent answer is still here. Earlier submitted answers could not be restored; please answer the questions again.')
    }
  }

  async function switchMode(mode: DiscoveryMode) {
    if (locked.current || !ready || currentView.current?.session.mode === mode) return
    saveDraft()
    const local = drafts.current[mode]
    const cached = views.current[mode]
    if (local && !local.needsRestart && local.expiresAt > Date.now()) {
      if (cached) accept(cached, local)
      else {
        const restored = await request({ action: 'restore', token: local.token }, mode, local)
        // Only a definite session rejection triggers one fresh start. An outage
        // preserves the draft and does not loop or silently reset the customer.
        if (!restored && mounted.current && drafts.current[mode]?.needsRestart) await startNewSession(mode, true)
      }
    } else await startNewSession(mode, !!local)
  }

  async function sendAnswer(text: string) {
    if (await request({ action: 'answer', answer: text })) setAnswer('')
  }
  function toggle(group: 'surfaceIds' | 'capabilityIds' | 'integrationIds' | 'modifierIds', id: string) {
    setScope(previous => {
      const ids = previous[group] as string[]
      return clearInactiveAnswers({ ...previous, [group]: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] })
    })
    setApproved(false)
    setAllowPartial(false)
    setReviewed(previous => ({ ...previous, [group]: true, ...(id === 'payments' ? { billing: false } : {}), ...(id === 'existing_crm' ? { crmProvider: false } : {}) }))
  }
  function changePreference(preference: Partial<Pick<SolutionScope, 'billing' | 'crmProvider' | 'timelineSpeed' | 'riskProfile'>>) {
    setScope(previous => clearInactiveAnswers({ ...previous, ...preference }))
    setApproved(false)
    setAllowPartial(false)
    setReviewed(previous => ({ ...previous, ...Object.fromEntries(Object.keys(preference).map(key => [key, true])) }))
  }
  function goToStep(step: PlanStep) { setPlanStep(step); setApproved(false); setAllowPartial(false) }
  function nextPlanStep() {
    if (planStep === 0 && !scope.surfaceIds.length) return
    if (planStep === 1 && !scope.capabilityIds.length && !reviewed.capabilityIds) return
    setReviewed(previous => ({ ...previous, ...(planStep === 0 ? { surfaceIds: true } : planStep === 1 ? { capabilityIds: true } : { integrationIds: true, modifierIds: true, billing: true, crmProvider: true, timelineSpeed: true, riskProfile: true }) }))
    goToStep(Math.min(3, planStep + 1) as PlanStep)
  }
  function editSolution() {
    if (!view || view.session.stage !== 'confirmed' || !view.result) return
    // These choices were already confirmed. Reopen their overview, not an empty
    // questionnaire; accept() still clears approval and partial-estimate consent.
    const local: LocalDraft = {
      token: view.token, expiresAt: view.session.expiresAt, scope: view.session.scope,
      answer: '', editing: null, correction: '', planStep: 3,
      reviewed: Object.fromEntries(REVIEW_FIELDS.map(key => [key, true])),
    }
    void request({ action: 'review' }, view.session.mode, local)
  }
  const { issues, pricedScope } = reviewScope(scope)
  const session = view?.session
  const result = view?.result
  const reviewItems = session ? discoveryReviewItems(session, scope) : []
  const showChoices = session?.mode === 'manual' && Object.keys(session.facts).length === 0
  const progressInput = { scope, reviewed, approved, allowPartial, planStep, hasResult: !!result }
  const progress = discoveryProgress(session ?? null, progressInput)
  const selectedChoices = [
    ...scope.surfaceIds.map(id => ({ name: SURFACE_CHOICES[id].name, excluded: !pricedScope.surfaceIds.includes(id) })),
    ...scope.capabilityIds.map(id => ({ name: CAPABILITY_CHOICES[id].name, excluded: !pricedScope.capabilityIds.includes(id) })),
    ...scope.integrationIds.map(id => ({ name: INTEGRATION_CHOICES[id].name, excluded: !pricedScope.integrationIds.includes(id) })),
    ...scope.modifierIds.map(id => ({ name: MODIFIER_CHOICES[id].name, excluded: !pricedScope.modifierIds.includes(id) })),
  ]
  const IntroHeading = headingLevel

  async function exportEstimate() {
    if (!view) return
    setExporting(true)
    setError('')
    try {
      const { createEstimatePdf } = await import('@/utils/estimatePdf')
      const pdf = await createEstimatePdf(view)
      pdf.save('exter-cloud-solution-estimate.pdf')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The PDF could not be generated. You can still request the detailed proposal.') }
    finally { setExporting(false) }
  }

  return <section ref={sectionRef} className={styles.plannerSection} aria-label="Solution Planner">
    <header className={styles.sectionHeading}>
      <IntroHeading>A clear plan for your<br /><span>next step.</span></IntroHeading>
      <p>Start with what’s slowing you down. We’ll help you decide what to build—no technical knowledge needed.</p>
    </header>
    <div className={styles.experience} data-active={!!session}>
    <header className={styles.intro}>
      <h3 className={styles.approachHeading}>How would you like to build your plan?</h3>
      <p className={styles.approachDescription}>Answer a few questions with us, or choose what you need yourself.</p>
      <div className={styles.modeBar} role="group" aria-label="Choose your approach">
        <button className={`${secondary} ${styles.modeButton} ${styles.guidedMode}`} aria-pressed={session?.mode === 'guided'} disabled={busy || !ready} onClick={() => void animateModeChange('guided')}>Guide me</button>
        <button className={`${secondary} ${styles.modeButton} ${styles.manualMode}`} aria-pressed={session?.mode === 'manual'} disabled={busy || !ready} onClick={() => void animateModeChange('manual')}>Build my own plan</button>
      </div>
      <p className={styles.modeHint}>Each approach keeps its own draft and progress in this tab for up to 24 hours.</p>
    </header>
    <div ref={contentRef}>
    <p role="status" className="sr-only">{busy ? 'Saving your discovery…' : ready ? 'Ready' : 'Restoring your discovery…'}</p>
    {error && <div role="alert" className="rounded-xl border border-[var(--error)] text-[var(--error)] p-4 mb-6">{error}</div>}
    {recovery && <div className={`${styles.glass} p-5 mb-6 space-y-3`} role="status" aria-label="Session recovery">
      <h2 className="font-semibold">{recovery.invalid ? 'Let’s reopen your plan' : 'Your saved plan could not be opened'}</h2>
      <p className="text-sm text-[var(--muted)]">{recovery.invalid ? 'This saved session can no longer be used. Start a new session or choose an approach above. Available choices and unsent text will stay as an unconfirmed draft; earlier submitted answers may need to be entered again.' : 'Your draft is still saved. You can retry by choosing an approach above, or start a new session with your available inputs. Your other approach’s draft stays saved.'}</p>
      <button className={primary} disabled={busy || !ready} onClick={() => void startNewSession(recovery.mode ?? 'guided', true)}>Start a new session</button>
    </div>}
    {notice && <p role="status" className="text-sm text-[var(--muted)] mb-6">{notice}</p>}
    {!ready && <p className="text-[var(--muted)]">Restoring your discovery…</p>}
    {ready && <DiscoveryProgress session={session ?? null} {...progressInput} />}
    {!session && ready && <div className={`${styles.glass} max-w-3xl mx-auto p-6 sm:p-9`}>
      <h2 className="text-2xl font-bold">Start with the problem you want to solve</h2>
      <p className="text-[var(--muted)] mt-3">Tell us what is difficult today. We’ll help you decide what to build. You don’t need to know the technical details.</p>
      <p className="text-sm text-[var(--muted)] mt-5">Choose “Guide me” for a short conversation, or “Build my own plan” to choose directly. No contact details needed.</p>
      <p className="text-sm text-[var(--muted)] mt-2">AI assistance shares your answers with our AI provider. Please don’t include passwords or private customer records.</p>
    </div>}

    {session && view && <>
      <div className={`${styles.sessionTools} flex justify-end`}>
        <details className="text-sm">
          <summary className="min-h-11 py-3 text-[var(--muted)] cursor-pointer">Start over</summary>
          <div className="flex flex-wrap gap-2 pt-2">
          <p className="w-full text-[var(--muted)]">This replaces only this approach’s draft. Your other draft stays saved.</p>
          <button className={secondary} disabled={busy} onClick={() => void request({ action: 'start', mode: session.mode }, session.mode)}>Start a new discovery</button>
          </div>
        </details>
      </div>
      <div className={styles.workspace}>
        <div className={`${styles.glass} ${styles.questionPanel} space-y-4 min-w-0`}>
          {session.stage === 'discovery' && <>
            {session.messages.length > 0 && <details className={styles.disclosure}>
              <summary>Earlier answers ({session.turns})</summary>
              <div className={`${styles.history} space-y-3`} role="log" aria-label="Discovery conversation" tabIndex={0}>
              {session.messages.map((message, index) => <div key={index} className={`rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${message.role === 'user' ? 'border border-[var(--border)]' : 'bg-[var(--surface)]'}`}>
                <span className="block font-semibold mb-1">{message.role === 'user' ? 'You' : 'Exter Cloud'}</span>{message.text}
              </div>)}
              </div>
            </details>}
            <p className="text-[var(--muted)]">{customerWording(session.assistantMessage)}</p>
            {session.providerStatus === 'guided_fallback' && session.turns > 0 && <p role="status" className="text-sm text-[var(--muted)]">Your answers are saved. AI suggestions are unavailable right now, but you can keep going and review your choices.</p>}
            {view.question && <form onSubmit={event => { event.preventDefault(); void sendAnswer(answer) }} className="space-y-4">
              <h2 ref={questionHeading} tabIndex={-1} className="text-xl font-semibold outline-none">{view.question.text}</h2>
              <div className="flex flex-wrap gap-2">{view.question.options.map(option => <button key={option} type="button" className={secondary} disabled={busy} onClick={() => void sendAnswer(option)}>{option}</button>)}</div>
              <label htmlFor="discovery-answer" className="block text-sm font-medium">Your answer</label>
              <textarea id="discovery-answer" className={field} rows={4} maxLength={2000} value={answer} disabled={busy} onChange={event => setAnswer(event.target.value)} aria-describedby="discovery-answer-hint" placeholder="A few sentences are enough." />
              <p id="discovery-answer-hint" className="text-sm text-[var(--muted)]">Use your own words. It’s okay to be unsure—you can change your answers later.</p>
              <p className="text-xs text-[var(--muted)]">AI assistance shares submitted answers with our AI provider. Please don’t include passwords or private customer records.</p>
              <div className={styles.actions}>
                <button type="submit" className={primary} disabled={busy || !answer.trim()}>{busy ? 'Saving…' : 'Continue'}</button>
                <button type="button" className={secondary} disabled={busy} onClick={() => void sendAnswer('I’m not sure yet')}>I’m not sure</button>
                <button type="button" className={secondary} disabled={busy} onClick={() => void request({ action: 'review' })}>Review what we have so far</button>
              </div>
            </form>}
          </>}

          {session.stage === 'review' && <>
            <p className={styles.eyebrow}>YOUR PLAN · {planStep + 1} OF 4</p>
            <h2 ref={questionHeading} tabIndex={-1} className="text-2xl font-bold outline-none">{['Where will people use it?', 'What should it help you do?', 'A few useful details', 'Review your plan'][planStep]}</h2>
            <p className="text-[var(--muted)]">{[
              'Choose one or more. A website, team workspace and mobile app can share one connected plan.',
              'Choose the features that matter now. You can add more later.',
              'Keep the displayed options or change them. Continuing accepts your choices, including any defaults you keep.',
              'Check what is included, what remains unanswered and the assumptions before you approve.',
            ][planStep]}</p>
            {planStep < 2 && <p className="text-sm text-[var(--muted)]">Unchecked items are not included, not a claim that you don’t need them. Suggested checked items are a draft until you approve.</p>}
            {session.recommendations.length > 0 && planStep === 0 && <details className={styles.disclosure}><summary>Why these items were suggested</summary><ul className="list-disc pl-5 space-y-2 text-sm">{session.recommendations.map(item => <li key={`${item.group}:${item.id}`}>{item.reason}<span className="block text-[var(--muted)]">Your evidence: “{item.evidence}”</span></li>)}</ul></details>}
            {planStep === 0 && <>
            <ScopeGroup hideLegend title="Where will people use it?" catalog={SURFACE_CHOICES} selected={scope.surfaceIds} disabled={busy} onToggle={id => toggle('surfaceIds', id)} />
            </>}
            {planStep === 1 && <>
            <ScopeGroup hideLegend title="What should it help you do?" catalog={CAPABILITY_CHOICES} selected={scope.capabilityIds} disabled={busy} onToggle={id => toggle('capabilityIds', id)} />
            <label className={`${styles.choice} flex items-start gap-3 p-4 rounded-xl`}><input type="checkbox" className="mt-1 h-5 w-5" disabled={busy} checked={!scope.capabilityIds.length && reviewed.capabilityIds === true} onChange={event => {
              const checked = event.target.checked
              setScope(previous => clearInactiveAnswers({ ...previous, capabilityIds: [] }))
              setReviewed(previous => ({ ...previous, capabilityIds: checked, billing: false }))
              setApproved(false); setAllowPartial(false)
            }} /><span>No extra features for now<span className="block text-sm text-[var(--muted)] mt-1">Continue with just the places you chose.</span></span></label>
            </>}
            {planStep === 2 && <>
            <details className={styles.disclosure}>
              <summary>Connections and extra needs{scope.integrationIds.length + scope.modifierIds.length > 0 ? ` · ${scope.integrationIds.length + scope.modifierIds.length} selected` : ' (optional)'}</summary>
              <p className="text-sm text-[var(--muted)] mb-5">Open this if you already use another tool, need offline access, or want staff to use a company login.</p>
              <div className="space-y-6">
                <ScopeGroup title="Connect tools you already use" catalog={INTEGRATION_CHOICES} selected={scope.integrationIds} disabled={busy} onToggle={id => toggle('integrationIds', id)} />
                <ScopeGroup title="Other needs" catalog={MODIFIER_CHOICES} selected={scope.modifierIds} disabled={busy} onToggle={id => toggle('modifierIds', id)} />
              </div>
            </details>
            {scope.capabilityIds.includes('payments') && <label className="block space-y-2"><span>How will customers pay?</span><select className={field} disabled={busy} value={scope.billing} aria-describedby="scope-followup-hint" onChange={event => changePreference({ billing: event.target.value as SolutionScope['billing'] })}><option value="undecided">Not decided yet</option><option value="one_time">One-time payments</option><option value="recurring">Recurring subscriptions</option></select></label>}
            {scope.integrationIds.includes('existing_crm') && <label className="block space-y-2"><span>Which customer system do you use?</span><select className={field} disabled={busy} value={scope.crmProvider} aria-describedby="scope-followup-hint" onChange={event => changePreference({ crmProvider: event.target.value as SolutionScope['crmProvider'] })}><option value="undecided">Not decided yet</option><option value="hubspot">HubSpot</option><option value="salesforce">Salesforce</option><option value="zoho">Zoho</option></select></label>}
            {(scope.capabilityIds.includes('payments') || scope.integrationIds.includes('existing_crm')) && <p id="scope-followup-hint" className="text-sm text-[var(--muted)]">Keeping “Not decided yet” is a valid choice. A partial estimate leaves that work out and keeps it for discussion.</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-2"><span className="block">Delivery preference</span><select className={field} disabled={busy} value={scope.timelineSpeed} onChange={event => changePreference({ timelineSpeed: event.target.value as SolutionScope['timelineSpeed'] })}><option value="standard">Standard planning</option><option value="expedited">Priority planning (+25% cost)</option></select></label>
              <label className="space-y-2"><span className="block">How much have you decided?</span><select className={field} disabled={busy} value={scope.riskProfile} onChange={event => changePreference({ riskProfile: event.target.value as SolutionScope['riskProfile'] })}><option value="clear">I have a clear plan</option><option value="standard">Some details to discuss</option><option value="novel">A new or unusual idea</option></select></label>
            </div>
            <p className="text-sm text-[var(--muted)]">If Standard planning and “Some details to discuss” suit you, keep them. They will be included as your choices when you continue.</p>
            </>}
            {planStep < 3 && <div className={styles.actions}>
              {planStep > 0 && <button className={secondary} disabled={busy} onClick={() => goToStep((planStep - 1) as PlanStep)}>Back</button>}
              <button className={primary} disabled={busy || (planStep === 0 && !scope.surfaceIds.length) || (planStep === 1 && !scope.capabilityIds.length && !reviewed.capabilityIds)} onClick={nextPlanStep}>{planStep === 2 ? 'Review these details' : planStep === 1 ? 'Continue to details' : 'Continue to features'}</button>
            </div>}
            {planStep === 3 && <>
            <div className={styles.reviewRows}>
              {([
                ['Places', scope.surfaceIds.map(id => SURFACE_CHOICES[id].name).join(', '), 0],
                ['Features', scope.capabilityIds.map(id => CAPABILITY_CHOICES[id].name).join(', ') || 'No extra features selected', 1],
                ['Connections & extras', [...scope.integrationIds.map(id => INTEGRATION_CHOICES[id].name), ...scope.modifierIds.map(id => MODIFIER_CHOICES[id].name)].join(', ') || 'None included in this estimate', 2],
              ] as const).map(([label, value, step]) => <div key={label}><div className="min-w-0"><h3 className="font-semibold">{label}</h3><p className="text-sm text-[var(--muted)] mt-1">{value}</p></div><button className={secondary} disabled={busy} onClick={() => goToStep(step)}>Edit {label.toLowerCase()}</button></div>)}
              <div><div><h3 className="font-semibold">Estimate preferences</h3><p className="text-sm text-[var(--muted)] mt-1">{scope.timelineSpeed === 'standard' ? 'Standard planning' : 'Priority planning (+25% cost)'} · {scope.riskProfile === 'clear' ? 'A clear plan' : scope.riskProfile === 'novel' ? 'A new or unusual idea' : 'Some details to discuss'}. Your choices, including defaults you kept.</p></div><button className={secondary} disabled={busy} onClick={() => goToStep(2)}>Edit details</button></div>
              {(scope.capabilityIds.includes('payments') || scope.integrationIds.includes('existing_crm')) && <p className="text-sm text-[var(--muted)]">{scope.capabilityIds.includes('payments') && `Payments: ${scope.billing === 'undecided' ? 'Not decided yet' : scope.billing === 'one_time' ? 'One-time payments' : 'Recurring subscriptions'}. `}{scope.integrationIds.includes('existing_crm') && `Customer system: ${scope.crmProvider === 'undecided' ? 'Not decided yet' : scope.crmProvider}.`}</p>}
            </div>
            <div className="rounded-xl border border-[var(--border)] p-4 text-sm space-y-2"><h3 className="font-semibold">Before you confirm</h3><p>Shared work is counted once. Each website, workspace or app adds its own build work. This is a starting estimate for the selected features; the team will confirm the details and final price.</p><p>Hosting, domains, licenses, AI use, messaging, maintenance, ongoing marketing and taxes are separate.</p></div>
            {issues.length > 0 && <div role="status" className="rounded-xl border border-[var(--border-hi)] p-4 text-sm"><h3 className="font-semibold mb-2">Before we can estimate</h3><ul className="list-disc pl-5 space-y-1">{issues.map(issue => <li key={issue}>{customerWording(issue)}</li>)}</ul></div>}
            {reviewItems.length > 0 && <div className="rounded-xl border border-[var(--border-hi)] p-4 text-sm space-y-3"><h3 className="font-semibold">Let’s discuss these with the team</h3><ul className="list-disc pl-5 space-y-1">{reviewItems.map(item => <li key={item}>{customerWording(item)}</li>)}</ul><label className="flex gap-3 items-start min-h-11"><input type="checkbox" className="mt-1 h-5 w-5" checked={allowPartial} disabled={busy} onChange={event => { setAllowPartial(event.target.checked); setApproved(false) }} /><span>Leave these unanswered items out and estimate my selected features only. This is a partial estimate, not the total project cost.</span></label></div>}
            <label className="flex gap-3 items-start min-h-11 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} /><span>I have reviewed my answers, chosen features and what this estimate includes.</span></label>
            <div className={styles.actions}>
              <button className={primary} disabled={busy || !approved || issues.length > 0 || (reviewItems.length > 0 && !allowPartial)} onClick={() => void request({ action: 'confirm', scope, confirmed: approved, allowPartial })}>{busy ? 'Calculating…' : allowPartial ? 'Confirm and estimate selected work only' : 'Confirm my plan and see estimate'}</button>
              <button className={secondary} disabled={busy} onClick={() => openProposal('callback')}>Ask the team for guidance</button>
            </div>
            </>}
          </>}

          {session.stage === 'confirmed' && result && <>
            <div className={styles.resultHeader}>
              <h2 ref={questionHeading} tabIndex={-1} className="text-2xl font-bold outline-none">{session.allowPartial ? 'Partial estimate — selected work only' : 'Your estimated project cost'}</h2>
              <button className={`${secondary} ${styles.editSolution}`} disabled={busy} onClick={editSolution}>
                <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5M3 21l5-1 13-13a2 2 0 0 0-5-5L3 15z" /></svg>
                <span>Edit solution</span>
              </button>
            </div>
            {session.allowPartial && <div role="status" className="border border-[var(--border-hi)] p-4 rounded-xl text-sm">This range leaves out the items below. It is not the total project cost.<ul className="list-disc pl-5 mt-2">{reviewItems.map(item => <li key={item}>{customerWording(item)}</li>)}</ul></div>}
            <p className={`${styles.price} font-extrabold`}>{money(result.lowEstimateCost)}–{money(result.highEstimateCost)}</p>
            <p>Estimated time: {result.weeks.low}–{result.weeks.high} weeks. We’ll confirm availability and the details with you.</p>
            <p className="text-sm text-[var(--muted)]">This is a starting estimate, not a final quote. Hosting, domains, licenses, messaging, AI use, maintenance, ongoing marketing and taxes are separate.</p>
            <details className={styles.disclosure}><summary>What’s included and how we calculated it</summary><p className="text-sm text-[var(--muted)] mb-3">{Math.round(result.lowEstimateHours)}–{Math.round(result.highEstimateHours)} engineering hours · {money(result.hourlyRate)}/hour{session.scope.timelineSpeed === 'expedited' ? ' + 25% priority uplift' : ''}</p><ul className="divide-y divide-[var(--border)]">{result.work.map(item => <li key={item.id} className="py-3 flex justify-between gap-4 text-sm"><span className="min-w-0">{customerWording(item.name)}</span><span className="whitespace-nowrap">{item.expectedHours.toFixed(1)} base hrs</span></li>)}</ul><p className="mt-3 text-sm text-[var(--muted)]">Base work {result.rawFeatureTotal.toFixed(1)}h + integration coordination {result.surcharge.toFixed(1)}h + deployment setup {result.setupOverhead}h + QA {result.qaOverhead.toFixed(1)}h + project management {result.pmOverhead.toFixed(1)}h. The range then applies scope uncertainty and the selected risk profile.</p></details>
            <div className="flex flex-wrap gap-3">
              <button className={primary} onClick={() => openProposal('query')}>Request a detailed proposal</button>
              <button className={secondary} disabled={exporting} onClick={() => void exportEstimate()}>{exporting ? 'Preparing PDF…' : 'Download PDF estimate'}</button>
            </div>
            <div className={styles.teamHandoff}>
              <h3 className="font-semibold">Talk it through with the team</h3>
              <p className="text-sm text-[var(--muted)] mt-2">This is a planning range, not a final quote. Let’s discuss your answers, website/app needs and priorities before agreeing the final scope and price.</p>
              <div className={styles.contactActions} role="group" aria-label="Contact the team">
                <button className={secondary} onClick={() => openProposal('callback')}>Request a team call</button>
                {contactLinks.call ? <a className={`${secondary} ${styles.contactLink}`} href={contactLinks.call}><ContactIcon />Call the team</a> : <button className={`${secondary} ${styles.contactLink}`} disabled><ContactIcon />Call the team</button>}
                {contactLinks.whatsapp ? <a className={`${secondary} ${styles.contactLink}`} href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer"><ContactIcon whatsapp />WhatsApp the team</a> : <button className={`${secondary} ${styles.contactLink}`} disabled><ContactIcon whatsapp />WhatsApp the team</button>}
              </div>
              <p className="text-xs text-[var(--muted)] mt-3">A call request shares this session summary and your contact details with the team. WhatsApp opens with a short greeting only—you choose what to send.</p>
              {(!contactLinks.call || !contactLinks.whatsapp) && <p className="text-xs text-[var(--muted)] mt-2">Some direct-contact options are unavailable. You can still request a team call.</p>}
            </div>
          </>}
        </div>

        <aside className={`${styles.glass} ${styles.summary} min-w-0`} aria-label="Requirements understood so far">
          <div className={`${styles.summaryHeader} space-y-2`}>
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{showChoices ? 'Your selected plan' : 'What I’ve understood'}</h2><span className={styles.badge}>{showChoices ? `${selectedChoices.length} selected` : `${Object.keys(session.facts).length} of ${QUESTIONS.length}`}</span></div>
            <p className="text-sm text-[var(--muted)]">{showChoices ? session.stage === 'confirmed' ? 'Your reviewed choices. Unanswered details stay separate.' : 'Draft choices—not confirmed until you approve.' : 'Your answers so far. Change anything that doesn’t sound right.'}</p>
          </div>
          <button className={`${styles.summaryToggle} ${secondary}`} aria-expanded={summaryOpen} aria-controls="discovery-summary-body" onClick={() => setSummaryOpen(previous => !previous)}>{summaryOpen ? 'Hide' : 'View'} {showChoices ? 'your selected plan' : 'your answers'} ({showChoices ? selectedChoices.length : Object.keys(session.facts).length})</button>
          <div id="discovery-summary-body" className={styles.summaryBody} data-expanded={summaryOpen}>
          <div className={`${styles.summaryScroll} p-5 space-y-4`} role="region" aria-label={showChoices ? 'Your selected choices — scroll to review' : 'Your answers — scroll to review'} tabIndex={(showChoices ? selectedChoices.length : Object.keys(session.facts).length) > 0 ? 0 : undefined}>
          {showChoices && (selectedChoices.length > 0
            ? <ul className="space-y-3 text-sm">{selectedChoices.map(choice => <li key={choice.name} className="border-b border-[var(--border)] pb-3">{choice.name}{choice.excluded && <span className="block text-xs text-[var(--muted)] mt-1">Needs discussion · not priced</span>}</li>)}</ul>
            : <p className="text-sm text-[var(--muted)]">Choose what you need from the options. No discovery questions are required for this approach.</p>)}
          {!showChoices && Object.keys(session.facts).length === 0 && <p className="text-sm text-[var(--muted)]">Your answers will appear here. If you already know what you need, you can choose it directly.</p>}
          {QUESTIONS.map(question => {
            const fact = session.facts[question.id]
            if (!fact) return null
            return <div key={question.id} className="border-b border-[var(--border)] pb-4 text-sm space-y-2">
              <h3 className="font-medium">{factLabels[question.id]}</h3>
              <p className="whitespace-pre-wrap break-words">{fact.value}</p>
              <p className="text-[var(--muted)]">{fact.status === 'unknown' ? 'Let’s clarify this together' : 'From your answer'}</p>
              {fact.source === 'ai' && <details><summary className="cursor-pointer min-h-11">View supporting words</summary><p className="break-words">“{fact.evidence}”</p></details>}
              {editing === question.id ? <form className="space-y-2" onSubmit={event => { event.preventDefault(); void request({ action: 'edit', field: question.id, value: correction }).then(success => { if (success) setEditing(null) }) }}>
                <label htmlFor={`edit-${question.id}`}>Correct {factLabels[question.id].toLowerCase()}</label><textarea id={`edit-${question.id}`} className={field} rows={3} maxLength={2000} value={correction} disabled={busy} onChange={event => setCorrection(event.target.value)} />
                <p className="text-[var(--muted)]">Changing an answer clears the old choices and price so we can check the plan again.</p>
                <button className={secondary} disabled={busy || !correction.trim()}>Save correction</button><button type="button" className={secondary} disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
              </form> : <button className={secondary} disabled={busy} onClick={() => { setEditing(question.id); setCorrection(fact.value) }}>Edit {factLabels[question.id].toLowerCase()}</button>}
            </div>
          })}
          </div>
          </div>
          <p className={styles.summaryFooter}><strong className="block mb-1">Next step</strong>{progress.next}</p>
        </aside>
      </div>
      <QueryModal open={proposalOpen} onClose={() => setProposalOpen(false)} purpose={proposalPurpose} initialMessage={proposalSummary({ ...view, reviewItems, session: { ...session, scope } })} />
    </>}
    </div>
    </div>
  </section>
}
