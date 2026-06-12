import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'
import { DUEL_YIELD_REWARD, DUEL_YIELD_DAILY_CAP } from '@/lib/economy-config'
import { verifyDuelClaimToken } from '@/lib/economy/duel-claim-token'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/economy/duel-yield   { claimToken }
 *
 * The earn side of the arena loop. A claim requires the signed, short-lived
 * token that /api/unified-multi-agent-chat mints in its `done` event for
 * PAID multi-agent rounds — so yield is bound to a round the server actually
 * ran and billed, not to a bare authenticated POST. The token's mint
 * timestamp is the idempotency key, making each token single-spend, and
 * claims are capped at DUEL_YIELD_DAILY_CAP per UTC day.
 *
 * Returns { success, awarded?, capped, claimsToday, balances }.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => null)
    const claimToken = typeof body?.claimToken === 'string' ? body.claimToken : ''
    const verified = verifyDuelClaimToken(claimToken, userId)
    if (!verified.ok) {
      return NextResponse.json(
        { success: false, error: 'A valid duel claim is required', reason: verified.reason },
        { status: 403 }
      )
    }

    const utcDayStart = new Date()
    utcDayStart.setUTCHours(0, 0, 0, 0)

    // One Spirit row is written per credit, so its count = duel claims today.
    const claimsToday = await prisma.tokenTransaction.count({
      where: {
        userId,
        sourceType: 'duel_yield',
        tokenType: 'Spirit',
        createdAt: { gte: utcDayStart },
      },
    })

    if (claimsToday >= DUEL_YIELD_DAILY_CAP) {
      const balances = await EconomyService.getBalances(userId)
      return NextResponse.json({
        success: true,
        capped: true,
        claimsToday,
        dailyCap: DUEL_YIELD_DAILY_CAP,
        balances,
      })
    }

    const result = await EconomyService.creditTokens(
      userId,
      DUEL_YIELD_REWARD,
      'duel_yield',
      'Jing Arena duel round completed',
      `duel_yield:${userId}:${verified.mintedAt}`
    )

    return NextResponse.json({
      success: true,
      capped: false,
      awarded: DUEL_YIELD_REWARD,
      claimsToday: claimsToday + 1,
      dailyCap: DUEL_YIELD_DAILY_CAP,
      balances: result?.balances ?? (await EconomyService.getBalances(userId)),
    })
  } catch (error: any) {
    // Unique-key collision = this token was already spent.
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: true, capped: false, duplicate: true })
    }
    console.error('duel-yield error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
