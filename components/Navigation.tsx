'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Menu, X, Rocket, User, LogOut, Sparkles, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALCHM_DESKTOP_DOWNLOAD_LABEL, DESKTOP_APP_DOWNLOAD_URL } from '@/lib/desktop-download'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

const navigationGroups = [
  {
    title: 'Cosmic Tools',
    icon: '🔭',
    links: [
      {
        href: '/forge',
        label: 'The Forge ✧ v2',
        description: 'Forge a new vessel in the Techno-Occult shell.',
      },
      {
        href: 'https://alchm.kitchen/quantities',
        label: 'Time Lab',
        description: 'Explore cosmic timing and events.',
      },
      { href: '/transits', label: 'Transits', description: 'Track planetary movements.' },
      { href: '/moon-phases', label: 'Moon Phases', description: 'Track the lunar cycle.' },
      {
        href: '/chart-of-the-moment',
        label: 'Chart of Moment',
        description: 'Current astrological chart.',
      },
      {
        href: '/chart-interpreter',
        label: 'Chart Interpreter',
        description: 'Interpret your charts.',
      },
      {
        href: '/context-card',
        label: 'Context Card',
        description: 'Export your whole chart + alchm profile as one file any LLM can read.',
      },
      { href: '/elemental-chart', label: 'Elemental Chart', description: 'Balance of elements.' },
    ],
  },
  {
    title: 'Entities',
    icon: '👁',
    links: [
      {
        href: '/vault',
        label: 'The Vault ✧ v2',
        description: 'The consciousness vault — every forged and historical entity.',
      },
      {
        href: '/planetary-council',
        label: 'Council',
        description: 'Converse with the planetary governing body.',
      },
      {
        href: '/council-feed',
        label: 'Council Feed',
        description: 'Live agent council — duels, transits, alliances on a single stream.',
      },
      {
        href: '/planetary-agents',
        label: 'Consultations',
        description: '1-on-1 agent consultations.',
      },
      {
        href: '/astrological-agents',
        label: 'Astrological Agents',
        description: 'Agents based on astrological archetypes.',
      },
      { href: '/gallery', label: 'Gallery', description: 'Browse all available AI agents.' },
      {
        href: '/attunement-circle',
        label: 'Attunement Circle',
        description: "This week's free best-dignity agents — attune to earn ESMS.",
      },
    ],
  },
  {
    title: 'Mystic Arts',
    icon: '✦',
    links: [
      {
        href: '/arena',
        label: 'Jing Arena ✧ v2',
        description: 'Synastry pairings and live agent duels.',
      },
      {
        href: '/philosophers-stone',
        label: "Philosopher's Stone",
        description: 'The ultimate alchemical operation.',
      },
      {
        href: '/rune-forge',
        label: 'Rune Forge',
        description: 'Cast and interpret ancient runes.',
      },
      { href: '/runes', label: 'Runes Library', description: 'Learn about individual runes.' },
      {
        href: '/synthesis-chamber',
        label: 'Synthesis Chamber',
        description: 'Combine elements and ideas.',
      },
      {
        href: '/tarot-dashboard',
        label: 'Tarot Dashboard',
        description: 'Draw cards and seek guidance.',
      },
    ],
  },
  {
    title: 'Labs',
    icon: '⚗️',
    links: [
      {
        href: '/labs',
        label: 'Alchemical Labs ✧ v2',
        description: 'Live telemetry — consciousness trajectory & the agent league.',
      },
      {
        href: DESKTOP_APP_DOWNLOAD_URL,
        label: ALCHM_DESKTOP_DOWNLOAD_LABEL,
        description: 'Install the native Alchm Desktop chat interface.',
      },
    ],
  },
]

const ListItem = React.forwardRef<React.ElementRef<'a'>, React.ComponentPropsWithoutRef<'a'>>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <li>
        <NavigationMenuLink asChild>
          <a
            ref={ref}
            className={cn(
              'nav-dropdown-item block select-none space-y-1 rounded-lg p-3 leading-none no-underline outline-none transition-all',
              className
            )}
            {...props}
          >
            <div className="nav-dropdown-item-title">{title}</div>
            <p className="nav-dropdown-item-desc">{children}</p>
          </a>
        </NavigationMenuLink>
      </li>
    )
  }
)
ListItem.displayName = 'ListItem'

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { data: session, status } = useSession()

  const isGroupActive = (links: { href: string }[]) => {
    return links.some(link => pathname === link.href || pathname?.startsWith(`${link.href}/`))
  }

  return (
    <nav className="nav-cosmic">
      <div className="nav-inner">
        <div className="nav-row">
          <div className="nav-left">
            {/* Logo */}
            <Link href="/" className="nav-logo flex items-center gap-2">
              <img
                src="/alchm-logo.png"
                className="w-6 h-6 rounded-full object-cover border border-violet-500/40"
                alt="Alchm Logo"
              />
              <span className="nav-logo-text">Planetary Agents</span>
            </Link>

            {/* Desktop Nav Groups */}
            <div className="nav-desktop">
              <NavigationMenu>
                <NavigationMenuList>
                  {navigationGroups.map(group => (
                    <NavigationMenuItem key={group.title}>
                      <NavigationMenuTrigger
                        className={cn(
                          'nav-trigger',
                          isGroupActive(group.links) && 'nav-trigger-active'
                        )}
                      >
                        <span className="nav-trigger-icon">{group.icon}</span>
                        {group.title}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="nav-dropdown-grid">
                          {group.links.map(link => (
                            <ListItem
                              key={link.href}
                              title={link.label}
                              href={link.href}
                              className={
                                pathname === link.href || pathname?.startsWith(`${link.href}/`)
                                  ? 'nav-dropdown-item-active'
                                  : ''
                              }
                            >
                              {link.description}
                            </ListItem>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Desktop Right */}
          <div className="nav-right">
            <a
              href={DESKTOP_APP_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-download-btn"
              title={ALCHM_DESKTOP_DOWNLOAD_LABEL}
              aria-label={ALCHM_DESKTOP_DOWNLOAD_LABEL}
            >
              <Monitor className="h-4 w-4" />
              <span>{ALCHM_DESKTOP_DOWNLOAD_LABEL}</span>
            </a>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" aria-label="Dashboard" className="nav-icon-btn">
                <Rocket className="h-5 w-5" />
              </Button>
            </Link>

            {status === 'authenticated' && session?.user ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" aria-label="Profile" className="nav-icon-btn">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <button
                  onClick={() => {
                    window.location.href = '/api/logout'
                  }}
                  className="nav-signout-btn"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link href="/auth/signin" className="nav-signin-btn">
                <Sparkles className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="nav-mobile-toggle">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="nav-icon-btn"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="nav-mobile-menu">
            {navigationGroups.map(group => (
              <div key={group.title} className="nav-mobile-group">
                <h3 className="nav-mobile-group-title">
                  <span>{group.icon}</span> {group.title}
                </h3>
                <div className="nav-mobile-links">
                  {group.links.map(link => {
                    const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn('nav-mobile-link', isActive && 'nav-mobile-link-active')}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="nav-mobile-footer">
              <a
                href={DESKTOP_APP_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-mobile-action text-violet-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Monitor className="w-4 h-4" />
                {ALCHM_DESKTOP_DOWNLOAD_LABEL}
              </a>
              <Link
                href="/dashboard"
                className="nav-mobile-action"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Rocket className="w-4 h-4" /> Dashboard
              </Link>

              {status === 'authenticated' ? (
                <>
                  <Link
                    href="/profile"
                    className="nav-mobile-action"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  <button
                    className="nav-mobile-action nav-mobile-signout"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      window.location.href = '/api/logout'
                    }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="nav-mobile-action nav-mobile-signin"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Sparkles className="w-4 h-4" /> Sign In with Google
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
