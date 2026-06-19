'use client'

import { usePathname } from 'next/navigation'

import { Navigation } from '@/components/Navigation'
import { TokenHUD } from '@/components/TokenHUD'

// Techno-Occult v2 pillar routes (app/(occult)/) bring their own shell —
// TopNavBar/SideNavBar/MobileBottomNav — so the v1 chrome stays out.
const OCCULT_SURFACES = ['/forge', '/vault', '/arena', '/labs']

export function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingSurface = pathname === '/'
  const isDesktopSurface = pathname?.startsWith('/desktop')
  const isOccultSurface = OCCULT_SURFACES.some(p => pathname === p || pathname?.startsWith(`${p}/`))
  // /yield is its own ESMS surface — the HUD would duplicate the page's own CTAs.
  const isYieldSurface = pathname === '/yield' || pathname?.startsWith('/yield/')
  const hideHud = isLandingSurface || isDesktopSurface || isYieldSurface || isOccultSurface

  return (
    <>
      {!isLandingSurface && !isDesktopSurface && !isOccultSurface && <Navigation />}
      <main className={isDesktopSurface || isOccultSurface ? 'flex-1 min-h-screen' : 'flex-1'}>
        {children}
      </main>
      {!hideHud && <TokenHUD />}
    </>
  )
}
