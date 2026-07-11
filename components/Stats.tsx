'use client'

import { useRef, useEffect, useState } from 'react'

const CARDS = [
  { target: 4, suf: '+', label: 'Years of experience', color: 'var(--accent)', bar: 'var(--accent)', barW: 80 },
  { target: 7, suf: '+', label: 'Long-term projects', color: 'var(--accent)', bar: 'var(--accent)', barW: 70 },
  { target: 15, suf: 'd', label: 'Avg. delivery time', color: 'var(--accent)', bar: 'var(--accent)', barW: 75 },
  { target: 7, suf: '+', label: 'International client dealing', color: 'var(--accent)', bar: 'var(--accent)', barW: 70 },
]

const ICON_SIZE = { width: 44, height: 44, viewBox: '0 0 32 32' } as const

const ICONS: React.ReactNode[] = [
  // Years of experience — award/ribbon mockup
  <svg key="award" {...ICON_SIZE}>
    <rect x="2" y="5" width="28" height="22" rx="3" fill="var(--panel)" stroke="var(--border-hi)" strokeWidth="1" />
    <rect x="2" y="5" width="28" height="6" rx="3" fill="var(--surface)" />
    <circle cx="5.5" cy="8" r="0.9" fill="#D85A30" />
    <circle cx="8.5" cy="8" r="0.9" fill="#F0997B" />
    <circle cx="11.5" cy="8" r="0.9" fill="#F5C4B3" />
    <circle cx="16" cy="16" r="5.5" fill="url(#statsGradAward)" />
    <path d="M13 20l-2 4.5 5-2 5 2-2-4.5" fill="#D85A30" />
    <defs>
      <linearGradient id="statsGradAward" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#D85A30" /><stop offset="1" stopColor="#F0997B" />
      </linearGradient>
    </defs>
  </svg>,
  // Long-term projects — stacked layers mockup
  <svg key="layers" {...ICON_SIZE}>
    <rect x="2" y="5" width="28" height="22" rx="3" fill="var(--panel)" stroke="var(--border-hi)" strokeWidth="1" />
    <rect x="2" y="5" width="28" height="6" rx="3" fill="var(--surface)" />
    <circle cx="5.5" cy="8" r="0.9" fill="#D85A30" />
    <circle cx="8.5" cy="8" r="0.9" fill="#F0997B" />
    <circle cx="11.5" cy="8" r="0.9" fill="#F5C4B3" />
    <rect x="9" y="20" width="14" height="3.4" rx="1.2" fill="#F5C4B3" />
    <rect x="9" y="16" width="14" height="3.4" rx="1.2" fill="#F0997B" />
    <rect x="9" y="12" width="14" height="3.4" rx="1.2" fill="#D85A30" />
  </svg>,
  // Avg. delivery time — fast clock mockup
  <svg key="clock" {...ICON_SIZE}>
    <rect x="2" y="5" width="28" height="22" rx="3" fill="var(--panel)" stroke="var(--border-hi)" strokeWidth="1" />
    <rect x="2" y="5" width="28" height="6" rx="3" fill="var(--surface)" />
    <circle cx="5.5" cy="8" r="0.9" fill="#D85A30" />
    <circle cx="8.5" cy="8" r="0.9" fill="#F0997B" />
    <circle cx="11.5" cy="8" r="0.9" fill="#F5C4B3" />
    <circle cx="18" cy="17" r="6.2" fill="none" stroke="#D85A30" strokeWidth="1.7" />
    <path d="M18 13.5v4l3 2" stroke="#D85A30" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 15h3.5M6.5 18h3.5M7.5 21h2.5" stroke="#F0997B" strokeWidth="1.6" strokeLinecap="round" />
  </svg>,
  // International client dealing — people + handshake mockup
  <svg key="handshake" {...ICON_SIZE}>
    <rect x="2" y="5" width="28" height="22" rx="3" fill="var(--panel)" stroke="var(--border-hi)" strokeWidth="1" />
    <rect x="2" y="5" width="28" height="6" rx="3" fill="var(--surface)" />
    <circle cx="5.5" cy="8" r="0.9" fill="#D85A30" />
    <circle cx="8.5" cy="8" r="0.9" fill="#F0997B" />
    <circle cx="11.5" cy="8" r="0.9" fill="#F5C4B3" />
    <circle cx="11" cy="15" r="2.6" fill="#D85A30" />
    <path d="M6.5 24v-1.2a4.5 4.5 0 0 1 4.5-4.5" fill="none" stroke="#D85A30" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="21" cy="15" r="2.6" fill="#F0997B" />
    <path d="M25.5 24v-1.2a4.5 4.5 0 0 0 -4.5-4.5" fill="none" stroke="#F0997B" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13.5 22l1.7 1.7a1 1 0 0 0 1.4 0l1.7-1.7" fill="none" stroke="#F5C4B3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
]

export default function Stats() {
  const sectionRef = useRef<HTMLElement>(null)
  const rafIds = useRef<number[]>([])
  const [counts, setCounts] = useState(CARDS.map(() => '0'))
  const [barsOn, setBarsOn] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        rafIds.current.forEach(id => cancelAnimationFrame(id))
        rafIds.current = []
        const DUR = 1900
        CARDS.forEach((card, idx) => {
          const start = performance.now()
          const tick = (ts: number) => {
            const p = Math.min((ts - start) / DUR, 1)
            const ease = 1 - Math.pow(1 - p, 4)
            setCounts(prev => { const next = [...prev]; next[idx] = Math.round(ease * card.target) + card.suf; return next })
            if (p < 1) { rafIds.current[idx] = requestAnimationFrame(tick) }
            else setCounts(prev => { const next = [...prev]; next[idx] = card.target + card.suf; return next })
          }
          rafIds.current[idx] = requestAnimationFrame(tick)
        })
        setTimeout(() => setBarsOn(true), 200)
      } else {
        setVisible(false)
        rafIds.current.forEach(id => cancelAnimationFrame(id))
        rafIds.current = []
        setCounts(CARDS.map(() => '0'))
        setBarsOn(false)
      }
    }, { threshold: 0.35 })

    obs.observe(el)
    return () => { obs.disconnect(); rafIds.current.forEach(id => cancelAnimationFrame(id)) }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="stats"
      style={{ background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(12,42,67,.03) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(240,153,123,.05) 0%, transparent 55%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, width: '100%', padding: 'clamp(48px,7vh,80px) 24px', position: 'relative', zIndex: 2 }}>
        <h2 className={`sr${visible ? ' vis' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 'clamp(30px,5vw,58px)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.04, marginBottom: 12, color: 'var(--text)', transitionDelay: visible ? '0s' : '0.2s' }}>
          Results that<br />speak for<br />themselves
        </h2>
        <p className={`sr${visible ? ' vis' : ''}`} style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 360, lineHeight: 1.7, marginBottom: 60, transitionDelay: visible ? '0.15s' : '0.12s' }}>
          Real numbers from real clients across real industries.
        </p>

        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}
        >
          {CARDS.map((c, i) => {
            const eDelay = `${0.18 + i * 0.12}s`
            const xDelay = `${(CARDS.length - 1 - i) * 0.06}s`
            return (
              <div
                key={c.label}
                className={`stat-card sr${visible ? ' vis' : ''}`}
                style={{ padding: '36px 24px', background: 'var(--surface)', position: 'relative', overflow: 'hidden', transitionDelay: visible ? eDelay : xDelay }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--panel)'; const pseudo = el.querySelector<HTMLElement>('.card-glow'); if (pseudo) pseudo.style.opacity = '1' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface)'; const pseudo = el.querySelector<HTMLElement>('.card-glow'); if (pseudo) pseudo.style.opacity = '0' }}
              >
                <div className="card-glow" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0, rgba(216,90,48,.06) 0, transparent 65%)', opacity: 0, transition: 'opacity .4s', pointerEvents: 'none' }} />
                <div style={{ marginBottom: 12 }}>{ICONS[i]}</div>
                <div className="stat-num" style={{ fontFamily: 'var(--font)', fontSize: 'clamp(32px,4vw,48px)', fontWeight: 400, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8, color: c.color }}>
                  {counts[i]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{c.label}</div>
                <div style={{ height: 1.5, background: 'var(--border)', borderRadius: 1, marginTop: 20, overflow: 'hidden' }}>
                  <div
                    className="stat-bar-fill"
                    style={{ background: c.bar, width: barsOn ? `${c.barW}%` : 0 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
