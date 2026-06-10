'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { PILLARS, isPillarActive } from './pillars'

/**
 * Techno-Occult v2 mobile bottom tab bar (Stitch: cosmic_tools_framework_overview).
 * Four pillar tabs; visible below md, where TopNavBar/SideNavBar are hidden.
 */
export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-surface-container-lowest/90 backdrop-blur-xl border-t border-white/5 z-50 flex justify-around items-center py-3 px-2 pb-safe">
      {PILLARS.map(pillar => {
        const active = isPillarActive(pathname, pillar)
        return (
          <Link
            key={pillar.href}
            href={pillar.href}
            className={
              active
                ? 'flex flex-col items-center gap-1 text-st-primary'
                : 'flex flex-col items-center gap-1 text-on-surface-variant hover:text-st-primary transition-colors'
            }
          >
            <span className="material-symbols-outlined" aria-hidden>
              {pillar.icon}
            </span>
            <span className="font-label-mono text-[10px] uppercase tracking-wider">
              {pillar.shortLabel}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
