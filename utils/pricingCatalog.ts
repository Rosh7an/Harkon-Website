import type { FeatureDefinition } from './estimationEngine'

export type ProjectType = 'webapp' | 'mobile' | 'ai_automation' | 'enterprise' | 'website'
export type FeatureId =
  | 'webapp_auth' | 'webapp_stripe' | 'webapp_api'
  | 'mobile_push' | 'mobile_offline' | 'mobile_biometrics'
  | 'ai_whatsapp' | 'ai_agents' | 'ai_ocr'
  | 'enterprise_crm' | 'enterprise_dashboard' | 'enterprise_sso' | 'enterprise_admin'
  | 'website_seo' | 'website_booking' | 'website_social'
export type RiskProfile = 'clear' | 'standard' | 'novel'
export type TimelineSpeed = 'standard' | 'expedited'

export interface ProjectDefinition extends FeatureDefinition {
  id: ProjectType
}

export interface CatalogFeature extends FeatureDefinition {
  id: FeatureId
  applicableTo: readonly ProjectType[]
}

export const HOURLY_RATE_INR = 240

export const RISK_MULTIPLIERS: Record<RiskProfile, number> = {
  clear: 1,
  standard: 1.3,
  novel: 1.6,
}

export const TIMELINE_MULTIPLIERS: Record<TimelineSpeed, number> = {
  standard: 1,
  expedited: 1.25,
}

export const PROJECT_CATALOG: readonly ProjectDefinition[] = [
  { id: 'website', name: 'Website Creation & SEO', baseHoursRange: { low: 40, likely: 50, high: 60 }, integrationWeight: 1 },
  { id: 'webapp', name: 'Custom Web Application', baseHoursRange: { low: 60, likely: 70, high: 80 }, integrationWeight: 1 },
  { id: 'mobile', name: 'Cross-Platform Mobile App', baseHoursRange: { low: 180, likely: 210, high: 240 }, integrationWeight: 1 },
  { id: 'enterprise', name: 'Enterprise Multi-System Platform', baseHoursRange: { low: 360, likely: 380, high: 400 }, integrationWeight: 1 },
  { id: 'ai_automation', name: 'Business Automation using AI', baseHoursRange: { low: 450, likely: 500, high: 550 }, integrationWeight: 2 },
]

export const FEATURE_CATALOG: readonly CatalogFeature[] = [
  { id: 'webapp_auth', name: 'User Accounts & Roles (RBAC)', baseHoursRange: { low: 18, likely: 19, high: 20 }, integrationWeight: 4, applicableTo: ['webapp'] },
  {
    id: 'webapp_stripe', name: 'Payment Gateway', baseHoursRange: { low: 12, likely: 20, high: 35 }, integrationWeight: 4, applicableTo: ['webapp'],
    followUps: [{ id: 'stripe_billing', question: 'One-time or recurring billing?', options: [{ label: 'One-time', hoursAdjustment: 0 }, { label: 'Recurring', hoursAdjustment: 8 }] }],
  },
  { id: 'webapp_api', name: 'Third-party API Integrations', baseHoursRange: { low: 15, likely: 25, high: 35 }, integrationWeight: 3, applicableTo: ['webapp'] },
  { id: 'website_seo', name: 'Advanced SEO Optimization', baseHoursRange: { low: 15, likely: 20, high: 25 }, integrationWeight: 2, applicableTo: ['website'] },
  { id: 'website_booking', name: 'Automated Booking System', baseHoursRange: { low: 20, likely: 30, high: 40 }, integrationWeight: 3, applicableTo: ['website'] },
  {
    id: 'website_social', name: 'Social Media Management', baseHoursRange: { low: 25, likely: 35, high: 45 }, integrationWeight: 2, applicableTo: ['website'],
    followUps: [{ id: 'social_subscription', question: 'Discuss a monthly management retainer?', options: [{ label: 'Setup only', hoursAdjustment: 0 }, { label: 'Yes, scope separately', hoursAdjustment: 0 }] }],
  },
  { id: 'mobile_push', name: 'Push Notifications', baseHoursRange: { low: 15, likely: 20, high: 25 }, integrationWeight: 2, applicableTo: ['mobile'] },
  { id: 'mobile_offline', name: 'Offline Support (Local-First)', baseHoursRange: { low: 40, likely: 50, high: 65 }, integrationWeight: 5, applicableTo: ['mobile'] },
  { id: 'mobile_biometrics', name: 'Biometric Auth (FaceID)', baseHoursRange: { low: 15, likely: 20, high: 25 }, integrationWeight: 3, applicableTo: ['mobile'] },
  { id: 'ai_whatsapp', name: 'WhatsApp Automation & Alerts', baseHoursRange: { low: 25, likely: 30, high: 35 }, integrationWeight: 2, applicableTo: ['ai_automation', 'webapp'] },
  { id: 'ai_agents', name: 'Autonomous AI Agents', baseHoursRange: { low: 80, likely: 100, high: 140 }, integrationWeight: 4, applicableTo: ['ai_automation', 'webapp'] },
  { id: 'ai_ocr', name: 'Document Extraction (OCR)', baseHoursRange: { low: 35, likely: 45, high: 60 }, integrationWeight: 3, applicableTo: ['ai_automation'] },
  { id: 'enterprise_crm', name: 'Salesforce / HubSpot Sync', baseHoursRange: { low: 30, likely: 40, high: 55 }, integrationWeight: 4, applicableTo: ['enterprise'] },
  { id: 'enterprise_dashboard', name: 'Telemetry Dashboard', baseHoursRange: { low: 20, likely: 28, high: 45 }, integrationWeight: 3, applicableTo: ['enterprise'] },
  { id: 'enterprise_sso', name: 'Enterprise SSO (SAML/Okta)', baseHoursRange: { low: 40, likely: 50, high: 60 }, integrationWeight: 5, applicableTo: ['enterprise'] },
  { id: 'enterprise_admin', name: 'Custom Admin Panel', baseHoursRange: { low: 25, likely: 30, high: 35 }, integrationWeight: 3, applicableTo: ['enterprise'] },
]

export const PROJECT_BY_ID = Object.fromEntries(PROJECT_CATALOG.map(project => [project.id, project])) as Record<ProjectType, ProjectDefinition>
export const FEATURE_BY_ID = Object.fromEntries(FEATURE_CATALOG.map(feature => [feature.id, feature])) as Record<FeatureId, CatalogFeature>

export function isProjectType(value: unknown): value is ProjectType {
  return typeof value === 'string' && value in PROJECT_BY_ID
}

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && value in FEATURE_BY_ID
}

export function isRiskProfile(value: unknown): value is RiskProfile {
  return value === 'clear' || value === 'standard' || value === 'novel'
}

export function isTimelineSpeed(value: unknown): value is TimelineSpeed {
  return value === 'standard' || value === 'expedited'
}

export function getTimelineWeeks(lowHours: number, highHours: number, speed: TimelineSpeed): { low: number; high: number } {
  const baseLow = lowHours > 0 ? Math.max(1, Math.round(lowHours / 30)) : 0
  const baseHigh = highHours > 0 ? Math.max(1, Math.round(highHours / 30)) : 0
  const planningBuffer = speed === 'standard' && highHours > 0 ? 2 : 0
  return { low: baseLow + planningBuffer, high: baseHigh + planningBuffer }
}
