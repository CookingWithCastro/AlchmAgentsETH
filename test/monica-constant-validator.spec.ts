import { describe, it, expect } from 'vitest'
import {
  calculatePhiAxisIndex,
  classifyPhiAxisIndex,
  batchCalculatePhiAxisIndex,
  calculatePhiAxisIndexStatistics,
  getProgressionRecommendations,
} from '../lib/monica/monica-constant-validator'

describe('Phi Axis Index Validator', () => {
  describe('calculatePhiAxisIndex', () => {
    it('computes bounded values correctly', () => {
      const mc = calculatePhiAxisIndex(5, 3, 2, 1)
      expect(mc).toBeGreaterThan(0)
      expect(mc).toBeLessThanOrEqual(20)
      expect(typeof mc).toBe('number')
      expect(isFinite(mc)).toBe(true)
    })

    it('applies golden ratio correctly', () => {
      // PAI = (Spirit × φ + Essence) / (Matter + Substance + 1)
      // φ = 1.618033988749895
      const spirit = 4,
        essence = 2,
        matter = 1,
        substance = 1
      const expectedNumerator = spirit * 1.618033988749895 + essence // ≈ 8.472
      const expectedDenominator = matter + substance + 1 // = 3
      const expectedMC = expectedNumerator / expectedDenominator // ≈ 2.824

      const mc = calculatePhiAxisIndex(spirit, essence, matter, substance)
      expect(mc).toBeCloseTo(expectedMC, 2)
    })

    it('prevents division by zero with +1 denominator', () => {
      const mc = calculatePhiAxisIndex(5, 3, 0, 0) // Matter + Substance = 0, but +1 prevents division by zero
      expect(mc).toBeGreaterThan(0)
      expect(isFinite(mc)).toBe(true)
    })

    it('applies elemental bonuses correctly', () => {
      const baseMC = calculatePhiAxisIndex(5, 3, 2, 1)
      const mcWithElementals = calculatePhiAxisIndex(5, 3, 2, 1, 1, 0.5, 0.3, 0.2) // Fire, Water, Air, Earth

      // Elemental bonuses should increase the index
      expect(mcWithElementals).toBeGreaterThan(baseMC)

      // Elemental bonus is added to numerator, so impact on the index is elementalBonus / denominator
      const expectedNumeratorBonus = (1 + 0.5 + 0.3 + 0.2) * 0.1
      const expectedMCBonus = expectedNumeratorBonus / 4 // Denominator is 2 + 1 + 1 = 4
      expect(mcWithElementals - baseMC).toBeCloseTo(expectedMCBonus, 2)
    })

    it('handles invalid inputs gracefully', () => {
      // NaN inputs
      const nanMC = calculatePhiAxisIndex(NaN, 3, 2, 1)
      expect(isFinite(nanMC)).toBe(true)
      expect(nanMC).toBeGreaterThanOrEqual(0)

      // Infinity inputs
      const infMC = calculatePhiAxisIndex(Infinity, 3, 2, 1)
      expect(isFinite(infMC)).toBe(true)
      expect(infMC).toBeLessThanOrEqual(20)

      // Negative inputs (should be clamped to 0)
      const negMC = calculatePhiAxisIndex(-5, -3, -2, -1)
      expect(negMC).toBeGreaterThanOrEqual(0)

      // Extreme large inputs (should be clamped to 100)
      const largeMC = calculatePhiAxisIndex(1000, 1000, 1000, 1000)
      expect(largeMC).toBeLessThanOrEqual(20)
    })

    it('returns consistent results for same inputs', () => {
      const mc1 = calculatePhiAxisIndex(5, 3, 2, 1)
      const mc2 = calculatePhiAxisIndex(5, 3, 2, 1)
      expect(mc1).toBe(mc2)
    })

    it('handles edge case values', () => {
      // All zeros
      const zeroMC = calculatePhiAxisIndex(0, 0, 0, 0)
      expect(zeroMC).toBeGreaterThanOrEqual(0)
      expect(isFinite(zeroMC)).toBe(true)

      // Max values
      const maxMC = calculatePhiAxisIndex(100, 100, 100, 100)
      expect(maxMC).toBeLessThanOrEqual(20)
      expect(isFinite(maxMC)).toBe(true)
    })
  })

  describe('classifyPhiAxisIndex', () => {
    it('classifies consciousness levels correctly', () => {
      // Test each level threshold
      const dormant = classifyPhiAxisIndex(0.1)
      expect(dormant.name).toBe('Dormant')
      expect(dormant.level).toBe(1)

      const awakening = classifyPhiAxisIndex(0.8)
      expect(awakening.name).toBe('Awakening')
      expect(awakening.level).toBe(2)

      const active = classifyPhiAxisIndex(1.2)
      expect(active.name).toBe('Active')
      expect(active.level).toBe(3)

      const elevated = classifyPhiAxisIndex(2.0)
      expect(elevated.name).toBe('Elevated')
      expect(elevated.level).toBe(4)

      const advanced = classifyPhiAxisIndex(3.5)
      expect(advanced.name).toBe('Advanced')
      expect(advanced.level).toBe(5)

      const illuminated = classifyPhiAxisIndex(5.0)
      expect(illuminated.name).toBe('Illuminated')
      expect(illuminated.level).toBe(6)

      const transcendent = classifyPhiAxisIndex(7.5)
      expect(transcendent.name).toBe('Transcendent')
      expect(transcendent.level).toBe(7)
    })

    it('handles boundary values correctly', () => {
      // Test exact threshold values
      const exactElevated = classifyPhiAxisIndex(1.618) // Golden ratio threshold
      expect(exactElevated.name).toBe('Elevated')

      const justBelowElevated = classifyPhiAxisIndex(1.617)
      expect(justBelowElevated.name).toBe('Active')

      const exactTranscendent = classifyPhiAxisIndex(6.854)
      expect(exactTranscendent.name).toBe('Transcendent')
    })

    it('provides meaningful descriptions', () => {
      const classification = classifyPhiAxisIndex(2.5)
      expect(classification.description).toBeDefined()
      expect(typeof classification.description).toBe('string')
      expect(classification.description.length).toBeGreaterThan(10)
    })

    it('handles invalid inputs', () => {
      const invalidClassification = classifyPhiAxisIndex(NaN)
      expect(invalidClassification.name).toBe('Dormant') // Should fallback
      expect(invalidClassification.level).toBe(1)

      const negativeClassification = classifyPhiAxisIndex(-5)
      expect(negativeClassification.name).toBe('Dormant')
    })
  })

  describe('batchCalculatePhiAxisIndex', () => {
    it('processes multiple inputs correctly', () => {
      const inputs = [
        { spirit: 5, essence: 3, matter: 2, substance: 1 },
        { spirit: 8, essence: 2, matter: 1, substance: 1 },
        { spirit: 2, essence: 6, matter: 4, substance: 3 },
      ]

      const results = batchCalculatePhiAxisIndex(inputs)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.input).toEqual(inputs[index])
        expect(result.index).toBeGreaterThan(0)
        expect(result.classification.name).toBeDefined()
        expect(result.classification.level).toBeGreaterThanOrEqual(1)
        expect(result.classification.level).toBeLessThanOrEqual(7)
      })
    })

    it('handles empty input array', () => {
      const results = batchCalculatePhiAxisIndex([])
      expect(results).toHaveLength(0)
    })

    it('processes inputs with elemental data', () => {
      const inputs = [{ spirit: 5, essence: 3, matter: 2, substance: 1, fire: 1, water: 0.5 }]

      const results = batchCalculatePhiAxisIndex(inputs)
      expect(results).toHaveLength(1)
      expect(results[0].index).toBeGreaterThan(0)
    })
  })

  describe('calculatePhiAxisIndexStatistics', () => {
    it('calculates statistics correctly', () => {
      const values = [1.5, 2.0, 2.5, 3.0, 3.5]
      const stats = calculatePhiAxisIndexStatistics(values)

      expect(stats.count).toBe(5)
      expect(stats.average).toBeCloseTo(2.5, 3)
      expect(stats.min).toBe(1.5)
      expect(stats.max).toBe(3.5)
      expect(stats.median).toBe(2.5)
      expect(stats.stdDev).toBeGreaterThan(0)
    })

    it('handles empty array', () => {
      const stats = calculatePhiAxisIndexStatistics([])
      expect(stats.count).toBe(0)
      expect(stats.average).toBe(0)
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(0)
      expect(stats.median).toBe(0)
      expect(stats.stdDev).toBe(0)
    })

    it('handles single value', () => {
      const stats = calculatePhiAxisIndexStatistics([2.5])
      expect(stats.count).toBe(1)
      expect(stats.average).toBe(2.5)
      expect(stats.min).toBe(2.5)
      expect(stats.max).toBe(2.5)
      expect(stats.median).toBe(2.5)
      expect(stats.stdDev).toBe(0)
    })

    it('handles invalid values in array', () => {
      const values = [1.5, NaN, 2.5, Infinity, 3.0]
      const stats = calculatePhiAxisIndexStatistics(values)

      // Should filter out invalid values
      expect(stats.count).toBe(3) // Only valid values counted
      expect(stats.average).toBeCloseTo(2.333, 3)
    })
  })

  describe('getProgressionRecommendations', () => {
    it('provides appropriate recommendations for each level', () => {
      const dormantRecs = getProgressionRecommendations(0.3)
      expect(dormantRecs.some(rec => /spiritual practices/i.test(rec))).toBe(true)

      const activeRecs = getProgressionRecommendations(1.5)
      expect(Array.isArray(activeRecs)).toBe(true)
      expect(activeRecs.length).toBeGreaterThan(0)

      const transcendentRecs = getProgressionRecommendations(7.5)
      expect(transcendentRecs.some(rec => /consciousness|service|universal/i.test(rec))).toBe(true)
    })

    it('provides different recommendations for different levels', () => {
      const dormantRecs = getProgressionRecommendations(0.3)
      const transcendentRecs = getProgressionRecommendations(7.5)

      expect(dormantRecs).not.toEqual(transcendentRecs)
    })

    it('returns array of strings', () => {
      const recs = getProgressionRecommendations(2.5)
      expect(Array.isArray(recs)).toBe(true)
      recs.forEach(rec => {
        expect(typeof rec).toBe('string')
        expect(rec.length).toBeGreaterThan(5)
      })
    })
  })

  describe('Integration with Golden Ratio', () => {
    it('uses mathematical phi constant correctly', () => {
      const phi = 1.618033988749895

      // Test that our calculation matches expected mathematical result
      const spirit = 1,
        essence = 0,
        matter = 1,
        substance = 0
      const mc = calculatePhiAxisIndex(spirit, essence, matter, substance)
      const expectedMC = (spirit * phi + essence) / (matter + substance + 1)

      expect(mc).toBeCloseTo(expectedMC, 3)
    })

    it('demonstrates golden ratio scaling', () => {
      // Higher spirit values should scale with phi
      const lowSpirit = calculatePhiAxisIndex(1, 0, 1, 1)
      const highSpirit = calculatePhiAxisIndex(2, 0, 1, 1)

      const spiritDifference = highSpirit - lowSpirit
      const expectedDifference = 1.618033988749895 / 3 // phi/denominator

      expect(spiritDifference).toBeCloseTo(expectedDifference, 2)
    })
  })

  describe('Boundary and Edge Cases', () => {
    it('maintains precision with 3 decimal places', () => {
      const mc = calculatePhiAxisIndex(1.23456789, 2.3456789, 3.456789, 4.56789)

      // Should be rounded to 3 decimal places
      const decimals = (mc.toString().split('.')[1] || '').length
      expect(decimals).toBeLessThanOrEqual(3)
    })

    it('handles extreme consciousness states', () => {
      // Ultra-high spirit, low matter (transcendent state)
      const transcendentMC = calculatePhiAxisIndex(100, 50, 1, 1)
      const classification = classifyPhiAxisIndex(transcendentMC)

      // Should reach high consciousness levels
      expect(classification.level).toBeGreaterThanOrEqual(6)

      // Ultra-high matter, low spirit (dormant state)
      const dormantMC = calculatePhiAxisIndex(1, 1, 100, 100)
      const dormantClassification = classifyPhiAxisIndex(dormantMC)

      expect(dormantClassification.level).toBeLessThanOrEqual(3)
    })
  })
})
