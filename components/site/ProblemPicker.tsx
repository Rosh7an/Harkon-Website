'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PROBLEMS } from '@/utils/siteContent'
import { prefersReducedMotion, useInView } from './useInView'
import ui from './ui.module.css'
import s from './Home.module.css'

const CYCLE_MS = 3600

/**
 * "What's holding your business back?" Cycles through the problems on its own
 * until the visitor picks one, then stays on their choice.
 */
export default function ProblemPicker() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [hover, setHover] = useState(false)
  const { ref, inView } = useInView<HTMLDivElement>()

  // Only cycles while on screen and not under the pointer.
  useEffect(() => {
    if (!auto || !inView || hover || prefersReducedMotion()) return
    const timer = setInterval(() => setActive(current => (current + 1) % PROBLEMS.length), CYCLE_MS)
    return () => clearInterval(timer)
  }, [auto, inView, hover])

  const current = PROBLEMS[active]

  return (
    <div ref={ref} className={s.picker} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className={`${ui.ring} ${s.pickerRing}`} aria-hidden="true" />
      <div className={ui.glassFrame}>
        <div className={`${ui.glassInner} ${s.pickerBody}`}>
          <div className={s.pickerList}>
            <h2 className={s.pickerTitle}>What’s holding your business back?</h2>
            <p className={s.pickerHint}>Pick one. We’ll show you what we would build.</p>
            <div role="tablist" aria-label="Business problems" className={s.problems}>
              {PROBLEMS.map((problem, index) => (
                <button
                  key={problem.label}
                  type="button"
                  role="tab"
                  id={`problem-tab-${index}`}
                  aria-selected={index === active}
                  aria-controls="problem-panel"
                  className={index === active ? s.problemOn : s.problem}
                  onClick={() => { setActive(index); setAuto(false) }}
                >
                  <span>{problem.label}</span>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              ))}
            </div>
          </div>

          <div role="tabpanel" id="problem-panel" aria-labelledby={`problem-tab-${active}`} className={s.panel}>
            <p className={s.panelLabel}>What you’d get</p>
            {/* key remounts the content so the entrance animation replays on every change */}
            <div key={active} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div className={s.pills}>
                {current.build.map((item, index) => <span key={item} className={`${ui.pill} ${ui.rise}`} style={{ animationDelay: `${index * 0.1}s` }}>{item}</span>)}
              </div>
              <p className={`${s.outcome} ${ui.rise}`} style={{ animationDelay: '.35s' }}>{current.outcome}</p>
            </div>
            <div className={s.panelFoot}>
              <span>Designed, built and launched by one team</span>
              <Link href={`/contact?problem=${current.id}`} className={s.textLink}>Talk to us about this →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
