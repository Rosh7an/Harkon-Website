'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SERVICE_GROUPS } from '@/utils/siteContent'
import s from './Home.module.css'

/**
 * Three goal cards. The open one widens and lists its services. Nothing
 * changes on its own or on hover: a card opens only when clicked or tapped,
 * so the layout never shifts under the pointer.
 */
export default function OnePlace() {
  const [active, setActive] = useState(0)

  return (
    <div className={s.cards}>
      {SERVICE_GROUPS.map((group, index) => {
        const on = index === active
        return (
          <div key={group.id} className={on ? s.cardOn : s.card}>
            <button type="button" className={on ? s.cardHead : `${s.cardHead} ${s.cardHeadIdle}`} aria-expanded={on} aria-controls={`goal-${group.id}`} onClick={() => setActive(index)}>
              <span className={s.cardTop}>
                <span className={s.cardNum}>{index + 1}</span>
                <span className={s.cardCount}>{group.services.length} SERVICES</span>
              </span>
              <span className={s.cardTitle}>{group.label}</span>
              <span className={s.cardLine}>{group.line}</span>
            </button>
            <div id={`goal-${group.id}`} hidden={!on}>
              {on && (
                <div className={s.cardItems}>
                  {group.services.map((service, i) => (
                    <Link key={service.slug} href={service.href ?? `/services#${service.slug}`} className={s.cardItem} style={{ animationDelay: `${i * 0.06}s` }}>
                      <span>{service.name}</span>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {!on && (
              <div className={s.cardIdle} aria-hidden="true">
                View services
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
