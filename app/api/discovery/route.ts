import { NextResponse } from 'next/server'
import { applyAgentOutput, boundedText, createDiscovery, DiscoveryValidationError, discoveryReviewItems, editFact, nextQuestion, recordAnswer, type DiscoverySession } from '@/utils/discovery'
import { consult } from '@/utils/discoveryAgent.server'
import { DiscoverySessionError, openSession, sealSession } from '@/utils/discoverySession.server'
import { estimateSolution, isRecord, parseScope, reviewScope, SolutionValidationError } from '@/utils/solutionCatalog'

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
function respond(session: DiscoverySession) {
  const reviewItems = discoveryReviewItems(session)
  const result = session.stage === 'confirmed' ? estimateSolution(session.allowPartial ? reviewScope(session.scope).pricedScope : session.scope) : null
  return NextResponse.json({ token: sealSession(session), session, question: nextQuestion(session), reviewItems, result }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(req: Request) {
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
    if (body.action === 'answer') {
      const answer = boundedText(body.answer)
      let updated = recordAnswer(session, answer)
      try {
        const output = await consult(updated, answer)
        if (output) updated = applyAgentOutput(updated, output)
        else updated.providerStatus = 'guided_fallback'
      } catch {
        // Do not log business answers or provider request bodies. Never lose an answer
        // because the model timed out, refused, or failed schema/evidence validation.
        updated.providerStatus = 'guided_fallback'
        updated.assistantMessage = 'Your answer is saved. AI assistance is temporarily unavailable; you can continue the guided questions and choose your scope in the review.'
      }
      updated.messages = [...updated.messages, { role: 'assistant', text: updated.assistantMessage }]
      return respond(updated)
    }
    if (body.action === 'review') return respond({ ...session, revision: session.revision + 1, stage: 'review', allowPartial: false })
    if (body.action === 'edit') return respond(editFact(session, body.field, body.value))
    if (body.action === 'confirm') {
      if (session.stage !== 'review') throw new DiscoveryValidationError('Review your requirements before confirming.')
      if (body.confirmed !== true) throw new DiscoveryValidationError('Confirm the scope before requesting an estimate.')
      const scope = parseScope(body.scope)
      const { issues } = reviewScope(scope)
      if (issues.length) throw new SolutionValidationError(issues.join(' '))
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
