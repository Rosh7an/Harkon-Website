// Commercial policy: standard selling prices are 140% of the promotional build
// estimate. This is a 28.6% reduction from standard, not a 40% discount.
export const STANDARD_PRICE_FACTOR = 1.4
// Hold the visible standard price long enough to read, then reveal the offer.
export const PRICE_REVEAL_DELAY_MS = 1000
export const PRICE_REVEAL_END_MS = 2750

export function estimatePricing(offerLow: number, offerHigh: number) {
  if (![offerLow, offerHigh].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / STANDARD_PRICE_FACTOR) || offerLow > offerHigh) {
    throw new Error('The estimate price range is invalid.')
  }
  return {
    standardLow: Math.round(offerLow * STANDARD_PRICE_FACTOR),
    standardHigh: Math.round(offerHigh * STANDARD_PRICE_FACTOR),
    offerLow,
    offerHigh,
  }
}
export type EstimatePricing = ReturnType<typeof estimatePricing>

export function revealedPrice(pricing: EstimatePricing, elapsedMs: number) {
  const progress = Math.min(1, Math.max(0, (elapsedMs - PRICE_REVEAL_DELAY_MS) / (PRICE_REVEAL_END_MS - PRICE_REVEAL_DELAY_MS)))
  const remaining = (1 - progress) ** 3
  return {
    low: Math.round(pricing.offerLow + (pricing.standardLow - pricing.offerLow) * remaining),
    high: Math.round(pricing.offerHigh + (pricing.standardHigh - pricing.offerHigh) * remaining),
  }
}
