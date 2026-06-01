import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTransitGroupSession } from '@/lib/agents/transit-group-session'
import TransitGroupChatClient from './group-client'

// Sessions are created on demand by POST /api/internal/group-chat, so this route is
// fully dynamic — never pre-rendered.
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const session = await getTransitGroupSession(id)
  const label = session?.transit?.label
  return {
    title: label ? `${label} — Transit Council` : 'Transit Council',
    description: label
      ? `A group council between the planetary agents of ${label}.`
      : 'A group council of planetary-degree agents.',
  }
}

export default async function TransitGroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getTransitGroupSession(id)

  // No session, or no resolvable agents → 404 (alchm.kitchen falls back to single chat).
  if (!session || session.agents.length === 0) notFound()

  return (
    <TransitGroupChatClient
      sessionId={session.id}
      agents={session.agents}
      transit={session.transit}
    />
  )
}
