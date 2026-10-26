import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { QUESTIONS, applyAgentOutput, boundedText, createDiscovery, DiscoveryValidationError, discoveryReviewItems, editFact, nextQuestion, originalRequirementAnswers, recordAnswer, requirementReviewItems, requiresAIReview, type DiscoverySession } from '@/utils/discovery'
import { aiReviewFailureMessage, aiReviewFailureReason, aiReviewHttpStatus, aiReviewProviderDetails, retrySecondsRemaining, type AIReviewOutcome } from '@/utils/discoveryAIStatus'
import { requestedSurfaceIntents } from '@/utils/discoverySurfaceIntent'
import { consult } from '@/utils/discoveryAgent.server'
import { DiscoverySessionError, openSession, sealSession } from '@/utils/discoverySession.server'
import { clearInactiveAnswers, estimateSolution, isRecord, parseScope, reviewScope, SolutionValidationError } from '@/utils/solutionCatalog'

export const runtime = 'nodejs'
// Per-instance abuse guard. Deployment-wide rate limits belong at the hosting firewall.
const requests = new Map<string, { count: number; resetAt: number }>()
function allowRequest(req: Request): boolean {
  const now = Date.now()
  for (const [key, entry] of requests) if (entry.resetAt <= now) requests.delete(key)
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim().slice(0, 100)
  if (requests.size >= 1000 && !requests.has(ip)) return false
  const current = requests.get(ip) ?? { count: 0, resetAt: now + 10 * 60 * 1000 }
  current.count++
  requests.set(ip, current)
  return current.count <= 60
}
function respond(session: DiscoverySession, context?: { requestId: string; aiAttempted: true }) {
  const requestId = context?.requestId ?? randomUUID()
  const failed = context?.aiAttempted && session.providerStatus === 'guided_fallback'
  const reason = session.aiReviewFailure ?? 'provider_error'
  const aiReview: AIReviewOutcome = failed ? { status: 'failed', reason, requestId, ...session.aiReviewFailureDetails } : { status: context?.aiAttempted ? 'succeeded' : 'not_requested', requestId }
  if (failed) session = { ...session, aiReviewFailureReference: requestId }
  session = { ...session, reviewItems: requirementReviewItems(session.reviewItems) }
  const reviewItems = discoveryReviewItems(session)
  const result = session.stage === 'confirmed' ? estimateSolution(session.allowPartial ? reviewScope(session.scope).pricedScope : session.scope) : null
  return NextResponse.json({ token: sealSession(session), session, question: nextQuestion(session), reviewItems, result, aiReview,
    ...(failed ? { code: 'DISCOVERY_AI_REVIEW_FAILED', error: aiReviewFailureMessage(reason) } : {}),
  }, { status: failed ? aiReviewHttpStatus(reason) : 200, headers: { 'Cache-Control': 'no-store', 'X-Discovery-Request-Id': requestId,
    ...(failed && session.aiReviewFailureDetails?.retryAt ? { 'Retry-After': String(retrySecondsRemaining(session.aiReviewFailureDetails.retryAt)) } : {}),
  } })
}
function reportAIReviewFailure(session: DiscoverySession, error: unknown, requestId: string, pending?: DiscoverySession['pendingAIReview']) {
  const reason = aiReviewFailureReason(error, process.env.DISCOVERY_AI_ENABLED === 'false')
  const details = aiReviewProviderDetails(error)
  session.aiReviewFailure = reason
  session.aiReviewFailureDetails = details
  session.pendingAIReview = pending ?? session.pendingAIReview
  if (session.pendingAIReview?.action === 'answer') session.stage = 'discovery'
  // Never include the exception message/body, API key, or customer answers.
  console.error('[discovery] AI review failed', { requestId, reason, ...details })
}
export async function POST(req: Request) {
  const requestId = randomUUID()
  try {
    const origin = req.headers.get('origin')
    if (origin) {
      let sameSite = false
      try {
        const originUrl = new URL(origin)
        // Next/proxies can reconstruct req.url with an internal hostname. Browsers
        // send Host for the actual public address; never compare to that internal URL.
        const host = req.headers.get('host') || new URL(req.url).host
        sameSite = ['http:', 'https:'].includes(originUrl.protocol) && originUrl.host === host
      } catch { /* Invalid origins are denied rather than causing an internal error. */ }
      if (!sameSite) return NextResponse.json({ error: 'This request must come from this website.' }, { status: 403 })
    }
    if (!allowRequest(req)) return NextResponse.json({ error: 'Please pause before continuing. Your answers are saved.' }, { status: 429 })
    const raw = await req.text()
    if (raw.length > 430000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
    const body: unknown = JSON.parse(raw)
    if (!isRecord(body)) throw new DiscoveryValidationError('Request must be an object.')
    if (body.action === 'start') {
      if (body.mode !== 'guided' && body.mode !== 'manual') throw new DiscoveryValidationError('Choose guided discovery or manual selection.')
      return respond(createDiscovery(body.mode))
    }
    const session = openSession(body.token)
    if (body.action === 'restore') return respond(session)
    if (body.revision !== session.revision) throw new DiscoveryValidationError('This response is out of date. Reload your saved discovery.')
    if (requiresAIReview(session) && ['answer', 'edit', 'review', 'confirm'].includes(String(body.action))) return NextResponse.json({ code: 'DISCOVERY_AI_REVIEW_REQUIRED', error: 'Retry AI review successfully before continuing. Your saved answers are preserved.', requestId }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    if (body.action === 'retry_ai') {
      const answer = session.pendingAIReview ? session.answers?.[session.pendingAIReview.field] ?? session.facts[session.pendingAIReview.field]?.evidence : originalRequirementAnswers(session).at(-1)?.text
      if (session.mode !== 'guided' || session.stage === 'confirmed' || !answer) throw new DiscoveryValidationError('Save a guided answer before retrying AI review.')
      const remaining = retrySecondsRemaining(session.aiReviewFailureDetails?.retryAt)
      if (remaining > 0) return NextResponse.json({ code: 'DISCOVERY_AI_REVIEW_COOLDOWN', error: `Wait ${remaining} seconds before retrying AI review.`, requestId, retryAt: session.aiReviewFailureDetails?.retryAt }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(remaining) } })
      // Retry analysis, not the questionnaire. Customer choices and turn count
      // remain intact; updated recommendations are available for review.
      const scope = parseScope(body.scope)
      let updated: DiscoverySession = { ...session, scope, revision: session.revision + 1, allowPartial: false }
      try {
        const output = await consult(updated, answer)
        if (output) updated = session.pendingAIReview?.action === 'answer' ? applyAgentOutput(updated, output) : { ...applyAgentOutput(updated, output), scope }
        else { updated.providerStatus = 'guided_fallback'; reportAIReviewFailure(updated, undefined, requestId) }
      } catch (error) {
        updated.providerStatus = 'guided_fallback'
        reportAIReviewFailure(updated, error, requestId)
      }
      return respond(updated, { requestId, aiAttempted: true })
    }
    if (body.action === 'answer') {
      const answer = boundedText(body.answer)
      const field = nextQuestion(session)?.id
      let updated = recordAnswer(session, answer)
      try {
        const output = await consult(updated, answer)
        if (output) updated = applyAgentOutput(updated, output)
        else { updated.providerStatus = 'guided_fallback'; reportAIReviewFailure(updated, undefined, requestId, field ? { field, action: 'answer' } : undefined) }
      } catch (error) {
        // Do not log business answers or provider request bodies. Never lose an answer
        // because the model timed out, refused, or failed schema/evidence validation.
        updated.providerStatus = 'guided_fallback'
        reportAIReviewFailure(updated, error, requestId, field ? { field, action: 'answer' } : undefined)
        updated.assistantMessage = 'Your answer is saved. Retry AI review successfully before continuing.'
      }
      updated.messages = [...updated.messages, { role: 'assistant', text: updated.assistantMessage }]
      return respond(updated, { requestId, aiAttempted: true })
    }
    if (body.action === 'review') return respond({ ...session, revision: session.revision + 1, stage: 'review', allowPartial: false })
    if (body.action === 'edit') {
      const answer = boundedText(body.value)
      // Feature choices remain local until confirmation. Carry the current
      // unconfirmed draft into requirement edits so reconciliation can preserve
      // customer-added work while withdrawing unsupported AI suggestions.
      const draftSession = session.stage === 'review' && body.scope !== undefined ? { ...session, scope: parseScope(body.scope) } : session
      let updated = editFact(draftSession, body.field, answer)
      const field = QUESTIONS.find(question => question.id === body.field)?.id
      try {
        const output = await consult(updated, answer)
        if (output) updated = applyAgentOutput(updated, output)
        else { updated.providerStatus = 'guided_fallback'; reportAIReviewFailure(updated, undefined, requestId, field ? { field, action: 'edit' } : undefined) }
      } catch (error) {
        updated.providerStatus = 'guided_fallback'
        reportAIReviewFailure(updated, error, requestId, field ? { field, action: 'edit' } : undefined)
        updated.assistantMessage = 'Your correction is saved. Retry AI review successfully before continuing.'
      }
      if (draftSession !== session) {
        const declined = session.recommendations.filter(item => !(draftSession.scope[item.group] as string[]).includes(item.id))
        const scope = { ...updated.scope }
        for (const group of ['surfaceIds', 'capabilityIds', 'integrationIds', 'modifierIds'] as const) {
          scope[group] = (scope[group] as string[]).filter(id => !declined.some(item => item.group === group && item.id === id)) as never
        }
        // A later checkbox selection takes precedence over older platform
        // wording. A new explicit withdrawal in the edited answer still wins.
        const previousIntents = requestedSurfaceIntents(session, QUESTIONS)
        const newlyExcluded = requestedSurfaceIntents(updated, QUESTIONS).filter(intent => intent.decision === 'exclude' && !previousIntents.some(previous => previous.id === intent.id && previous.decision === 'exclude' && previous.evidence === intent.evidence))
        const addedSurfaces = draftSession.scope.surfaceIds.filter(id => !session.scope.surfaceIds.includes(id) && !newlyExcluded.some(intent => intent.id === id))
        scope.surfaceIds = [...new Set([...scope.surfaceIds, ...addedSurfaces])]
        updated = { ...updated, scope: clearInactiveAnswers(scope) }
      }
      return respond(updated, { requestId, aiAttempted: true })
    }
    if (body.action === 'confirm') {
      if (session.stage !== 'review') throw new DiscoveryValidationError('Review your requirements before confirming.')
      if (body.confirmed !== true) throw new DiscoveryValidationError('Confirm the scope before requesting an estimate.')
      const scope = parseScope(body.scope)
      const { issues } = reviewScope(scope)
      if (issues.length) throw new SolutionValidationError(issues.join(' '))
      if (scope.capabilityIds.includes('payments') && scope.billing === 'undecided') throw new DiscoveryValidationError('Choose one-time or recurring payments before continuing.')
      const reviewItems = discoveryReviewItems(session, scope)
      if (reviewItems.length && body.allowPartial !== true) throw new DiscoveryValidationError('Some requirements need human review. Request a consultation or explicitly exclude them from a partial estimate.')
      return respond({ ...session, revision: session.revision + 1, stage: 'confirmed', scope, allowPartial: reviewItems.length > 0 && body.allowPartial === true })
    }
    throw new DiscoveryValidationError('Unknown discovery action.')
  } catch (error) {
    const validation = error instanceof DiscoveryValidationError || error instanceof SolutionValidationError || error instanceof SyntaxError
    return NextResponse.json({ error: validation ? error instanceof SyntaxError ? 'Invalid JSON request.' : error.message : 'Discovery is unavailable. Please try again or contact the team.', ...(error instanceof DiscoverySessionError ? { code: error.code } : {}) }, { status: validation ? 400 : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
