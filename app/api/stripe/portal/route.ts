import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe/client'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** POST — open the Stripe billing portal for the current user. Returns { url }. */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await prisma.userSubscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })
  if (!row?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const origin = new URL(request.url).origin
  const portal = await getStripe().billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: process.env.STRIPE_PORTAL_RETURN_URL || `${origin}/account`,
  })
  return NextResponse.json({ url: portal.url })
}
