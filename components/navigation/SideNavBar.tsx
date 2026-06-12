'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { useOccultStore, type EsmsBalances } from '@/lib/store/occult-store'
import { PILLARS, isPillarActive } from './pillars'

const ESMS_ROWS: Array<{ key: keyof EsmsBalances; label: string; className: string }> = [
  { key: 'spirit', label: 'Spirit', className: 'text-alchemical-spirit' },
  { key: 'essence', label: 'Essence', className: 'text-alchemical-essence' },
  { key: 'matter', label: 'Matter', className: 'text-alchemical-matter' },
  { key: 'substance', label: 'Substance', className: 'text-alchemical-substance' },
]

const PILLAR_ICON_OVERRIDES: Record<string, string> = {
  '/forge': 'auto_fix_high',
  '/vault': 'inventory_2',
  '/arena': 'swords',
  '/labs': 'biotech',
}

// Real subscription tier rendered in lore voice — no invented progression.
const TIER_RANKS: Record<string, string> = {
  free: 'Rank: Initiate',
  alchemist: 'Rank: Alchemist',
  master: 'Rank: Master',
}

/**
 * Techno-Occult v2 left sidebar (Stitch: jing_arena_synastry_pairing +
 * consciousness_council_alchemical_synthesis). User context, pillar
 * sub-navigation, live ESMS balances, settings/support footer.
 */
export function SideNavBar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const balances = useOccultStore(state => state.balances)
  const fetchBalances = useOccultStore(state => state.fetchBalances)

  useEffect(() => {
    if (status !== 'authenticated') return
    void fetchBalances()
  }, [status, fetchBalances])

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 z-40 bg-surface-dim/80 backdrop-blur-2xl border-r border-white/5 shadow-2xl shadow-obsidian-deep flex-col py-8 pt-24">
      {/* User context */}
      <div className="px-6 mb-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full border-2 border-spirit-violet/50 mb-4 relative flex items-center justify-center">
          <div className="absolute inset-0 bg-spirit-violet/20 animate-pulse-ring rounded-full" />
          <span className="material-symbols-outlined text-st-primary text-4xl" aria-hidden>
            person
          </span>
        </div>
        <h2 className="font-headline-sm text-headline-sm text-spirit-violet mb-1">
          {session?.user?.name ?? 'Digital Alchemist'}
        </h2>
        <p className="font-label-mono text-label-mono text-tertiary">
          {session
            ? (TIER_RANKS[(session.user as { tier?: string })?.tier ?? 'free'] ?? TIER_RANKS.free)
            : 'Unattuned'}
        </p>
      </div>

      {/* Pillar navigation */}
      <nav className="flex flex-col gap-2 px-4 font-label-mono text-label-mono">
        {PILLARS.map(pillar => {
          const active = isPillarActive(pathname, pillar)
          return (
            <Link
              key={pillar.href}
              href={pillar.href}
              className={
                active
                  ? 'flex items-center gap-3 p-3 rounded bg-primary-container/20 text-st-primary border-r-4 border-st-primary'
                  : 'flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors'
              }
            >
              <span className="material-symbols-outlined" aria-hidden>
                {PILLAR_ICON_OVERRIDES[pillar.href] ?? pillar.icon}
              </span>
              {pillar.label}
            </Link>
          )
        })}
      </nav>

      {/* ESMS balances */}
      <div className="px-6 mt-8">
        <h3 className="font-label-mono text-label-mono text-outline uppercase mb-3">
          ESMS Reserves
        </h3>
        <div className="glass-panel rounded-lg p-4 flex flex-col gap-2">
          {ESMS_ROWS.map(row => (
            <div key={row.key} className="flex justify-between items-center">
              <span className={`font-label-mono text-label-mono ${row.className}`}>
                {row.label}
              </span>
              <span className="font-label-mono text-label-mono text-on-surface tabular-nums">
                {balances ? Math.floor(balances[row.key]).toLocaleString() : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-2 px-4 font-label-mono text-label-mono border-t border-white/5 pt-4">
        <Link
          href="/account"
          className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden>
            settings
          </span>
          Settings
        </Link>
        <Link
          href="/monica-guide"
          className="flex items-center gap-3 p-3 rounded text-on-surface-variant hover:bg-surface-variant/30 transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden>
            help
          </span>
          Support
        </Link>
      </div>
    </aside>
  )
}
