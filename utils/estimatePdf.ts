import { QUESTIONS, customerAnswers, discoveryReviewItems } from './discovery'
import type { DiscoveryResponse } from './discoveryDraft'
import { estimatePricing } from './estimatePricing'

interface PdfOptions { logo?: Uint8Array; date?: Date }
const INK = '#18263d'
const MUTED = '#536477'
const LINE = '#dce3eb'
const PALE = '#f3f6fa'
const ACCENT = '#d85c3e'
const LEFT = 18
const RIGHT = 192
const WIDTH = RIGHT - LEFT
const BOTTOM = 270
const LEADING = 5

function printable(value: string): string {
  const text = value.replace(/₹/g, 'INR ').replace(/[\u2010-\u2015]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\u00a0/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
  // Keep the existing explicit limitation: never silently corrupt customer words.
  if (/[^\u0000-\u00FF]/.test(text)) throw new Error('This PDF font cannot display some of your text. Please use the proposal form to share the full requirements.')
  return text
}
const money = (value: number) => `INR ${value.toLocaleString('en-IN')}`
const hours = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 1 })

/** Render only the confirmed server result; this function does not calculate prices. */
export async function createEstimatePdf(view: DiscoveryResponse, options: PdfOptions = {}) {
  if (!view?.session || view.session.stage !== 'confirmed' || !view.result || !view.result.work.length) throw new Error('A confirmed estimate is required before downloading the PDF.')
  const { session, result } = view
  const numbers = [result.lowEstimateCost, result.highEstimateCost, result.lowEstimateHours, result.highEstimateHours, result.hourlyRate, result.weeks.low, result.weeks.high, result.rawFeatureTotal, result.surcharge, result.setupOverhead, result.qaOverhead, result.pmOverhead, ...result.work.map(item => item.expectedHours)]
  if (numbers.some(value => !Number.isFinite(value) || value < 0) || result.lowEstimateCost > result.highEstimateCost || result.lowEstimateHours > result.highEstimateHours || result.weeks.low > result.weeks.high) throw new Error('The estimate contains invalid values. Please reopen your plan and retry.')
  const pricing = estimatePricing(result.lowEstimateCost, result.highEstimateCost)
  if (!result.pricing || Object.entries(pricing).some(([key, value]) => result.pricing[key as keyof typeof pricing] !== value)) throw new Error('The estimate pricing has changed. Please reopen your plan before downloading.')
  const date = options.date ?? new Date()
  if (!Number.isFinite(date.getTime())) throw new Error('The estimate date is invalid.')
  const dateLabel = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const original = customerAnswers(session)
  const answers = QUESTIONS.flatMap(question => {
    const fact = session.facts[question.id]
    const value = fact?.source === 'edit' ? fact.value : original.get(question.id) ?? fact?.value
    return value ? [{ title: question.label + (fact?.source === 'edit' ? ' (updated)' : ''), text: printable(value) }] : []
  })
  const reviewItems = [...new Set([...view.reviewItems, ...discoveryReviewItems(session)])].map(printable)
  const work = result.work.map(item => ({ ...item, name: printable(item.name) }))
  const catalog = printable(session.catalogVersion)
  let logo = options.logo
  if (!logo) {
    try {
      const response = await fetch('/logo-lockup-onlight.png')
      if (!response.ok) throw new Error('Logo response failed')
      logo = new Uint8Array(await response.arrayBuffer())
    } catch { throw new Error('The estimate logo could not be loaded. Please retry the download.') }
  }
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  pdf.setProperties({ title: 'Exter Cloud - Preliminary solution estimate', subject: 'Confirmed scope; indicative pricing subject to team review', author: 'Exter Cloud', creator: 'Exter Cloud estimator' })
  let logoSize: { width: number; height: number }
  try { logoSize = pdf.getImageProperties(logo) }
  catch { throw new Error('The estimate logo could not be loaded. Please retry the download.') }
  const logoWidth = 41
  const logoHeight = logoWidth * logoSize.height / logoSize.width
  let y = 68
  let pageTitle = 'Preliminary estimate'

  function font(size = 10, bold = false, color = INK) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(color)
  }
  function rule(at: number) { pdf.setDrawColor(LINE); pdf.setLineWidth(0.25); pdf.line(LEFT, at, RIGHT, at) }
  function header(title: string) {
    font(8, true, ACCENT); pdf.text('EXTER CLOUD / SOLUTION PLANNING', LEFT, 19)
    font(23, true); pdf.text(title, LEFT, 31)
    font(9, false, MUTED); pdf.text('Prepared from your reviewed solution scope', LEFT, 40)
    pdf.addImage(logo!, 'PNG', RIGHT - logoWidth, 13, logoWidth, logoHeight, 'exter-logo', 'FAST')
    font(9, true); pdf.text(`Prepared: ${dateLabel}`, LEFT, 51)
    font(8, false, MUTED); pdf.text('Not a final quote', RIGHT, 51, { align: 'right' })
    rule(58)
  }
  function newPage(title = pageTitle) {
    pdf.addPage(); pageTitle = title; header(title); y = 68
  }
  // Paragraphs can span pages. Reserve room for the heading plus two body lines;
  // never put body text into the footer or strand a heading at a page bottom.
  function section(title: string, paragraphs: string[]) {
    font(10)
    const wrapped = paragraphs.map(text => pdf.splitTextToSize(printable(text), WIDTH) as string[])
    const blockHeight = 9 + wrapped.reduce((sum, lines) => sum + lines.length * LEADING + 3, 0) + 5
    // Keep short sections together; only genuinely long answers need splitting.
    if (y + 17 > BOTTOM || (blockHeight <= BOTTOM - 68 && y + blockHeight > BOTTOM)) newPage()
    function heading(continued = false) {
      font(12, true); pdf.text(`${title}${continued ? ' (continued)' : ''}`, LEFT, y); y += 9
    }
    heading()
    font(10, false, MUTED)
    for (const lines of wrapped) {
      for (const line of lines) {
        if (y > BOTTOM) { newPage(); heading(true); font(10, false, MUTED) }
        pdf.text(line, LEFT, y); y += LEADING
      }
      y += 3
    }
    y += 5
  }
  header(pageTitle)

  // A clearly labelled one-time build range, not an invoice or binding quotation.
  pdf.setFillColor(INK); pdf.roundedRect(LEFT, y, WIDTH, 58, 3, 3, 'F')
  font(9, true, '#ffffff'); pdf.text(session.allowPartial ? 'PARTIAL ESTIMATE / INCLUDED BUILD WORK ONLY' : 'INDICATIVE ONE-TIME BUILD INVESTMENT', LEFT + 7, y + 10)
  const standardLabel = `Standard price: ${money(pricing.standardLow)} - ${money(pricing.standardHigh)}`
  font(10, false, '#dce3eb'); pdf.text(standardLabel, LEFT + 7, y + 21)
  pdf.setDrawColor('#dce3eb'); pdf.setLineWidth(0.3)
  pdf.line(LEFT + 7, y + 20, LEFT + 7 + pdf.getTextWidth(standardLabel), y + 20)
  font(8, true, '#ffffff'); pdf.text('PROMOTIONAL BUILD ESTIMATE / 28.6% OFF STANDARD', LEFT + 7, y + 29)
  font(21, true, '#ffffff'); pdf.text(`${money(pricing.offerLow)} - ${money(pricing.offerHigh)}`, LEFT + 7, y + 40)
  font(9, false, '#dce3eb'); pdf.text('Final scope, cost and delivery are confirmed with our team.', LEFT + 7, y + 51)
  y += 66
  const cards = [
    ['ENGINEERING EFFORT', `${Math.round(result.lowEstimateHours)} - ${Math.round(result.highEstimateHours)} hours`],
    ['PLANNING WINDOW', `${result.weeks.low} - ${result.weeks.high} weeks`],
  ]
  cards.forEach(([label, value], index) => {
    const cardWidth = (WIDTH - 6) / cards.length
    const x = LEFT + index * (cardWidth + 6)
    pdf.setFillColor(PALE); pdf.roundedRect(x, y, cardWidth, 25, 2, 2, 'F')
    font(7.5, true, MUTED); pdf.text(label, x + 4, y + 8)
    font(12, true); pdf.text(value, x + 4, y + 17)
  })
  y += 37
  font(13, true); pdf.text('Included work', LEFT, y); y += 7
  font(9, false, MUTED); pdf.text('Base allocations below exclude delivery overheads and uncertainty.', LEFT, y); y += 7

  function tableHead() {
    pdf.setFillColor(INK); pdf.rect(LEFT, y, WIDTH, 10, 'F')
    font(8, true, '#ffffff'); pdf.text('SCOPE / WORK ITEM', LEFT + 4, y + 6.5)
    pdf.text('BASE HOURS', RIGHT - 4, y + 6.5, { align: 'right' }); y += 10
  }
  tableHead()
  for (const [index, item] of work.entries()) {
    font(10)
    const lines = pdf.splitTextToSize(item.name, 130) as string[]
    const height = Math.max(13, lines.length * LEADING + 7)
    if (y + height > BOTTOM) { newPage('Included work'); tableHead() }
    pdf.setFillColor(index % 2 === 0 ? PALE : '#ffffff'); pdf.rect(LEFT, y, WIDTH, height, 'F')
    font(10); pdf.text(lines, LEFT + 4, y + 7, { lineHeightFactor: LEADING / (10 * 0.352778) })
    pdf.text(hours(item.expectedHours), RIGHT - 4, y + 7, { align: 'right' })
    y += height
  }
  if (y + 18 > BOTTOM) newPage('Included work')
  rule(y); y += 8
  font(10, true); pdf.text('Base work allocation', LEFT + 4, y); pdf.text(`${hours(result.rawFeatureTotal)} hours`, RIGHT - 4, y, { align: 'right' }); y += 12
  const readingNote = 'The total engineering range includes integration, setup, testing, project management and scope uncertainty. Base hours are planning allocations, not separate item quotes. The shared foundation is counted once.'
  font(10)
  const readingHeight = 17 + (pdf.splitTextToSize(readingNote, WIDTH) as string[]).length * LEADING
  const readingFits = y + readingHeight <= BOTTOM
  if (readingFits) section('How to read this estimate', [readingNote])

  newPage('Scope & assumptions')
  if (!readingFits) section('How to read this estimate', [readingNote])
  section('Pricing & delivery basis', [
    `Delivery preference: ${session.scope.timelineSpeed === 'expedited' ? 'Priority delivery; 25% price uplift included in the build range.' : 'Standard delivery.'} Scope uncertainty: ${{ clear: 'well understood', standard: 'standard planning allowance', novel: 'new or complex work' }[session.scope.riskProfile]}.`,
    `Planning allowances: integration ${hours(result.surcharge)} hours; setup ${hours(result.setupOverhead)} hours; testing ${hours(result.qaOverhead)} hours; project management ${hours(result.pmOverhead)} hours. These sit above the base work allocations before uncertainty adjustments.`,
    'The delivery window is indicative, subject to team capacity, agreed requirements and timely feedback. It is not a guaranteed launch date.',
  ])
  section('Working assumptions', [
    'One shared solution foundation, basic agreed workflows and separately scoped interfaces. Work allocations are provisional and require team review.',
    ...(session.scope.capabilityIds.includes('payments') ? [`Payment preference: ${session.scope.billing === 'undecided' ? 'not decided; excluded pending review' : session.scope.billing === 'one_time' ? 'one-time payments' : 'recurring subscriptions'}.`] : []),
    ...(session.scope.integrationIds.includes('existing_crm') ? [`Existing customer system: ${session.scope.crmProvider === 'undecided' ? 'not decided; excluded pending review' : session.scope.crmProvider}.`] : []),
  ])
  if (reviewItems.length) section(session.allowPartial ? 'Excluded / awaiting team review' : 'Items for team review', reviewItems)
  section('Not included in this build range', [
    'Hosting, domains, third-party licenses, messaging charges, AI usage, maintenance, ongoing SEO or marketing and taxes are separate. Unresolved requirements are not priced by this estimate.',
  ])
  section('Next step: review with the team', [
    'This document is an AI-assisted preliminary estimate based on an initial study of the business information you provided. It is not a final quotation, invoice or agreement to deliver.',
    'Workflow details, integrations, user roles, existing data, security requirements, third-party costs and implementation complexity may change the final scope, price and delivery plan.',
    'Call or WhatsApp an Exter Cloud Solution Consultant using the options on the estimate page. The consultant can re-evaluate the recommendation, remove unnecessary features, identify missing requirements, and decide what fits the current budget versus a later phase.',
  ])
  font(8, false, MUTED)
  if (y + 12 > BOTTOM) newPage()
  const catalogLines = pdf.splitTextToSize(`Pricing catalogue: ${catalog}.`, WIDTH) as string[]
  for (const line of catalogLines) {
    if (y > BOTTOM) { newPage(); font(8, false, MUTED) }
    pdf.text(line, LEFT, y); y += 4
  }
  if (answers.length) {
    newPage('Your requirements')
    section('Your answers, in your own words', ['Kept with your estimate for the team discussion. Edited answers replace earlier answers; these notes do not automatically add priced work.'])
    for (const answer of answers) section(answer.title, [answer.text])
  }
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    pdf.setPage(page); rule(279)
    font(8, false, MUTED); pdf.text('EXTER CLOUD  /  Preliminary estimate - subject to team review', LEFT, 286)
    pdf.text(`Page ${page} of ${pageCount}`, RIGHT, 286, { align: 'right' })
  }
  return pdf
}
