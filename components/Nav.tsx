'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'

const NAV_LINKS = [
  { label: 'Home',     id: 'hero'     },
  { label: 'About',    id: 'about'    },
  { label: 'Services', id: 'services' },
  { label: 'Process',  id: 'process'  },
  { label: 'Results',  id: 'stats'    },
  { label: 'Solution Planner',  id: 'pricing'  },
]

export default function Nav() {
  const router   = useRouter()
  const pathname = usePathname()
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    // Route-based links: use Next.js router for instant client-side navigation (no flash)
    if (id.startsWith('/')) {
      router.push(id)
      return
    }
    // On /pricing (or any non-home page), section links should navigate home first
    if (pathname !== '/') {
      router.push('/#' + id)
      return
    }
    // On home page: smooth scroll to section
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <nav
        id="nav"
        style={{
          position:         'fixed',
          top: 0, left: 0, right: 0,
          zIndex:           500,
          padding:          '16px clamp(16px,4vw,40px)',
          display:          'flex',
          alignItems:       'center',
          justifyContent:   'space-between',
          transition:       'all 0.4s ease',
          background:       scrolled ? 'var(--bg)' : 'transparent',
          borderBottom:     scrolled ? '1px solid var(--border)' : 'none',
          backdropFilter:   'none',
          WebkitBackdropFilter: 'none',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          aria-label="Exter Cloud — Home"
          style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Image src="/logo-lockup-ondark.png" alt="" width={1330} height={882} priority className="show-on-dark" style={{ height: 44, width: 'auto' }} />
          <Image src="/logo-lockup-onlight.png" alt="" width={1330} height={882} priority className="show-on-light" style={{ height: 44, width: 'auto' }} />
        </button>

        {/* Desktop links */}
        <ul style={{ gap: 28, listStyle: 'none', alignItems: 'center', margin: 0, padding: 0 }}
            className="hidden md:flex">
          {NAV_LINKS.map(({ label, id }) => (
            <li key={id}>
              <button
                onClick={() => scrollTo(id)}
                style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em', padding: 0, fontFamily: 'var(--font)', transition: 'color 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
              >
                {label}
              </button>
            </li>
          ))}
          <li>
            <button
              onClick={() => scrollTo('cta')}
              style={{ padding: '8px 20px', border: '1px solid var(--border-hi)', borderRadius: 4, color: 'var(--accent)', fontSize: 12, background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: '0.05em', transition: 'background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(216,90,48,0.07)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              Get started
            </button>
          </li>
        </ul>

        {/* Right cluster: theme toggle (always visible) + hamburger (mobile only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ThemeToggle />

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            className="flex md:hidden flex-col gap-1.5 items-center justify-center relative w-8 h-8"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: '-4px' }}
          >
            {mobileOpen ? (
              <span style={{ fontSize: 28, color: 'var(--text)', lineHeight: 1 }}>✕</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                {[0,1,2].map(i => (
                  <span key={i} style={{ display: 'block', width: 22, height: 1.5, background: 'var(--text)', borderRadius: 1 }} />
                ))}
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 490, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}
        >
          {NAV_LINKS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ fontFamily: 'var(--font)', fontSize: 28, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.03em', transition: 'color 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => scrollTo('cta')}
            style={{ marginTop: 16, padding: '14px 32px', border: '1px solid var(--accent)', borderRadius: 8, color: 'var(--accent)', fontSize: 20, background: 'rgba(216,90,48,0.05)', cursor: 'pointer', fontFamily: 'var(--font)', letterSpacing: '0.05em' }}
          >
            Get started
          </button>
        </div>
      )}
    </>
  )
}
