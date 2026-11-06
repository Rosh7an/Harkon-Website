// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { needsComplexRendering, wrapText } from '../utils/pdfComplexText'

// One unit per character keeps widths easy to reason about.
const measure = (value: string) => Array.from(value).length

describe('needsComplexRendering', () => {
  it('is false for Latin-1 text and true for other scripts', () => {
    expect(needsComplexRendering('Café, 50% off')).toBe(false)
    expect(needsComplexRendering('')).toBe(false)
    expect(needsComplexRendering('ബുക്കിംഗ്')).toBe(true)
    expect(needsComplexRendering('Booking ✓')).toBe(true)
  })
})

describe('wrapText', () => {
  it('wraps at spaces', () => {
    expect(wrapText('one two three four', 9, measure)).toEqual(['one two', 'three', 'four'])
  })
  it('keeps explicit line breaks, including blank lines', () => {
    expect(wrapText('a\n\nb\r\nc', 10, measure)).toEqual(['a', '', 'b', 'c'])
  })
  it('returns one empty line for empty text', () => {
    expect(wrapText('', 10, measure)).toEqual([''])
  })
  it('breaks an over-long word only between graphemes', () => {
    // "ക്കി" is one grapheme cluster made of four code points.
    const word = 'ബുക്കിംഗ്'
    const lines = wrapText(word, 4, measure)
    expect(lines.join('')).toBe(word)
    for (const piece of lines) expect(piece.startsWith('്') || piece.startsWith('ു') || piece.startsWith('ി') || piece.startsWith('ം')).toBe(false)
  })
  it('rejects a non-positive width', () => {
    expect(() => wrapText('a', 0, measure)).toThrow(RangeError)
    expect(() => wrapText('a', Number.NaN, measure)).toThrow(RangeError)
  })
})
