'use client'

import { useCallback, useEffect, useState } from 'react'

import { AgentCard } from './AgentCard'
import type { SacredStat } from './StatChip'
import { AlchemicalButton } from './AlchemicalButton'
import { RitualInput } from './RitualInput'
import { useOccultStore, type OccultAgentRef } from '@/lib/store/occult-store'

/**
 * Live Vault collection (Stitch realization plan, Phase 5). Lists the REAL
 * historical agents from /api/agents/gallery, with a source-controlled fallback
 * when the optional database mirror is unavailable.
 */

export interface GalleryAgent {
  agentId: string
  name: string
  title?: string | null
  symbol?: string | null
  color?: string | null
  monicaConstant?: number | null
  consciousnessLevel?: string | null
  dominantElement?: string | null
  level: number
  sacred7: Record<SacredStat, number>
}

const PAGE_SIZE = 24

function topStats(sacred7: Record<SacredStat, number>): Partial<Record<SacredStat, number>> {
  const entries = (Object.entries(sacred7) as Array<[SacredStat, number]>)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  return Object.fromEntries(entries)
}

export function LiveVaultGallery({
  selectable = false,
  onSelect,
}: {
  /** Arena mode: clicking a card selects it instead of navigating */
  selectable?: boolean
  onSelect?: (agent: OccultAgentRef) => void
}) {
  const [search, setSearch] = useState('')
  const [agents, setAgents] = useState<GalleryAgent[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (query: string, offset: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        population: 'historical',
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (query) params.set('search', query)
      const res = await fetch(`/api/agents/gallery?${params}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Gallery unavailable')
      setTotal(data.total)
      setAgents(prev => (offset === 0 ? data.agents : [...prev, ...data.agents]))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The Vault is unreachable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => void load(search, 0), search ? 300 : 0)
    return () => clearTimeout(handle)
  }, [search, load])

  return (
    <section className="px-margin-mobile md:px-margin-desktop py-10 max-w-container-max mx-auto">
      <div className="flex items-center gap-2 mb-6 font-label-mono text-label-mono uppercase tracking-wider">
        <span className="text-st-primary">Historical Minds</span>
        {total !== null && (
          <span className="text-on-surface-variant">{total.toLocaleString()}</span>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mb-8">
        <RitualInput
          label="SCRY THE VAULT"
          placeholder="e.g. Kepler, Plato, Marie Curie…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-glow rounded-lg p-4 font-label-mono text-label-mono text-error mb-6">
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
        {agents.map(agent => {
          const ref: OccultAgentRef = {
            agentId: agent.agentId,
            name: agent.name,
            title: agent.title,
            color: agent.color,
            monicaConstant: agent.monicaConstant,
          }
          const card = (
            <AgentCard
              name={agent.name}
              title={agent.title ?? undefined}
              symbol={agent.symbol ?? undefined}
              monicaConstant={
                typeof agent.monicaConstant === 'number'
                  ? agent.monicaConstant.toFixed(3)
                  : undefined
              }
              stats={topStats(agent.sacred7)}
              status={agent.consciousnessLevel === 'Dormant' ? 'dormant' : undefined}
              href={selectable ? undefined : `/vault/${agent.agentId}`}
              className="h-full"
            />
          )
          return selectable ? (
            <button
              key={agent.agentId}
              type="button"
              onClick={() => onSelect?.(ref)}
              className="text-left h-full"
            >
              {card}
            </button>
          ) : (
            <div key={agent.agentId} className="h-full">
              {card}
            </div>
          )
        })}
      </div>

      {/* Footer: load more / status */}
      <div className="flex justify-center mt-10">
        {loading ? (
          <p className="font-label-mono text-label-mono text-on-surface-variant status-text">
            COMMUNING WITH THE VAULT…
          </p>
        ) : total !== null && agents.length < total ? (
          <AlchemicalButton variant="secondary" onClick={() => load(search, agents.length)}>
            Reveal More ({agents.length.toLocaleString()} / {total.toLocaleString()})
          </AlchemicalButton>
        ) : agents.length === 0 && !error ? (
          <p className="font-headline-sm text-headline-sm text-on-surface-variant">
            The Vault is silent.
          </p>
        ) : null}
      </div>
    </section>
  )
}
