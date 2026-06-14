/**
 * POST /api/onramp/quote — server proxy for a 1inch Fusion+ quote (hides the API key).
 * Body: { srcChainId, srcToken, amount, wallet, dstChainId?, dstToken? }
 *
 * Returns a quote to swap → USDC on Base. Bridge Base→Arc with CCTP V2 (lib/onramp/cctp.ts)
 * as a second leg — 1inch can't deliver to Arc directly.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getFusionQuote } from '@/lib/onramp/oneinch'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: {
    srcChainId?: number
    srcToken?: string
    amount?: string
    wallet?: string
    dstChainId?: number
    dstToken?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { srcChainId, srcToken, amount, wallet, dstChainId, dstToken } = body ?? {}
  if (!srcChainId || !srcToken || !amount || !wallet) {
    return NextResponse.json(
      { success: false, error: 'srcChainId, srcToken, amount, wallet are required' },
      { status: 400 }
    )
  }

  try {
    const quote = await getFusionQuote({
      srcChainId,
      srcToken,
      amount,
      wallet,
      dstChainId,
      dstToken,
    })
    return NextResponse.json({
      success: true,
      quote,
      note: '1inch delivers USDC on Base (gasless). Bridge Base→Arc via Circle CCTP V2 to finish onramp.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'quote failed'
    const status = message.includes('ONEINCH_API_KEY') ? 503 : 502
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
