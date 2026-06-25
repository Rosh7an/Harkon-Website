'use client'

import { useRef, useEffect, useState } from 'react'

const WHY_POINTS = [
  {
    title: 'Niche-first thinking',
    desc: "We don't build generic software. Every solution is designed around the specific workflows, customers, and goals of your industry.",
  },
  {
    title: 'Speed without shortcuts',
    desc: 'Our delivery timelines are aggressive because our process is tight — not because we cut corners. Quality ships fast at HARKON.',
  },
  {
    title: 'You own everything',
    desc: 'Full source code, full IP rights, full admin access from day one. No lock-in, no ongoing dependency on us unless you want it.',
  },
  {
    title: 'A team, not a ticket',
    desc: 'You talk to the people actually building your product. No account managers, no delays — just direct access to your team.',
  },
]

const DELIVERIES = [
  { title: 'Clinic booking system',    sub: 'WhatsApp + web + admin panel',   time: '12' },
  { title: 'Salon chain website',       sub: 'Slot booking + CRM integration', time: '9'  },
  { title: 'Retail management system', sub: 'Inventory + orders + billing',    time: '18' },
  { title: 'Delivery tracking app',    sub: 'iOS + Android + driver panel',    time: '21' },
  { title: 'Fitness studio platform',  sub: 'Membership + batch scheduling',   time: '14' },
]

function useCounter(target: number, trigger: boolean, delay = 0, duration = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    const start = performance.now() + delay
    let raf: number
    const tick = (now: number) => {
      const elapsed  = Math.max(0, now - start)
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trigger, target, delay, duration])
  return value
}

function DeliveryRow({ d, visible, index }: { d: typeof DELIVERIES[0]; index: number; visible: boolean }) {
  const num = parseInt(d.time)
  const counted = useCounter(num, visible, 350 + index * 100, 600)

  return (
    <div
      className="flex items-center gap-3.5 p-3 rounded-xl transition-colors duration-200 cursor-default"
      style={{
        background:    'rgba(17,26,19,0.4)',
        border:        '1px solid rgba(60,180,80,0.1)',
        opacity:       visible ? 1 : 0,
        transform:     visible ? 'translateX(0)' : 'translateX(40px)',
        transition:    visible ? `opacity .55s ${320 + index * 90}ms ease, transform .65s ${320 + index * 90}ms cubic-bezier(.22,1,.36,1), border-color .2s ease` : 'none',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(60,180,80,0.25)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(60,180,80,0.1)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-tight truncate" style={{ color: '#e8f5ea' }}>{d.title}</div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(232,245,234,0.3)' }}>{d.sub}</div>
      </div>
      <div className="text-[11px] font-medium shrink-0 tabular-nums" style={{ color: 'rgba(80,220,100,0.6)' }}>
        {visible ? counted : 0}d
      </div>
    </div>
  )
}

export default function Why({ showHeader = true }: { showHeader?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let fired = false
    const go = () => { if (!fired) { fired = true; setVisible(true) } }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) go() }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="why" className="py-24 px-6 md:px-12 lg:px-16 max-w-6xl mx-auto">
      {showHeader && (
        <>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: 'rgba(80,220,100,0.5)', textTransform: 'uppercase', marginBottom: 16 }}>
            Why HARKON
          </p>
          <h2 className="text-4xl md:text-5xl font-normal mb-16 leading-[1.06]" style={{ color: '#e8f5ea', letterSpacing: '-0.03em' }}>
            Built for businesses<br />that mean business
          </h2>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

        {/* Left — slides from left */}
        <div className="flex flex-col gap-7">
          {WHY_POINTS.map((p, i) => (
            <div
              key={p.title}
              style={{
                opacity:   visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-44px)',
                transition: visible ? `opacity .6s ${i * 100}ms ease, transform .7s ${i * 100}ms cubic-bezier(.22,1,.36,1)` : 'none',
              }}
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="mt-0.5 shrink-0" style={{ fontSize: 7, color: 'rgba(80,220,100,0.6)', marginTop: 6 }}>◆</span>
                <h4 className="text-[15px] font-medium tracking-tight" style={{ color: '#e8f5ea' }}>{p.title}</h4>
              </div>
              <p className="pl-5 text-[13px] leading-relaxed" style={{ color: 'rgba(232,245,234,0.4)' }}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Right — slides from right */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-3"
          style={{
            background: 'rgba(17,26,19,0.5)',
            border:     '1px solid rgba(60,180,80,0.12)',
            opacity:    visible ? 1 : 0,
            transform:  visible ? 'translateX(0)' : 'translateX(44px)',
            transition: visible ? 'opacity .7s .1s ease, transform .8s .1s cubic-bezier(.22,1,.36,1)' : 'none',
          }}
        >
          <p style={{ fontSize: 10, color: 'rgba(80,220,100,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Recent deliveries
          </p>
          {DELIVERIES.map((d, i) => (
            <DeliveryRow key={d.title} d={d} index={i} visible={visible} />
          ))}
        </div>

      </div>
    </section>
  )
}
