import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }))
vi.mock('next/image', () => ({ default: (props: ComponentProps<'img'>) => <img {...props} /> }))
import { ALL_SERVICES, PROBLEMS, PROJECTS, PROJECT_FILTERS, SERVICE_GROUPS, STORY, filterProjects } from '../utils/siteContent'
import ProblemPicker from '../components/site/ProblemPicker'
import HeroShowcase, { GROWTH, NODES, formatGrowth } from '../components/site/HeroShowcase'
import OnePlace from '../components/site/OnePlace'
import ServicesExplorer, { locateService } from '../components/site/ServicesExplorer'
import Faq from '../components/site/Faq'
import BookingDemo, { INDUSTRIES } from '../components/site/BookingDemo'
import WorkGallery from '../components/site/WorkGallery'
import { FounderCards, StoryTimeline, ValuesTabs } from '../components/site/AboutInteractive'
import ContactForm, { composeMessage } from '../components/site/ContactForm'
import SendEstimate, { estimateMessage } from '../components/site/SendEstimate'
import MobileHome, { FACTS } from '../components/site/MobileHome'
import Reveal, { nextRevealState, revealState } from '../components/site/Reveal'
import { detectInterests, mergeInterests, prefillFromQuery } from '../utils/contactPrefill'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.location.hash = ''
})

const render = async (node: React.ReactNode) => { await act(async () => { root.render(node) }) }
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }) }
const byText = (selector: string, text: string) => [...container.querySelectorAll(selector)].find(el => el.textContent?.includes(text))!
const type = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('site content', () => {
  it('lists 12 services in 3 goals with unique slugs', () => {
    expect(SERVICE_GROUPS).toHaveLength(3)
    expect(ALL_SERVICES).toHaveLength(12)
    expect(new Set(ALL_SERVICES.map(s => s.slug)).size).toBe(12)
  })
  it('only suggests services that exist for each problem', () => {
    const names = new Set(ALL_SERVICES.map(s => s.name))
    for (const problem of PROBLEMS) for (const item of problem.build) expect(names.has(item), item).toBe(true)
  })
  it('filters projects by tag, and every filter has at least one project', () => {
    expect(filterProjects('All')).toEqual(PROJECTS)
    expect(filterProjects('CRM').map(p => p.slug)).toEqual(['real-estate-crm'])
    for (const filter of PROJECT_FILTERS) expect(filterProjects(filter).length, filter).toBeGreaterThan(0)
    expect(filterProjects('Unknown')).toEqual([])
  })
})

describe('locateService', () => {
  it('finds a service by slug in any goal', () => {
    expect(locateService('websites')).toEqual({ group: 0, item: 0 })
    expect(locateService('crm')).toEqual({ group: 1, item: 1 })
    expect(locateService('custom-software')).toEqual({ group: 2, item: 3 })
  })
  it('returns null for empty or unknown slugs', () => {
    expect(locateService('')).toBeNull()
    expect(locateService('nope')).toBeNull()
  })
})

describe('composeMessage', () => {
  it('puts chosen interests before the message', () => {
    expect(composeMessage(['Website', 'CRM'], '  We run a clinic. ')).toBe('Interested in: Website, CRM\n\nWe run a clinic.')
  })
  it('sends only the message when nothing is chosen', () => {
    expect(composeMessage([], 'Hello there team')).toBe('Hello there team')
  })
})

describe('ProblemPicker', () => {
  it('cycles on its own, then stays on the problem the visitor picks', async () => {
    vi.useFakeTimers()
    await render(<ProblemPicker />)
    const selected = () => container.querySelector('[role="tab"][aria-selected="true"]')!.textContent
    expect(selected()).toBe(PROBLEMS[0].label)
    await act(async () => { vi.advanceTimersByTime(3600) })
    expect(selected()).toBe(PROBLEMS[1].label)
    await click(byText('[role="tab"]', PROBLEMS[3].label))
    expect(selected()).toBe(PROBLEMS[3].label)
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toContain(PROBLEMS[3].outcome)
    await act(async () => { vi.advanceTimersByTime(20000) })
    expect(selected()).toBe(PROBLEMS[3].label)
  })
})

describe('HeroShowcase', () => {
  it('cycles through the channels, then stays on the one the visitor taps', async () => {
    vi.useFakeTimers()
    await render(<HeroShowcase />)
    const selected = () => container.querySelector('[role="tab"][aria-selected="true"]')!.textContent
    const event = () => container.querySelector('#hub-event strong')!.textContent
    expect(selected()).toBe(NODES[0].label)
    expect(event()).toBe(NODES[0].event)
    await act(async () => { vi.advanceTimersByTime(2600) })
    expect(selected()).toBe(NODES[1].label)
    await click(byText('[role="tab"]', 'Payments'))
    expect(event()).toBe('Invoice paid online')
    await act(async () => { vi.advanceTimersByTime(20000) })
    expect(selected()).toBe('Payments')
  })
  it('pauses while the pointer is over it', async () => {
    vi.useFakeTimers()
    await render(<HeroShowcase />)
    await act(async () => { container.firstElementChild!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(container.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toBe(NODES[0].label)
  })
  it('keeps every channel connected, not just the active one', async () => {
    await render(<HeroShowcase />)
    expect(container.querySelectorAll('svg line')).toHaveLength(NODES.length)
    const classes = [...container.querySelectorAll('svg line')].map(line => line.getAttribute('class'))
    expect(classes.every(c => c && c.length > 0)).toBe(true)
  })
  it('counts the growth numbers up from zero, then keeps them rising with each event', async () => {
    vi.useFakeTimers()
    await render(<HeroShowcase />)
    const value = (id: string) => container.querySelector(`[data-metric="${id}"]`)!.textContent
    expect(value('visitors')).toBe('0')
    await act(async () => { vi.advanceTimersByTime(2000) })
    const midway = Number(value('visitors')!.replace(/,/g, ''))
    expect(midway).toBeGreaterThan(0)
    expect(midway).toBeLessThan(GROWTH[0].target)
    await act(async () => { vi.advanceTimersByTime(2400) })
    // One event has fired during the count (at 2.6s), so the figures sit one step above target.
    expect(value('visitors')).toBe(formatGrowth('visitors', GROWTH[0].target + GROWTH[0].step))
    expect(value('revenue')).toBe(formatGrowth('revenue', GROWTH[2].target + GROWTH[2].step))
  })
})

describe('formatGrowth', () => {
  it('formats counts with Indian grouping and revenue in rupees or lakhs', () => {
    expect(formatGrowth('visitors', 12480)).toBe('12,480')
    expect(formatGrowth('customers', 0)).toBe('0')
    expect(formatGrowth('revenue', 45000)).toBe('₹45,000')
    expect(formatGrowth('revenue', 860000)).toBe('₹8.6L')
    expect(formatGrowth('revenue', 99999.6)).toBe('₹1,00,000')
  })
})

describe('OnePlace', () => {
  it('opens the clicked goal and lists its four services', async () => {
    await render(<OnePlace />)
    const heads = container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')
    expect(heads[0].getAttribute('aria-expanded')).toBe('true')
    await click(heads[2])
    expect(heads[2].getAttribute('aria-expanded')).toBe('true')
    expect(heads[0].getAttribute('aria-expanded')).toBe('false')
    const links = [...container.querySelectorAll('a')].map(a => a.textContent)
    expect(links).toEqual(SERVICE_GROUPS[2].services.map(s => s.name))
  })
})

describe('ServicesExplorer', () => {
  it('opens on the service named in the URL hash', async () => {
    window.location.hash = '#whatsapp'
    await render(<ServicesExplorer />)
    expect(container.querySelector('#service-detail h3')!.textContent).toBe('WhatsApp that replies for you')
    expect(container.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toContain('Win customers')
  })
  it('switches goals and services, and offers the demo only for booking', async () => {
    await render(<ServicesExplorer />)
    expect(container.querySelector('a[href="/services/booking"]')).toBeNull()
    await click(byText('[role="tab"]', '02'))
    await click(byText('button[aria-pressed]', '04'))
    expect(container.querySelector('#service-detail h3')!.textContent).toBe('Let customers book themselves')
    expect(container.querySelector('a[href="/services/booking"]')!.textContent).toBe('Try the demo')
  })
})

describe('Faq', () => {
  it('keeps every answer in the page and toggles which one shows', async () => {
    const items = [{ q: 'One?', a: 'First answer' }, { q: 'Two?', a: 'Second answer' }]
    await render(<Faq items={items} />)
    const answers = () => [...container.querySelectorAll<HTMLElement>('[role="region"]')]
    expect(answers().map(a => a.textContent)).toEqual(['First answer', 'Second answer'])
    expect(answers().map(a => a.hidden)).toEqual([false, true])
    await click(byText('button', 'Two?'))
    expect(answers().map(a => a.hidden)).toEqual([true, false])
    await click(byText('button', 'Two?'))
    expect(answers().every(a => a.hidden)).toBe(true)
  })
})

describe('BookingDemo', () => {
  it('needs a time before booking, then shows the industry-specific confirmation', async () => {
    await render(<BookingDemo />)
    const bookButton = () => byText('button', 'Pick a time') ?? byText('button', 'Book now') ?? byText('button', 'Booked')
    await click(bookButton())
    expect(container.textContent).toContain('Make a booking')
    await click(byText('[role="tab"]', 'Restaurant'))
    await click(byText('button[aria-pressed]', 'Table for 4'))
    await click(byText('button[aria-pressed]', '20:15'))
    await click(byText('button', 'Book now'))
    expect(container.textContent).toContain(INDUSTRIES[1].confirm('Table for 4', '20:15'))
    await click(byText('button', 'Booked'))
    expect(container.textContent).toContain('Make a booking')
  })
  it('resets the choice when the industry changes', async () => {
    await render(<BookingDemo />)
    await click(byText('button[aria-pressed]', '10:30'))
    await click(byText('[role="tab"]', 'Hotel'))
    expect(container.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1)
    expect(byText('button', 'Pick a time')).toBeTruthy()
  })
})

describe('WorkGallery', () => {
  it('filters the grid and says how many projects match', async () => {
    await render(<WorkGallery />)
    const cards = () => container.querySelectorAll('button[aria-haspopup="dialog"]')
    expect(cards()).toHaveLength(PROJECTS.length)
    await click(byText('button[aria-pressed]', 'Learning'))
    expect(cards()).toHaveLength(1)
    expect(container.textContent).toContain('1 project')
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
  it('opens a project in a dialog and closes it with Escape', async () => {
    await render(<WorkGallery />)
    await click(byText('button[aria-haspopup="dialog"]', 'Real estate lead tracker'))
    const dialog = container.querySelector('[role="dialog"]')!
    expect(dialog.querySelector('#project-title')!.textContent).toBe('Real estate lead tracker')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close project details')
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })) })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('About page pieces', () => {
  it('shows both founders with their bios', async () => {
    await render(<FounderCards />)
    expect([...container.querySelectorAll('h3')].map(h => h.textContent)).toEqual(['Roshan J', 'Gokul A S'])
    expect(container.querySelectorAll('button')).toHaveLength(0)
    // Roshan: clients, team and growth. Gokul: technology and creative.
    expect(container.textContent).toContain('Clients, team and growth')
    expect(container.textContent).toContain('client relationships, managing the team')
    expect(container.textContent).toContain('Technology and creative')
    expect(container.textContent).toContain('designing, building, developing and deploying')
  })
  it('steps through the story and wraps at both ends', async () => {
    await render(<StoryTimeline />)
    const pos = () => container.querySelector('[aria-live="polite"]')!.textContent
    expect(pos()).toBe(`01 / 0${STORY.length}`)
    await click(container.querySelector('button[aria-label="Previous chapter"]')!)
    expect(pos()).toBe(`0${STORY.length} / 0${STORY.length}`)
    await click(container.querySelector('button[aria-label="Next chapter"]')!)
    expect(pos()).toBe(`01 / 0${STORY.length}`)
    await click(byText('[role="tab"]', 'The decision'))
    expect(pos()).toBe('04 / 05')
  })
  it('tells the founders’ real story: graduates in 2022, Exter Cloud in 2026, automation today', () => {
    expect(STORY[0]).toMatchObject({ when: '2022' })
    expect(STORY[0].text).toContain('joined different IT companies as software developers')
    const decision = STORY.find(item => item.short === 'The decision')!
    expect(decision.when).toBe('2026')
    expect(decision.text).toContain('Exter Cloud')
    expect(STORY[STORY.length - 1]).toMatchObject({ when: 'Today' })
    expect(STORY[STORY.length - 1].text).toContain('automation')
    // Nothing from the old placeholder story that never happened.
    expect(JSON.stringify(STORY)).not.toMatch(/international|2023|2024|2025|12 services/)
  })
  it('shows the chosen value statement', async () => {
    await render(<ValuesTabs />)
    await click(byText('[role="tab"]', 'Vision'))
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toContain('bring automation to businesses')
    await click(byText('[role="tab"]', 'Mission'))
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toContain('repetitive work')
  })
})

describe('ContactForm', () => {
  it('does not send until the required fields are valid', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await render(<ContactForm />)
    await act(async () => { container.querySelector('form')!.requestSubmit() })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[aria-invalid="true"]').length).toBe(4)
  })
  it('sends the query with interests and shows a thank-you', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)
    await render(<ContactForm />)
    await type(container.querySelector('#c-name')!, 'Asha Menon')
    await type(container.querySelector('#c-email')!, 'asha@example.in')
    await type(container.querySelector('#c-phone')!, '9876543210')
    await type(container.querySelector('#c-message')!, 'We need online booking for our clinic.')
    // "booking" in the message ticks Bookings on its own.
    expect(byText('label', 'Bookings').querySelector('input')!.checked).toBe(true)
    await act(async () => { container.querySelector('form')!.requestSubmit() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({ name: 'Asha Menon', email: 'asha@example.in', phone: '+91 9876543210' })
    expect(body.message).toBe('Interested in: Bookings\n\nWe need online booking for our clinic.')
    expect(container.querySelector('[role="status"]')!.textContent).toContain('Thanks, Asha.')
  })
  it('shows the server error and keeps the form when sending fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Too many messages sent.' }) }))
    await render(<ContactForm />)
    await type(container.querySelector('#c-name')!, 'Asha Menon')
    await type(container.querySelector('#c-email')!, 'asha@example.in')
    await type(container.querySelector('#c-phone')!, '9876543210')
    await type(container.querySelector('#c-message')!, 'We need online booking for our clinic.')
    await act(async () => { container.querySelector('form')!.requestSubmit() })
    expect(container.querySelector('[role="alert"]')!.textContent).toBe('Too many messages sent.')
    expect(container.querySelector('form')).not.toBeNull()
  })
})

describe('detectInterests', () => {
  it('picks needs from everyday words', () => {
    expect(detectInterests('We miss calls and forget to follow up on WhatsApp')).toEqual(['CRM', 'WhatsApp'])
    expect(detectInterests('Patients want to book appointments online')).toEqual(['Bookings'])
    expect(detectInterests('Our billing and stock are on paper registers')).toEqual(['Business software'])
  })
  it('does not confuse look-alike words', () => {
    expect(detectInterests('We post on Facebook')).toEqual(['Social media'])
    expect(detectInterests('Book an appointment')).not.toContain('Mobile app')
    expect(detectInterests('We want an Android app')).toContain('Mobile app')
  })
  it('returns nothing for empty or unrelated text', () => {
    expect(detectInterests('')).toEqual([])
    expect(detectInterests('Hello there')).toEqual([])
  })
})

describe('mergeInterests', () => {
  it('adds detected needs, keeps manual ticks, and respects unticks', () => {
    expect(mergeInterests(['Website'], [], ['CRM'])).toEqual(['Website', 'CRM'])
    expect(mergeInterests([], ['CRM'], ['CRM', 'WhatsApp'])).toEqual(['WhatsApp'])
    expect(mergeInterests(['CRM'], ['CRM'], [])).toEqual(['CRM'])
    expect(mergeInterests([], [], [])).toEqual([])
  })
})

describe('prefillFromQuery', () => {
  it('starts from a service', () => {
    const result = prefillFromQuery({ service: 'crm' })
    expect(result.context).toBe('Never forget a customer')
    expect(result.interests).toEqual(['CRM'])
    expect(result.message).toContain('never forget a customer (CRM)')
  })
  it('starts from a project, ticking what it was built with', () => {
    const result = prefillFromQuery({ project: 'hospital-portal' })
    expect(result.context).toBe('Hospital patient portal')
    expect(result.interests).toEqual(expect.arrayContaining(['Website', 'WhatsApp', 'Bookings']))
  })
  it('starts from a problem', () => {
    const result = prefillFromQuery({ problem: 'lost-leads' })
    expect(result.interests).toEqual(['More enquiries', 'CRM', 'WhatsApp'])
    expect(result.message).toContain('leads slip through the cracks')
  })
  it('ignores unknown values and takes the first of repeated ones', () => {
    expect(prefillFromQuery({ service: 'nope' })).toEqual({ message: '', interests: [], context: null })
    expect(prefillFromQuery({})).toEqual({ message: '', interests: [], context: null })
    expect(prefillFromQuery({ service: ['seo', 'crm'] }).interests).toEqual(['Google search (SEO)'])
  })
})

describe('ContactForm helpers', () => {
  it('opens with the context and started message', async () => {
    await render(<ContactForm initial={prefillFromQuery({ project: 'restaurant-app' })} />)
    expect(container.textContent).toContain('You’re asking about Restaurant ordering app')
    expect(container.querySelector<HTMLTextAreaElement>('#c-message')!.value).toContain('restaurant ordering app')
    expect(byText('fieldset label', 'Mobile app').querySelector('input')!.checked).toBe(true)
  })
  it('fills the message from a starter and ticks matching needs automatically', async () => {
    await render(<ContactForm />)
    await click(byText('button', 'We keep missing enquiries'))
    const message = container.querySelector<HTMLTextAreaElement>('#c-message')!.value
    expect(message).toContain('miss or forget to follow up')
    for (const need of ['More enquiries', 'CRM', 'WhatsApp', 'Social media']) expect(byText('fieldset label', need).querySelector('input')!.checked, need).toBe(true)
    expect(byText('fieldset label', 'CRM').textContent).toContain('auto')
  })
  it('keeps an auto-picked need off once the visitor unticks it', async () => {
    await render(<ContactForm />)
    await type(container.querySelector('#c-message')!, 'We need online booking')
    await click(byText('fieldset label', 'Bookings').querySelector('input')!)
    expect(byText('fieldset label', 'Bookings').querySelector('input')!.checked).toBe(false)
    await type(container.querySelector('#c-message')!, 'We need online booking and appointments')
    expect(byText('fieldset label', 'Bookings').querySelector('input')!.checked).toBe(false)
  })
})

describe('Reveal', () => {
  it('works out where the element is from the observer entry', () => {
    expect(revealState({ isIntersecting: true, boundingClientRect: { top: -50 } })).toBe('in')
    expect(revealState({ isIntersecting: false, boundingClientRect: { top: -300 } })).toBe('above')
    expect(revealState({ isIntersecting: false, boundingClientRect: { top: 900 } })).toBe('below')
  })
  it('only switches when clearly in or almost out, so it never flickers', () => {
    // 600px section, 800px screen: in at 80px visible, out at 30px or less.
    expect(nextRevealState(85, 600, 800, 715)).toBe('in')
    expect(nextRevealState(50, 600, 800, 750)).toBeNull()
    expect(nextRevealState(20, 600, 800, 780)).toBe('below')
    expect(nextRevealState(20, 600, 800, -580)).toBe('above')
  })
  it('treats very tall sections by screen share, not their own height', () => {
    // 4000px section: in once 10% of an 800px screen (80px) shows.
    expect(nextRevealState(90, 4000, 800, 710)).toBe('in')
    expect(nextRevealState(60, 4000, 800, 740)).toBeNull()
    expect(nextRevealState(0, 4000, 800, 900)).toBe('below')
  })
  it('shows content straight away when the browser cannot observe', async () => {
    await render(<Reveal as="section" aria-label="Test" delay={0.2}><p>Hello</p></Reveal>)
    const el = container.querySelector('section')!
    expect(el.getAttribute('data-reveal')).toBe('in')
    expect(el.getAttribute('style')).toContain('--reveal-delay: 0.2s')
    expect(el.getAttribute('data-mode')).toBe('scroll')
    expect(el.textContent).toBe('Hello')
  })
  it('adds the soft blur only when asked', async () => {
    await render(<><Reveal mode="load" soft><p>Soft</p></Reveal><Reveal><p>Plain</p></Reveal></>)
    const [soft, plain] = [...container.querySelectorAll('.reveal')]
    expect(soft.getAttribute('data-soft')).toBe('true')
    expect(soft.getAttribute('data-mode')).toBe('load')
    expect(plain.hasAttribute('data-soft')).toBe(false)
  })
  it('starts the load landing only after two drawn frames, and never for scroll mode', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    await render(<><Reveal mode="load"><p>Hero</p></Reveal><Reveal><p>Below</p></Reveal></>)
    const [hero, below] = [...container.querySelectorAll('.reveal')]
    expect(hero.hasAttribute('data-landed')).toBe(false)
    await act(async () => { vi.advanceTimersToNextFrame() })
    expect(hero.hasAttribute('data-landed')).toBe(false)
    await act(async () => { vi.advanceTimersToNextFrame() })
    expect(hero.getAttribute('data-landed')).toBe('yes')
    expect(below.hasAttribute('data-landed')).toBe(false)
  })
  it('marks a landing late when the safety timer already showed the content', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    // jsdom has no getAnimations; stand in a finished safety animation.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>
    const original = proto.getAnimations
    proto.getAnimations = () => [{ animationName: 'revealSafety', playState: 'finished' }]
    try {
      await render(<Reveal mode="load"><p>Hero</p></Reveal>)
      await act(async () => { vi.advanceTimersToNextFrame(); vi.advanceTimersToNextFrame() })
      expect(container.querySelector('.reveal')!.getAttribute('data-landed')).toBe('late')
    } finally {
      if (original) proto.getAnimations = original
      else delete proto.getAnimations
    }
  })
})

describe('feather styles', () => {
  // Read the stylesheet itself: the smoothness depends on what is animated.
  const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')
  const block = css.slice(css.indexOf('/* ── FEATHER LANDING'), css.indexOf('/* ── REDUCED MOTION'))
  it('never blurs sections on scroll, only the soft load landing', () => {
    const scrollRules = block.slice(0, block.indexOf('@keyframes featherLandSoft'))
    expect(scrollRules).not.toMatch(/filter\s*:/)
    expect(block).toMatch(/@keyframes featherLandSoft[^}]*filter: blur/)
  })
  it('keeps no permanent will-change layers', () => {
    expect(block).not.toMatch(/will-change/)
  })
  it('moves with the scroll: above sits higher, below sits lower', () => {
    expect(block).toMatch(/\[data-reveal='above'\][^}]*calc\(var\(--feather-rise\) \* -1\)/)
    expect(block).toMatch(/\[data-reveal='below'\][^}]*translate3d\(0, var\(--feather-rise\), 0\)/)
  })
})

describe('SendEstimate', () => {
  const summary = 'Exter Cloud discovery and solution review\nIndicative build range: ₹1,00,000–₹1,50,000'
  const fill = async (id: string, value: string) => type(container.querySelector(`#${id}`) as HTMLInputElement, value)
  it('puts the visitor’s note before the estimate, and sends the summary alone without one', () => {
    expect(estimateMessage(summary, '  Start next month ')).toBe(`Note from the customer:\nStart next month\n\n${summary}`)
    expect(estimateMessage(summary, '   ')).toBe(summary)
  })
  it('does not send until name, email and phone are valid', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await render(<SendEstimate summary={summary} />)
    await click(container.querySelector('button[type="submit"]')!)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3)
  })
  it('sends the estimate with the estimate intent and shows a thank-you', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)
    await render(<SendEstimate summary={summary} />)
    await fill('e-name', 'Asha Varma')
    await fill('e-email', 'asha@example.test')
    await fill('e-phone', '9876543210')
    await fill('e-note', 'Start next month')
    await click(container.querySelector('button[type="submit"]')!)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/send-query')
    expect(body).toMatchObject({ intent: 'estimate', name: 'Asha Varma', email: 'asha@example.test', phone: '+91 9876543210' })
    expect(body.message).toBe(estimateMessage(summary, 'Start next month'))
    expect(container.textContent).toContain('Sent. Thanks, Asha.')
  })
  it('keeps the form and shows the reason when sending fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Email sending is not configured.' }) }))
    await render(<SendEstimate summary={summary} />)
    await fill('e-name', 'Asha Varma')
    await fill('e-email', 'asha@example.test')
    await fill('e-phone', '9876543210')
    await click(container.querySelector('button[type="submit"]')!)
    expect(container.querySelector('[role="alert"]')!.textContent).toBe('Email sending is not configured.')
    expect(container.querySelector('form')).not.toBeNull()
  })
  it('rejects a note longer than 1,000 characters', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await render(<SendEstimate summary={summary} />)
    await fill('e-name', 'Asha Varma')
    await fill('e-email', 'asha@example.test')
    await fill('e-phone', '9876543210')
    await fill('e-note', 'x'.repeat(1001))
    await click(container.querySelector('button[type="submit"]')!)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Keep the note within 1,000 characters.')
  })
})

describe('MobileHome', () => {
  it('stays calm: plain facts, one list, work and steps, with no extra start tiles or price card', async () => {
    await render(<MobileHome />)
    expect(container.querySelectorAll('dl > div')).toHaveLength(FACTS.length)
    expect(container.querySelector('nav[aria-label="Quick actions"]')).toBeNull()
    expect(container.querySelector('a[href="/cost-estimator"]')).toBeNull()
    expect(container.querySelectorAll('[aria-expanded]').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('ol > li')).toHaveLength(3)
  })
})
