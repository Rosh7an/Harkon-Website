import { describe, expect, it } from 'vitest'
import { DiscoveryValidationError } from '../utils/discovery'
import { aiReviewFailureMessage, aiReviewFailureReason, aiReviewProviderDetails, retrySecondsRemaining } from '../utils/discoveryAIStatus'
import { APIConnectionTimeoutError } from 'groq-sdk'

describe('AI review diagnostics', () => {
  it('uses the provider retry deadline without inventing a wait when it is missing', () => {
    const now = 1900000000000
    expect(aiReviewProviderDetails({ status: 429, headers: new Headers({ 'retry-after': '14' }) }, now).retryAt).toBe(now + 14000)
    expect(aiReviewProviderDetails({ status: 429, headers: new Headers({ 'retry-after': new Date(now + 14000).toUTCString() }) }, now).retryAt).toBe(now + 14000)
    expect(aiReviewProviderDetails({ status: 429, headers: new Headers({ 'retry-after': 'invalid' }) }, now).retryAt).toBeUndefined()
    expect(aiReviewProviderDetails({ status: 429 }, now).retryAt).toBeUndefined()
    expect(retrySecondsRemaining(now + 14000, now)).toBe(14)
    expect(retrySecondsRemaining(now + 1, now)).toBe(1)
    expect(retrySecondsRemaining(now - 1, now)).toBe(0)
    expect(retrySecondsRemaining(undefined, now)).toBe(0)
  })
  it('identifies truncated Groq generation separately from rate limits and sanitizes provider details', () => {
    const error = { status: 400, error: { error: { code: 'json_validate_failed', message: 'max completion tokens reached; output was truncated to fit max_completion_tokens', failed_generation: 'private customer answer' } } }
    expect(aiReviewFailureReason(error, false)).toBe('output_limit')
    expect(aiReviewProviderDetails(error)).toEqual({ upstreamStatus: 400, providerCode: 'json_validate_failed' })
    expect(aiReviewFailureReason({ status: 400, error: { code: 'json_validate_failed', message: 'Schema mismatch' } }, false)).toBe('invalid_response')
    expect(aiReviewFailureReason({ status: 400, error: { message: 'Rejected' } }, false)).toBe('request_rejected')
    expect(aiReviewProviderDetails({ status: '400', error: { code: 'private-secret' } })).toEqual({})
    expect(JSON.stringify(aiReviewProviderDetails(error))).not.toContain('private')
  })
  it('distinguishes configuration, validation, timeout and provider errors without exposing details', () => {
    expect(aiReviewFailureReason(undefined, true)).toBe('disabled')
    expect(aiReviewFailureReason(undefined, false)).toBe('missing_configuration')
    expect(aiReviewFailureReason(new DiscoveryValidationError('private evidence'), false)).toBe('invalid_response')
    expect(aiReviewFailureReason(new SyntaxError('private response'), false)).toBe('invalid_response')
    expect(aiReviewFailureReason(Object.assign(new Error(), { name: 'APIConnectionTimeoutError' }), false)).toBe('timeout')
    expect(aiReviewFailureReason(new APIConnectionTimeoutError(), false)).toBe('timeout')
    expect(aiReviewFailureReason({ status: 401 }, false)).toBe('authentication')
    expect(aiReviewFailureReason({ status: 429 }, false)).toBe('rate_limit')
    expect(aiReviewFailureReason(null, false)).toBe('provider_error')
    expect(aiReviewFailureReason({ status: '429' }, false)).toBe('provider_error')
    expect(aiReviewFailureMessage()).toContain('does not include the cause')
    expect(aiReviewFailureMessage('invalid_response')).not.toContain('private')
  })
})
