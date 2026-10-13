'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import QueryModal from './QueryModal'
import AISpecChat from './AISpecChat'
import type { EstimationResult, FeatureDefinition } from '../utils/estimationEngine'
import {
  FEATURE_BY_ID,
  HOURLY_RATE_INR,
  PROJECT_BY_ID,
  RISK_MULTIPLIERS,
  TIMELINE_MULTIPLIERS,
  getTimelineWeeks,
  isFeatureId,
  type FeatureId,
  type ProjectType,
  type RiskProfile,
  type TimelineSpeed,
} from '../utils/pricingCatalog'

interface ProjectOption extends FeatureDefinition {
  id: ProjectType
  desc: string
}

interface FeatureOption extends FeatureDefinition {
  id: FeatureId
  desc: string
  category: string
  iconSvg: React.ReactNode
  applicableTo: ProjectType[]
}

const PROJECT_PRESENTATION: ProjectOption[] = [
  {
    id: 'website',
    name: 'Website Creation & SEO',
    desc: 'High-conversion landing pages, CMS, and corporate websites.',
    baseHoursRange: { low: 40, likely: 50, high: 60 },
    integrationWeight: 1,
  },
  {
    id: 'webapp',
    name: 'Custom Web Application',
    desc: 'SaaS product, client portal, or full-stack dashboard web platform.',
    baseHoursRange: { low: 60, likely: 70, high: 80 },
    integrationWeight: 1,
  },
  {
    id: 'mobile',
    name: 'Cross-Platform Mobile App',
    desc: 'iOS & Android app built with React Native / Flutter with push notifications.',
    baseHoursRange: { low: 180, likely: 210, high: 240 },
    integrationWeight: 1,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Multi-System Platform',
    desc: 'Scalable cloud infrastructure, legacy migration & dedicated API integrations.',
    baseHoursRange: { low: 360, likely: 380, high: 400 },
    integrationWeight: 1,
  },
  {
    id: 'ai_automation',
    name: 'Business Automation using AI',
    desc: 'Autonomous AI agents, intelligent workflows & automated data processing.',
    baseHoursRange: { low: 450, likely: 500, high: 550 },
    integrationWeight: 2,
  },
]

const FEATURE_PRESENTATION: FeatureOption[] = [
  // --- WEB APP ---
  {
    id: 'webapp_auth',
    name: 'User Accounts & Roles (RBAC)',
    desc: 'OAuth 2.0, session tokens, multi-tenant roles & permissions.',
    baseHoursRange: { low: 18, likely: 19, high: 20 },
    integrationWeight: 4,
    category: 'Web App',
    applicableTo: ['webapp'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'webapp_stripe',
    name: 'Payment Gateway',
    desc: 'Checkout, recurring subscriptions, invoices & webhook sync.',
    baseHoursRange: { low: 12, likely: 20, high: 35 },
    integrationWeight: 4,
    category: 'Web App',
    applicableTo: ['webapp'],
    followUps: [
      {
        id: 'stripe_billing',
        question: 'One-time or recurring billing?',
        options: [
          { label: 'One-time', hoursAdjustment: 0 },
          { label: 'Recurring', hoursAdjustment: 8 }
        ]
      }
    ],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="14" rx="2" width="20" x="2" y="5" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    id: 'webapp_api',
    name: 'Third-party API Integrations',
    desc: 'Integration with external services (maps, weather, AI, etc.).',
    baseHoursRange: { low: 15, likely: 25, high: 35 },
    integrationWeight: 3,
    category: 'Web App',
    applicableTo: ['webapp'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },

  // --- WEBSITE & SEO ---
  {
    id: 'website_seo',
    name: 'Advanced SEO Optimization',
    desc: 'On-page SEO, schema markup, dynamic sitemaps, and rich metadata.',
    baseHoursRange: { low: 15, likely: 20, high: 25 },
    integrationWeight: 2,
    category: 'Website & SEO',
    applicableTo: ['website'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'website_booking',
    name: 'Automated Booking System',
    desc: 'Calendar sync, appointment scheduling, and automated reminders.',
    baseHoursRange: { low: 20, likely: 30, high: 40 },
    integrationWeight: 3,
    category: 'Website & SEO',
    applicableTo: ['website'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'website_social',
    name: 'Social Media Management',
    desc: 'Automated cross-platform posting and analytics (Subscription basis).',
    baseHoursRange: { low: 25, likely: 35, high: 45 },
    integrationWeight: 2,
    category: 'Website & SEO',
    applicableTo: ['website'],
    followUps: [
      {
        id: 'social_subscription',
        question: 'Include monthly management retainer?',
        options: [
          { label: 'Setup only', hoursAdjustment: 0 },
          { label: 'Yes, + subscription', hoursAdjustment: 10 }
        ]
      }
    ],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // --- MOBILE APP ---
  {
    id: 'mobile_push',
    name: 'Push Notifications',
    desc: 'FCM/APNs integration for real-time device alerts.',
    baseHoursRange: { low: 15, likely: 20, high: 25 },
    integrationWeight: 2,
    category: 'Mobile App',
    applicableTo: ['mobile'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'mobile_offline',
    name: 'Offline Support (Local-First)',
    desc: 'Local SQLite/WatermelonDB sync engine for offline usage.',
    baseHoursRange: { low: 40, likely: 50, high: 65 },
    integrationWeight: 5,
    category: 'Mobile App',
    applicableTo: ['mobile'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 3l18 18M3.4 8.2a11.97 11.97 0 011.6-.9m11.4 0a11.97 11.97 0 014.2 3.5m-15.6 5.8a5.98 5.98 0 011.8-1.5m8.4 0a5.98 5.98 0 012.8 2.5m-6.4 1.5a2 2 0 012.8 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'mobile_biometrics',
    name: 'Biometric Auth (FaceID)',
    desc: 'Native biometric authentication via TouchID or FaceID.',
    baseHoursRange: { low: 15, likely: 20, high: 25 },
    integrationWeight: 3,
    category: 'Mobile App',
    applicableTo: ['mobile'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // --- AI AUTOMATION ---
  {
    id: 'ai_whatsapp',
    name: 'WhatsApp Automation & Alerts',
    desc: 'Automated booking alerts, broadcast messages & chat webhook API.',
    baseHoursRange: { low: 25, likely: 30, high: 35 },
    integrationWeight: 2,
    category: 'AI Automation',
    applicableTo: ['ai_automation', 'webapp'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'ai_agents',
    name: 'Autonomous AI Agents',
    desc: 'Multi-agent orchestration, tool calling, and RAG knowledge base.',
    baseHoursRange: { low: 80, likely: 100, high: 140 },
    integrationWeight: 4,
    category: 'AI Automation',
    applicableTo: ['ai_automation', 'webapp'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'ai_ocr',
    name: 'Document Extraction (OCR)',
    desc: 'Automated parsing of invoices, PDFs, and unstructured data.',
    baseHoursRange: { low: 35, likely: 45, high: 60 },
    integrationWeight: 3,
    category: 'AI Automation',
    applicableTo: ['ai_automation'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },

  // --- ENTERPRISE ---
  {
    id: 'enterprise_crm',
    name: 'Salesforce / HubSpot Sync',
    desc: 'Two-way bidirectional sync for leads, deals, and contacts.',
    baseHoursRange: { low: 30, likely: 40, high: 55 },
    integrationWeight: 4,
    category: 'Enterprise',
    applicableTo: ['enterprise'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'enterprise_dashboard',
    name: 'Telemetry Dashboard',
    desc: 'Live WebSockets telemetry, KPI visualizations & CSV/PDF exports.',
    baseHoursRange: { low: 20, likely: 28, high: 45 },
    integrationWeight: 3,
    category: 'Enterprise',
    applicableTo: ['enterprise'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'enterprise_sso',
    name: 'Enterprise SSO (SAML/Okta)',
    desc: 'Integration with corporate identity providers like Okta/Entra.',
    baseHoursRange: { low: 40, likely: 50, high: 60 },
    integrationWeight: 5,
    category: 'Enterprise',
    applicableTo: ['enterprise'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'enterprise_admin',
    name: 'Custom Admin Panel',
    desc: 'Internal CRUD operations, user management & audit tracking logs.',
    baseHoursRange: { low: 25, likely: 30, high: 35 },
    integrationWeight: 3,
    category: 'Enterprise',
    applicableTo: ['enterprise'],
    iconSvg: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
        <line x1="9" x2="9" y1="3" y2="21" />
        <line x1="3" x2="21" y1="9" y2="9" />
      </svg>
    ),
  },
]

// Canonical pricing fields always come from the shared catalog. Any mirrored values in
// the presentation objects are overwritten here, so UI and API calculations cannot drift.
const PROJECT_TYPES: ProjectOption[] = PROJECT_PRESENTATION.map(project => ({
  ...project,
  ...PROJECT_BY_ID[project.id],
}))

const FEATURES: FeatureOption[] = FEATURE_PRESENTATION.map(feature => ({
  ...feature,
  ...FEATURE_BY_ID[feature.id],
  applicableTo: [...FEATURE_BY_ID[feature.id].applicableTo],
}))

const EMPTY_ESTIMATE: EstimationResult = {
  lowEstimateCost: 0,
  highEstimateCost: 0,
  lowEstimateHours: 0,
  highEstimateHours: 0,
  subtotal: 0,
  rawFeatureTotal: 0,
  surcharge: 0,
  setupOverhead: 0,
  qaOverhead: 0,
  pmOverhead: 0,
}

export default function PricingEstimator() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isSectionVisible, setIsSectionVisible] = useState(false)
  const [step, setStep] = useState<number>(1)
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [selectedFeatures, setSelectedFeatures] = useState<Set<FeatureId>>(new Set())
  const [aiSpecs, setAiSpecs] = useState<string>('')
  const [timelineSpeed, setTimelineSpeed] = useState<TimelineSpeed | null>(null)
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<string>('')

  // Engine additions
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({})
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('standard')
  const [breakdownOpen, setBreakdownOpen] = useState<boolean>(false)
  const [estimateStatus, setEstimateStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [estimateError, setEstimateError] = useState<string>('')

  const toggleFeature = (id: FeatureId) => {
    const isRemoving = selectedFeatures.has(id)
    setSelectedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (isRemoving) {
      const questionIds = new Set((FEATURE_BY_ID[id].followUps ?? []).map(followUp => followUp.id))
      setFollowUpAnswers(previous => Object.fromEntries(Object.entries(previous).filter(([questionId]) => !questionIds.has(questionId))))
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsSectionVisible(entry.isIntersecting)
    }, { threshold: 0.05 })

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleFollowUp = (questionId: string, label: string) => {
    setFollowUpAnswers(prev => ({ ...prev, [questionId]: label }))
  }

  // Engine Calculation
  const selectedProject = useMemo(() => PROJECT_TYPES.find(project => project.id === projectType) ?? null, [projectType])

  const activeFeatureOptions = useMemo(() => FEATURES.filter(feature => (
    selectedFeatures.has(feature.id) && projectType !== null && feature.applicableTo.includes(projectType)
  )), [projectType, selectedFeatures])

  const unansweredFollowUps = activeFeatureOptions.flatMap(feature => (
    (feature.followUps ?? []).filter(followUp => !followUpAnswers[followUp.id]).map(followUp => followUp.id)
  ))

  const riskMultiplier = RISK_MULTIPLIERS[riskProfile]
  const effectiveTimelineSpeed: TimelineSpeed = timelineSpeed ?? 'standard'
  const timelineMult = TIMELINE_MULTIPLIERS[effectiveTimelineSpeed]

  const [estimate, setEstimate] = useState<EstimationResult>(EMPTY_ESTIMATE)

  useEffect(() => {
    if (!projectType) {
      setEstimate(EMPTY_ESTIMATE)
      setEstimateStatus('idle')
      setEstimateError('')
      return
    }

    const controller = new AbortController()
    const fetchEstimate = async () => {
      setEstimateStatus('loading')
      setEstimateError('')
      try {
        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            projectTypeId: projectType,
            featureIds: activeFeatureOptions.map(feature => feature.id),
            followUpAnswers,
            riskProfile,
            timelineSpeed: effectiveTimelineSpeed,
          })
        })
        const data = await response.json() as { result?: EstimationResult; error?: string }
        if (!response.ok || !data.result) throw new Error(data.error || 'Estimate could not be calculated.')
        if (!controller.signal.aborted) {
          setEstimate(data.result)
          setEstimateStatus('ready')
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        setEstimateStatus('error')
        setEstimateError(error instanceof Error ? error.message : 'Estimate could not be calculated.')
      }
    }
    fetchEstimate()
    return () => controller.abort()
  }, [activeFeatureOptions, effectiveTimelineSpeed, followUpAnswers, projectType, riskProfile])

  const lowEstimate = Math.round(estimate.lowEstimateCost / 100) * 100
  const highEstimate = Math.round(estimate.highEstimateCost / 100) * 100

  const standardWeeks = getTimelineWeeks(estimate.lowEstimateHours, estimate.highEstimateHours, 'standard')
  const expeditedWeeks = getTimelineWeeks(estimate.lowEstimateHours, estimate.highEstimateHours, 'expedited')
  const selectedWeeks = getTimelineWeeks(estimate.lowEstimateHours, estimate.highEstimateHours, effectiveTimelineSpeed)

  // Context string passed to AI so it knows what the user already selected
  const aiProjectContext = useMemo(() => {
    const features = activeFeatureOptions.map(feature => feature.name).join(', ')
    return `Platform: ${selectedProject?.name || 'Not selected yet'}. Selected features: ${features || 'none yet'}. Timeline: ${timelineSpeed || 'Not selected yet'}. Risk profile: ${riskProfile}.${aiSpecs ? ` AI-refined specs: ${aiSpecs}` : ''}`
  }, [activeFeatureOptions, selectedProject, timelineSpeed, riskProfile, aiSpecs])

  const handleFeatureSync = (featureIds: string[]) => {
    if (!projectType) return
    const aliases: Record<string, FeatureId> = {
      auth: 'webapp_auth', stripe: 'webapp_stripe', whatsapp: 'ai_whatsapp',
      dashboard: 'enterprise_dashboard', admin: 'enterprise_admin',
    }
    const nextIds = featureIds
      .map(id => aliases[id] ?? id)
      .filter(isFeatureId)
      .filter(id => FEATURE_BY_ID[id].applicableTo.includes(projectType))
    const uniqueIds = Array.from(new Set(nextIds))
    setSelectedFeatures(new Set(uniqueIds))
    const activeQuestionIds = new Set(uniqueIds.flatMap(id => (FEATURE_BY_ID[id].followUps ?? []).map(followUp => followUp.id)))
    setFollowUpAnswers(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => activeQuestionIds.has(id))))
  }

  const fullScopeBrief = useMemo(() => {
    let text = `Project Archetype: ${selectedProject?.name || 'None selected'}\n`
    text += `Selected Features: ${activeFeatureOptions.map(feature => feature.name).join(', ') || 'Base scope only'}\n`
    for (const feature of activeFeatureOptions) {
      for (const followUp of feature.followUps ?? []) {
        text += `${followUp.question}: ${followUpAnswers[followUp.id] || 'Not answered'}\n`
      }
    }
    text += `Estimated Budget: ₹${lowEstimate.toLocaleString()} - ₹${highEstimate.toLocaleString()}\n`
    text += `Estimated Effort: ${Math.round(estimate.lowEstimateHours)} - ${Math.round(estimate.highEstimateHours)} hours\n`
    text += `Delivery Speed: ${timelineSpeed ? `${timelineSpeed === 'expedited' ? 'Expedited' : 'Standard'} (${selectedWeeks.low}-${selectedWeeks.high} weeks)` : 'None selected'}\n`
    text += `Risk Profile: ${riskProfile} (${riskMultiplier.toFixed(1)}x)\n`
    text += `Pricing Basis: ₹${HOURLY_RATE_INR.toLocaleString('en-IN')}/hour${timelineSpeed === 'expedited' ? ' with 25% priority uplift' : ''}\n`
    if (aiSpecs) {
      text += `\nArchitect Blueprint Specs:\n${aiSpecs}`
    }
    return text
  }, [activeFeatureOptions, aiSpecs, estimate.highEstimateHours, estimate.lowEstimateHours, followUpAnswers, highEstimate, lowEstimate, riskMultiplier, riskProfile, selectedProject, selectedWeeks.high, selectedWeeks.low, timelineSpeed])

  const scrollToSection = () => {
    if (!sectionRef.current) return
    const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  const downloadPdf = async () => {
    if (!sectionRef.current) return
    const wasBreakdownOpen = breakdownOpen
    setIsDownloadingPdf(true)
    setPdfError('')
    try {
      // Temporarily open breakdown if it's closed, to include it in the PDF
      if (!wasBreakdownOpen) setBreakdownOpen(true)
      
      // Wait a tick for breakdown to render
      await new Promise(r => setTimeout(r, 100))

      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(sectionRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#070E15',
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageHeight = (canvas.height * pdfWidth) / canvas.width
      let offset = 0
      pdf.addImage(imgData, 'PNG', 0, offset, pdfWidth, imageHeight)
      while (imageHeight + offset > pageHeight) {
        offset -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, offset, pdfWidth, imageHeight)
      }
      pdf.save(`Exter_Cloud_Project_Estimate_${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF Generation failed', err)
      setPdfError('PDF generation failed. Please try again.')
    } finally {
      if (!wasBreakdownOpen) setBreakdownOpen(false)
      setIsDownloadingPdf(false)
    }
  }

  return (
    <section ref={sectionRef} className={`relative py-20 px-4 sm:px-6 lg:px-8 mx-auto transition-all duration-500 ${isAiOpen ? 'max-w-6xl' : 'max-w-5xl'}`}>
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-hi)] text-xs font-medium text-[var(--text)] shadow-md">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[var(--muted)] font-mono">ESTIMATOR ENGINE</span>
          <span className="text-[var(--muted2)]">•</span>
          <span className="font-semibold text-[var(--accent)]">Enterprise Cost Intelligence</span>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAiOpen ? 'lg:grid-cols-[1fr_400px]' : ''} gap-6 items-start transition-all duration-500`}>
        <div className="relative z-10 bg-[var(--surface)] border border-[var(--border-hi)] rounded-2xl p-6 sm:p-10 shadow-2xl">
          <header className="pb-6 border-b border-[var(--border)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--muted)]">
                <span className="font-semibold text-[var(--accent)] uppercase">Step {step} of 4</span>
                <span>•</span>
                <span className="text-[var(--text)] font-medium">
                  {step === 1 && 'Platform Archetype'}
                  {step === 2 && 'Feature Selection'}
                  {step === 3 && 'Delivery & Risk'}
                  {step === 4 && 'Estimate Breakdown'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-bold font-mono" role="status" aria-atomic="true">
                <span>ESTIMATED:</span>
                <span>
                  {estimateStatus === 'loading' ? 'Updating…' : estimateStatus === 'error' ? 'Unavailable' : `₹${lowEstimate.toLocaleString()} – ₹${highEstimate.toLocaleString()}`}
                </span>
              </div>
            </div>
              <div
                className="w-full h-1.5 bg-[var(--panel)] rounded-full overflow-hidden flex"
                role="progressbar"
                aria-label="Estimator progress"
                aria-valuemin={1}
                aria-valuemax={4}
                aria-valuenow={step}
              >
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent2)] transition-all duration-500 rounded-full"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </header>

          {estimateError && (
            <p role="alert" className="mt-4 rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
              {estimateError}
            </p>
          )}

          {/* STEP 1: Platform Selection */}
          {step === 1 && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Select your project type</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Choose the architectural foundation for your custom solution.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PROJECT_TYPES.map((p, index) => {
                  const active = projectType === p.id
                  const isLastOddItem = index === PROJECT_TYPES.length - 1 && PROJECT_TYPES.length % 2 !== 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProjectType(p.id)
                        const compatibleIds = Array.from(selectedFeatures).filter(id => FEATURE_BY_ID[id].applicableTo.includes(p.id))
                        setSelectedFeatures(new Set(compatibleIds))
                        const compatibleQuestions = new Set(compatibleIds.flatMap(id => (FEATURE_BY_ID[id].followUps ?? []).map(followUp => followUp.id)))
                        setFollowUpAnswers(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => compatibleQuestions.has(id))))
                      }}
                      aria-pressed={active}
                      className={`p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none ${
                        isLastOddItem ? 'sm:col-span-2 w-full' : ''
                      } ${active
                          ? 'bg-[var(--panel)] border-[var(--accent)] shadow-lg shadow-[var(--accent)]/15 ring-2 ring-[var(--accent)] scale-[1.01]'
                          : 'bg-[var(--panel)]/50 border-[var(--border)] hover:border-[var(--accent)]/60 hover:bg-[var(--panel)] hover:scale-[1.005]'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[var(--text)] text-base">{p.name}</h3>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${active ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--border-hi)] text-transparent'}`}>
                          ✓
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">{p.desc}</p>
                      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--muted2)]">
                        <span>Base Scope</span>
                        <span className="text-[var(--accent)] font-semibold">~{p.baseHoursRange.likely} Dev Hrs</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Feature Selection */}
          {step === 2 && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Which core features do you need?</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Select foundational modules and APIs required for your platform.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FEATURES.filter(f => projectType !== null && f.applicableTo.includes(projectType)).map(f => {
                  const active = selectedFeatures.has(f.id)
                  return (
                    <div key={f.id} className={`rounded-xl border transition-all duration-200 ${active ? 'bg-[var(--panel)] border-[var(--accent)] shadow-md ring-2 ring-[var(--accent)]' : 'bg-[var(--panel)]/50 border-[var(--border)] hover:border-[var(--accent)]/50'
                      }`}>
                      <button
                        type="button"
                        onClick={() => toggleFeature(f.id)}
                        aria-pressed={active}
                        className="w-full p-4 text-left cursor-pointer flex flex-col justify-between select-none min-h-[148px]"
                      >
                        <div className="flex items-start justify-between mb-3 w-full">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--border)] text-[var(--muted)]'}`}>
                            {f.iconSvg}
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border font-bold text-xs transition-colors ${active ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]' : 'border-[var(--border-hi)] text-transparent'}`}>
                            ✓
                          </div>
                        </div>
                        <div className="w-full">
                          <h3 className="font-semibold text-[var(--text)] text-sm mb-1">{f.name}</h3>
                          <p className="text-xs text-[var(--muted)] leading-relaxed">{f.desc}</p>
                        </div>
                        <div className="w-full mt-auto pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--muted2)]">{f.category}</span>
                          <span className="text-[var(--accent)] font-semibold">~{f.baseHoursRange.likely} Dev Hrs</span>
                        </div>
                      </button>
                      {active && f.followUps && f.followUps.length > 0 && (
                        <div className="p-4 pt-0 border-t border-[var(--border)] bg-[var(--surface)]/30 rounded-b-xl space-y-3">
                          {f.followUps.map(fu => (
                            <div key={fu.id} className="space-y-1.5 mt-2">
                              <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">{fu.question}</p>
                              <div className="flex flex-wrap gap-2">
                                {fu.options.map(opt => (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() => handleFollowUp(fu.id, opt.label)}
                                    aria-pressed={followUpAnswers[fu.id] === opt.label}
                                    className={`px-3 min-h-11 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${followUpAnswers[fu.id] === opt.label
                                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                                        : 'bg-[var(--panel)] text-[var(--text)] border-[var(--border-hi)] hover:border-[var(--accent)]/50'
                                      }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {unansweredFollowUps.length > 0 && (
                <p role="status" className="text-sm text-[var(--accent)]">Answer the highlighted feature question before continuing.</p>
              )}
            </div>
          )}

          {/* STEP 3: Delivery & Risk */}
          {step === 3 && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Delivery & Risk Preference</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Choose your target delivery pace and the uncertainty level of the current scope.</p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Delivery Velocity</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTimelineSpeed('standard')}
                    aria-pressed={timelineSpeed === 'standard'}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none ${timelineSpeed === 'standard'
                        ? 'bg-[var(--panel)] border-[var(--accent)] ring-2 ring-[var(--accent)]'
                        : 'bg-[var(--panel)]/50 border-[var(--border)] hover:border-[var(--accent)]/40'
                      }`}
                  >
                    <h4 className="font-bold text-sm text-[var(--text)] mb-1">Standard Production ({standardWeeks.low}–{standardWeeks.high} Weeks)</h4>
                    <p className="text-xs text-[var(--muted)]">Iterative weekly sprints, structured staging reviews, and standard QA.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineSpeed('expedited')}
                    aria-pressed={timelineSpeed === 'expedited'}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none ${timelineSpeed === 'expedited'
                        ? 'bg-[var(--panel)] border-[var(--accent)] ring-2 ring-[var(--accent)]'
                        : 'bg-[var(--panel)]/50 border-[var(--border)] hover:border-[var(--accent)]/40'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-[var(--text)]">Expedited Sprint ({expeditedWeeks.low}–{expeditedWeeks.high} Weeks)</h4>
                      <span className="text-[10px] bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded font-mono font-bold">+25% Priority</span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">Dedicated engineering team with parallel feature sprints for rapid deployment.</p>
                  </button>
                </div>
                {!timelineSpeed && <p role="status" className="mt-3 text-sm text-[var(--accent)]">Select a delivery velocity to continue.</p>}
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Project Risk Profile</label>
                <div className="space-y-2">
                  {[
                    { value: 'clear' as const, label: 'Clear requirements, established patterns' },
                    { value: 'standard' as const, label: 'Some undefined requirements (Standard)' },
                    { value: 'novel' as const, label: 'Novel tech or fully custom scope' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRiskProfile(opt.value)}
                      aria-pressed={riskProfile === opt.value}
                      className={`block w-full min-h-11 p-3 rounded-lg border text-left cursor-pointer transition-all text-sm font-medium ${riskProfile === opt.value
                          ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--panel)] border-[var(--border-hi)] text-[var(--text)] hover:border-[var(--accent)]/50'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{opt.label}</span>
                        {riskProfile === opt.value && <span>✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Final Summary */}
          {step === 4 && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text)] tracking-tight">Estimated Project Investment</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Here is the itemized budget & engineering estimate for your build.</p>
              </div>

              {/* Total Highlight Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--accent)]/15 via-[var(--panel)] to-[var(--surface)] border border-[var(--accent)]/30 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
                <div>
                  <span className="text-xs font-mono text-[var(--accent)] uppercase tracking-wider font-semibold">Total Estimated Budget</span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[var(--text)] mt-1 font-mono">
                    ₹{lowEstimate.toLocaleString()} – ₹{highEstimate.toLocaleString()}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1">Includes UI design, full-stack development, QA testing, and cloud setup. Hosting, domains, licenses, and recurring services are scoped separately.</p>
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {Math.round(estimate.lowEstimateHours)}–{Math.round(estimate.highEstimateHours)} engineering hours · ₹{HOURLY_RATE_INR.toLocaleString('en-IN')}/hour
                    {timelineSpeed === 'expedited' ? ' · 25% priority uplift' : ''}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {timelineSpeed === 'expedited' ? 'Expedited' : 'Standard'} delivery · {selectedWeeks.low}–{selectedWeeks.high} weeks
                  </p>
                </div>
                <div className="flex flex-col gap-3 w-full sm:w-auto" data-html2canvas-ignore="true">
                  <button
                    type="button"
                    onClick={downloadPdf}
                    disabled={isDownloadingPdf}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[var(--accent)] text-[var(--accent)] font-bold text-sm transition-all hover:bg-[var(--accent)]/10 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Estimate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--on-accent)] font-bold text-sm shadow-xl shadow-[var(--accent)]/20 transition-all transform active:scale-[0.98] cursor-pointer"
                  >
                    Request Detailed Spec Proposal →
                  </button>
                </div>
              </div>
              {pdfError && <p role="alert" className="text-sm text-[var(--error)]">{pdfError}</p>}

              {/* Detailed Breakdown Toggle */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--panel)]/40">
                <button
                  type="button"
                  onClick={() => setBreakdownOpen(!breakdownOpen)}
                  aria-expanded={breakdownOpen}
                  aria-controls="estimate-calculation-breakdown"
                  className="w-full px-5 py-4 flex items-center justify-between text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                >
                  <span>View Detailed Calculation Breakdown</span>
                  <span className={`transform transition-transform ${breakdownOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {breakdownOpen && (
                  <div id="estimate-calculation-breakdown" className="divide-y divide-[var(--border)] border-t border-[var(--border)] bg-[var(--surface)]">
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Raw Feature Hours (PERT)</span>
                      <span className="text-[var(--text)]">{estimate.rawFeatureTotal.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Integration Surcharge</span>
                      <span className="text-[var(--text)]">{estimate.surcharge.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Setup Overhead</span>
                      <span className="text-[var(--text)]">{estimate.setupOverhead.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">QA Overhead (15%)</span>
                      <span className="text-[var(--text)]">{estimate.qaOverhead.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">PM Overhead (10%)</span>
                      <span className="text-[var(--text)]">{estimate.pmOverhead.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-sm font-bold bg-[var(--panel)]">
                      <span className="text-[var(--text)]">Base Subtotal</span>
                      <span className="text-[var(--accent)] font-mono">{estimate.subtotal.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Risk Multiplier</span>
                      <span className="text-[var(--text)]">{riskMultiplier.toFixed(1)}x</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Timeline Multiplier</span>
                      <span className="text-[var(--text)]">{timelineMult.toFixed(2)}x</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Planning Range</span>
                      <span className="text-[var(--text)]">{estimate.lowEstimateHours.toFixed(1)}–{estimate.highEstimateHours.toFixed(1)} hrs</span>
                    </div>
                    <div className="px-5 py-3 flex justify-between text-xs font-mono">
                      <span className="text-[var(--muted)]">Hourly Rate</span>
                      <span className="text-[var(--text)]">₹{HOURLY_RATE_INR.toLocaleString('en-IN')}/hr</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scope Table */}
              <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--panel)]/40 mt-6">
                <div className="px-5 py-3 bg-[var(--panel)] border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)] flex justify-between">
                  <span>Scope Module</span>
                  <span>Est. Allocation</span>
                </div>
                <div className="divide-y divide-[var(--border)] text-xs font-mono text-[var(--text)]">
                  {selectedProject ? (
                    <div className="px-5 py-3 flex justify-between">
                      <span>Archetype: {selectedProject.name}</span>
                      <span className="text-[var(--accent)]">~{selectedProject.baseHoursRange.likely} Hrs</span>
                    </div>
                  ) : (
                    <div className="px-5 py-3 flex justify-between">
                      <span>Archetype: None selected</span>
                      <span className="text-[var(--accent)]">~0 Hrs</span>
                    </div>
                  )}
                  {activeFeatureOptions.map(feature => (
                      <div key={feature.id} className="px-5 py-3 flex justify-between">
                        <span>Feature: {feature.name}</span>
                        <span className="text-[var(--accent)]">~{feature.baseHoursRange.likely} Hrs</span>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation Controls */}
          <footer className="mt-10 pt-6 border-t border-[var(--border)] flex items-center justify-between" data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={() => {
                setStep(prev => Math.max(1, prev - 1))
                scrollToSection()
              }}
              disabled={step === 1}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${step === 1
                  ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--muted2)]'
                  : 'border-[var(--border-hi)] text-[var(--text)] hover:bg-[var(--panel)]'
                }`}
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              {step < 4 ? (
                <button
                  type="button"
                  disabled={(step === 1 && !projectType) || (step === 2 && unansweredFollowUps.length > 0) || (step === 3 && (!timelineSpeed || estimateStatus !== 'ready'))}
                  onClick={() => {
                    setStep(prev => Math.min(4, prev + 1))
                    scrollToSection()
                  }}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all cursor-pointer ${(step === 1 && !projectType) || (step === 2 && unansweredFollowUps.length > 0) || (step === 3 && (!timelineSpeed || estimateStatus !== 'ready'))
                      ? 'bg-[var(--panel)] text-[var(--muted)] shadow-none border border-[var(--border)] cursor-not-allowed'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--on-accent)] shadow-[var(--accent)]/20'
                    }`}
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  disabled={estimateStatus !== 'ready'}
                  className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--on-accent)] font-semibold text-sm shadow-lg shadow-[var(--accent)]/20 transition-all cursor-pointer"
                >
                  Submit Specification →
                </button>
              )}
            </div>
          </footer>
        </div>

        {/* AI Column — Persistent & Responsive */}
        {isAiOpen && (
          <div className="w-full mt-8 lg:mt-0 lg:sticky top-24 z-10 block animate-in fade-in duration-500 lg:slide-in-from-right-8 slide-in-from-bottom-8">
            <AISpecChat
              projectContext={aiProjectContext}
              onSpecsUpdate={(refined) => setAiSpecs(refined)}
              onFeatureSync={handleFeatureSync}
              onProceed={() => {
                if (!projectType) setStep(1)
                else if (unansweredFollowUps.length > 0) setStep(2)
                else if (!timelineSpeed || estimateStatus !== 'ready') setStep(3)
                else setStep(4)
                scrollToSection()
              }}
              onClose={() => setIsAiOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Floating AI Trigger when closed */}
      {!isAiOpen && isSectionVisible && (
        <button
          type="button"
          onClick={() => setIsAiOpen(true)}
          aria-label="Refine estimate with AI"
          data-html2canvas-ignore="true"
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 bg-[var(--surface)] border border-[var(--border-hi)] hover:border-[var(--accent)] text-[var(--text)] rounded-full shadow-2xl hover:scale-105 transition-all cursor-pointer group"
        >
          <span className="w-8 h-8 rounded-full bg-[var(--accent)]/15 group-hover:bg-[var(--accent)] text-[var(--accent)] group-hover:text-[var(--on-accent)] flex items-center justify-center transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="hidden sm:block text-sm font-semibold pr-1">Refine with AI</span>
        </button>
      )}

      {/* Query Modal pre-filled with scope summary */}
      <QueryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialMessage={fullScopeBrief}
      />
    </section>
  )
}
