import type { Address } from 'viem'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { catalogByKind, kitchenBaseUrl } from '@/lib/shop/catalog'
import { listUnlocks } from '@/lib/shop/entitlement'
import { esmsOnchainConfigured, readEsmsBalances } from '@/lib/esms-chain/contract'
import ShopClient from '@/components/shop/ShopClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'ESMS Bazaar · Alchm',
  description:
    'Spend your Spirit, Essence, Matter and Substance on alchemical goods, recipes and food.',
}

export default async function ShopPage() {
  const session = await auth()
  const userId = session?.user?.id

  const catalog = catalogByKind()
  const onchainConfigured = esmsOnchainConfigured()
  const kitchenUrl = kitchenBaseUrl()

  let walletAddress: string | null = null
  let onchainBalances: {
    spirit: number
    essence: number
    matter: number
    substance: number
  } | null = null
  let owned: string[] = []

  if (userId) {
    const [user, unlocks] = await Promise.all([
      prisma.users
        .findUnique({ where: { id: userId }, select: { walletAddress: true } })
        .catch(() => null),
      listUnlocks(userId),
    ])
    owned = unlocks
    walletAddress = (user?.walletAddress as Address | undefined) ?? null
    if (walletAddress && onchainConfigured) {
      try {
        const b = await readEsmsBalances(walletAddress as Address)
        onchainBalances = {
          spirit: Number(b.spirit) / 1e18,
          essence: Number(b.essence) / 1e18,
          matter: Number(b.matter) / 1e18,
          substance: Number(b.substance) / 1e18,
        }
      } catch {
        onchainBalances = null
      }
    }
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="space-y-3 mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
          ESMS Bazaar
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Spend your Spirit, Essence, Matter and Substance. Digital goods settle with a real
          on-chain ESMS burn from your claimed balance; food orders hand off to the kitchen.
        </p>
      </div>

      <ShopClient
        signedIn={Boolean(userId)}
        catalog={catalog}
        owned={owned}
        walletAddress={walletAddress}
        onchainBalances={onchainBalances}
        onchainConfigured={onchainConfigured}
        kitchenUrl={kitchenUrl}
      />
    </div>
  )
}
