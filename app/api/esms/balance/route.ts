import { NextResponse } from 'next/server'
import { formatUnits, type Address } from 'viem'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readEsmsBalances } from '@/lib/esms-chain/contract'

export const dynamic = 'force-dynamic'

/** GET — the current user's on-chain ESMS balances (read from the contract). */
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  })
  if (!user?.walletAddress) {
    return NextResponse.json({ connected: false, walletAddress: null, balances: null })
  }

  try {
    const b = await readEsmsBalances(user.walletAddress as Address)
    return NextResponse.json({
      connected: true,
      walletAddress: user.walletAddress,
      balances: {
        spirit: formatUnits(b.spirit, 18),
        essence: formatUnits(b.essence, 18),
        matter: formatUnits(b.matter, 18),
        substance: formatUnits(b.substance, 18),
      },
    })
  } catch (err) {
    // Contract not deployed yet / RPC down — degrade gracefully.
    console.warn('[esms/balance] on-chain read failed:', err)
    return NextResponse.json({ connected: true, walletAddress: user.walletAddress, balances: null })
  }
}
