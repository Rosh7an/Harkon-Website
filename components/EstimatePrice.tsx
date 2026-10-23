'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { PRICE_REVEAL_DELAY_MS, PRICE_REVEAL_END_MS, revealedPrice, type EstimatePricing } from '@/utils/estimatePricing'
import styles from './EstimatePrice.module.css'

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`
const range = (low: number, high: number) => `${money(low)}–${money(high)}`

function PriceReveal({ pricing }: { pricing: EstimatePricing }) {
  const container = useRef<HTMLDivElement>(null)
  const [display, setDisplay] = useState({ low: pricing.standardLow, high: pricing.standardHigh })
  const finalPrice = range(pricing.offerLow, pricing.offerHigh)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setDisplay({ low: pricing.offerLow, high: pricing.offerHigh })
      return
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let start = 0
    let started = false
    let observer: IntersectionObserver | undefined
    let frame = 0
    let timer: ReturnType<typeof setTimeout>
    let lastPaint = 0
    const finish = () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      setDisplay({ low: pricing.offerLow, high: pricing.offerHigh })
    }
    const tick = (now: number) => {
      const elapsed = now - start
      if (elapsed >= PRICE_REVEAL_END_MS) { finish(); return }
      // Only this small component updates; cap text paints at 30fps.
      if (now - lastPaint >= 1000 / 30) {
        setDisplay(revealedPrice(pricing, elapsed))
        lastPaint = now
      }
      frame = requestAnimationFrame(tick)
    }
    const onMotionChange = () => { if (motion.matches) finish() }
    const begin = () => {
      if (started || motion.matches) return
      started = true
      start = performance.now()
      observer?.disconnect()
      timer = setTimeout(() => { frame = requestAnimationFrame(tick) }, PRICE_REVEAL_DELAY_MS)
    }
    if (motion.matches) finish()
    else if (typeof IntersectionObserver === 'function' && container.current) {
      // A restored estimate may start below the fold. Reveal only when seen.
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) begin()
      }, { threshold: 0.15 })
      observer.observe(container.current)
    } else begin()
    motion.addEventListener('change', onMotionChange)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      motion.removeEventListener('change', onMotionChange)
      observer?.disconnect()
    }
  }, [pricing.standardLow, pricing.standardHigh, pricing.offerLow, pricing.offerHigh])

  return <div ref={container} className={styles.pricing}>
    <p className={styles.standard}>Standard price <s>{range(pricing.standardLow, pricing.standardHigh)}</s></p>
    <p className={styles.label}>Promotional build estimate</p>
    <p className={styles.amount}>
      <span className={styles.sizing} aria-hidden="true">{range(pricing.standardLow, pricing.standardHigh)}</span>
      <span className={styles.animated} aria-hidden="true" data-price-final={finalPrice}>{range(display.low, display.high)}</span>
      <span className={styles.printAmount} aria-hidden="true">{finalPrice}</span>
      <span className="sr-only">{finalPrice}</span>
    </p>
    <p className={styles.note}>28.6% off the standard build price. Final scope and quotation require team review.</p>
  </div>
}

// Reset for a genuinely different price, never for unrelated form updates.
export default memo(function EstimatePrice({ pricing }: { pricing: EstimatePricing }) {
  return <PriceReveal key={`${pricing.standardLow}:${pricing.standardHigh}:${pricing.offerLow}:${pricing.offerHigh}`} pricing={pricing} />
})
