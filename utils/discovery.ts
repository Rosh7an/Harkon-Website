import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES, SOLUTION_CATALOG_VERSION, clearInactiveAnswers, emptyScope, isRecord, parseIds, reviewScope, type CapabilityId, type SolutionScope } from './solutionCatalog'
import { reconcileRequestedSurfaces, surfaceClarifications } from './discoverySurfaceIntent'
import { workflowRecommendations } from './discoveryWorkflowIntent'
import type { AIReviewFailure, AIReviewProviderDetails } from './discoveryAIStatus'

export const DISCOVERY_VERSION = 1
export const MAX_DISCOVERY_TURNS = 8
export const QUESTIONS = [
  { id: 'business', label: 'Your business', text: 'Tell me a little about your business and the people you serve.', options: [] },
  { id: 'pain', label: 'Main difficulty', text: 'What is the biggest difficulty you want to solve, and how does it affect your day?', options: ['Enquiries are getting lost', 'Too much manual work', 'Customers struggle to book or pay'] },
  { id: 'current', label: 'Current process and tools', text: 'How do you handle this today? Tell me what tools you use and where the process breaks down.', options: ['WhatsApp and spreadsheets', 'An existing CRM', 'Mostly manual work', 'We are starting from scratch'] },
  { id: 'workflow', label: 'Desired outcome and workflow', text: 'Walk me through what you would like to happen, from the first customer interaction to a successful result.', options: [] },
  { id: 'users', label: 'People and access', text: 'Who will use the solution, and do they need a website, a browser workspace, a mobile app, or a combination?', options: [] },
  { id: 'constraints', label: 'Existing systems and constraints', text: 'What must we connect to or preserve? Include existing data, offline use, special security needs, or anything outside a standard build.', options: ['No existing systems or special requirements', 'Connect WhatsApp', 'Connect our current CRM'] },
  { id: 'priority', label: 'First-release priority', text: 'What matters most for the first release? You can also share a target date or budget comfort if you know it.', options: ['Start small and grow', 'Launch as soon as practical', 'Connect the whole workflow'] },
] as const
export type FactId = typeof QUESTIONS[number]['id']
export interface DiscoveryFact { value: string; evidence: string; status: 'reported' | 'unknown'; source: 'answer' | 'ai' | 'edit' }
export interface DiscoveryMessage { role: 'user' | 'assistant'; text: string }
export interface Recommendation { group: 'surfaceIds' | 'capabilityIds' | 'integrationIds' | 'modifierIds'; id: string; reason: string; evidence: string }
export interface DiscoverySession {
  version: number
  catalogVersion: string
  revision: number
  expiresAt: number
  mode: 'guided' | 'manual'
  stage: 'discovery' | 'review' | 'confirmed'
  turns: number
  facts: Partial<Record<FactId, DiscoveryFact>>
  // Customer-owned text is separate from model-extracted summaries. Optional for older tokens.
  answers?: Partial<Record<FactId, string>>
  messages: DiscoveryMessage[]
  recommendations: Recommendation[]
  capabilityExclusions?: { id: CapabilityId; evidence: string }[]
  reviewItems: string[]
  scope: SolutionScope
  allowPartial: boolean
  assistantMessage: string
  providerStatus: 'available' | 'guided_fallback'
  aiReviewFailure?: AIReviewFailure
  aiReviewFailureReference?: string
  aiReviewFailureDetails?: AIReviewProviderDetails
  reviewMode?: 'batch'
  requirementsDirty?: boolean
  pendingAIReview?: { field: FactId; action: 'answer' | 'edit' }
}
export class DiscoveryValidationError extends Error {}
// Exports keep the customer's words rather than substituting an AI summary.
export function customerAnswers(session: DiscoverySession): Map<FactId, string> {
  const answers = new Map<FactId, string>()
  let topic: FactId | undefined
  for (const message of session.messages) {
    if (message.role === 'assistant') {
      const question = QUESTIONS.find(item => item.text === message.text)
      if (question) topic = question.id
    } else if (topic) answers.set(topic, message.text)
  }
  for (const question of QUESTIONS) {
    const fact = session.facts[question.id]
    const saved = session.answers?.[question.id] ?? (fact?.source === 'edit' ? fact.value : undefined)
    if (saved !== undefined) answers.set(question.id, saved)
  }
  return answers
}
export function originalRequirementAnswers(session: DiscoverySession) {
  const originals = customerAnswers(session)
  return QUESTIONS.flatMap(question => {
    const fact = session.facts[question.id]
    const text = originals.get(question.id) ?? fact?.evidence
    return text ? [{ field: question.id, text }] : []
  })
}
function reconcileRequirements(session: DiscoverySession): DiscoverySession {
  if (session.mode !== 'guided') return session
  const requested = reconcileRequestedSurfaces(session, QUESTIONS)
  const recommendations = workflowRecommendations(originalRequirementAnswers(requested), requested.recommendations)
  const reconciled = reconcileRequestedSurfaces({ ...requested, recommendations, scope: { ...requested.scope,
    surfaceIds: requested.scope.surfaceIds.filter(id => !requested.recommendations.some(item => item.group === 'surfaceIds' && item.id === id) || recommendations.some(item => item.group === 'surfaceIds' && item.id === id)),
    capabilityIds: [...new Set([...requested.scope.capabilityIds.filter(id => !requested.recommendations.some(item => item.group === 'capabilityIds' && item.id === id)), ...recommendations.filter(item => item.group === 'capabilityIds').map(item => item.id as SolutionScope['capabilityIds'][number])])],
  } }, QUESTIONS)
  const answers = originalRequirementAnswers(reconciled).map(answer => answer.text)
  const capabilityExclusions = (session.capabilityExclusions ?? []).filter(item => answers.some(answer => answer.includes(item.evidence)))
  const excluded = new Set(capabilityExclusions.map(item => item.id))
  return { ...reconciled, capabilityExclusions,
    recommendations: reconciled.recommendations.filter(item => item.group !== 'capabilityIds' || !excluded.has(item.id as CapabilityId)),
    scope: clearInactiveAnswers({ ...reconciled.scope, capabilityIds: reconciled.scope.capabilityIds.filter(id => !excluded.has(id)) }),
  }
}
export function isFactId(value: unknown): value is FactId {
  return typeof value === 'string' && QUESTIONS.some(question => question.id === value)
}
export function boundedText(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new DiscoveryValidationError(`Enter between 1 and ${max} characters.`)
  return value.trim()
}
export function isUnknown(value: string): boolean {
  return /^(i[’']?m not sure( yet)?|not sure( yet)?|i don[’']?t know|unsure|skip|unknown)[.!]?$/i.test(value.trim())
}
export function createDiscovery(mode: 'guided' | 'manual', now = Date.now()): DiscoverySession {
  return {
    version: DISCOVERY_VERSION, catalogVersion: SOLUTION_CATALOG_VERSION, revision: 0, expiresAt: now + 24 * 60 * 60 * 1000,
    mode, stage: mode === 'guided' ? 'discovery' : 'review', turns: 0, facts: {}, messages: [], recommendations: [], reviewItems: [], scope: emptyScope(), allowPartial: false,
    assistantMessage: mode === 'guided' ? 'I’ll help you turn the problem into a practical first release. You can answer in your own words or say you’re not sure.' : 'Choose the connected solution you need. Review the dependencies and assumptions before confirming.',
    providerStatus: 'guided_fallback',
  }
}
export function requiresAIReview(session: DiscoverySession): boolean {
  return session.mode === 'guided' && session.stage !== 'confirmed' && session.providerStatus === 'guided_fallback' && !!session.aiReviewFailure
}
export function nextQuestion(session: DiscoverySession) {
  if (requiresAIReview(session) && session.pendingAIReview) return QUESTIONS.find(question => question.id === session.pendingAIReview!.field) ?? null
  if (session.stage !== 'discovery' || session.turns >= MAX_DISCOVERY_TURNS) return null
  return QUESTIONS.find(question => !Object.hasOwn(session.facts, question.id)) ?? null
}
export function missingCriticalFacts(session: DiscoverySession): string[] {
  if (session.mode === 'manual') return []
  return QUESTIONS.filter(question => ['pain', 'workflow', 'users', 'constraints'].includes(question.id) && (!session.facts[question.id] || session.facts[question.id]?.status === 'unknown')).map(question => `${question.label} still needs confirmation.`)
}
// Older encrypted drafts stored an AI outage as an unresolved requirement.
// Provider availability is separate from unresolved customer requirements.
export function requirementReviewItems(items: string[]): string[] {
  return items.filter(item => !item.startsWith('AI scope mapping was unavailable.'))
}
export function manualReviewItems(session: DiscoverySession): string[] {
  const facts = Object.values(session.facts).map(fact => fact?.value ?? '').join(' ')
  const items = [...requirementReviewItems(session.reviewItems), ...missingCriticalFacts(session), ...(session.mode === 'guided' ? surfaceClarifications(session, QUESTIONS) : [])]
  if (/\b(migrat\w*|legacy|hipaa|gdpr|pci|compliance|regulated|medical records|banking|multi[- ]tenant|multi[- ]organization)\b/i.test(facts)) items.push('Data migration, regulated data, or complex existing-system requirements need human scoping.')
  return [...new Set(items)]
}
export function discoveryReviewItems(session: DiscoverySession, scope = session.scope): string[] {
  return [...new Set([...manualReviewItems(session), ...reviewScope(scope).reviewItems])]
}
export function recordAnswer(session: DiscoverySession, answer: unknown): DiscoverySession {
  const question = nextQuestion(session)
  if (!question) throw new DiscoveryValidationError('Discovery is ready for review.')
  const text = boundedText(answer)
  const updated: DiscoverySession = {
    ...session, revision: session.revision + 1, turns: session.turns + 1,
    facts: { ...session.facts, [question.id]: { value: text, evidence: text, status: isUnknown(text) ? 'unknown' : 'reported', source: 'answer' } },
    answers: { ...session.answers, [question.id]: text },
    messages: [...session.messages, { role: 'assistant', text: question.text }, { role: 'user', text }], allowPartial: false,
    assistantMessage: 'I’ve saved your answer. The review will separate what you’ve told me from suggested scope.',
  }
  if (!nextQuestion(updated)) updated.stage = 'review'
  return reconcileRequirements(updated)
}

export interface AgentOutput {
  acknowledgment: string
  facts: { field: FactId; value: string; evidence: string }[]
  recommendations: Recommendation[]
  excludedCapabilities?: { id: CapabilityId; evidence: string }[]
  reviewItems: { text: string; evidence: string }[]
}
const recommendationCatalogs = { surfaceIds: SURFACES, capabilityIds: CAPABILITIES, integrationIds: INTEGRATIONS, modifierIds: MODIFIERS }
export function validateAgentOutput(value: unknown, answer: string, currentAnswers: readonly string[] = []): AgentOutput {
  const evidenceSources = [answer, ...currentAnswers]
  if (!isRecord(value)) throw new DiscoveryValidationError('The assistant returned an invalid response.')
  const acknowledgment = boundedText(value.acknowledgment, 800)
  if (!Array.isArray(value.facts) || value.facts.length > QUESTIONS.length || !Array.isArray(value.recommendations) || value.recommendations.length > 25 || !Array.isArray(value.reviewItems) || value.reviewItems.length > 8) throw new DiscoveryValidationError('The assistant returned invalid discovery data.')
  const facts: AgentOutput['facts'] = []
  for (const entry of value.facts) {
    if (!isRecord(entry) || !isFactId(entry.field)) throw new DiscoveryValidationError('The assistant returned invalid fact fields.')
    const evidence = boundedText(entry.evidence)
    if (!evidenceSources.some(source => source.includes(evidence))) throw new DiscoveryValidationError('A fact has no supporting customer evidence.')
    const value = boundedText(entry.value, 600)
    const previous = facts.find(fact => fact.field === entry.field)
    if (previous) {
      // A model may split staff and manager details into the same topic twice.
      // Merge only when one original answer supports both quotes; the evidence
      // stays an exact contiguous substring, never a fabricated combined quote.
      const source = evidenceSources.find(text => text.includes(previous.evidence) && text.includes(evidence))
      if (!source) throw new DiscoveryValidationError('Repeated facts need evidence from the same customer answer.')
      const start = Math.min(source.indexOf(previous.evidence), source.indexOf(evidence))
      const end = Math.max(source.indexOf(previous.evidence) + previous.evidence.length, source.indexOf(evidence) + evidence.length)
      previous.evidence = source.slice(start, end)
      previous.value = previous.value === value ? value : boundedText(`${previous.value}; ${value}`, 600)
    } else facts.push({ field: entry.field, value, evidence })
  }
  const recommendations: Recommendation[] = []
  for (const entry of value.recommendations) {
    if (!isRecord(entry) || typeof entry.group !== 'string' || !Object.hasOwn(recommendationCatalogs, entry.group)) throw new DiscoveryValidationError('The assistant returned an invalid recommendation group.')
    const group = entry.group as Recommendation['group']
    const catalog = recommendationCatalogs[group] as Record<string, typeof SURFACES.website>
    const [id] = parseIds([entry.id], catalog, 'Recommendation')
    if (recommendations.some(item => item.id === id && item.group === group)) throw new DiscoveryValidationError('The assistant returned duplicate recommendations.')
    recommendations.push({ group, id, reason: boundedText(entry.reason, 300), evidence: boundedText(entry.evidence, 300) })
  }
  const reviewItems = value.reviewItems.map(entry => {
    if (!isRecord(entry)) throw new DiscoveryValidationError('The assistant returned invalid review items.')
    const evidence = boundedText(entry.evidence)
    if (!evidenceSources.some(source => source.includes(evidence))) throw new DiscoveryValidationError('A review item has no customer evidence.')
    return { text: boundedText(entry.text, 300), evidence }
  })
  // Optional for existing fixtures/callers; the provider schema requires this
  // field. A missing mention is never treated as a customer withdrawal.
  const excludedCapabilities: NonNullable<AgentOutput['excludedCapabilities']> = []
  if (value.excludedCapabilities !== undefined) {
    if (!Array.isArray(value.excludedCapabilities) || value.excludedCapabilities.length > Object.keys(CAPABILITIES).length) throw new DiscoveryValidationError('The assistant returned invalid capability exclusions.')
    for (const entry of value.excludedCapabilities) {
      if (!isRecord(entry)) throw new DiscoveryValidationError('The assistant returned an invalid capability exclusion.')
      const [id] = parseIds([entry.id], CAPABILITIES, 'Capability exclusion')
      const evidence = boundedText(entry.evidence, 300)
      if (!evidenceSources.some(source => source.includes(evidence))) throw new DiscoveryValidationError('A capability exclusion has no supporting customer evidence.')
      if (excludedCapabilities.some(item => item.id === id) || recommendations.some(item => item.group === 'capabilityIds' && item.id === id)) throw new DiscoveryValidationError('The assistant returned conflicting capability decisions.')
      excludedCapabilities.push({ id, evidence })
    }
  }
  return { acknowledgment, facts, recommendations, excludedCapabilities, reviewItems }
}
export function applyAgentOutput(session: DiscoverySession, output: AgentOutput): DiscoverySession {
  const facts = { ...session.facts }
  for (const fact of output.facts) {
    if (facts[fact.field]?.source === 'edit') continue
    facts[fact.field] = { value: fact.value, evidence: fact.evidence, status: isUnknown(fact.value) ? 'unknown' : 'reported', source: 'ai' }
  }
  // Omission by the model is not a customer withdrawal. Keep still-supported
  // suggestions, but never validate against stale summaries of replaced answers.
  const recommendations = supportedRecommendations(session, [...session.recommendations, ...output.recommendations])
  const excludedCapabilities = output.excludedCapabilities ?? []
  const capabilityExclusions = [
    ...(session.capabilityExclusions ?? []).filter(item => !excludedCapabilities.some(excluded => excluded.id === item.id) && !recommendations.some(recommended => recommended.group === 'capabilityIds' && recommended.id === item.id)),
    ...excludedCapabilities,
  ]
  const updated = { ...session, facts, recommendations, capabilityExclusions, reviewItems: [...new Set(requirementReviewItems([...session.reviewItems, ...output.reviewItems.map(item => item.text)]))], assistantMessage: output.acknowledgment, providerStatus: 'available' as const, aiReviewFailure: undefined, aiReviewFailureReference: undefined, aiReviewFailureDetails: undefined, pendingAIReview: undefined }
  // The server, never the model, decides when to stop questioning.
  if (!nextQuestion(updated)) updated.stage = 'review'
  const scope = { ...session.scope }
  for (const group of ['surfaceIds', 'capabilityIds', 'integrationIds', 'modifierIds'] as const) {
    scope[group] = session.scope[group].filter(id => !session.recommendations.some(item => item.group === group && item.id === id)) as never
  }
  for (const suggestion of recommendations) {
    const list = scope[suggestion.group] as string[]
    if (!list.includes(suggestion.id)) list.push(suggestion.id)
  }
  updated.scope = scope
  return reconcileRequirements(updated)
}
function supportedRecommendations(session: DiscoverySession, items: Recommendation[]): Recommendation[] {
  const answers = originalRequirementAnswers(session).map(answer => answer.text)
  const supported = new Map<string, Recommendation>()
  for (const item of items) {
    if (answers.some(answer => answer.includes(item.evidence))) supported.set(`${item.group}:${item.id}`, item)
  }
  return [...supported.values()]
}
export function editFact(session: DiscoverySession, field: unknown, value: unknown): DiscoverySession {
  if (!isFactId(field)) throw new DiscoveryValidationError('Unknown requirement field.')
  const text = boundedText(value)
  const updated: DiscoverySession = {
    ...session, revision: session.revision + 1, stage: session.stage === 'discovery' ? 'discovery' : 'review',
    facts: { ...session.facts, [field]: { value: text, evidence: text, status: isUnknown(text) ? 'unknown' : 'reported', source: 'edit' } },
    answers: { ...session.answers, [field]: text },
    reviewItems: [], allowPartial: false, providerStatus: 'guided_fallback',
    assistantMessage: 'Your correction is saved. Features still supported by your answers are kept. Review the updated plan before confirming a new estimate.',
  }
  const currentAnswers = [...customerAnswers(updated).values()]
  for (const question of QUESTIONS) {
    const fact = updated.facts[question.id]
    if (fact?.source === 'ai' && !currentAnswers.some(answer => answer.includes(fact.evidence))) delete updated.facts[question.id]
  }
  updated.recommendations = supportedRecommendations(updated, session.recommendations)
  // Preserve customer-added choices; remove only recommendations whose evidence
  // disappeared. Confirmation and the old price remain invalidated above.
  updated.scope = { ...session.scope }
  for (const group of ['surfaceIds', 'capabilityIds', 'integrationIds', 'modifierIds'] as const) {
    const removed = new Set(session.recommendations.filter(item => item.group === group && !updated.recommendations.some(kept => kept.group === group && kept.id === item.id)).map(item => item.id))
    updated.scope[group] = session.scope[group].filter(id => !removed.has(id)) as never
  }
  return reconcileRequirements(updated)
}
