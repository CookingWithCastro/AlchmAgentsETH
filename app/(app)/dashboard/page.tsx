import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard')
  }

  const sessionUser = session.user as any
  const user = {
    id: sessionUser.id,
    email: sessionUser.email!,
    name: sessionUser.name || 'Explorer',
    tier: (sessionUser.tier || 'free') as 'free' | 'alchemist' | 'master',
  }

  return <DashboardClient user={user} />
}
