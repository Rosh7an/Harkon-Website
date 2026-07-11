'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'

const NAV_LINKS = [
  { label: 'Home',     id: 'hero'     },
  { label: 'About',    id: 'about'    },
  { label: 'Services', id: 'services' },
  { label: 'Process',  id: 'process'  },
  { label: 'Results',  id: 'stats'    },
]

export default function Nav() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.location.href = '/#' + id
    }
    setMobileOpen(false)
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
          background:       scrolled ? 'rgba(var(--bg-rgb),0.92)' : 'transparent',
          borderBottom:     scrolled ? '1px solid var(--border)' : 'none',
          backdropFilter:   scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
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
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
            className="flex md:hidden flex-col gap-1.5"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px', margin: '-12px -8px' }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 22, height: 1.5, background: 'var(--text)', borderRadius: 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(var(--bg-rgb),0.97)', zIndex: 490, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, backdropFilter: 'blur(20px)' }}
        >
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 28, cursor: 'pointer', padding: 8, lineHeight: 1 }}
          >
            ✕
          </button>
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
            style={{ fontFamily: 'var(--font)', fontSize: 28, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.03em' }}
          >
            Get started
          </button>
        </div>
      )}
    </>
  )
}
