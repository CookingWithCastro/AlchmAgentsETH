import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardClient } from './DashboardClient'
import { backend } from '@/lib/backend'

export default async function DashboardPage() {
  const session = await auth()

  // Use real agent data from the system
  let dashboardAgents: Array<{
    id: string
    name: string
    title: string
    monicaConstant: number
    consciousnessLevel: string
    element: string
    specialty: string
    color: string
    symbol: string
    creationStory: string
  }> = []
  try {
    const agents = await backend.agents.list({ limit: 5 })
    dashboardAgents = agents.map(agent => ({
      id: agent.agentId || agent.id,
      name: agent.name,
      title: agent.title,
      monicaConstant: agent.consciousness?.monicaConstant || agent.kalchmConstant || 0,
      consciousnessLevel: agent.consciousness?.level || 'Awakening',
      element: agent.consciousness?.dominantElement || 'Fire',
      specialty: agent.abilities?.specialty || 'General',
      color: agent.appearance?.color || '#6366f1',
      symbol: agent.appearance?.symbol || agent.name?.charAt(0)?.toUpperCase() || '✨',
      creationStory: agent.abilities?.uniquePower || 'Awakened through cosmic synchronization.',
    }))
  } catch (err) {
    console.error('Failed to fetch dashboard agents from backend:', err)
  }

  const sessionUser = session?.user as any
  const user = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email!,
        name: sessionUser.name || 'Explorer',
        tier: (sessionUser.tier || 'free') as 'free' | 'alchemist' | 'master',
      }
    : {
        id: 'guest',
        email: 'guest@example.com',
        name: 'Guest Explorer',
        tier: 'free' as const,
      }

  return <DashboardClient user={user} dashboardAgents={dashboardAgents} />
}
