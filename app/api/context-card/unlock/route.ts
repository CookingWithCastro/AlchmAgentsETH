import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { syncDebitToAlchm } from '@/lib/alchm-debit-sync'
import { markCardUnlocked } from '@/lib/context-card/entitlement'

export const dynamic = 'force-dynamic'

const TOTAL_COST = 12
const TOKEN_TYPES = ['spirit', 'essence', 'matter', 'substance'] as const
type TokenType = (typeof TOKEN_TYPES)[number]

/**
 * Distributes `total` ESMS across the four token types proportional to the
 * user's current balance — more from abundant tokens, little/none from scarce
 * ones — using largest-remainder rounding so the parts sum to `total`.
 * Falls back to an even split when balances are unknown.
 */
function weightedAmounts(
  balances: Partial<Record<TokenType, unknown>> | null,
  total = TOTAL_COST
): Record<TokenType, number> {
  const bals = TOKEN_TYPES.map(t => Math.max(0, Number(balances?.[t]) || 0))
  const sum = bals.reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    const even = total / 4
    return { spirit: even, essence: even, matter: even, substance: even }
  }
  const raw = bals.map(b => (total * b) / sum)
  const result = raw.map(Math.floor)
  let remainder = total - result.reduce((a, b) => a + b, 0)
  const byFrac = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < byFrac.length && remainder > 0; k++) {
    result[byFrac[k].i] += 1
    remainder -= 1
  }
  return { spirit: result[0], essence: result[1], matter: result[2], substance: result[3] }
}

async function fetchBalances(cookie: string): Promise<Record<TokenType, number> | null> {
  try {
    const baseUrl = process.env.ALCHM_KITCHEN_SYNC_URL || 'https://alchm.kitchen'
    const res = await fetch(`${baseUrl}/api/economy/balance?site=agents`, {
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    })
    if (!res.ok) return null
    const data = await res.json()
    const b = data?.balances ?? data
    return {
      spirit: Number(b?.spirit) || 0,
      essence: Number(b?.essence) || 0,
      matter: Number(b?.matter) || 0,
      substance: Number(b?.substance) || 0,
    }
  } catch {
    return null
  }
}

/**
 * Spends ESMS to unlock the user's exportable context card. The 12-ESMS cost is
 * weighted across the four token types by the user's current balance, debited
 * against the real alchm.kitchen wallet via syncDebitToAlchm (idempotency key
 * makes repeat unlocks free), and the entitlement is persisted server-side.
 * Degrades to a no-charge unlock when economy sync isn't configured.
 */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user.id
  const email = session?.user.email

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!email) {
    await markCardUnlocked(userId)
    return NextResponse.json({ ok: true, skipped: true, balances: null })
  }

  const balances = await fetchBalances(request.headers.get('cookie') || '')
  const cost = weightedAmounts(balances)

  const result = await syncDebitToAlchm({
    userEmail: email,
    amounts: {
      spirit: cost.spirit.toFixed(4),
      essence: cost.essence.toFixed(4),
      matter: cost.matter.toFixed(4),
      substance: cost.substance.toFixed(4),
    },
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
    await markCardUnlocked(userId)
    return NextResponse.json({ ok: true, balances: result.balances ?? null })
  }
  if (result.skipped) {
    // Economy sync env not configured here — let the user proceed.
    await markCardUnlocked(userId)
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
