'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

const SVC_LABELS = ['Niche websites', 'Management systems', 'Slot booking', 'Mobile apps', 'WhatsApp API', 'Custom builds']
const SVC_TOTAL  = 6

const SERVICES = [
  {
    num: '01', icon: '🌐',
    title: <>Niche-specific<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>websites</em></>,
    desc:  'High-converting websites built precisely for your industry. Custom-designed to match your brand and speak directly to your ideal customer — not a template anywhere in sight.',
    feats: ['Custom UI/UX', 'SEO Optimised', 'Mobile-first', 'CMS Ready', '99+ Performance'],
  },
  {
    num: '02', icon: '🗄️',
    title: <>Management<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>systems</em></>,
    desc:  'Powerful admin dashboards to manage inventory, staff, customers, and operations — all in one place. Eliminate the spreadsheet chaos with software built for the way you actually work.',
    feats: ['Role-based access', 'Real-time data', 'Inventory tracking', 'Billing & invoices'],
  },
  {
    num: '03', icon: '📅',
    title: <>Slot booking<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>systems</em></>,
    desc:  'Seamless appointment and slot booking platforms for salons, clinics, fitness studios, and service businesses. Automated confirmations and reminders built in from day one.',
    feats: ['Multi-staff slots', 'Auto reminders', 'Calendar sync', 'Waitlist logic'],
  },
  {
    num: '04', icon: '📱',
    title: <>Mobile<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>applications</em></>,
    desc:  'iOS and Android apps that put your business in your customer\'s pocket. From MVP to full-scale product — we ship fast, iterate based on real feedback, and build to last.',
    feats: ['iOS & Android', 'Push notifications', 'Offline support', 'App Store ready'],
  },
  {
    num: '05', icon: '💬',
    title: <>WhatsApp<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>integrations</em></>,
    desc:  'Automate customer conversations, send booking confirmations, follow up on leads, and run broadcast campaigns — all through WhatsApp Business API connected to your system.',
    feats: ['Business API', 'Broadcast flows', 'Lead follow-up', 'Auto-replies'],
  },
  {
    num: '06', icon: '⚡',
    title: <>Custom digital<br /><em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>solutions</em></>,
    desc:  "Have a challenge that doesn't fit a box? We scope, design, and build bespoke software — payment gateways, loyalty systems, delivery tracking, and anything your business needs.",
    feats: ['Payment gateways', 'Loyalty systems', 'Delivery tracking', 'API integrations'],
  },
]

export default function Services() {
  const sectionRef  = useRef<HTMLElement>(null)
  const activeRef   = useRef(0)
  const tabRefs     = useRef<(HTMLButtonElement | null)[]>([])
  const [active,   setActive]  = useState(0)
  const [visible,  setVisible] = useState(false)
  const [barLeft,  setBarLeft]  = useState(0)
  const [barWidth, setBarWidth] = useState(0)

  const goSvc = useCallback((idx: number) => {
    const n = Math.max(0, Math.min(SVC_TOTAL - 1, idx))
    setActive(n)
    activeRef.current = n
  }, [])

  /* ── Sync tab underline bar + scroll active tab into view ── */
  useEffect(() => {
    const tab = tabRefs.current[active]
    if (!tab) return
    setBarLeft(tab.offsetLeft)
    setBarWidth(tab.offsetWidth)
    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  /* ── Init bar position after mount (font-aware) ── */
  useEffect(() => {
    const run = () => {
      const tab = tabRefs.current[0]
      if (tab) { setBarLeft(tab.offsetLeft); setBarWidth(tab.offsetWidth) }
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(run))
    document.fonts?.ready.then(run)
    const t = setTimeout(run, 400)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [])

  /* ── Section visibility ── */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])


  /* ── Touch swipe ── */
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let tStart: number | null = null
    const onTouchStart = (e: TouchEvent) => { tStart = e.touches[0].clientX }
    const onTouchEnd   = (e: TouchEvent) => {
      if (tStart === null) return
      const dx = e.changedTouches[0].clientX - tStart
      if (Math.abs(dx) > 40) { dx < 0 ? goSvc(activeRef.current + 1) : goSvc(activeRef.current - 1) }
      tStart = null
    }
    section.addEventListener('touchstart', onTouchStart, { passive: true })
    section.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => { section.removeEventListener('touchstart', onTouchStart); section.removeEventListener('touchend', onTouchEnd) }
  }, [goSvc])

  const fillPct = active / (SVC_TOTAL - 1) * 100

  return (
    <section
      ref={sectionRef}
      id="services"
      className="svc-section"
      style={{ background: 'var(--bg)', position: 'relative' }}
    >
      {/* Animated wrapper — height:100% inherits from .svc-section */}
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%', alignItems: 'stretch' }}>
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex"
        style={{ width: 360, minWidth: 360, borderRight: '1px solid var(--border)', padding: '80px 44px', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 0% 50%, rgba(0,255,140,.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <p className={`sr${visible ? ' vis' : ''}`} style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, transitionDelay: visible ? '0s' : '0.3s' }}>What we build</p>
        <h2 className={`sr${visible ? ' vis' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,2.5vw,36px)', fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 16, color: 'var(--text)', transitionDelay: visible ? '0.15s' : '0.22s' }}>
          Our core<br />services
        </h2>
        <p className={`sr${visible ? ' vis' : ''}`} style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 32, transitionDelay: visible ? '0.28s' : '0.14s' }}>
          Each solution custom-built for your business — no templates, no compromise.
        </p>

        {/* Progress list */}
        <div className={`sr${visible ? ' vis' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32, position: 'relative', paddingLeft: 22, flex: 1, transitionDelay: visible ? '0.42s' : '0.06s' }}>
          {/* Spine */}
          <div style={{ position: 'absolute', left: 4, top: 8, bottom: 8, width: 1, background: 'var(--border)' }} />
          {/* Fill */}
          <div style={{ position: 'absolute', left: 4, top: 8, width: 1, background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', transition: 'height .5s ease', height: `${fillPct}%` }} />

          {SVC_LABELS.map((label, i) => (
            <div
              key={i}
              onClick={() => goSvc(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', cursor: 'pointer', position: 'relative' }}
            >
              <div style={{ width: 9, height: 9, borderRadius: '50%', border: `1px solid ${i === active ? 'var(--accent)' : 'rgba(0,255,140,.3)'}`, background: i === active ? 'var(--accent)' : 'var(--panel)', boxShadow: i === active ? '0 0 12px var(--accent)' : 'none', transition: 'all .3s', position: 'relative', zIndex: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: i === active ? 'var(--text)' : 'var(--muted)', transition: 'color .3s' }}>{label}</span>
            </div>
          ))}
        </div>

        <p className={`sr${visible ? ' vis' : ''}`} style={{ fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.06em', transitionDelay: visible ? '0.56s' : '0s' }}>
          {String(active + 1).padStart(2, '0')} / {String(SVC_TOTAL).padStart(2, '0')}
        </p>
      </div>

      {/* ── RIGHT TRACK WRAPPER ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Process-style tab row — mobile/tablet only, hidden at lg+ */}
        <div className="svc-tab-row">
          <div style={{ position: 'absolute', bottom: -1, left: barLeft, width: barWidth, height: 2, background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', transition: 'all .4s cubic-bezier(.22,.8,.32,1)' }} />
          {SVC_LABELS.map((label, i) => (
            <button
              key={i}
              ref={el => { tabRefs.current[i] = el }}
              onClick={() => goSvc(i)}
              className={`svc-tab-btn${i === active ? ' active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Inner carousel area — fills remaining height */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Prev arrow — overlaps left edge of carousel */}
        <button
          className="svc-prev-btn"
          aria-label="Previous service"
          onClick={() => goSvc(active - 1)}
          disabled={active === 0}
          style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 42, height: 42, border: '1px solid rgba(0,255,140,.2)', borderRadius: 8, background: 'rgba(3,7,10,.7)', backdropFilter: 'blur(12px)', color: 'rgba(232,245,240,.75)', fontSize: 16, cursor: active === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', transition: 'all .3s', opacity: active === 0 ? 0.28 : 1, pointerEvents: active === 0 ? 'none' : 'auto' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(0,255,140,.1)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,255,140,.2)'; el.style.color = 'rgba(232,245,240,.75)'; el.style.background = 'rgba(3,7,10,.7)' }}
        >←</button>

        {/* Next arrow — overlaps right edge of carousel */}
        <button
          className="svc-next-btn"
          aria-label="Next service"
          onClick={() => goSvc(active + 1)}
          disabled={active === SVC_TOTAL - 1}
          style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 42, height: 42, border: '1px solid rgba(0,255,140,.2)', borderRadius: 8, background: 'rgba(3,7,10,.7)', backdropFilter: 'blur(12px)', color: 'rgba(232,245,240,.75)', fontSize: 16, cursor: active === SVC_TOTAL - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', transition: 'all .3s', opacity: active === SVC_TOTAL - 1 ? 0.28 : 1, pointerEvents: active === SVC_TOTAL - 1 ? 'none' : 'auto' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(0,255,140,.1)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,255,140,.2)'; el.style.color = 'rgba(232,245,240,.75)'; el.style.background = 'rgba(3,7,10,.7)' }}
        >→</button>

        {/* Dot row */}
        <div className="svc-dot-row-wrap">
          {Array.from({ length: SVC_TOTAL }, (_, i) => (
            <button
              key={i}
              aria-label={SVC_LABELS[i]}
              onClick={() => goSvc(i)}
              style={{ width: i === active ? 18 : 5, height: 5, borderRadius: i === active ? 3 : '50%', background: i === active ? 'var(--accent)' : 'rgba(255,255,255,.15)', border: 'none', padding: 0, cursor: 'pointer', outline: 'none', boxShadow: i === active ? '0 0 8px var(--accent)' : 'none', transition: 'all .35s' }}
            />
          ))}
        </div>

        {/* Slide track */}
        <div style={{ display: 'flex', height: '100%', transition: 'transform .7s cubic-bezier(.22,.8,.32,1)', transform: `translateX(-${active * 100}%)` }}>
          {SERVICES.map((s, i) => (
            <div key={s.num} className="svc-card-panel">
              {/* Orb */}
              <div style={{ position: 'absolute', top: '50%', left: '55%', transform: 'translate(-50%,-50%)', width: 560, height: 460, background: 'radial-gradient(ellipse, rgba(0,255,140,.04) 0%, transparent 60%)', pointerEvents: 'none', animation: 'float 7s ease-in-out infinite' }} />

              {/* Card number */}
              <div style={{ fontFamily: 'var(--font)', fontSize: 'clamp(60px,10vw,140px)', fontWeight: 400, color: 'rgba(0,255,140,.038)', position: 'absolute', top: 20, right: 20, lineHeight: 1, pointerEvents: 'none', letterSpacing: '-0.06em' }}>
                {s.num}
              </div>

              {/* sr-fade avoids transform conflict with the float keyframe */}
              <span className={`sr-fade${visible ? ' vis' : ''}`} style={{ fontSize: 'clamp(28px,4vw,40px)', marginBottom: 16, display: 'block', filter: 'drop-shadow(0 0 14px rgba(0,255,140,.28))', animation: 'float 6s ease-in-out infinite', transitionDelay: visible ? '0.1s' : '0.3s' }}>{s.icon}</span>

              <h3 className={`sr${visible ? ' vis' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px,4vw,58px)', fontWeight: 400, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 14, color: 'var(--text)', transitionDelay: visible ? '0.24s' : '0.22s' }}>
                {s.title}
              </h3>

              <p className={`sr${visible ? ' vis' : ''}`} style={{ fontSize: 'clamp(14px,1.5vw,15.5px)', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.82, marginBottom: 32, transitionDelay: visible ? '0.38s' : '0.14s' }}>
                {s.desc}
              </p>

              <div className={`sr${visible ? ' vis' : ''}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36, transitionDelay: visible ? '0.5s' : '0.06s' }}>
                {s.feats.map(f => (
                  <span
                    key={f}
                    className="svc-feat-tag"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <div className={`sr${visible ? ' vis' : ''}`} style={{ transitionDelay: visible ? '0.62s' : '0s' }}>
                <button
                  onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0, transition: 'gap .3s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.gap = '18px' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.gap = '10px' }}
                >
                  Start a project →
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>{/* end inner carousel */}
      </div>{/* end right track */}
      </div>{/* end animated wrapper */}
    </section>
  )
}
