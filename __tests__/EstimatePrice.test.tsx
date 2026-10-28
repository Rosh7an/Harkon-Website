import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EstimatePrice from '../components/EstimatePrice'
import { estimatePricing, PRICE_REVEAL_END_MS } from '../utils/estimatePricing'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
describe('estimate price presentation', () => {
  it('holds the starting amount and reveals the adjacent standard price only after the offer settles', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    vi.stubGlobal('IntersectionObserver', undefined)
    let frame: FrameRequestCallback = () => {}
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1 })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(performance, 'now').mockReturnValue(0)
    await act(async () => root.render(<EstimatePrice pricing={estimatePricing(100000, 200000)} />))
    const standard = container.querySelector('[data-revealed]')!
    const animated = container.querySelector('[data-price-final]')!
    expect(standard.getAttribute('aria-hidden')).toBe('true')
    expect(animated.textContent).toBe('₹1,40,000–₹2,80,000')
    expect(animated.closest('p')?.nextElementSibling).toBe(standard)
    await act(async () => vi.advanceTimersByTime(1000))
    await act(async () => frame(1500))
    expect(standard.getAttribute('data-revealed')).toBe('false')
    await act(async () => frame(PRICE_REVEAL_END_MS))
    expect(animated.textContent).toBe('₹1,00,000–₹2,00,000')
    expect(standard.getAttribute('aria-hidden')).toBe('false')
    expect(standard.getAttribute('data-revealed')).toBe('true')
  })
  it('shows the final comparison immediately with reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    await act(async () => root.render(<EstimatePrice pricing={estimatePricing(0, 0)} />))
    expect(container.querySelector('[data-revealed]')?.getAttribute('data-revealed')).toBe('true')
    expect(container.querySelector('[data-price-final]')?.textContent).toBe('₹0–₹0')
  })
  it('shows the offer without animation when motion support is unavailable', async () => {
    vi.stubGlobal('matchMedia', undefined)
    await act(async () => root.render(<EstimatePrice pricing={estimatePricing(10, 20)} />))
    expect(container.querySelector('[data-revealed]')?.getAttribute('data-revealed')).toBe('true')
    expect(container.querySelector('[data-price-final]')?.textContent).toBe('₹10–₹20')
  })
})
