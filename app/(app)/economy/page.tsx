import { auth } from '@/lib/auth'
import { EconomyService } from '@/lib/services/economyService'
import EconomyDashboard from './EconomyDashboard'

export default async function EconomyPage() {
  const session = await auth()
  const userId = session?.user.id

  // If no user, show guest view or prompt login
  // For the dashboard, we want to at least fetch balances if user is logged in
  let initialBalances = null
  let hasClaimedYield = false

  if (userId) {
    try {
      initialBalances = await EconomyService.getBalances(userId)
      hasClaimedYield = await EconomyService.hasClaimedAgentsYieldToday(userId)
    } catch (err) {
      console.error('Failed to fetch economy data:', err)
    }
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-600">
          ESMS Treasury
        </h1>
        <p className="text-zinc-400">
          Manage your alchemical reserves, claim cosmic yield, and track your streak multipliers.
        </p>
      </div>

      <EconomyDashboard
        userId={userId}
        initialBalances={initialBalances || undefined}
        initialHasClaimedYield={hasClaimedYield}
      />
    </div>
  )
}
