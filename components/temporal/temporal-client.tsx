'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import {
  computeTemporalDelta,
  summarizeDelta,
  type SessionSnapshot,
  type TemporalDelta,
} from '@/lib/philosophers-stone/temporal-delta'
import { TemporalGreeting } from '@/components/temporal/temporal-greeting'
import { RelationSelector, type RelationChart } from '@/components/temporal/relation-selector'
import { PlanetaryMovementChart } from '@/components/temporal/planetary-movement-chart'
import { ConsciousnessVectorDisplay } from '@/components/temporal/consciousness-vector-display'
import {
  SynastryAnalysisEngine,
  type SynastryChart,
  type ElementalProfile,
  type ModalProfile,
} from '@/lib/synastry-compatibility-engine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlanetaryPositions } from '@/hooks/usePlanetaryPositions'
import { calculateMC } from '@/lib/monica/monica-constant-validator'

// Browser-safe wrappers around the proxy routes — replaces removed
// `@/lib/astrologize` and `@/lib/alchemizer` modules.
async function fetchAlchmizeForBirth(birth: {
  year: number
  month: number // zero-based
  day: number
  hour: number
  minute: number
  latitude: number
  longitude: number
}): Promise<any> {
  const date = new Date(Date.UTC(birth.year, birth.month, birth.day, birth.hour, birth.minute))
  const res = await fetch('/api/alchemize?legacy=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date.toISOString(),
      latitude: birth.latitude,
      longitude: birth.longitude,
    }),
  })
  if (!res.ok) throw new Error(`alchemize proxy failed: ${res.status}`)
  return res.json()
}

async function fetchWheelForBirth(birth: any): Promise<{ svg?: string; imageUrl?: string }> {
  // Chart wheel imagery is WTEN-served — use the WTEN var, not the PA agents backend.
  const backendUrl =
    process.env.NEXT_PUBLIC_WTEN_BACKEND_URL || 'https://whattoeatnext-production.up.railway.app'
  const params = new URLSearchParams({
    year: String(birth.year),
    month: String(birth.month + 1),
    day: String(birth.day),
    hour: String(birth.hour),
    minute: String(birth.minute),
  })
  return { imageUrl: `${backendUrl}/api/chart-image?${params.toString()}` }
}

async function loadPreviousSession(userId: string, personalityId: string) {
  const res = await fetch(
    `/api/philosophers-stone/session?userId=${encodeURIComponent(userId)}&personalityId=${encodeURIComponent(personalityId)}`,
    { cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.session?.sessionData || null
}

async function saveSession(userId: string, personalityId: string, snapshot: SessionSnapshot) {
  await fetch('/api/philosophers-stone/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, personalityId, snapshot }),
  })
}

// Calculate real elemental and modal profiles from birth chart data
function calculateElementalProfile(birthDate: string): ElementalProfile {
  // Parse date to get zodiac sign
  const date = new Date(birthDate)
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Simple calculation based on Sun sign for basic profile
  // In a full implementation, this would calculate from full chart
  const signElements: Record<number, string> = {
    1: 'capricorn',
    2: 'aquarius',
    3: 'pisces',
    4: 'aries',
    5: 'taurus',
    6: 'gemini',
    7: 'cancer',
    8: 'leo',
    9: 'virgo',
    10: 'libra',
    11: 'scorpio',
    12: 'sagittarius',
  }

  const elementMap: Record<
    string,
    keyof Omit<ElementalProfile, 'dominant_element' | 'secondary_element'>
  > = {
    aries: 'fire',
    leo: 'fire',
    sagittarius: 'fire',
    taurus: 'earth',
    virgo: 'earth',
    capricorn: 'earth',
    gemini: 'air',
    libra: 'air',
    aquarius: 'air',
    cancer: 'water',
    scorpio: 'water',
    pisces: 'water',
  }

  const sign = signElements[month]?.toLowerCase()
  const primaryElement = elementMap[sign as keyof typeof elementMap] || 'fire'

  // Create balanced profile with primary element emphasized
  const profile: ElementalProfile = {
    fire: primaryElement === 'fire' ? 40 : 20,
    earth: primaryElement === 'earth' ? 40 : 20,
    air: primaryElement === 'air' ? 40 : 20,
    water: primaryElement === 'water' ? 40 : 20,
    dominant_element: primaryElement,
    secondary_element:
      primaryElement === 'fire'
        ? 'air'
        : primaryElement === 'earth'
          ? 'water'
          : primaryElement === 'air'
            ? 'fire'
            : 'earth',
  }

  return profile
}

function calculateModalProfile(birthDate: string): ModalProfile {
  const date = new Date(birthDate)
  const month = date.getMonth() + 1

  // Modality mapping by month (simplified by Sun sign)
  const modalityMap: Record<number, 'cardinal' | 'fixed' | 'mutable'> = {
    1: 'cardinal',
    2: 'fixed',
    3: 'mutable',
    4: 'cardinal',
    5: 'fixed',
    6: 'mutable',
    7: 'cardinal',
    8: 'fixed',
    9: 'mutable',
    10: 'cardinal',
    11: 'fixed',
    12: 'mutable',
  }

  const dominantMode = modalityMap[month] || 'mutable'

  // Create profile with dominant modality
  const profile: ModalProfile = {
    cardinal: dominantMode === 'cardinal' ? 50 : 25,
    fixed: dominantMode === 'fixed' ? 50 : 25,
    mutable: dominantMode === 'mutable' ? 50 : 25,
    dominant_mode: dominantMode,
  }

  return profile
}

// Convert RelationChart to SynastryChart format with real calculations
function createSynastryChartSkeleton(user: RelationChart, relation: any): SynastryChart {
  // Calculate real elemental and modal profiles
  const userElemental = calculateElementalProfile(user.birthDate)
  const userModal = calculateModalProfile(user.birthDate)

  const relationElemental = relation.alchm?.dominantElement
    ? {
        fire: relation.alchm.elementalProperties?.Fire || 25,
        earth: relation.alchm.elementalProperties?.Earth || 25,
        air: relation.alchm.elementalProperties?.Air || 25,
        water: relation.alchm.elementalProperties?.Water || 25,
        dominant_element: relation.alchm.dominantElement.toLowerCase(),
        secondary_element: 'air',
      }
    : calculateElementalProfile(relation.birthDate)

  const relationModal = relation.alchm?.dominantModality
    ? {
        cardinal: relation.alchm.dominantModality === 'Cardinal' ? 50 : 25,
        fixed: relation.alchm.dominantModality === 'Fixed' ? 50 : 25,
        mutable: relation.alchm.dominantModality === 'Mutable' ? 50 : 25,
        dominant_mode: relation.alchm.dominantModality.toLowerCase(),
      }
    : calculateModalProfile(relation.birthDate)

  const relationAspects =
    relation.alchm?.aspects?.map((a: any) => `${a.planet1} ${a.aspect} ${a.planet2}`) || []

  return {
    person1: {
      name: user.name,
      birth_data: {
        date: user.birthDate,
        time: user.birthTime || null,
        location:
          (user as any).location ||
          (user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : 'Unknown'),
      },
      chart_features: [],
      planetary_placements: [],
      elemental_emphasis: userElemental,
      modal_emphasis: userModal,
    },
    person2: {
      name: relation.name,
      birth_data: {
        date: relation.birthDate,
        time: relation.birthTime || null,
        location:
          (relation as any).location ||
          (relation.latitude && relation.longitude
            ? `${relation.latitude}, ${relation.longitude}`
            : 'Unknown'),
      },
      chart_features: relationAspects,
      planetary_placements: [],
      elemental_emphasis: relationElemental,
      modal_emphasis: relationModal,
    },
  }
}

export function TemporalClient() {
  const [lines, setLines] = useState<string[]>([])
  const [delta, setDelta] = useState<TemporalDelta | null>(null)
  const [relations, setRelations] = useState<Array<RelationChart & { alchm?: any; mc?: number }>>(
    []
  )
  const [synastryHint, setSynastryHint] = useState<string>('')
  const [aggregate, setAggregate] = useState<{
    spirit: number
    essence: number
    matter: number
    substance: number
    count: number
  } | null>(null)
  const [dataSource, setDataSource] = useState<'backend' | 'local' | 'mixed'>('backend')
  const [freshness, setFreshness] = useState<string>('')

  // Throttling for concurrent relation processing
  const MAX_CONCURRENT = 3
  const inFlightRef = useRef(0)
  const queueRef = useRef<Array<() => void>>([])

  function runThrottled<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        inFlightRef.current += 1
        fn()
          .then(res => resolve(res))
          .catch(err => reject(err))
          .finally(() => {
            inFlightRef.current -= 1
            const next = queueRef.current.shift()
            if (next) next()
          })
      }
      if (inFlightRef.current < MAX_CONCURRENT) {
        run()
      } else {
        queueRef.current.push(run)
      }
    })
  }

  // In-memory caches for relation results (per session)
  const alchmCacheRef = useRef<Map<string, any>>(new Map())
  const wheelCacheRef = useRef<Map<string, { svg?: string; imageUrl?: string }>>(new Map())
  function cacheKeyFromBirth(b: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    latitude: number
    longitude: number
    name?: string
  }) {
    return `${b.name || 'Subject'}:${b.year}-${b.month}-${b.day}T${b.hour}:${b.minute}@${b.latitude},${b.longitude}`
  }

  // Use unified planetary positions hook to ensure consistency across all tabs
  const { timestamp, planetaryPositions, alchmQuantities, monicaConstant, loading } =
    usePlanetaryPositions({
      refreshInterval: 30000, // 30 seconds
      useApi: true, // Use API for Philosopher's Stone consistency
    })

  // Create current snapshot from unified data
  const currentSnapshot: SessionSnapshot | null = useMemo(() => {
    if (loading || !timestamp) return null

    return {
      timestamp,
      planetaryPositions,
      alchmQuantities,
      monicaConstant,
    }
  }, [timestamp, planetaryPositions, alchmQuantities, monicaConstant, loading])

  useEffect(() => {
    if (!currentSnapshot) return

    let cancelled = false
    ;(async () => {
      const userId = 'guest'
      const personalityId = 'stone'
      const previous = await loadPreviousSession(userId, personalityId)

      if (previous) {
        const temporalDelta = computeTemporalDelta(previous, currentSnapshot)
        const summary = ['Welcome back to the Living Stone', ...summarizeDelta(temporalDelta)]
        if (!cancelled) {
          setLines(summary)
          setDelta(temporalDelta)
        }
      } else {
        if (!cancelled) {
          setLines(['Welcome to the Living Stone', 'First session initialized'])
        }
      }
      await saveSession(userId, personalityId, currentSnapshot)
    })()
    return () => {
      cancelled = true
    }
  }, [currentSnapshot])

  const handleAddRelation = async (relation: RelationChart) => {
    try {
      const [y, m, d] = relation.birthDate.split('-').map(v => parseInt(v, 10))
      const [hh, mm] = (relation.birthTime || '12:00').split(':').map(v => parseInt(v, 10))
      const lat = (relation as any).latitude ? parseFloat((relation as any).latitude) : 0
      const lon = (relation as any).longitude ? parseFloat((relation as any).longitude) : 0

      const birthInfo = {
        year: y,
        month: Math.max(0, m - 1),
        day: d,
        hour: isNaN(hh) ? 12 : hh,
        minute: isNaN(mm) ? 0 : mm,
        latitude: isNaN(lat) ? 0 : lat,
        longitude: isNaN(lon) ? 0 : lon,
      }

      // In parallel per relation: alchm + wheel (throttled overall)
      const task = async () => {
        let usedBackend = true
        const key = cacheKeyFromBirth({ ...birthInfo, name: relation.name })

        const alchmPromise = (async () => {
          const cached = alchmCacheRef.current.get(key)
          if (cached) return cached
          try {
            const backend = await fetchAlchmizeForBirth(birthInfo)
            const parsed = (backend as any)?.alchm || backend
            alchmCacheRef.current.set(key, parsed)
            return parsed
          } catch {
            usedBackend = false
            // No local fallback — alchemizer module was removed. Provide a
            // neutral structure so downstream UI keeps rendering. The
            // backend is ESMS-native and does not emit elemental
            // (Fire/Water/Earth/Air) decomposition, so a zeroed
            // Alchemy-Effects block is the correct degraded state here —
            // not a stopgap awaiting a new endpoint.
            const fallback = {
              'Alchemy Effects': {
                'Total Spirit': 0,
                'Total Essence': 0,
                'Total Matter': 0,
                'Total Substance': 0,
              },
              'Total Effect Value': { Fire: 0, Water: 0, Air: 0, Earth: 0 },
              Heat: 0,
              Entropy: 0,
              Reactivity: 0,
              Energy: 0,
            }
            alchmCacheRef.current.set(key, fallback)
            return fallback
          }
        })()

        const wheelPromise = (async () => {
          const cached = wheelCacheRef.current.get(key)
          if (cached) return cached
          const wheel = await fetchWheelForBirth({ ...birthInfo, name: relation.name })
          wheelCacheRef.current.set(key, wheel)
          return wheel
        })()

        const [alchmInfo, wheel] = await Promise.all([alchmPromise, wheelPromise])
        const confidence = usedBackend ? 0.9 : 0.7
        const validation = usedBackend ? 'schema' : 'heuristic'
        const degraded = !usedBackend
        return { alchmInfo, wheel, usedBackend, confidence, validation, degraded }
      }

      const { alchmInfo, wheel, usedBackend, confidence, validation, degraded } =
        await runThrottled(task)

      const spirit = alchmInfo?.['Alchemy Effects']?.['Total Spirit'] || 0
      const essence = alchmInfo?.['Alchemy Effects']?.['Total Essence'] || 0
      const matter = alchmInfo?.['Alchemy Effects']?.['Total Matter'] || 0
      const substance = alchmInfo?.['Alchemy Effects']?.['Total Substance'] || 0

      const mc = calculateMC(
        spirit,
        essence,
        matter,
        substance,
        alchmInfo?.['Total Effect Value']?.['Fire'] || 0,
        alchmInfo?.['Total Effect Value']?.['Water'] || 0,
        alchmInfo?.['Total Effect Value']?.['Air'] || 0,
        alchmInfo?.['Total Effect Value']?.['Earth'] || 0
      )

      const enriched = {
        ...relation,
        alchm: alchmInfo,
        mc,
        wheel,
        _meta: { usedBackend, confidence, validation, degraded },
      }
      const newRelations = [...relations, enriched]
      setRelations(newRelations)
      setDataSource(prev =>
        prev === 'mixed' ? 'mixed' : usedBackend ? prev : prev === 'backend' ? 'mixed' : 'local'
      )
      setFreshness('Updated')

      const agg = newRelations.reduce(
        (acc, r) => {
          const a = r.alchm?.['Alchemy Effects'] || {}
          return {
            spirit: acc.spirit + (a['Total Spirit'] || 0),
            essence: acc.essence + (a['Total Essence'] || 0),
            matter: acc.matter + (a['Total Matter'] || 0),
            substance: acc.substance + (a['Total Substance'] || 0),
            count: acc.count + 1,
          }
        },
        { spirit: 0, essence: 0, matter: 0, substance: 0, count: 0 }
      )
      setAggregate(agg)

      if (newRelations.length === 1) {
        const userChart = { name: 'You', birthDate: '1990-01-01' } as RelationChart
        const synastryChart = createSynastryChartSkeleton(userChart, enriched)
        const report = SynastryAnalysisEngine.generateSynastryReport(synastryChart)
        setSynastryHint(
          `With ${relation.name} present: ${report.compatibility_analysis.universal_lesson}`
        )
      }
    } catch (e) {
      console.error('Failed to add relation chart:', e)
    }
  }

  const handleRemoveRelation = (index: number) => {
    const newRelations = relations.filter((_, i) => i !== index)
    setRelations(newRelations)
    if (newRelations.length === 0) {
      setSynastryHint('')
    }
    if (newRelations.length > 0) {
      const agg = newRelations.reduce(
        (acc, r) => {
          const a = (r as any).alchm?.['Alchemy Effects'] || {}
          return {
            spirit: acc.spirit + (a['Total Spirit'] || 0),
            essence: acc.essence + (a['Total Essence'] || 0),
            matter: acc.matter + (a['Total Matter'] || 0),
            substance: acc.substance + (a['Total Substance'] || 0),
            count: acc.count + 1,
          }
        },
        { spirit: 0, essence: 0, matter: 0, substance: 0, count: 0 }
      )
      setAggregate(agg)
    } else {
      setAggregate(null)
    }
  }

  if (loading) return <div className="text-center py-8">Loading the Living Stone...</div>

  return (
    <div className="space-y-6">
      <TemporalGreeting lines={lines} relationHint={synastryHint} />

      {currentSnapshot && currentSnapshot.alchmQuantities && (
        <ConsciousnessVectorDisplay
          alchmQuantities={currentSnapshot.alchmQuantities}
          monicaConstant={currentSnapshot.monicaConstant ?? null}
        />
      )}

      {delta && <PlanetaryMovementChart delta={delta} />}

      <RelationSelector
        onAddRelation={handleAddRelation}
        relations={relations}
        onRemoveRelation={handleRemoveRelation}
      />

      {relations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Charts — Alchemical Profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Source: {dataSource} · Updated: {freshness || '—'}
            </div>
            {relations.map((r, i) => (
              <div key={`${r.name}-${i}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {r.name} — {r.birthDate}
                    {(r as any).birthTime ? ` ${(r as any).birthTime}` : ''}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {typeof (r as any).mc === 'number' && (
                      <span>MC: {(r as any).mc.toFixed(3)}</span>
                    )}
                    {(r as any)._meta && (
                      <span>
                        {(r as any)._meta.degraded ? 'degraded' : 'ok'} · conf{' '}
                        {(r as any)._meta.confidence?.toFixed(2)} · {(r as any)._meta.validation}
                      </span>
                    )}
                  </div>
                </div>
                {(r as any).wheel?.svg && (
                  <div className="border rounded p-2 overflow-auto">
                    <div dangerouslySetInnerHTML={{ __html: (r as any).wheel.svg }} />
                  </div>
                )}
                {(r as any).wheel?.imageUrl && !(r as any).wheel?.svg && (
                  <div className="border rounded p-2 overflow-auto">
                    <img
                      src={(r as any).wheel.imageUrl}
                      alt={`${r.name} natal wheel`}
                      className="max-w-full h-auto"
                    />
                  </div>
                )}
                {(r as any).alchm && (
                  <ConsciousnessVectorDisplay
                    alchmQuantities={{
                      spirit: (r as any).alchm['Alchemy Effects']?.['Total Spirit'] || 0,
                      essence: (r as any).alchm['Alchemy Effects']?.['Total Essence'] || 0,
                      matter: (r as any).alchm['Alchemy Effects']?.['Total Matter'] || 0,
                      substance: (r as any).alchm['Alchemy Effects']?.['Total Substance'] || 0,
                      Heat: (r as any).alchm['Heat'] || 0,
                      Entropy: (r as any).alchm['Entropy'] || 0,
                      Reactivity: (r as any).alchm['Reactivity'] || 0,
                      Energy: (r as any).alchm['Energy'] || 0,
                    }}
                    monicaConstant={
                      typeof (r as any).mc === 'number' && Number.isFinite((r as any).mc)
                        ? (r as any).mc
                        : null
                    }
                  />
                )}
              </div>
            ))}

            {aggregate && (
              <div className="mt-2 text-sm">
                <div className="font-medium">
                  Collective Field Totals ({aggregate.count} charts)
                </div>
                <div className="text-muted-foreground">
                  Spirit: {aggregate.spirit.toFixed(2)} · Essence: {aggregate.essence.toFixed(2)} ·
                  Matter: {aggregate.matter.toFixed(2)} · Substance:{' '}
                  {aggregate.substance.toFixed(2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today's Unique Opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            The temporal delta reveals {delta?.planetaryMovement[0]?.planet || 'cosmic'} as the
            primary mover. Focus on{' '}
            {delta?.planetaryMovement[0]?.planet === 'Mercury'
              ? 'communication and mental clarity'
              : delta?.planetaryMovement[0]?.planet === 'Venus'
                ? 'relationships and values alignment'
                : delta?.planetaryMovement[0]?.planet === 'Mars'
                  ? 'action and initiative'
                  : 'consciousness expansion'}{' '}
            today.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default TemporalClient
