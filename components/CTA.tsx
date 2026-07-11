'use client'

import { useRef, useEffect, useState } from 'react'
import QueryModal from '@/components/QueryModal'

export default function CTA() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [queryOpen, setQueryOpen] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="cta"
      style={{ background: 'var(--bg)', padding: 'clamp(100px,16vh,160px) 0', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(var(--grid-rgb),.028) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--grid-rgb),.028) 1px, transparent 1px)', backgroundSize: '76px 76px', pointerEvents: 'none' }} />

      {/* Orbit rings (spin keyframe handles translate(-50%,-50%)) */}
      <div className="hidden md:block" style={{ position: 'absolute', top: '50%', left: '50%', width: 480, height: 480, borderRadius: '50%', border: '1px solid rgba(216,90,48,.09)', animation: 'spinRing 25s linear infinite', pointerEvents: 'none' }} />
      <div className="hidden md:block" style={{ position: 'absolute', top: '50%', left: '50%', width: 800, height: 800, borderRadius: '50%', border: '1px dashed rgba(12,42,67,.06)', animation: 'spinRing 42s linear infinite reverse', pointerEvents: 'none' }} />
      <div className="hidden md:block" style={{ position: 'absolute', top: '50%', left: '50%', width: 1100, height: 1100, borderRadius: '50%', border: '1px solid rgba(240,153,123,.08)', animation: 'spinRing 65s linear infinite', pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: 720 }}>
        <p style={{
          fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 22,
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity .7s ${visible ? '0s' : '.24s'} ease, transform .7s ${visible ? '0s' : '.24s'} ease`,
        }}>
          Ready to scale?
        </p>

        <h2 style={{
          fontFamily: 'var(--font)', fontSize: 'clamp(38px,7vw,84px)', fontWeight: 400, letterSpacing: '-0.05em', lineHeight: .92, marginBottom: 22, color: 'var(--text)',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity .75s ${visible ? '.08s' : '.16s'} ease, transform .75s ${visible ? '.08s' : '.16s'} ease`,
        }}>
          Let&apos;s build<br />something that<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>works</em>
        </h2>

        <p style={{
          fontSize: 15, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 44px', lineHeight: 1.8,
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity .7s ${visible ? '.18s' : '.08s'} ease, transform .7s ${visible ? '.18s' : '.08s'} ease`,
        }}>
          Tell us about your business. We&apos;ll scope a solution that fits your timeline and budget. All consultations are free.
        </p>

        <div style={{
          display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity .65s ${visible ? '.28s' : '0s'} ease, transform .65s ${visible ? '.28s' : '0s'} ease`,
        }}>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}`}
            style={{ padding: '14px 32px', background: 'var(--accent)', color: '#fff', borderRadius: 4, fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .3s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 10px 28px rgba(216,90,48,.28)'; el.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = 'none'; el.style.transform = 'translateY(0)' }}
          >
            💬 Chat on WhatsApp
          </a>
          {/* <button
            onClick={() => setQueryOpen(true)}
            style={{ padding: '14px 32px', border: '1px solid var(--border-hi)', color: 'var(--text)', borderRadius: 4, fontSize: 13, background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .3s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(216,90,48,.05)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-hi)'; el.style.color = 'var(--text)'; el.style.background = 'none' }}
          >
            Send a query →
          </button> */}
        </div>
      </div>

      <QueryModal open={queryOpen} onClose={() => setQueryOpen(false)} />
    </section>
  )
}
