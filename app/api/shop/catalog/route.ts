import { NextResponse } from 'next/server'
import type { Address } from 'viem'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catalogByKind, kitchenBaseUrl } from '@/lib/shop/catalog'
import { listUnlocks } from '@/lib/shop/entitlement'
import {
  esmsOnchainConfigured,
  readEsmsBalances,
  type OnchainEsms,
} from '@/lib/esms-chain/contract'

export const dynamic = 'force-dynamic'

/** Serialize 18-dp bigints to whole-ESMS numbers for the client. */
function toWhole(b: OnchainEsms) {
  return {
    spirit: Number(b.spirit) / 1e18,
    essence: Number(b.essence) / 1e18,
    matter: Number(b.matter) / 1e18,
    substance: Number(b.substance) / 1e18,
  }
}

/**
 * GET /api/shop/catalog
 * Public catalog; when signed in, also returns the buyer's wallet, on-chain ESMS
 * balances, owned one-time unlocks, and whether on-chain settlement is live.
 */
export async function GET() {
  const catalog = catalogByKind()
  const onchainConfigured = esmsOnchainConfigured()
  const kitchenUrl = kitchenBaseUrl()

  const session = await auth().catch(() => null)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({
      catalog,
      onchainConfigured,
      kitchenUrl,
      signedIn: false,
    })
  }

  const [user, owned] = await Promise.all([
    prisma.users
      .findUnique({ where: { id: userId }, select: { walletAddress: true } })
      .catch(() => null),
    listUnlocks(userId),
  ])

  const walletAddress = (user?.walletAddress as Address | undefined) ?? null
  let onchainBalances: ReturnType<typeof toWhole> | null = null
  if (walletAddress && onchainConfigured) {
    try {
      onchainBalances = toWhole(await readEsmsBalances(walletAddress))
    } catch (err) {
      console.warn('[api/shop/catalog] on-chain balance read failed:', err)
    }
  }

  return NextResponse.json({
    catalog,
    onchainConfigured,
    kitchenUrl,
    signedIn: true,
    walletAddress,
    onchainBalances,
    owned,
  })
}
