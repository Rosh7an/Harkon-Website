// Public business details shown in the footer and legal pages. Edit them here.
// Empty values are hidden, so a missing link or address never shows a
// placeholder. Email, phone and WhatsApp come from environment variables
// (see .env.example), like the rest of the site.
/** The site's one public address. Page links, sharing previews and Google data are built from it. */
export const SITE_URL = 'https://www.extercloud.in'

export const SITE_PROFILE = {
  name: 'Exter Cloud',
  description: 'Websites, booking systems, management tools and mobile apps that help growing businesses run smoothly.',
  // One entry per line, e.g. ['Building name, Street', 'City, State PIN', 'India'].
  address: [] as string[],
  // City whose courts handle disputes under the Terms of Use, e.g. 'Kochi, Kerala'.
  jurisdiction: '',
  socials: {
    instagram: '',
    linkedin: '',
  },
} as const

export type SocialNetwork = keyof typeof SITE_PROFILE.socials
const SOCIAL_HOSTS: Record<SocialNetwork, string> = { instagram: 'instagram.com', linkedin: 'linkedin.com' }

/**
 * An https link on the network's own domain, or null. Guards against typos
 * and unsafe schemes such as javascript: in hand-edited settings.
 */
export function socialUrl(network: SocialNetwork, value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (url.protocol === 'http:') url.protocol = 'https:'
    const host = url.hostname.toLowerCase()
    const expected = SOCIAL_HOSTS[network]
    if (url.protocol !== 'https:' || (host !== expected && !host.endsWith(`.${expected}`)) || url.pathname === '/') return null
    return url.toString()
  } catch {
    return null
  }
}

export function contactEmail(value: string | undefined): string | null {
  const email = value?.trim()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/@example\.(com|org|net)$/i.test(email) ? email : null
}

/** "+91 98765 43210" for Indian mobiles, otherwise "+<digits>". Expects digits only. */
export function displayPhone(digits: string): string {
  return /^91\d{10}$/.test(digits) ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`
}
