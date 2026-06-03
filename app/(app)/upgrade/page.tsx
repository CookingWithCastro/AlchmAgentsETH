import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getEntitlements } from '@/lib/premium/entitlements'
import { UpgradeClient } from '@/components/upgrade/UpgradeClient'

export const dynamic = 'force-dynamic'

export default async function UpgradePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/upgrade')
  }

  const ent = await getEntitlements(session.user.id, {
    kitchenPremium: session.user.kitchenPremium,
  })

  return (
    <UpgradeClient
      tier={ent.tier}
      hasActiveSub={ent.hasActiveSub}
      premiumViaKitchen={ent.premiumViaKitchen}
      email={session.user.email ?? null}
      name={session.user.name ?? null}
    />
  )
}
