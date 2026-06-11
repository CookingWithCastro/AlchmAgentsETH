'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AlchemicalQuantities, PlanetaryPosition } from '@/hooks/usePlanetaryPositions'
import { calculateMC } from '@/lib/monica/monica-constant-validator'
import { useSpacetime } from '@/lib/spacetime/SpacetimeContext'
import { tables } from '@/lib/spacetime/generated'
import type { Ephemeris, Planet } from '@/lib/spacetime/generated/types'

type PlanetName = Planet['tag']
type Element = 'Fire' | 'Water' | 'Air' | 'Earth'

interface AlchemyProfile {
  spirit: number
  essence: number
  matter: number
  substance: number
  elements: readonly Element[]
  dignity: Partial<Record<(typeof ZODIAC_SIGNS)[number], number>>
}

interface UseLiveEphemerisOptions {
  enabled?: boolean
}

const ZODIAC_SIGNS = [
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
] as const

const ELEMENT_BY_SIGN: Record<(typeof ZODIAC_SIGNS)[number], Element> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
}

const PLANET_ORDER: PlanetName[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

const ALCHEMY_BY_PLANET: Record<PlanetName, AlchemyProfile> = {
  Sun: {
    spirit: 1,
    essence: 0,
    matter: 0,
    substance: 0,
    elements: ['Fire'],
    dignity: { Leo: 1, Aries: 2, Aquarius: -1, Libra: -2 },
  },
  Moon: {
    spirit: 0,
    essence: 1,
    matter: 1,
    substance: 0,
    elements: ['Water'],
    dignity: { Cancer: 1, Taurus: 2, Capricorn: -1, Scorpio: -2 },
  },
  Mercury: {
    spirit: 1,
    essence: 0,
    matter: 0,
    substance: 1,
    elements: ['Air', 'Earth'],
    dignity: { Gemini: 1, Virgo: 3, Sagittarius: 1, Pisces: -3 },
  },
  Venus: {
    spirit: 0,
    essence: 1,
    matter: 1,
    substance: 0,
    elements: ['Water', 'Earth'],
    dignity: { Libra: 1, Taurus: 1, Pisces: 2, Aries: -1, Scorpio: -1, Virgo: -2 },
  },
  Mars: {
    spirit: 0,
    essence: 1,
    matter: 1,
    substance: 0,
    elements: ['Fire', 'Water'],
    dignity: { Aries: 1, Scorpio: 1, Capricorn: 2, Taurus: -1, Libra: -1, Cancer: -2 },
  },
  Jupiter: {
    spirit: 1,
    essence: 1,
    matter: 0,
    substance: 0,
    elements: ['Air', 'Fire'],
    dignity: { Pisces: 1, Sagittarius: 1, Cancer: 2, Gemini: -1, Virgo: -1, Capricorn: -2 },
  },
  Saturn: {
    spirit: 1,
    essence: 0,
    matter: 1,
    substance: 0,
    elements: ['Air', 'Earth'],
    dignity: { Aquarius: 1, Capricorn: 1, Libra: 2, Cancer: -1, Leo: -1, Aries: -2 },
  },
  Uranus: {
    spirit: 0,
    essence: 1,
    matter: 1,
    substance: 0,
    elements: ['Water', 'Air'],
    dignity: { Aquarius: 1, Scorpio: 2, Taurus: -3 },
  },
  Neptune: {
    spirit: 0,
    essence: 1,
    matter: 0,
    substance: 1,
    elements: ['Water'],
    dignity: { Pisces: 1, Cancer: 2, Virgo: -1, Capricorn: -2 },
  },
  Pluto: {
    spirit: 0,
    essence: 1,
    matter: 1,
    substance: 0,
    elements: ['Earth', 'Water'],
    dignity: { Scorpio: 1, Leo: 2, Taurus: -1, Aquarius: -2 },
  },
}

const EMPTY_ALCHEMICAL_QUANTITIES: AlchemicalQuantities = {
  spirit: 0,
  essence: 0,
  matter: 0,
  substance: 0,
  Heat: 0,
  Entropy: 0,
  Reactivity: 0,
  Energy: 0,
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

export function raDecToEclipticLongitude(ra: number, dec: number): number {
  const raDegrees = Math.abs(ra) <= 24 ? ra * 15 : ra
  const rightAscension = (normalizeDegrees(raDegrees) * Math.PI) / 180
  const declination = (dec * Math.PI) / 180
  const obliquity = (23.43928 * Math.PI) / 180

  const longitude = Math.atan2(
    Math.sin(rightAscension) * Math.cos(obliquity) + Math.tan(declination) * Math.sin(obliquity),
    Math.cos(rightAscension)
  )

  return normalizeDegrees((longitude * 180) / Math.PI)
}

export function deriveLiveEphemeris(rows: readonly Ephemeris[]) {
  const elements: Record<Element, number> = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
  const totals = { spirit: 0, essence: 0, matter: 0, substance: 0 }

  const planetaryPositions = rows
    .map(row => {
      const planet = row.body.tag
      const longitude = raDecToEclipticLongitude(row.ra, row.dec)
      const signIndex = Math.floor(longitude / 30) % ZODIAC_SIGNS.length
      const sign = ZODIAC_SIGNS[signIndex]
      const profile = ALCHEMY_BY_PLANET[planet]
      const dignity = profile.dignity[sign] ?? 0
      const multiplier = 1 + Math.abs(dignity) * 0.1
      const element = ELEMENT_BY_SIGN[sign]

      totals.spirit += profile.spirit * multiplier
      totals.essence += profile.essence * multiplier
      totals.matter += profile.matter * multiplier
      totals.substance += profile.substance * multiplier
      elements[element] += 1 + (profile.elements.includes(element) ? 1 : 0)

      return {
        planet,
        sign,
        degree: longitude % 30,
        retrograde: row.retrograde,
      } satisfies PlanetaryPosition
    })
    .sort(
      (left, right) =>
        PLANET_ORDER.indexOf(left.planet as PlanetName) -
        PLANET_ORDER.indexOf(right.planet as PlanetName)
    )

  const denominator =
    totals.substance +
      totals.essence +
      totals.matter +
      elements.Water +
      elements.Air +
      elements.Earth || 1
  const earthWaterDenominator = totals.matter + elements.Earth + elements.Water || 1
  const Heat = (totals.spirit ** 2 + elements.Fire ** 2) / denominator ** 2
  const Entropy =
    (totals.spirit ** 2 + totals.substance ** 2 + elements.Fire ** 2 + elements.Air ** 2) /
    earthWaterDenominator ** 2
  const Reactivity =
    (totals.spirit ** 2 +
      totals.substance ** 2 +
      totals.essence ** 2 +
      elements.Fire ** 2 +
      elements.Air ** 2 +
      elements.Water ** 2) /
    ((totals.matter + elements.Earth) ** 2 || 1)

  const alchmQuantities: AlchemicalQuantities = {
    ...totals,
    Heat,
    Entropy,
    Reactivity,
    Energy: Heat - Reactivity * Entropy,
  }

  return {
    planetaryPositions,
    alchmQuantities,
    monicaConstant: calculateMC(
      totals.spirit,
      totals.essence,
      totals.matter,
      totals.substance,
      elements.Fire,
      elements.Water,
      elements.Air,
      elements.Earth
    ),
  }
}

export function useLiveEphemeris({ enabled = true }: UseLiveEphemerisOptions = {}) {
  const { connection, status } = useSpacetime()
  const [rows, setRows] = useState<Ephemeris[]>([])
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !connection) {
      setRows([])
      setIsReady(!enabled)
      setError(null)
      return
    }

    const table = connection.db.ephemeris
    let disposed = false
    const syncRows = () => {
      if (disposed) return
      setRows(Array.from(table.iter()))
      setIsReady(true)
      setError(null)
    }
    const onChange = () => syncRows()

    setRows(Array.from(table.iter()))
    setIsReady(false)
    table.onInsert(onChange)
    table.onUpdate(onChange)
    table.onDelete(onChange)

    const subscription = connection
      .subscriptionBuilder()
      .onApplied(syncRows)
      .onError(() => {
        if (disposed) return
        setIsReady(true)
        setError('Live ephemeris subscription failed')
      })
      .subscribe(tables.ephemeris)

    return () => {
      disposed = true
      table.removeOnInsert(onChange)
      table.removeOnUpdate(onChange)
      table.removeOnDelete(onChange)
      if (!subscription.isEnded()) subscription.unsubscribe()
    }
  }, [connection, enabled])

  const derived = useMemo(() => (rows.length > 0 ? deriveLiveEphemeris(rows) : null), [rows])
  const lastUpdated = useMemo(() => {
    if (rows.length === 0) return null
    return rows.reduce<Date | null>((latest, row) => {
      const tick = row.tick.toDate()
      return !latest || tick > latest ? tick : latest
    }, null)
  }, [rows])

  return {
    timestamp: lastUpdated?.toISOString() ?? new Date(0).toISOString(),
    planetaryPositions: derived?.planetaryPositions ?? [],
    alchmQuantities: derived?.alchmQuantities ?? EMPTY_ALCHEMICAL_QUANTITIES,
    monicaConstant: derived?.monicaConstant ?? 0,
    loading: enabled && status !== 'disabled' && !isReady,
    error,
    lastUpdated,
    status,
  }
}

export default useLiveEphemeris
