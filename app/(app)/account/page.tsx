import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getEntitlements } from '@/lib/premium/entitlements'
import { AccountClient } from '@/components/account/AccountClient'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/account')
  }

  const ent = await getEntitlements(session.user.id, {
    kitchenPremium: session.user.kitchenPremium,
  })

  return (
    <AccountClient
      tier={ent.tier}
      hasActiveSub={ent.hasActiveSub}
      premiumViaKitchen={ent.premiumViaKitchen}
      email={session.user.email ?? null}
      name={session.user.name ?? null}
    />
  )
}
