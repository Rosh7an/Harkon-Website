'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import { businessContactLinks } from '@/utils/businessContact'
import styles from './Nav.module.css'

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

/** True when `pathname` is `href` or a page inside it, e.g. /services/booking under /services. */
export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

const TAB_ICONS = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  services: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  work: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M9 6V4h6v2" /></>,
  about: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5" /></>,
}

function TabIcon({ name }: { name: keyof typeof TAB_ICONS }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{TAB_ICONS[name]}</svg>
}

export default function Nav() {
  const pathname = usePathname() || '/'
  const [scrolled, setScrolled] = useState(false)
  // On the estimator the visitor is already starting a project, so no second button for it.
  const onEstimator = isActive(pathname, '/cost-estimator')
  const { whatsapp } = businessContactLinks({ whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_PHONE })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const tab = (href: string, label: string, icon: keyof typeof TAB_ICONS) => {
    const active = href === '/' ? pathname === '/' : isActive(pathname, href)
    return (
      <Link href={href} className={active ? styles.tabActive : styles.tab} aria-current={active ? 'page' : undefined}>
        <TabIcon name={icon} />{label}
      </Link>
    )
  }

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.bar}>
          <Link href="/" className={styles.logo} aria-label="Exter Cloud home">
            <Image src="/logo-icon-ondark.png" alt="" width={300} height={300} priority className="show-on-dark" />
            <Image src="/logo-icon-onlight.png" alt="" width={300} height={300} priority className="show-on-light" />
            <span className={styles.wordmark}>Exter Cloud</span>
          </Link>

          <nav aria-label="Main navigation">
            <ul className={styles.links}>
              {NAV_LINKS.map(link => {
                const active = isActive(pathname, link.href)
                return <li key={link.href}><Link href={link.href} className={active ? styles.linkActive : styles.link} aria-current={active ? 'page' : undefined}>{link.label}</Link></li>
              })}
            </ul>
          </nav>

          <div className={styles.right}>
            <ThemeToggle className={styles.iconBtn} />
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={styles.whatsapp} aria-label="Chat on WhatsApp">
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" /></svg>
              </a>
            )}
            {!onEstimator && <Link href="/cost-estimator" className={styles.cta}>Start a project</Link>}
          </div>
        </div>
      </header>

      <nav aria-label="App navigation" className={styles.tabs}>
        {tab('/', 'Home', 'home')}
        {tab('/services', 'Services', 'services')}
        <Link href="/cost-estimator" className={styles.tabMain} aria-current={onEstimator ? 'page' : undefined}>
          <span className={styles.tabMainIcon}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
          Start
        </Link>
        {tab('/work', 'Work', 'work')}
        {tab('/about', 'About', 'about')}
      </nav>
    </>
  )
}

/** Put at the end of a page so the phone tab bar never covers content. */
export function TabBarSpacer() {
  return <div className={styles.tabSpacer} aria-hidden="true" />
}
