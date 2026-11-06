// jsPDF's built-in fonts only encode Latin-1, and it cannot shape scripts such
// as Malayalam (joined letters, reordered vowel signs) even with an embedded
// font. The browser can, so those lines are drawn on a canvas and placed in the
// PDF as transparent images. Each image is one line, so pagination still works.

export interface TextLineImage {
  /** PNG data URL. */
  data: string
  widthMm: number
  heightMm: number
  /** Distance from the image top to the text baseline. */
  baselineMm: number
}
export interface ComplexTextStyle { widthMm: number; fontSizePt: number; color: string; lineHeightMm: number }
export type ComplexTextRenderer = (text: string, style: ComplexTextStyle) => TextLineImage[]

const PT_TO_MM = 0.352778
// About 300 DPI: sharp in print, small enough for a few pages of answers.
const PX_PER_MM = 12
const FONT_FAMILY = 'Helvetica, Arial, "Noto Sans", "Noto Sans Malayalam", "Malayalam Sangam MN", "Kartika", sans-serif'

/** True when jsPDF's standard fonts cannot draw the text. */
export function needsComplexRendering(text: string): boolean {
  return /[^\u0000-ÿ]/.test(text)
}

function graphemes(text: string): string[] {
  // Never split inside a grapheme: in Malayalam that would break a letter apart.
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), part => part.segment)
  }
  return Array.from(text)
}

/**
 * Wrap text to a maximum width using a measuring function. Keeps explicit line
 * breaks, wraps at spaces, and only breaks a word (between graphemes) when the
 * word alone is wider than the line.
 */
export function wrapText(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  if (!(maxWidth > 0)) throw new RangeError('Line width must be positive')
  const lines: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate) <= maxWidth) { line = candidate; continue }
      if (line) lines.push(line)
      line = ''
      if (measure(word) <= maxWidth) { line = word; continue }
      for (const part of graphemes(word)) {
        if (line && measure(line + part) > maxWidth) { lines.push(line); line = '' }
        line += part
      }
    }
    lines.push(line)
  }
  return lines
}

export class ComplexTextUnavailableError extends Error {}

/** Default renderer, using a browser canvas. */
export const renderWithCanvas: ComplexTextRenderer = (text, { widthMm, fontSizePt, color, lineHeightMm }) => {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  const context = canvas?.getContext('2d')
  if (!canvas || !context) throw new ComplexTextUnavailableError('Canvas is unavailable')
  const font = `${fontSizePt * PT_TO_MM * PX_PER_MM}px ${FONT_FAMILY}`
  context.font = font
  const lines = wrapText(text, widthMm * PX_PER_MM, value => context.measureText(value).width)
  // Leave room for tall Malayalam vowel signs above and below the line. Images
  // are transparent, so the slight overlap between neighbouring lines is harmless.
  const heightMm = lineHeightMm + 2
  const baselineMm = heightMm * 0.7
  return lines.map(line => {
    const lineWidthPx = Math.max(1, Math.ceil(context.measureText(line).width) + 4)
    canvas.width = lineWidthPx
    canvas.height = Math.ceil(heightMm * PX_PER_MM)
    // Resizing a canvas resets its drawing state.
    context.font = font
    context.fillStyle = color
    context.textBaseline = 'alphabetic'
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (line) context.fillText(line, 0, baselineMm * PX_PER_MM)
    return { data: canvas.toDataURL('image/png'), widthMm: lineWidthPx / PX_PER_MM, heightMm, baselineMm }
  })
}
