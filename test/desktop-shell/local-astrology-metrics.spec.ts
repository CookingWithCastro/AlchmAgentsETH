import { describe, expect, it } from 'vitest'
import { buildLocalAstrologyMetrics } from '../../desktop-shell/src/localAstrologyMetrics'

describe('desktop local astrology fallback metrics', () => {
  it('returns the complete finite shape consumed by the astrology renderer', () => {
    const metrics = buildLocalAstrologyMetrics(
      new Date('2026-06-11T15:30:00Z'),
      'Air',
      { Fire: 2, Water: 2, Air: 4, Earth: 2 },
      6
    )

    expect(metrics.quantities.dominantElement).toBe('Air')
    expect(metrics.quantities.elementalBalance).toEqual({
      Fire: 20,
      Water: 20,
      Air: 40,
      Earth: 20,
    })
    expect(metrics.planetaryHour).toMatchObject({
      dayRuler: 'Jupiter',
      hourNumber: 16,
      method: 'Local UTC Chaldean approximation',
    })

    for (const value of [
      metrics.quantities.Spirit,
      metrics.quantities.Essence,
      metrics.quantities.Matter,
      metrics.quantities.Substance,
      metrics.quantities.ANumber,
      metrics.quantities.heat,
      metrics.quantities.entropy,
      metrics.quantities.reactivity,
      metrics.quantities.energy,
      metrics.quantities.kineticPressure,
      metrics.quantities.harmonicFlow,
    ]) {
      expect(Number.isFinite(value)).toBe(true)
    }
  })
})
