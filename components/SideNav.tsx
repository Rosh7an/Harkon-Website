'use client'

import { useEffect, useState } from 'react'

const SECTIONS = ['hero', 'about', 'services', 'process', 'stats', 'pricing', 'cta']

export default function SideNav() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const sections = SECTIONS.map(id => document.getElementById(id))
    let frame: number | null = null
    const updateActive = () => {
      frame = null
      if (window.scrollY < 100) {
        setActive(0)
        return
      }
      
      let currentIdx = 0
      for (let i = 0; i < SECTIONS.length; i++) {
        const el = sections[i]
        if (el) {
          const rect = el.getBoundingClientRect()
          // If the top of the section is above the middle-ish of the viewport
          if (rect.top <= window.innerHeight * 0.4) {
            currentIdx = i
          }
        }
      }
      setActive(currentIdx)
    }
    const handleScroll = () => {
      if (frame === null) frame = requestAnimationFrame(updateActive)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Run once on mount after layout
    const timer = setTimeout(handleScroll, 100)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timer)
      if (frame !== null) cancelAnimationFrame(frame)
    }
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
          aria-label={id === 'pricing' ? 'Solution Planner' : id}
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
