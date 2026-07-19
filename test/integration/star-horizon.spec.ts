import { describe, it, expect } from 'vitest'
import {
  calculateStarHorizonPositions,
  STAR_CATALOG_DATA,
} from '@/lib/enhanced-astronomical-calculator'

describe('Real Astronomical Horizon & APY Calculation', () => {
  it('should define 4 bright star positions in catalog', () => {
    expect(STAR_CATALOG_DATA.length).toBe(4)
    const names = STAR_CATALOG_DATA.map(s => s.name)
    expect(names).toEqual(['Sirius', 'Arcturus', 'Vega', 'Polaris'])
  })

  it('should calculate altitude, azimuth, and APY multiplier for coordinates', () => {
    const now = new Date()
    const positions = calculateStarHorizonPositions(now, 40.7128, -74.006)
    expect(positions.length).toBe(4)

    for (const pos of positions) {
      expect(pos.name).toBeDefined()
      expect(pos.altitude).toBeGreaterThanOrEqual(-90)
      expect(pos.altitude).toBeLessThanOrEqual(90)
      expect(pos.azimuth).toBeGreaterThanOrEqual(0)
      expect(pos.azimuth).toBeLessThanOrEqual(360)
      expect(typeof pos.isRisen).toBe('boolean')
      expect(pos.multiplier).toBeGreaterThanOrEqual(1.0)
      expect(pos.effectiveApy).toBeGreaterThanOrEqual(pos.baseApy)
    }
  })

  it('should reflect polaris circumpolar horizon behavior for northern observer', () => {
    const now = new Date()
    const positions = calculateStarHorizonPositions(now, 51.5074, -0.1278) // London
    const polaris = positions.find(s => s.name === 'Polaris')
    expect(polaris).toBeDefined()
    expect(polaris?.isRisen).toBe(true)
    expect(polaris?.altitude).toBeGreaterThan(40)
  })
})
