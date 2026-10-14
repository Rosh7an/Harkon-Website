import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import QueryModal from '../components/QueryModal'
import { CONTACT_MESSAGE_MAX } from '../utils/contactLimits'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let container: HTMLDivElement
let trigger: HTMLButtonElement
const onClose = vi.fn()

async function render(open = true, initialMessage?: string, purpose: 'query' | 'callback' = 'query') {
  await act(async () => { root.render(<QueryModal open={open} onClose={onClose} initialMessage={initialMessage} purpose={purpose} />) })
}
function dialog() { return document.querySelector<HTMLDivElement>('[role="dialog"]')! }
async function fill(id: string, value: string) {
  const field = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
  await act(async () => {
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () => { dialog().querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}
beforeEach(() => {
  vi.useFakeTimers()
  onClose.mockClear()
  container = document.createElement('div')
  container.style.isolation = 'isolate'
  trigger = document.createElement('button')
  document.body.append(trigger, container)
  trigger.focus()
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  trigger.remove()
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('QueryModal page-level overlay', () => {
  it('requests a team call with the session summary and optional time, without claiming a booking', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetcher)
    await render(true, 'Session answers and draft website + mobile scope.', 'callback')
    expect(dialog().textContent).toContain('Request a team call')
    await fill('qm-name', 'Demo Client')
    await fill('qm-email', 'demo@example.test')
    await fill('qm-phone', '9876543210')
    await fill('qm-preferred-time', 'Friday after 3pm, India time')
    await submit()
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ intent: 'callback', preferredTime: 'Friday after 3pm, India time', message: 'Session answers and draft website + mobile scope.' })
    expect(dialog().textContent).toContain('Call request sent')
    expect(dialog().textContent).toContain('confirm a suitable time')
    expect(dialog().textContent).not.toContain('appointment booked')
    await render(false, undefined, 'callback')
    await render(true, 'A new session', 'callback')
    expect((document.getElementById('qm-preferred-time') as HTMLInputElement).value).toBe('')
  })
  it('renders outside the isolated caller and bounds its scroll area to the viewport', async () => {
    await render()
    const panel = dialog()
    expect(container.contains(panel)).toBe(false)
    expect(panel.parentElement?.parentElement).toBe(document.body)
    expect(panel.parentElement?.style.position).toBe('fixed')
    expect(panel.style.maxHeight).toBe('calc(100dvh - 40px)')
    expect(panel.style.overflowY).toBe('auto')
    expect(panel.style.flexShrink).toBe('0')
  })
  it('renders nothing when closed, including server rendering an initially open popup', async () => {
    await render(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(renderToString(<QueryModal open onClose={onClose} />)).toBe('')
  })
  it('preserves a maximum-length proposal summary and resets it on close', async () => {
    const summary = 'x'.repeat(CONTACT_MESSAGE_MAX)
    await render(true, summary)
    expect((document.getElementById('qm-message') as HTMLTextAreaElement).value).toBe(summary)
    await render(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    await render()
    expect((document.getElementById('qm-message') as HTMLTextAreaElement).value).toBe('')
  })
  it('focuses the form, traps keyboard navigation, and restores focus and prior scroll locks', async () => {
    document.body.style.overflow = 'clip'
    document.documentElement.style.overflow = 'scroll'
    await render()
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(document.activeElement?.id).toBe('qm-name')
    expect(document.body.style.overflow).toBe('hidden')
    const send = dialog().querySelector<HTMLButtonElement>('button[type="submit"]')!
    await act(async () => { send.focus() })
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })) })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })) })
    expect(document.activeElement).toBe(send)
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(onClose).toHaveBeenCalledTimes(1)
    await render(false)
    expect(document.body.style.overflow).toBe('clip')
    expect(document.documentElement.style.overflow).toBe('scroll')
    expect(document.activeElement).toBe(trigger)
  })
  it('closes only on backdrop clicks, not clicks inside the popup', async () => {
    await render()
    await act(async () => { dialog().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => { dialog().parentElement!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('keeps empty-form validation inside the popup and does not send a request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await render()
    await submit()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(fetcher).not.toHaveBeenCalled()
    expect(dialog().querySelectorAll('[role="alert"]')).toHaveLength(5)
    expect(document.activeElement?.textContent).toContain('Please correct')
  })
  it('retains form input and a visible error when sending fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Sending is unavailable.' }) }))
    await render(true, 'Please review my website plan.')
    await fill('qm-name', 'Demo Client')
    await fill('qm-email', 'demo@example.test')
    await fill('qm-phone', '9876543210')
    await submit()
    expect(dialog().textContent).toContain('Sending is unavailable.')
    expect((document.getElementById('qm-name') as HTMLInputElement).value).toBe('Demo Client')
    expect(dialog().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false)
  })
  it('preserves the successful inquiry payload and confirmation', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetcher)
    await render(true, 'Please review my website plan.')
    await fill('qm-name', 'Demo Client')
    await fill('qm-email', 'demo@example.test')
    await fill('qm-phone', '9876543210')
    await submit()
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: 'Demo Client', email: 'demo@example.test', phone: '+91 9876543210', message: 'Please review my website plan.' })
    expect(dialog().textContent).toContain('Inquiry sent')
  })
})
