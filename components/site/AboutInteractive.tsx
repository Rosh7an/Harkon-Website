'use client'

import { useEffect, useState } from 'react'
import { FOUNDERS, STORY, VALUES } from '@/utils/siteContent'
import { prefersReducedMotion, useInView } from './useInView'
import ui from './ui.module.css'
import p from './Pages.module.css'

/** The two founders, each with photo slot, role and short bio. */
export function FounderCards() {
  return (
    <div className={p.founders}>
      {FOUNDERS.map(founder => (
        <article key={founder.name} className={p.person}>
          <div className={p.photo} style={{ background: `radial-gradient(90% 80% at 70% 20%, rgba(${founder.tint}, 0.35), rgba(${founder.tint}, 0.05) 60%), #0D1721` }}>
            <span className={p.photoInitial} aria-hidden="true">{founder.initial}</span>
            <span className={p.photoTag}>FOUNDER PHOTO</span>
          </div>
          <div className={p.personMeta}>
            <div><h3 className={p.personName}>{founder.name}</h3><p className={p.personRole}>{founder.role}</p></div>
          </div>
          <p className={p.bio}>{founder.bio}</p>
        </article>
      ))}
    </div>
  )
}

const STORY_MS = 5200

/** Our story as chapters: arrows, a year scrubber and auto-play until the visitor takes over. */
export function StoryTimeline() {
  const [chapter, setChapter] = useState(0)
  const [auto, setAuto] = useState(true)
  const count = STORY.length
  const { ref, inView } = useInView<HTMLDivElement>(0.5)

  // Starts when the story itself is on screen and pauses when scrolled away.
  useEffect(() => {
    if (!auto || !inView || prefersReducedMotion()) return
    const timer = setInterval(() => setChapter(current => (current + 1) % count), STORY_MS)
    return () => clearInterval(timer)
  }, [auto, inView, count])

  const go = (index: number) => { setChapter((index + count) % count); setAuto(false) }
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div ref={ref}>
      <div className={p.storyHead}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className={ui.eyebrow}>Our story</p>
          <h2 id="story-title" className={ui.h2}>From two founders to <span className={ui.serif}>a full digital partner.</span></h2>
        </div>
        <div className={p.storyNav}>
          <span className={p.storyPos} aria-live="polite">{pad(chapter + 1)} / {pad(count)}</span>
          <button type="button" className={p.roundBtn} aria-label="Previous chapter" onClick={() => go(chapter - 1)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg></button>
          <button type="button" className={p.roundBtnSolid} aria-label="Next chapter" onClick={() => go(chapter + 1)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
        </div>
      </div>

      <div className={ui.glassFrame}>
        <div className={p.stage}>
          <div className={p.stageGlow} aria-hidden="true" />
          {STORY.map((item, index) => {
            const offset = index === chapter ? 'none' : index < chapter ? 'translateX(-40px)' : 'translateX(40px)'
            return (
              <article key={item.short} className={p.chapter} aria-hidden={index !== chapter} style={{ opacity: index === chapter ? 1 : 0, transform: offset, pointerEvents: index === chapter ? 'auto' : 'none' }}>
                <div className={p.chapterYear}><small>CHAPTER {pad(index + 1)}</small><span>{item.when}</span></div>
                <div className={p.chapterBody}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className={p.mark}>{item.mark}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <div className={p.scrubber}>
        <div className={p.track} aria-hidden="true"><span style={{ width: `${(chapter / (count - 1)) * 100}%` }} /></div>
        <div role="tablist" aria-label="Story chapters" className={p.scrubDots}>
          {STORY.map((item, index) => (
            <button key={item.short} type="button" role="tab" aria-selected={index === chapter} className={index === chapter ? p.scrubBtnOn : p.scrubBtn} onClick={() => go(index)}>
              <span className={`${p.scrubDot} ${index < chapter ? p.scrubDone : ''}`} aria-hidden="true" />
              <b>{item.when}</b>
              <span>{item.short}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Mission, vision and values as three tabs with one large quote. */
export function ValuesTabs() {
  const [active, setActive] = useState(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, textAlign: 'center' }}>
      <div role="tablist" aria-label="Mission, vision and values" className={p.segmented}>
        {VALUES.map((value, index) => (
          <button key={value.label} type="button" role="tab" id={`value-tab-${index}`} aria-selected={index === active} aria-controls="value-panel" className={index === active ? p.segmentOn : p.segment} onClick={() => setActive(index)}>{value.label}</button>
        ))}
      </div>
      <div id="value-panel" role="tabpanel" aria-labelledby={`value-tab-${active}`} style={{ minHeight: 210, display: 'flex', alignItems: 'center', maxWidth: 940 }}>
        <p key={active} className={p.quote}>“{VALUES[active].text}”</p>
      </div>
    </div>
  )
}
