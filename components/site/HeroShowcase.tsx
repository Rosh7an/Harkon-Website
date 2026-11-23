'use client'

import { useEffect, useState } from 'react'
import { prefersReducedMotion, useInView } from './useInView'
import s from './HeroShowcase.module.css'

/** The channels a business runs on, placed around the hub (x, y in % of the diagram). */
export const NODES = [
  { id: 'website', label: 'Website', x: 50, y: 9, event: 'New enquiry from your website', icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></> },
  { id: 'google', label: 'Google', x: 89, y: 30, event: 'Found in a nearby search', icon: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></> },
  { id: 'social', label: 'Instagram', x: 89, y: 70, event: 'New reel reached new people', icon: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /></> },
  { id: 'whatsapp', label: 'WhatsApp', x: 50, y: 91, event: 'Customer question answered', icon: <path d="M20 11.6a8 8 0 0 1-11.9 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" /> },
  { id: 'customers', label: 'Customers', x: 11, y: 70, event: 'Follow-up turned into a sale', icon: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5M16 4.5a3.5 3.5 0 0 1 0 7" /></> },
  { id: 'payments', label: 'Payments', x: 11, y: 30, event: 'Invoice paid online', icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></> },
] as const

/**
 * Illustrative growth figures. They count up from zero when the showcase
 * comes into view, then keep rising a little with every event, so the
 * picture reads as "your numbers going up" without promising any figure.
 */
export const GROWTH = [
  { id: 'visitors', label: 'Website visitors', target: 12480, step: 86 },
  { id: 'customers', label: 'New customers', target: 386, step: 3 },
  { id: 'revenue', label: 'Revenue', target: 860000, step: 6400 },
] as const

const CYCLE_MS = 2600
const COUNT_MS = 4200

export function formatGrowth(id: string, value: number): string {
  if (id !== 'revenue') return Math.round(value).toLocaleString('en-IN')
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

/**
 * The three growth tiles. Kept separate so the count-up only re-renders these
 * tiles, not the whole hub, which keeps the animation smooth.
 */
function GrowthTiles({ inView, bumps }: { inView: boolean; bumps: number }) {
  const [counted, setCounted] = useState(false)
  const [values, setValues] = useState<number[]>(GROWTH.map(() => 0))

  // Count up from zero the first time the showcase is seen.
  useEffect(() => {
    if (!inView || counted) return
    if (prefersReducedMotion()) { setValues(GROWTH.map(g => g.target)); setCounted(true); return }
    // One update per screen frame, so the digits roll smoothly instead of
    // stepping 20 times a second.
    let raf = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / COUNT_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      setValues(GROWTH.map(g => g.target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setCounted(true)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, counted])

  // Events that happen during the count-up still count once it finishes.
  const extra = counted ? bumps : 0

  return (
    <div className={s.growth} aria-label="Your growth">
      {GROWTH.map((g, i) => (
        <div key={g.id} className={s.metric}>
          <span className={s.metricLabel}>{g.label}</span>
          <span className={s.metricValue} data-metric={g.id}>{formatGrowth(g.id, values[i] + g.step * extra)}</span>
          <svg className={s.spark} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
            <polyline className={inView ? s.sparkLineOn : s.sparkLine} points="0,26 14,23 28,24 42,18 56,17 70,11 84,8 100,2" />
          </svg>
        </div>
      ))}
    </div>
  )
}

const Icon = ({ d, size = 18 }: { d: React.ReactNode; size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

/**
 * The hero's live picture of a business with every channel connected to it:
 * all links stay live, events flow in from each channel in turn, and the
 * business's numbers climb. Plays while on screen and not hovered; tapping a
 * channel shows its latest event.
 */
export default function HeroShowcase() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)
  const [extra, setExtra] = useState(0)
  const { ref, inView } = useInView<HTMLDivElement>(0.3)

  // Events flow in from each channel in turn; each one nudges the numbers up.
  useEffect(() => {
    if (!auto || !inView || hover || prefersReducedMotion()) return
    const timer = setInterval(() => {
      setActive(current => (current + 1) % NODES.length)
      setExtra(current => current + 1)
    }, CYCLE_MS)
    return () => clearInterval(timer)
  }, [auto, inView, hover])

  const node = NODES[active]
  const previous = NODES[(active + NODES.length - 1) % NODES.length]

  return (
    <div ref={ref} className={s.wrap} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className={s.ring} aria-hidden="true" />
      <div className={s.frame}>
        <div className={s.inner}>
          <div className={s.top}>
            <span>YOUR BUSINESS, CONNECTED</span>
            <span className={s.live}><i aria-hidden="true" />Live</span>
          </div>

          <div className={s.hub}>
            <svg className={s.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {NODES.map((n, i) => (
                <line key={n.id} x1={n.x} y1={n.y} x2="50" y2="50" className={i === active ? s.lineHot : s.line} style={{ animationDelay: `${-i * 0.13}s` }} />
              ))}
            </svg>
            <div className={s.core} aria-hidden="true">
              <span className={s.corePulse} key={active} />
              <span className={s.coreLabel}>Your<br />business</span>
            </div>
            <div role="tablist" aria-label="Your business channels">
              {NODES.map((n, i) => (
                <button
                  key={n.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-controls="hub-event"
                  className={i === active ? s.nodeOn : s.node}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  onClick={() => { setActive(i); setAuto(false) }}
                >
                  <span className={s.nodeIcon}><Icon d={n.icon} /></span>
                  <span className={s.nodeLabel}>{n.label}</span>
                </button>
              ))}
            </div>
          </div>

          <GrowthTiles inView={inView} bumps={extra} />

          <div id="hub-event" role="tabpanel" className={s.event} aria-live="polite">
            <div key={active} className={s.eventMain}>
              <span className={s.eventIcon}><Icon d={node.icon} size={16} /></span>
              <strong>{node.event}</strong>
              <em>NOW</em>
            </div>
            <div className={s.eventOld}><Icon d={previous.icon} size={14} /><span>{previous.event}</span><em>EARLIER</em></div>
          </div>
        </div>
      </div>
    </div>
  )
}
