import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES, SOLUTION_CATALOG_VERSION, emptyScope, isRecord, parseIds, reviewScope, type SolutionScope } from './solutionCatalog'
import { reconcileRequestedSurfaces, surfaceClarifications } from './discoverySurfaceIntent'

export const DISCOVERY_VERSION = 1
export const MAX_DISCOVERY_TURNS = 8
export const QUESTIONS = [
  { id: 'business', label: 'Your business', text: 'Tell me a little about your business and the people you serve.', options: [] },
  { id: 'pain', label: 'Main difficulty', text: 'What is the biggest difficulty you want to solve, and how does it affect your day?', options: ['Enquiries are getting lost', 'Too much manual work', 'Customers struggle to book or pay', 'I’m not sure yet'] },
  { id: 'current', label: 'Current process and tools', text: 'How do you handle this today? Tell me what tools you use and where the process breaks down.', options: ['WhatsApp and spreadsheets', 'An existing CRM', 'Mostly manual work', 'We are starting from scratch'] },
  { id: 'workflow', label: 'Desired outcome and workflow', text: 'Walk me through what you would like to happen, from the first customer interaction to a successful result.', options: [] },
  { id: 'users', label: 'People and access', text: 'Who will use the solution, and do they need a website, a browser workspace, a mobile app, or a combination?', options: [] },
  { id: 'constraints', label: 'Existing systems and constraints', text: 'What must we connect to or preserve? Include existing data, offline use, special security needs, or anything outside a standard build.', options: ['No existing systems or special requirements', 'Connect WhatsApp', 'Connect our current CRM', 'I’m not sure yet'] },
  { id: 'priority', label: 'First-release priority', text: 'What matters most for the first release? You can also share a target date or budget comfort if you know it.', options: ['Start small and grow', 'Launch as soon as practical', 'Connect the whole workflow', 'I’m not sure yet'] },
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
  messages: DiscoveryMessage[]
  recommendations: Recommendation[]
  reviewItems: string[]
  scope: SolutionScope
  allowPartial: boolean
  assistantMessage: string
  providerStatus: 'available' | 'guided_fallback'
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
  return answers
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
export function nextQuestion(session: DiscoverySession) {
  if (session.stage !== 'discovery' || session.turns >= MAX_DISCOVERY_TURNS) return null
  return QUESTIONS.find(question => !Object.hasOwn(session.facts, question.id)) ?? null
}
export function missingCriticalFacts(session: DiscoverySession): string[] {
  if (session.mode === 'manual') return []
  return QUESTIONS.filter(question => ['pain', 'workflow', 'users', 'constraints'].includes(question.id) && (!session.facts[question.id] || session.facts[question.id]?.status === 'unknown')).map(question => `${question.label} still needs confirmation.`)
}
export function manualReviewItems(session: DiscoverySession): string[] {
  const facts = Object.values(session.facts).map(fact => fact?.value ?? '').join(' ')
  const items = [...session.reviewItems, ...missingCriticalFacts(session), ...(session.mode === 'guided' ? surfaceClarifications(session, QUESTIONS) : [])]
  if (session.mode === 'guided' && session.providerStatus === 'guided_fallback') items.push('AI scope mapping was unavailable. The team must check that the selected catalogue work covers your stated requirements.')
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
    messages: [...session.messages, { role: 'assistant', text: question.text }, { role: 'user', text }], allowPartial: false,
    assistantMessage: 'I’ve saved your answer. The review will separate what you’ve told me from suggested scope.',
  }
  if (!nextQuestion(updated)) updated.stage = 'review'
  return reconcileRequestedSurfaces(updated, QUESTIONS)
}

export interface AgentOutput {
  acknowledgment: string
  facts: { field: FactId; value: string; evidence: string }[]
  recommendations: Recommendation[]
  reviewItems: { text: string; evidence: string }[]
}
const recommendationCatalogs = { surfaceIds: SURFACES, capabilityIds: CAPABILITIES, integrationIds: INTEGRATIONS, modifierIds: MODIFIERS }
export function validateAgentOutput(value: unknown, answer: string): AgentOutput {
  if (!isRecord(value)) throw new DiscoveryValidationError('The assistant returned an invalid response.')
  const acknowledgment = boundedText(value.acknowledgment, 800)
  if (!Array.isArray(value.facts) || value.facts.length > QUESTIONS.length || !Array.isArray(value.recommendations) || value.recommendations.length > 25 || !Array.isArray(value.reviewItems) || value.reviewItems.length > 8) throw new DiscoveryValidationError('The assistant returned invalid discovery data.')
  const facts: AgentOutput['facts'] = []
  for (const entry of value.facts) {
    if (!isRecord(entry) || !isFactId(entry.field) || facts.some(fact => fact.field === entry.field)) throw new DiscoveryValidationError('The assistant returned invalid fact fields.')
    const evidence = boundedText(entry.evidence)
    if (!answer.includes(evidence)) throw new DiscoveryValidationError('A fact has no supporting customer evidence.')
    facts.push({ field: entry.field, value: boundedText(entry.value, 600), evidence })
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
    if (!answer.includes(evidence)) throw new DiscoveryValidationError('A review item has no customer evidence.')
    return { text: boundedText(entry.text, 300), evidence }
  })
  return { acknowledgment, facts, recommendations, reviewItems }
}
export function applyAgentOutput(session: DiscoverySession, output: AgentOutput): DiscoverySession {
  const facts = { ...session.facts }
  for (const fact of output.facts) facts[fact.field] = { value: fact.value, evidence: fact.evidence, status: isUnknown(fact.value) ? 'unknown' : 'reported', source: 'ai' }
  const evidenceText = Object.values(facts).map(fact => fact?.evidence ?? '').join('\n')
  const recommendations = output.recommendations.filter(item => evidenceText.includes(item.evidence))
  const updated = { ...session, facts, recommendations, reviewItems: [...new Set([...session.reviewItems, ...output.reviewItems.map(item => item.text)])], assistantMessage: output.acknowledgment, providerStatus: 'available' as const }
  // The server, never the model, decides when to stop questioning.
  if (!nextQuestion(updated)) updated.stage = 'review'
  const scope = emptyScope()
  for (const suggestion of recommendations) {
    const list = scope[suggestion.group] as string[]
    if (!list.includes(suggestion.id)) list.push(suggestion.id)
  }
  updated.scope = scope
  return reconcileRequestedSurfaces(updated, QUESTIONS)
}
export function editFact(session: DiscoverySession, field: unknown, value: unknown): DiscoverySession {
  if (!isFactId(field)) throw new DiscoveryValidationError('Unknown requirement field.')
  const text = boundedText(value)
  return reconcileRequestedSurfaces({
    ...session, revision: session.revision + 1, stage: 'review',
    facts: { ...session.facts, [field]: { value: text, evidence: text, status: isUnknown(text) ? 'unknown' : 'reported', source: 'edit' } },
    recommendations: [], reviewItems: [], scope: emptyScope(), allowPartial: false, providerStatus: 'guided_fallback',
    assistantMessage: 'Your correction is saved. Re-select the solution below so the previous recommendation and estimate cannot carry over unnoticed.',
  }, QUESTIONS)
}
