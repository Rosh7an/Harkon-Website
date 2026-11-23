import { SITE_URL } from './siteProfile'

/**
 * Written content for the free cost estimator page. Shown below the tool and
 * repeated as structured data, so Google and AI search can read and quote it.
 * Every statement here matches how the estimator actually works
 * (utils/solutionCatalog.ts, components/SolutionDiscovery.tsx); keep the two
 * in step. No fixed prices: the tool calculates them from each visitor's answers.
 */

export const ESTIMATOR_URL = `${SITE_URL}/cost-estimator`
export const ESTIMATOR_NAME = 'Exter Cloud Cost Estimator'
export const ESTIMATOR_DESCRIPTION = 'Free cost estimator for websites, web apps, mobile apps and AI automation. Answer a few questions in plain words and get a price range and timeline in minutes. No sign-up.'

/** What makes a project cost more or less. Mirrors the inputs the estimator prices. */
export const COST_FACTORS = [
  {
    title: 'Where people use it',
    text: 'A public website is the simplest. A customer or staff portal, an admin console or a mobile app for iOS and Android each add their own work, and a mobile app adds the most.',
  },
  {
    title: 'What it needs to do',
    text: 'Bookings, online payments, customer accounts, reports, a CRM for your leads or an AI assistant for one of your workflows. Each feature is priced on its own, so you see what it adds.',
  },
  {
    title: 'What it connects to',
    text: 'Linking WhatsApp, an existing CRM such as HubSpot, Salesforce or Zoho, or another system you already use takes extra work, and more connections make the build more involved.',
  },
  {
    title: 'How clear the plan is',
    text: 'A well-understood idea costs less to build than something new and uncertain. The estimator lets you say how settled your plan is and widens the range when it is not.',
  },
  {
    title: 'How soon you need it',
    text: 'Standard planning is the default. Priority planning puts your project first and adds 25% to the build cost.',
  },
] as const

/** Steps the visitor goes through, in order. */
export const ESTIMATOR_STEPS = [
  { title: 'Tell us about your business', text: 'Let us guide you with a few plain questions, or pick what you need yourself. No technical knowledge needed.' },
  { title: 'Check your plan', text: 'Review what we understood, change any answer and choose the features you want.' },
  { title: 'Get your estimate', text: 'See a price range and a timeline in weeks. Download it as a PDF, or send it to us if you would like to talk.' },
] as const

export const ESTIMATOR_FAQS = [
  {
    q: 'Is the cost estimator really free?',
    a: 'Yes. There is no sign-up and no payment. You see your estimate on screen and can download it as a PDF.',
  },
  {
    q: 'Do I have to share my contact details?',
    a: 'No. Your estimate is yours to keep. At the end you can choose to send it to us with your name, email and phone number if you would like us to get in touch. That step is optional.',
  },
  {
    q: 'What can it estimate?',
    a: 'Websites, customer and staff portals, admin consoles and mobile apps, along with features such as bookings, payments, user accounts, reports, CRMs, AI workflow assistance and connections to WhatsApp or the tools you already use.',
  },
  {
    q: 'How accurate is the estimate?',
    a: 'It is an indicative range worked out from your answers, not a final quote. The final price is set after we review the scope with you, and it can change if the requirements change.',
  },
  {
    q: 'Does the estimate include hosting and running costs?',
    a: 'No. It covers the build. Hosting, domains, software licences, messaging charges, AI usage, maintenance, ongoing SEO or marketing, and taxes are separate.',
  },
  {
    q: 'Do I need technical knowledge to use it?',
    a: 'No. Start with what is slowing your business down and answer in your own words. The estimator works out what to build from that.',
  },
  {
    q: 'What happens if I send my estimate to Exter Cloud?',
    a: 'We get your answers and the estimate, look through them and reply by email or WhatsApp with next steps.',
  },
] as const

/** Structured data for the page: the tool itself, and the FAQ shown below it. */
export function estimatorJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: ESTIMATOR_NAME,
      url: ESTIMATOR_URL,
      description: ESTIMATOR_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@type': 'Organization', name: 'Exter Cloud', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ESTIMATOR_FAQS.map(faq => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
  ]
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so no value can close the tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
