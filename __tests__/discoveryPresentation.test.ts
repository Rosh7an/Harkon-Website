import { describe, expect, it } from 'vitest'
import { createDiscovery, recordAnswer } from '../utils/discovery'
import { CAPABILITIES, INTEGRATIONS, MODIFIERS, SURFACES } from '../utils/solutionCatalog'
import { CAPABILITY_CHOICES, INTEGRATION_CHOICES, MODIFIER_CHOICES, SURFACE_CHOICES, customerWording, discoveryProgress } from '../utils/discoveryPresentation'

describe('customer-facing discovery presentation', () => {
  it('starts with no progress and reaches 100 only once work is estimated', () => {
    expect(discoveryProgress(null)).toMatchObject({ step: 1, percent: 0, topics: 0 })
    const start = createDiscovery('guided')
    const answered = recordAnswer(start, 'A local shop')
    expect(discoveryProgress(answered)).toMatchObject({ step: 1, percent: 8, topics: 1 })
    expect(discoveryProgress({ ...answered, stage: 'confirmed' }, { hasResult: true })).toMatchObject({ step: 3, percent: 100 })
  })
  it('keeps uncertainty and early-review missing details visible', () => {
    const uncertain = recordAnswer(createDiscovery('guided'), 'I’m not sure yet')
    expect(discoveryProgress(uncertain).detail).toContain('1 still needs clarification')
    const early = discoveryProgress({ ...uncertain, stage: 'review' })
    expect(early.topics).toBe(1)
    expect(early.percent).toBeLessThan(100)
    expect(early.detail).toContain('missing details')
    expect(discoveryProgress({ ...uncertain, stage: 'confirmed', allowPartial: true }, { hasResult: true }).detail).toContain('not included')
  })
  it('has a plain-language label for every canonical choice without changing IDs', () => {
    for (const [catalog, choices] of [[SURFACES, SURFACE_CHOICES], [CAPABILITIES, CAPABILITY_CHOICES], [INTEGRATIONS, INTEGRATION_CHOICES], [MODIFIERS, MODIFIER_CHOICES]]) {
      expect(Object.keys(choices).sort()).toEqual(Object.keys(catalog).sort())
    }
    expect(customerWording('Advanced website SEO needs Public website.')).toBe('Choose a public website before adding search-engine setup.')
    expect(customerWording('AI scope mapping was unavailable. Test detail')).toContain('consultant can check the full plan')
    expect(customerWording('Existing systems and constraints still needs confirmation.')).toBe('Confirm any tools, existing data or special needs.')
  })
})
