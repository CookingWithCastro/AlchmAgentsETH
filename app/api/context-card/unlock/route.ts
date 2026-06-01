import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-options'
import { syncDebitToAlchm } from '@/lib/alchm-debit-sync'

export const dynamic = 'force-dynamic'

// 12 ESMS, split evenly across the four token types.
const UNLOCK_COST = { spirit: '3.0000', essence: '3.0000', matter: '3.0000', substance: '3.0000' }

/**
 * Spends ESMS to unlock the user's exportable context card. Hits the real
 * alchm.kitchen wallet via syncDebitToAlchm; the idempotencyKey makes repeat
 * unlocks free (returns `already_applied`, treated as success). Degrades to a
 * no-charge unlock when economy sync isn't configured for this environment.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  const email = (session?.user as { email?: string } | undefined)?.email

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!email) {
    // No email to bill against — allow the unlock without charging.
    return NextResponse.json({ ok: true, skipped: true, balances: null })
  }

  const result = await syncDebitToAlchm({
    userEmail: email,
    amounts: UNLOCK_COST,
    operationType: 'card_export_unlock',
    source: 'context_card',
    idempotencyKey: `context_card:${userId}`,
    metadata: {
      agentName: 'Alchm Context Card',
      actionType: 'card_export_unlock',
      activationScore: 0,
      triggers: [],
    },
  })

  if (result.ok) {
    return NextResponse.json({ ok: true, balances: result.balances ?? null })
  }
  if (result.skipped) {
    // Economy sync env not configured here — let the user proceed.
    return NextResponse.json({ ok: true, skipped: true, balances: null })
  }
  if (result.reason === 'insufficient_funds') {
    return NextResponse.json(
      { ok: false, reason: 'insufficient_funds', balances: result.balances ?? null },
      { status: 402 }
    )
  }
  return NextResponse.json(
    { ok: false, error: result.error || result.reason || 'debit_failed' },
    { status: 502 }
  )
}
