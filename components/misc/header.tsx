'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoonIcon, SunIcon, MenuIcon, XIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

// Define navigation groups outside component to prevent hydration issues
const navigationGroups = Object.freeze([
  {
    title: '🧠 Consciousness',
    items: [
      { href: '/monica-guide', label: 'Meet Monica' },
      { href: '/gallery', label: 'Gallery of Perpetuity' },
      { href: '/philosophers-stone', label: "Philosopher's Stone" },
    ],
  },
  {
    title: '🔮 Mystical Arts',
    items: [
      { href: '/rune-forge', label: 'Rune Forge' },
      { href: '/tarot-dashboard', label: 'Tarot Dashboard' },
      { href: 'https://alchm.kitchen/quantities', label: 'Time Laboratory' },
    ],
  },
  {
    title: '⚗️ Alchemy',
    items: [
      { href: 'https://alchm.kitchen/quantities', label: 'Alchm Quantities' },
      { href: '/elemental-chart', label: 'Elemental Chart' },
      { href: '/chart-interpreter', label: 'Chart Interpreter' },
    ],
  },
  {
    title: '🌟 Analysis',
    items: [
      { href: '/planetary-agents', label: 'Planetary Wisdom' },
      { href: '/planetary-council', label: 'Planetary Council' },
      { href: '/', label: 'Current Chart' },
      { href: '/moon-phases', label: 'Moon Phases' },
    ],
  },
  {
    title: '💎 Treasury',
    items: [{ href: '/economy', label: 'Token Economy' }],
  },
  {
    title: '⚙️ System',
    items: [
      { href: '/astrological-agents', label: 'Agents' },
      { href: '/galileo-setup', label: 'Galileo Setup' },
      { href: '/consciousness-survey', label: 'Survey' },
      { href: '/universe-learning', label: 'Learning' },
    ],
  },
])

// Flatten for mobile view
const allNavItems = Object.freeze(navigationGroups.flatMap(group => group.items))

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [isAuthed, setIsAuthed] = useState(false)

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
    // Lightweight auth cookie check
    try {
      setIsAuthed(typeof document !== 'undefined' && document.cookie.includes('userId='))
    } catch {
      setIsAuthed(false)
    }
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Prevent hydration mismatches by not rendering navigation until mounted
  if (!mounted) {
    return (
      <header className="border-b" suppressHydrationWarning>
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">
            Alchm ©
          </Link>

          {/* Desktop Navigation Placeholder - exactly match the structure */}
          <nav className="hidden lg:flex items-center gap-8">
            {/* Placeholder space to maintain layout */}
          </nav>

          {/* Simplified Desktop Navigation Placeholder for medium screens */}
          <nav className="hidden md:flex lg:hidden items-center gap-4">
            {/* Placeholder space to maintain layout */}
          </nav>

          {/* Desktop Theme Toggle Placeholder */}
          <div className="hidden md:flex items-center gap-4">
            <div className="w-10 h-10" />
          </div>

          {/* Mobile Menu Button Placeholder */}
          <div className="md:hidden flex items-center gap-4">
            <div className="w-10 h-10" />
            <div className="w-10 h-10" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="font-bold text-xl">
          Alchm ©
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {navigationGroups.map(group => (
            <div key={group.title} className="relative group">
              <span className="text-sm font-medium text-muted-foreground cursor-default">
                {group.title}
              </span>
              <div className="absolute top-full left-0 mt-2 w-48 bg-background border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  {group.items.map(item => (
                    <Link
                      key={`${group.title}-${item.href}`}
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isAuthed && (
                    <Link
                      key={`${group.title}-me`}
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      My Alchm
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* Simplified Desktop Navigation for medium screens */}
        <nav className="hidden md:flex lg:hidden items-center gap-4">
          {allNavItems.slice(0, 6).map(item => (
            <Link
              key={`simple-${item.href}`}
              href={item.href}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
          {isAuthed && (
            <Link
              key="simple-/profile"
              href="/profile"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              My Space
            </Link>
          )}
        </nav>

        {/* Desktop Theme Toggle */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <XIcon className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <MenuIcon className="h-[1.2rem] w-[1.2rem]" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container py-4 space-y-4">
            {navigationGroups.map(group => (
              <div key={`mobile-${group.title}`} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground px-2">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map(item => (
                    <Link
                      key={`mobile-${group.title}-${item.href}`}
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {isAuthed && (
                    <Link
                      key={`mobile-${group.title}-me`}
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Alchm
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
