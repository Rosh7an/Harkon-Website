import { describe, expect, it } from 'vitest'
import { splitSavedAnswer } from '../components/SavedAnswerEditor'

const options = ['Enquiries are getting lost', 'Too much manual work']
describe('saved answer restoration', () => {
  it('restores multiple selections in customer order and keeps details', () => {
    expect(splitSavedAnswer('Too much manual work. Enquiries are getting lost. We lose hours daily.', options)).toEqual({ selected: [options[1], options[0]], details: 'We lose hours daily.' })
  })
  it.each([null, undefined, '', 42])('handles empty or invalid saved input %s', value => {
    expect(splitSavedAnswer(value, options)).toEqual({ selected: [], details: '' })
  })
  it('restores an option-only answer', () => {
    expect(splitSavedAnswer(options[0], options)).toEqual({ selected: [options[0]], details: '' })
  })
  it('preserves prose containing or extending option names', () => {
    for (const details of ['We said Too much manual work yesterday.', 'Too much manual work is our main concern.', 'An old suggestion. Keep this.']) {
      expect(splitSavedAnswer(details, options)).toEqual({ selected: [], details })
    }
  })
  it('keeps free text on questions without suggestions', () => {
    expect(splitSavedAnswer('A local shop.', [])).toEqual({ selected: [], details: 'A local shop.' })
  })
})
