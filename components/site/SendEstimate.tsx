'use client'

import { useState } from 'react'
import CountrySelect from '@/components/CountrySelect'
import { COUNTRY_CODES } from '@/components/countryCodes'
import { validate } from '@/components/QueryModal'
import p from './Pages.module.css'

const NOTE_MAX = 1000

/** The email body: the visitor's own note first (if any), then the full estimate summary. */
export function estimateMessage(summary: string, note: string): string {
  const own = note.trim()
  return own ? `Note from the customer:\n${own}\n\n${summary}` : summary
}

type Field = 'name' | 'email' | 'phone' | 'note'

/**
 * The last step of "Start a project": after seeing their estimate, the
 * visitor leaves their details and sends the estimate and answers to the team.
 */
export default function SendEstimate({ summary }: { summary: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryIso, setCountryIso] = useState('IN')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState('')

  const country = COUNTRY_CODES.find(c => c.iso === countryIso) ?? COUNTRY_CODES[0]
  // The summary is the message, so only name, email and phone can be wrong.
  const { message: _ignored, ...base } = validate({ name, email, phone, message: summary }, country.len)
  const errors: Partial<Record<Field, string>> = { ...base, ...(note.trim().length > NOTE_MAX ? { note: `Keep the note within ${NOTE_MAX.toLocaleString()} characters.` } : {}) }
  const show = (field: Field) => (touched[field] ? errors[field] : undefined)
  const input = (field: Field) => `${p.input} ${show(field) ? p.inputError : ''}`

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched({ name: true, email: true, phone: true, note: true })
    if (Object.keys(errors).length || sending) return
    setSending(true)
    setFailure('')
    try {
      const response = await fetch('/api/send-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'estimate', name: name.trim(), email: email.trim(), phone: `${country.dial} ${phone.trim()}`, message: estimateMessage(summary, note) }),
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Your estimate could not be sent. Please try again, or message us on WhatsApp.')
      setSent(true)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Your estimate could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <section className={p.form} role="status" aria-label="Estimate sent">
        <h2 className={p.formTitle} style={{ marginBottom: 8 }}>Sent. Thanks, {name.trim().split(' ')[0]}.</h2>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>We have your answers and estimate, and we’ll get back to you on email or WhatsApp.</p>
      </section>
    )
  }

  return (
    <form className={p.form} onSubmit={submit} noValidate aria-labelledby="send-estimate-title">
      <h2 id="send-estimate-title" className={p.formTitle}>Send this to us</h2>
      <p style={{ margin: '-6px 0 4px', color: 'var(--text-2)', fontSize: 15 }}>We’ll get your answers and this estimate, look through them and get back to you.</p>
      <div className={p.fieldRow}>
        <div className={p.field}>
          <label htmlFor="e-name">Your name</label>
          <input id="e-name" className={input('name')} value={name} autoComplete="name" onChange={e => setName(e.target.value)} onBlur={() => setTouched(t => ({ ...t, name: true }))} aria-invalid={!!show('name')} aria-describedby={show('name') ? 'e-name-error' : undefined} />
          {show('name') && <span id="e-name-error" className={p.error}>{show('name')}</span>}
        </div>
        <div className={p.field}>
          <label htmlFor="e-email">Email</label>
          <input id="e-email" type="email" className={input('email')} value={email} autoComplete="email" placeholder="you@business.com" onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: true }))} aria-invalid={!!show('email')} aria-describedby={show('email') ? 'e-email-error' : undefined} />
          {show('email') && <span id="e-email-error" className={p.error}>{show('email')}</span>}
        </div>
      </div>
      <div className={p.field}>
        <label htmlFor="e-phone">Phone or WhatsApp</label>
        <div className={p.phoneRow}>
          <CountrySelect value={countryIso} onChange={iso => { setCountryIso(iso); setTouched(t => ({ ...t, phone: true })) }} />
          <input id="e-phone" type="tel" inputMode="tel" className={input('phone')} value={phone} autoComplete="tel-national" onChange={e => setPhone(e.target.value)} onBlur={() => setTouched(t => ({ ...t, phone: true }))} aria-invalid={!!show('phone')} aria-describedby={show('phone') ? 'e-phone-error' : undefined} />
        </div>
        {show('phone') && <span id="e-phone-error" className={p.error}>{show('phone')}</span>}
      </div>
      <div className={p.field}>
        <label htmlFor="e-note">Anything to add? <span style={{ color: 'var(--faint)' }}>Optional</span></label>
        <textarea id="e-note" rows={3} className={`${p.textarea} ${show('note') ? p.inputError : ''}`} value={note} placeholder="For example: we’d like to start next month" onChange={e => setNote(e.target.value)} onBlur={() => setTouched(t => ({ ...t, note: true }))} aria-invalid={!!show('note')} aria-describedby={show('note') ? 'e-note-error' : undefined} />
        {show('note') && <span id="e-note-error" className={p.error}>{show('note')}</span>}
      </div>
      {failure && <p className={p.error} role="alert" style={{ margin: 0 }}>{failure}</p>}
      <button type="submit" className={p.submit} disabled={sending}>{sending ? 'Sending…' : 'Send my estimate'}</button>
      <p className={p.small}>We only use these details to reply to you. See the <a href="/privacy" style={{ color: 'inherit' }}>privacy policy</a>.</p>
    </form>
  )
}
