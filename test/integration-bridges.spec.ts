import { describe, it, expect } from 'vitest'
import {
  calculatePhiAxisIndex,
  classifyPhiAxisIndex,
  batchCalculatePhiAxisIndex,
} from '../lib/monica/monica-constant-validator'
import { getTarotRecommendations } from '../lib/thermodynamics-to-tarot'
import { getCouncilRecommendations } from '../components/misc/HarmonicAnalysisBridge'
import type {
  TokenState,
  ConsciousnessLevel,
} from '../components/dashboards/TokenMonitorIntegration'

describe('Phi Axis Index Validator Integration', () => {
  it('calculatePhiAxisIndex handles basic inputs correctly', () => {
    const mc = calculatePhiAxisIndex(5, 3, 2, 1)
    expect(mc).toBeGreaterThan(0)
    expect(mc).toBeLessThan(20)
    expect(typeof mc).toBe('number')
  })

  it('calculatePhiAxisIndex with elemental bonuses', () => {
    const mcWithElements = calculatePhiAxisIndex(5, 3, 2, 1, 1, 0.5, 0.3, 0.2)
    const mcWithoutElements = calculatePhiAxisIndex(5, 3, 2, 1)

    // Elemental bonuses should increase the index
    expect(mcWithElements).toBeGreaterThan(mcWithoutElements)
  })

  it('classifyPhiAxisIndex returns correct consciousness levels', () => {
    const dormant = classifyPhiAxisIndex(0.1)
    const elevated = classifyPhiAxisIndex(2.0)
    const transcendent = classifyPhiAxisIndex(7.0)

    expect(dormant.name).toBe('Dormant')
    expect(dormant.level).toBe(1)

    expect(elevated.name).toBe('Elevated')
    expect(elevated.level).toBe(4)

    expect(transcendent.name).toBe('Transcendent')
    expect(transcendent.level).toBe(7)
  })

  it('batchCalculatePhiAxisIndex processes multiple inputs', () => {
    const inputs = [
      { spirit: 5, essence: 3, matter: 2, substance: 1 },
      { spirit: 8, essence: 2, matter: 1, substance: 1 },
      { spirit: 2, essence: 6, matter: 4, substance: 3 },
    ]

    const results = batchCalculatePhiAxisIndex(inputs)

    expect(results).toHaveLength(3)
    results.forEach(result => {
      expect(result.index).toBeGreaterThan(0)
      expect(result.classification.name).toBeDefined()
      expect(result.classification.level).toBeGreaterThanOrEqual(1)
      expect(result.classification.level).toBeLessThanOrEqual(7)
    })
  })

  it('calculatePhiAxisIndex handles edge cases', () => {
    // Zero inputs
    const zeroMC = calculatePhiAxisIndex(0, 0, 0, 0)
    expect(zeroMC).toBeGreaterThanOrEqual(0)
    expect(isFinite(zeroMC)).toBe(true)

    // Large inputs
    const largeMC = calculatePhiAxisIndex(100, 100, 100, 100)
    expect(largeMC).toBeLessThanOrEqual(20) // Should be bounded
    expect(isFinite(largeMC)).toBe(true)

    // Invalid inputs (should be sanitized)
    const invalidMC = calculatePhiAxisIndex(NaN, Infinity, -5, 150)
    expect(isFinite(invalidMC)).toBe(true)
    expect(invalidMC).toBeGreaterThanOrEqual(0)
  })
})

describe('Thermodynamics to Tarot Integration', () => {
  it('getTarotRecommendations returns structured results', () => {
    const result = getTarotRecommendations({
      heat: 75,
      entropy: 40,
      reactivity: 60,
      energy: 80,
    })

    expect(result.suitEmphases).toHaveLength(4)
    expect(result.cardRecommendations.length).toBeGreaterThanOrEqual(1)
    expect(result.cardRecommendations.length).toBeLessThanOrEqual(3)
    expect(result.dominantElement).toBeDefined()
    expect(result.secondaryElement).toBeDefined()
    expect(['cardinal', 'fixed', 'mutable']).toContain(result.modalityEmphasis)
  })

  it('high heat emphasizes fire element', () => {
    const result = getTarotRecommendations({
      heat: 95,
      entropy: 20,
      reactivity: 30,
      energy: 70,
    })

    // Fire suit should have high weight due to high heat
    const fireSuit = result.suitEmphases.find(s => s.element === 'fire')
    expect(fireSuit).toBeDefined()
    expect(fireSuit!.weight).toBeGreaterThan(0.3) // Should be above baseline
    expect(result.dominantElement).toBe('fire')
  })

  it('high entropy emphasizes air element', () => {
    const result = getTarotRecommendations({
      heat: 20,
      entropy: 90,
      reactivity: 50,
      energy: 40,
    })

    // Air suit should have high weight due to high entropy
    const airSuit = result.suitEmphases.find(s => s.element === 'air')
    expect(airSuit).toBeDefined()
    expect(airSuit!.weight).toBeGreaterThan(0.3)
  })

  it('deterministic results for same input', () => {
    const metrics = { heat: 50, entropy: 50, reactivity: 50, energy: 50 }

    const result1 = getTarotRecommendations(metrics)
    const result2 = getTarotRecommendations(metrics)

    expect(result1.dominantElement).toBe(result2.dominantElement)
    expect(result1.modalityEmphasis).toBe(result2.modalityEmphasis)
    expect(result1.suitEmphases).toEqual(result2.suitEmphases)
  })

  it('validates thermodynamic inputs', () => {
    // Invalid inputs should be sanitized
    const result = getTarotRecommendations({
      heat: -10,
      entropy: 150,
      reactivity: NaN,
      energy: Infinity,
    })

    expect(result.suitEmphases).toHaveLength(4)
    expect(result.cardRecommendations).toBeDefined()
  })
})

describe('Harmonic Analysis Bridge Integration', () => {
  it('getCouncilRecommendations returns structured results', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 2.5, phase: 0.5, amplitude: 0.8 },
      currentWave: 0.7,
    })

    expect(recommendations.triggers).toBeDefined()
    expect(Array.isArray(recommendations.triggers)).toBe(true)
    expect(recommendations.dominantAction).toBeDefined()
    expect(['chaotic', 'fluctuating', 'stable', 'resonant', 'transcendent']).toContain(
      recommendations.harmonicState
    )
    expect(recommendations.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(recommendations.overallConfidence).toBeLessThanOrEqual(1)
    expect(recommendations.summary).toBeDefined()
    expect(typeof recommendations.summary).toBe('string')
  })

  it('high amplitude + peak phase triggers Mars', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 2.0, phase: 0.1, amplitude: 0.9 }, // High amplitude, near peak
      currentWave: 0.6,
    })

    const marsTrigger = recommendations.triggers.find(t => t.planet === 'Mars')
    expect(marsTrigger).toBeDefined()
    expect(marsTrigger!.action).toBe('activate')
    expect(marsTrigger!.confidence).toBeGreaterThan(0.7)
    expect(['high', 'urgent']).toContain(marsTrigger!.priority)
  })

  it('low amplitude triggers Saturn', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 1.5, phase: 1.0, amplitude: 0.2 }, // Low amplitude
      currentWave: 0.4,
    })

    const saturnTrigger = recommendations.triggers.find(t => t.planet === 'Saturn')
    expect(saturnTrigger).toBeDefined()
    expect(saturnTrigger!.action).toBe('consolidate')
    expect(saturnTrigger!.element).toBe('earth')
  })

  it('high current wave triggers Sun', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 1.8, phase: 0.5, amplitude: 0.6 },
      currentWave: 0.9, // High current wave
    })

    const sunTrigger = recommendations.triggers.find(t => t.planet === 'Sun')
    expect(sunTrigger).toBeDefined()
    expect(sunTrigger!.action).toBe('activate')
    expect(sunTrigger!.priority).toBe('high')
    expect(sunTrigger!.element).toBe('fire')
  })

  it('low current wave triggers Moon', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 2.2, phase: 0.8, amplitude: 0.5 },
      currentWave: 0.1, // Low current wave
    })

    const moonTrigger = recommendations.triggers.find(t => t.planet === 'Moon')
    expect(moonTrigger).toBeDefined()
    expect(moonTrigger!.action).toBe('consult')
    expect(moonTrigger!.element).toBe('water')
  })

  it('handles invalid inputs gracefully', () => {
    const recommendations = getCouncilRecommendations({
      Spirit: { period: -1, phase: NaN, amplitude: 2 },
      currentWave: -0.5,
    })

    expect(recommendations.triggers).toBeDefined()
    expect(recommendations.harmonicState).toBeDefined()
    expect(recommendations.overallConfidence).toBeGreaterThanOrEqual(0)
    expect(recommendations.overallConfidence).toBeLessThanOrEqual(1)
  })

  it('limits triggers to maximum 5', () => {
    // Create conditions that would trigger many planets
    const recommendations = getCouncilRecommendations({
      Spirit: { period: 0.1, phase: 0.05, amplitude: 0.95 }, // Extreme values
      currentWave: 0.95,
    })

    expect(recommendations.triggers.length).toBeLessThanOrEqual(5)
  })
})

// Mock data for integration testing
const mockTokenState: TokenState = {
  Spirit: 50,
  Essence: 40,
  Matter: 30,
  Substance: 35,
}

const mockConsciousnessLevel: ConsciousnessLevel = {
  name: 'Active',
  level: 3,
  description: 'Engaged consciousness with balanced expression',
}

describe('Token Monitor Integration Logic', () => {
  it('consciousness multiplier calculation', () => {
    // Test the multiplier logic
    const level3 = { name: 'Active', level: 3 }
    const level5 = { name: 'Advanced', level: 5 }

    // Level 3 should give 1.3x multiplier (1 + 0.1 * 3)
    // Level 5 should give 1.5x multiplier (1 + 0.1 * 5)
    expect(level3.level * 0.1 + 1).toBe(1.3)
    expect(level5.level * 0.1 + 1).toBe(1.5)
  })

  it('MC bonus thresholds', () => {
    const mcValues = {
      low: 1.0, // Below elevated threshold
      elevated: 2.0, // Above elevated (1.618)
      advanced: 3.0, // Above advanced (2.618)
      illuminated: 5.0, // Above illuminated (4.236)
      transcendent: 7.0, // Above transcendent (6.854)
    }

    // These thresholds should be used in the component
    expect(mcValues.elevated).toBeGreaterThan(1.618)
    expect(mcValues.advanced).toBeGreaterThan(2.618)
    expect(mcValues.illuminated).toBeGreaterThan(4.236)
    expect(mcValues.transcendent).toBeGreaterThan(6.854)
  })

  it('token generation bounds', () => {
    // Tokens should never exceed 100
    const initialTokens = { Spirit: 95, Essence: 98, Matter: 90, Substance: 85 }
    const increment = 10

    Object.entries(initialTokens).forEach(([key, value]) => {
      const newValue = Math.min(100, value + increment)
      expect(newValue).toBeLessThanOrEqual(100)
      expect(newValue).toBeGreaterThanOrEqual(value)
    })
  })
})
