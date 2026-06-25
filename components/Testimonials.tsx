'use client'

import { useEffect, useRef, useState } from 'react'

const TESTIMONIALS = [
  {
    stars: '★★★★★',
    quote: 'HARKON built our entire clinic booking system in 12 days. The WhatsApp reminders alone cut no-shows by 60%. I didn\'t think software could move this fast.',
    name:  'Dr. Ramesh Kumar',
    role:  'Apollo Wellness Clinic, Chennai',
    init:  'RK',
    grad:  'linear-gradient(135deg,#00ff8c,#00c8ff)',
  },
  {
    stars: '★★★★★',
    quote: 'We had a generic website before. After HARKON rebuilt it for our salon chain, online bookings went up 3x in the first month. It actually converts now.',
    name:  'Priya Menon',
    role:  'Aura Salon Group, Coimbatore',
    init:  'PM',
    grad:  'linear-gradient(135deg,#7b61ff,#00c8ff)',
  },
  {
    stars: '★★★★★',
    quote: 'The management system they built replaced four different tools. Everything\'s in one place now. My team actually enjoys using it daily.',
    name:  'Arun Jayaraj',
    role:  'Speedline Logistics, Madurai',
    init:  'AJ',
    grad:  'linear-gradient(135deg,#ff6b35,#7b61ff)',
  },
  {
    stars: '★★★★★',
    quote: 'They understood our gym\'s workflow better than we did. The mobile app for member check-ins and class booking is something our members rave about.',
    name:  'Santhosh Kumar',
    role:  'IronPeak Fitness, Trichy',
    init:  'SK',
    grad:  'linear-gradient(135deg,#00c8ff,#00ff8c)',
  },
]

export default function Testimonials() {
  const [active,   setActive]   = useState(0)
  const [exiting,  setExiting]  = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const startTimer = (cur: number) => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setExiting(cur)
      const next = (cur + 1) % TESTIMONIALS.length
      setActive(next)
      setTimeout(() => setExiting(null), 650)
      cur = next
    }, 5000)
  }

  useEffect(() => {
    startTimer(active)
    return () => clearInterval(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goTesti = (i: number) => {
    clearInterval(timerRef.current)
    setExiting(active)
    setActive(i)
    setTimeout(() => setExiting(null), 650)
    startTimer(i)
  }

  return (
    <section
      id="testimonials"
      style={{ background: 'var(--surface)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, rgba(123,97,255,.05) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 900, width: '100%', padding: '80px 24px', position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent3)', marginBottom: 12 }}>Client stories</p>
        <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 400, letterSpacing: '-0.04em', marginBottom: 48, lineHeight: 1.05, color: 'var(--text)' }}>
          What businesses<br />say about HARKON
        </h2>

        {/* Slide stage */}
        <div style={{ position: 'relative', minHeight: 240, marginBottom: 32 }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              style={{
                position:      'absolute',
                inset:          0,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                opacity:        i === active ? 1 : 0,
                transform:      i === active
                  ? 'translateX(0) scale(1)'
                  : i === exiting
                    ? 'translateX(-40px) scale(.97)'
                    : 'translateX(40px) scale(.97)',
                transition:     'all .6s cubic-bezier(.22,.8,.32,1)',
                pointerEvents:  i === active ? 'auto' : 'none',
              }}
            >
              <div style={{ color: 'var(--accent2)', fontSize: 13, letterSpacing: 3, marginBottom: 20 }}>{t.stars}</div>
              <p style={{ fontFamily: 'var(--font)', fontSize: 'clamp(16px,2.4vw,23px)', fontWeight: 400, lineHeight: 1.55, color: 'var(--text)', maxWidth: 640, marginBottom: 28, letterSpacing: '-0.02em' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#000', flexShrink: 0 }}>
                  {t.init}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{t.name}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTesti(i)}
              style={{ width: i === active ? 20 : 5, height: 5, borderRadius: i === active ? 3 : '50%', background: i === active ? 'var(--accent3)' : 'var(--border-hi)', border: 'none', padding: 0, cursor: 'pointer', outline: 'none', boxShadow: i === active ? '0 0 8px var(--accent3)' : 'none', transition: 'all .3s' }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
