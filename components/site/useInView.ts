'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Whether the element is currently on screen (at least `threshold` of it).
 * Carousels and auto-play use this so they start when the visitor reaches
 * them and pause when scrolled away. Without IntersectionObserver (old
 * browsers, tests) it reports visible so nothing is stuck.
 */
export function useInView<T extends Element>(threshold = 0.4) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold })
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

/** True when the visitor has asked for less motion. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
