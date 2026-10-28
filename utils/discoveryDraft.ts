import { parseRequirementAnswers, type RequirementAnswers } from './discoveryBatch'
import { isFactId, type DiscoverySession, type FactId, type nextQuestion } from './discovery'
import { isRecord, parseScope, type SolutionEstimate, type SolutionScope } from './solutionCatalog'
import { REVIEW_FIELDS, type PlanStep, type ReviewedFields } from './discoveryProgress'
import type { AIReviewOutcome } from './discoveryAIStatus'

export type DiscoveryMode = DiscoverySession['mode']
export interface DiscoveryResponse {
  token: string
  session: DiscoverySession
  question: ReturnType<typeof nextQuestion>
  reviewItems: string[]
  result: SolutionEstimate | null
  aiReview?: AIReviewOutcome
}
export interface LocalDraft {
  token: string
  expiresAt: number
  scope: SolutionScope
  answer: string
  selectedOptions: string[]
  editing: FactId | null
  correction: string
  planStep: PlanStep
  completedPlanSteps?: number
  reviewed: ReviewedFields
  requirementAnswers?: RequirementAnswers
  needsRestart?: true
}
export interface DraftStore {
  version: 2
  activeMode: DiscoveryMode
  drafts: Partial<Record<DiscoveryMode, LocalDraft>>
}
export const DRAFT_STORAGE_KEY = 'exter-discovery-v2'
export const LEGACY_STORAGE_KEY = 'exter-discovery-v1'

// Browser storage is untrusted. Never store/restore a price or approval here.
export function readDraftStore(raw: string | null, now = Date.now()): DraftStore | null {
  if (!raw || raw.length > 900000) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || value.version !== 2 || !['guided', 'manual'].includes(String(value.activeMode)) || !isRecord(value.drafts)) return null
    const drafts: DraftStore['drafts'] = {}
    for (const mode of ['guided', 'manual'] as const) {
      const entry = Object.hasOwn(value.drafts, mode) ? value.drafts[mode] : null
      if (!isRecord(entry) || typeof entry.token !== 'string' || (!entry.token && entry.needsRestart !== true) || entry.token.length > 430000 || typeof entry.expiresAt !== 'number' || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) continue
      const selectedOptions = entry.selectedOptions === undefined ? [] : entry.selectedOptions
      if (typeof entry.answer !== 'string' || entry.answer.length > 2000 || !Array.isArray(selectedOptions) || selectedOptions.length > 8 || selectedOptions.some(option => typeof option !== 'string' || !option.trim() || option.length > 200) || new Set(selectedOptions).size !== selectedOptions.length || typeof entry.correction !== 'string' || entry.correction.length > 2000 || !Number.isInteger(entry.planStep) || ![0, 1, 2, 3].includes(entry.planStep as number) || !isRecord(entry.reviewed)) continue
      if (entry.editing !== null && !isFactId(entry.editing)) continue
      if (entry.completedPlanSteps !== undefined && (!Number.isInteger(entry.completedPlanSteps) || ![0, 1, 2, 3].includes(entry.completedPlanSteps as number))) continue
      try {
        const requirementAnswers = entry.requirementAnswers === undefined ? undefined : parseRequirementAnswers(entry.requirementAnswers)
        const reviewed: ReviewedFields = {}
        for (const field of REVIEW_FIELDS) if (Object.hasOwn(entry.reviewed, field) && entry.reviewed[field] === true) reviewed[field] = true
        drafts[mode] = { ...(requirementAnswers ? { requirementAnswers } : {}), token: entry.needsRestart === true ? '' : entry.token, expiresAt: entry.expiresAt, scope: parseScope(entry.scope), answer: entry.answer, selectedOptions: [...selectedOptions], correction: entry.correction, editing: entry.editing as FactId | null, planStep: entry.planStep as PlanStep, ...(entry.completedPlanSteps !== undefined ? { completedPlanSteps: entry.completedPlanSteps as number } : {}), reviewed, ...(entry.needsRestart === true ? { needsRestart: true as const } : {}) }
      } catch { /* A corrupt draft must not prevent recovery of the other approach. */ }
    }
    return { version: 2, activeMode: value.activeMode as DiscoveryMode, drafts }
  } catch { return null }
}
