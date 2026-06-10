import { TopNavBar } from '@/components/navigation/TopNavBar'
import { SideNavBar } from '@/components/navigation/SideNavBar'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'

/**
 * Techno-Occult v2 global shell (Stitch realization plan, Phase 2).
 * Obsidian-deep ground + alchemical grid, fixed top bar, left sidebar and
 * mobile bottom tabs. Mounted by app/(occult)/layout.tsx for the four
 * pillar routes (/forge, /vault, /arena, /labs); RootChrome hides the v1
 * chrome on those paths.
 *
 * The `occult-shell` class also scopes CSS that suppresses the fixed
 * navs baked into raw converted Stitch screens (see app/techno-occult.css).
 */
export function OccultShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="occult-shell relative min-h-screen bg-obsidian-deep text-on-background">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
      <TopNavBar />
      <SideNavBar />
      <div className="relative md:pt-[72px] md:pl-64 pb-20 md:pb-0">{children}</div>
      <MobileBottomNav />
    </div>
  )
}
