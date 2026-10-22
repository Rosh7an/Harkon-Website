import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

const routing = vi.hoisted(() => ({ push: vi.fn(), pathname: '/' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routing.push }), usePathname: () => routing.pathname }))
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: ComponentProps<'img'> & { priority?: boolean }) => <img {...props} /> }))
import Nav from '../components/Nav'
import Hero from '../components/Hero'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
const toggle = () => container.querySelector<HTMLButtonElement>('[aria-label="Menu"]')!
const dialog = () => container.querySelector<HTMLDivElement>('[role="dialog"]')
const click = async (element: HTMLElement) => { await act(async () => { element.click() }) }

beforeEach(() => {
  routing.pathname = '/'
  routing.push.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  vi.stubGlobal('innerWidth', 375)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  document.body.style.overflow = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('responsive navigation interactions', () => {
  it.each([320, 375, 768, 1023])('opens and dismisses the menu at width %i without losing the page scroll setting', async width => {
    vi.stubGlobal('innerWidth', width)
    document.body.style.overflow = 'clip'
    await act(async () => { root.render(<Nav />) })
    expect(dialog()).toBeNull()
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    await click(toggle())
    expect(toggle().getAttribute('aria-controls')).toBe(dialog()!.id)
    expect(document.body.style.overflow).toBe('hidden')
    expect(dialog()!.querySelector('button')).toBe(document.activeElement)
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(toggle())
    expect(document.body.style.overflow).toBe('clip')
  })
  it('keeps keyboard focus within the open menu controls', async () => {
    await act(async () => { root.render(<Nav />) })
    await click(toggle())
    const buttons = dialog()!.querySelectorAll('button')
    const last = buttons[buttons.length - 1]
    last.focus()
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })) })
    expect(document.activeElement).toBe(toggle())
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })) })
    expect(document.activeElement).toBe(last)
  })
  it('closes on desktop resize and releases the scroll lock at the breakpoint', async () => {
    await act(async () => { root.render(<Nav />) })
    await click(toggle())
    vi.stubGlobal('innerWidth', 1023)
    await act(async () => { window.dispatchEvent(new Event('resize')) })
    expect(dialog()).not.toBeNull()
    vi.stubGlobal('innerWidth', 1024)
    await act(async () => { window.dispatchEvent(new Event('resize')) })
    expect(dialog()).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })
  it('closes gracefully when a home-page section is absent', async () => {
    await act(async () => { root.render(<Nav />) })
    await click(toggle())
    await click([...dialog()!.querySelectorAll('button')].find(button => button.textContent === 'Services')!)
    expect(dialog()).toBeNull()
    expect(routing.push).not.toHaveBeenCalled()
    expect(document.body.style.overflow).toBe('')
  })
  it('navigates home to the selected section from another page', async () => {
    routing.pathname = '/pricing'
    await act(async () => { root.render(<Nav />) })
    await click(toggle())
    await click([...dialog()!.querySelectorAll('button')].find(button => button.textContent === 'Services')!)
    expect(routing.push).toHaveBeenCalledWith('/#services')
    expect(dialog()).toBeNull()
  })
  it('restores the previous scroll setting when an open menu unmounts', async () => {
    document.body.style.overflow = 'auto'
    await act(async () => { root.render(<Nav />) })
    await click(toggle())
    await act(async () => { root.render(null) })
    expect(document.body.style.overflow).toBe('auto')
  })
})

describe('hero content and navigation', () => {
  it('retains the banner and actions when canvas is unavailable, and tolerates missing destinations', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await act(async () => { root.render(<Hero />) })
    expect(container.textContent).toContain('Digital solutions for growing businesses')
    expect(container.querySelectorAll('.hero-stat-item')).toHaveLength(4)
    const buttons = [...container.querySelectorAll('button')]
    for (const button of buttons) await click(button)
    const destination = document.createElement('section')
    destination.id = 'services'
    destination.scrollIntoView = vi.fn()
    container.append(destination)
    await click(buttons[0])
    expect(destination.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
