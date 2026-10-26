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
  completedPlanSteps?: number
  reviewingRequirements?: boolean
}

// Count complete, contiguous selection pages. Feature quantity and engineering
// hours never affect workflow progress. Explicitly selecting no extras is valid.
export function scopeProgress(scope: SolutionScope, reviewed: ReviewedFields = {}): number {
  let valid: SolutionScope
  try { valid = parseScope(scope) } catch { return 0 }
  const addressed = (key: ReviewField) => reviewed?.[key] === true
  if (!valid.surfaceIds.length || !addressed('surfaceIds')) return 0
  if (!addressed('capabilityIds') || reviewScope({ ...valid, modifierIds: [] }).issues.length) return 1
  const details: ReviewField[] = ['integrationIds', 'modifierIds', 'timelineSpeed', 'riskProfile']
  if (valid.capabilityIds.includes('payments') && (!addressed('billing') || valid.billing === 'undecided')) return 2
  if (valid.integrationIds.includes('existing_crm') && !addressed('crmProvider')) return 2
  return details.every(addressed) && !reviewScope(valid).issues.length ? 3 : 2
}

export function discoveryProgress(session: DiscoverySession | null, input: ProgressInput = {}) {
  const topics = session ? QUESTIONS.filter(question => !!session.facts[question.id]).length : 0
  const uncertain = session ? QUESTIONS.filter(question => session.facts[question.id]?.status === 'unknown').length : 0
  const scope = input.scope === undefined ? session?.scope ?? emptyScope() : input.scope
  const done = !!session && session.stage === 'confirmed' && input.hasResult === true
  const step = !session || session.stage === 'discovery' || (session.mode === 'guided' && input.reviewingRequirements) ? 1
    : session.stage === 'confirmed' || input.planStep === 3 ? 3
      : session.mode === 'manual' && (input.planStep ?? 0) === 0 ? 1 : 2
  const questionSteps = session?.mode === 'manual' ? 0 : QUESTIONS.length
  // Three selection pages, one final review and one returned estimate.
  // Conditional questions already live on the details page: no denominator jump.
  const totalSteps = questionSteps + 5
  const recorded = input.completedPlanSteps ?? input.planStep ?? 0
  const completedPages = Number.isInteger(recorded) && recorded >= 0 && recorded <= 3
    ? Math.min(recorded, scopeProgress(scope, input.reviewed)) : 0
  const selectionPages = session?.stage !== 'discovery' ? completedPages : 0
  const needsPartial = session && selectionPages === 3 ? discoveryReviewItems(session, scope).length > 0 : false
  const reviewedPlan = selectionPages === 3 && input.approved === true && (!needsPartial || input.allowPartial === true)
  const completedSteps = done ? totalSteps : session ? (session.mode === 'guided' ? topics : 0) + selectionPages + (reviewedPlan ? 1 : 0) : 0
  const percent = Math.round(completedSteps / totalSteps * 100)
  const completedMilestones = [done || (questionSteps ? topics === questionSteps : selectionPages >= 1), done || selectionPages === 3, done]
  const milestones = [
    { label: 'Requirements', at: questionSteps || 1 },
    { label: 'Your solution', at: questionSteps + 3 },
    { label: 'Estimate', at: totalSteps },
  ].map((milestone, index) => ({ ...milestone, percent: Math.round(milestone.at / totalSteps * 100), position: milestone.at / totalSteps * 100, completed: completedMilestones[index], active: !!session && step === index + 1 }))
  const detail = !session ? 'Choose an approach. Each starts at zero and keeps its own draft.'
    : done ? session.allowPartial ? 'Selected work estimated. Unanswered items are not included.' : 'Your selected work has been estimated.'
      : session.mode === 'guided' ? `${topics} of ${QUESTIONS.length} questions completed${uncertain ? ` · ${uncertain} still ${uncertain === 1 ? 'needs' : 'need'} clarification` : ''}${session.stage !== 'discovery' ? ' · Review missing details and assumptions.' : ''}`
        : 'Each completed planning page counts equally. Choosing more features does not increase progress.'
  const next = !session ? 'Choose how you want to build your plan.'
    : done ? 'Call or WhatsApp a consultant, or edit your plan.'
      : input.reviewingRequirements ? 'Review your saved answers, then select Your solution to return to planning.'
      : session.stage === 'discovery' ? 'Answer the next question and select Continue.'
        : input.planStep === 3 ? 'Review exclusions, approve your plan and request an estimate.'
          : input.planStep === 2 ? 'Review connections, applicable details and planning assumptions.'
            : input.planStep === 1 ? 'Choose features, or explicitly continue with no extra features.'
              : 'Choose where people will use the solution.'
  return { step, percent, completedSteps, totalSteps, milestones, topics, uncertain, detail, next }
}
