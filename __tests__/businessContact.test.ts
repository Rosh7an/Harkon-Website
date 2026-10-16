import { describe, expect, it } from 'vitest'
import { businessContactLinks } from '../utils/businessContact'

describe('public business contact links', () => {
  it('uses an international WhatsApp number for both actions when no separate phone is configured', () => {
    const links = businessContactLinks({ whatsapp: '+91 98765 43210' })
    expect(links.call).toBe('tel:+919876543210')
    expect(links.whatsapp).toContain('https://wa.me/919876543210?text=')
    expect(decodeURIComponent(links.whatsapp!)).toContain('discuss a project estimate')
  })
  it('supports a separate call number without changing WhatsApp', () => {
    const links = businessContactLinks({ phone: '+44 (20) 7946-0958', whatsapp: '919876543210' })
    expect(links.call).toBe('tel:+442079460958')
    expect(links.whatsapp).toContain('/919876543210?')
  })
  it('leaves missing and malformed numbers unavailable, without guessing values', () => {
    for (const input of [undefined, null, {}, { whatsapp: '' }, { whatsapp: 'javascript:alert(1)' }, { whatsapp: '123' }, { whatsapp: '01234567890' }, { whatsapp: 12 }]) {
      expect(businessContactLinks(input)).toEqual({ call: null, whatsapp: null })
    }
  })
  it('enforces the international-number length boundary and uses only generic WhatsApp text', () => {
    expect(businessContactLinks({ whatsapp: '1'.repeat(15) }).call).not.toBeNull()
    expect(businessContactLinks({ whatsapp: '1'.repeat(16) }).call).toBeNull()
    expect(businessContactLinks({ phone: 'invalid', whatsapp: '919876543210' }).call).toBeNull()
    expect(decodeURIComponent(businessContactLinks({ whatsapp: '919876543210' }).whatsapp!)).not.toMatch(/₹|customer records|scope:/)
  })
})
