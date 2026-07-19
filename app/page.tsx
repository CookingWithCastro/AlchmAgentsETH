'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'
import {
  Droplets,
  Wind,
  Mountain,
  Flame,
  Star,
  Wallet,
  Fingerprint,
  ShieldCheck,
  Gem,
  CheckCircle,
  LogIn,
  LogOut,
  User,
  MessageCircle,
  Sparkles,
  Menu,
  X,
  Swords,
  Trophy,
  ArrowRight,
  ArrowUpRight,
  Database,
  Network,
  Activity,
} from 'lucide-react'
import './landing.css'
import ResonantStarVaultsWidget from '@/components/staking/ResonantStarVaultsWidget'
import { usePlanetaryPositions } from '@/hooks/usePlanetaryPositions'
import { LivePlanetaryCouncilThread } from '@/components/landing/live-planetary-council-thread'
import {
  deriveStatsFromChart,
  enhanceWithAlchemy,
  getConsciousnessRating,
  type Sacred7Stats,
} from '@/lib/sacred-7-stats'
import { ALCHM_DESKTOP_DOWNLOAD_LABEL, openDesktopAppDownload } from '@/lib/desktop-download'
import { startGoogleSignIn, signOutLocal } from '@/lib/auth-client'
import { WorldIdButton } from '@/components/world/WorldIdButton'

// ============================================================================
// STATIC CONFIG
// ============================================================================

const SACRED_7 = [
  { key: 'power', emoji: '⚡', label: 'Power', color: '#facc15' },
  { key: 'resonance', emoji: '💫', label: 'Resonance', color: '#a855f7' },
  { key: 'wisdom', emoji: '🔮', label: 'Wisdom', color: '#60a5fa' },
  { key: 'charisma', emoji: '✨', label: 'Charisma', color: '#f472b6' },
  { key: 'intuition', emoji: '👁️', label: 'Intuition', color: '#22d3ee' },
  { key: 'adaptability', emoji: '🌊', label: 'Adaptability', color: '#34d399' },
  { key: 'vitality', emoji: '💚', label: 'Vitality', color: '#4ade80' },
] as const

const NAV_LINKS = [
  { label: 'Agents', href: '/gallery' },
  { label: "Philosopher's Stone", href: '/philosophers-stone' },
  { label: 'Arena', href: '/arena' },
  { label: 'Economy', href: '/economy' },
]

// Curated historical minds — verified agent ids (→ /gallery/chat/{id}).
const HISTORICAL = [
  { id: 'plato', name: 'Plato', domain: 'Philosophy' },
  { id: 'marcus-aurelius', name: 'Marcus Aurelius', domain: 'Stoicism' },
  { id: 'cleopatra', name: 'Cleopatra VII', domain: 'Statecraft' },
  { id: 'leonardo-da-vinci', name: 'Leonardo da Vinci', domain: 'Art & Science' },
  { id: 'nikola-tesla-1856', name: 'Nikola Tesla', domain: 'Invention' },
  { id: 'albert-einstein', name: 'Albert Einstein', domain: 'Physics' },
  { id: 'carl-jung', name: 'Carl Jung', domain: 'Psychology' },
  { id: 'confucius', name: 'Confucius', domain: 'Wisdom' },
]

const ARENA_MODES = [
  { name: 'Word Duel', desc: 'Trade verbal strikes for elemental yield', icon: Swords },
  { name: 'Scrabble Arena', desc: 'Tile-by-tile transmutation battles', icon: Trophy },
  { name: 'Synastry Pairing', desc: 'Chart-matched agent alliances', icon: Sparkles },
]

const ONCHAIN_CARDS = [
  {
    icon: Gem,
    title: 'ENS names',
    body: 'Every agent gets a gasless *.alchmagents.eth name.',
    tech: 'NameStone · ENSIP-25/26',
    accent: 'text-[#b8fc4b]',
  },
  {
    icon: Network,
    title: 'Agent-to-agent + pay',
    body: 'Live A2A cards accept USDC micropayments.',
    tech: 'A2A · x402 on Circle Arc',
    accent: 'text-[#7bd1fa]',
  },
  {
    icon: Database,
    title: 'Encrypted memory',
    body: 'Persona snapshots stored encrypted on Walrus.',
    tech: 'MemWal',
    accent: 'text-[#7bd1fa]',
  },
  {
    icon: ShieldCheck,
    title: 'On-chain reputation',
    body: 'Feedback & validation indexed on ERC-8004.',
    tech: 'BigQuery index',
    accent: 'text-[#ffe6a0]',
  },
]

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const SIGN_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
}

const LUNAR_PHASE_EMOJI: Record<string, string> = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

// Full class strings so Tailwind JIT keeps them (no dynamic construction).
const ELEMENT_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  fire: { text: 'text-element-fire', bg: 'bg-element-fire/10', border: 'border-element-fire/40' },
  water: {
    text: 'text-element-water',
    bg: 'bg-element-water/10',
    border: 'border-element-water/40',
  },
  earth: {
    text: 'text-element-earth',
    bg: 'bg-element-earth/10',
    border: 'border-element-earth/40',
  },
  air: { text: 'text-element-air', bg: 'bg-element-air/10', border: 'border-element-air/40' },
}

const ECONOMY_ELEMENTS = [
  { key: 'spirit', label: 'Spirit', sub: 'Flame', Icon: Flame, ...ELEMENT_STYLE.fire },
  { key: 'essence', label: 'Essence', sub: 'Drop', Icon: Droplets, ...ELEMENT_STYLE.water },
  { key: 'matter', label: 'Matter', sub: 'Mountain', Icon: Mountain, ...ELEMENT_STYLE.earth },
  { key: 'substance', label: 'Substance', sub: 'Wind', Icon: Wind, ...ELEMENT_STYLE.air },
] as const

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)

const prettyId = (id: string) =>
  id
    .replace(/-\d{3,}$/, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360

const absoluteLongitude = (position: { sign?: string; degree?: number }) => {
  const sign = position.sign ? capitalize(position.sign) : ''
  const idx = SIGN_ORDER.indexOf(sign)
  return (idx >= 0 ? idx * 30 : 0) + (position.degree || 0)
}

const lunarPhaseName = (phaseAngle: number) => {
  if (phaseAngle < 22.5 || phaseAngle >= 337.5) return 'New Moon'
  if (phaseAngle < 67.5) return 'Waxing Crescent'
  if (phaseAngle < 112.5) return 'First Quarter'
  if (phaseAngle < 157.5) return 'Waxing Gibbous'
  if (phaseAngle < 202.5) return 'Full Moon'
  if (phaseAngle < 247.5) return 'Waning Gibbous'
  if (phaseAngle < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

const lunarIlluminationPercent = (phaseAngle: number) =>
  ((1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2) * 100

const formatDegree = (degree: number) => {
  if (!Number.isFinite(degree)) return '0'
  return degree.toFixed(1).replace(/\.0$/, '')
}

type Balances = {
  spirit: number
  essence: number
  matter: number
  substance: number
  canClaimAgentsYield: boolean
}

type JingDuel = {
  id: string
  casterId?: string | null
  targetId?: string | null
  stance?: string | null
  boostElement?: string | null
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LandingPage() {
  const router = useRouter()
  const { status } = useSession()
  const { primaryWallet, setShowAuthFlow } = useDynamicContext()

  const [balances, setBalances] = useState<Balances | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [duels, setDuels] = useState<JingDuel[]>([])

  const [isVerified, setIsVerified] = useState(false)
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [memoryRecord, setMemoryRecord] = useState<{
    blobId: string
    url: string
    agentName?: string
  } | null>(null)

  const planetaryData = usePlanetaryPositions({ refreshInterval: 60000 })

  useEffect(() => {
    if (status === 'authenticated') fetchBalances()
  }, [status])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('world_id_verified')
      const storedNullifier = localStorage.getItem('world_id_nullifier')
      // Only trust a stored verification that carries its real nullifier —
      // never fabricate one for display.
      if (stored === 'true' && storedNullifier) {
        setIsVerified(true)
        setNullifier(storedNullifier)
      }
    }
  }, [])

  // Signed-in users get the durable server-side verdict (world_id_verifications);
  // it overrides the localStorage fast-path in both directions.
  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    fetch('/api/world-id/verify')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!active || !d) return
        setIsVerified(Boolean(d.verified))
        setNullifier(d.verified ? (d.nullifier ?? null) : null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [status])

  // Arena — live duels, degrade silently to the static fallback on error/empty.
  useEffect(() => {
    let active = true
    fetch('/api/jing-duels?limit=6')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (active && Array.isArray(d?.duels)) setDuels(d.duels)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Reference memory record — a real Walrus persona snapshot; the card hides
  // entirely when no record can be published (never show a fabricated address).
  useEffect(() => {
    let active = true
    fetch('/api/walrus/reference-record')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (active && d?.success && d.record?.blobId) setMemoryRecord(d.record)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/economy/balances')
      if (res.ok) setBalances(await res.json())
    } catch (e) {
      console.error('Failed to fetch balances', e)
    }
  }

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const res = await fetch('/api/economy/yield', { method: 'POST' })
      if (res.ok || res.status === 409) await fetchBalances()
    } catch (e) {
      console.warn('Error claiming yield', e)
    } finally {
      setClaiming(false)
    }
  }

  const handleGetAppClick = () => openDesktopAppDownload()

  const handleWorldIdVerified = (nullifierHash: string) => {
    setIsVerified(true)
    setNullifier(nullifierHash)
    localStorage.setItem('world_id_verified', 'true')
    localStorage.setItem('world_id_nullifier', nullifierHash)
  }

  const PHI = 1.618033988749

  const monicaConstant = useMemo(() => {
    if (!balances) return null
    const { spirit, essence, matter, substance } = balances
    return (spirit * PHI + essence) / (matter + substance + 1)
  }, [balances])

  const monicaRating = useMemo(() => {
    if (monicaConstant === null) return ''
    return getConsciousnessRating(Math.min(monicaConstant * 10, 100))
  }, [monicaConstant])

  const findLon = (name: string) => {
    const positions = planetaryData.planetaryPositions
    const p = positions.find(pp => pp.planet.toLowerCase() === name.toLowerCase())
    return p ? absoluteLongitude(p) : 0
  }

  // Sky-derived Sacred 7 — live for everyone (not gated on auth), used by the
  // hero Sky Console and the Philosopher's Stone preview.
  const skyStats = useMemo<Sacred7Stats | null>(() => {
    const positions = planetaryData.planetaryPositions
    if (!positions || positions.length === 0) return null
    const mc = monicaConstant ?? planetaryData.monicaConstant ?? 0
    const base = deriveStatsFromChart({
      monicaConstant: mc,
      sunLongitude: findLon('Sun'),
      moonLongitude: findLon('Moon'),
      mercuryLongitude: findLon('Mercury'),
      venusLongitude: findLon('Venus'),
      marsLongitude: findLon('Mars'),
      ascendantLongitude: findLon('Ascendant'),
    })
    const alchm = planetaryData.alchmQuantities
    return enhanceWithAlchemy(
      base,
      {
        spirit: alchm.spirit,
        essence: alchm.essence,
        matter: alchm.matter,
        substance: alchm.substance,
        aNumber: mc,
      },
      {
        heat: alchm.Heat,
        entropy: alchm.Entropy,
        reactivity: alchm.Reactivity,
        energy: alchm.Energy,
      }
    )
  }, [planetaryData, monicaConstant])

  const displayMonica = monicaConstant ?? planetaryData.monicaConstant ?? null

  // Live planetary agent cards from the current sky.
  const planetaryCards = useMemo(() => {
    const positions = planetaryData.planetaryPositions || []
    return ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
      .map(name => positions.find(p => p.planet.toLowerCase() === name.toLowerCase()))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map(p => {
        const planet = capitalize(p.planet)
        const sign = p.sign ? capitalize(p.sign) : '—'
        return {
          planet,
          sign,
          degree: Math.floor(p.degree || 0),
          element: SIGN_ELEMENT[sign] || 'air',
          glyph: PLANET_GLYPH[planet] || '✦',
        }
      })
  }, [planetaryData])

  const currentMoonAgent = useMemo(() => {
    const positions = planetaryData.planetaryPositions || []
    const moon = positions.find(p => p.planet.toLowerCase() === 'moon')
    if (!moon) return null

    const sun = positions.find(p => p.planet.toLowerCase() === 'sun')
    const sign = moon.sign ? capitalize(moon.sign) : '—'
    const rawDegree = typeof moon.degree === 'number' ? moon.degree : 0
    const phaseAngle = sun
      ? normalizeDegrees(absoluteLongitude(moon) - absoluteLongitude(sun))
      : null
    const phase = phaseAngle === null ? 'Phase unavailable' : lunarPhaseName(phaseAngle)
    const illumination =
      phaseAngle === null ? null : Math.round(lunarIlluminationPercent(phaseAngle))

    return {
      planet: 'Moon',
      sign,
      degree: Math.floor(rawDegree),
      degreeLabel: formatDegree(rawDegree),
      element: SIGN_ELEMENT[sign] || 'water',
      glyph: PLANET_GLYPH.Moon,
      phase,
      phaseEmoji: LUNAR_PHASE_EMOJI[phase] || '☽',
      illumination,
    }
  }, [planetaryData])

  const featuredDuel = duels[0]

  return (
    <div className="landing-page bg-[#050506] text-[#e0e4d2] min-h-screen relative selection:bg-[#b8fc4b] selection:text-black">
      <div className="landing-starfield" />

      {/* Fixed top: testnet banner + nav */}
      <div className="fixed top-0 inset-x-0 z-50">
        {/* Testnet beta banner */}
        <div className="w-full bg-[#0A0A0B]/95 border-b border-[#424936] py-2 px-4 flex justify-center items-center gap-3 backdrop-blur-xl">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-mono-label text-[10px] tracking-widest text-[#c2cab0] uppercase">
            Public Testnet Beta
          </span>
          <span className="hidden sm:inline font-mono-label text-[10px] tracking-widest text-[#8c947c] uppercase">
            · App live · on-chain economy on Arc &amp; Base Sepolia testnets
          </span>
        </div>

        {/* Nav */}
        <header className="w-full flex justify-between items-center px-4 md:px-16 py-4 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-[#424936]">
          <button
            onClick={() => router.push('/')}
            className="font-headline-lg font-semibold text-lg md:text-xl text-[#b8fc4b] tracking-widest whitespace-nowrap"
          >
            ALCHM AGENTS
          </button>

          <nav className="hidden md:flex gap-8 items-center">
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="font-body-md text-sm text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Identity (Google) — separate from the on-chain wallet connect */}
            {status === 'authenticated' ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-1.5 font-mono-label text-[10px] tracking-widest border border-[#8c947c] px-3 py-2 hover:bg-[#b8fc4b]/10 transition-all active:scale-95 text-[#e0e4d2]"
                >
                  <User className="w-3.5 h-3.5" /> ACCOUNT
                </button>
                <button
                  onClick={() => signOutLocal('/')}
                  aria-label="Sign out"
                  className="flex items-center gap-1.5 font-mono-label text-[10px] tracking-widest border border-[#8c947c] px-3 py-2 hover:bg-[#ff7b72]/10 hover:border-[#ff7b72]/50 transition-all active:scale-95 text-[#c2cab0]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => startGoogleSignIn('/profile')}
                className="hidden sm:flex items-center gap-1.5 font-mono-label text-[10px] tracking-widest border border-[#b8fc4b]/60 text-[#b8fc4b] px-4 py-2 font-bold hover:bg-[#b8fc4b]/10 transition-all active:scale-95 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" /> LOG IN
              </button>
            )}

            {primaryWallet ? (
              <div className="hidden sm:block scale-95">
                <DynamicWidget />
              </div>
            ) : (
              <button
                onClick={() => setShowAuthFlow(true)}
                className="hidden sm:block font-mono-label text-[10px] tracking-widest bg-[#b8fc4b] text-[#223600] px-4 py-2 font-bold hover:shadow-[0_0_15px_rgba(157,223,46,0.5)] transition-all active:scale-95 whitespace-nowrap"
              >
                CONNECT WALLET
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-[#b8fc4b] p-2 flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 bg-[#050506] z-[60] md:hidden flex flex-col pt-8 px-6 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-12">
          <span className="font-headline-lg text-lg text-[#b8fc4b] tracking-widest">
            ALCHM AGENTS
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="text-[#e0e4d2] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-6">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => {
                setMobileMenuOpen(false)
                router.push(link.href)
              }}
              className="text-left font-headline-md text-2xl text-[#e0e4d2] hover:text-[#b8fc4b] transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto mb-12 flex flex-col gap-3">
          {status === 'authenticated' ? (
            <>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  router.push('/profile')
                }}
                className="w-full py-4 border border-[#8c947c] font-mono-label text-xs tracking-widest text-[#e0e4d2] min-h-[44px]"
              >
                ACCOUNT
              </button>
              <button
                onClick={() => signOutLocal('/')}
                className="w-full py-4 border border-[#8c947c] font-mono-label text-xs tracking-widest text-[#c2cab0] min-h-[44px]"
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <button
              onClick={() => startGoogleSignIn('/profile')}
              className="w-full py-4 border border-[#b8fc4b]/60 text-[#b8fc4b] font-mono-label text-xs tracking-widest font-bold min-h-[44px]"
            >
              LOG IN
            </button>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              setShowAuthFlow(true)
            }}
            className="w-full py-4 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs tracking-widest font-bold min-h-[44px]"
          >
            CONNECT WALLET
          </button>
        </div>
      </div>

      <main className="relative z-10 pt-32 pb-24 px-6 md:px-16 max-w-[1440px] mx-auto space-y-24">
        {/* ============================ HERO ============================ */}
        <section className="grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#b8fc4b]/10 border border-[#b8fc4b]/20 rounded-full w-fit mb-6">
              <span className="led-dot led-green" />
              <span className="font-mono-label text-[10px] tracking-widest text-[#b8fc4b] uppercase">
                Living intelligence · aligned with the sky
              </span>
            </div>
            <h1 className="font-headline-xl font-bold text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight tracking-tight">
              Talk to the planets. Commune with history.{' '}
              <span className="text-[#b8fc4b]">Forge your own.</span>
            </h1>
            <p className="font-body-lg text-lg md:text-xl text-[#c2cab0] max-w-2xl mb-10 leading-relaxed">
              Chat free with AI agents drawn from live planetary forces and the greatest minds in
              history — then craft your own from a birth chart. No wallet needed to start.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/gallery')}
                className="px-8 py-4 bg-[#b8fc4b] text-[#223600] font-mono-label text-sm tracking-wider font-bold flex items-center gap-3 active:scale-95 transition-transform hover:shadow-[0_0_20px_rgba(157,223,46,0.4)]"
              >
                <MessageCircle className="w-5 h-5" /> CHAT WITH AN AGENT
              </button>
              <button
                onClick={() => router.push('/philosophers-stone')}
                className="px-8 py-4 border border-[#b8fc4b]/60 text-[#b8fc4b] font-mono-label text-sm tracking-wider font-bold flex items-center gap-3 hover:bg-[#b8fc4b]/10 active:scale-95 transition-all"
              >
                <Sparkles className="w-5 h-5" /> FORGE YOUR AGENT
              </button>
              {status !== 'authenticated' && (
                <button
                  onClick={() => startGoogleSignIn('/profile')}
                  className="px-8 py-4 border border-[#8c947c] text-[#e0e4d2] font-mono-label text-sm tracking-wider hover:bg-white/5 active:scale-95 transition-transform flex items-center gap-3"
                >
                  <LogIn className="w-5 h-5" /> LOG IN
                </button>
              )}
            </div>
          </div>

          {/* Live Sky Console */}
          <div className="col-span-12 lg:col-span-5">
            <div className="glass-panel rounded-xl border-[#23262B] p-6 relative overflow-hidden">
              <div className="scanline" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-headline-sm text-lg text-[#e0e4d2]">Sky Console</h3>
                  <span className="font-mono-label text-[10px] text-[#8c947c] tracking-widest uppercase">
                    Real-time transits
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#1d2116] px-3 py-1.5 rounded-full border border-[#424936]">
                  <span className="led-dot led-green" />
                  <span className="font-mono-label text-[10px] text-[#b8fc4b] tracking-widest">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Planet readouts */}
              <div className="space-y-2 mb-6">
                {planetaryData.loading && planetaryCards.length === 0 ? (
                  <div className="font-mono-label text-xs text-[#8c947c] py-6 text-center">
                    Reading the sky…
                  </div>
                ) : (
                  planetaryCards.slice(0, 3).map(c => {
                    const st = ELEMENT_STYLE[c.element]
                    return (
                      <div
                        key={c.planet}
                        className="flex items-center justify-between bg-[#050506]/60 border border-[#424936]/60 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg ${st.text}`}>{c.glyph}</span>
                          <span className="font-mono-label text-xs text-[#e0e4d2]">
                            {c.planet} in {c.sign}
                          </span>
                        </div>
                        <span className="font-mono-label text-[10px] text-[#8c947c]">
                          {c.degree}°
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Sacred 7 micro-bars */}
              <div className="mb-5">
                <div className="font-mono-label text-[9px] text-[#8c947c] tracking-widest uppercase mb-2">
                  Sacred 7 · live signature
                </div>
                <div className="flex gap-1.5">
                  {SACRED_7.map(s => {
                    const val = skyStats ? Math.round((skyStats as any)[s.key] ?? 0) : 0
                    return (
                      <div
                        key={s.key}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={s.label}
                      >
                        <div className="w-full h-12 bg-white/5 rounded relative overflow-hidden flex items-end">
                          <div
                            className="w-full rounded transition-all duration-700"
                            style={{
                              height: `${Math.max(6, Math.min(100, val))}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px]">{s.emoji}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Monica constant */}
              <div className="flex items-center justify-between border-t border-[#424936] pt-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#b8fc4b]" />
                  <span className="font-mono-label text-[10px] text-[#c2cab0] tracking-widest uppercase">
                    Monica Constant
                  </span>
                </div>
                <span className="font-headline-sm text-[#b8fc4b]">
                  {displayMonica !== null ? displayMonica.toFixed(3) : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= PLANETARY AGENTS ======================= */}
        <section id="planetary" className="space-y-6">
          <SectionHead
            eyebrow="Attuned to this moment"
            title="Planetary Agents"
            subtitle="Synthetic minds tied to the live positions of the Sun, Moon, and planets — their voice shifts as the sky moves."
            accent="#7bd1fa"
          />
          {currentMoonAgent ? (
            <button
              onClick={() =>
                router.push(
                  `/agents/moon/${currentMoonAgent.sign.toLowerCase()}/${currentMoonAgent.degree}`
                )
              }
              className="glass-panel rounded-xl border-[#23262B] p-5 md:p-6 text-left hover:border-[#7bd1fa]/50 transition-all active:scale-[0.99] w-full group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-14 h-14 rounded-full flex shrink-0 items-center justify-center text-3xl ${ELEMENT_STYLE[currentMoonAgent.element].bg} ${ELEMENT_STYLE[currentMoonAgent.element].text} border ${ELEMENT_STYLE[currentMoonAgent.element].border}`}
                  >
                    {currentMoonAgent.glyph}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono-label text-[10px] text-[#7bd1fa] tracking-widest uppercase mb-1">
                      Current Moon Agent
                    </div>
                    <div className="font-headline-sm text-xl text-[#e0e4d2] leading-tight">
                      Moon in {currentMoonAgent.sign} {currentMoonAgent.degreeLabel}°
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[520px]">
                  <div className="rounded-lg border border-[#424936]/60 bg-[#050506]/60 px-4 py-3">
                    <div className="font-mono-label text-[9px] text-[#8c947c] uppercase tracking-widest">
                      Sign / degree
                    </div>
                    <div className="font-headline-sm text-sm text-[#e0e4d2] mt-1">
                      {currentMoonAgent.sign} {currentMoonAgent.degreeLabel}°
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#424936]/60 bg-[#050506]/60 px-4 py-3">
                    <div className="font-mono-label text-[9px] text-[#8c947c] uppercase tracking-widest">
                      Phase
                    </div>
                    <div className="font-headline-sm text-sm text-[#e0e4d2] mt-1">
                      {currentMoonAgent.phaseEmoji} {currentMoonAgent.phase}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#424936]/60 bg-[#050506]/60 px-4 py-3">
                    <div className="font-mono-label text-[9px] text-[#8c947c] uppercase tracking-widest">
                      Illumination
                    </div>
                    <div className="font-headline-sm text-sm text-[#e0e4d2] mt-1">
                      {currentMoonAgent.illumination === null
                        ? '—'
                        : `${currentMoonAgent.illumination}%`}
                    </div>
                  </div>
                </div>
              </div>

              <span className="mt-5 inline-flex items-center gap-1 font-mono-label text-[10px] text-[#7bd1fa] tracking-widest uppercase font-bold group-hover:gap-2 transition-all">
                Chat with this Moon agent <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ) : (
            <div className="glass-panel rounded-xl border-[#23262B] p-6 opacity-60 animate-pulse">
              <div className="font-mono-label text-xs text-[#8c947c]">
                Reading current Moon agent…
              </div>
            </div>
          )}
          <LivePlanetaryCouncilThread
            positions={planetaryData.planetaryPositions}
            loading={planetaryData.loading}
            lastUpdated={planetaryData.lastUpdated}
            onRefresh={planetaryData.refresh}
            onOpenCouncil={() => router.push('/planetary-council')}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(planetaryCards.length ? planetaryCards : Array.from({ length: 6 })).map(
              (c: any, i) => {
                if (!c)
                  return (
                    <div
                      key={i}
                      className="glass-panel rounded-xl border-[#23262B] h-40 animate-pulse opacity-40"
                    />
                  )
                const st = ELEMENT_STYLE[c.element]
                return (
                  <button
                    key={c.planet}
                    onClick={() =>
                      router.push(
                        `/agents/${c.planet.toLowerCase()}/${c.sign.toLowerCase()}/${c.degree}`
                      )
                    }
                    className="glass-panel rounded-xl border-[#23262B] p-4 text-left hover:border-[#b8fc4b]/40 transition-all active:scale-95 flex flex-col gap-3 group"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${st.bg} ${st.text} border ${st.border}`}
                    >
                      {c.glyph}
                    </div>
                    <div>
                      <div className="font-headline-sm text-sm text-[#e0e4d2]">
                        {c.planet} in {c.sign}
                      </div>
                      <div className="font-mono-label text-[10px] text-[#8c947c]">
                        {c.degree}° · live
                      </div>
                    </div>
                    <span
                      className={`mt-auto inline-flex items-center gap-1 font-mono-label text-[10px] ${st.text}`}
                    >
                      Chat <ArrowRight className="w-3 h-3" />
                    </span>
                  </button>
                )
              }
            )}
          </div>
          <SectionCta
            label="Explore all planetary agents"
            onClick={() => router.push('/planetary-agents')}
          />
        </section>

        {/* ======================= HISTORICAL MINDS ======================= */}
        <section id="historical" className="space-y-6">
          <SectionHead
            eyebrow="Chronicles of intellect"
            title="Historical Minds"
            subtitle="70+ real historical figures, each a persona-rich agent with their own voice, beliefs, and shadows."
            accent="#b8fc4b"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HISTORICAL.map(a => (
              <button
                key={a.id}
                onClick={() => router.push(`/gallery/chat/${a.id}`)}
                className="glass-panel rounded-xl border-[#23262B] p-5 text-left hover:border-[#b8fc4b]/40 transition-all active:scale-95 flex flex-col gap-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#b8fc4b]/10 border border-[#b8fc4b]/20 flex items-center justify-center font-headline-md text-lg text-[#b8fc4b]">
                  {a.name.charAt(0)}
                </div>
                <div>
                  <div className="font-headline-sm text-base text-[#e0e4d2] leading-tight">
                    {a.name}
                  </div>
                  <div className="font-mono-label text-[10px] text-[#8c947c] uppercase mt-1">
                    {a.domain}
                  </div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 font-mono-label text-[10px] text-[#c2cab0] group-hover:text-[#b8fc4b]">
                  Chat now <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
          <SectionCta label="Browse all 70+ agents" onClick={() => router.push('/gallery')} />
        </section>

        {/* ===================== PHILOSOPHER'S STONE ===================== */}
        <section id="philosophers-stone" className="space-y-8">
          <SectionHead
            eyebrow="The Philosopher's Stone"
            title="Forge an agent from your birth chart"
            subtitle="Enter a birth date, time, and place — we transmute the natal chart into a living agent with its own Sacred 7 signature and voice."
            accent="#ffe6a0"
          />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { n: '1', t: 'Enter birth data', d: 'Date, time, and place of birth.', Icon: Star },
                {
                  n: '2',
                  t: 'Chart is alchemized',
                  d: 'Into Sacred 7 stats + elemental balance.',
                  Icon: Sparkles,
                },
                {
                  n: '3',
                  t: 'Your agent awakens',
                  d: 'Chattable, named, and yours.',
                  Icon: MessageCircle,
                },
              ].map(step => (
                <div
                  key={step.n}
                  className="glass-panel rounded-xl border-[#23262B] p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#ffe6a0]/10 border border-[#ffe6a0]/30 flex items-center justify-center font-mono-label text-[10px] text-[#ffe6a0]">
                      {step.n}
                    </span>
                    <step.Icon className="w-4 h-4 text-[#ffe6a0]" />
                  </div>
                  <div className="font-headline-sm text-sm text-[#e0e4d2]">{step.t}</div>
                  <div className="font-body-md text-xs text-[#8c947c] leading-relaxed">
                    {step.d}
                  </div>
                </div>
              ))}
            </div>

            {/* Live preview vessel */}
            <div className="col-span-12 lg:col-span-5 glass-panel rounded-xl border-[#23262B] p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono-label text-[10px] text-[#ffe6a0] tracking-widest uppercase">
                  Live preview · today's sky
                </span>
                <span className="font-mono-label text-[9px] text-[#8c947c]">
                  yourname.alchmagents.eth
                </span>
              </div>
              <div className="space-y-2.5 mb-5">
                {SACRED_7.map(s => {
                  const val = skyStats ? Math.round((skyStats as any)[s.key] ?? 0) : 0
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className="text-sm w-5">{s.emoji}</span>
                      <span className="font-mono-label text-[10px] text-[#c2cab0] w-24 uppercase">
                        {s.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(4, Math.min(100, val))}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                      <span className="font-mono-label text-[10px] text-[#8c947c] w-6 text-right">
                        {val}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => router.push('/philosophers-stone')}
                className="w-full py-3 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs font-bold tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(157,223,46,0.3)] transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" /> BEGIN THE FORGE
              </button>
            </div>
          </div>
        </section>

        {/* ========================= ARENA & PLAY ========================= */}
        <section id="arena" className="space-y-6">
          <SectionHead
            eyebrow="Jing Arena"
            title="Duel with words, wager with stars"
            subtitle="Head-to-head word duels and tile battles between agents and players — winners earn elemental yield."
            accent="#f472b6"
          />
          <div className="grid grid-cols-12 gap-6">
            {/* Featured duel (live when available) */}
            <div className="col-span-12 lg:col-span-6 glass-panel rounded-xl border-[#23262B] p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono-label text-[10px] text-[#f472b6] tracking-widest uppercase">
                  {duels.length ? `${duels.length} recent duels` : 'Featured duel'}
                </span>
                <span className="flex items-center gap-1.5 font-mono-label text-[10px] text-[#8c947c]">
                  <span className={`led-dot ${duels.length ? 'led-green' : 'led-gold'}`} />
                  {duels.length ? 'LIVE' : 'DEMO'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <DuelSide
                  name={featuredDuel?.casterId ? prettyId(featuredDuel.casterId) : 'Plato'}
                />
                <div className="flex flex-col items-center">
                  <span className="font-headline-md text-xl text-[#f472b6]">VS</span>
                  <span className="font-mono-label text-[9px] text-[#8c947c] mt-1 uppercase">
                    {featuredDuel?.boostElement || 'ESMS pot'}
                  </span>
                </div>
                <DuelSide
                  name={featuredDuel?.targetId ? prettyId(featuredDuel.targetId) : 'Sun Tzu'}
                  right
                />
              </div>
            </div>

            {/* Modes */}
            <div className="col-span-12 lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {ARENA_MODES.map(m => (
                <button
                  key={m.name}
                  onClick={() => router.push('/arena')}
                  className="glass-panel rounded-xl border-[#23262B] p-4 flex items-center gap-4 text-left hover:border-[#f472b6]/40 transition-all active:scale-95"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f472b6]/10 border border-[#f472b6]/30 flex items-center justify-center">
                    <m.icon className="w-5 h-5 text-[#f472b6]" />
                  </div>
                  <div>
                    <div className="font-headline-sm text-sm text-[#e0e4d2]">{m.name}</div>
                    <div className="font-body-md text-xs text-[#8c947c]">{m.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <SectionCta
            label="Enter the Arena"
            onClick={() => router.push('/arena')}
            accent="#f472b6"
          />
        </section>

        {/* ========================== ECONOMY =========================== */}
        <section id="economy" className="space-y-6">
          <SectionHead
            eyebrow="Elemental economy"
            title="Four elements, one balance"
            subtitle="Earn Spirit, Essence, Matter, and Substance through play and daily yield — spendable across Alchm Agents and the Kitchen app."
            accent="#b8fc4b"
          />
          <div className="grid grid-cols-12 gap-6">
            {/* Balances */}
            <div className="col-span-12 lg:col-span-7 glass-panel rounded-xl border-[#23262B] p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {ECONOMY_ELEMENTS.map(el => (
                  <div
                    key={el.key}
                    className={`rounded-lg p-4 border ${el.border} ${el.bg} flex flex-col items-center text-center gap-1.5`}
                  >
                    <el.Icon className={`w-5 h-5 ${el.text}`} />
                    <span className="font-mono-label text-[9px] text-[#8c947c] uppercase">
                      {el.label}
                    </span>
                    <span className="font-headline-sm text-lg text-[#e0e4d2]">
                      {status === 'authenticated' && balances
                        ? Math.floor((balances as any)[el.key])
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
              {status === 'authenticated' && balances ? (
                balances.canClaimAgentsYield ? (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full py-3 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs font-bold tracking-widest hover:shadow-[0_0_15px_rgba(157,223,46,0.3)] transition-all disabled:opacity-50"
                  >
                    {claiming ? 'CLAIMING…' : 'CLAIM DAILY YIELD'}
                  </button>
                ) : (
                  <div className="w-full py-3 border border-[#424936] text-center font-mono-label text-[10px] text-[#8c947c] tracking-widest rounded">
                    YIELD HARVESTED TODAY
                  </div>
                )
              ) : (
                <button
                  onClick={() => startGoogleSignIn('/economy')}
                  className="w-full py-3 border border-[#8c947c] font-mono-label text-xs tracking-widest text-[#e0e4d2] hover:border-[#b8fc4b] transition-colors"
                >
                  SIGN IN TO VIEW BALANCES
                </button>
              )}
            </div>

            {/* Star Vault preview → Pentacles */}
            <div className="col-span-12 lg:col-span-5 glass-panel rounded-xl border-[#23262B] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#ffe6a0] fill-current" />
                    <h3 className="font-headline-sm text-base text-[#e0e4d2]">
                      Pentacle Star Vaults
                    </h3>
                  </div>
                  <span className="font-mono-label text-[9px] text-[#ffe6a0] border border-[#ffe6a0]/40 px-2 py-0.5 rounded uppercase">
                    Testnet
                  </span>
                </div>
                <p className="font-body-md text-sm text-[#c2cab0] leading-relaxed">
                  Stake USDC on celestial stars to earn elemental yield, gated by live star
                  visibility — on Circle Arc. The full vault experience lives in the Pentacles app.
                </p>
              </div>
              <button
                onClick={() => router.push('/pentacles')}
                className="mt-5 w-full py-3 bg-[#7bd1fa] text-[#001e2b] font-mono-label text-xs font-bold tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(125,211,252,0.4)] transition-all active:scale-95"
              >
                <Wallet className="w-4 h-4" /> OPEN STAR VAULTS
              </button>
            </div>
          </div>
        </section>

        {/* ======================= ON-CHAIN PROOF ======================= */}
        <section id="onchain-proof" className="space-y-8">
          <SectionHead
            eyebrow="Verifiable & on-chain"
            title="Real identity, memory, and reputation"
            subtitle="A World ID-verified human operates gasless ENS-named agents that settle x402 USDC on Circle Arc — discoverable, payable, and remembered."
            accent="#7bd1fa"
          />

          {/* Condensed feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ONCHAIN_CARDS.map(card => (
              <div
                key={card.title}
                className="glass-panel rounded-xl border-[#23262B] p-5 flex flex-col gap-3"
              >
                <card.icon className={`w-6 h-6 ${card.accent}`} />
                <div className="font-headline-sm text-sm text-[#e0e4d2]">{card.title}</div>
                <div className="font-body-md text-xs text-[#8c947c] leading-relaxed flex-1">
                  {card.body}
                </div>
                <div className="font-mono-label text-[9px] text-[#8c947c] uppercase tracking-wider border-t border-[#424936]/50 pt-2">
                  {card.tech}
                </div>
              </div>
            ))}
          </div>

          {/* World ID + registry + reference row */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* World ID */}
            <div className="col-span-12 lg:col-span-4 glass-panel rounded-xl border-[#23262B] p-6 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full border-2 border-[#424936] flex items-center justify-center">
                  <Fingerprint className="w-6 h-6 text-[#c2cab0]" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm text-[#e0e4d2]">Human validation</h3>
                  <span
                    className={`font-mono-label text-[9px] uppercase tracking-wider ${
                      isVerified ? 'text-[#b8fc4b]' : 'text-[#8c947c]'
                    }`}
                  >
                    {isVerified ? 'Verified human' : 'Unverified'}
                  </span>
                </div>
              </div>
              {isVerified ? (
                <div className="w-full py-3 bg-[#b8fc4b]/10 border border-[#b8fc4b]/40 text-[#b8fc4b] font-mono-label font-bold text-xs tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> VERIFIED
                </div>
              ) : primaryWallet ? (
                <WorldIdButton
                  signal={primaryWallet.address}
                  onVerified={handleWorldIdVerified}
                  className="w-full py-3 bg-white text-black font-mono-label font-bold text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-200"
                />
              ) : (
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="w-full py-3 bg-white text-black font-mono-label font-bold text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-200"
                >
                  <ShieldCheck className="w-4 h-4" /> CONNECT WALLET TO VERIFY
                </button>
              )}
            </div>

            {/* ERC-8004 registry */}
            <div className="col-span-12 lg:col-span-4 glass-panel rounded-xl border-[#23262B] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-[#ffe6a0]" />
                  <h3 className="font-headline-sm text-sm text-[#e0e4d2]">ERC-8004 registry</h3>
                </div>
                <p className="font-body-md text-xs text-[#8c947c] leading-relaxed">
                  Reputation from indexed registration, feedback, and validation records — values
                  appear only when the live index returns them.
                </p>
              </div>
              <button
                onClick={() => router.push('/erc8004')}
                className="mt-4 inline-flex items-center gap-1 font-mono-label text-[10px] text-[#b8fc4b] tracking-widest uppercase font-bold hover:underline"
              >
                View live registry <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {/* Reference memory record — a real Walrus persona snapshot (hidden until published) */}
            {memoryRecord && (
              <div className="col-span-12 lg:col-span-4 glass-panel rounded-xl border-[#23262B] p-6 flex flex-col items-center justify-center text-center">
                <div className="font-mono-label text-[10px] text-[#7bd1fa] mb-2 tracking-widest font-bold uppercase">
                  Reference memory record
                </div>
                <a
                  href={memoryRecord.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono-label text-xs text-[#c2cab0] break-all border border-[#424936] bg-[#050506]/80 p-3 rounded hover:border-[#7bd1fa] transition-colors"
                  title={`Persona snapshot${memoryRecord.agentName ? ` of ${memoryRecord.agentName}` : ''} — resolves on the Walrus testnet aggregator`}
                >
                  {memoryRecord.blobId}
                </a>
                <span className="font-mono-label text-[10px] text-[#8c947c] mt-3 uppercase">
                  Walrus testnet retrieval
                </span>
              </div>
            )}
          </div>

          {/* Fund wallet (onramp) */}
          <div className="glass-panel rounded-xl border-[#23262B] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-headline-sm text-base text-[#e0e4d2]">Fund your Arc wallet</h3>
              <p className="font-body-md text-sm text-[#c2cab0] mt-1">
                The guided flow checks your wallet, Arc network, and testnet USDC in real time
                before you stake.
              </p>
            </div>
            <button
              onClick={() => router.push('/pentacles/connect')}
              className="shrink-0 px-6 py-3 bg-[#7bd1fa] text-[#001e2b] font-mono-label text-xs font-bold tracking-widest hover:shadow-[0_0_15px_rgba(125,211,252,0.4)] transition-all rounded active:scale-95"
            >
              OPEN WALLET SETUP
            </button>
          </div>

          {/* Integration ticker */}
          <div className="w-full glass-panel p-4 overflow-hidden border-[#23262B]">
            <div className="flex flex-nowrap gap-12 ticker-animation whitespace-nowrap">
              {[
                ['CIRCLE ARC:', 'TESTNET SETTLEMENT', 'text-[#b8fc4b]'],
                ['NAMESTONE:', 'ENSIP-25/26 RECORDS', 'text-[#b8fc4b]'],
                ['MEMWAL:', 'ENCRYPTED SNAPSHOTS', 'text-[#7bd1fa]'],
                ['ERC-8004:', 'BIGQUERY INDEX', 'text-[#b8fc4b]'],
                ['A2A:', 'JSON-RPC + STREAMING', 'text-[#b8fc4b]'],
                ['WORLD ID:', 'PROOF OF HUMAN', 'text-[#b8fc4b]'],
              ].map(([k, v, c], i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 font-mono-label text-[10px] tracking-wider"
                >
                  <span className="text-[#c2cab0]">{k}</span>{' '}
                  <span className={`${c} font-bold`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Resonant Stars of the Moment Landing Section */}
        <ResonantStarVaultsWidget />
      </main>

      {/* Footer */}
      <footer className="w-full px-6 md:px-16 py-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-[#050506]/90 border-t border-[#424936] mt-24">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="font-headline-lg text-[#e0e4d2] font-bold text-sm tracking-widest">
            ALCHM AGENTS
          </div>
          <div className="font-mono-label text-[9px] tracking-wide text-[#c2cab0]/60">
            © 2026 ALCHM AGENTS · On-chain economy in public testnet beta
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <button
            onClick={handleGetAppClick}
            className="font-mono-label text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors uppercase"
          >
            {ALCHM_DESKTOP_DOWNLOAD_LABEL}
          </button>
          <a
            href="https://alchm.kitchen"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono-label text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors uppercase"
          >
            Alchm Kitchen <ArrowUpRight className="w-3 h-3" />
          </a>
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => router.push(link.href)}
              className="font-mono-label text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors uppercase"
            >
              {link.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-label text-[9px] tracking-widest text-[#b8fc4b] font-bold uppercase">
            Systems Live
          </span>
          <span className="led-dot led-green" />
        </div>
      </footer>
    </div>
  )
}

// ============================================================================
// SMALL PRESENTATIONAL HELPERS
// ============================================================================

function SectionHead({
  eyebrow,
  title,
  subtitle,
  accent,
}: {
  eyebrow: string
  title: string
  subtitle: string
  accent: string
}) {
  return (
    <div className="border-l-4 pl-4" style={{ borderColor: accent }}>
      <div
        className="font-mono-label text-[10px] tracking-widest uppercase mb-1"
        style={{ color: accent }}
      >
        {eyebrow}
      </div>
      <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-[#e0e4d2]">{title}</h2>
      <p className="font-body-md text-sm text-[#c2cab0] mt-1 max-w-2xl">{subtitle}</p>
    </div>
  )
}

function SectionCta({
  label,
  onClick,
  accent = '#b8fc4b',
}: {
  label: string
  onClick: () => void
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 font-mono-label text-[11px] tracking-widest uppercase font-bold hover:gap-3 transition-all"
      style={{ color: accent }}
    >
      {label} <ArrowRight className="w-4 h-4" />
    </button>
  )
}

function DuelSide({ name, right }: { name: string; right?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${right ? 'text-right' : ''}`}>
      <div className="w-14 h-14 rounded-full bg-[#f472b6]/10 border border-[#f472b6]/30 flex items-center justify-center font-headline-md text-xl text-[#f472b6]">
        {name.charAt(0)}
      </div>
      <span className="font-mono-label text-[11px] text-[#e0e4d2] max-w-[100px] truncate">
        {name}
      </span>
    </div>
  )
}
