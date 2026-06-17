import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getEntitlements } from '@/lib/premium/entitlements'
import TiltSkilletClient from './TiltSkilletClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tilt Skillet · Recipe-as-a-Circuit',
  description: 'Plan large-batch cooking as an electrical circuit — premium LLM batch planning.',
}

export default async function TiltSkilletPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/tilt-skillet')
  }

  const ent = await getEntitlements(session.user.id, {
    kitchenPremium: session.user.kitchenPremium,
  })
  const isPremium = ent.tier !== 'free' || ent.byokProviders.length > 0

  return <TiltSkilletClient isPremium={isPremium} tier={ent.tier} />
}
