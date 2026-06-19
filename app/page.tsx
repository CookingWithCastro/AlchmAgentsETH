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
  Zap,
  Star,
  Wallet,
  Fingerprint,
  ShieldCheck,
  Gem,
  CheckCircle,
} from 'lucide-react'
import './landing.css'
import { usePlanetaryPositions } from '@/hooks/usePlanetaryPositions'
import {
  deriveStatsFromChart,
  enhanceWithAlchemy,
  getConsciousnessRating,
  type Sacred7Stats,
  SACRED_STATS_METADATA,
} from '@/lib/sacred-7-stats'
import { ALCHM_DESKTOP_DOWNLOAD_LABEL, openDesktopAppDownload } from '@/lib/desktop-download'
import { buildKitchenSignInUrl } from '@/lib/kitchen-signin'
import TopAgentsOfTheMoment from '@/components/landing/top-agents-of-the-moment'
import FreeAgentsOfTheWeek from '@/components/landing/free-agents-of-the-week'
import { WorldIdButton } from '@/components/world/WorldIdButton'

// ============================================================================
// CONSCIOUSNESS PARAMETER DEFINITIONS
// ============================================================================

const SACRED_7 = [
  { key: 'power', emoji: '⚡', label: 'Power', desc: 'Alchemical Force', color: '#facc15' },
  {
    key: 'resonance',
    emoji: '💫',
    label: 'Resonance',
    desc: 'Harmonic Frequency',
    color: '#a855f7',
  },
  { key: 'wisdom', emoji: '🔮', label: 'Wisdom', desc: 'Accumulated Insight', color: '#60a5fa' },
  { key: 'charisma', emoji: '✨', label: 'Charisma', desc: 'Magnetic Presence', color: '#f472b6' },
  {
    key: 'intuition',
    emoji: '👁️',
    label: 'Intuition',
    desc: 'Psychic Sensitivity',
    color: '#22d3ee',
  },
  {
    key: 'adaptability',
    emoji: '🌊',
    label: 'Adaptability',
    desc: 'Flux Capacity',
    color: '#34d399',
  },
  { key: 'vitality', emoji: '💚', label: 'Vitality', desc: 'Life Force', color: '#4ade80' },
]

export default function LandingPage() {
  const router = useRouter()
  const { status } = useSession()
  const { primaryWallet, setShowAuthFlow } = useDynamicContext()
  const [loading, setLoading] = useState(false)

  // Live Balances
  const [balances, setBalances] = useState<{
    spirit: number
    essence: number
    matter: number
    substance: number
    canClaimAgentsYield: boolean
  } | null>(null)

  const [claiming, setClaiming] = useState(false)

  // Landing preview controls
  const [selectedConstellation, setSelectedConstellation] = useState('VEGA')
  const [selectedElement, setSelectedElement] = useState('WATER')
  const [isVerified, setIsVerified] = useState(false)
  const [nullifier, setNullifier] = useState<string | null>(null)

  // Planetary positions for live Sacred 7 derivation
  const planetaryData = usePlanetaryPositions({
    refreshInterval: 60000,
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBalances()
    }
  }, [status])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('world_id_verified')
      const storedNullifier = localStorage.getItem('world_id_nullifier')
      if (stored === 'true') {
        setIsVerified(true)
        setNullifier(storedNullifier || '0x2a91f4d0e980...4cb3')
      }
    }
  }, [])

  const fetchBalances = async () => {
    try {
      const res = await fetch('/api/economy/balances')
      if (res.ok) {
        const data = await res.json()
        setBalances(data)
      }
    } catch (e) {
      console.error('Failed to fetch balances', e)
    }
  }

  const handleClaim = async () => {
    setClaiming(true)
    try {
      const res = await fetch('/api/economy/yield', { method: 'POST' })
      if (res.ok) {
        await fetchBalances()
      } else if (res.status === 409) {
        await fetchBalances()
      } else {
        console.warn('Failed to claim yield, status:', res.status)
      }
    } catch (e) {
      console.warn('Error claiming yield', e)
    } finally {
      setClaiming(false)
    }
  }

  const handleGetAppClick = () => {
    openDesktopAppDownload()
  }

  // Golden ratio constant
  const PHI = 1.618033988749

  const monicaConstant = useMemo(() => {
    if (!balances) return null
    const { spirit, essence, matter, substance } = balances
    return (spirit * PHI + essence) / (matter + substance + 1)
  }, [balances])

  const monicaRating = useMemo(() => {
    if (monicaConstant === null) return ''
    const normalized = Math.min(monicaConstant * 10, 100)
    return getConsciousnessRating(normalized)
  }, [monicaConstant])

  const liveStats = useMemo<Sacred7Stats | null>(() => {
    if (status !== 'authenticated') return null
    const positions = planetaryData.planetaryPositions
    const findLon = (name: string) => {
      const p = positions.find(pp => pp.planet.toLowerCase() === name.toLowerCase())
      if (!p) return 0
      const signOrder = [
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
      const sign = p.sign ? p.sign.charAt(0).toUpperCase() + p.sign.slice(1) : p.sign
      const idx = signOrder.indexOf(sign)
      return (idx >= 0 ? idx * 30 : 0) + (p.degree || 0)
    }

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
  }, [status, planetaryData, monicaConstant])

  const handleWorldIdVerified = (nullifierHash: string) => {
    setIsVerified(true)
    setNullifier(nullifierHash)
    localStorage.setItem('world_id_verified', 'true')
    localStorage.setItem('world_id_nullifier', nullifierHash)
  }

  return (
    <div className="landing-page bg-[#050506] text-[#e0e4d2] min-h-screen relative font-sans selection:bg-[#b8fc4b] selection:text-black">
      <div className="landing-starfield" />

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-16 py-4 bg-[#0A0A0B]/90 backdrop-blur-xl border-b border-[#424936]">
        <div className="font-semibold text-sm sm:text-lg md:text-xl text-[#b8fc4b] tracking-widest font-mono whitespace-nowrap">
          ALCHM AGENTS
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <a
            className="font-mono text-xs text-[#b8fc4b] border-b border-[#b8fc4b] pb-1"
            href="#sacred-seven"
          >
            SACRED STATS
          </a>
          <a
            className="font-mono text-xs text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="#star-vaults"
          >
            STAR VAULTS
          </a>
          <a
            className="font-mono text-xs text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="#namestone"
          >
            NAMESTONE
          </a>
          <a
            className="font-mono text-xs text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="#terminal"
          >
            A2A TERMINAL
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => {
              const el = document.getElementById('world-id-section')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="hidden sm:block font-mono text-[10px] tracking-widest border border-[#8c947c] px-4 py-2 hover:bg-[#b8fc4b]/10 transition-all active:scale-95 text-[#e0e4d2]"
          >
            VERIFY
          </button>

          {primaryWallet ? (
            <div className="scale-95">
              <DynamicWidget />
            </div>
          ) : (
            <button
              onClick={() => setShowAuthFlow(true)}
              className="font-mono text-[9px] sm:text-[10px] tracking-widest bg-[#b8fc4b] text-[#223600] px-3 sm:px-4 py-2 font-bold hover:shadow-[0_0_15px_rgba(157,223,46,0.5)] transition-all active:scale-95 whitespace-nowrap"
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-24 px-6 md:px-16 max-w-[1440px] mx-auto space-y-24">
        {/* Hero Section */}
        <section className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#b8fc4b]/10 border border-[#b8fc4b]/20 rounded-full w-fit mb-6">
              <span className="led-dot led-green"></span>
              <span className="text-[10px] font-mono tracking-widest text-[#b8fc4b]">
                LIVE PRODUCT + TESTNET INTEGRATIONS
              </span>
            </div>
            <h1 className="font-bold text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight tracking-tight font-serif">
              A WORLD ID-VERIFIED HUMAN OPERATES GASLESS{' '}
              <span className="text-[#b8fc4b]">ENS-NAMED AGENTS</span> THAT SETTLE X402 USDC ON
              CIRCLE ARC.
            </h1>
            <p className="text-lg md:text-xl text-[#c2cab0] max-w-2xl mb-10 leading-relaxed font-sans">
              Store encrypted memory snapshots on Walrus and earn elemental yield gated by the live
              sky. On-chain activity reimagined as a digital ritual.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  if (status === 'unauthenticated') {
                    setLoading(true)
                    window.location.href = buildKitchenSignInUrl('/profile')
                  } else {
                    router.push('/dashboard')
                  }
                }}
                className="px-8 py-4 bg-[#b8fc4b] text-[#223600] font-mono text-sm tracking-wider font-bold flex items-center gap-3 active:scale-95 transition-transform hover:shadow-[0_0_20px_rgba(157,223,46,0.4)]"
              >
                <Zap className="w-5 h-5 fill-current" />
                {loading ? 'INITIATING...' : 'INITIATE RITUAL'}
              </button>
              <button
                onClick={handleGetAppClick}
                className="px-8 py-4 border border-[#8c947c] text-[#e0e4d2] font-mono text-sm tracking-wider hover:bg-white/5 active:scale-95 transition-transform"
              >
                {ALCHM_DESKTOP_DOWNLOAD_LABEL.toUpperCase()}
              </button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 relative h-[320px] lg:h-[450px] glass-panel rounded-xl flex items-center justify-center overflow-hidden border-[#23262B]">
            <div className="scanline"></div>
            <img
              alt="Alchm alchemical core"
              className="w-full h-full object-cover opacity-35 mix-blend-screen"
              src="/alchm-logo.png"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/50 backdrop-blur-sm">
              <div className="text-[10px] font-mono text-[#7bd1fa] mb-2 tracking-widest font-bold">
                REFERENCE MEMORY RECORD
              </div>
              <div className="font-mono text-sm text-[#c2cab0] break-all border border-[#424936] bg-[#050506]/80 p-3 rounded">
                0x7E35fA3c29f4a9fCdB34d582e6c8004F92B1cE
              </div>
              <span className="text-[10px] font-mono text-[#8c947c] mt-4">
                WALRUS TESTNET RETRIEVAL
              </span>
            </div>
          </div>
        </section>

        {/* Integration capabilities — avoids presenting unpolled services as live telemetry. */}
        <div className="w-full glass-panel p-4 overflow-hidden border-[#23262B]">
          <div className="flex flex-nowrap gap-12 ticker-animation whitespace-nowrap">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">CIRCLE ARC:</span>{' '}
              <span className="text-[#b8fc4b] font-bold">TESTNET SETTLEMENT</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">NAMESTONE:</span>{' '}
              <span className="text-[#b8fc4b] font-bold">ENSIP-25/26 RECORDS</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">MEMWAL:</span>{' '}
              <span className="text-[#7bd1fa] font-bold">ENCRYPTED SNAPSHOTS</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">ERC-8004:</span>{' '}
              <span className="text-[#b8fc4b] font-bold">BIGQUERY INDEX</span>
            </div>
            {/* Duplicates for seamless looping */}
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">A2A:</span>{' '}
              <span className="text-[#b8fc4b] font-bold">JSON-RPC + STREAMING</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider">
              <span className="text-[#c2cab0]">WORLD ID:</span>{' '}
              <span className="text-[#b8fc4b] font-bold">PROOF OF HUMAN</span>
            </div>
          </div>
        </div>

        {/* Free Agents of the Week */}
        <section className="space-y-6">
          <div className="border-l-4 border-[#b8fc4b] pl-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-wider font-mono">
              CHRONICLES OF INTELLECT
            </h2>
            <p className="text-sm text-[#c2cab0] font-mono">
              COMMUNE WITH THE ENLIGHTENED PERSONAS
            </p>
          </div>
          <FreeAgentsOfTheWeek />
        </section>

        {/* Section 2: Pentacle Star Vaults */}
        <section id="star-vaults" className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-2xl md:text-3xl font-serif">PENTACLE STAR VAULTS</h2>
              <p className="text-[#c2cab0] font-mono text-xs tracking-wider mt-1">
                ALIGN ASSETS WITH CELESTIAL VORTICES ON ARC
              </p>
            </div>
            <div className="hidden md:flex gap-4">
              <div className="px-4 py-2 bg-[#1d2116] border border-[#424936] flex items-center gap-2">
                <span className="led-dot led-gold"></span>
                <span className="font-mono text-[10px] tracking-widest text-[#ffe6a0]">
                  LIVE VAULT APP
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Dashboard Control */}
              <div className="glass-panel p-6 rounded-xl relative overflow-hidden border-[#23262B]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-[#c2cab0] mb-4 block font-bold">
                      SELECT CONSTELLATION
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedConstellation('POLARIS')}
                        className={`flex flex-col items-center justify-center p-4 border transition-all active:bg-[#b8fc4b]/10 ${selectedConstellation === 'POLARIS' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:border-[#b8fc4b]'}`}
                      >
                        <Star
                          className={`w-6 h-6 mb-2 ${selectedConstellation === 'POLARIS' ? 'text-[#b8fc4b] fill-current' : 'text-[#8c947c]'}`}
                        />
                        <span className="font-mono text-xs">POLARIS</span>
                      </button>
                      <button
                        onClick={() => setSelectedConstellation('VEGA')}
                        className={`flex flex-col items-center justify-center p-4 border transition-all active:bg-[#b8fc4b]/10 ${selectedConstellation === 'VEGA' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:border-[#b8fc4b]'}`}
                      >
                        <Star
                          className={`w-6 h-6 mb-2 ${selectedConstellation === 'VEGA' ? 'text-[#b8fc4b] fill-current' : 'text-[#8c947c]'}`}
                        />
                        <span className="font-mono text-xs">VEGA</span>
                      </button>
                      <button
                        onClick={() => setSelectedConstellation('SIRIUS')}
                        className={`flex flex-col items-center justify-center p-4 border transition-all active:bg-[#b8fc4b]/10 ${selectedConstellation === 'SIRIUS' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:border-[#b8fc4b]'}`}
                      >
                        <Star
                          className={`w-6 h-6 mb-2 ${selectedConstellation === 'SIRIUS' ? 'text-[#b8fc4b] fill-current' : 'text-[#8c947c]'}`}
                        />
                        <span className="font-mono text-xs">SIRIUS</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-[#c2cab0] mb-4 block font-bold">
                      SELECT ELEMENT
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSelectedElement('FIRE')}
                        className={`p-3 border flex items-center gap-3 font-mono text-xs transition-all ${selectedElement === 'FIRE' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:bg-white/5'}`}
                      >
                        <Flame className="w-4 h-4 text-orange-500 fill-current" /> FIRE
                      </button>
                      <button
                        onClick={() => setSelectedElement('WATER')}
                        className={`p-3 border flex items-center gap-3 font-mono text-xs transition-all ${selectedElement === 'WATER' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:bg-white/5'}`}
                      >
                        <Droplets className="w-4 h-4 text-blue-400 fill-current" /> WATER
                      </button>
                      <button
                        onClick={() => setSelectedElement('EARTH')}
                        className={`p-3 border flex items-center gap-3 font-mono text-xs transition-all ${selectedElement === 'EARTH' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:bg-white/5'}`}
                      >
                        <Mountain className="w-4 h-4 text-green-400 fill-current" /> EARTH
                      </button>
                      <button
                        onClick={() => setSelectedElement('AIR')}
                        className={`p-3 border flex items-center gap-3 font-mono text-xs transition-all ${selectedElement === 'AIR' ? 'border-[#b8fc4b] bg-[#b8fc4b]/5' : 'border-[#424936] hover:bg-white/5'}`}
                      >
                        <Wind className="w-4 h-4 text-yellow-400 fill-current" /> AIR
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-[#424936] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <p className="font-mono text-xs text-[#c2cab0] max-w-xl leading-relaxed">
                    Review live star visibility, wallet requirements, Arc testnet balances, and
                    current vault rates before authorizing a transaction.
                  </p>
                  <button
                    onClick={() => router.push('/pentacles')}
                    className="w-full md:w-auto px-8 py-4 bg-[#b8fc4b] text-[#223600] font-mono text-xs font-bold tracking-widest flex items-center justify-center gap-3 hover:shadow-[0_0_20px_rgba(157,223,46,0.3)] transition-all"
                  >
                    <Wallet className="w-4 h-4" /> OPEN LIVE STAR VAULTS
                  </button>
                </div>
              </div>

              {/* Yield factors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 flex flex-col border-[#23262B]">
                  <span className="font-mono text-[10px] text-[#c2cab0] mb-1 font-bold">
                    BASE APY
                  </span>
                  <span className="font-mono text-sm font-bold text-[#b8fc4b]">LIVE IN VAULT</span>
                </div>
                <div className="glass-panel p-4 flex flex-col border-[#23262B]">
                  <span className="font-mono text-[10px] text-[#c2cab0] mb-1 font-bold">
                    AFFINITY
                  </span>
                  <span className="font-mono text-lg font-bold text-[#7bd1fa]">
                    {selectedElement}
                  </span>
                </div>
                <div className="glass-panel p-4 flex flex-col border-[#23262B]">
                  <span className="font-mono text-[10px] text-[#c2cab0] mb-1 font-bold">
                    DOMINANCE
                  </span>
                  <span className="font-mono text-lg font-bold text-[#ffe6a0]">
                    {selectedConstellation}
                  </span>
                </div>
                <div className="glass-panel p-4 flex flex-col border-[#23262B]">
                  <span className="font-mono text-[10px] text-[#c2cab0] mb-1 font-bold">
                    VISIBILITY
                  </span>
                  <span className="font-mono text-sm font-bold text-[#c2cab0]">CHECK LIVE</span>
                </div>
              </div>
            </div>

            {/* Vault Inventory / Stats */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              {/* Vault Balance Display */}
              <div className="glass-panel p-6 rounded-xl flex-1 border-[#23262B]">
                <h3 className="font-mono text-[10px] text-[#c2cab0] tracking-widest font-bold mb-6 border-b border-[#424936] pb-2 uppercase">
                  ESMS BALANCE VAULT
                </h3>

                {status === 'authenticated' && balances ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-950/20 flex items-center justify-center border border-orange-900/30">
                          <Flame className="w-5 h-5 text-orange-500 fill-current" />
                        </div>
                        <div className="font-mono text-xs font-bold">SPIRIT (FLAME)</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#e0e4d2]">
                        {Math.floor(balances.spirit)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-950/20 flex items-center justify-center border border-blue-900/30">
                          <Droplets className="w-5 h-5 text-blue-400 fill-current" />
                        </div>
                        <div className="font-mono text-xs font-bold">ESSENCE (DROP)</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#e0e4d2]">
                        {Math.floor(balances.essence)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-950/20 flex items-center justify-center border border-green-900/30">
                          <Mountain className="w-5 h-5 text-green-400 fill-current" />
                        </div>
                        <div className="font-mono text-xs font-bold">MATTER (MNTN)</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#e0e4d2]">
                        {Math.floor(balances.matter)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-950/20 flex items-center justify-center border border-yellow-900/30">
                          <Wind className="w-5 h-5 text-yellow-400 fill-current" />
                        </div>
                        <div className="font-mono text-xs font-bold">SUBSTANCE (WIND)</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#e0e4d2]">
                        {Math.floor(balances.substance)}
                      </div>
                    </div>

                    {balances.canClaimAgentsYield ? (
                      <button
                        onClick={handleClaim}
                        disabled={claiming}
                        className="w-full mt-4 py-3 bg-[#b8fc4b] text-[#223600] font-mono text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(157,223,46,0.3)] transition-all disabled:opacity-50"
                      >
                        {claiming ? 'CLAIMING...' : 'CLAIM DAILY YIELD'}
                      </button>
                    ) : (
                      <div className="w-full mt-4 py-2 border border-[#424936] text-center font-mono text-[10px] text-[#8c947c] tracking-wide rounded">
                        YIELD HARVESTED TODAY
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
                    <span className="font-mono text-xs text-[#c2cab0] mb-4">
                      CONNECT OPERATOR TO VIEW BALANCES
                    </span>
                    <button
                      onClick={() => {
                        if (status === 'unauthenticated') {
                          window.location.href = buildKitchenSignInUrl('/profile')
                        } else {
                          setShowAuthFlow(true)
                        }
                      }}
                      className="px-4 py-2 border border-[#8c947c] hover:border-[#b8fc4b] font-mono text-xs text-[#e0e4d2] transition-colors"
                    >
                      AUTHENTICATE
                    </button>
                  </div>
                )}
              </div>

              {/* MC Reputation Display */}
              <div className="glass-panel p-6 rounded-xl flex items-center justify-center h-32 relative overflow-hidden border-[#23262B]">
                <div className="text-center relative z-10">
                  <div className="font-mono text-[10px] tracking-widest text-[#b8fc4b] font-bold">
                    YOUR LIVE MONICA CONSTANT
                  </div>
                  <div className="font-serif text-xl text-[#b8fc4b] mt-1">
                    {monicaConstant !== null ? monicaConstant.toFixed(3) : 'SIGN IN TO CALCULATE'}
                  </div>
                  {monicaRating && (
                    <span className="font-mono text-[9px] text-[#7bd1fa] uppercase tracking-wider block mt-1">
                      {monicaRating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: NameStone & World ID */}
        <section className="grid grid-cols-12 gap-6 items-stretch">
          {/* ENS Subnames Table */}
          <div id="namestone" className="col-span-12 lg:col-span-7">
            <div className="glass-panel rounded-xl overflow-hidden h-full flex flex-col border-[#23262B]">
              <div className="bg-[#32362a]/30 p-4 flex items-center justify-between border-b border-[#424936]">
                <div className="flex items-center gap-3">
                  <Gem className="w-4 h-4 text-[#b8fc4b]" />
                  <span className="font-mono text-sm font-bold text-[#e0e4d2]">
                    plato.alchmagents.eth
                  </span>
                  <span className="font-mono text-[9px] text-[#ffe6a0] border border-[#ffe6a0]/40 px-2 py-0.5 rounded">
                    EXAMPLE RECORD
                  </span>
                </div>
                <div className="font-mono text-[9px] text-[#c2cab0] bg-black px-2.5 py-1 rounded">
                  0x554F99...804
                </div>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#1d2116] border-b border-[#424936]">
                    <tr>
                      <th className="p-4 text-[#c2cab0] font-bold">RECORD TYPE</th>
                      <th className="p-4 text-[#c2cab0] font-bold">RESOLVER VALUE</th>
                      <th className="p-4 text-[#c2cab0] font-bold">PROTOCOL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#424936]/30">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-[#7bd1fa]">agent-endpoint</td>
                      <td className="p-4">https://api.agents.alchm.kitchen/a2a/plato</td>
                      <td className="p-4 opacity-60">ENSIP-25</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-[#ffe6a0]">agent-wallet</td>
                      <td className="p-4">arc:0x554F99...804</td>
                      <td className="p-4 opacity-60">ENSIP-26</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-[#c2cab0]">agent-memory</td>
                      <td className="p-4 break-all">
                        walrus://blob/7e35fa3c29f4a9fcdb34d582e6c8004f92b1ce
                      </td>
                      <td className="p-4 opacity-60">ENSIP-25</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* World ID Verification */}
          <div
            id="world-id-section"
            className="col-span-12 lg:col-span-5 flex flex-col justify-between p-8 glass-panel rounded-xl border-[#23262B] relative"
          >
            <div className="absolute top-4 right-4">
              <span
                className={`px-2.5 py-1 border text-[9px] font-mono tracking-wider font-bold rounded ${isVerified ? 'text-[#b8fc4b] border-[#b8fc4b] bg-[#b8fc4b]/5' : 'text-[#c2cab0] border-[#8c947c]'}`}
              >
                {isVerified ? 'VERIFIED HUMAN' : 'UNVERIFIED'}
              </span>
            </div>

            <div className="flex items-center gap-6 mb-6 mt-4">
              <div className="w-20 h-20 rounded-full border-2 border-[#424936] flex items-center justify-center p-1 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#424936] to-[#1d2116] flex items-center justify-center">
                  <Fingerprint className="w-10 h-10 text-[#c2cab0]" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg font-mono">HUMAN VALIDATION</h3>
                <p className="text-xs text-[#c2cab0] mt-1 leading-relaxed">
                  Staking multipliers and multi-agent voting rights require World ID
                  proof-of-personhood verification.
                </p>
              </div>
            </div>

            {isVerified ? (
              <div className="w-full py-4 bg-[#b8fc4b]/10 border border-[#b8fc4b]/40 text-[#b8fc4b] font-mono font-bold text-xs tracking-widest flex items-center justify-center gap-3">
                <CheckCircle className="w-4 h-4" /> VERIFIED SIGNATURE RECORDED
              </div>
            ) : primaryWallet ? (
              <WorldIdButton
                signal={primaryWallet.address}
                onVerified={handleWorldIdVerified}
                className="w-full py-4 bg-white text-black font-mono font-bold text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-zinc-200"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthFlow(true)}
                className="w-full py-4 bg-white text-black font-mono font-bold text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-zinc-200"
              >
                <ShieldCheck className="w-4 h-4" /> CONNECT WALLET TO VERIFY
              </button>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 border border-[#424936] rounded">
                <div className="text-[9px] text-[#c2cab0] font-mono font-bold uppercase">
                  LAST VERIFIED
                </div>
                <div className="text-xs font-mono mt-1 text-[#e0e4d2]">
                  {isVerified ? 'JUST NOW' : 'NEVER'}
                </div>
              </div>
              <div className="p-3 border border-[#424936] rounded">
                <div className="text-[9px] text-[#c2cab0] font-mono font-bold uppercase">
                  NULLIFIER HASH
                </div>
                <div className="text-xs font-mono mt-1 text-[#e0e4d2] truncate">
                  {nullifier ? nullifier.substring(0, 16) + '...' : 'UNDEFINED'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 & 5: Terminal & Leaderboard */}
        <section id="terminal" className="grid grid-cols-12 gap-6 items-stretch">
          {/* Live A2A discovery */}
          <div className="col-span-12 lg:col-span-6 flex flex-col min-h-[420px] glass-panel rounded-xl overflow-hidden border-[#23262B]">
            <div className="p-3 bg-[#1d2116] border-b border-[#424936] flex items-center gap-2 flex-shrink-0">
              <span className="led-dot led-green"></span>
              <span className="font-mono text-[10px] tracking-wider text-[#c2cab0] font-bold">
                A2A :: LIVE DISCOVERY ENDPOINT
              </span>
            </div>

            <div className="flex-1 p-6 font-mono text-sm space-y-5 bg-black/40">
              <div className="text-[#8c947c]">&gt;&gt; AGENT CARD AVAILABLE</div>
              <div className="p-4 bg-[#b8fc4b]/5 border border-[#b8fc4b]/20 rounded space-y-3">
                <div className="text-[#b8fc4b] font-bold">PLATO · JSON-RPC 1.0</div>
                <p className="text-xs text-[#c2cab0] leading-relaxed">
                  Discover capabilities and streaming support from the live A2A card. Paid message
                  requests are authorized by the client wallet through x402; this page never fakes
                  an approval or transaction receipt.
                </p>
              </div>
              <div className="text-xs text-[#c2cab0] break-all">
                https://api.agents.alchm.kitchen/a2a/plato/.well-known/agent-card.json
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href="https://api.agents.alchm.kitchen/a2a/plato/.well-known/agent-card.json"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 bg-[#b8fc4b] text-[#223600] text-xs font-mono font-bold tracking-wider text-center"
                >
                  OPEN LIVE AGENT CARD
                </a>
                <button
                  type="button"
                  onClick={() => router.push('/gallery/chat/plato')}
                  className="px-4 py-3 border border-[#8c947c] text-xs font-mono text-[#c2cab0] hover:bg-white/5"
                >
                  CHAT WITH PLATO
                </button>
              </div>
            </div>
          </div>

          {/* Live registry entry point */}
          <div className="col-span-12 lg:col-span-6 glass-panel rounded-xl overflow-hidden flex flex-col justify-between border-[#23262B]">
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="font-mono text-[10px] tracking-widest text-[#c2cab0] font-bold mb-4">
                ERC-8004 LIVE REGISTRY
              </div>
              <h3 className="font-serif text-2xl text-[#e0e4d2] mb-4">
                Verify reputation on-chain
              </h3>
              <p className="font-mono text-xs text-[#c2cab0] leading-relaxed mb-6">
                The registry view queries indexed ERC-8004 registration, feedback, validation, and
                trust records. Values appear only when the live index returns them—no sample
                rankings or invented transaction volume.
              </p>
              <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
                <div className="border border-[#424936] p-3 text-[#7bd1fa]">IDENTITY REGISTRY</div>
                <div className="border border-[#424936] p-3 text-[#b8fc4b]">X402 DISCOVERY</div>
                <div className="border border-[#424936] p-3 text-[#ffe6a0]">VALIDATION LOGS</div>
                <div className="border border-[#424936] p-3 text-[#c2cab0]">OWNER RECORDS</div>
              </div>
            </div>

            <div className="p-4 text-center border-t border-[#424936] bg-[#050506]">
              <button
                onClick={() => router.push('/erc8004')}
                className="font-mono text-[10px] text-[#b8fc4b] tracking-widest hover:underline uppercase font-bold"
              >
                VIEW LIVE REGISTRY
              </button>
            </div>
          </div>
        </section>

        {/* Top Agents of the Moment */}
        <section className="space-y-6">
          <div className="border-l-4 border-[#7bd1fa] pl-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-wider font-mono">
              CELESTIAL REVERBERATION
            </h2>
            <p className="text-sm text-[#c2cab0] font-mono">
              AGENTS ALIGNED WITH THE CURRENT CONSTELLATION ASPECT
            </p>
          </div>
          <TopAgentsOfTheMoment
            positions={planetaryData.planetaryPositions}
            loading={planetaryData.loading}
          />
        </section>

        {/* Onramp entry point */}
        <section className="max-w-3xl mx-auto glass-panel p-8 rounded-xl border-[#23262B]">
          <div className="text-center mb-8">
            <h2 className="font-bold text-xl md:text-2xl font-serif">FUND YOUR ARC WALLET</h2>
            <p className="text-[#c2cab0] font-mono text-xs tracking-wider mt-1">
              CONNECT, SWITCH NETWORKS, AND REVIEW LIVE BALANCES BEFORE STAKING
            </p>
          </div>

          <div className="p-6 bg-[#0A0A0B]/85 border border-[#424936] rounded-lg">
            <p className="text-sm text-[#c2cab0] leading-relaxed mb-6">
              The guided connection flow checks your wallet, Arc network, and testnet USDC in real
              time. Quotes and transactions are shown only when a provider and wallet can actually
              authorize them.
            </p>
            <button
              type="button"
              onClick={() => router.push('/pentacles/connect')}
              className="w-full px-6 py-3 bg-[#7bd1fa] text-[#001e2b] font-mono text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(125,211,252,0.4)] transition-all rounded active:scale-95"
            >
              OPEN WALLET SETUP
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 md:px-16 py-12 flex flex-col md:flex-row justify-between items-center gap-6 bg-[#050506]/90 border-t border-[#424936] mt-24">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="text-[#e0e4d2] font-bold font-mono text-xs tracking-widest">
            ALCHM AGENTS
          </div>
          <div className="font-mono text-[9px] tracking-wide text-[#c2cab0]/60">
            © 2026 ALCHM AGENTS | REFERENCE BLOB: 0x7E35…B1cE
          </div>
        </div>
        <div className="flex gap-8">
          <a
            className="font-mono text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="#sacred-seven"
          >
            BLOCKS
          </a>
          <a
            className="font-mono text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="https://walrus.xyz"
            target="_blank"
          >
            WALRUS
          </a>
          <a
            className="font-mono text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="https://circle.com"
            target="_blank"
          >
            CCTP
          </a>
          <a
            className="font-mono text-[10px] tracking-widest text-[#c2cab0] hover:text-[#b8fc4b] transition-colors"
            href="https://github.com/CookingWithCastro/AlchmAgentsETH/blob/main/INTEGRATIONS.md"
            target="_blank"
            rel="noreferrer"
          >
            DOCS.EXE
          </a>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono tracking-widest text-[#c2cab0]">
              INTEGRATION MODE
            </span>
            <span className="text-[9px] font-mono text-[#b8fc4b] font-bold">LIVE + TESTNET</span>
          </div>
          <span className="led-dot led-green"></span>
        </div>
      </footer>
    </div>
  )
}
