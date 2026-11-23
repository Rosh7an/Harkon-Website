'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SERVICE_GROUPS } from '@/utils/siteContent'
import ui from './ui.module.css'
import p from './Pages.module.css'

/** Finds the goal and service index for a slug such as "crm", or null. */
export function locateService(slug: string): { group: number; item: number } | null {
  for (let group = 0; group < SERVICE_GROUPS.length; group++) {
    const item = SERVICE_GROUPS[group].services.findIndex(service => service.slug === slug)
    if (item >= 0) return { group, item }
  }
  return null
}

/**
 * Goal tabs, a list of that goal's services, and a detail panel for the chosen
 * one. A link like /services#crm opens straight on that service.
 */
export default function ServicesExplorer() {
  const [group, setGroup] = useState(0)
  const [item, setItem] = useState(0)

  useEffect(() => {
    const fromHash = () => {
      const found = locateService(decodeURIComponent(window.location.hash.slice(1)))
      if (found) { setGroup(found.group); setItem(found.item) }
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const current = SERVICE_GROUPS[group]
  const service = current.services[item]

  return (
    <div className={p.explorer}>
      <div className={`${ui.ring} ${p.explorerRing}`} aria-hidden="true" />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div role="tablist" aria-label="Business goal" className={p.segmented}>
          {SERVICE_GROUPS.map((goal, index) => (
            <button key={goal.id} type="button" role="tab" aria-selected={index === group} className={index === group ? p.segmentOn : p.segment} onClick={() => { setGroup(index); setItem(0) }}>
              <small>0{index + 1}</small>{goal.label}
            </button>
          ))}
        </div>
      </div>

      <div className={ui.glassFrame}>
        <div className={`${ui.glassInner} ${p.explorerBody}`}>
          <div className={p.svcList}>
            <p className={p.svcGoalLine}>{current.line}</p>
            {current.services.map((svc, index) => (
              <button key={svc.slug} type="button" aria-pressed={index === item} aria-controls="service-detail" className={index === item ? p.svcRowOn : p.svcRow} onClick={() => setItem(index)}>
                <span className={p.svcBadge}>0{index + 1}</span>
                <span className={p.svcRowText}><strong>{svc.name}</strong><small>{svc.tag}</small></span>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            ))}
          </div>

          <article id="service-detail" className={p.detail} aria-live="polite">
            <div className={p.detailTop}>
              <span className={p.tag}>{service.tag}</span>
              <span className={p.pos}>{item + 1} / {current.services.length}</span>
            </div>
            <h3 key={service.slug} className={p.detailTitle}>{service.name}</h3>
            <p className={p.detailText}>{service.does}</p>
            <ul className={p.gets}>
              <li className={p.getsLabel}>WHAT YOU GET</li>
              {service.gets.map(get => (
                <li key={get} className={p.get}>
                  <span className={p.check}><svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg></span>{get}
                </li>
              ))}
            </ul>
            <div className={p.goodFor}>Good for {service.goodFor.map(x => <span key={x} className={p.chip}>{x}</span>)}</div>
            <div className={p.actions}>
              <Link href={`/contact?service=${service.slug}`} className={ui.btnPrimary}>Talk to us about this</Link>
              {service.href && <Link href={service.href} className={ui.btnGhost}>Try the demo</Link>}
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
