'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PROJECT_FILTERS, filterProjects, type Project } from '@/utils/siteContent'
import Preview from './Preview'
import Reveal from './Reveal'
import ui from './ui.module.css'
import p from './Pages.module.css'

const cover = (tint: string) => ({ background: `radial-gradient(120% 90% at 80% 10%, rgba(${tint}, 0.3), rgba(${tint}, 0.04) 60%), #0D1721` })

/** Full project details in an overlay. Escape, the close button or the backdrop closes it. */
function ProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [onClose])

  return (
    <div className={p.backdrop} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="project-title" className={p.dialog} onClick={event => event.stopPropagation()}>
        <div className={p.dialogCover} style={cover(project.tint)}>
          <span className={p.coverTag}>SAMPLE PROJECT</span>
          <div className={p.coverFrame}><Preview kind={project.kind} /></div>
        </div>
        <div className={p.dialogBody}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <span className={ui.eyebrow} style={{ color: 'var(--accent-text)' }}>{project.category}</span>
            <button ref={closeRef} type="button" className={p.roundBtn} aria-label="Close project details" onClick={onClose}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <h2 id="project-title" className={p.dialogTitle}>{project.title}</h2>
          <p className={p.detailText}>{project.summary}</p>
          <div className={p.built}>
            <span className={ui.eyebrow}>What we built</span>
            <div className={p.builtChips}>{project.built.map(item => <span key={item} className={p.chip} style={{ fontSize: 14 }}>{item}</span>)}</div>
          </div>
          <Link href={`/contact?project=${project.slug}`} className={ui.btnPrimary} style={{ alignSelf: 'flex-start' }}>Build something like this</Link>
        </div>
      </div>
    </div>
  )
}

/** Filter chips over a grid of project cards; a card opens its details. */
export default function WorkGallery() {
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState<Project | null>(null)
  const shown = filterProjects(filter)

  return (
    <>
      <Reveal mode="load" className={p.workHead}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
          <h1 className={ui.h1} style={{ fontSize: 'clamp(42px, 6.2vw, 84px)' }}>Work that <span className={ui.serif}>runs businesses.</span></h1>
          <p className={ui.lede}>Hospital portals, booking systems, CRMs, learning platforms and apps we design and build for growing businesses.</p>
        </div>
      </Reveal>

      <Reveal mode="load" className={p.filterBar} delay={0.1}>
        <div role="group" aria-label="Filter projects by industry" className={p.segmented}>
          {PROJECT_FILTERS.map(name => (
            <button key={name} type="button" aria-pressed={name === filter} className={name === filter ? p.segmentOn : p.segment} onClick={() => setFilter(name)}>{name}</button>
          ))}
        </div>
        <span className={p.count} aria-live="polite">{shown.length} {shown.length === 1 ? 'project' : 'projects'}</span>
      </Reveal>

      <div key={filter} className={p.grid}>
        {shown.map((project, index) => (
          <button key={project.slug} type="button" className={p.project} style={{ animationDelay: `${index * 0.06}s` }} onClick={() => setOpen(project)} aria-haspopup="dialog">
            <span className={p.projectCover} style={cover(project.tint)}><Preview kind={project.kind} /></span>
            <span className={p.projectMeta}>
              <small>{project.category}</small>
              <strong>{project.title}</strong>
              <span className={p.projectSummary}>{project.summary}</span>
              <span className={p.projectMore}>View project →</span>
            </span>
          </button>
        ))}
      </div>
      <p className={p.note}>These are sample projects showing the kind of work we do.</p>

      {open && <ProjectDialog project={open} onClose={() => setOpen(null)} />}
    </>
  )
}
