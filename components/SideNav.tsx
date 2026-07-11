'use client'

import { useEffect, useState } from 'react'

const SECTIONS = ['hero', 'about', 'services', 'process', 'stats', 'cta']

export default function SideNav() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    SECTIONS.forEach((id, idx) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(idx) },
        { threshold: 0.45 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="snav fixed right-4 top-1/2 z-40 flex flex-col gap-2.5 items-center"
      style={{ transform: 'translateY(-50%)' }}
    >
      {SECTIONS.map((id, i) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          aria-label={id}
          style={{
            width:        4,
            height:       active === i ? 20 : 4,
            borderRadius: 2,
            background:   active === i ? 'var(--accent)' : 'var(--border-hi)',
            boxShadow:    active === i ? '0 0 8px var(--accent)' : 'none',
            border:       'none',
            padding:      0,
            cursor:       'pointer',
            transition:   'all 0.4s ease',
            outline:      'none',
          }}
        />
      ))}
    </div>
  )
}
