/**
 * Stripe client + price→plan mapping for the PA premium subscription.
 *
 * Lazily initialized so importing this module never throws when STRIPE_SECRET_KEY
 * is unset (tests, build, environments without billing configured).
 */

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  // Omit apiVersion → use the SDK's pinned default, avoiding literal-type drift.
  _stripe = new Stripe(key)
  return _stripe
}

export const ALCHEMIST_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ALCHEMIST_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ALCHEMIST_YEARLY,
}

/** Map a Stripe price id to the PA plan tier it grants. */
export function planForPrice(priceId: string | null | undefined): 'alchemist' | null {
  if (!priceId) return null
  const alchemistPrices = [ALCHEMIST_PRICE_IDS.monthly, ALCHEMIST_PRICE_IDS.yearly].filter(Boolean)
  return alchemistPrices.includes(priceId) ? 'alchemist' : null
}
