import { readFileSync } from 'node:fs'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { createEstimatePdf } from '../utils/estimatePdf'
import { QUESTIONS, createDiscovery } from '../utils/discovery'
import type { DiscoveryResponse } from '../utils/discoveryDraft'
import { emptyScope, estimateSolution, reviewScope } from '../utils/solutionCatalog'

const options = { logo: new Uint8Array(readFileSync('public/logo-lockup-onlight.png')), date: new Date('2026-10-14T00:00:00Z') }
function confirmed(): DiscoveryResponse {
  const session = createDiscovery('manual')
  session.stage = 'confirmed'
  session.scope = { ...emptyScope(), surfaceIds: ['website', 'mobile'] }
  return { token: 'private-session-token', session, question: null, reviewItems: [], result: estimateSolution(session.scope) }
}
afterEach(() => vi.unstubAllGlobals())
describe('branded estimate PDF', () => {
  it('uses authoritative prices, branding, dates, sections and footers', async () => {
    const view = confirmed()
    const pdf = await createEstimatePdf(view, options)
    const output = pdf.output()
    expect(output).toContain('%PDF-')
    expect(output).toContain('/Subtype /Image')
    expect(output).toContain('INR 84,300 - INR 1,19,100')
    expect(output).toContain('Preliminary estimate')
    expect(output).toContain('Public website')
    expect(output).toContain('Mobile app')
    expect(output).toContain('14 Oct 2026')
    expect(output).toContain('Not a final quote')
    expect(output).toContain(`Page 1 of ${pdf.getNumberOfPages()}`)
    expect(output).not.toContain(view.token)
    expect(pdf.getNumberOfPages()).toBe(2)
  // The first export also loads jsPDF and decodes the full-resolution logo.
  // Allow for cold imports while the rest of the suite starts its DOM workers.
  }, 15_000)
  it('handles no discovery answers without inventing client details', async () => {
    const pdf = await createEstimatePdf(confirmed(), options)
    expect(pdf.output()).not.toContain('Your requirements')
    expect(pdf.output()).not.toContain('Client name')
  })
  it('preserves original answers, uses edits and paginates long requirements', async () => {
    const view = confirmed()
    view.session.mode = 'guided'
    view.session.messages = [{ role: 'assistant', text: QUESTIONS[4].text }, { role: 'user', text: 'I need a website and mobile app for my customers.' }]
    view.session.facts.users = { value: 'Customers need a website', evidence: 'website', status: 'reported', source: 'ai' }
    view.session.facts.pain = { value: 'Corrected pain point', evidence: 'old answer', source: 'edit', status: 'reported' }
    view.session.facts.workflow = { value: 'A long workflow. '.repeat(120), evidence: '', source: 'answer', status: 'reported' }
    for (const id of ['business', 'current', 'priority'] as const) view.session.facts[id] = { value: 'Detailed requirements for the team. '.repeat(55), evidence: '', source: 'answer', status: 'reported' }
    const pdf = await createEstimatePdf(view, options)
    const output = pdf.output()
    expect(output).toContain('I need a website and mobile app')
    expect(output).toContain('Corrected pain point')
    expect(output).not.toContain('Customers need a website')
    expect(output).toContain('Your requirements')
    expect(pdf.getNumberOfPages()).toBeGreaterThan(3)
    for (let page = 1; page <= pdf.getNumberOfPages(); page++) expect(output).toContain(`Page ${page} of ${pdf.getNumberOfPages()}`)
  })
  it('separates excluded partial scope from included priced work', async () => {
    const view = confirmed()
    view.session.allowPartial = true
    view.session.scope.integrationIds = ['external_api']
    const review = reviewScope(view.session.scope)
    view.reviewItems = review.reviewItems
    view.result = estimateSolution(review.pricedScope)
    const pdf = await createEstimatePdf(view, options)
    expect(pdf.output()).toContain('PARTIAL ESTIMATE')
    expect(pdf.output()).toContain('Excluded / awaiting team review')
    expect(pdf.output()).toContain('not included until its details')
  })
  it('repeats table headings when many rows span pages', async () => {
    const view = confirmed()
    view.result!.work = Array.from({ length: 55 }, (_, index) => ({ id: `row-${index}`, name: `Included work ${index + 1}`, expectedHours: 10 }))
    const pdf = await createEstimatePdf(view, options)
    expect(pdf.output()).toContain('Included work 55')
    expect((pdf.output().match(/BASE HOURS/g) ?? []).length).toBeGreaterThan(1)
  })
  it('continues a single line-heavy answer safely across pages', async () => {
    const view = confirmed()
    view.session.facts.workflow = { value: Array.from({ length: 190 }, (_, index) => `Step ${index + 1}`).join('\n'), evidence: '', source: 'answer', status: 'reported' }
    const pdf = await createEstimatePdf(view, options)
    expect(pdf.output()).toContain('Step 190')
    expect(pdf.output()).toContain('Desired outcome and workflow \\(continued\\)')
    expect(pdf.getNumberOfPages()).toBeGreaterThan(4)
  })
  it.each([null, undefined])('rejects missing input: %s', async value => {
    await expect(createEstimatePdf(value as unknown as DiscoveryResponse, options)).rejects.toThrow(/confirmed estimate/)
  })
  it('rejects missing results, unconfirmed estimates and invalid numbers', async () => {
    const view = confirmed()
    await expect(createEstimatePdf({ ...view, result: null }, options)).rejects.toThrow(/confirmed estimate/)
    await expect(createEstimatePdf({ ...view, session: { ...view.session, stage: 'review' } }, options)).rejects.toThrow(/confirmed estimate/)
    view.result!.highEstimateCost = NaN
    await expect(createEstimatePdf(view, options)).rejects.toThrow(/invalid values/)
  })
  it('rejects unreadable scripts instead of exporting corrupted requirements', async () => {
    const view = confirmed()
    view.session.facts.pain = { value: 'മലയാളം', evidence: '', source: 'answer', status: 'reported' }
    await expect(createEstimatePdf(view, options)).rejects.toThrow(/proposal form/)
  })
  it('loads the existing browser logo and reports asset failures', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, arrayBuffer: async () => options.logo.buffer }).mockResolvedValueOnce({ ok: false })
    vi.stubGlobal('fetch', fetch)
    expect((await createEstimatePdf(confirmed(), { date: options.date })).output()).toContain('/Subtype /Image')
    expect(fetch).toHaveBeenCalledWith('/logo-lockup-onlight.png')
    await expect(createEstimatePdf(confirmed())).rejects.toThrow(/logo could not be loaded/)
  })
})
