'use client'

import { useEffect, useRef, useState } from 'react'
import { COUNTRY_CODES } from '@/components/countryCodes'

function flagEmoji(iso: string) {
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

export default function CountrySelect({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = COUNTRY_CODES.find(c => c.iso === value) ?? COUNTRY_CODES[0]
  const q = query.trim().toLowerCase()
  const filtered = q
    ? COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q))
    : COUNTRY_CODES

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => searchRef.current?.focus(), 30)
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open])

  useEffect(() => { if (!open) setQuery('') }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: '100%',
          padding: '11px 10px', borderRadius: 8,
          border: '1px solid var(--border-hi)',
          background: 'rgba(var(--bg-rgb),0.4)', color: 'var(--text)',
          fontSize: 14, fontFamily: 'var(--font)', cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{flagEmoji(selected.iso)}</span>
        <span>{selected.dial}</span>
        <span style={{ fontSize: 9, opacity: .6, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
            width: 250, maxHeight: 230, display: 'flex', flexDirection: 'column',
            borderRadius: 10, border: '1px solid var(--border-hi)',
            background: 'rgba(var(--bg-rgb),0.96)', backdropFilter: 'blur(16px)',
            boxShadow: '0 16px 40px rgba(0,0,0,.25)', overflow: 'hidden',
          }}
        >
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search country..."
            style={{
              padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text)', fontSize: 13,
              fontFamily: 'var(--font)', outline: 'none', flexShrink: 0,
            }}
          />
          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <p style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)' }}>No matches.</p>
            )}
            {filtered.map(c => (
              <button
                key={c.iso}
                type="button"
                role="option"
                aria-selected={c.iso === value}
                onClick={() => { onChange(c.iso); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', border: 'none',
                  background: c.iso === value ? 'rgba(216,90,48,.1)' : 'transparent',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { if (c.iso !== value) (e.currentTarget as HTMLElement).style.background = 'rgba(var(--text-rgb),0.06)' }}
                onMouseLeave={e => { if (c.iso !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{flagEmoji(c.iso)}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
