import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { CommuneChat } from '@/components/alchemy/CommuneChat'
import { resolveAnyAgent } from '@/lib/agents/resolve-any-agent'

// generateMetadata and the page both need the agent; cache() dedupes the
// Prisma lookup chain to one resolution per request.
const getAgent = cache((agentId: string) => resolveAnyAgent(agentId))

/**
 * Vault Communion — chat with a vault entity without leaving the v2 shell.
 * Completes the loop the (occult) layout promises: forge → commune → duel →
 * labs. Resolves any agent (canonical historical, planetary/moon sprites,
 * DB-only crafted) on demand, same resolution path as v1 /agent/[id].
 */

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>
}): Promise<Metadata> {
  const { agentId } = await params
  const agent = await getAgent(agentId)
  if (!agent) return { title: 'Entity not found — The Vault' }
  return {
    title: `Commune with ${agent.name} — The Vault`,
    description:
      agent.personality?.core?.essence ||
      agent.synthesis ||
      `Commune with ${agent.name} inside the Alchemical Engine.`,
  }
}

export default async function VaultCommunePage({
  params,
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  const agent = await getAgent(agentId)
  if (!agent) notFound()

  return (
    <CommuneChat
      agentId={agent.id}
      name={agent.name}
      title={agent.title}
      essence={agent.personality?.core?.essence || agent.synthesis || null}
    />
  )
}
