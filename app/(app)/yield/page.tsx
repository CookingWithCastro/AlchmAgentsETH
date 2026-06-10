import { auth } from '@/lib/auth'
import YieldHub from './YieldHub'

export const dynamic = 'force-dynamic'

export default async function YieldPage() {
  const session = await auth()
  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
      }
    : null

  return <YieldHub user={user} />
}
