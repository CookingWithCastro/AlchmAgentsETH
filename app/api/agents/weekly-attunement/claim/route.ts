/**
 * POST /api/agents/weekly-attunement/claim
 *
 * Completes a weekly "attunement circle" and pays the human their ESMS two ways:
 *   1. Live transit attunement — runs the conjunction airdrop scoped to this
 *      user, so any of this week's transits hitting their natal points credit
 *      now (alchm.kitchen Sky Drop).
 *   2. Weekly circle quest reward — a small fixed ESMS grant, once per week.
 *
 * Both credit the human's alchm.kitchen (Railway) wallet; neither writes a real
 * Neon balance. Idempotent per week.
 *
 * Body: { messageCount: number }  — the circle must have at least MIN_MESSAGES
 * exchanges to qualify (a light anti-abuse gate).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { grantWeeklyAttunementReward } from '@/lib/agents/chat-quest-reward'
import { runTransitAttunements } from '@/lib/agents/transit-attunement'
import { CHAT_QUEST_REWARD } from '@/lib/economy-config'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user.id
    const email = session?.user.email
    if (!userId || !email) {
      return NextResponse.json({ ok: false, error: 'auth_required' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const messageCount = Number(body?.messageCount ?? 0)
    if (!Number.isFinite(messageCount) || messageCount < CHAT_QUEST_REWARD.minExchanges) {
      return NextResponse.json(
        {
          ok: false,
          error: 'circle_incomplete',
          need: CHAT_QUEST_REWARD.minExchanges,
          have: messageCount,
        },
        { status: 400 }
      )
    }

    // 1) Surface live attunement airdrops for this user (non-fatal).
    let attunement: unknown = null
    try {
      attunement = await runTransitAttunements({ onlyWalletEmail: email })
    } catch (err) {
      console.warn('[weekly-attunement/claim] scoped attunement failed:', err)
    }

    // 2) Weekly circle quest reward, scaled by engagement (idempotent per week).
    const quest = await grantWeeklyAttunementReward({
      userId,
      userEmail: email,
      exchanges: messageCount,
    })

    return NextResponse.json({ ok: true, attunement, quest })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 })
  }
}
