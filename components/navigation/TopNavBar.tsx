'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { PILLARS, isPillarActive } from './pillars'

/**
 * Techno-Occult v2 desktop top bar (Stitch: cosmic_tools_framework_overview).
 * Fixed, obsidian glass, four pillars with active underline, user chip on the
 * right. Hidden on mobile — MobileBottomNav takes over there.
 */
export function TopNavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="hidden md:flex fixed top-0 w-full z-50 bg-obsidian-deep/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.2)] justify-between items-center px-gutter py-4">
      <div className="flex items-center gap-8">
        <Link
          href="/forge"
          className="font-headline-sm text-headline-sm text-monica-constant tracking-tight"
        >
          Planetary Agents
        </Link>
        <div className="flex gap-6">
          {PILLARS.map(pillar => {
            const active = isPillarActive(pathname, pillar)
            return (
              <Link
                key={pillar.href}
                href={pillar.href}
                className={
                  active
                    ? 'font-body-md text-body-md text-st-primary border-b-2 border-st-primary pb-1'
                    : 'font-body-md text-body-md text-on-surface-variant hover:text-st-primary transition-colors pb-1 border-b-2 border-transparent'
                }
              >
                {pillar.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/pentacles"
          aria-label="Pentacle Star Vaults"
          title="Pentacle Star Vaults"
          className="text-on-surface-variant hover:text-st-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            stars
          </span>
        </Link>
        <Link
          href="/attunement-circle"
          aria-label="Attune"
          className="text-on-surface-variant hover:text-st-primary transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden>
            auto_awesome
          </span>
        </Link>
        <Link
          href="/economy"
          aria-label="ESMS wallet"
          className="text-on-surface-variant hover:text-st-primary transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden>
            account_balance_wallet
          </span>
        </Link>
        <Link
          href="/shop"
          aria-label="ESMS Bazaar"
          className="text-on-surface-variant hover:text-st-primary transition-colors"
        >
          <span className="material-symbols-outlined" aria-hidden>
            redeem
          </span>
        </Link>
        <Link
          href={session ? '/profile' : '/auth/signin'}
          className="flex items-center gap-3 glass-panel px-4 py-2 rounded-full hover:border-st-primary/30 transition-colors"
        >
          <span
            className="material-symbols-outlined text-st-primary text-[20px] w-8 h-8 rounded-full border border-st-primary/30 flex items-center justify-center"
            aria-hidden
          >
            person
          </span>
          <span className="font-label-mono text-label-mono text-st-primary">
            {session?.user?.name ?? 'Initiate'}
          </span>
        </Link>
      </div>
    </nav>
  )
}
