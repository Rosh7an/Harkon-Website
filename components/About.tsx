'use client'

import { useRef, useEffect, useState } from 'react'

const SEGMENTS = [
  {
    icon: '🎯',
    label: 'Mission',
    accent: 'var(--accent)',
    bar: 'var(--accent)',
    desc: 'To provide enhanced digital solutions for business growth, accessible to startups and enterprises of every scale.',
  },
  {
    icon: '🔭',
    label: 'Vision',
    accent: 'var(--accent)',
    bar: 'var(--accent)',
    desc: 'To bring reliable, future-ready solutions to every business by leveraging modern technologies and best practices.',
  },
  {
    icon: '💎',
    label: 'Value',
    accent: 'var(--accent)',
    bar: 'var(--accent)',
    desc: 'To deliver products that drive real business growth, built with utmost sincerity and full transparency.',
  },
]

export default function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { setVisible(entry.isIntersecting) },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="about"
      style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(216,90,48,.035) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(12,42,67,.03) 0%, transparent 55%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, width: '100%', padding: 'clamp(56px,8vh,100px) 24px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <div
          style={{
            textAlign: 'center', marginBottom: 72,
            opacity:   visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity .8s ease, transform .8s ease',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px,5vw,54px)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.06, color: 'var(--text)' }}>
            Built on purpose,<br />driven by growth
          </h2>
        </div>

        {/* 3-column grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border-hi)', borderRadius: 16, overflow: 'hidden' }}
        >
          {SEGMENTS.map((s, i) => (
            <div
              key={s.label}
              className={`sr${visible ? ' vis' : ''}`}
              style={{
                background:      'var(--panel)',
                padding:         'clamp(28px,5vh,48px) clamp(20px,4vw,36px)',
                position:        'relative',
                overflow:        'hidden',
                display:         'flex',
                flexDirection:   'column',
                transitionDelay: visible ? `${i * 0.1}s` : `${(SEGMENTS.length - 1 - i) * 0.07}s`,
              }}
            >
              {/* Top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.bar}, transparent)`, opacity: .65 }} />

              {/* Hover glow */}
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 0%, ${s.bar} 0%, transparent 60%)`, opacity: .12, pointerEvents: 'none' }} />

              {/* Icon */}
              <div style={{ fontSize: 38, marginBottom: 24, display: 'inline-block', filter: `drop-shadow(0 0 10px ${s.bar})`, opacity: .8 }}>
                {s.icon}
              </div>

              {/* Label */}
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: s.accent, marginBottom: 16 }}>
                {s.label}
              </p>

              {/* Desc — flex:1 pushes bottom bar to same position across all cards */}
              <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontWeight: 300, letterSpacing: '-0.01em', opacity: .85, flex: 1 }}>
                {s.desc}
              </p>

              {/* Bottom bar */}
              <div style={{ height: 1, background: 'var(--border)', marginTop: 36, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                <div
                  className="stat-bar-fill"
                  style={{ background: s.bar, width: visible ? '55%' : 0, transitionDelay: `${0.4 + i * 0.12}s` }}
                />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
