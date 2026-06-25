'use client'

import { useRef, useEffect, useState } from 'react'

const CARDS = [
  { icon: '📅', target:  4, suf: '+', label: 'Years of experience',        color: 'var(--accent)',  bar: '#00ff8c', barW: 80  },
  { icon: '🌍', target:  7, suf: '+', label: 'Long-term projects',          color: 'var(--accent2)', bar: '#00c8ff', barW: 70  },
  { icon: '🤝', target: 15, suf: 'd', label: 'Avg. delivery time',          color: 'var(--accent3)', bar: '#7b61ff', barW: 75  },
  { icon: '✈️', target:  7, suf: '+', label: 'International client dealing', color: 'var(--accent4)', bar: '#ff6b35', barW: 70  },
]

export default function Stats() {
  const sectionRef = useRef<HTMLElement>(null)
  const rafIds     = useRef<number[]>([])
  const [counts,   setCounts] = useState(CARDS.map(() => '0'))
  const [barsOn,   setBarsOn] = useState(false)
  const [visible,  setVisible] = useState(false)

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
            const p    = Math.min((ts - start) / DUR, 1)
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
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(0,200,255,.04) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(123,97,255,.04) 0%, transparent 55%)', pointerEvents: 'none' }} />

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
              <div className="card-glow" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0, rgba(0,255,140,.08) 0, transparent 65%)', opacity: 0, transition: 'opacity .4s', pointerEvents: 'none' }} />
              <span style={{ fontSize: 20, marginBottom: 12, display: 'block', opacity: .6 }}>{c.icon}</span>
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
