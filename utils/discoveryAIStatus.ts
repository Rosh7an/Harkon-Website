import { DiscoveryValidationError } from './discovery'
import { isRecord } from './solutionCatalog'

export type AIReviewFailure = 'disabled' | 'missing_configuration' | 'invalid_response' | 'timeout' | 'authentication' | 'rate_limit' | 'provider_error' | 'output_limit' | 'request_rejected'
export interface AIReviewProviderDetails { upstreamStatus?: number; providerCode?: string; retryAt?: number }
export type AIReviewOutcome = { status: 'not_requested' | 'succeeded'; requestId: string } | ({ status: 'failed'; reason: AIReviewFailure; requestId: string } & AIReviewProviderDetails)

function providerErrorBody(error: unknown) {
  if (!isRecord(error) || !isRecord(error.error)) return undefined
  return isRecord(error.error.error) ? error.error.error : error.error
}
export function retrySecondsRemaining(retryAt: number | undefined, now = Date.now()): number {
  return typeof retryAt === 'number' && Number.isFinite(retryAt) ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0
}
export function aiReviewProviderDetails(error: unknown, now = Date.now()): AIReviewProviderDetails {
  const details: AIReviewProviderDetails = {}
  if (isRecord(error) && typeof error.status === 'number' && Number.isInteger(error.status) && error.status >= 400 && error.status <= 599) details.upstreamStatus = error.status
  const code = providerErrorBody(error)?.code
  // Only recognised technical codes may leave the server. Never expose the
  // provider message or failed_generation: either can contain customer text.
  if (typeof code === 'string' && ['json_validate_failed', 'context_length_exceeded', 'model_decommissioned', 'model_not_found', 'invalid_api_key', 'rate_limit_exceeded', 'insufficient_quota'].includes(code)) details.providerCode = code
  const headers = isRecord(error) ? error.headers : undefined
  if (headers instanceof Headers) {
    const value = headers.get('retry-after')?.trim()
    if (value) {
      const seconds = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : undefined
      const deadline = seconds === undefined ? Date.parse(value) : now + Math.ceil(seconds * 1000)
      if (Number.isSafeInteger(deadline) && deadline >= 0) details.retryAt = Math.max(now, deadline)
    }
  }
  return details
}

export function isAIReviewFailure(value: unknown): value is AIReviewFailure {
  return typeof value === 'string' && ['disabled', 'missing_configuration', 'invalid_response', 'timeout', 'authentication', 'rate_limit', 'provider_error', 'output_limit', 'request_rejected'].includes(value)
}
export function aiReviewHttpStatus(reason: AIReviewFailure): number {
  if (reason === 'rate_limit') return 429
  if (reason === 'timeout') return 504
  if (reason === 'disabled' || reason === 'missing_configuration' || reason === 'authentication') return 503
  return 502
}

export function aiReviewFailureReason(error: unknown, disabled: boolean): AIReviewFailure {
  if (error === undefined) return disabled ? 'disabled' : 'missing_configuration'
  if (error instanceof DiscoveryValidationError || error instanceof SyntaxError) return 'invalid_response'
  if (error instanceof Error && (error.name.includes('Timeout') || error.constructor.name.includes('Timeout'))) return 'timeout'
  const status = isRecord(error) ? error.status : undefined
  if (status === 401 || status === 403) return 'authentication'
  if (status === 429) return 'rate_limit'
  const body = providerErrorBody(error)
  if (body?.code === 'json_validate_failed') {
    if (typeof body.message === 'string' && /max_completion_tokens|max completion tokens|output was truncated/i.test(body.message)) return 'output_limit'
    return 'invalid_response'
  }
  if (status === 400 || status === 404 || status === 422) return 'request_rejected'
  return 'provider_error'
}

export function aiReviewFailureMessage(reason?: AIReviewFailure): string {
  switch (reason) {
    case 'disabled': return 'AI review is turned off in this environment.'
    case 'missing_configuration': return 'AI review is not configured in this environment.'
    case 'invalid_response': return 'The AI returned a response that failed our format or evidence checks.'
    case 'timeout': return 'The AI service took too long to respond.'
    case 'authentication': return 'The AI service rejected the server credentials or access permissions.'
    case 'rate_limit': return 'The AI service reported a request or usage limit.'
    case 'provider_error': return 'The AI request failed because of a connection or service error.'
    case 'output_limit': return 'The AI response reached its output length limit before the review finished.'
    case 'request_rejected': return 'The AI service rejected the review request. The team can investigate using the reference ID.'
    default: return 'This saved plan does not include the cause of the earlier failure. Retry to check the current AI status.'
  }
}
