import { describe, expect, it } from 'vitest'
import { validate } from '../components/QueryModal'
import { CONTACT_MESSAGE_MAX } from '../utils/contactLimits'

describe('QueryModal validation', () => {
  it('accepts a complete valid inquiry', () => {
    expect(validate({ name: 'Asha', email: 'asha@example.com', phone: '98765 43210', message: 'Please review my project scope.' }, [10, 10])).toEqual({})
  })

  it('reports empty required fields', () => {
    expect(validate({ name: '', email: '', phone: '', message: '' }, [10, 10])).toEqual({
      name: 'Name is required.',
      email: 'Email is required.',
      phone: 'Phone number is required.',
      message: 'Message is required.',
    })
  })

  it('rejects boundary and malformed values', () => {
    const errors = validate({ name: 'A', email: 'not-an-email', phone: '123', message: 'short' }, [10, 10])
    expect(errors.name).toMatch(/short/)
    expect(errors.email).toMatch(/valid/)
    expect(errors.phone).toMatch(/10-digit/)
    expect(errors.message).toMatch(/min 10/)
  })
  it('matches the API length boundary for full discovery summaries', () => {
    const fields = { name: 'Asha', email: 'asha@example.test', phone: '9876543210', message: 'x'.repeat(CONTACT_MESSAGE_MAX) }
    expect(validate(fields, [10, 10])).toEqual({})
    expect(validate({ ...fields, message: fields.message + 'x' }, [10, 10]).message).toMatch(/at most/)
  })
})
