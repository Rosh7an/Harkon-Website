import Image from 'next/image'
import Link from 'next/link'
import styles from './Footer.module.css'
import { businessContactLinks } from '@/utils/businessContact'
import { SITE_PROFILE, contactEmail, displayPhone, socialUrl } from '@/utils/siteProfile'
import { ALL_SERVICES } from '@/utils/siteContent'

const COMPANY_LINKS = [
  { label: 'About us', href: '/about' },
  { label: 'Our work', href: '/work' },
  { label: 'How we work', href: '/#how-we-work' },
  { label: 'Contact', href: '/contact' },
]
const GROW = ALL_SERVICES.slice(0, 6)
const RUN = ALL_SERVICES.slice(6)

function Icon({ name }: { name: 'instagram' | 'linkedin' | 'whatsapp' | 'mail' | 'phone' | 'pin' }) {
  const paths = {
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7.5 10.5v6M7.5 7.5v.01M11 16.5v-6M11 13c0-1.6 1-2.5 2.3-2.5s2.2.9 2.2 2.5v3.5" /></>,
    whatsapp: <><path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" /><path d="M8.8 8.4c.5 3.2 1.9 4.6 5.1 5.1l1-1.3-1.7-.8-.8.8c-1.1-.5-1.7-1.1-2.2-2.2l.8-.8-.8-1.7-1.4.9Z" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <path d="M8 3.5 10.5 8 8.8 9.7a12 12 0 0 0 5.5 5.5l1.7-1.7 4.5 2.5c0 2.6-1.9 4.5-4.3 4.5C9.6 20.5 3.5 14.4 3.5 7.8 3.5 5.4 5.4 3.5 8 3.5Z" />,
    pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  }
  return <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

/** `showCta={false}` drops the "Start a project" band, for the page where the visitor is already starting one. */
export default function Footer({ showCta = true }: { showCta?: boolean } = {}) {
  const email = contactEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL)
  const { call, whatsapp } = businessContactLinks({ phone: process.env.CONTACT_PHONE || undefined, whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })
  const instagram = socialUrl('instagram', SITE_PROFILE.socials.instagram)
  const linkedin = socialUrl('linkedin', SITE_PROFILE.socials.linkedin)
  const socials = [
    instagram && { label: `${SITE_PROFILE.name} on Instagram`, href: instagram, icon: 'instagram' as const },
    linkedin && { label: `${SITE_PROFILE.name} on LinkedIn`, href: linkedin, icon: 'linkedin' as const },
    whatsapp && { label: `Chat with ${SITE_PROFILE.name} on WhatsApp`, href: whatsapp, icon: 'whatsapp' as const },
  ].filter((item): item is { label: string; href: string; icon: 'instagram' | 'linkedin' | 'whatsapp' } => !!item)
  const address = SITE_PROFILE.address.filter(line => line.trim())
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer} aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Site footer</h2>
      <div className={styles.inner}>
        {showCta && (
          <div className={styles.top}>
            <div>
              <p className={styles.topTitle}>Have a project in <em>mind?</em></p>
              <p className={styles.topText}>Tell us what your business needs. The first consultation is free.</p>
            </div>
            <div className={styles.topActions}>
              <Link href="/cost-estimator" className={styles.primary}>Start a project</Link>
              {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.secondary}><Icon name="whatsapp" />WhatsApp</a>}
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <section className={styles.brand} aria-label={SITE_PROFILE.name}>
            <Link href="/" className={styles.logo} aria-label={`${SITE_PROFILE.name} home`}>
              <Image src="/logo-lockup-ondark.png" alt="" width={150} height={100} />
            </Link>
            <p className={styles.description}>{SITE_PROFILE.description}</p>
            {socials.length > 0 && <ul className={styles.socials} aria-label="Social and messaging">
              {socials.map(social => <li key={social.icon}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={social.label} className={styles.social}><Icon name={social.icon} /></a>
              </li>)}
            </ul>}
          </section>

          <nav aria-labelledby="footer-grow" className={`${styles.column} ${styles.serviceCol}`}>
            <h3 id="footer-grow" className={styles.heading}>Grow your business</h3>
            <ul className={styles.list}>
              {GROW.map(service => <li key={service.slug}><Link href={service.href ?? `/services#${service.slug}`} className={styles.link}>{service.name}</Link></li>)}
            </ul>
          </nav>

          <nav aria-labelledby="footer-run" className={`${styles.column} ${styles.serviceCol}`}>
            <h3 id="footer-run" className={styles.heading}>Run your business</h3>
            <ul className={styles.list}>
              {RUN.map(service => <li key={service.slug}><Link href={service.href ?? `/services#${service.slug}`} className={styles.link}>{service.name}</Link></li>)}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company" className={styles.column}>
            <h3 id="footer-company" className={styles.heading}>Company</h3>
            <ul className={styles.list}>
              {COMPANY_LINKS.map(link => <li key={link.href}><Link href={link.href} className={styles.link}>{link.label}</Link></li>)}
            </ul>
            <h3 id="footer-tools" className={styles.heading} style={{ marginTop: 24 }}>Free tools</h3>
            <ul className={styles.list} aria-labelledby="footer-tools">
              <li><Link href="/cost-estimator" className={styles.link}>Free cost estimator</Link></li>
            </ul>
          </nav>

          <section aria-labelledby="footer-contact" className={styles.column}>
            <h3 id="footer-contact" className={styles.heading}>Get in touch</h3>
            <ul className={styles.list}>
              {email && <li><a href={`mailto:${email}`} className={styles.contact}><Icon name="mail" /><span>{email.split('@')[0]}@<wbr />{email.split('@')[1]}</span></a></li>}
              {call && <li><a href={call} className={styles.contact}><Icon name="phone" /><span>{displayPhone(call.replace('tel:+', ''))}</span></a></li>}
              {whatsapp && <li><a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.contact}><Icon name="whatsapp" /><span>Chat on WhatsApp</span></a></li>}
              {address.length > 0 && <li><address className={styles.contact}><Icon name="pin" /><span>{address.map((line, index) => <span key={index} className={styles.addressLine}>{line}</span>)}</span></address></li>}
              {!email && !call && !whatsapp && <li><Link href="/contact" className={styles.link}>Send us a query</Link></li>}
            </ul>
          </section>
        </div>

        <div className={styles.bottom}>
          <p>© {year} {SITE_PROFILE.name}. All rights reserved.</p>
          <nav aria-label="Legal" className={styles.legal}>
            <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
            <Link href="/terms" className={styles.link}>Terms of Use</Link>
            <span>Made in India</span>
          </nav>
        </div>
      </div>
      <div className={styles.wordmark} aria-hidden="true"><span>Exter Cloud</span></div>
    </footer>
  )
}
