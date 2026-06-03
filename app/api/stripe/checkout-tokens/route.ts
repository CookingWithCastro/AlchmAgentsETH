import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const email = session?.user?.email || undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tier?: '5' | '10' | '25' | '50' }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const tier = body.tier || '5'
  let priceInCents = 500
  let tokenCount = 100
  let description = '100 Cosmic ESMS Tokens'

  if (tier === '10') {
    priceInCents = 1000
    tokenCount = 240
    description = '240 Cosmic ESMS Tokens'
  } else if (tier === '25') {
    priceInCents = 2500
    tokenCount = 700
    description = '700 Cosmic ESMS Tokens'
  } else if (tier === '50') {
    priceInCents = 5000
    tokenCount = 1600
    description = '1600 Cosmic ESMS Tokens (Premium Bundle)'
  }

  const stripe = getStripe()
  const origin = new URL(request.url).origin

  // Retrieve user's stripe customer id if available
  const existing = await prisma.userSubscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })

  // Calculate the amount of each token (spirit, essence, matter, substance)
  // Split evenly by 4
  const perType = tokenCount / 4

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: description,
            description: `Receive ${perType} Spirit, ${perType} Essence, ${perType} Matter, and ${perType} Substance tokens (total: ${tokenCount}).`,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/upgrade?purchase=success&tokens=${tokenCount}`,
    cancel_url: `${origin}/upgrade?purchase=cancelled`,
    client_reference_id: userId,
    metadata: {
      userId,
      type: 'token_purchase',
      tokenCount: String(tokenCount),
      spirit: String(perType),
      essence: String(perType),
      matter: String(perType),
      substance: String(perType),
    },
  }

  if (existing?.stripeCustomerId) params.customer = existing.stripeCustomerId
  else if (email) params.customer_email = email

  try {
    const checkout = await stripe.checkout.sessions.create(params)
    return NextResponse.json({ url: checkout.url })
  } catch (err: any) {
    console.error('Failed to create stripe checkout session for tokens:', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
