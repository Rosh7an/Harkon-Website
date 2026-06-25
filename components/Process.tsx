'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

const STEPS = [
  {
    step: 'Phase 01', icon: '🔍', title: 'Discovery call',
    desc: 'We learn your business, goals, and constraints. No jargon — just honest conversation about what will actually move the needle for you.',
    time: '1–2 days',
    detail: {
      deliverables: ['Business audit', 'Goal mapping', 'Constraint analysis'],
      tools: ['Kick-off call', 'Brief document', 'Requirements sheet'],
      outcome: ['Shared vision', 'Aligned priorities', 'Go / no-go decision'],
    },
  },
  {
    step: 'Phase 02', icon: '🗺️', title: 'Strategy & scope',
    desc: 'We map the exact solution, timeline, and investment required. You get a clear proposal before any work begins — possibly no surprises.',
    time: '2–3 days',
    detail: {
      deliverables: ['Technical proposal', 'Wireframes', 'Project timeline'],
      tools: ['Figma prototypes', 'Scope document', 'Cost breakdown'],
      outcome: ['Fixed scope', 'Clear milestones', 'Signed agreement'],
    },
  },
  {
    step: 'Phase 03', icon: '⚙️', title: 'Design & build',
    desc: 'Our team designs and develops with regular check-ins. You see real progress weekly and give feedback directly to the people building it.',
    time: '7–18 days',
    detail: {
      deliverables: ['UI/UX designs', 'Working builds', 'Test deployments'],
      tools: ['Figma', 'React / Next.js', 'Staging environment'],
      outcome: ['Review-ready build', 'Feedback integrated', 'QA completed'],
    },
  },
  {
    step: 'Phase 04', icon: '🚀', title: 'Launch & grow',
    desc: 'We launch, train your team, and stay on for ongoing support. Your business is live — and we stay close to make sure it scales.',
    time: '1–2 days',
    detail: {
      deliverables: ['Live deployment', 'Team training', 'Support docs'],
      tools: ['Production servers', 'Monitoring tools', 'Slack channel'],
      outcome: ['Business is live', 'Team is trained', 'Growth begins'],
    },
  },
]

const TABS = ['Discovery', 'Strategy', 'Design & Build', 'Launch']

export default function Process() {
  const sectionRef = useRef<HTMLElement>(null)
  const [procIdx, setProcIdx] = useState(0)
  const [detailVisible, setDetailVisible] = useState(false)
  const [barLeft, setBarLeft] = useState(0)
  const [barWidth, setBarWidth] = useState(0)
  const [sectionVisible, setSectionVisible] = useState(false)

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const pTouchX = useRef<number | null>(null)

  const updateBar = useCallback((idx: number) => {
    const tab = tabRefs.current[idx]
    if (tab) { setBarLeft(tab.offsetLeft); setBarWidth(tab.offsetWidth) }
  }, [])

  const goProc = useCallback((idx: number) => {
    const n = Math.max(0, Math.min(STEPS.length - 1, idx))
    setProcIdx(n)
    updateBar(n)
    setDetailVisible(false)
    setTimeout(() => setDetailVisible(true), 180)
  }, [updateBar])

  useEffect(() => {
    const run = () => updateBar(procIdx)
    // Double RAF: guarantees layout is painted before measuring tab offsets
    const raf = requestAnimationFrame(() => requestAnimationFrame(run))
    // Wait for web fonts — Bricolage Grotesque changes tab widths after load
    document.fonts?.ready.then(run)
    // Fallback for edge cases
    const t = setTimeout(run, 400)
    setDetailVisible(true)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [updateBar, procIdx])

  /* ── Section visibility ── */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setSectionVisible(e.isIntersecting), { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const getCardStyle = (i: number) => {
    const o = i - procIdx
    const abs = Math.abs(o)
    const tx = o * 125
    const tz = abs === 0 ? 50 : abs === 1 ? -40 : abs === 2 ? -90 : -150
    const ry = o * -16
    const sc = abs === 0 ? 1.06 : abs === 1 ? 0.87 : abs === 2 ? 0.72 : 0.58
    const op = abs === 0 ? 1 : abs === 1 ? 0.62 : abs === 2 ? 0.38 : 0.22
    return {
      transform: `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${sc})`,
      opacity: op,
      zIndex: 10 - abs,
      pointerEvents: 'auto',
      cursor: abs === 0 ? 'default' : 'pointer',
    } as React.CSSProperties
  }

  return (
    <section
      ref={sectionRef}
      id="process"
      style={{ background: 'var(--surface)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div style={{ width: '100%', maxWidth: 1100, padding: 'clamp(48px,8vh,80px) 24px clamp(32px,5vh,60px)', margin: '0 auto' }}>

        {/* Header */}
        <div className="proc-header" style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 className={`sr${sectionVisible ? ' vis' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 'clamp(30px,5vw,54px)', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 10, color: 'var(--text)', transitionDelay: sectionVisible ? '0s' : '0.3s' }}>
            From brief to live,<br />without the chaos
          </h2>
          <p className={`sr${sectionVisible ? ' vis' : ''}`} style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 380, margin: '0 auto', transitionDelay: sectionVisible ? '0.15s' : '0.2s' }}>
            Click any phase to explore what happens inside.
          </p>
        </div>

        {/* Tabs */}
        <div className={`proc-tabs-row sr${sectionVisible ? ' vis' : ''}`} style={{ marginBottom: 32, transitionDelay: sectionVisible ? '0.3s' : '0.12s' }}>
          <div style={{ position: 'absolute', bottom: -1, left: barLeft, width: barWidth, height: 2, background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)', transition: 'all .4s cubic-bezier(.22,.8,.32,1)' }} />
          {TABS.map((tab, i) => (
            <button
              key={tab}
              ref={el => { tabRefs.current[i] = el }}
              onClick={() => goProc(i)}
              style={{ padding: '12px 24px', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', color: i === procIdx ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase', border: 'none', background: 'transparent', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0, transition: 'color .3s' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 3D Stage + overlapping arrow controls */}
        <div
          className={`sr${sectionVisible ? ' vis' : ''}`}
          style={{ position: 'relative', marginBottom: 28, transitionDelay: sectionVisible ? '0.45s' : '0.06s' }}
          onTouchStart={e => { pTouchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (pTouchX.current === null) return
            const dx = e.changedTouches[0].clientX - pTouchX.current
            if (Math.abs(dx) > 30) { dx < 0 ? goProc(procIdx + 1) : goProc(procIdx - 1) }
            pTouchX.current = null
          }}
        >

          {/* Prev arrow — overlaps left edge of stage */}
          <button
            aria-label="Previous step"
            onClick={() => goProc(procIdx - 1)}
            disabled={procIdx === 0}
            style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, border: '1px solid rgba(0,255,140,.2)', borderRadius: 8, background: 'rgba(3,7,10,.72)', backdropFilter: 'blur(12px)', color: 'rgba(232,245,240,.75)', fontSize: 15, cursor: procIdx === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', transition: 'all .25s', opacity: procIdx === 0 ? 0.25 : 1, pointerEvents: procIdx === 0 ? 'none' : 'auto' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(0,255,140,.08)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,255,140,.2)'; el.style.color = 'rgba(232,245,240,.75)'; el.style.background = 'rgba(3,7,10,.72)' }}
          >←</button>

          {/* Stage */}
          <div className="proc-stage-outer">
            <div style={{ position: 'absolute', inset: 0, perspective: 1100, perspectiveOrigin: '50% 46%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`proc-card${i === procIdx ? ' is-center' : ''}`}
                  style={getCardStyle(i)}
                  onClick={() => { if (i !== procIdx) goProc(i) }}
                >
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent2)', marginBottom: 10 }}>{s.step}</p>
                  <div style={{ fontSize: 30, marginBottom: 14, filter: 'drop-shadow(0 0 10px rgba(0,200,255,.3))' }}>{s.icon}</div>
                  <h3 style={{ fontFamily: 'var(--font)', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8, color: 'var(--text)', lineHeight: 1.1 }}>{s.title}</h3>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, flex: 1 }}>{s.desc}</p>
                  <div style={{ marginTop: 14, fontSize: 10, color: 'var(--muted2)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 14, height: 1, background: 'var(--accent2)', display: 'inline-block' }} />
                    {s.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next arrow — overlaps right edge of stage */}
          <button
            aria-label="Next step"
            onClick={() => goProc(procIdx + 1)}
            disabled={procIdx === STEPS.length - 1}
            style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, border: '1px solid rgba(0,255,140,.2)', borderRadius: 8, background: 'rgba(3,7,10,.72)', backdropFilter: 'blur(12px)', color: 'rgba(232,245,240,.75)', fontSize: 15, cursor: procIdx === STEPS.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', transition: 'all .25s', opacity: procIdx === STEPS.length - 1 ? 0.25 : 1, pointerEvents: procIdx === STEPS.length - 1 ? 'none' : 'auto' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.background = 'rgba(0,255,140,.08)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,255,140,.2)'; el.style.color = 'rgba(232,245,240,.75)'; el.style.background = 'rgba(3,7,10,.72)' }}
          >→</button>

        </div>

        {/* Detail panel — hidden on mobile via .proc-detail-wrap */}
        <div className={`sr${sectionVisible ? ' vis' : ''}`} style={{ transitionDelay: sectionVisible ? '0.58s' : '0s' }}>
          <div className="proc-detail-wrap" style={{ opacity: detailVisible ? 1 : 0, transform: detailVisible ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .45s ease, transform .45s ease' }}>
            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border-hi)', borderRadius: 10, overflow: 'hidden' }}
            >
              {[
                { label: 'Deliverables', items: STEPS[procIdx].detail.deliverables },
                { label: 'Tools & methods', items: STEPS[procIdx].detail.tools },
                { label: 'You walk away with', items: STEPS[procIdx].detail.outcome },
              ].map(col => (
                <div key={col.label} style={{ background: 'var(--panel)', padding: '18px 20px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted2)', marginBottom: 10 }}>{col.label}</p>
                  {col.items.map(item => (
                    <div key={item} style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className={`sr${sectionVisible ? ' vis' : ''}`} style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 4, transitionDelay: sectionVisible ? '0.7s' : '0s' }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goProc(i)}
              style={{ width: i === procIdx ? 18 : 5, height: 5, borderRadius: i === procIdx ? 3 : '50%', background: i === procIdx ? 'var(--accent)' : 'var(--border-hi)', border: 'none', padding: 0, cursor: 'pointer', outline: 'none', boxShadow: i === procIdx ? '0 0 8px var(--accent)' : 'none', transition: 'all .3s' }}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
