'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'

type RevealState = 'in' | 'below' | 'above'

/** Where an element sits relative to the viewport, from its observer entry. */
export function revealState(entry: { isIntersecting: boolean; boundingClientRect: { top: number } }): RevealState {
  if (entry.isIntersecting) return 'in'
  return entry.boundingClientRect.top < 0 ? 'above' : 'below'
}

/**
 * Decides the next state with a dead zone so it never flickers: "in" only
 * once the element is clearly visible (15% of it, or 10% of the screen for
 * tall sections), "out" only when almost nothing is left (under 5% or 40px).
 * Anything in between keeps the current state. Returns null to keep it.
 */
export function nextRevealState(visible: number, elementHeight: number, viewportHeight: number, top: number): RevealState | null {
  if (visible >= Math.min(elementHeight * 0.15, viewportHeight * 0.1)) return 'in'
  if (visible <= Math.min(elementHeight * 0.05, 40)) return top < 0 ? 'above' : 'below'
  return null
}

/**
 * Feather landing: a section glides into place and settles as it enters,
 * moving with the scroll, and floats away and fades as it leaves (see
 * `.reveal` in globals.css). `mode="load"` is for content already on
 * screen when the page opens, such as the hero; `soft` adds a light blur
 * that clears during that first landing. Use it only on static content,
 * since a blur over moving content makes the browser redraw every frame.
 */
export default function Reveal({ children, as: Tag = 'div', delay = 0, mode = 'scroll', soft = false, className = '', style, ...rest }: {
  children: ReactNode
  as?: ElementType
  delay?: number
  mode?: 'scroll' | 'load'
  soft?: boolean
  className?: string
  style?: CSSProperties
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const [state, setState] = useState<RevealState | undefined>(undefined)
  const [landed, setLanded] = useState<false | 'yes' | 'late'>(false)

  // The load landing waits until React has taken over the page and the
  // browser has drawn a frame. Hydration briefly freezes the page; a landing
  // that plays during that freeze skips most of its frames and looks broken.
  useEffect(() => {
    if (mode !== 'load') return
    if (typeof requestAnimationFrame === 'undefined') { setLanded('yes'); return }
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        // If the safety timer already showed the content, don't replay it.
        const shown = ref.current?.getAnimations?.().some(a => (a as CSSAnimation).animationName === 'revealSafety' && a.playState === 'finished')
        setLanded(shown ? 'late' : 'yes')
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [mode])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setState('in'); return }
    const observer = new IntersectionObserver(([entry]) => {
      const viewport = entry.rootBounds?.height ?? window.innerHeight
      const next = nextRevealState(entry.intersectionRect.height, entry.boundingClientRect.height, viewport, entry.boundingClientRect.top)
      if (next) setState(next)
    }, { threshold: [0, 0.02, 0.05, 0.1, 0.15, 0.25, 0.4] })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal ${className}`} data-reveal={state} data-mode={mode} data-landed={(mode === 'load' && landed) || undefined} data-soft={soft || undefined} style={{ ...style, ['--reveal-delay' as string]: `${delay}s` }} {...rest}>
      {children}
    </Tag>
  )
}
