import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const profile = vi.hoisted(() => ({ address: [] as string[], jurisdiction: '', socials: { instagram: '', linkedin: '' } }))
vi.mock('next/image', () => ({ default: (props: ComponentProps<'img'>) => <img {...props} /> }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }))
vi.mock('../utils/siteProfile', async original => {
  const actual = await original<typeof import('../utils/siteProfile')>()
  return { ...actual, SITE_PROFILE: { ...actual.SITE_PROFILE, get address() { return profile.address }, get jurisdiction() { return profile.jurisdiction }, get socials() { return profile.socials } } }
})
import Footer from '../components/Footer'
import PrivacyPage from '../app/privacy/page'
import TermsPage from '../app/terms/page'
import { contactEmail, displayPhone, socialUrl } from '../utils/siteProfile'

const render = (element: React.ReactElement) => new DOMParser().parseFromString(renderToStaticMarkup(element), 'text/html')
const configure = (env: Record<string, string>) => { for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value) }
afterEach(() => {
  vi.unstubAllEnvs()
  Object.assign(profile, { address: [], jurisdiction: '', socials: { instagram: '', linkedin: '' } })
})

describe('site profile helpers', () => {
  it('accepts profile links with or without https and upgrades http', () => {
    expect(socialUrl('instagram', 'instagram.com/extercloud')).toBe('https://instagram.com/extercloud')
    expect(socialUrl('instagram', 'https://www.instagram.com/extercloud/')).toBe('https://www.instagram.com/extercloud/')
    expect(socialUrl('linkedin', 'http://www.linkedin.com/company/exter-cloud')).toBe('https://www.linkedin.com/company/exter-cloud')
  })
  it('rejects empty, wrong-site, look-alike, unsafe and bare-domain links', () => {
    for (const value of ['', '   ', undefined]) expect(socialUrl('instagram', value)).toBeNull()
    expect(socialUrl('instagram', 'https://linkedin.com/in/someone')).toBeNull()
    expect(socialUrl('instagram', 'https://instagram.com.evil.example/x')).toBeNull()
    expect(socialUrl('instagram', 'https://notinstagram.com/x')).toBeNull()
    expect(socialUrl('instagram', 'javascript:alert(1)')).toBeNull()
    expect(socialUrl('instagram', 'https://instagram.com/')).toBeNull()
  })
  it('only shows a real contact email', () => {
    expect(contactEmail(' team@extercloud.in ')).toBe('team@extercloud.in')
    expect(contactEmail('it@example.com')).toBeNull()
    expect(contactEmail('not-an-email')).toBeNull()
    expect(contactEmail(undefined)).toBeNull()
  })
  it('formats Indian mobiles and leaves other numbers readable', () => {
    expect(displayPhone('919876543210')).toBe('+91 98765 43210')
    expect(displayPhone('14155550100')).toBe('+14155550100')
  })
})

describe('Footer', () => {
  it('leaves out the Start a project band where the visitor is already starting one', () => {
    expect(render(<Footer />).body.textContent).toContain('Start a project')
    const doc = render(<Footer showCta={false} />)
    expect(doc.body.textContent).not.toContain('Start a project')
    expect(doc.body.textContent).not.toContain('Have a project in')
    // The rest of the footer, including the plain estimator link, stays.
    expect(doc.querySelector('a[href="/cost-estimator"]')!.textContent).toBe('Free cost estimator')
  })
  it('shows company, services, contact, social and legal links when configured', () => {
    configure({ NEXT_PUBLIC_CONTACT_EMAIL: 'hello@extercloud.in', NEXT_PUBLIC_WHATSAPP_PHONE: '+91 98765 43210', CONTACT_PHONE: '' })
    profile.socials = { instagram: 'instagram.com/extercloud', linkedin: 'linkedin.com/company/exter-cloud' }
    profile.address = ['2nd Floor, Example Building', 'Kochi, Kerala 682001', 'India']
    const doc = render(<Footer />)
    const hrefs = [...doc.querySelectorAll('a')].map(link => link.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/', '/about', '/work', '/#how-we-work', '/cost-estimator', '/contact', '/services#crm', '/services/booking', '/privacy', '/terms', 'mailto:hello@extercloud.in', 'tel:+919876543210']))
    const instagram = doc.querySelector<HTMLAnchorElement>('a[aria-label="Exter Cloud on Instagram"]')!
    expect(instagram.getAttribute('href')).toBe('https://instagram.com/extercloud')
    expect(instagram.getAttribute('target')).toBe('_blank')
    expect(instagram.getAttribute('rel')).toBe('noopener noreferrer')
    expect(doc.querySelector('a[aria-label="Exter Cloud on LinkedIn"]')).not.toBeNull()
    expect(doc.querySelector('a[aria-label="Chat with Exter Cloud on WhatsApp"]')!.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/)
    expect(doc.body.textContent).toContain('+91 98765 43210')
    expect(doc.querySelector('address')!.textContent).toContain('Kochi, Kerala 682001')
    expect(doc.body.textContent).toContain(`© ${new Date().getFullYear()} Exter Cloud`)
    expect(doc.querySelectorAll('footer nav')).toHaveLength(4)
  })

  it('hides anything not configured and still offers a way to get in touch', () => {
    configure({ NEXT_PUBLIC_CONTACT_EMAIL: 'it@example.com', NEXT_PUBLIC_WHATSAPP_PHONE: '', CONTACT_PHONE: '' })
    const doc = render(<Footer />)
    expect(doc.querySelector('[aria-label="Social and messaging"]')).toBeNull()
    expect(doc.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(doc.querySelector('a[href^="tel:"]')).toBeNull()
    expect(doc.querySelector('address')).toBeNull()
    expect(doc.body.textContent).toContain('Send us a query')
    expect(doc.body.innerHTML).not.toMatch(/undefined|null/)
  })

  it('never renders an unsafe or wrong-site social link', () => {
    configure({ NEXT_PUBLIC_WHATSAPP_PHONE: '' })
    profile.socials = { instagram: 'javascript:alert(1)', linkedin: 'https://evil.example/linkedin.com' }
    const doc = render(<Footer />)
    expect(doc.querySelector('[aria-label="Social and messaging"]')).toBeNull()
    expect(doc.body.innerHTML).not.toContain('javascript:')
  })

  it('only links to pages that exist', () => {
    const doc = render(<Footer />)
    const paths = [...doc.querySelectorAll('a')].map(link => link.getAttribute('href')!).filter(href => href.startsWith('/')).map(href => href.split('#')[0])
    for (const path of new Set(paths)) expect(existsSync(`app${path === '/' ? '' : path}/page.tsx`), path).toBe(true)
  })
})

describe('legal pages', () => {
  it('privacy policy names the real data flows and has no cookie or analytics claims to contradict', () => {
    configure({ NEXT_PUBLIC_CONTACT_EMAIL: 'hello@extercloud.in' })
    const text = render(<PrivacyPage />).body.textContent!
    for (const phrase of ['Resend', 'Groq', 'We do not set cookies', '24 hours', 'about 10 minutes', 'Digital Personal Data Protection Act', 'hello@extercloud.in']) expect(text).toContain(phrase)
  })
  it('falls back to the contact page when no email is configured', () => {
    configure({ NEXT_PUBLIC_CONTACT_EMAIL: '' })
    const doc = render(<PrivacyPage />)
    expect(doc.querySelector('a[href="/contact"]')).not.toBeNull()
    expect(doc.querySelector('a[href^="mailto:"]')).toBeNull()
  })
  it('terms state that estimates are not quotations and only name a court city when set', () => {
    const without = render(<TermsPage />).body.textContent!
    expect(without).toContain('is not a quotation')
    expect(without).toContain('governed by the laws of India.')
    expect(without).not.toContain('courts in')
    profile.jurisdiction = 'Kochi, Kerala'
    expect(render(<TermsPage />).body.textContent).toContain('The courts in Kochi, Kerala have jurisdiction')
  })
})
