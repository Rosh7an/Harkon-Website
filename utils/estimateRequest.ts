import { calculateEstimate, type EstimationResult } from './estimationEngine'
import {
  FEATURE_BY_ID,
  FEATURE_CATALOG,
  HOURLY_RATE_INR,
  PROJECT_BY_ID,
  RISK_MULTIPLIERS,
  TIMELINE_MULTIPLIERS,
  isFeatureId,
  isProjectType,
  isRiskProfile,
  isTimelineSpeed,
  type FeatureId,
  type ProjectType,
  type RiskProfile,
  type TimelineSpeed,
} from './pricingCatalog'

export interface EstimateRequest {
  projectTypeId: ProjectType
  featureIds: FeatureId[]
  followUpAnswers: Record<string, string>
  riskProfile: RiskProfile
  timelineSpeed: TimelineSpeed
}

export class EstimateValidationError extends Error {}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseEstimateRequest(input: unknown): EstimateRequest {
  if (!isPlainRecord(input)) throw new EstimateValidationError('Request body must be an object.')

  const { projectTypeId, featureIds, followUpAnswers, riskProfile, timelineSpeed } = input
  if (!isProjectType(projectTypeId)) throw new EstimateValidationError('Select a valid project type.')
  if (!Array.isArray(featureIds) || featureIds.length > FEATURE_CATALOG.length) {
    throw new EstimateValidationError('Feature selection is invalid.')
  }
  if (!isPlainRecord(followUpAnswers) || Object.keys(followUpAnswers).length > 10) {
    throw new EstimateValidationError('Follow-up answers are invalid.')
  }
  if (!isRiskProfile(riskProfile)) throw new EstimateValidationError('Risk profile is invalid.')
  if (!isTimelineSpeed(timelineSpeed)) throw new EstimateValidationError('Timeline selection is invalid.')

  const parsedFeatureIds: FeatureId[] = []
  for (const id of featureIds) {
    if (!isFeatureId(id)) throw new EstimateValidationError('Feature selection contains an unknown item.')
    if (parsedFeatureIds.includes(id)) throw new EstimateValidationError('Feature selection contains duplicates.')
    if (!FEATURE_BY_ID[id].applicableTo.includes(projectTypeId)) {
      throw new EstimateValidationError('A selected feature does not apply to this project type.')
    }
    parsedFeatureIds.push(id)
  }

  const allowedFollowUps = new Map<string, readonly string[]>()
  for (const id of parsedFeatureIds) {
    for (const followUp of FEATURE_BY_ID[id].followUps ?? []) {
      allowedFollowUps.set(followUp.id, followUp.options.map(option => option.label))
    }
  }

  const parsedAnswers: Record<string, string> = {}
  for (const [questionId, answer] of Object.entries(followUpAnswers)) {
    const allowed = allowedFollowUps.get(questionId)
    if (!allowed || typeof answer !== 'string' || !allowed.includes(answer)) {
      throw new EstimateValidationError('A follow-up answer is invalid.')
    }
    parsedAnswers[questionId] = answer
  }

  for (const questionId of allowedFollowUps.keys()) {
    if (!Object.hasOwn(parsedAnswers, questionId)) {
      throw new EstimateValidationError('Answer all required follow-up questions.')
    }
  }

  return { projectTypeId, featureIds: parsedFeatureIds, followUpAnswers: parsedAnswers, riskProfile, timelineSpeed }
}

export function estimateFromRequest(request: EstimateRequest): EstimationResult {
  const selected = [PROJECT_BY_ID[request.projectTypeId], ...request.featureIds.map(id => FEATURE_BY_ID[id])]
  return calculateEstimate(
    selected,
    request.followUpAnswers,
    RISK_MULTIPLIERS[request.riskProfile],
    HOURLY_RATE_INR,
    TIMELINE_MULTIPLIERS[request.timelineSpeed],
  )
}
