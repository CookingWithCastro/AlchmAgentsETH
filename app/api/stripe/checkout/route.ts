import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { auth } from '@/lib/auth'
import { getStripe, ALCHEMIST_PRICE_IDS } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST { interval?: 'monthly' | 'yearly' } — start a Stripe Checkout session for
 * the Alchemist subscription. Returns { url } to redirect the browser to.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const email = session?.user?.email || undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { interval?: 'monthly' | 'yearly' }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const interval = body.interval === 'yearly' ? 'yearly' : 'monthly'
  const priceId = interval === 'yearly' ? ALCHEMIST_PRICE_IDS.yearly : ALCHEMIST_PRICE_IDS.monthly
  if (!priceId) {
    return NextResponse.json({ error: 'Subscription price is not configured' }, { status: 500 })
  }

  const stripe = getStripe()
  const origin = new URL(request.url).origin

  // Reuse the user's existing Stripe customer if we have one; otherwise let
  // Checkout create it from their email (avoids orphan customers on abandon).
  const existing = await prisma.userSubscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL || `${origin}/account?checkout=success`,
    cancel_url: process.env.STRIPE_CANCEL_URL || `${origin}/pricing?checkout=cancelled`,
    client_reference_id: userId,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  }
  if (existing?.stripeCustomerId) params.customer = existing.stripeCustomerId
  else if (email) params.customer_email = email

  const checkout = await stripe.checkout.sessions.create(params)
  return NextResponse.json({ url: checkout.url })
}
