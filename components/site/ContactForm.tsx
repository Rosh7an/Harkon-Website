'use client'

import { useMemo, useState } from 'react'
import CountrySelect from '@/components/CountrySelect'
import { COUNTRY_CODES } from '@/components/countryCodes'
import { validate } from '@/components/QueryModal'
import { INTERESTS, STARTERS, detectInterests, mergeInterests, type Prefill } from '@/utils/contactPrefill'
import p from './Pages.module.css'

/** The message sent to the team: chosen interests first, then the visitor's own words. */
export function composeMessage(interests: readonly string[], message: string): string {
  const body = message.trim()
  return interests.length ? `Interested in: ${interests.join(', ')}\n\n${body}` : body
}

type Field = 'name' | 'email' | 'phone' | 'message'
const EMPTY: Prefill = { message: '', interests: [], context: null }

export default function ContactForm({ initial = EMPTY }: { initial?: Prefill }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countryIso, setCountryIso] = useState('IN')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState(initial.message)
  const [chosen, setChosen] = useState<string[]>(initial.interests)
  const [removed, setRemoved] = useState<string[]>([])
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState('')

  const detected = useMemo(() => detectInterests(message), [message])
  const interests = mergeInterests(chosen, removed, detected)
  const country = COUNTRY_CODES.find(c => c.iso === countryIso) ?? COUNTRY_CODES[0]
  const errors = validate({ name, email, phone, message }, country.len)
  const show = (field: Field) => (touched[field] ? errors[field] : undefined)

  const toggle = (item: string) => {
    if ((interests as readonly string[]).includes(item)) {
      setChosen(list => list.filter(x => x !== item))
      setRemoved(list => (list.includes(item) ? list : [...list, item]))
    } else {
      setChosen(list => [...list, item])
      setRemoved(list => list.filter(x => x !== item))
    }
  }

  // A starter replaces an empty or untouched message, otherwise it's added on a new line.
  const applyStarter = (text: string) => {
    const current = message.trim()
    setMessage(!current || message === initial.message ? (initial.message ? `${initial.message}${text}` : text) : `${message.trimEnd()}\n${text}`)
    setTouched(t => ({ ...t, message: true }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched({ name: true, email: true, phone: true, message: true })
    if (Object.keys(errors).length || sending) return
    setSending(true)
    setFailure('')
    try {
      const response = await fetch('/api/send-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: `${country.dial} ${phone.trim()}`, message: composeMessage(interests, message) }),
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) throw new Error(data.error || 'Your message could not be sent. Please try again or message us on WhatsApp.')
      setSent(true)
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'Your message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className={p.form} role="status">
        <div className={p.success}>
          <h2 className={p.formTitle} style={{ marginBottom: 8 }}>Thanks, {name.trim().split(' ')[0]}.</h2>
          <p style={{ margin: 0, color: 'var(--text-2)' }}>We’ve got your message and will reply soon on email or WhatsApp.</p>
        </div>
      </div>
    )
  }

  const input = (field: Field) => `${p.input} ${show(field) ? p.inputError : ''}`
  const autoPicked = interests.filter(item => (detected as readonly string[]).includes(item) && !chosen.includes(item))

  return (
    <form className={p.form} onSubmit={submit} noValidate>
      <h2 className={p.formTitle}>Send a query</h2>
      {initial.context && <p className={p.contextNote}>You’re asking about <strong>{initial.context}</strong>. We’ve started your message for you.</p>}
      <div className={p.fieldRow}>
        <div className={p.field}>
          <label htmlFor="c-name">Your name</label>
          <input id="c-name" className={input('name')} value={name} autoComplete="name" onChange={e => setName(e.target.value)} onBlur={() => setTouched(t => ({ ...t, name: true }))} aria-invalid={!!show('name')} aria-describedby={show('name') ? 'c-name-error' : undefined} />
          {show('name') && <span id="c-name-error" className={p.error}>{show('name')}</span>}
        </div>
        <div className={p.field}>
          <label htmlFor="c-email">Email</label>
          <input id="c-email" type="email" className={input('email')} value={email} autoComplete="email" placeholder="you@business.com" onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(t => ({ ...t, email: true }))} aria-invalid={!!show('email')} aria-describedby={show('email') ? 'c-email-error' : undefined} />
          {show('email') && <span id="c-email-error" className={p.error}>{show('email')}</span>}
        </div>
      </div>
      <div className={p.field}>
        <label htmlFor="c-phone">Phone or WhatsApp</label>
        <div className={p.phoneRow}>
          <CountrySelect value={countryIso} onChange={iso => { setCountryIso(iso); setTouched(t => ({ ...t, phone: true })) }} />
          <input id="c-phone" type="tel" inputMode="tel" className={input('phone')} value={phone} autoComplete="tel-national" onChange={e => setPhone(e.target.value)} onBlur={() => setTouched(t => ({ ...t, phone: true }))} aria-invalid={!!show('phone')} aria-describedby={show('phone') ? 'c-phone-error' : undefined} />
        </div>
        {show('phone') && <span id="c-phone-error" className={p.error}>{show('phone')}</span>}
      </div>

      <div className={p.field}>
        <label htmlFor="c-message">What’s going on in your business?</label>
        <div className={p.starters} role="group" aria-label="Start your message">
          {STARTERS.map(starter => <button key={starter.label} type="button" className={p.starter} onClick={() => applyStarter(starter.text)}>{starter.label}</button>)}
        </div>
        <textarea id="c-message" rows={4} className={`${p.textarea} ${show('message') ? p.inputError : ''}`} value={message} placeholder="Tell us in your own words, for example: we miss calls and forget to follow up" onChange={e => setMessage(e.target.value)} onBlur={() => setTouched(t => ({ ...t, message: true }))} aria-invalid={!!show('message')} aria-describedby={show('message') ? 'c-message-error' : undefined} />
        {show('message') && <span id="c-message-error" className={p.error}>{show('message')}</span>}
      </div>

      <fieldset className={p.interests}>
        <legend className={p.legend} style={{ marginBottom: 10 }}>What do you need? <span style={{ color: 'var(--faint)' }}>We tick these from your message. Change anything.</span></legend>
        {INTERESTS.map(item => {
          const on = interests.includes(item)
          const auto = autoPicked.includes(item)
          return (
            <label key={item} className={on ? p.interestOn : p.interest}>
              <input type="checkbox" checked={on} onChange={() => toggle(item)} />{item}
              {auto && <span className={p.autoTag}>auto</span>}
            </label>
          )
        })}
      </fieldset>

      {failure && <p className={p.error} role="alert" style={{ margin: 0 }}>{failure}</p>}
      <button type="submit" className={p.submit} disabled={sending}>{sending ? 'Sending…' : 'Send query'}</button>
      <p className={p.small}>We only use these details to reply to you. See the <a href="/privacy" style={{ color: 'inherit' }}>privacy policy</a>.</p>
    </form>
  )
}
