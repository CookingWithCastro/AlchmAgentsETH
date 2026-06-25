'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Moon, Sun, Flame, Droplets, Wind, Mountain, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CosmicTelemetryProps {
  data: {
    agents: {
      cosmicHarmony: {
        spirit: number
        essence: number
        matter: number
        substance: number
      }
    }
  }
}

// Aspect and orb calculation helpers
function getAspectOrb(deg1: number, deg2: number) {
  const diff = Math.abs(deg1 - deg2) % 360
  const angle = diff > 180 ? 360 - diff : diff

  const majorAspects = [
    { name: 'Conjunction', target: 0 },
    { name: 'Sextile', target: 60 },
    { name: 'Square', target: 90 },
    { name: 'Trine', target: 120 },
    { name: 'Opposition', target: 180 },
  ]

  let minOrb = 360
  for (const aspect of majorAspects) {
    const orb = Math.abs(angle - aspect.target)
    if (orb < minOrb) {
      minOrb = orb
    }
  }
  return minOrb
}

function calculateFieldOrb(positions: any[]) {
  if (!positions || positions.length < 2) return 8.42 // Fallback

  const orbs: number[] = []
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i]
      const p2 = positions[j]

      const deg1 = p1.longitude
      const deg2 = p2.longitude
      if (typeof deg1 === 'number' && typeof deg2 === 'number') {
        const orb = getAspectOrb(deg1, deg2)
        orbs.push(orb)
      }
    }
  }

  const closestOrbs = orbs.sort((a, b) => a - b).slice(0, 5)
  if (closestOrbs.length === 0) return 8.42
  const averageOrb = closestOrbs.reduce((a, b) => a + b, 0) / closestOrbs.length
  return Math.round(averageOrb * 100) / 100
}

function calculateMoonPhase(positions: any[]) {
  const sun = positions.find(p => p.name === 'Sun')
  const moon = positions.find(p => p.name === 'Moon')
  if (!sun || !moon) return null

  return (moon.longitude - sun.longitude + 360) % 360
}

function getRealMoonPhaseName(diff: number): string {
  if (diff < 22.5 || diff >= 337.5) return 'New Moon (Initiation)'
  if (diff < 67.5) return 'Waxing Crescent (Emergence)'
  if (diff < 112.5) return 'First Quarter (Decision)'
  if (diff < 157.5) return 'Waxing Gibbous (Refinement)'
  if (diff < 202.5) return 'Full Moon (Illumination)'
  if (diff < 247.5) return 'Waning Gibbous (Release)'
  if (diff < 292.5) return 'Last Quarter (Revaluation)'
  return 'Waning Crescent (Surrender)'
}

export default function CosmicTelemetryPanel({ data }: CosmicTelemetryProps) {
  const { spirit, essence, matter, substance } = data.agents.cosmicHarmony
  const [realTransits, setRealTransits] = useState<any[] | null>(null)
  const [transitsLoading, setTransitsLoading] = useState(true)

  useEffect(() => {
    async function loadTransits() {
      try {
        const res = await fetch('/api/planetary-positions?includeAlchemy=true')
        if (res.ok) {
          const payload = await res.json()
          if (payload.success && payload.planetaryPositions) {
            setRealTransits(payload.planetaryPositions)
          }
        }
      } catch (err) {
        console.error('Failed to load live transits:', err)
      } finally {
        setTransitsLoading(false)
      }
    }
    loadTransits()
  }, [])

  // Calculate roster balance standard deviation
  const values = [spirit, essence, matter, substance]
  const avg = values.reduce((a, b) => a + b, 0) / 4
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 4
  const stdDev = Math.sqrt(variance)
  // Balance is 100 - (stdDev * 100) normalized
  const harmonyIndex = Math.max(0, Math.min(100, Math.round((1 - stdDev * 2) * 100)))

  // Determine dominant element
  const maxVal = Math.max(spirit, essence, matter, substance)
  let dominantElement = 'Equilibrium'
  let DominantIcon = Compass
  let dominantColor = 'text-sky-300'

  if (maxVal === spirit) {
    dominantElement = 'Etheric Spirit'
    DominantIcon = Sparkles
    dominantColor = 'text-indigo-400'
  } else if (maxVal === essence) {
    dominantElement = 'Alchemical Essence'
    DominantIcon = Sun
    dominantColor = 'text-fuchsia-400'
  } else if (maxVal === matter) {
    dominantElement = 'Chthonic Matter'
    DominantIcon = Mountain
    dominantColor = 'text-emerald-400'
  } else if (maxVal === substance) {
    dominantElement = 'Primal Substance'
    DominantIcon = Moon
    dominantColor = 'text-amber-400'
  }

  // Get current local Moon details
  const currentDate = new Date()
  const moonPhaseName = getMoonPhaseName(currentDate)

  return (
    <div className="space-y-6">
      {/* Metaphysical Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-950 p-6 backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-40 w-40 rounded-full bg-fuchsia-500/5 blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-300">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Metaphysical Roster Alignment
            </div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-50">
              Cosmic Field Observational Array
            </h3>
            <p className="text-xs text-zinc-400 max-w-lg">
              Live resonance metrics computed from active alchemical agents, planetary transits, and
              absolute degree configurations.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/30 border border-white/5 rounded-2xl p-4">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-[0.12em] text-zinc-500 block">
                Roster Coherence
              </span>
              <span className="text-2xl font-black text-white">{harmonyIndex}%</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/10">
              <DominantIcon className={cn('h-5 w-5', dominantColor)} />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Spirit Metric */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-indigo-500/30 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(99,102,241,0.05)]">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <Flame className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/10">
              Spirit
            </span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Etheric Spirit
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">{Math.round(spirit * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 rounded-full transition-all duration-1000"
                style={{ width: `${spirit * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block">
              Agent reasoning capacity and logic gateway
            </span>
          </div>
        </div>

        {/* Essence Metric */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-fuchsia-500/30 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.05)]">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 group-hover:scale-110 transition-transform duration-300">
              <Droplets className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded-md border border-fuchsia-500/10">
              Essence
            </span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Alchemical Essence
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">
                {Math.round(essence * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-fuchsia-400 rounded-full transition-all duration-1000"
                style={{ width: `${essence * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block">
              Active user affinity and emotional resonance
            </span>
          </div>
        </div>

        {/* Matter Metric */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-emerald-500/30 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <Wind className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">
              Matter
            </span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Chthonic Matter
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">{Math.round(matter * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-1000"
                style={{ width: `${matter * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block">
              Synthesized recipe data and physical entities
            </span>
          </div>
        </div>

        {/* Substance Metric */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-5 transition-all duration-300 hover:border-amber-500/30 hover:bg-zinc-900/60 hover:shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="flex justify-between items-start mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300">
              <Mountain className="h-5 w-5" />
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
              Substance
            </span>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Primal Substance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-100">
                {Math.round(substance * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-1000"
                style={{ width: `${substance * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 block">
              Underlying database records and storage weight
            </span>
          </div>
        </div>
      </div>

      {/* Astro Signals & Moon Intelligence */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Moon Degree Archetype Intelligence */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Moon className="h-5 w-5 text-indigo-300" />
            <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest">
              Aura & Lunar Phase Influence
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center rounded-xl bg-black/20 border border-white/5 p-3">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Observed Lunar Phase
                </span>
                <span className="font-semibold text-zinc-200">
                  {transitsLoading
                    ? 'Loading...'
                    : realTransits
                      ? (() => {
                          const diff = calculateMoonPhase(realTransits)
                          return diff !== null ? getRealMoonPhaseName(diff) : moonPhaseName
                        })()
                      : moonPhaseName}
                </span>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 uppercase tracking-wider rounded-md">
                Degree Sync Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Metaphysical Dominant
                </span>
                <span className="text-xs font-bold text-zinc-300 mt-1 block">
                  {dominantElement}
                </span>
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Calculated Field Orb
                </span>
                <span className="text-xs font-bold text-zinc-300 mt-1 block">
                  {transitsLoading || !realTransits
                    ? '8.42° Arc'
                    : `${calculateFieldOrb(realTransits).toFixed(2)}° Arc`}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              *The Lunar Phase Influence module retroactively enriches the 360 Moon degree agents
              dynamically, mapping archetypes, emotional constraints, and spiritual traits directly
              into the LangChain orchestrator.
            </p>
          </div>
        </div>

        {/* Astronomical Ephemeris Observability */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <Compass className="h-5 w-5 text-fuchsia-300" />
            <h4 className="font-bold text-sm text-zinc-100 uppercase tracking-widest">
              Active Celestial Transits
            </h4>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {transitsLoading ? (
              <div className="text-center py-6 text-xs text-zinc-555 font-mono animate-pulse">
                Syncing Swiss Ephemeris...
              </div>
            ) : realTransits && realTransits.length > 0 ? (
              realTransits.map(t => {
                const degreeStr = `${t.degree}° ${t.sign} ${t.minute ?? 0}'`
                const motion = t.isRetrograde ? 'Retrograde' : 'Direct'
                const power = t.isRetrograde
                  ? 'Retrograde (Inward)'
                  : Math.abs(t.longitudeSpeed) > 1.2
                    ? 'High Coherence'
                    : 'Strong Coherence'

                return (
                  <div
                    key={t.name}
                    className="flex justify-between items-center rounded-xl bg-black/10 border border-white/5 px-3.5 py-2.5 hover:bg-black/25 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          t.isRetrograde
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : 'bg-fuchsia-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                        )}
                      />
                      <span className="font-bold text-xs text-zinc-200">{t.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-450">{degreeStr}</span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                        t.isRetrograde
                          ? 'text-amber-300 bg-amber-500/10 border-amber-500/15'
                          : 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/15'
                      )}
                    >
                      {motion} ({power})
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-6 text-xs text-rose-400 font-mono">
                Astronomical Engine Offline
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helpers
function getMoonPhaseName(date: Date): string {
  // Simple moon age calculation
  const epoch = new Date(1970, 0, 7).getTime() // Known new moon
  const cycle = 29.530588853 * 24 * 60 * 60 * 1000
  const elapsed = date.getTime() - epoch
  const age = (elapsed % cycle) / (24 * 60 * 60 * 1000)

  if (age < 1.84) return 'New Moon (Initiation)'
  if (age < 5.53) return 'Waxing Crescent (Emergence)'
  if (age < 9.22) return 'First Quarter (Decision)'
  if (age < 12.91) return 'Waxing Gibbous (Refinement)'
  if (age < 16.6) return 'Full Moon (Illumination)'
  if (age < 20.29) return 'Waning Gibbous (Release)'
  if (age < 23.98) return 'Last Quarter (Revaluation)'
  if (age < 27.67) return 'Waning Crescent (Surrender)'
  return 'Dark Moon (Transmutation)'
}
