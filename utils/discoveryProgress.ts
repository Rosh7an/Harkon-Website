import { QUESTIONS, discoveryReviewItems, type DiscoverySession } from './discovery'
import { emptyScope, parseScope, reviewScope, type SolutionScope } from './solutionCatalog'

export const REVIEW_FIELDS = ['surfaceIds', 'capabilityIds', 'integrationIds', 'modifierIds', 'billing', 'crmProvider', 'timelineSpeed', 'riskProfile'] as const
export type ReviewField = typeof REVIEW_FIELDS[number]
export type ReviewedFields = Partial<Record<ReviewField, boolean>>
export type PlanStep = 0 | 1 | 2 | 3
export interface ProgressInput {
  scope?: SolutionScope
  reviewed?: ReviewedFields
  approved?: boolean
  allowPartial?: boolean
  hasResult?: boolean
  planStep?: PlanStep
}

// These are workflow credits, never pricing inputs or reported business facts.
export function scopeProgress(scope: SolutionScope, reviewed: ReviewedFields = {}): number {
  let valid: SolutionScope
  try { valid = parseScope(scope) } catch { return 0 }
  const addressed = (key: ReviewField) => reviewed?.[key] === true
  let points = valid.surfaceIds.length && addressed('surfaceIds') ? 20 : 0
  points += addressed('capabilityIds') ? 20 : 0 // Explicitly choosing no extras is valid.
  points += addressed('integrationIds') ? 10 : 0
  points += addressed('modifierIds') ? 10 : 0
  points += addressed('timelineSpeed') ? 5 : 0
  points += addressed('riskProfile') ? 5 : 0
  const followUps: ReviewField[] = []
  if (valid.capabilityIds.includes('payments')) followUps.push('billing')
  if (valid.integrationIds.includes('existing_crm')) followUps.push('crmProvider')
  // No applicable follow-ups earn credit only after the details were reviewed.
  points += followUps.length
    ? 20 * followUps.filter(addressed).length / followUps.length
    : addressed('billing') && addressed('crmProvider') ? 20 : 0
  return Math.round(points)
}

export function discoveryProgress(session: DiscoverySession | null, input: ProgressInput = {}) {
  const topics = session ? QUESTIONS.filter(question => !!session.facts[question.id]).length : 0
  const uncertain = session ? QUESTIONS.filter(question => session.facts[question.id]?.status === 'unknown').length : 0
  const scope = input.scope ?? session?.scope ?? emptyScope()
  const points = scopeProgress(scope, input.reviewed)
  const done = !!session && session.stage === 'confirmed' && input.hasResult === true
  const step = !session || session.stage === 'discovery' ? 1
    : session.stage === 'confirmed' || input.planStep === 3 ? 3
      : session.mode === 'manual' && (input.planStep ?? 0) === 0 ? 1 : 2
  const phaseSize = 100 / 3
  let percent = 0
  if (session && step === 1) {
    percent = phaseSize * (session.mode === 'guided' ? topics / QUESTIONS.length : scope.surfaceIds.length && input.reviewed?.surfaceIds === true ? 1 : 0)
  } else if (session && step === 2) {
    // Manual requirements already credited interfaces in phase one. Guided
    // selection reviews interfaces here, alongside features and other details.
    const selection = session.mode === 'manual' ? Math.max(0, points - 20) / 70 : points / 90
    percent = phaseSize * (1 + selection)
  } else if (session && step === 3) {
    percent = 2 * phaseSize
    if (points === 90 && !reviewScope(scope).issues.length) {
      const needsPartial = discoveryReviewItems(session, scope).length > 0
      const approvals = (input.approved === true ? 1 : 0) + (needsPartial && input.allowPartial === true ? 1 : 0)
      // Leave room for the server to return the actual estimate before 100%.
      percent += (95 - percent) * approvals / (needsPartial ? 2 : 1)
    }
  }
  if (done) percent = 100
  percent = Math.round(Math.max(0, Math.min(100, percent)))
  const detail = !session ? 'Choose an approach. Each starts at zero and keeps its own draft.'
    : done ? session.allowPartial ? 'Selected work estimated. Unanswered items are not included.' : 'Your selected work has been estimated.'
      : session.mode === 'guided' ? `${topics} of ${QUESTIONS.length} topics covered${uncertain ? ` · ${uncertain} still ${uncertain === 1 ? 'needs' : 'need'} clarification` : ''}${session.stage !== 'discovery' ? ' · Review missing details and assumptions.' : ''}`
        : 'Progress follows choices and reviewed details, not the number of features selected.'
  const next = !session ? 'Choose how you want to build your plan.'
    : done ? 'Call or WhatsApp a consultant, or edit your plan.'
      : session.stage === 'discovery' ? 'Answer the next question, or choose “I’m not sure”.'
        : input.planStep === 3 ? 'Review exclusions, approve your plan and request an estimate.'
          : input.planStep === 2 ? 'Review connections, applicable details and planning assumptions.'
            : input.planStep === 1 ? 'Choose features, or explicitly continue with no extra features.'
              : 'Choose where people will use the solution.'
  return { step, percent, topics, uncertain, detail, next }
}
