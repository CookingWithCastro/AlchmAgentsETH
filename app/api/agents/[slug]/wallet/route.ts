import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateAgentWallet, isCdpConfigured, CDP_NETWORK_ID } from '@/lib/agentkit'

/**
 * GET /api/agents/{slug}/wallet
 *
 * Returns the agent's Coinbase CDP wallet (Base), lazily provisioning it on the
 * first call when CDP is configured. Degrades cleanly:
 *   - 200 { agentId, address, network }  — provisioned
 *   - 404 { address: null }              — CDP configured but not provisioned/failed
 *   - 503 { configured: false }          — CDP not configured for this deployment
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) return NextResponse.json({ error: 'Missing agent id' }, { status: 400 })

  const wallet = await getOrCreateAgentWallet(slug)
  if (wallet) return NextResponse.json(wallet)

  const configured = isCdpConfigured()
  return NextResponse.json(
    {
      agentId: slug,
      address: null,
      network: CDP_NETWORK_ID,
      configured,
      message: configured
        ? 'Wallet not provisioned yet'
        : 'CDP agent wallets are not configured for this deployment',
    },
    { status: configured ? 404 : 503 }
  )
}
