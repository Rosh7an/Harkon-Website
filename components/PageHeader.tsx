'use client'

import { useState, useEffect, type ReactNode } from 'react'

export default function PageHeader({
  label,
  title,
  desc,
}: {
  label: string
  title: ReactNode
  desc: string
}) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t) }, [])

  const base = 'transition-[opacity,transform] ease-out'

  return (
    <div className="px-6 md:px-12 lg:px-16 pt-16 pb-14 max-w-6xl mx-auto" style={{ borderBottom: '1px solid rgba(60,180,80,0.08)' }}>
      <p
        className={`text-[11px] tracking-[0.14em] uppercase mb-5 ${base}`}
        style={{ color: 'rgba(80,220,100,0.5)', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(16px)', transitionDuration: '500ms' }}
      >
        {label}
      </p>
      <h1
        className={`text-5xl md:text-6xl font-normal mb-6 leading-[1.06] ${base}`}
        style={{ color: '#e8f5ea', letterSpacing: '-0.035em', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(20px)', transitionDuration: '600ms', transitionDelay: '90ms' }}
      >
        {title}
      </h1>
      <p
        className={`text-[15px] max-w-2xl leading-relaxed ${base}`}
        style={{ color: 'rgba(232,245,234,0.4)', opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(20px)', transitionDuration: '600ms', transitionDelay: '180ms' }}
      >
        {desc}
      </p>
    </div>
  )
}
