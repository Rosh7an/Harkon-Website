import type { DiscoverySession, FactId, Recommendation } from './discovery'
import { SURFACES, type SurfaceId } from './solutionCatalog'

type Intent = { id: SurfaceId; decision: 'include' | 'exclude' | 'clarify'; evidence: string }
type Questions = readonly { id: FactId; text: string }[]
const mentions = /\b(websites?|web sites?|mobile[- ](?:apps?|applications?)|(?:android|iphone|ios) apps?|(?:web|browser) (?:apps?|workspaces?)|portals?|(?:internal|staff|team) management systems?|(?:admin|management) (?:dashboards?|consoles?))\b/gi
const wants = /\b(?:needs?|wants?|requires?|build|create|develop|looking for|like to have|should have|will use)\b/i
const negation = /\b(?:do not|don['’]t|not|no|without)\b/i

// This is deliberately a narrow English request matcher, not an NLP replacement.
// Unclear mentions stay for team review; price still requires customer approval.
function parseIntents(text: string, field: FactId | undefined): Intent[] {
  const intents: Intent[] = []
  for (const clause of text.split(/[.!?;\n]+|\s+(?:but|however|instead)\s+/i)) {
    let previousEnd = 0
    let inherited: Intent['decision'] | undefined
    const unclear = /\b(?:maybe|might|considering|whether|not sure|unsure|later|future)\b/i.test(clause) || (/^\s*(?:do|does|should|would|could|why|how)\b/i.test(clause) && !/^\s*do not\b/i.test(clause))
    const found = [...clause.matchAll(mentions)]
    for (const match of found) {
      const prefix = clause.slice(previousEnd, match.index)
      const id: SurfaceId = /^web ?site/i.test(match[0]) ? 'website' : /^(?:mobile|android|iphone|ios)/i.test(match[0]) ? 'mobile' : /^(?:admin|management|internal|staff|team)/i.test(match[0]) ? 'admin' : 'portal'
      const decision = unclear ? 'clarify' : negation.test(prefix.replace(/not only/gi, '')) ? 'exclude' : wants.test(prefix) ? 'include' : inherited ?? (field === 'users' && !/\b(?:already|currently|existing|today)\b/i.test(clause) ? 'include' : undefined)
      previousEnd = match.index! + match[0].length
      if (!decision) continue
      inherited = decision
      intents.push({ id, decision, evidence: clause.slice(Math.max(0, match.index! - 80), previousEnd + 100).trim() })
      const exclusive = found.length === 1 && !/not only/i.test(clause) && (/\b(?:only|just)\s+(?:(?:need|want|require)\s+)?(?:(?:a|an|the)\s+)?$/i.test(prefix) || /^\s*only\s*$/i.test(clause.slice(previousEnd)))
      if (decision === 'include' && exclusive) {
        for (const other of Object.keys(SURFACES) as SurfaceId[]) if (other !== id) intents.push({ id: other, decision: 'exclude', evidence: clause.trim().slice(0, 300) })
      }
    }
  }
  return intents
}

export function requestedSurfaceIntents(session: DiscoverySession, questions: Questions) {
  const decisions = new Map<SurfaceId, Intent>()
  let field: FactId | undefined
  const seen = new Set<FactId>()
  const apply = (text: string, topic?: FactId) => {
    for (const intent of parseIntents(text, topic)) decisions.set(intent.id, intent)
  }
  // Keep original customer wording even when AI summarises a fact too narrowly.
  // Edited facts replace the corresponding original answer, not the whole session.
  for (const message of session.messages) {
    if (message.role === 'assistant') {
      const question = questions.find(item => item.text === message.text)
      if (question) field = question.id
    } else {
      if (field) seen.add(field)
      if (!field || (session.facts[field]?.source !== 'edit' && !session.answers?.[field])) apply(message.text, field)
    }
  }
  for (const question of questions) {
    const fact = session.facts[question.id]
    const evidenceAlreadyRead = fact && session.messages.some(message => message.role === 'user' && message.text.includes(fact.evidence))
    const saved = session.answers?.[question.id]
    if (saved) apply(saved, question.id)
    else if (fact && (fact.source === 'edit' || (!seen.has(question.id) && !evidenceAlreadyRead))) apply(fact.source === 'edit' ? fact.value : fact.evidence, question.id)
  }
  return [...decisions.values()]
}

export function reconcileRequestedSurfaces(session: DiscoverySession, questions: Questions): DiscoverySession {
  if (session.mode !== 'guided') return session
  const intents = requestedSurfaceIntents(session, questions)
  const decided = new Set(intents.map(intent => intent.id))
  const requested: Recommendation[] = intents.filter(intent => intent.decision === 'include').map(intent => ({
    group: 'surfaceIds', id: intent.id,
    reason: `You asked for ${SURFACES[intent.id].name.toLowerCase()}. The team will discuss the details with you before final pricing.`,
    evidence: intent.evidence,
  }))
  const recommendations = [...session.recommendations.filter(item => item.group !== 'surfaceIds' || !decided.has(item.id as SurfaceId)), ...requested]
  const customerSelected = session.scope.surfaceIds.filter(id => !decided.has(id) && !session.recommendations.some(item => item.group === 'surfaceIds' && item.id === id))
  return { ...session, recommendations, scope: { ...session.scope, surfaceIds: [...new Set([...customerSelected, ...recommendations.filter(item => item.group === 'surfaceIds').map(item => item.id as SurfaceId)])] } }
}

export function surfaceClarifications(session: DiscoverySession, questions: Questions): string[] {
  return requestedSurfaceIntents(session, questions).filter(intent => intent.decision === 'clarify').map(intent => `Whether to include a ${SURFACES[intent.id].name.toLowerCase()} needs a discussion with the team.`)
}
