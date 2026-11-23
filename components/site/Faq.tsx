'use client'

import { useState } from 'react'
import p from './Pages.module.css'

/**
 * Accordion of questions. Every answer stays in the page (hidden when closed)
 * so search engines can read it.
 */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0)
  return (
    <div className={p.faqList}>
      {items.map((item, index) => {
        const isOpen = index === open
        return (
          <div key={item.q} className={`${p.faqItem} ${isOpen ? p.faqOpen : ''}`}>
            <h3>
              <button type="button" id={`faq-q-${index}`} className={p.faqBtn} aria-expanded={isOpen} aria-controls={`faq-a-${index}`} onClick={() => setOpen(isOpen ? -1 : index)}>
                <span>{item.q}</span>
                <span className={p.faqIcon} aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
              </button>
            </h3>
            <p id={`faq-a-${index}`} role="region" aria-labelledby={`faq-q-${index}`} className={p.faqAnswer} hidden={!isOpen}>{item.a}</p>
          </div>
        )
      })}
    </div>
  )
}
