'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { usePathname } from 'next/navigation'
import { MonicaChatBubble } from '@/components/monica/monica-chat-bubble'
import { FloatingAdminPanel } from '@/components/admin/FloatingAdminPanel'
import { SpacetimeProvider } from '@/lib/spacetime/SpacetimeContext'
import { useLiveEphemeris } from '@/lib/spacetime/hooks/useLiveEphemeris'
import { DynamicCircleProvider } from '@/components/auth/DynamicCircleProvider'
import { DynamicCircleHUD } from '@/components/auth/DynamicCircleHUD'

function MonicaWrapper() {
  const pathname = usePathname()
  const disabledForDesktopSurface = pathname?.startsWith('/desktop')
  const disabledForAuthSurface = pathname?.startsWith('/auth')
  const { monicaConstant } = useLiveEphemeris({
    enabled: !disabledForDesktopSurface && !disabledForAuthSurface,
  })

  if (disabledForDesktopSurface || disabledForAuthSurface) return null

  return (
    <MonicaChatBubble
      pathname={pathname}
      currentMC={monicaConstant}
      consciousnessLevel="Active" // This could be calculated based on MC
    />
  )
}

function DesktopAwareAdminPanel() {
  const pathname = usePathname()
  if (pathname?.startsWith('/desktop')) return null
  return <FloatingAdminPanel />
}

function EconomyWalletHUD() {
  const pathname = usePathname()
  const show = ['/account', '/economy', '/pentacles', '/yield'].some(
    route => pathname === route || pathname?.startsWith(`${route}/`)
  )
  return show ? <DynamicCircleHUD /> : null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicCircleProvider>
      <SessionProvider>
        <SpacetimeProvider>
          {children}
          <Toaster />
          <DesktopAwareAdminPanel />
          <MonicaWrapper />
          <EconomyWalletHUD />
        </SpacetimeProvider>
      </SessionProvider>
    </DynamicCircleProvider>
  )
}
