import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES, type SurfaceId, type CapabilityId, type IntegrationId, type ModifierId } from './solutionCatalog'

type Choice = { name: string; description: string }
// Customer-facing copy only. Canonical IDs, dependencies and prices are unchanged.
export const SURFACE_CHOICES: Record<SurfaceId, Choice> = {
  website: { name: 'Public website', description: 'Show what you offer and let customers send enquiries.' },
  portal: { name: 'Online workspace', description: 'A private area in a web browser for your customers or team.' },
  mobile: { name: 'Mobile app', description: 'Let people use your service on an iPhone or Android phone.' },
  admin: { name: 'Management dashboard', description: 'A separate place for staff to manage the business.' },
}
export const CAPABILITY_CHOICES: Record<CapabilityId, Choice> = {
  crm: { name: 'Track customers and follow-ups', description: 'Build a customer tracker (CRM) to assign enquiries and keep follow-ups organised.' },
  seo: { name: 'Help customers find your website', description: 'Set up your website for search engines (SEO). Ongoing marketing is separate.' },
  accounts: { name: 'Customer and staff logins', description: 'Let people sign in and control what each person can see or do.' },
  booking: { name: 'Booking and scheduling', description: 'Let customers book appointments and your team manage them.' },
  payments: { name: 'Payments', description: 'Take one-off payments or regular subscriptions.' },
  reports: { name: 'Business reports', description: 'See a clear summary of activity and progress.' },
  ai: { name: 'AI help for everyday tasks', description: 'An assistant for a specific task we agree together. More complex work needs a discussion.' },
}
export const INTEGRATION_CHOICES: Record<IntegrationId, Choice> = {
  whatsapp: { name: 'WhatsApp connection', description: 'Connect an agreed messaging process. Message charges are separate.' },
  existing_crm: { name: 'Connect your current customer system', description: 'Connect HubSpot, Salesforce or Zoho instead of replacing it. We will check what needs to sync.' },
  external_api: { name: 'Connect another tool', description: 'Tell the team which tool you use. This needs a discussion before we price it.' },
}
export const MODIFIER_CHOICES: Record<ModifierId, Choice> = {
  offline: { name: 'Use the mobile app without internet', description: 'Save changes while offline and send them when the connection returns.' },
  sso: { name: 'Use your company login', description: 'Let people sign in with an agreed company account (single sign-on).' },
}
const catalogPairs = [
  [SURFACES, SURFACE_CHOICES], [CAPABILITIES, CAPABILITY_CHOICES],
  [INTEGRATIONS, INTEGRATION_CHOICES], [MODIFIERS, MODIFIER_CHOICES],
] as const
export function customerWording(text: string): string {
  if (text === 'I’ve saved your answer. The review will separate what you’ve told me from suggested scope.') return 'I’ve saved that. We’ll review your answers together before we estimate.'
  if (text === 'Advanced website SEO needs Public website.') return 'Choose a public website before adding search-engine setup.'
  if (text === 'Select at least one place where people will use the solution.') return 'Choose a website, workspace or app to start.'
  if (text === 'Confirm one-time or recurring billing before estimating payments.') return 'Choose one-off payments or regular subscriptions before we estimate payments.'
  if (text === 'Confirm the existing CRM provider before estimating its connection.') return 'Choose the customer system you want to connect.'
  if (text === 'Payments need a website, portal or mobile checkout interface.') return 'Choose a website, workspace or mobile app where customers can pay.'
  const missingDetails: Record<string, string> = {
    'Main difficulty still needs confirmation.': 'Tell us a little more about the main problem.',
    'Desired outcome and workflow still needs confirmation.': 'Confirm how you want the process to work.',
    'People and access still needs confirmation.': 'Confirm who needs to use it.',
    'Existing systems and constraints still needs confirmation.': 'Confirm any tools, existing data or special needs.',
  }
  if (Object.hasOwn(missingDetails, text)) return missingDetails[text]
  if (text.startsWith('AI scope mapping was unavailable.')) return 'Our assistant could not check your answers. The team needs to review them before we can estimate the whole project.'
  if (text.startsWith('Data migration, regulated data,')) return 'Moving old data, handling sensitive information or connecting complex older systems needs a discussion with the team.'
  let result = text
  for (const [catalog, choices] of catalogPairs) {
    for (const [id, item] of Object.entries(catalog)) result = result.replaceAll(item.name, (choices as Record<string, Choice>)[id].name)
  }
  return result.replace('The unspecified external integration needs a human scope review.', 'Tell the team which tool you want to connect. We need to check it before estimating.')
}

export { discoveryProgress } from './discoveryProgress'
