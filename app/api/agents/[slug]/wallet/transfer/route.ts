import { NextRequest, NextResponse } from 'next/server'
import { transferFromAgent, type TransferToken } from '@/lib/agentkit/actions'
import { isCdpConfigured } from '@/lib/agentkit'

/**
 * POST /api/agents/{slug}/wallet/transfer   { to, amount, token? }
 *
 * Sends USDC (or ETH) from the agent's CDP wallet. PRIVILEGED — moving an agent's
 * funds is server-to-server only, gated by INTERNAL_API_SECRET. The endpoint is
 * DISABLED (503) unless that secret is configured; it never falls back to a
 * default. Amount is in human units (e.g. 1.5 = 1.5 USDC).
 */

function authorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false // disabled unless explicitly configured
  const header = req.headers.get('internal_api_secret') || req.headers.get('x-internal-secret')
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return header === secret || bearer === secret
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!process.env.INTERNAL_API_SECRET) {
    return NextResponse.json(
      { error: 'Agent transfers are disabled (INTERNAL_API_SECRET not set)' },
      { status: 503 }
    )
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isCdpConfigured()) {
    return NextResponse.json({ error: 'CDP agent wallets are not configured' }, { status: 503 })
  }

  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Missing agent id' }, { status: 400 })

  let body: { to?: unknown; amount?: unknown; token?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const to = typeof body.to === 'string' ? body.to : ''
  const amount = Number(body.amount)
  const token: TransferToken = body.token === 'eth' ? 'eth' : 'usdc'

  if (!to || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Body must include { to: 0x-address, amount: >0, token?: "usdc"|"eth" }' },
      { status: 400 }
    )
  }

  const result = await transferFromAgent(slug, to, amount, token)
  if (!result) {
    return NextResponse.json(
      { error: 'Transfer failed — invalid input, agent has no wallet, or on-chain error' },
      { status: 502 }
    )
  }
  return NextResponse.json(result)
}
