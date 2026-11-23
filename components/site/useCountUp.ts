'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Counts from 0 to `target` once, the first time `ref` scrolls into view.
 * Shows the final value straight away when motion is reduced or the
 * browser has no IntersectionObserver.
 */
export function useCountUp<T extends Element>(target: number, duration = 1600) {
  const ref = useRef<T>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!el || reduce || typeof IntersectionObserver === 'undefined') { setValue(target); return }
    let raf = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [target, duration])

  return { ref, value }
}
