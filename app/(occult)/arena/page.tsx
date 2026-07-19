'use client'

import { useState } from 'react'

import { SynastryAssembly } from '@/components/alchemy/SynastryAssembly'
import { DuelChat } from '@/components/alchemy/DuelChat'
import { JingWordDuelClash } from '@/components/alchemy/JingWordDuelClash'
import { cn } from '@/lib/utils'

/**
 * Mystic Arts — Jing Arena (Stitch realization plan, Phase 4 + 5, Module 3).
 * Synastry, active duels, and interactive Jing/Word clash minigames.
 */

const TABS = [
  { key: 'synastry', label: 'Synastry' },
  { key: 'duel', label: 'Active Duel' },
  { key: 'clash', label: 'Jing & Word Clash' },
] as const

export default function ArenaPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('synastry')

  return (
    <div className="relative">
      <div
        role="tablist"
        aria-label="Arena views"
        className="sticky top-0 md:top-[72px] z-40 flex gap-2 px-margin-mobile md:px-margin-desktop py-3 bg-obsidian-deep/80 backdrop-blur-xl border-b border-white/5 overflow-x-auto"
      >
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'font-label-mono text-label-mono uppercase tracking-wider px-4 py-2 rounded-full whitespace-nowrap transition-all',
              tab === t.key
                ? 'bg-primary-container/30 text-st-primary border border-st-primary/40 glow-violet'
                : 'text-on-surface-variant border border-transparent hover:text-st-primary hover:border-st-primary/20'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div hidden={tab !== 'synastry'}>
        <SynastryAssembly onCommence={() => setTab('duel')} />
      </div>
      <div hidden={tab !== 'duel'}>
        <DuelChat onAssemble={() => setTab('synastry')} />
      </div>
      <div hidden={tab !== 'clash'}>
        <JingWordDuelClash />
      </div>
    </div>
  )
}
