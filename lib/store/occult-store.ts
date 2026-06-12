'use client'

import { create } from 'zustand'

/**
 * Techno-Occult v2 global state (Stitch realization plan, Phase 5.1).
 * Shared across the (occult) pillar routes: ESMS balances (one fetch,
 * many consumers), the Jing Arena pairing, and the preferred communion
 * tier chosen in the Forge engine step.
 */

export interface OccultAgentRef {
  agentId: string
  name: string
  title?: string | null
  color?: string | null
  monicaConstant?: number | null
}

export interface EsmsBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export type CommunionTier = 'free' | 'cheap_fast' | 'primary'

interface OccultState {
  // ESMS
  balances: EsmsBalances | null
  balancesFetchedAt: number | null
  fetchBalances: () => Promise<void>
  /** Push authoritative balances returned by a debit/credit response. */
  setBalances: (balances: EsmsBalances) => void

  // Jing Arena pairing
  caster: OccultAgentRef | null
  target: OccultAgentRef | null
  setCaster: (agent: OccultAgentRef | null) => void
  setTarget: (agent: OccultAgentRef | null) => void

  // Forge engine preference (used as modelTier on chat calls)
  communionTier: CommunionTier
  setCommunionTier: (tier: CommunionTier) => void
}

const BALANCE_TTL_MS = 60_000

export const useOccultStore = create<OccultState>((set, get) => ({
  balances: null,
  balancesFetchedAt: null,
  fetchBalances: async () => {
    const { balancesFetchedAt } = get()
    if (balancesFetchedAt && Date.now() - balancesFetchedAt < BALANCE_TTL_MS) return
    // Stamp first so concurrent consumers don't double-fetch.
    set({ balancesFetchedAt: Date.now() })
    try {
      const res = await fetch('/api/economy/balances')
      if (!res.ok) return
      const data = await res.json()
      if (typeof data?.spirit === 'number') {
        set({
          balances: {
            spirit: data.spirit,
            essence: data.essence,
            matter: data.matter,
            substance: data.substance,
          },
        })
      }
    } catch {
      // Sidebar/HUD consumers degrade to placeholders.
    }
  },

  setBalances: balances => set({ balances, balancesFetchedAt: Date.now() }),

  caster: null,
  target: null,
  setCaster: caster => set({ caster }),
  setTarget: target => set({ target }),

  communionTier: 'free',
  setCommunionTier: communionTier => set({ communionTier }),
}))
