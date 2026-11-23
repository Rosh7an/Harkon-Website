'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PROBLEMS, PROJECTS, STEPS } from '@/utils/siteContent'
import Reveal from './Reveal'
import ui from './ui.module.css'
import s from './Home.module.css'

/** Plain facts about how we work, in a 2 by 2 grid (no boxes). */
export const FACTS = [
  { value: '15', unit: ' days', label: 'average time to go live' },
  { value: '24/7', unit: '', label: 'customers can book' },
  { value: '7', unit: '+', label: 'long-term projects' },
  { value: '4', unit: '+ yrs', label: 'building software' },
]

/**
 * The phone home page, kept calm: plain facts, one open list, the work,
 * three steps. No boxed tiles and no extra start buttons, because the hero
 * and the tab bar already offer one clear way to start.
 */
export default function MobileHome() {
  const [open, setOpen] = useState(0)

  return (
    <div className={ui.container}>
      <Reveal as="section" aria-label="Exter Cloud in numbers" className={s.mSection}>
        <dl className={s.facts}>
          {FACTS.map(item => (
            <div key={item.label} className={s.fact}>
              <dt className={s.factLabel}>{item.label}</dt>
              <dd className={s.factValue}>{item.value}<span>{item.unit}</span></dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal as="section" aria-labelledby="m-help" className={s.mSection}>
        <h2 id="m-help" className={s.mTitle}>What do you need help with?</h2>
        <p className={s.mHint}>Tap one to see what we’d build.</p>
        <div className={s.group}>
          {PROBLEMS.map((problem, index) => {
            const isOpen = index === open
            return (
              <div key={problem.label} className={`${s.row} ${isOpen ? s.rowOpen : ''}`}>
                <button type="button" className={s.rowBtn} aria-expanded={isOpen} aria-controls={`m-row-${index}`} onClick={() => setOpen(isOpen ? -1 : index)}>
                  <span className={s.rowNum}>{index + 1}</span>
                  {problem.short}
                  <svg className={s.rowChev} aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </button>
                {isOpen && (
                  <div id={`m-row-${index}`} className={s.rowBody}>
                    <div className={s.rowPills}>{problem.build.map(item => <span key={item}>{item}</span>)}</div>
                    <span className={s.rowOut}>{problem.outcome}</span>
                    <Link href={`/contact?problem=${problem.id}`} className={s.textLink}>Ask us about this →</Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Reveal>

      <Reveal as="section" aria-labelledby="m-work" className={s.mSection}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h2 id="m-work" className={s.mTitle} style={{ margin: 0 }}>Our work</h2>
          <Link href="/work" className={s.textLink}>See all</Link>
        </div>
        <div className={s.swipe}>
          {PROJECTS.slice(0, 4).map(project => (
            <Link key={project.slug} href="/work" className={s.workCard}>
              <span className={s.workCover} style={{ background: `radial-gradient(120% 90% at 80% 10%, rgba(${project.tint}, 0.45), rgba(${project.tint}, 0.05) 60%), #0D1721` }}>
                <span className={s.workTag}>SAMPLE PROJECT</span>
              </span>
              <span className={s.workMeta}><small>{project.category}</small><strong>{project.title}</strong></span>
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" aria-labelledby="m-how" className={s.mSection} style={{ paddingBottom: 48 }}>
        <h2 id="m-how" className={s.mTitle} style={{ marginBottom: 16 }}>How it works</h2>
        <ol className={s.mSteps} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={s.mStep}><b>{index + 1}</b><strong>{step.title}</strong><span>{step.text.split('.')[0]}.</span></li>
          ))}
        </ol>
      </Reveal>

    </div>
  )
}
