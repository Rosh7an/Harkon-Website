'use client'

import { useEffect, useRef, useState } from 'react'
import { COUNTRY_CODES } from '@/components/countryCodes'
import CountrySelect from '@/components/CountrySelect'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_ISO = 'IN'

interface Errors {
  name?: string
  email?: string
  phone?: string
  message?: string
}

function validate(fields: { name: string; email: string; phone: string; message: string }, phoneLen: [number, number]): Errors {
  const errors: Errors = {}

  if (!fields.name.trim()) errors.name = 'Name is required.'
  else if (fields.name.trim().length < 2) errors.name = 'Name looks too short.'

  if (fields.email.trim() && !EMAIL_RE.test(fields.email.trim())) {
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

  return errors
}

export default function QueryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryIso, setCountryIso] = useState(DEFAULT_ISO)
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const country = COUNTRY_CODES.find(c => c.iso === countryIso) ?? COUNTRY_CODES.find(c => c.iso === DEFAULT_ISO)!
  const errors = validate({ name, email, phone, message }, country.len)
  const isValid = Object.keys(errors).length === 0

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => firstFieldRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setName(''); setEmail(''); setCountryIso(DEFAULT_ISO); setPhone(''); setMessage('')
      setTouched({}); setSubmitted(false); setSubmitting(false); setSubmitError('')
    }
  }, [open])

  if (!open) return null

  const showError = (field: keyof Errors) => touched[field] && errors[field]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, email: true, phone: true, message: true })
    if (!isValid || submitting) return

    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/send-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: `${country.dial} ${phone.trim()}`,
          email: email.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${hasError ? '#D64545' : 'var(--border-hi)'}`,
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
    fontSize: 11.5, color: '#D64545', marginTop: 5,
  }

  return (
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
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="query-modal-title"
        style={{
          width: '100%', maxWidth: 440,
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
            <p style={{ fontSize: 30, marginBottom: 16 }}>✅</p>
            <h3 style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
              Message sent
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
              Thanks for reaching out — we've received your query and will get back to you shortly.
            </p>
            <button
              onClick={onClose}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 id="query-modal-title" style={{ fontFamily: 'var(--font)', fontSize: 22, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Send a query
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.6 }}>
              Tell us what you need — we'll get back to you shortly.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-name">Name</label>
                <input
                  ref={firstFieldRef}
                  id="qm-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  style={inputStyle(!!showError('name'))}
                  placeholder="Your name"
                />
                {showError('name') && <p style={errorStyle}>{errors.name}</p>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="qm-email">Email (optional)</label>
                <input
                  id="qm-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  style={inputStyle(!!showError('email'))}
                  placeholder="you@company.com"
                />
                {showError('email') && <p style={errorStyle}>{errors.email}</p>}
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
                    style={inputStyle(!!showError('phone'))}
                    placeholder="98765 43210"
                  />
                </div>
                {showError('phone') && <p style={errorStyle}>{errors.phone}</p>}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle} htmlFor="qm-message">Message</label>
                <textarea
                  id="qm-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, message: true }))}
                  style={{ ...inputStyle(!!showError('message')), resize: 'vertical', minHeight: 96, fontFamily: 'var(--font)' }}
                  placeholder="What are you looking to build?"
                />
                {showError('message') && <p style={errorStyle}>{errors.message}</p>}
              </div>

              {submitError && (
                <p style={{ ...errorStyle, marginTop: 0, marginBottom: 12, textAlign: 'center' }}>{submitError}</p>
              )}

              <button
                type="submit"
                disabled={!isValid || submitting}
                style={{
                  width: '100%', padding: '13px 24px', borderRadius: 6, border: 'none',
                  background: isValid ? 'var(--accent)' : 'var(--border-hi)',
                  color: isValid ? '#fff' : 'var(--muted)',
                  fontSize: 13.5, fontWeight: 600, letterSpacing: '0.02em',
                  cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
                  opacity: submitting ? 0.7 : 1,
                  fontFamily: 'var(--font)', transition: 'background .2s, color .2s',
                }}
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
