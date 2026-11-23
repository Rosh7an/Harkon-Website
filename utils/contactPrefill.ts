// Helps visitors get in touch with less typing: the contact form opens with a
// message started from whatever they were looking at, and the "What do you
// need?" options tick themselves from the words they use.
import { ALL_SERVICES, PROBLEMS, PROJECTS } from './siteContent'

export const INTERESTS = ['Website', 'Google search (SEO)', 'Social media', 'Ads', 'More enquiries', 'CRM', 'WhatsApp', 'Bookings', 'Business software', 'Online courses', 'Mobile app', 'Custom software', 'Not sure yet'] as const
export type Interest = (typeof INTERESTS)[number]

const SERVICE_INTEREST: Record<string, Interest> = {
  'websites': 'Website',
  'seo': 'Google search (SEO)',
  'social-media': 'Social media',
  'ads': 'Ads',
  'lead-generation': 'More enquiries',
  'crm': 'CRM',
  'whatsapp': 'WhatsApp',
  'booking': 'Bookings',
  'management-software': 'Business software',
  'lms': 'Online courses',
  'mobile-apps': 'Mobile app',
  'custom-software': 'Custom software',
}

// Everyday words people use for each need. Word boundaries keep "app" from
// matching "appointment" and "book" from matching "Facebook".
const KEYWORDS: [Interest, RegExp][] = [
  ['Website', /\b(website|web ?site|webpage|landing page|online presence|site)\b/i],
  ['Google search (SEO)', /\b(google|seo|search|rank(ing)?|near me|found online)\b/i],
  ['Social media', /\b(instagram|facebook|social media|social|reels?|posts?)\b/i],
  ['Ads', /\b(ads?|advert\w*|campaigns?|promot\w*|marketing)\b/i],
  ['More enquiries', /\b(enquir\w*|inquir\w*|leads?|more customers|new customers|not enough customers|footfall|sales are (low|down))\b/i],
  ['CRM', /\b(crm|follow[ -]?ups?|forget\w*|forgot|track (of )?(customers|leads)|customer list|lost leads|missed (calls|leads))\b/i],
  ['WhatsApp', /\b(whatsapp|replies|reply|chat)\b/i],
  ['Bookings', /\b(bookings?|book|appointments?|slots?|reservations?|schedul\w*|tables?)\b/i],
  ['Business software', /\b(stock|inventory|billing|bills?|invoic\w*|staff|paperwork|registers?|accounts|manual work|excel|spreadsheets?)\b/i],
  ['Online courses', /\b(courses?|classes|teach\w*|students?|training|lms|tuition|coaching)\b/i],
  ['Mobile app', /\b(apps?|mobile app|android|iphone|ios|play store|app store)\b/i],
  ['Custom software', /\b(custom|payment gateway|loyalty|delivery tracking|integrat\w*|api)\b/i],
]

/** Needs mentioned in free text, in the order the form lists them. */
export function detectInterests(text: string): Interest[] {
  const found = new Set(KEYWORDS.filter(([, pattern]) => pattern.test(text)).map(([interest]) => interest))
  return INTERESTS.filter(interest => found.has(interest))
}

/**
 * What the form should show: the visitor's own ticks, plus anything their
 * message mentions, minus anything they unticked themselves.
 */
export function mergeInterests(chosen: readonly string[], removed: readonly string[], detected: readonly string[]): Interest[] {
  const on = new Set([...chosen, ...detected.filter(item => !removed.includes(item))])
  return INTERESTS.filter(interest => on.has(interest))
}

/** One-tap ways to start the message, in a customer's own words. */
export const STARTERS = [
  { label: 'I need more customers', text: 'We need more customers. People can’t find us easily on Google or social media.' },
  { label: 'We keep missing enquiries', text: 'We get enquiries on calls, WhatsApp and Instagram, but we miss or forget to follow up on many of them.' },
  { label: 'Too much paperwork', text: 'We still manage stock, billing and staff on paper and spreadsheets. It takes too much time.' },
  { label: 'Customers want to book online', text: 'Our customers want to book appointments online and get reminders, instead of calling us.' },
  { label: 'I want an app', text: 'We want a mobile app so our regular customers can order or book in one tap.' },
]

export interface Prefill { message: string; interests: Interest[]; context: string | null }

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ''

/**
 * Starts the contact form from where the visitor came from:
 * ?service=crm, ?project=hospital-portal or ?problem=lost-leads.
 * Unknown or missing values give an empty form.
 */
export function prefillFromQuery(params: Record<string, string | string[] | undefined>): Prefill {
  const service = ALL_SERVICES.find(item => item.slug === one(params.service))
  if (service) {
    return { message: `Hi, I’d like to know more about ${service.name.toLowerCase()} (${service.tag}). About my business: `, interests: [SERVICE_INTEREST[service.slug]], context: service.name }
  }
  const project = PROJECTS.find(item => item.slug === one(params.project))
  if (project) {
    return { message: `Hi, I’d like something like your ${project.title.toLowerCase()}. About my business: `, interests: detectInterests(`${project.title} ${project.built.join(' ')}`), context: project.title }
  }
  const problem = PROBLEMS.find(item => item.id === one(params.problem))
  if (problem) {
    const interests = problem.build.map(name => ALL_SERVICES.find(item => item.name === name)).filter(Boolean).map(item => SERVICE_INTEREST[item!.slug])
    return { message: `Hi, our main problem is: ${problem.label.toLowerCase()}. About my business: `, interests: INTERESTS.filter(i => interests.includes(i)), context: problem.label }
  }
  return { message: '', interests: [], context: null }
}
