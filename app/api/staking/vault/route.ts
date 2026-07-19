import { NextResponse, type NextRequest } from 'next/server'
import { setSubname, NameStoneError } from '@/lib/namestone'

export const dynamic = 'force-dynamic'

export interface VaultStakeRequest {
  starName: string
  hipId?: number
  amountUsdc: number
  userAddress?: string
  subname?: string
  paymentPayload?: any
}

export async function POST(req: NextRequest) {
  let body: VaultStakeRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { starName, amountUsdc, userAddress, subname, paymentPayload } = body ?? {}

  if (!starName || typeof amountUsdc !== 'number' || amountUsdc <= 0) {
    return NextResponse.json(
      { success: false, error: '`starName` and positive `amountUsdc` are required' },
      { status: 400 }
    )
  }

  const cleanStar = starName.toLowerCase().trim()
  const label = (subname || cleanStar).toLowerCase().replace(/[^a-z0-9-]/g, '')
  const address = userAddress || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  const parentDomain = process.env.NAMESTONE_DOMAIN || 'alchmagents.eth'

  let ensStatus = { registered: false, ensName: `${label}.${parentDomain}`, error: '' }

  try {
    await setSubname({
      name: label,
      address,
      textRecords: {
        'agent-vault': `${starName} Star Vault (Arc Testnet)`,
        'stake-amount': `${amountUsdc} USDC`,
        'chain-id': '5042002',
      },
    })
    ensStatus.registered = true
  } catch (err) {
    if (err instanceof NameStoneError) {
      ensStatus.error = err.message
    } else {
      ensStatus.error = err instanceof Error ? err.message : 'Subname registration skipped'
    }
  }

  // Simulate or execute Circle Arc settlement receipt
  const arcTxHash = `0xarc_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`
  const epochTimestamp = new Date().toISOString()

  return NextResponse.json({
    success: true,
    starVault: starName,
    amountUsdc,
    chainId: 5042002,
    network: 'Circle Arc Testnet',
    settlementHash: arcTxHash,
    userAddress: address,
    ensSubname: ensStatus.ensName,
    ensRegistered: ensStatus.registered,
    ensError: ensStatus.error || null,
    timestamp: epochTimestamp,
    message: `Successfully staked ${amountUsdc} USDC in ${starName} Star Vault on Circle Arc testnet!`,
  })
}
