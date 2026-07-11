'use client'

import { useRef, useEffect, useState } from 'react'

const WORDS = ['digital edge', 'your vision', 'smart tools', 'growth systems', 'mobile apps']

const HERO_STATS = [
  { num: '4+',    label: 'Years of experience'        },
  { num: '7+',    label: 'Long-term projects'          },
  { num: '15d',   label: 'Avg. delivery'               },
  { num: '7+',    label: 'International clients'        },
]

export default function Hero() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const [typedWord, setTypedWord] = useState('')

  /* ── Canvas particles ── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    let rafId: number

    class P {
      x = 0; y = 0; vx = 0; vy = 0; s = 0; a = 0; c = ''
      constructor() { this.r() }
      r() {
        this.x = Math.random() * W; this.y = Math.random() * H
        this.vx = (Math.random() - .5) * .3; this.vy = (Math.random() - .5) * .3
        this.s = Math.random() * 1.4 + .3; this.a = Math.random() * .35 + .06
        this.c = Math.random() > .6 ? '216,90,48' : '240,153,123'
      }
      u() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.r() }
      d() { ctx!.beginPath(); ctx!.arc(this.x, this.y, this.s, 0, Math.PI * 2); ctx!.fillStyle = `rgba(${this.c},${this.a})`; ctx!.fill() }
    }

    const pts = Array.from({ length: 100 }, () => new P())
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    const animate = () => {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => { p.u(); p.d() })
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 85) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(216,90,48,${(1 - d / 85) * .05})`; ctx.lineWidth = .4; ctx.stroke()
          }
        }
      }
      rafId = requestAnimationFrame(animate)
    }
    animate()

    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(rafId) }
  }, [])

  /* ── Typewriter ── */
  useEffect(() => {
    let wi = 0, ci = 0, del = false
    let t: ReturnType<typeof setTimeout>

    const tick = () => {
      const w = WORDS[wi]
      if (!del) {
        setTypedWord(w.slice(0, ci + 1)); ci++
        if (ci === w.length) { del = true; t = setTimeout(tick, 2200); return }
      } else {
        setTypedWord(w.slice(0, ci - 1)); ci--
        if (ci === 0) { del = false; wi = (wi + 1) % WORDS.length }
      }
      t = setTimeout(tick, del ? 52 : 95)
    }
    t = setTimeout(tick, 1800)
    return () => clearTimeout(t)
  }, [])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section
      id="hero"
      style={{ height: '100vh', minHeight: 600, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Video */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <video
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.42 }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          autoPlay loop muted playsInline
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(var(--bg-rgb),.55) 0%, rgba(var(--bg-rgb),.35) 40%, rgba(var(--bg-rgb),.88) 85%, var(--bg) 100%)' }} />
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* Grid */}
      <div className="hero-grid" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* Content — fills available height above stats, centers vertically */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 3, padding: '0 20px', minHeight: 0 }}>
      <div
        style={{ textAlign: 'center', maxWidth: 960, width: '100%', animation: 'fadeUp .9s ease both' }}
      >
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(216,90,48,.25)', background: 'rgba(216,90,48,.06)', color: 'var(--accent)', fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, marginBottom: 28 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
          Digital solutions for growing businesses
        </div>

        {/* Heading */}
        <h1
          style={{ fontSize: 'clamp(44px,9vw,108px)', fontWeight: 400, lineHeight: .92, letterSpacing: '-0.05em', marginBottom: 24, color: 'var(--text)' }}
        >
          We build the<br />
          <span style={{ color: 'var(--accent)' }}>{typedWord}</span>
          <span className="type-cursor" />
          <br />you deserve
        </h1>

        {/* Sub */}
        <p style={{ fontSize: 'clamp(14px,2vw,17px)', color: 'var(--muted)', maxWidth: 460, margin: '0 auto 40px', lineHeight: 1.8, animation: 'fadeUp .8s .25s ease both' }}>
          Exter Cloud crafts custom websites, booking systems, management platforms, mobile apps and WhatsApp integrations — built to scale your business from day one.
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp .8s .4s ease both' }}>
          <button
            onClick={() => scrollTo('services')}
            style={{ padding: '14px 32px', background: 'var(--accent)', color: '#fff', borderRadius: 4, fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .3s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(216,90,48,.28)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
          >
            Explore services →
          </button>
          <button
            onClick={() => scrollTo('process')}
            style={{ padding: '14px 32px', border: '1px solid var(--border-hi)', color: 'var(--text)', borderRadius: 4, fontSize: 13, background: 'none', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all .3s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(216,90,48,.05)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border-hi)'; el.style.color = 'var(--text)'; el.style.background = 'none' }}
          >
            How we work
          </button>
        </div>
      </div>
      </div>

      {/* Stats strip — natural flex item pinned to bottom, never overlaps content */}
      <div
        style={{ position: 'relative', zIndex: 3, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', animation: 'fadeIn 1s .7s ease both', opacity: 0, animationFillMode: 'both' }}
      >
        {HERO_STATS.map(s => (
          <div key={s.label} className="hero-stat-item" style={{ padding: 'clamp(10px,2vh,16px) clamp(12px,3vw,24px)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.04em' }}>{s.num}</div>
            <div style={{ fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
