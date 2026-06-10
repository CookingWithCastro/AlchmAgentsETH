/**
 * The four pillars of the Techno-Occult v2 IA (Stitch prototypes).
 * Shared by TopNavBar, SideNavBar and MobileBottomNav so active-state
 * logic and icon names stay in one place.
 */
export interface Pillar {
  /** Route the pillar mounts at (app/(occult)/...) */
  href: string
  /** Full label used in the desktop top bar */
  label: string
  /** Short label used in the mobile bottom tab bar */
  shortLabel: string
  /** Material Symbols Outlined icon name */
  icon: string
}

export const PILLARS: Pillar[] = [
  { href: '/forge', label: 'Cosmic Tools', shortLabel: 'Tools', icon: 'construction' },
  { href: '/vault', label: 'Entities', shortLabel: 'Entities', icon: 'group_work' },
  { href: '/arena', label: 'Mystic Arts', shortLabel: 'Arts', icon: 'auto_stories' },
  { href: '/labs', label: 'Labs', shortLabel: 'Labs', icon: 'science' },
]

export function isPillarActive(pathname: string | null, pillar: Pillar): boolean {
  if (!pathname) return false
  return pathname === pillar.href || pathname.startsWith(`${pillar.href}/`)
}
