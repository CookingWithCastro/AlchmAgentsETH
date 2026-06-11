import { describe, expect, it } from 'vitest'
import { Timestamp } from 'spacetimedb'
import {
  deriveLiveEphemeris,
  raDecToEclipticLongitude,
} from '@/lib/spacetime/hooks/useLiveEphemeris'
import { Planet, type Ephemeris } from '@/lib/spacetime/generated/types'

describe('live SpacetimeDB ephemeris', () => {
  it('accepts right ascension in hours or degrees', () => {
    expect(raDecToEclipticLongitude(6, 0)).toBeCloseTo(raDecToEclipticLongitude(90, 0), 8)
  })

  it('derives planetary positions, alchemical quantities, and Monica Constant', () => {
    const tick = Timestamp.fromDate(new Date('2026-06-11T12:00:00Z'))
    const rows: Ephemeris[] = [
      {
        body: Planet.Sun,
        ra: 0,
        dec: 0,
        transitingZone: 0,
        tick,
        retrograde: false,
      },
      {
        body: Planet.Moon,
        ra: 6,
        dec: 0,
        transitingZone: 1,
        tick,
        retrograde: false,
      },
    ]

    const result = deriveLiveEphemeris(rows)

    expect(result.planetaryPositions).toEqual([
      expect.objectContaining({ planet: 'Sun', sign: 'Aries' }),
      expect.objectContaining({ planet: 'Moon', sign: 'Cancer' }),
    ])
    expect(result.alchmQuantities.spirit).toBeGreaterThan(0)
    expect(result.alchmQuantities.essence).toBeGreaterThan(0)
    expect(result.alchmQuantities.matter).toBeGreaterThan(0)
    expect(result.monicaConstant).toBeGreaterThan(0)
  })
})
