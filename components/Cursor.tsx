'use client'

import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchMedia('(pointer:fine)').matches) return

    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = 0, my = 0, rx = 0, ry = 0
    let rafId: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      dot.style.left = mx + 'px'
      dot.style.top  = my + 'px'
    }

    const lag = () => {
      rx += (mx - rx) * 0.1
      ry += (my - ry) * 0.1
      ring.style.left = rx + 'px'
      ring.style.top  = ry + 'px'
      rafId = requestAnimationFrame(lag)
    }

    document.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(lag)

    const hoverEls = document.querySelectorAll('a,button,[data-cursor-hover]')
    const addHov   = () => { dot.classList.add('hov'); ring.classList.add('hov') }
    const rmHov    = () => { dot.classList.remove('hov'); ring.classList.remove('hov') }
    hoverEls.forEach(el => { el.addEventListener('mouseenter', addHov); el.addEventListener('mouseleave', rmHov) })

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}
