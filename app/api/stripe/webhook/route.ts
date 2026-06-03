import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { randomUUID } from 'crypto'
import { getStripe, planForPrice } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'

// Must run on Node (raw body + crypto signature verification).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook. The ONLY thing that flips a user free⇄alchemist. Idempotent:
 * all writes are upserts keyed by userId/subscription, so re-delivered events
 * converge to the same state (no separate processed-events table needed).
 */
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id
        const userIdHint = s.metadata?.userId || s.client_reference_id || null
        if (subId) {
          await syncFromSubscriptionId(subId, userIdHint)
        } else if (s.metadata?.type === 'token_purchase' && userIdHint) {
          const spirit = Number(s.metadata.spirit || 0)
          const essence = Number(s.metadata.essence || 0)
          const matter = Number(s.metadata.matter || 0)
          const substance = Number(s.metadata.substance || 0)
          await EconomyService.creditTokens(
            userIdHint,
            { spirit, essence, matter, substance },
            'token_purchase',
            'Cosmic Token Purchase (Stripe)',
            s.id
          )
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        const subId =
          typeof (inv as any).subscription === 'string'
            ? (inv as any).subscription
            : (inv as any).subscription?.id
        if (subId) await syncFromSubscriptionId(subId, null)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error for', event.type, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function syncFromSubscriptionId(subId: string, userIdHint: string | null): Promise<void> {
  const sub = await getStripe().subscriptions.retrieve(subId)
  await upsertSubscription(sub, userIdHint)
}

async function userIdFromCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null
  const row = await prisma.userSubscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  })
  return row?.userId ?? null
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  userIdHint?: string | null
): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer?.id ?? null)
  const userId = sub.metadata?.userId || userIdHint || (await userIdFromCustomer(customerId))
  if (!userId) {
    console.warn('[stripe/webhook] could not resolve userId for subscription', sub.id)
    return
  }

  const priceId = sub.items?.data?.[0]?.price?.id
  // Status gating (active/trialing) is enforced in getPaTier, so a canceled row
  // with an alchemist tier still correctly resolves to non-premium.
  const tier = planForPrice(priceId) ?? 'free'
  const status = sub.status

  // Period fields moved to subscription items in newer API versions — read
  // defensively so this works regardless of the pinned apiVersion.
  const item = sub.items?.data?.[0] as any
  const periodStart = (sub as any).current_period_start ?? item?.current_period_start
  const periodEnd = (sub as any).current_period_end ?? item?.current_period_end
  const now = new Date()
  const startDate = periodStart ? new Date(periodStart * 1000) : now
  const endDate = periodEnd ? new Date(periodEnd * 1000) : now

  await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      id: randomUUID(),
      userId,
      tier,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      tier,
      status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      updatedAt: now,
    },
  })
}
