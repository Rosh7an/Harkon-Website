'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Callback requests are paused while email delivery is unavailable.
// import QueryModal from './QueryModal'
import DiscoveryProgress from './DiscoveryProgress'
import EstimatePrice from './EstimatePrice'
import SavedAnswerEditor from './SavedAnswerEditor'
import styles from './SolutionDiscovery.module.css'
import { restoreRequirementAnswers } from '@/utils/discoveryBatch'
import { QUESTIONS, customerAnswers, discoveryReviewItems, requiresAIReview, type FactId } from '@/utils/discovery'
import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES, clearInactiveAnswers, emptyScope, reviewScope, scopeDependencyIssues, type ScopeDependencyIssue, type SolutionScope } from '@/utils/solutionCatalog'
import { CAPABILITY_CHOICES, INTEGRATION_CHOICES, MODIFIER_CHOICES, SURFACE_CHOICES, customerWording } from '@/utils/discoveryPresentation'
import { DRAFT_STORAGE_KEY, LEGACY_STORAGE_KEY, readDraftStore, type DiscoveryMode, type DiscoveryResponse, type DraftStore, type LocalDraft } from '@/utils/discoveryDraft'
import { REVIEW_FIELDS, type PlanStep, type ReviewedFields } from '@/utils/discoveryProgress'
import { RejectedSession, requestDiscovery } from '@/utils/discoveryRequest'
import { aiReviewFailureMessage, retrySecondsRemaining } from '@/utils/discoveryAIStatus'
import type { BusinessContactLinks } from '@/utils/businessContact'

export type { DiscoveryResponse } from '@/utils/discoveryDraft'
const primary = `${styles.primary} min-h-11 px-5 py-3 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-semibold disabled:opacity-50 disabled:cursor-not-allowed`
const secondary = `${styles.secondary} min-h-11 px-4 py-2 rounded-xl border border-[var(--border-hi)] text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-50`
const field = `${styles.field} query-field w-full rounded-xl border border-[var(--border-hi)] p-3 text-[var(--text)]`
const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`
const factLabels: Record<FactId, string> = { business: 'Your business', pain: 'What is difficult', current: 'How you do it now', workflow: 'How you want it to work', users: 'Who will use it', constraints: 'Tools and other needs', priority: 'What matters first' }
const emptyContactLinks: BusinessContactLinks = { call: null, whatsapp: null }
function ReviewAction({ label, kind = 'edit', disabled, onClick, type = 'button', id }: {
  label: string
  kind?: 'edit' | 'save' | 'cancel'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  id?: string
}) {
  return <button id={id} type={type} className={styles.reviewAction} title={label} disabled={disabled} onClick={onClick}>
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={kind === 'save' ? 'm5 12 4 4L19 6' : kind === 'cancel' ? 'm6 6 12 12M6 18 18 6' : 'm16 3 5 5M3 21l5-1 13-13a2 2 0 0 0-5-5L3 15z'} />
    </svg><span className="sr-only">{label}</span>
  </button>
}
function ContactIcon({ whatsapp = false }: { whatsapp?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {whatsapp ? <><path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8.2 7.8c.6 3.9 2.2 5.5 6.1 6.1l1.2-1.5-2-1-1 1c-1.3-.6-2-1.3-2.6-2.6l1-1-1-2-1.7 1Z" /></> : <path d="m8 3 3 5-2 2a14 14 0 0 0 5 5l2-2 5 3c0 3-2 5-4 5C10 21 3 14 3 7c0-2 2-4 5-4Z" />}
  </svg>
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

function DependencyWarnings({ issues, busy, onChoosePlace, onAddSurface, onRemove }: {
  issues: ScopeDependencyIssue[]
  busy: boolean
  onChoosePlace: () => void
  onAddSurface: (surfaceId: SolutionScope['surfaceIds'][number]) => void
  onRemove: (issue: ScopeDependencyIssue) => void
}) {
  if (!issues.length) return null
  return <div className="space-y-3" aria-label="Selection conflicts">
    {issues.map(issue => {
      const onlySurface = issue.compatibleSurfaceIds.length === 1 ? issue.compatibleSurfaceIds[0] : null
      const compatibleNames = issue.compatibleSurfaceIds.map(id => SURFACE_CHOICES[id].name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' or $1')
      return <section key={`${issue.group}:${issue.itemId}`} role="alert" className={styles.dependencyWarning}>
      <div className={styles.warningHeading}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
        <div><h3>Fix this before continuing</h3><p><strong>{customerWording(issue.itemName)}</strong> needs {compatibleNames}.</p></div>
      </div>
      <p className={styles.warningGuidance}>Choose one of these options. Everything else in your plan stays unchanged.</p>
      <div className={styles.warningActions}>
        <button type="button" className={primary} disabled={busy} onClick={() => onlySurface ? onAddSurface(onlySurface) : onChoosePlace()}>{onlySurface ? `Add ${SURFACE_CHOICES[onlySurface].name}` : 'Choose a compatible place'}</button>
        <button type="button" className={secondary} disabled={busy} onClick={() => onRemove(issue)}>Remove {customerWording(issue.itemName)}</button>
      </div>
    </section>})}
  </div>
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
  if (result) lines.push(`Standard build range: ${money(result.pricing.standardLow)}–${money(result.pricing.standardHigh)}`, 'Promotional offer: 28.6% off the standard build price.')
  if (result) lines.push(`Indicative build range: ${money(result.lowEstimateCost)}–${money(result.highEstimateCost)}`, `Engineering hours: ${Math.round(result.lowEstimateHours)}–${Math.round(result.highEstimateHours)}${session.scope.timelineSpeed === 'expedited' ? '; 25% priority uplift included in the build range' : ''}`, `Planning window: ${result.weeks.low}–${result.weeks.high} weeks, subject to team capacity and scope review`)
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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [approved, setApproved] = useState(false)
  const [allowPartial, setAllowPartial] = useState(false)
  const [editing, setEditing] = useState<FactId | null>(null)
  const [correction, setCorrection] = useState('')
  // Callback flow retained for re-enabling once email delivery is restored.
  // const [proposalOpen, setProposalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [planStep, setPlanStep] = useState<PlanStep>(0)
  const [completedPlanSteps, setCompletedPlanSteps] = useState(0)
  const [reviewed, setReviewed] = useState<ReviewedFields>({})
  const [planOptionsOpen, setPlanOptionsOpen] = useState(false)
  const [recovery, setRecovery] = useState<{ mode: DiscoveryMode | null; invalid: boolean; token?: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [extrasOpen, setExtrasOpen] = useState(true)
  const [revisitingQuestion, setRevisitingQuestion] = useState<FactId | null>(null)
  const questionCorrections = useRef<Partial<Record<FactId, string>>>({})
  const currentView = useRef<DiscoveryResponse | null>(null)
  const drafts = useRef<DraftStore['drafts']>({})
  const views = useRef<Partial<Record<DiscoveryMode, DiscoveryResponse>>>({})
  const mounted = useRef(true)
  const locked = useRef(false)
  const pending = useRef<AbortController | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionHeading = useRef<HTMLHeadingElement>(null)
  const questionPages = useRef<HTMLElement>(null)
  const planMenu = useRef<HTMLDivElement>(null)
  const planMenuButton = useRef<HTMLButtonElement>(null)
  const revealQuestion = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        (entry.target as HTMLElement).dataset.revealVisible = String(entry.isIntersecting)
      })
    }, { threshold: 0, rootMargin: '-70px 0px -24px 0px' })
    const selector = `.${styles.sectionHeading} > *, .${styles.intro} > :not(.${styles.modeBar}), .${styles.modeBar} > button`
    section.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
      element.dataset.reveal = ''
      element.style.setProperty('--reveal-enter', `${Math.min(index * 0.09, 0.58)}s`)
      element.style.setProperty('--reveal-exit', `${Math.max(0, 0.24 - index * 0.04)}s`)
      observer.observe(element)
    })
    return () => observer.disconnect()
  }, [])

  // function openProposal() { setProposalOpen(true) }

  const persistDrafts = useCallback((activeMode: DiscoveryMode) => {
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 2, activeMode, drafts: drafts.current }))
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch { /* Storage is optional; both in-memory drafts still work. */ }
  }, [])

  const saveDraft = useCallback(() => {
    if (!view) return
    drafts.current[view.session.mode] = { requirementAnswers: drafts.current[view.session.mode]?.requirementAnswers, token: view.token, expiresAt: view.session.expiresAt, scope, answer, selectedOptions, editing, correction, planStep, completedPlanSteps, reviewed }
    views.current[view.session.mode] = view
    persistDrafts(view.session.mode)
  }, [view, scope, answer, selectedOptions, editing, correction, planStep, completedPlanSteps, reviewed, persistDrafts])
  const latestSaveDraft = useRef(saveDraft)
  useEffect(() => { latestSaveDraft.current = saveDraft }, [saveDraft])

  function retireSession(mode?: DiscoveryMode) {
    if (mode) {
      const local = drafts.current[mode]
      if (local) drafts.current[mode] = { ...local, token: '', needsRestart: true, reviewed: {}, planStep: 0, completedPlanSteps: 0, editing: null, correction: '' }
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
    const requirementAnswers = data.aiReview?.status === 'succeeded' || data.aiReview?.status === 'failed' ? undefined : local?.requirementAnswers
    if (data.session.reviewMode === 'batch' && data.session.stage === 'discovery' && !requiresAIReview(data.session) && requirementAnswers) {
      const session = restoreRequirementAnswers(data.session, requirementAnswers)
      data = { ...data, session, question: QUESTIONS.find(question => !session.facts[question.id]) ?? null }
    }
    if (currentView.current?.session.expiresAt !== data.session.expiresAt || currentView.current?.session.mode !== data.session.mode) questionCorrections.current = {}
    currentView.current = data
    views.current[data.session.mode] = data
    setView(data)
    // Only local, unconfirmed inputs may overlay a server-validated review.
    const acceptedScope = local && data.session.stage === 'review' ? local.scope : data.session.scope
    const pendingAnswer = data.session.pendingAIReview?.action === 'answer' ? data.session.pendingAIReview.field : undefined
    const acceptedAnswer = local?.answer ?? (pendingAnswer ? data.session.answers?.[pendingAnswer] ?? data.session.facts[pendingAnswer]?.evidence ?? '' : '')
    const acceptedOptions = local?.selectedOptions ?? []
    const acceptedEditing = local?.editing ?? null
    const pendingEdit = data.session.pendingAIReview?.action === 'edit' ? data.session.pendingAIReview.field : undefined
    const acceptedCorrection = pendingEdit ? local?.correction || data.session.answers?.[pendingEdit] || data.session.facts[pendingEdit]?.evidence || '' : local?.correction ?? ''
    const acceptedStep = data.session.stage === 'confirmed' ? 3 : local?.planStep ?? 0
    const acceptedCompletedSteps = data.session.stage === 'confirmed' ? 3 : local?.completedPlanSteps ?? local?.planStep ?? 0
    const acceptedReviewed = local?.reviewed ?? {}
    setScope(acceptedScope)
    setAnswer(acceptedAnswer)
    setSelectedOptions(acceptedOptions)
    setEditing(acceptedEditing)
    setCorrection(acceptedCorrection)
    setPlanStep(acceptedStep)
    setCompletedPlanSteps(acceptedCompletedSteps)
    setReviewed(acceptedReviewed)
    setApproved(false)
    setAllowPartial(false)
    // setProposalOpen(false)
    setError('')
    setRecovery(null)
    setPlanOptionsOpen(false)
    setNotice('')
    setExtrasOpen(true)
    setRevisitingQuestion(pendingEdit ?? null)
    drafts.current[data.session.mode] = { requirementAnswers, token: data.token, expiresAt: data.session.expiresAt, scope: acceptedScope, answer: acceptedAnswer, selectedOptions: acceptedOptions, editing: acceptedEditing, correction: acceptedCorrection, planStep: acceptedStep, completedPlanSteps: acceptedCompletedSteps, reviewed: acceptedReviewed }
    persistDrafts(data.session.mode)
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
        const data = await requestDiscovery({ action: 'restore', token }, controller.signal)
        if (expectedMode && data.session?.mode !== expectedMode) throw new Error('This saved draft belongs to another approach. Please start again.')
        if (active && !controller.signal.aborted) {
          accept(data, local)
          setNotice('Plan restored.')
        }
      } catch (failure) {
        if (active) {
          if (failure instanceof RejectedSession) retireSession(expectedMode)
          else {
            setError(controller.signal.aborted ? 'Session recovery took too long. You can start a new session below.' : failure instanceof Error ? failure.message : 'Could not restore your session. Please retry.')
            setRecovery({ mode: expectedMode ?? null, invalid: false, token: token ?? undefined })
          }
        }
      } finally {
        clearTimeout(timer)
        if (active) setReady(true)
      }
    })()
    return () => { cleanup(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => { saveDraft(); draftTimer.current = null }, 180)
  }, [ready, saveDraft])
  useEffect(() => () => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    latestSaveDraft.current()
  }, [])
  // Discrete choices must reach storage before a reload, rather than waiting
  // behind the text-input debounce. Approval is deliberately never persisted.
  useEffect(() => {
    if (ready) latestSaveDraft.current()
  }, [ready, scope, planStep, completedPlanSteps, reviewed])
  useEffect(() => {
    const flush = () => latestSaveDraft.current()
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  useEffect(() => {
    const pages = questionPages.current
    const activePage = pages?.querySelector<HTMLButtonElement>('[aria-current="page"]')
    if (pages && activePage) pages.scrollTo?.({ left: Math.max(0, activePage.offsetLeft - (pages.clientWidth - activePage.offsetWidth) / 2), behavior: 'instant' })
    questionHeading.current?.focus({ preventScroll: true })
    // The document owns vertical scrolling. Only reveal a new question after
    // deliberate navigation, and only if its heading is outside the usable view.
    const heading = questionHeading.current
    if (revealQuestion.current && heading) {
      const bounds = heading.getBoundingClientRect()
      const headerBottom = document.getElementById('nav')?.getBoundingClientRect().bottom ?? 0
      if (bounds.top < headerBottom || bounds.bottom > window.innerHeight) heading.scrollIntoView?.({ block: 'start', behavior: 'instant' })
    }
    revealQuestion.current = false
  }, [view?.question?.id, view?.session.stage, view?.session.mode, view?.session.revision, planStep, revisitingQuestion])

  useEffect(() => {
    if (!planOptionsOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !planMenu.current?.contains(event.target)) setPlanOptionsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPlanOptionsOpen(false); planMenuButton.current?.focus() }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [planOptionsOpen])

  async function request(payload: Record<string, unknown>, expectedMode?: DiscoveryMode, local?: LocalDraft, options: { preserveEstimateOnRejection?: boolean } = {}): Promise<boolean> {
    if (locked.current) return false
    if (currentView.current && requiresAIReview(currentView.current.session) && ['answer', 'edit', 'review', 'confirm'].includes(String(payload.action))) return false
    saveDraft()
    locked.current = true
    setBusy(true)
    setAnalysing(payload.action === 'answer' || payload.action === 'edit' || payload.action === 'review_answers')
    setError('')
    const controller = new AbortController()
    pending.current = controller
    const timer = setTimeout(() => controller.abort(), 25000)
    try {
      const current = currentView.current
      const data = await requestDiscovery({ token: current?.token, revision: current?.session.revision, ...payload }, controller.signal)
      if (!mounted.current || controller.signal.aborted) return false
      const mode = expectedMode ?? current?.session.mode
      if (mode && data.session?.mode !== mode) throw new Error('The approach changed unexpectedly. Your current draft is still here; please retry.')
      // A correction changes the requirements. Preserve unsent text/navigation,
      // but never let the old local scope overwrite the recomputed server plan.
      revealQuestion.current = true
      const refreshScope = payload.action === 'edit' || (payload.action === 'retry_ai' && current?.session.pendingAIReview?.action === 'answer')
      const acceptedLocal = local ?? (data.aiReview?.status === 'failed' ? drafts.current[data.session.mode] : undefined)
      accept(data, refreshScope && acceptedLocal ? { ...acceptedLocal, scope: data.session.scope, reviewed: {}, completedPlanSteps: 0 } : acceptedLocal)
      return data.aiReview?.status !== 'failed'
    } catch (failure) {
      if (mounted.current) {
        if (failure instanceof RejectedSession && options.preserveEstimateOnRejection) {
          setError('This saved session could not be validated for editing. Your estimate and choices are still available below. Please contact a consultant if retrying does not help.')
        } else if (failure instanceof RejectedSession) retireSession(expectedMode ?? currentView.current?.session.mode)
        else setError(controller.signal.aborted ? 'The request took too long. Your current input is still here; please retry.' : failure instanceof Error ? failure.message : 'Connection interrupted. Please retry.')
      }
      return false
    } finally {
      clearTimeout(timer)
      locked.current = false
      pending.current = null
      if (mounted.current) { setBusy(false); setAnalysing(false) }
    }
  }

  async function startNewSession(mode: DiscoveryMode, keepInputs = false) {
    const saved = keepInputs ? drafts.current[mode] : undefined
    const local: LocalDraft | undefined = saved ? { ...saved, reviewed: {}, planStep: 0, completedPlanSteps: 0, editing: null, correction: '' } : undefined
    if (await request({ action: 'start', mode }, mode, local)) {
      if (saved) setNotice(mode === 'manual' ? 'New session started. Your saved choices are here as an unconfirmed draft—please review them again.' : saved.requirementAnswers ? 'New guided session started. Your locally saved answers are restored; complete the remaining questions before AI review.' : 'New guided session started. Your unsent answer is still here. Earlier submitted answers could not be restored; please answer the questions again.')
    }
  }
  async function retryRecovery() {
    if (!recovery) return
    const local = recovery.mode ? drafts.current[recovery.mode] : undefined
    const retryToken = recovery.token ?? local?.token
    if (!retryToken) return
    await request({ action: 'restore', token: retryToken }, recovery.mode ?? undefined, local)
  }

  async function switchMode(mode: DiscoveryMode) {
    if (locked.current || !ready) return
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
    const current = currentView.current
    if (locked.current || !current || !text.trim() || text.trim().length > 2000 || requiresAIReview(current.session)) return
    // A second submit can arrive before React commits the next local question.
    // Never save the old rendered answer against the already-advanced ref.
    if (view?.question?.id !== current.question?.id) return
    if (current.session.reviewMode === 'batch' && current.session.stage === 'discovery' && current.question) {
      const answers = { ...Object.fromEntries(customerAnswers(current.session)), [current.question.id]: text.trim() }
      if (QUESTIONS.every(question => answers[question.id])) {
        if (await request({ action: 'review_answers', answers })) { setAnswer(''); setSelectedOptions([]) }
      } else {
        const session = restoreRequirementAnswers(current.session, { [current.question.id]: text })
        revealQuestion.current = true
        accept({ ...current, session, question: QUESTIONS.find(question => !session.facts[question.id]) ?? null }, {
          ...drafts.current.guided!, requirementAnswers: answers, answer: '', selectedOptions: [], correction: '', editing: null,
        })
      }
      return
    }
    if (await request({ action: 'answer', answer: text })) {
      setAnswer('')
      setSelectedOptions([])
    }
  }
  function toggle(group: 'surfaceIds' | 'capabilityIds' | 'integrationIds' | 'modifierIds', id: string) {
    setCompletedPlanSteps(previous => Math.min(previous, group === 'surfaceIds' ? 0 : group === 'capabilityIds' ? 1 : 2))
    setScope(previous => {
      const ids = previous[group] as string[]
      return clearInactiveAnswers({ ...previous, [group]: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] })
    })
    setApproved(false)
    setAllowPartial(false)
    setReviewed(previous => ({ ...previous, [group]: true, ...(id === 'payments' ? { billing: false } : {}), ...(id === 'existing_crm' ? { crmProvider: false } : {}) }))
  }
  function changePreference(preference: Partial<Pick<SolutionScope, 'billing' | 'crmProvider' | 'timelineSpeed' | 'riskProfile'>>) {
    setCompletedPlanSteps(previous => Math.min(previous, 2))
    setScope(previous => clearInactiveAnswers({ ...previous, ...preference }))
    setApproved(false)
    setAllowPartial(false)
    setReviewed(previous => ({ ...previous, ...Object.fromEntries(Object.keys(preference).map(key => [key, true])) }))
  }
  function goToStep(step: PlanStep) { if (aiBlocked && step > planStep) return; revealQuestion.current = true; setPlanStep(step); setApproved(false); setAllowPartial(false) }
  function nextPlanStep() {
    if (aiBlocked) return
    if (planStep === 0 && !scope.surfaceIds.length) return
    if (planStep === 1 && !scope.capabilityIds.length && !reviewed.capabilityIds) return
    if (planStep === 1 && reviewScope(scope).issues.length) return
    if (planStep === 2 && reviewScope(scope).issues.length) return
    if (planStep === 2 && scope.capabilityIds.includes('payments') && scope.billing === 'undecided') return
    setReviewed(previous => ({ ...previous, ...(planStep === 0 ? { surfaceIds: true } : planStep === 1 ? { capabilityIds: true } : { integrationIds: true, modifierIds: true, billing: true, crmProvider: true, timelineSpeed: true, riskProfile: true }) }))
    setCompletedPlanSteps(previous => Math.max(previous, Math.min(3, planStep + 1)))
    goToStep(Math.min(3, planStep + 1) as PlanStep)
  }
  function editSolution() {
    if (!view || view.session.stage !== 'confirmed' || !view.result) return
    // These choices were already confirmed. Reopen their overview, not an empty
    // questionnaire; accept() still clears approval and partial-estimate consent.
    const local: LocalDraft = {
      token: view.token, expiresAt: view.session.expiresAt, scope: view.session.scope,
      answer: '', selectedOptions: [], editing: null, correction: '', planStep: 3, completedPlanSteps: 3,
      reviewed: Object.fromEntries(REVIEW_FIELDS.map(key => [key, true])),
    }
    void request({ action: 'review' }, view.session.mode, local, { preserveEstimateOnRejection: true })
  }
  const { issues, pricedScope } = useMemo(() => reviewScope(scope), [scope])
  const dependencyIssues = useMemo(() => scopeDependencyIssues(scope), [scope])
  const session = view?.session
  const aiBlocked = session ? requiresAIReview(session) : false
  const retryAt = session?.aiReviewFailureDetails?.retryAt
  const [retryClock, setRetryClock] = useState(Date.now)
  useEffect(() => {
    setRetryClock(Date.now())
    if (!aiBlocked || !retryAt || retryAt <= Date.now()) return
    const timer = setInterval(() => { const now = Date.now(); setRetryClock(now); if (now >= retryAt) clearInterval(timer) }, 1000)
    return () => clearInterval(timer)
  }, [aiBlocked, retryAt])
  const retryRemaining = retrySecondsRemaining(retryAt, retryClock)
  const result = view?.result
  const reviewingRequirements = session?.mode === 'guided' && session.stage === 'review' && revisitingQuestion !== null
  const showingRequirements = session?.stage === 'discovery' || reviewingRequirements
  const reviewItems = useMemo(() => session ? discoveryReviewItems(session, scope) : [], [session, scope])
  const progressInput = { scope, reviewed, approved, allowPartial, planStep, completedPlanSteps, hasResult: !!result, reviewingRequirements }
  const originalAnswers = session ? customerAnswers(session) : new Map<FactId, string>()
  const excludedChoices = [
    ...scope.surfaceIds.filter(id => !pricedScope.surfaceIds.includes(id)).map(id => SURFACE_CHOICES[id].name),
    ...scope.capabilityIds.filter(id => !pricedScope.capabilityIds.includes(id)).map(id => CAPABILITY_CHOICES[id].name),
    ...scope.integrationIds.filter(id => !pricedScope.integrationIds.includes(id)).map(id => INTEGRATION_CHOICES[id].name),
    ...scope.modifierIds.filter(id => !pricedScope.modifierIds.includes(id)).map(id => MODIFIER_CHOICES[id].name),
  ]
  const questionNames: Record<FactId, string> = { business: 'Business', pain: 'Main problem', current: 'Current process', workflow: 'Ideal workflow', users: 'People', constraints: 'Existing tools', priority: 'Priority' }
  const IntroHeading = headingLevel
  const composedAnswer = [...selectedOptions, answer.trim()].filter(Boolean).join('. ')
  const answerTooLong = composedAnswer.length > 2000
  function selectSuggestedOption(option: string) {
    const exclusive = option === 'No existing systems or special requirements'
    setSelectedOptions(previous => exclusive ? [option] : [...previous.filter(value => value !== 'No existing systems or special requirements'), option])
  }
  function removeSuggestedOption(option: string) {
    setSelectedOptions(previous => previous.filter(value => value !== option))
    requestAnimationFrame(() => {
      const returned = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-answer-suggestion]')).find(button => button.dataset.answerSuggestion === option)
      returned?.focus({ preventScroll: true })
    })
  }
  const currentQuestionIndex = view?.question ? QUESTIONS.findIndex(question => question.id === view.question?.id) : QUESTIONS.length
  const activeQuestionIndex = revisitingQuestion ? QUESTIONS.findIndex(question => question.id === revisitingQuestion) : currentQuestionIndex
  const previousQuestion = session ? [...QUESTIONS.slice(0, Math.max(0, activeQuestionIndex))].reverse().find(question => session.facts[question.id]) : undefined
  function visitQuestion(field: FactId) {
    if (busy || !session || session.mode !== 'guided' || !['discovery', 'review'].includes(session.stage)) return
    if (field !== view?.question?.id && !session.facts[field]) return
    if (revisitingQuestion) questionCorrections.current[revisitingQuestion] = correction
    revealQuestion.current = true
    if (field === view?.question?.id && session.pendingAIReview?.action !== 'edit') {
      setRevisitingQuestion(null)
      setCorrection('')
    } else {
      setRevisitingQuestion(field)
      setCorrection(questionCorrections.current[field] ?? originalAnswers.get(field) ?? session.facts[field]?.evidence ?? '')
    }
  }
  function visitPreviousQuestion() {
    if (previousQuestion) visitQuestion(previousQuestion.id)
  }
  function openRequirements(fromEnd = false) {
    if (!session || session.mode !== 'guided' || session.stage !== 'review') return
    const questions = fromEnd ? [...QUESTIONS].reverse() : QUESTIONS
    const question = questions.find(item => session.facts[item.id])
    if (question) visitQuestion(question.id)
  }
  function continuePlanning() {
    if (aiBlocked) return
    if (revisitingQuestion) questionCorrections.current[revisitingQuestion] = correction
    revealQuestion.current = true
    setRevisitingQuestion(null)
    setCorrection('')
  }
  async function saveAnswerCorrection(field: FactId) {
    if (!view || !session || !correction.trim() || correction.trim().length > 2000) return false
    const local: LocalDraft = {
      token: view.token, expiresAt: session.expiresAt, scope, answer, selectedOptions,
      editing: null, correction: '', planStep, completedPlanSteps, reviewed,
    }
    if (session.reviewMode === 'batch' && session.stage === 'discovery' && !requiresAIReview(session)) {
      const answers = { ...Object.fromEntries(customerAnswers(session)), [field]: correction.trim() }
      const updated = restoreRequirementAnswers(session, { [field]: correction.trim() })
      accept({ ...view, session: updated, question: view.question }, { ...local, requirementAnswers: answers })
      delete questionCorrections.current[field]
      return true
    }
    const saved = await request({ action: 'edit', field, value: correction.trim(), ...(session.stage === 'review' ? { scope } : {}) }, session.mode, local)
    if (saved) delete questionCorrections.current[field]
    return saved
  }
  function cancelAnswerCorrection(field: FactId) {
    setEditing(null)
    setCorrection('')
    requestAnimationFrame(() => document.getElementById(`edit-action-${field}`)?.focus({ preventScroll: true }))
  }
  async function retryAIReview() {
    if (!view || !session || session.stage === 'confirmed' || retryRemaining > 0) return
    const local: LocalDraft = {
      token: view.token, expiresAt: session.expiresAt, scope, answer, selectedOptions,
      editing, correction, planStep, completedPlanSteps, reviewed,
    }
    const succeeded = await request({ action: 'retry_ai', scope }, session.mode, local)
    if (succeeded && session.pendingAIReview?.action === 'answer') { setAnswer(''); setSelectedOptions([]) }
    if (succeeded && session.pendingAIReview?.action === 'edit') { setEditing(null); setRevisitingQuestion(null); setCorrection('') }
  }
  async function saveRevisitedAnswer() {
    if (!revisitingQuestion || !view || !session || !correction.trim() || correction.trim().length > 2000) return
    const editedIndex = QUESTIONS.findIndex(question => question.id === revisitingQuestion)
    const nextAnsweredQuestion = QUESTIONS.slice(editedIndex + 1, currentQuestionIndex).find(question => session.facts[question.id])
    const saved = await saveAnswerCorrection(revisitingQuestion)
    if (!saved) return
    if (nextAnsweredQuestion) {
      setRevisitingQuestion(nextAnsweredQuestion.id)
      const saved = currentView.current?.session
      setCorrection(questionCorrections.current[nextAnsweredQuestion.id] ?? (saved ? customerAnswers(saved).get(nextAnsweredQuestion.id) ?? saved.facts[nextAnsweredQuestion.id]?.evidence ?? '' : ''))
    } else {
      setRevisitingQuestion(null)
      setCorrection('')
    }
  }
  function removeDependencyIssue(issue: ScopeDependencyIssue) {
    toggle(issue.group, issue.itemId)
  }
  function addCompatibleSurface(surfaceId: SolutionScope['surfaceIds'][number]) {
    if (!scope.surfaceIds.includes(surfaceId)) toggle('surfaceIds', surfaceId)
  }

  async function exportEstimate() {
    if (!view) return
    setExporting(true)
    setError('')
    try {
      const { createEstimatePdf } = await import('@/utils/estimatePdf')
      const pdf = await createEstimatePdf(view)
      pdf.save('exter-cloud-solution-estimate.pdf')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The PDF could not be generated. Please retry, or contact a consultant by call or WhatsApp.') }
    finally { setExporting(false) }
  }

  return <section ref={sectionRef} className={styles.plannerSection} aria-label="Cost Estimator">
    <header className={styles.sectionHeading}>
      <IntroHeading>Cost <span>Estimator</span></IntroHeading>
      <p>Start with what’s slowing you down. We’ll help you decide what to build—no technical knowledge needed.</p>
    </header>
    <div className={styles.experience} data-active={!!session}>
    <div inert={analysing} aria-busy={analysing} data-planner-content>
    {!recovery && !session && <header className={styles.intro}>
      <h3 className={styles.approachHeading}>How would you like to build your plan?</h3>
      <p className={styles.approachDescription}>Answer a few questions with us, or choose what you need yourself.</p>
      <div className={styles.modeBar} role="group" aria-label="Choose your approach">
        <button className={`${secondary} ${styles.modeButton} ${styles.guidedMode}`} aria-pressed="false" disabled={busy || !ready} onClick={() => void switchMode('guided')}>Guide me</button>
        <button className={`${secondary} ${styles.modeButton} ${styles.manualMode}`} aria-pressed="false" disabled={busy || !ready} onClick={() => void switchMode('manual')}>Build my own plan</button>
      </div>
      <p className={styles.modeHint}>Each approach keeps its own draft and progress in this tab for up to 24 hours.</p>
    </header>}
    <div>
    <p role="status" className="sr-only">{busy ? 'Saving your discovery…' : ready ? 'Ready' : 'Restoring your discovery…'}</p>
    {error && <div role="alert" className="rounded-xl border border-[var(--error)] text-[var(--error)] p-4 mb-6">{error}</div>}
    {recovery && <div className={`${styles.glass} p-5 mb-6 space-y-3`} role="status" aria-label="Session recovery">
      <h2 className="font-semibold">{recovery.invalid ? 'Your saved session has expired' : 'We couldn’t open your saved plan'}</h2>
      <p className="text-sm text-[var(--muted)]">{recovery.invalid ? 'Start a fresh session. Any unsent text and available choices will remain as an unconfirmed draft; submitted answers may need to be entered again.' : 'Your draft is still saved. Try opening it again when the connection is available.'}</p>
      {recovery.invalid
        ? <button className={primary} disabled={busy || !ready} onClick={() => void startNewSession(recovery.mode ?? 'guided', true)}>Start a fresh {recovery.mode === 'manual' ? 'build-your-own' : 'guided'} plan</button>
        : <button className={primary} disabled={busy || !ready || (!recovery.token && !recovery.mode)} onClick={() => void retryRecovery()}>Try opening again</button>}
      {(['guided', 'manual'] as const).filter(mode => mode !== recovery.mode && drafts.current[mode]).map(mode => <button key={mode} className={secondary} disabled={busy || !ready} onClick={() => void switchMode(mode)}>Resume saved {mode === 'guided' ? 'guided' : 'build-your-own'} plan</button>)}
    </div>}
    {notice && <p role="status" className={notice === 'Plan restored.' ? 'sr-only' : 'text-sm text-[var(--muted)] mb-6'}>{notice}</p>}
    {!ready && <p className="text-[var(--muted)]">Restoring your discovery…</p>}
    {session && ready && !recovery && <DiscoveryProgress session={session} {...progressInput} onReviewRequirements={!busy && session.mode === 'guided' && session.stage === 'review' && !reviewingRequirements && Object.keys(session.facts).length > 0 ? () => openRequirements() : undefined} onContinuePlanning={!busy && !aiBlocked && reviewingRequirements ? continuePlanning : undefined} />}

    {session && view && <>
      <div className={styles.sessionTools}>
        <div className={styles.planToolbar}>
          <div className={styles.approachNavigation}>
            <nav className={styles.questionNavigation} aria-label="Question navigation">
              <button type="button" className={styles.backArrow} disabled={busy || (showingRequirements ? !previousQuestion : session.stage === 'review' ? planStep === 0 && (session.mode !== 'guided' || !Object.keys(session.facts).length) : !result)} aria-label={showingRequirements ? 'Back to previous question' : session.stage === 'confirmed' ? 'Back to plan review' : planStep === 0 && session.mode === 'guided' ? 'Back to requirements' : 'Back to previous step'} onClick={() => showingRequirements ? visitPreviousQuestion() : session.stage === 'confirmed' ? editSolution() : planStep > 0 ? goToStep((planStep - 1) as PlanStep) : openRequirements(true)}>
                {showingRequirements ? <span aria-hidden="true">←</span> : <><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12H4m6-6-6 6 6 6" /></svg><span className="sr-only">Back</span></>}
              </button>
            </nav>
          <p className="text-sm" aria-label="Current approach"><strong>{session.mode === 'guided' ? 'Guide me' : 'Build my own plan'}</strong></p>
          </div>
          <div ref={planMenu} className={styles.planMenu}>
            <button ref={planMenuButton} type="button" className={styles.planToggle} aria-label="Plan menu" title="Start or resume a plan" aria-expanded={planOptionsOpen} aria-controls="discovery-plan-options" onClick={() => setPlanOptionsOpen(open => !open)}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
            </button>
            {planOptionsOpen && <div id="discovery-plan-options" className={styles.planOptions} role="group" aria-label="Plan actions">
              {(['guided', 'manual'] as const).filter(mode => mode !== session.mode && drafts.current[mode] && !drafts.current[mode]?.needsRestart).map(mode => <button key={mode} type="button" disabled={busy || !ready} onClick={() => void switchMode(mode)}>Resume saved {mode === 'guided' ? 'guided' : 'build-your-own'} plan</button>)}
              <button type="button" disabled={busy} onClick={() => void startNewSession('guided')}>Start a new guided plan</button>
              <button type="button" disabled={busy} onClick={() => void startNewSession('manual')}>Start a new build-your-own plan</button>
            </div>}
          </div>
        </div>
      </div>
      <div className={styles.workspace} data-guided-workspace={session.mode === 'guided'}>
        <div className={`${styles.glass} ${styles.panelFrame} min-w-0`} data-planner-frame>
        <div className={`${styles.questionPanel} space-y-4 min-w-0`} data-question-layout={showingRequirements} role="region" aria-label={showingRequirements ? 'Your requirements' : 'Your solution plan'} tabIndex={0}>
          {session.mode === 'guided' && session.turns > 0 && session.providerStatus === 'guided_fallback' && (session.reviewMode !== 'batch' || !!session.aiReviewFailure) && <section className={styles.dependencyWarning} role={view.aiReview?.status === 'failed' ? 'alert' : 'status'} aria-label="AI review status">
            <h3 className="font-semibold">The last AI review did not complete</h3><p>{aiReviewFailureMessage(session.aiReviewFailure)}</p>
            <p>{aiBlocked ? 'Your answer is saved. Retry AI review successfully before continuing. Your selections are preserved.' : 'Your answers are saved. Retry the review to update the AI suggestions.'}</p>
            {retryRemaining > 0 && <p role="timer" aria-live="off">Retry available in {retryRemaining} seconds.</p>}
            <button type="button" className={secondary} disabled={busy || retryRemaining > 0} onClick={() => void retryAIReview()}>{busy ? 'Retrying AI review…' : retryRemaining > 0 ? `Retry in ${retryRemaining}s` : 'Retry AI review'}</button>
          </section>}
          {showingRequirements && <nav ref={questionPages} className={styles.questionPages} aria-label="Discovery questions">{QUESTIONS.map((question, index) => {
            const answered = !!session.facts[question.id]
            const current = index === activeQuestionIndex
            const status = aiBlocked && session.pendingAIReview?.field === question.id ? 'Awaiting AI review' : session.facts[question.id]?.status === 'unknown' ? 'Needs clarification' : answered ? 'Completed' : question.id === view.question?.id ? 'Current' : 'Not answered'
            return <button key={question.id} type="button" aria-current={current ? 'page' : undefined} disabled={busy || (!answered && question.id !== view.question?.id)} onClick={() => visitQuestion(question.id)}><span className={styles.questionNumber}>{index + 1}</span><span>{questionNames[question.id]}<small className="sr-only">{status}</small></span></button>
          })}</nav>}
          {showingRequirements && <div className={`${styles.questionScroll} space-y-4`}>
            {session.turns > 0 && (session.reviewMode !== 'batch' || session.stage !== 'discovery' || aiBlocked) && <details className={styles.answerRecap} data-ai-understanding key={`${session.revision}:${revisitingQuestion ?? 'current'}`}>
              <summary>{session.providerStatus === 'available' ? 'AI understanding' : 'AI understanding unavailable'}</summary>
              {session.providerStatus === 'available' ? <div className="space-y-3 pb-3">
                <p>{customerWording(session.assistantMessage)}</p>
                {session.recommendations.length > 0 && <div><h3 className="font-semibold">Possible features to review</h3><ul className="list-disc pl-5 space-y-2">{session.recommendations.map(item => {
                  const choices = { surfaceIds: SURFACE_CHOICES, capabilityIds: CAPABILITY_CHOICES, integrationIds: INTEGRATION_CHOICES, modifierIds: MODIFIER_CHOICES }[item.group] as Record<string, { name: string }>
                  return <li key={`${item.group}:${item.id}`}><strong>{choices[item.id]?.name ?? item.id}: </strong>{customerWording(item.reason)}</li>
                })}</ul></div>}
                {session.reviewItems.length > 0 && <div><h3 className="font-semibold">Still needs discussion</h3><ul className="list-disc pl-5">{session.reviewItems.map(item => <li key={item}>{customerWording(item)}</li>)}</ul></div>}
                <p className="text-xs">Based on your saved answers. Save any changes to update this understanding. Suggested features need your review before estimating.</p>
              </div> : <p>{aiBlocked ? 'Your answers are saved. Retry AI review successfully before continuing.' : 'The last AI review did not complete. Your answers are saved; retry to update the AI suggestions.'}</p>}
            </details>}
            {revisitingQuestion && <form onSubmit={event => { event.preventDefault(); void saveRevisitedAnswer() }} className={styles.questionForm}>
              <p className={styles.eyebrow}>EARLIER QUESTION</p>
              <div className={styles.questionHeader}>
                <h2 ref={questionHeading} tabIndex={-1} className="text-xl font-semibold outline-none">{QUESTIONS.find(question => question.id === revisitingQuestion)?.text}</h2>
              </div>
              <label htmlFor="guided-history-answer" className="block text-sm font-medium">Your saved answer</label>
              <SavedAnswerEditor key={`${revisitingQuestion}:${session.revision}`} id="guided-history-answer" value={correction} options={QUESTIONS.find(question => question.id === revisitingQuestion)?.options ?? []} disabled={busy || aiBlocked} onChange={setCorrection} />
              <p className="text-sm text-[var(--muted)]">{reviewingRequirements ? 'Save any corrections, or select Your solution above to return to planning.' : 'Edit this answer, then continue forward. Your unsent answer on the current question is preserved.'}</p>
              <div className={styles.actions}>
                <button type="submit" className={primary} disabled={busy || aiBlocked || !correction.trim() || correction.trim().length > 2000}>{busy ? 'Saving…' : 'Save and continue'}</button>
              </div>
            </form>}
            {!revisitingQuestion && view.question && <form onSubmit={event => { event.preventDefault(); if (!answerTooLong) void sendAnswer(composedAnswer) }} className={styles.questionForm}>
              <p className={styles.eyebrow}>Question {QUESTIONS.findIndex(question => question.id === view.question?.id) + 1} of {QUESTIONS.length}</p>
              <div className={styles.questionHeader}>
                <h2 ref={questionHeading} tabIndex={-1} className="text-xl font-semibold outline-none">{view.question.text}</h2>
              </div>
              <label htmlFor="discovery-answer" className="block text-sm font-medium">Add any useful details</label>
              <div className={styles.answerComposer}>
                {selectedOptions.length > 0 && <div className={styles.answerChips} aria-label="Selected answers">{selectedOptions.map(option => <span className={styles.answerChip} key={option}><span>{option}</span><button type="button" disabled={busy || aiBlocked} aria-label={`Remove ${option}`} onClick={() => removeSuggestedOption(option)}>×</button></span>)}</div>}
                <textarea id="discovery-answer" className={styles.composerInput} rows={4} maxLength={2000} value={answer} disabled={busy || aiBlocked} onChange={event => setAnswer(event.target.value)} aria-describedby="discovery-answer-hint discovery-answer-limit" placeholder="A few sentences are enough." />
              </div>
              {view.question.options.some(option => !selectedOptions.includes(option)) && <div className={styles.answerSuggestions}><p>Suggestions — choose as many as apply</p><div>{view.question.options.filter(option => !selectedOptions.includes(option)).map(option => <button key={option} type="button" className={secondary} data-answer-suggestion={option} aria-pressed="false" disabled={busy || aiBlocked} onClick={() => selectSuggestedOption(option)}>{option}</button>)}</div></div>}
              <p id="discovery-answer-hint" className="text-sm text-[var(--muted)]">Add details if useful. Don’t include passwords or private customer records.</p>
              <p id="discovery-answer-limit" className={composedAnswer.length > 1600 || answerTooLong ? `text-xs ${answerTooLong ? 'text-[var(--error)]' : 'text-[var(--muted)]'}` : 'sr-only'}>{composedAnswer.length.toLocaleString('en-IN')} of 2,000 characters including selected answers.</p>
              <div className={styles.actions}>
                <button type="submit" className={primary} disabled={busy || aiBlocked || !composedAnswer || answerTooLong}>{analysing ? 'Analysing…' : busy ? 'Saving…' : session.reviewMode === 'batch' && view.question.id === 'priority' ? 'Review all answers with AI' : 'Continue'}</button>
              </div>
            </form>}
          </div>}

          {session.stage === 'review' && !reviewingRequirements && <>
            <p className={styles.eyebrow}>YOUR PLAN · {planStep + 1} OF 4</p>
            <h2 ref={questionHeading} tabIndex={-1} className="text-2xl font-bold outline-none">{['Where will people use it?', 'What should it help you do?', 'A few useful details', 'Review your plan'][planStep]}</h2>
            <p className="text-[var(--muted)]">{[
              'Choose one or more. A website, team workspace and mobile app can share one connected plan.',
              'Choose the features that matter now. You can add more later.',
              'Keep the displayed options or change them. Continuing accepts your choices, including any defaults you keep.',
              'Check what is included, what remains unanswered and the assumptions before you approve.',
            ][planStep]}</p>
            {session.mode === 'guided' && session.recommendations.length > 0 && planStep === 0 && <details className={styles.aiPlan}><summary>Why these suggestions?</summary><p className="text-sm text-[var(--muted)]">These suggestions are a starting point for review. Your current selections are shown below. Review the reasons, keep only what you need, and add anything the AI missed.</p><ul className="space-y-3">{session.recommendations.map(item => {
              const choices = { surfaceIds: SURFACE_CHOICES, capabilityIds: CAPABILITY_CHOICES, integrationIds: INTEGRATION_CHOICES, modifierIds: MODIFIER_CHOICES }[item.group] as Record<string, { name: string }>
              return <li key={`${item.group}:${item.id}`}><strong>{choices[item.id]?.name ?? item.id}</strong><span>{item.reason}</span><small>Your evidence: “{item.evidence}”</small></li>
            })}</ul></details>}
            {planStep === 0 && <>
            <ScopeGroup hideLegend title="Where will people use it?" catalog={SURFACE_CHOICES} selected={scope.surfaceIds} disabled={busy} onToggle={id => toggle('surfaceIds', id)} />
            <DependencyWarnings issues={dependencyIssues} busy={busy} onChoosePlace={() => questionHeading.current?.focus()} onAddSurface={addCompatibleSurface} onRemove={removeDependencyIssue} />
            </>}
            {planStep === 1 && <>
            <ScopeGroup hideLegend title="What should it help you do?" catalog={CAPABILITY_CHOICES} selected={scope.capabilityIds} disabled={busy} onToggle={id => toggle('capabilityIds', id)} />
            <label className={`${styles.choice} flex items-start gap-3 p-4 rounded-xl`}><input type="checkbox" className="mt-1 h-5 w-5" disabled={busy} checked={!scope.capabilityIds.length && reviewed.capabilityIds === true} onChange={event => {
              const checked = event.target.checked
              setScope(previous => clearInactiveAnswers({ ...previous, capabilityIds: [] }))
              setReviewed(previous => ({ ...previous, capabilityIds: checked, billing: false }))
              setCompletedPlanSteps(previous => Math.min(previous, 1))
              setApproved(false); setAllowPartial(false)
            }} /><span>No extra features for now<span className="block text-sm text-[var(--muted)] mt-1">Continue with just the places you chose.</span></span></label>
            <DependencyWarnings issues={dependencyIssues} busy={busy} onChoosePlace={() => goToStep(0)} onAddSurface={addCompatibleSurface} onRemove={removeDependencyIssue} />
            </>}
            {planStep === 2 && <>
            <details className={styles.disclosure} open={extrasOpen} onToggle={event => setExtrasOpen(event.currentTarget.open)}>
              <summary>Connections and extra needs{scope.integrationIds.length + scope.modifierIds.length > 0 ? ` · ${scope.integrationIds.length + scope.modifierIds.length} selected` : ' (optional)'}</summary>
              <p className="text-sm text-[var(--muted)] mb-5">Open this if you already use another tool, need offline access, or want staff to use a company login.</p>
              <div className="space-y-6">
                <ScopeGroup title="Connect tools you already use" catalog={INTEGRATION_CHOICES} selected={scope.integrationIds} disabled={busy} onToggle={id => toggle('integrationIds', id)} />
                <ScopeGroup title="Other needs" catalog={MODIFIER_CHOICES} selected={scope.modifierIds} disabled={busy} onToggle={id => toggle('modifierIds', id)} />
              </div>
            </details>
            <DependencyWarnings issues={dependencyIssues} busy={busy} onChoosePlace={() => goToStep(0)} onAddSurface={addCompatibleSurface} onRemove={removeDependencyIssue} />
            {scope.capabilityIds.includes('payments') && <fieldset className={styles.paymentWarning} aria-describedby={scope.billing === 'undecided' ? 'payment-type-warning' : undefined}>
              <legend>What kind of payments do you need? <span>(required)</span></legend>
              {scope.billing === 'undecided' && <div id="payment-type-warning" role="alert" className={styles.paymentWarningMessage}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg><span>Select one payment type before reviewing your plan.</span></div>}
              <div className={styles.paymentChoices}>
                <label className={`${styles.choice} ${scope.billing === 'one_time' ? styles.selected : ''}`}><input type="radio" name="payment-type" value="one_time" checked={scope.billing === 'one_time'} disabled={busy} onChange={() => changePreference({ billing: 'one_time' })} /><span><strong>One-time payments</strong><small>Customers pay once for an order, booking or service.</small></span></label>
                <label className={`${styles.choice} ${scope.billing === 'recurring' ? styles.selected : ''}`}><input type="radio" name="payment-type" value="recurring" checked={scope.billing === 'recurring'} disabled={busy} onChange={() => changePreference({ billing: 'recurring' })} /><span><strong>Recurring subscriptions</strong><small>Customers are charged automatically on a repeating schedule.</small></span></label>
              </div>
            </fieldset>}
            {scope.integrationIds.includes('existing_crm') && <label className="block space-y-2"><span>Which customer system do you use?</span><select className={field} disabled={busy} value={scope.crmProvider} aria-describedby="scope-followup-hint" onChange={event => changePreference({ crmProvider: event.target.value as SolutionScope['crmProvider'] })}><option value="undecided">Not decided yet</option><option value="hubspot">HubSpot</option><option value="salesforce">Salesforce</option><option value="zoho">Zoho</option></select></label>}
            {scope.integrationIds.includes('existing_crm') && <p id="scope-followup-hint" className="text-sm text-[var(--muted)]">Keeping “Not decided yet” is valid for an existing CRM connection. A partial estimate leaves that connection out and keeps it for discussion.</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-2"><span className="block">Delivery preference</span><select className={field} disabled={busy} value={scope.timelineSpeed} onChange={event => changePreference({ timelineSpeed: event.target.value as SolutionScope['timelineSpeed'] })}><option value="standard">Standard planning</option><option value="expedited">Priority planning (+25% cost)</option></select></label>
              <label className="space-y-2"><span className="block">How much have you decided?</span><select className={field} disabled={busy} value={scope.riskProfile} onChange={event => changePreference({ riskProfile: event.target.value as SolutionScope['riskProfile'] })}><option value="clear">I have a clear plan</option><option value="standard">Some details to discuss</option><option value="novel">A new or unusual idea</option></select></label>
            </div>
            <p className="text-sm text-[var(--muted)]">If Standard planning and “Some details to discuss” suit you, keep them. They will be included as your choices when you continue.</p>
            </>}
            {planStep < 3 && <div className={styles.actions}>
              <button className={primary} disabled={busy || aiBlocked || (planStep === 0 && !scope.surfaceIds.length) || (planStep === 1 && ((!scope.capabilityIds.length && !reviewed.capabilityIds) || issues.length > 0)) || (planStep === 2 && (dependencyIssues.length > 0 || (scope.capabilityIds.includes('payments') && scope.billing === 'undecided')))} onClick={nextPlanStep}>{planStep === 2 ? 'Review these details' : planStep === 1 ? 'Continue to details' : 'Continue to features'}</button>
            </div>}
            {planStep === 3 && <>
            {session.mode === 'guided' && <section aria-label="Review your answers" className="space-y-4">
              <h3 className="text-lg font-semibold">Your answers</h3>
              <p className="text-sm text-[var(--muted)]">Use the pen to correct an answer.</p>
              {QUESTIONS.map(question => {
                const fact = session.facts[question.id]
                if (!fact) return null
                return <div key={question.id} className={styles.answerReviewRow}>
                  {editing === question.id ? <form className="space-y-3" onSubmit={event => { event.preventDefault(); void saveAnswerCorrection(question.id) }} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); cancelAnswerCorrection(question.id) } }}>
                    <div className={styles.reviewRowHeader}><label htmlFor={`edit-${question.id}`} className="font-semibold">{factLabels[question.id]}</label>
                    <div className="flex gap-3">
                      <ReviewAction label="Save correction" kind="save" type="submit" disabled={busy || aiBlocked || !correction.trim() || correction.trim().length > 2000} />
                      <ReviewAction label="Cancel" kind="cancel" disabled={busy} onClick={() => cancelAnswerCorrection(question.id)} />
                    </div></div>
                    <SavedAnswerEditor key={`${question.id}:${session.revision}`} id={`edit-${question.id}`} value={correction} options={question.options} disabled={busy || aiBlocked} onChange={setCorrection} />
                  </form> : <>
                    <div className={styles.reviewRowHeader}><h4 className="font-semibold">{factLabels[question.id]}</h4><ReviewAction id={`edit-action-${question.id}`} label={`Edit ${factLabels[question.id].toLowerCase()}`} disabled={busy} onClick={() => { setEditing(question.id); setCorrection(originalAnswers.get(question.id) ?? fact.evidence); requestAnimationFrame(() => document.getElementById(`edit-${question.id}`)?.focus({ preventScroll: true })) }} /></div>
                    <p className="whitespace-pre-wrap break-words">{originalAnswers.get(question.id) ?? fact.evidence}</p>
                    {fact.status === 'unknown' && <p className="text-[var(--muted)]">Needs clarification</p>}
                  </>}
                </div>
              })}
            </section>}
            <div className={styles.reviewRows} role="region" aria-label="Your selected plan">
              {([
                ['Places', scope.surfaceIds.map(id => SURFACE_CHOICES[id].name).join(', '), 0],
                ['Features', scope.capabilityIds.map(id => CAPABILITY_CHOICES[id].name).join(', ') || 'No extra features selected', 1],
                ['Connections & extras', [...scope.integrationIds.map(id => INTEGRATION_CHOICES[id].name), ...scope.modifierIds.map(id => MODIFIER_CHOICES[id].name)].join(', ') || 'None included in this estimate', 2],
              ] as const).map(([label, value, step]) => <div key={label}><div className="min-w-0"><h3 className="font-semibold">{label}</h3><p className="text-sm text-[var(--muted)] mt-1">{value}</p></div><ReviewAction label={`Edit ${label.toLowerCase()}`} disabled={busy} onClick={() => goToStep(step)} /></div>)}
              <div><div className="min-w-0"><h3 className="font-semibold">Estimate preferences</h3><p className="text-sm text-[var(--muted)] mt-1">{scope.timelineSpeed === 'standard' ? 'Standard planning' : 'Priority planning (+25% cost)'} · {scope.riskProfile === 'clear' ? 'A clear plan' : scope.riskProfile === 'novel' ? 'A new or unusual idea' : 'Some details to discuss'}. Your choices, including defaults you kept.</p></div><ReviewAction label="Edit details" disabled={busy} onClick={() => goToStep(2)} /></div>
              {(scope.capabilityIds.includes('payments') || scope.integrationIds.includes('existing_crm')) && <p className="text-sm text-[var(--muted)]">{scope.capabilityIds.includes('payments') && `Payments: ${scope.billing === 'undecided' ? 'Not decided yet' : scope.billing === 'one_time' ? 'One-time payments' : 'Recurring subscriptions'}. `}{scope.integrationIds.includes('existing_crm') && `Customer system: ${scope.crmProvider === 'undecided' ? 'Not decided yet' : scope.crmProvider}.`}</p>}
              {excludedChoices.length > 0 && <p className="text-sm text-[var(--muted)]">Needs discussion · not priced in a partial estimate: {excludedChoices.join(', ')}.</p>}
            </div>
            <DependencyWarnings issues={dependencyIssues} busy={busy} onChoosePlace={() => goToStep(0)} onAddSurface={addCompatibleSurface} onRemove={removeDependencyIssue} />
            <details className={styles.disclosure}><summary>Estimate notes</summary><div className="pt-2 text-sm space-y-2"><p>Shared work is counted once. Each website, workspace or app adds its own build work. The team confirms the final details and price.</p><p>Hosting, domains, licenses, AI use, messaging, maintenance, ongoing marketing and taxes are separate.</p></div></details>
            {reviewItems.length > 0 && <div className="rounded-xl border border-[var(--border-hi)] p-4 text-sm space-y-3"><h3 className="font-semibold">Optional team review</h3><ul className="list-disc pl-5 space-y-1">{reviewItems.map(item => <li key={item}>{customerWording(item)}</li>)}</ul><label className="flex gap-3 items-start min-h-11"><input type="checkbox" className="mt-1 h-5 w-5" checked={allowPartial} disabled={busy} onChange={event => setAllowPartial(event.target.checked)} /><span>Leave these unanswered items out and continue with a partial estimate.</span></label></div>}
            <label className="flex gap-3 items-start min-h-11 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} /><span>I have reviewed my answers, chosen features and what this estimate includes.</span></label>
            <div className={styles.actions}>
              <button className={primary} disabled={busy || aiBlocked || !approved || issues.length > 0 || (reviewItems.length > 0 && !allowPartial)} onClick={() => void request({ action: 'confirm', scope, confirmed: approved, allowPartial })}>{busy ? 'Calculating…' : allowPartial ? 'Confirm and estimate selected work only' : 'Confirm my plan and see estimate'}</button>
              {/* Callback requests paused until email delivery is restored.
              <button className={secondary} disabled={busy} onClick={openProposal}>Ask the team for guidance</button>
              */}
            </div>
            </>}
          </>}

          {session.stage === 'confirmed' && result && <>
            <div className={styles.resultHeader}>
              <h2 ref={questionHeading} tabIndex={-1} className="text-2xl font-bold outline-none">{session.allowPartial ? 'Partial estimate — selected work only' : 'Your estimated project cost'}</h2>
              <ReviewAction label="Edit solution" disabled={busy} onClick={editSolution} />
            </div>
            {session.allowPartial && <div role="status" className="border border-[var(--border-hi)] p-4 rounded-xl text-sm">This range leaves out the items below. It is not the total project cost.<ul className="list-disc pl-5 mt-2">{reviewItems.map(item => <li key={item}>{customerWording(item)}</li>)}</ul></div>}
            <div className={styles.preliminaryNotice} role="note"><h3>Preliminary estimate—not a final quotation</h3><p>This range comes from an initial AI-assisted study of the business information you provided. Workflow details, integrations, existing data, security needs and implementation complexity can change the final scope, price and delivery plan.</p><p>An Exter Cloud Solution Consultant can review the recommendation with you, remove unnecessary work, identify missing requirements and decide what fits the current budget versus a later phase.</p></div>
            <EstimatePrice pricing={result.pricing} />
            <p>Estimated time: {result.weeks.low}–{result.weeks.high} weeks. We’ll confirm availability and the details with you.</p>
            <p className="text-sm text-[var(--muted)]">This is a starting estimate, not a final quote. Hosting, domains, licenses, messaging, AI use, maintenance, ongoing marketing and taxes are separate.</p>
            <details className={styles.disclosure}><summary>What’s included and how we calculated it</summary><p className="text-sm text-[var(--muted)] mb-3">{Math.round(result.lowEstimateHours)}–{Math.round(result.highEstimateHours)} engineering hours{session.scope.timelineSpeed === 'expedited' ? ' · 25% priority uplift included in the build range' : ''}</p><ul className="divide-y divide-[var(--border)]">{result.work.map(item => <li key={item.id} className="py-3 flex justify-between gap-4 text-sm"><span className="min-w-0">{customerWording(item.name)}</span><span className="whitespace-nowrap">{item.expectedHours.toFixed(1)} base hrs</span></li>)}</ul><p className="mt-3 text-sm text-[var(--muted)]">Base work {result.rawFeatureTotal.toFixed(1)}h + integration coordination {result.surcharge.toFixed(1)}h + deployment setup {result.setupOverhead}h + QA {result.qaOverhead.toFixed(1)}h + project management {result.pmOverhead.toFixed(1)}h. The range then applies scope uncertainty and the selected risk profile.</p></details>
            <div className="flex flex-wrap gap-3">
              {/* <button className={primary} onClick={openProposal}>Request a consultation</button> */}
              <button className={`${secondary} inline-flex items-center justify-center gap-2`} disabled={exporting} onClick={() => void exportEstimate()}><svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg><span>{exporting ? 'Preparing PDF…' : 'Download PDF estimate'}</span></button>
            </div>
            <div className={styles.teamHandoff}>
              <h3 className="font-semibold">Review it with a Solution Consultant</h3>
              <p className="text-sm text-[var(--muted)] mt-2">A consultant will help re-evaluate the AI recommendation, clarify needs versus optional wants, and shape a practical first release around the available budget.</p>
              <div className={styles.contactActions} role="group" aria-label="Contact an Exter Cloud Solution Consultant">
                {/* <button className={secondary} onClick={openProposal}>Request a consultant call</button> */}
                {contactLinks.call ? <a className={`${secondary} ${styles.contactLink}`} href={contactLinks.call}><ContactIcon />Call our consultant</a> : <button className={`${secondary} ${styles.contactLink}`} disabled><ContactIcon />Call our consultant</button>}
                {contactLinks.whatsapp ? <a className={`${secondary} ${styles.contactLink}`} href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer"><ContactIcon whatsapp />WhatsApp our consultant</a> : <button className={`${secondary} ${styles.contactLink}`} disabled><ContactIcon whatsapp />WhatsApp our consultant</button>}
              </div>
              <p className="text-xs text-[var(--muted)] mt-3">WhatsApp opens with a short greeting only—you choose what to send.</p>
              {(!contactLinks.call || !contactLinks.whatsapp) && <p className="text-xs text-[var(--muted)] mt-2">Some direct-contact options are currently unavailable.</p>}
            </div>
          </>}
        </div>

        </div>
      </div>
      {/* Callback dialog retained while email delivery is paused.
      <QueryModal open={proposalOpen} onClose={() => setProposalOpen(false)} purpose="callback" initialMessage={proposalSummary({ ...view, reviewItems, session: { ...session, scope } })} />
      */}
    </>}
    </div>
    </div>
    {analysing && <div className={styles.aiOverlay} data-ai-overlay>
      <div className={styles.aiWorking} role="status" aria-live="polite" aria-atomic="true">
        <div className={styles.aiOrbit} aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /></svg></div>
        <span className={styles.eyebrow}>YOUR PLAN, TAKING SHAPE</span>
        <strong>AI is analysing your requirements</strong>
        <p>Connecting your answer with the rest of your plan to suggest the right features.</p>
        <div className={styles.aiActivity} aria-hidden="true"><span /><span /><span /></div>
        <small>Your answers stay right here.</small>
      </div>
    </div>}
    </div>
  </section>
}
