import { DISCOVERY_VERSION, isFactId, nextQuestion, type DiscoverySession } from './discovery'
import type { DiscoveryResponse } from './discoveryDraft'
import { SOLUTION_CATALOG_VERSION, isRecord, parseScope, type SolutionScope } from './solutionCatalog'
import { aiReviewHttpStatus, isAIReviewFailure } from './discoveryAIStatus'

export class RejectedSession extends Error {}
const invalidResponse = 'The server returned an invalid response. Your current input is still here; please retry.'
const connectionError = 'Network connection problem. We couldn’t complete the request to the server. Your current input is still here; check your connection and retry.'
const unavailable = 'Discovery is temporarily unavailable. Your current input is still here; please retry.'
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string')
const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
const oneOf = (value: unknown, options: readonly string[]) => typeof value === 'string' && options.includes(value)

// Validate before accept() updates any state. An HTTP 200 can still contain an
// empty, truncated or incompatible payload from a proxy or a stale deployment.
function validateResponse(value: unknown): DiscoveryResponse {
  if (!isRecord(value) || typeof value.token !== 'string' || !value.token || !isRecord(value.session) || !strings(value.reviewItems)) throw new Error(invalidResponse)
  const session = value.session
  if (value.aiReview !== undefined) {
    const review = value.aiReview
    if (!isRecord(review) || !oneOf(review.status, ['not_requested', 'succeeded', 'failed']) || typeof review.requestId !== 'string' || !review.requestId || review.requestId.length > 100) throw new Error(invalidResponse)
    if (review.status === 'failed' && (!isAIReviewFailure(review.reason) || session.providerStatus !== 'guided_fallback' || session.aiReviewFailure !== review.reason)) throw new Error(invalidResponse)
    if (review.status === 'succeeded' && session.providerStatus !== 'available') throw new Error(invalidResponse)
  }
  if (!oneOf(session.mode, ['guided', 'manual']) || !oneOf(session.stage, ['discovery', 'review', 'confirmed'])
    || !nonnegative(session.revision) || !Number.isInteger(session.revision) || !nonnegative(session.turns) || !Number.isInteger(session.turns)
    || !nonnegative(session.expiresAt) || session.catalogVersion !== SOLUTION_CATALOG_VERSION || session.version !== DISCOVERY_VERSION
    || typeof session.assistantMessage !== 'string' || typeof session.allowPartial !== 'boolean'
    || !oneOf(session.providerStatus, ['available', 'guided_fallback']) || !strings(session.reviewItems)
    || !isRecord(session.facts) || !Object.entries(session.facts).every(([id, fact]) => isFactId(id) && isRecord(fact)
      && typeof fact.value === 'string' && typeof fact.evidence === 'string' && oneOf(fact.status, ['reported', 'unknown']) && oneOf(fact.source, ['answer', 'ai', 'edit']))
    || !Array.isArray(session.messages) || !session.messages.every(message => isRecord(message) && oneOf(message.role, ['user', 'assistant']) && typeof message.text === 'string')
    || !Array.isArray(session.recommendations) || !session.recommendations.every(item => isRecord(item) && oneOf(item.group, ['surfaceIds', 'capabilityIds', 'integrationIds', 'modifierIds']) && typeof item.id === 'string' && typeof item.reason === 'string' && typeof item.evidence === 'string')) throw new Error(invalidResponse)
  if (session.reviewMode !== undefined && session.reviewMode !== 'batch') throw new Error(invalidResponse)
  if (session.requirementsDirty !== undefined && typeof session.requirementsDirty !== 'boolean') throw new Error(invalidResponse)
  let scope: SolutionScope
  try { scope = parseScope(session.scope) } catch { throw new Error(invalidResponse) }
  const expectedQuestion = nextQuestion(session as unknown as DiscoverySession)
  if (expectedQuestion ? !isRecord(value.question) || value.question.id !== expectedQuestion.id : value.question !== null) throw new Error(invalidResponse)
  if (session.stage === 'confirmed') {
    const result = value.result
    if (!isRecord(result) || !isRecord(result.weeks) || !nonnegative(result.weeks.low) || !nonnegative(result.weeks.high)
      || !['lowEstimateCost', 'highEstimateCost', 'lowEstimateHours', 'highEstimateHours', 'hourlyRate', 'rawFeatureTotal', 'surcharge', 'setupOverhead', 'qaOverhead', 'pmOverhead'].every(key => nonnegative(result[key]))
      || !Array.isArray(result.work) || !result.work.every(item => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string' && nonnegative(item.expectedHours))) throw new Error(invalidResponse)
  } else if (value.result !== null) throw new Error(invalidResponse)
  // Use the known question definition, so malformed text/options cannot break
  // the active panel even when the returned question ID is correct.
  return { ...value, session: { ...session, scope }, question: expectedQuestion } as unknown as DiscoveryResponse
}

export async function requestDiscovery(payload: Record<string, unknown>, signal: AbortSignal): Promise<DiscoveryResponse> {
  // The API derives each mutation from this sealed snapshot, so replaying the
  // identical body cannot advance two questions or append an answer twice.
  const body = JSON.stringify(payload)
  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted()
    let response: Response
    try {
      response = await fetch('/api/discovery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal })
    } catch (failure) {
      if (signal.aborted) throw failure
      if (attempt === 0) continue
      throw new Error(connectionError)
    }
    signal.throwIfAborted()
    let data: unknown
    try { data = await response.json() } catch (failure) {
      signal.throwIfAborted()
      if (failure instanceof TypeError) {
        if (attempt === 0) continue
        throw new Error(connectionError)
      }
      throw new Error(response.ok ? invalidResponse : unavailable)
    }
    signal.throwIfAborted()
    if (!response.ok) {
      if (isRecord(data) && data.code === 'DISCOVERY_AI_REVIEW_FAILED') {
        // The answer was accepted and a new signed snapshot exists. Do not
        // replay it or discard it just because the downstream AI failed.
        const saved = validateResponse(data)
        if (!['answer', 'edit', 'retry_ai', 'review_answers'].includes(String(payload.action)) || saved.aiReview?.status !== 'failed' || response.status !== aiReviewHttpStatus(saved.aiReview.reason)) throw new Error(invalidResponse)
        return saved
      }
      if ([502, 503, 504].includes(response.status) && attempt === 0) continue
      const message = isRecord(data) && typeof data.error === 'string' && data.error ? data.error : unavailable
      if (response.status === 400 && isRecord(data) && data.code === 'DISCOVERY_SESSION_INVALID') throw new RejectedSession(message)
      throw new Error(message)
    }
    return validateResponse(data)
  }
  throw new Error(connectionError)
}
