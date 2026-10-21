import type { Recommendation } from './discovery'

export interface WorkflowAnswer { field: string; text: string }
type Decision = { include: boolean; evidence: string }
const bookingReason = 'You described customers booking slots or appointments. Include booking and scheduling in the draft plan.'
const trackingReason = 'You described customer tracking or follow-ups. Keep enquiries and their next actions organised.'
const suggestedTrackingReason = 'Suggested for your services-to-booking journey: track interested customers, bookings and follow-ups. Remove this if a separate customer tracker is unnecessary.'
const managementReason = 'Suggested to let staff manage the customer tracker and follow-ups alongside the public website.'
const leadReason = 'Suggested for lead generation: keep enquiries organised and track follow-ups. Remove this if your team handles leads in another system.'
const derivedReasons = new Set([bookingReason, trackingReason, suggestedTrackingReason, managementReason, leadReason])

// Narrow safeguards for explicit English requirements. The model still handles
// broader business interpretation; these rules prevent clear requests being lost.
export function workflowRecommendations(answers: WorkflowAnswer[], existing: Recommendation[]): Recommendation[] {
  const decisions = new Map<'booking' | 'crm', Decision>()
  const context = answers.map(answer => answer.text).join('\n')
  const serviceWebsite = /\bweb\s?sites?\b/i.test(context) && /\bservices?\b|about us|learn about/i.test(context)
  const uncertain = /\b(?:maybe|might|not sure|unsure|perhaps|later|future)\b/i
  const desired = /\b(?:wants?|needs?|should|will|would|can|cannot|can['’]t|unable|start|allow|let|enable|build|requires?|looking for|struggl(?:e|es|ing)|lost|losing|missed|difficult(?:y|ies)?|not able)\b/i
  const booking = /\b(?:book(?=\s+(?:online|or pay))|(?:to|cannot|can['’]t|can)\s+book|book(?:ing)?\s+(?:(?:a|an|the|their|our|my)\s+)?(?:slots?|appointments?|consultations?|visits?|services?|tables?|tastings?)|(?:slot|appointment|consultation)\s+(?:booking|scheduling)|bookings?(?:\s+and\s+scheduling)?|schedule\s+(?:(?:a|an|the)\s+)?appointments?)\b/i
  const crm = /\b(?:track(?:ing)?\s+(?:(?:our|my|the)\s+)?(?:customers?|leads?|enquiries|inquiries)|follow[- ]?ups?|lead (?:management|generation)|crm)\b/i
  for (const answer of answers) {
    for (const clause of answer.text.split(/[.!?;\n]+|\s+(?:but|however|instead)\s+/i)) {
      const historical = answer.field === 'current' || /\b(?:already|currently|today|existing)\b/i.test(clause)
      for (const [id, pattern] of [['booking', booking], ['crm', crm]] as const) {
        const match = pattern.exec(clause)
        if (!match) continue
        const before = clause.slice(0, match.index)
        const after = clause.slice(match.index + match[0].length)
        // Inability is a problem to solve, not a withdrawal of the feature.
        const intentPrefix = before.replace(/not only|not able(?: to)?/gi, '')
        const declined = /\b(?:do not|don['’]t|no longer|not|no|without)\b[^,;]*$/i.test(intentPrefix) || /^\s*(?:is|are)?\s*(?:not needed|not required|unnecessary|out of scope|(?:now |already )?handled)/i.test(after)
        const evidence = clause.slice(Math.max(0, match.index - 100), match.index + match[0].length + 100).trim().slice(0, 300)
        if (declined) { decisions.set(id, { include: false, evidence }); continue }
        if (uncertain.test(clause)) continue
        // Using or connecting an existing CRM is not permission to build one.
        if (id === 'crm' && /\b(?:connect|sync|integrat\w*|existing|already|use|using)\b/i.test(clause) && !/\b(?:build|custom|replace)\b/i.test(clause)) {
          decisions.set(id, { include: false, evidence })
          continue
        }
        if (historical && !desired.test(clause)) continue
        if (desired.test(clause) || /\bfor lead generation\b/i.test(clause) || ['pain', 'workflow', 'priority'].includes(answer.field)) decisions.set(id, { include: true, evidence })
      }
    }
  }
  const bookingDecision = decisions.get('booking')
  if (bookingDecision?.include && serviceWebsite && !decisions.has('crm') && !/\b(?:existing|current|already|connect|use|using)\b[^.!?\n]*\bcrm\b/i.test(context)) {
    decisions.set('crm', { include: true, evidence: bookingDecision.evidence })
  }
  const recommendations = existing.filter(item => !derivedReasons.has(item.reason) && (item.group !== 'capabilityIds' || !decisions.has(item.id as 'booking' | 'crm')))
  for (const [id, decision] of decisions) {
    if (!decision.include) continue
    recommendations.push({ group: 'capabilityIds', id, evidence: decision.evidence,
      reason: id === 'booking' ? bookingReason : /\blead generation\b/i.test(decision.evidence) ? leadReason : crm.test(decision.evidence) ? trackingReason : suggestedTrackingReason,
    })
  }
  if (bookingDecision?.include && serviceWebsite && !recommendations.some(item => item.group === 'surfaceIds' && item.id === 'website')) {
    const source = answers.find(answer => /\bweb\s?sites?\b/i.test(answer.text))!
    const index = source.text.search(/\bweb\s?sites?\b/i)
    recommendations.push({ group: 'surfaceIds', id: 'website', evidence: source.text.slice(Math.max(0, index - 100), index + 150), reason: 'You described customers learning about your services on a website before booking.' })
  }
  if (decisions.get('crm')?.include && !recommendations.some(item => item.group === 'surfaceIds' && ['portal', 'admin', 'mobile'].includes(item.id))) {
    recommendations.push({ group: 'surfaceIds', id: 'admin', evidence: decisions.get('crm')!.evidence, reason: managementReason })
  }
  return recommendations
}
