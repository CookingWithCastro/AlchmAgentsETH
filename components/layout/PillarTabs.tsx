'use client'

import { useState, type ComponentType } from 'react'

import { cn } from '@/lib/utils'

/**
 * Tabbed pillar view (Phase 4 scaffold) — vault/arena/labs each expose their
 * converted Stitch screens behind a glass tab bar until each view is rebuilt
 * natively (Phase 5/6).
 */
export interface PillarTab {
  key: string
  label: string
  component: ComponentType
}

export function PillarTabs({ tabs, ariaLabel }: { tabs: PillarTab[]; ariaLabel: string }) {
  const [active, setActive] = useState(0)
  const ActiveScreen = tabs[active].component

  return (
    <div className="relative">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="sticky top-0 md:top-[72px] z-40 flex gap-2 px-margin-mobile md:px-margin-desktop py-3 bg-obsidian-deep/80 backdrop-blur-xl border-b border-white/5 overflow-x-auto"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              'font-label-mono text-label-mono uppercase tracking-wider px-4 py-2 rounded-full whitespace-nowrap transition-all',
              i === active
                ? 'bg-primary-container/30 text-st-primary border border-st-primary/40 glow-violet'
                : 'text-on-surface-variant border border-transparent hover:text-st-primary hover:border-st-primary/20'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveScreen />
    </div>
  )
}
