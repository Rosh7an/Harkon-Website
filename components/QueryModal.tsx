'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COUNTRY_CODES } from '@/components/countryCodes'
import CountrySelect from '@/components/CountrySelect'
import { CONTACT_MESSAGE_MAX } from '@/utils/contactLimits'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_ISO = 'IN'

interface Errors {
  name?: string
  email?: string
  phone?: string
  message?: string
  preferredTime?: string
}

export function validate(fields: { name: string; email: string; phone: string; message: string }, phoneLen: [number, number]): Errors {
  const errors: Errors = {}

  if (!fields.name.trim()) errors.name = 'Name is required.'
  else if (fields.name.trim().length < 2) errors.name = 'Name looks too short.'
  else if (fields.name.trim().length > 100) errors.name = 'Name must be at most 100 characters.'

  if (!fields.email.trim()) {
    errors.email = 'Email is required.'
  } else if (fields.email.trim().length > 254 || !EMAIL_RE.test(fields.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  const digits = fields.phone.replace(/\D/g, '')
  const [min, max] = phoneLen
  if (!digits) errors.phone = 'Phone number is required.'
  else if (digits.length < min || digits.length > max) {
    errors.phone = min === max
      ? `Enter a ${min}-digit number for this country.`
      : `Enter a ${min}-${max} digit number for this country.`
  }

  if (!fields.message.trim()) errors.message = 'Message is required.'
  else if (fields.message.trim().length < 10) errors.message = 'Tell us a bit more (min 10 characters).'
  else if (fields.message.trim().length > CONTACT_MESSAGE_MAX) errors.message = `Message must be at most ${CONTACT_MESSAGE_MAX.toLocaleString()} characters.`

  return errors
}

export default function QueryModal({ open, onClose, initialMessage, purpose = 'query' }: { open: boolean; onClose: () => void; initialMessage?: string; purpose?: 'query' | 'callback' }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const country = COUNTRY_CODES.find(c => c.iso === countryIso) ?? COUNTRY_CODES.find(c => c.iso === DEFAULT_ISO)!
  const errors: Errors = { ...validate({ name, email, phone, message }, country.len), ...(purpose === 'callback' && preferredTime.trim().length > 200 ? { preferredTime: 'Keep the time preference within 200 characters.' } : {}) }
  const isValid = Object.keys(errors).length === 0

  // Mount at page level so isolated/transformed callers cannot trap the overlay
  // below the footer. The first server and client renders both stay empty.
  useEffect(() => { setPortalRoot(document.body) }, [])

  useEffect(() => {
    if (!open) return
    if (initialMessage) {
      setMessage(initialMessage)
    }
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const t = setTimeout(() => firstFieldRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      previouslyFocused?.focus()
    }
  }, [open, onClose, initialMessage])

  useEffect(() => {
    if (!open) {
      setName(''); setEmail(''); setCountryIso(DEFAULT_ISO); setPhone(''); setMessage(''); setPreferredTime('')
      setTouched({}); setSubmitted(false); setSubmitting(false); setSubmitError('')
    }
  }, [open])

  if (!open || !portalRoot) return null

  const showError = (field: keyof Errors) => touched[field] && errors[field]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, phone: true, message: true, ...(purpose === 'callback' ? { preferredTime: true } : {}) })
    if (!isValid || submitting) {
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/send-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: `${country.dial} ${phone.trim()}`,
          message: message.trim(),
          ...(purpose === 'callback' ? { intent: 'callback', preferredTime: preferredTime.trim() } : {}),
        }),
      })
      const data = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to send inquiry.')
      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send inquiry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${hasError ? 'var(--error)' : 'var(--border-hi)'}`,
    background: 'rgba(var(--bg-rgb),0.4)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'var(--font)',
    outline: 'none',
    transition: 'border-color .2s',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
    color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 11.5, color: 'var(--error)', marginTop: 5,
  }

  return createPortal(
    <div
      role="presentation"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(var(--bg-rgb),0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn .2s ease both',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-modal-title"
        style={{
          width: '100%', maxWidth: 440,
          maxHeight: 'calc(100dvh - 40px)',
          overflowY: 'auto', overscrollBehavior: 'contain',
          flexShrink: 0,
          borderRadius: 18,
          border: '1px solid var(--border-hi)',
          background: 'rgba(var(--bg-rgb),0.62)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          padding: 'clamp(24px,4vw,32px)',
          position: 'relative',
          animation: 'fadeUp .3s ease both',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16, width: 30, height: 30,
            borderRadius: '50%', border: 'none', background: 'rgba(var(--text-rgb),0.06)',
            color: 'var(--muted)', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3 id="query-modal-title" style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
              {purpose === 'callback' ? 'Call request sent' : 'Inquiry sent'}
            </h3>
            <p role="status" style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
              {purpose === 'callback' ? 'Your details and session summary have been sent. The team will contact you to confirm a suitable time. This is a call request, not a booked appointment.' : 'Thanks for reaching out — Exter Cloud has received your project scope and will get back to you shortly.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 id="query-modal-title" style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              {purpose === 'callback' ? 'Request a team call' : 'Send a query'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
              {purpose === 'callback' ? 'Discuss your answers, website/app needs and the estimate with the team. We’ll confirm a time with you before the call.' : "Tell us what you need — we'll get back to you shortly."}
            </p>

            <form onSubmit={handleSubmit} noValidate>
              {['name', 'email', 'phone', 'message'].every(key => touched[key]) && !isValid && (
                <div
                  ref={errorSummaryRef}
                  role="alert"
                  tabIndex={-1}
                  style={{ ...errorStyle, padding: 12, margin: '0 0 16px', border: '1px solid var(--error)', borderRadius: 8 }}
                >
                  Please correct the highlighted fields before sending.
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-name">Name</label>
                <input
                  ref={firstFieldRef}
                  id="qm-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  className="query-field"
                  aria-invalid={!!showError('name')}
                  aria-describedby={showError('name') ? 'qm-name-error' : undefined}
                  style={inputStyle(!!showError('name'))}
                  placeholder="Your name"
                />
                {showError('name') && <p id="qm-name-error" role="alert" style={errorStyle}>{errors.name}</p>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-email">Email</label>
                <input
                  id="qm-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  className="query-field"
                  aria-invalid={!!showError('email')}
                  aria-describedby={showError('email') ? 'qm-email-error' : undefined}
                  style={inputStyle(!!showError('email'))}
                  placeholder="you@company.com"
                />
                {showError('email') && <p id="qm-email-error" role="alert" style={errorStyle}>{errors.email}</p>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-phone">Phone number</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CountrySelect
                    value={countryIso}
                    onChange={iso => { setCountryIso(iso); setTouched(t => ({ ...t, phone: true })) }}
                  />
                  <input
                    id="qm-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                    onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                    className="query-field"
                    aria-invalid={!!showError('phone')}
                    aria-describedby={showError('phone') ? 'qm-phone-error' : undefined}
                    style={inputStyle(!!showError('phone'))}
                    placeholder="98765 43210"
                  />
                </div>
                {showError('phone') && <p id="qm-phone-error" role="alert" style={errorStyle}>{errors.phone}</p>}
              </div>

              {purpose === 'callback' && <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-preferred-time">Preferred time and timezone (optional)</label>
                <input id="qm-preferred-time" type="text" maxLength={200} className="query-field" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} onBlur={() => setTouched(t => ({ ...t, preferredTime: true }))} style={inputStyle(!!showError('preferredTime'))} placeholder="For example: weekdays after 3pm, India time" aria-invalid={!!showError('preferredTime')} aria-describedby={showError('preferredTime') ? 'qm-preferred-time-error' : undefined} />
                {showError('preferredTime') && <p id="qm-preferred-time-error" role="alert" style={errorStyle}>{errors.preferredTime}</p>}
              </div>}

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle} htmlFor="qm-message">Message</label>
                <textarea
                  id="qm-message"
                  maxLength={CONTACT_MESSAGE_MAX}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, message: true }))}
                  className="query-field"
                  aria-invalid={!!showError('message')}
                  aria-describedby={showError('message') ? 'qm-message-error' : undefined}
                  style={{ ...inputStyle(!!showError('message')), resize: 'vertical', minHeight: 96, fontFamily: 'var(--font)' }}
                  placeholder="What are you looking to build?"
                />
                {showError('message') && <p id="qm-message-error" role="alert" style={errorStyle}>{errors.message}</p>}
              </div>

              {submitError && (
                <p role="alert" style={{ ...errorStyle, marginTop: 0, marginBottom: 12, textAlign: 'center' }}>{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '13px 24px', borderRadius: 6, border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  fontSize: 13.5, fontWeight: 600, letterSpacing: '0.02em',
                  cursor: !submitting ? 'pointer' : 'not-allowed',
                  opacity: submitting ? 0.7 : 1,
                  fontFamily: 'var(--font)', transition: 'background .2s, color .2s',
                }}
              >
                {submitting ? 'Sending…' : purpose === 'callback' ? 'Request call' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    portalRoot,
  )
}
