import { calculateEstimate, type FeatureDefinition } from './estimationEngine'
import { HOURLY_RATE_INR, RISK_MULTIPLIERS, TIMELINE_MULTIPLIERS, getTimelineWeeks, isRiskProfile, isTimelineSpeed, type RiskProfile, type TimelineSpeed } from './pricingCatalog'

export const SOLUTION_CATALOG_VERSION = 'discovery-v1-provisional'
export type SurfaceId = 'website' | 'portal' | 'mobile' | 'admin'
export type CapabilityId = 'crm' | 'seo' | 'accounts' | 'booking' | 'payments' | 'reports' | 'ai'
export type IntegrationId = 'whatsapp' | 'existing_crm' | 'external_api'
export type ModifierId = 'offline' | 'sso'

interface Item extends FeatureDefinition {
  description: string
  surfaces?: readonly SurfaceId[]
  adapters?: Partial<Record<SurfaceId, number>>
}
function item(id: string, name: string, description: string, low: number, likely: number, high: number, weight = 1): Item {
  return { id, name, description, baseHoursRange: { low, likely, high }, integrationWeight: weight }
}

// Provisional allocations: archetype foundations are split into one shared core plus
// surface work. New capabilities/adapters need calibration against completed projects.
export const FOUNDATION = item('foundation', 'Shared solution foundation', 'Planning, shared design conventions and one common data/API foundation where needed.', 15, 20, 25)
export const SURFACES: Record<SurfaceId, Item> = {
  website: item('website', 'Public website', 'Explain your business, publish content and capture enquiries.', 25, 30, 35),
  portal: item('portal', 'Customer or staff web portal', 'A browser-based workspace for customers or your team.', 45, 50, 55),
  mobile: item('mobile', 'Mobile app', 'A cross-platform app for iOS and Android.', 165, 190, 215),
  admin: item('admin', 'Admin console', 'A separate management interface for back-office staff.', 25, 30, 35),
}
export const CAPABILITIES: Record<CapabilityId, Item> = {
  crm: { ...item('crm', 'Custom CRM and lead management', 'Track customers, lead ownership and follow-up. Existing CRM connections are selected separately.', 30, 40, 55, 4), surfaces: ['portal', 'admin', 'mobile'], adapters: { portal: 12, admin: 12, mobile: 18 } },
  seo: { ...item('seo', 'Advanced website SEO', 'Search metadata, structured content and technical SEO setup; ongoing campaigns are separate.', 15, 20, 25, 2), surfaces: ['website'] },
  accounts: { ...item('accounts', 'User accounts and permissions', 'Shared secure login and basic customer/staff roles.', 18, 19, 20, 4), surfaces: ['portal', 'admin', 'mobile'], adapters: { portal: 6, admin: 6, mobile: 10 } },
  booking: { ...item('booking', 'Booking and scheduling', 'Let people book and manage appointments.', 20, 30, 40, 3), adapters: { website: 4, portal: 6, mobile: 10, admin: 4 } },
  payments: { ...item('payments', 'Payments', 'Collect one-time payments or subscriptions.', 12, 20, 35, 4), adapters: { website: 4, portal: 6, mobile: 10 } },
  reports: { ...item('reports', 'Reports and analytics', 'Basic operational reporting for your team.', 20, 28, 45, 3), surfaces: ['portal', 'admin', 'mobile'], adapters: { portal: 6, admin: 6, mobile: 10 } },
  ai: { ...item('ai', 'AI workflow assistance', 'A bounded assistant for an agreed workflow; complex autonomous operations need review.', 80, 100, 140, 4), adapters: { portal: 6, admin: 6, mobile: 10 } },
}
export const INTEGRATIONS: Record<IntegrationId, Item> = {
  whatsapp: item('whatsapp', 'WhatsApp connection', 'Connect an agreed messaging workflow; messaging charges are separate.', 25, 30, 35, 2),
  existing_crm: item('existing_crm', 'Connect an existing CRM', 'One supported HubSpot, Salesforce or Zoho connection; provider and sync details must be confirmed.', 30, 40, 55, 4),
  external_api: item('external_api', 'Another external system', 'An unspecified integration requires human review before pricing.', 15, 25, 35, 3),
}
export const MODIFIERS: Record<ModifierId, Item> = {
  offline: { ...item('offline', 'Offline mobile support', 'Use the app without connectivity and synchronize later.', 40, 50, 65, 5), surfaces: ['mobile'] },
  sso: { ...item('sso', 'Company single sign-on', 'Connect an agreed enterprise identity provider.', 40, 50, 60, 5), surfaces: ['portal', 'admin', 'mobile'] },
}

export interface SolutionScope {
  surfaceIds: SurfaceId[]
  capabilityIds: CapabilityId[]
  integrationIds: IntegrationId[]
  modifierIds: ModifierId[]
  billing: 'one_time' | 'recurring' | 'undecided'
  crmProvider: 'hubspot' | 'salesforce' | 'zoho' | 'undecided'
  riskProfile: RiskProfile
  timelineSpeed: TimelineSpeed
}
export function emptyScope(): SolutionScope {
  return { surfaceIds: [], capabilityIds: [], integrationIds: [], modifierIds: [], billing: 'undecided', crmProvider: 'undecided', riskProfile: 'standard', timelineSpeed: 'standard' }
}
// Hidden follow-ups are not customer answers and must not survive deselection.
export function clearInactiveAnswers(scope: SolutionScope): SolutionScope {
  return { ...scope, billing: scope.capabilityIds.includes('payments') ? scope.billing : 'undecided', crmProvider: scope.integrationIds.includes('existing_crm') ? scope.crmProvider : 'undecided' }
}
export class SolutionValidationError extends Error {}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
export function parseIds<T extends string>(value: unknown, catalog: Record<T, Item>, label: string): T[] {
  if (!Array.isArray(value) || value.length > Object.keys(catalog).length) throw new SolutionValidationError(`${label} selection is invalid.`)
  const ids: T[] = []
  for (const id of value) {
    if (typeof id !== 'string' || !Object.hasOwn(catalog, id)) throw new SolutionValidationError(`${label} contains an unknown item.`)
    if (ids.includes(id as T)) throw new SolutionValidationError(`${label} contains duplicates.`)
    ids.push(id as T)
  }
  return ids
}
export function parseScope(value: unknown): SolutionScope {
  if (!isRecord(value)) throw new SolutionValidationError('Solution scope must be an object.')
  const surfaceIds = parseIds(value.surfaceIds, SURFACES, 'Surface')
  const capabilityIds = parseIds(value.capabilityIds, CAPABILITIES, 'Capability')
  const integrationIds = parseIds(value.integrationIds, INTEGRATIONS, 'Integration')
  const modifierIds = parseIds(value.modifierIds, MODIFIERS, 'Complexity')
  if (typeof value.billing !== 'string' || !['one_time', 'recurring', 'undecided'].includes(value.billing)) throw new SolutionValidationError('Billing selection is invalid.')
  if (typeof value.crmProvider !== 'string' || !['hubspot', 'salesforce', 'zoho', 'undecided'].includes(value.crmProvider)) throw new SolutionValidationError('CRM provider is invalid.')
  if (!isRiskProfile(value.riskProfile) || !isTimelineSpeed(value.timelineSpeed)) throw new SolutionValidationError('Select valid risk and delivery preferences.')
  return clearInactiveAnswers({ surfaceIds, capabilityIds, integrationIds, modifierIds, billing: value.billing as SolutionScope['billing'], crmProvider: value.crmProvider as SolutionScope['crmProvider'], riskProfile: value.riskProfile, timelineSpeed: value.timelineSpeed })
}
export function reviewScope(scope: SolutionScope) {
  const issues: string[] = []
  if (!scope.surfaceIds.length) issues.push('Select at least one place where people will use the solution.')
  for (const id of [...scope.capabilityIds, ...scope.modifierIds]) {
    const definition = Object.hasOwn(CAPABILITIES, id) ? CAPABILITIES[id as CapabilityId] : MODIFIERS[id as ModifierId]
    if (definition.surfaces && !definition.surfaces.some(surface => scope.surfaceIds.includes(surface))) issues.push(`${definition.name} needs ${definition.surfaces.map(surface => SURFACES[surface].name).join(' or ')}.`)
  }
  if (scope.capabilityIds.includes('payments') && !scope.surfaceIds.some(id => id !== 'admin')) issues.push('Payments need a website, portal or mobile checkout interface.')
  const paymentUnknown = scope.capabilityIds.includes('payments') && scope.billing === 'undecided'
  const crmUnknown = scope.integrationIds.includes('existing_crm') && scope.crmProvider === 'undecided'
  const externalUnknown = scope.integrationIds.includes('external_api')
  const reviewItems: string[] = []
  if (paymentUnknown) reviewItems.push('Payment method is unanswered or not decided. Payments are not included until the billing details are confirmed with the team.')
  if (crmUnknown) reviewItems.push('Customer-system provider is unanswered or not decided. This connection is not included until the provider is confirmed with the team.')
  if (externalUnknown) reviewItems.push('The other tool needs human scope review. This connection is not included until its details are confirmed with the team.')
  // Preserve the requested scope; only the explicitly approved partial estimate
  // uses this subset. No guessed billing/provider value or optional work is added.
  const pricedScope = clearInactiveAnswers({ ...scope,
    capabilityIds: scope.capabilityIds.filter(id => !(id === 'payments' && paymentUnknown)),
    integrationIds: scope.integrationIds.filter(id => !(id === 'existing_crm' && crmUnknown) && id !== 'external_api'),
  })
  return { issues, reviewItems, pricedScope }
}
export function scopeIssues(scope: SolutionScope): string[] {
  // Direct/full pricing remains strict. Partial pricing must explicitly use the
  // reviewed subset, never bypass price-critical validation on requested work.
  const issues = [...reviewScope(scope).issues]
  if (scope.capabilityIds.includes('payments') && scope.billing === 'undecided') issues.push('Confirm one-time or recurring billing before estimating payments.')
  if (scope.integrationIds.includes('existing_crm') && scope.crmProvider === 'undecided') issues.push('Confirm the existing CRM provider before estimating its connection.')
  if (scope.integrationIds.includes('external_api')) issues.push('The unspecified external integration needs a human scope review.')
  return issues
}
export function resolveWork(scope: SolutionScope): FeatureDefinition[] {
  const issues = scopeIssues(scope)
  if (issues.length) throw new SolutionValidationError(issues.join(' '))
  const work: FeatureDefinition[] = [FOUNDATION, ...scope.surfaceIds.map(id => SURFACES[id])]
  for (const id of scope.capabilityIds) {
    const capability = CAPABILITIES[id]
    work.push(capability)
    for (const surface of scope.surfaceIds) {
      const hours = capability.adapters?.[surface]
      if (hours) work.push(item(`${id}:${surface}`, `${capability.name}: ${SURFACES[surface].name} interface`, '', hours, hours, hours))
    }
  }
  work.push(...scope.integrationIds.map(id => INTEGRATIONS[id]), ...scope.modifierIds.map(id => MODIFIERS[id]))
  if (scope.capabilityIds.includes('payments') && scope.billing === 'recurring') work.push(item('recurring_billing', 'Recurring billing setup', '', 8, 8, 8))
  if (scope.surfaceIds.length > 1) {
    const hours = (scope.surfaceIds.length - 1) * 8
    work.push(item('coordination', 'Cross-surface coordination and acceptance checks', '', hours, hours, hours))
  }
  return work
}
export function estimateSolution(scope: SolutionScope) {
  const work = resolveWork(scope)
  const result = calculateEstimate(work, {}, RISK_MULTIPLIERS[scope.riskProfile], HOURLY_RATE_INR, TIMELINE_MULTIPLIERS[scope.timelineSpeed])
  return {
    ...result,
    lowEstimateCost: Math.round(result.lowEstimateCost / 100) * 100,
    highEstimateCost: Math.round(result.highEstimateCost / 100) * 100,
    work: work.map(({ id, name, baseHoursRange }) => ({ id, name, expectedHours: (baseHoursRange.low + 4 * baseHoursRange.likely + baseHoursRange.high) / 6 })),
    weeks: getTimelineWeeks(result.lowEstimateHours, result.highEstimateHours, scope.timelineSpeed),
    hourlyRate: HOURLY_RATE_INR,
    catalogVersion: SOLUTION_CATALOG_VERSION,
    pricingStatus: 'provisional' as const,
  }
}
export type SolutionEstimate = ReturnType<typeof estimateSolution>
