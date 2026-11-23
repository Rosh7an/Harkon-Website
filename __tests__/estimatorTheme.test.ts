import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('components/SolutionDiscovery.module.css', 'utf8')
const tsx = readFileSync('components/SolutionDiscovery.tsx', 'utf8')
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('\n}', start))
}

describe('estimator follows the site theme', () => {
  it('drops its old navy and blue palette', () => {
    for (const old of ['#070e15', '#142433', '#c6d9e6', '#e65b2a', '--guided-mode', 'rgba(211, 231, 245', 'rgba(198, 218, 233']) {
      expect(css.toLowerCase()).not.toContain(old)
    }
  })
  it('does not override the site colour tokens, so light and dark come from globals.css', () => {
    const own = block('.experience') + block(":global(:root[data-theme='light']) .experience")
    for (const token of ['--bg:', '--text:', '--muted:', '--accent:', '--accent-text:', '--on-accent:', '--surface:', '--border:', '--border-hi:']) {
      expect(own).not.toContain(`  ${token}`)
    }
    // The card itself sits on the site's surface colour.
    expect(block('.experience')).toContain('var(--surface);')
  })
  it('uses the site button shapes: accent pill for the main action, outline pill for the rest', () => {
    expect(tsx).toMatch(/const primary = `[^`]*rounded-full[^`]*bg-\[var\(--accent-strong\)\][^`]*text-white/)
    expect(tsx).toMatch(/const secondary = `[^`]*rounded-full[^`]*border-\[var\(--line-strong\)\]/)
  })
  it('has a light-theme block for the warning colours only', () => {
    const light = block(":global(:root[data-theme='light']) .experience")
    expect(light.match(/--[a-z-]+:/g)!.every(name => name.startsWith('--warning'))).toBe(true)
  })
})
