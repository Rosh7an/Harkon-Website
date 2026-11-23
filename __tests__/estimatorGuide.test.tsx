import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import EstimatorGuide from '../components/site/EstimatorGuide'
import { COST_FACTORS, ESTIMATOR_FAQS, ESTIMATOR_URL, estimatorJsonLd, jsonLdScript } from '../utils/estimatorGuide'

const render = () => new DOMParser().parseFromString(renderToStaticMarkup(<EstimatorGuide />), 'text/html')

describe('estimator guide content', () => {
  it('has cost factors and FAQs with real text', () => {
    expect(COST_FACTORS.length).toBeGreaterThanOrEqual(4)
    expect(ESTIMATOR_FAQS.length).toBeGreaterThanOrEqual(5)
    for (const item of [...COST_FACTORS.map(f => ({ q: f.title, a: f.text })), ...ESTIMATOR_FAQS]) {
      expect(item.q.trim().length).toBeGreaterThan(5)
      expect(item.a.trim().length).toBeGreaterThan(20)
    }
    expect(new Set(ESTIMATOR_FAQS.map(f => f.q)).size).toBe(ESTIMATOR_FAQS.length)
  })
  it('makes no guarantee or promise claims and quotes no fixed prices', () => {
    const all = JSON.stringify([COST_FACTORS, ESTIMATOR_FAQS])
    expect(all).not.toMatch(/guarantee|promise|₹\s?\d/i)
  })
})

describe('EstimatorGuide', () => {
  it('renders every factor and every answer in the page so search engines can read them', () => {
    const doc = render()
    const text = doc.body.textContent!
    for (const factor of COST_FACTORS) expect(text).toContain(factor.title)
    // Closed FAQ answers are hidden, not removed.
    for (const faq of ESTIMATOR_FAQS) { expect(text).toContain(faq.q); expect(text).toContain(faq.a) }
    expect(doc.querySelectorAll('h2').length).toBeGreaterThanOrEqual(3)
    expect(doc.querySelector('h1')).toBeNull()
  })
})

describe('estimatorJsonLd', () => {
  it('describes a free web tool and the same FAQ shown on the page', () => {
    const [app, faq] = estimatorJsonLd()
    expect(app['@type']).toBe('WebApplication')
    expect(app.url).toBe(ESTIMATOR_URL)
    expect(app.offers).toMatchObject({ '@type': 'Offer', price: '0' })
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity!.map((q: { name: string }) => q.name)).toEqual(ESTIMATOR_FAQS.map(f => f.q))
    expect(faq.mainEntity![0].acceptedAnswer.text).toBe(ESTIMATOR_FAQS[0].a)
  })
  it('escapes "<" so the JSON can never close its script tag', () => {
    const out = jsonLdScript([{ text: '</script><script>alert(1)</script>' }])
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual([{ text: '</script><script>alert(1)</script>' }])
  })
  it('handles an empty list', () => {
    expect(jsonLdScript([])).toBe('[]')
  })
})

describe('site address', () => {
  it('uses www.extercloud.in everywhere: base address, home page and estimator', async () => {
    const { readFileSync } = await import('node:fs')
    const { SITE_URL } = await import('../utils/siteProfile')
    expect(SITE_URL).toBe('https://www.extercloud.in')
    expect(ESTIMATOR_URL).toBe('https://www.extercloud.in/cost-estimator')
    const layout = readFileSync('app/layout.tsx', 'utf8')
    expect(layout).toContain('metadataBase: new URL(SITE_URL)')
    expect(layout).not.toContain('vercel.app')
    expect(readFileSync('app/page.tsx', 'utf8')).toContain("alternates: { canonical: '/' }")
  })
})
