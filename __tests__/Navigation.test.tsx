import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

const routing = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => routing.pathname }))
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: ComponentProps<'img'> & { priority?: boolean }) => <img {...props} /> }))
import Nav, { NAV_LINKS, isActive } from '../components/Nav'
import HomeHero from '../components/site/HomeHero'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement

beforeEach(() => {
  routing.pathname = '/'
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.unstubAllEnvs()
  document.documentElement.removeAttribute('data-theme')
  localStorage.clear()
})

const render = async (node: React.ReactNode) => { await act(async () => { root.render(node) }) }
const mainLinks = () => [...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Main navigation"] a')]
const tabLinks = () => [...container.querySelectorAll<HTMLAnchorElement>('nav[aria-label="App navigation"] a')]

describe('isActive', () => {
  it('matches the page itself and pages inside it', () => {
    expect(isActive('/services', '/services')).toBe(true)
    expect(isActive('/services/booking', '/services')).toBe(true)
  })
  it('does not match look-alike or unrelated paths', () => {
    expect(isActive('/services-old', '/services')).toBe(false)
    expect(isActive('/', '/services')).toBe(false)
    expect(isActive('/services', '/')).toBe(false)
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('', '/about')).toBe(false)
  })
})

describe('Nav', () => {
  it('links to every main page, and Start a project opens the cost estimator', async () => {
    await render(<Nav />)
    expect(mainLinks().map(a => a.getAttribute('href'))).toEqual(NAV_LINKS.map(link => link.href))
    expect([...container.querySelectorAll('a[href="/cost-estimator"]')].map(a => a.textContent)).toContain('Start a project')
    // Contact stays reachable on its own, so it is never a dead loop on the Contact page.
    expect([...container.querySelectorAll('a[href="/contact"]')].map(a => a.textContent)).not.toContain('Start a project')
  })

  it('hides Start a project on the cost estimator itself and marks the Start tab as current', async () => {
    routing.pathname = '/cost-estimator'
    await render(<Nav />)
    expect([...container.querySelectorAll('a')].map(a => a.textContent)).not.toContain('Start a project')
    const start = tabLinks().find(a => a.getAttribute('href') === '/cost-estimator')!
    expect(start.getAttribute('aria-current')).toBe('page')
  })

  it('marks the current section, including nested pages', async () => {
    routing.pathname = '/services/booking'
    await render(<Nav />)
    const current = mainLinks().filter(a => a.getAttribute('aria-current') === 'page')
    expect(current.map(a => a.textContent)).toEqual(['Services'])
    expect(tabLinks().find(a => a.getAttribute('aria-current') === 'page')!.textContent).toBe('Services')
  })

  it('marks Home only on the home page', async () => {
    await render(<Nav />)
    expect(tabLinks().find(a => a.getAttribute('aria-current') === 'page')!.textContent).toBe('Home')
    expect(mainLinks().filter(a => a.getAttribute('aria-current')).map(a => a.textContent)).toEqual(['Home'])
  })

  it('shows the WhatsApp shortcut only when a valid number is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PHONE', '')
    await render(<Nav />)
    expect(container.querySelector('a[aria-label="Chat on WhatsApp"]')).toBeNull()
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PHONE', '+91 98765 43210')
    await render(<Nav key="again" />)
    expect(container.querySelector<HTMLAnchorElement>('a[aria-label="Chat on WhatsApp"]')!.href).toMatch(/^https:\/\/wa\.me\/919876543210/)
  })

  it('switches and remembers the theme', async () => {
    await render(<Nav />)
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="Switch to light theme"]')!
    await act(async () => { toggle.click() })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(container.querySelector('button[aria-label="Switch to dark theme"]')).not.toBeNull()
  })
})

describe('HomeHero', () => {
  it('states what Exter Cloud does with a clear way to start', async () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_PHONE', '')
    await render(<HomeHero />)
    expect(container.querySelector('h1')!.textContent).toBe('Grow your business. We handle the digital.')
    expect(container.querySelector('a[href="/cost-estimator"]')!.textContent).toContain('Start a project')
    // Without WhatsApp configured the second button falls back to the services page.
    expect(container.querySelector('a[href="/services"]')).not.toBeNull()
  })
  it('lands each piece a beat apart: headline, line, buttons, showcase', async () => {
    await render(<HomeHero />)
    const pieces = [...container.querySelectorAll('.reveal[data-mode="load"]')] as HTMLElement[]
    expect(pieces.map(el => el.tagName)).toEqual(['H1', 'P', 'DIV', 'DIV'])
    const delays = pieces.map(el => parseFloat(el.style.getPropertyValue('--reveal-delay')))
    expect(delays).toEqual([0, 0.07, 0.14, 0.2])
    // Only the static text gets the soft blur, never the buttons or the live showcase.
    expect(pieces.map(el => el.hasAttribute('data-soft'))).toEqual([true, true, false, false])
  })
})
