import { describe, it, expect } from 'vitest'
import { calculateAllPlanets } from '../../lib/enhanced-astronomical-calculator'
import {
  detectPatternsStatic,
  type PlanetPosition,
} from '../../lib/astrological-pattern-recognition'
import { ChartGeometryExtractor } from '../../lib/chart-geometry-extractor'
import { createNatalSigilRune } from '../../lib/runes/natal-sigil-runes'
import { createSigilSvg, sigilSvgToDataUrl } from '../../lib/sigil-download'

describe("Philosopher's Stone — Local High-Precision & Sigils", () => {
  it('correctly calculates planetary positions using VSOP87 approximations', () => {
    const birthInfo = {
      year: 1990,
      month: 5,
      day: 15,
      hour: 12,
      minute: 30,
      second: 0,
      latitude: 40.7128,
      longitude: -74.006,
    }

    const chart = calculateAllPlanets(birthInfo)

    // Check that we have planet positions for the key bodies
    expect(chart.planets.Sun).toBeDefined()
    expect(chart.planets.Moon).toBeDefined()
    expect(chart.planets.Mercury).toBeDefined()

    // Verify reasonable coordinates range
    expect(chart.planets.Sun.longitude).toBeGreaterThanOrEqual(0)
    expect(chart.planets.Sun.longitude).toBeLessThan(360)
    expect(chart.planets.Moon.longitude).toBeGreaterThanOrEqual(0)
    expect(chart.planets.Moon.longitude).toBeLessThan(360)

    // Verify Sign mapping
    expect(typeof chart.planets.Sun.sign).toBe('string')
    expect(chart.planets.Sun.signDegree).toBeGreaterThanOrEqual(0)
    expect(chart.planets.Sun.signDegree).toBeLessThan(30)
  })

  it('detects aspects, extracts geometry, and generates a premium Runic Sigil', () => {
    // Standard coordinates and date to ensure stability
    const date = new Date('1990-05-15T12:30:00Z')
    const latitude = 40.7128
    const longitude = -74.006

    const birthInfo = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: 0,
      latitude,
      longitude,
    }

    const chart = calculateAllPlanets(birthInfo)

    const planetPositions: PlanetPosition[] = [
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
    ].map(name => {
      const p = chart.planets[name]
      return {
        planet: name,
        sign: p.sign,
        degree: p.signDegree,
        house: 1,
        date,
      }
    })

    // Detect patterns and aspects
    const { aspects, patterns } = detectPatternsStatic(planetPositions)
    expect(aspects).toBeInstanceOf(Array)
    expect(patterns).toBeInstanceOf(Array)

    // Extract geometry
    const geometry = ChartGeometryExtractor.extractFromChartData(planetPositions, aspects, 800, 800)
    expect(geometry).toBeDefined()
    expect(geometry.centerPoint).toEqual({ x: 400, y: 400 })
    expect(geometry.dominantElement).toBeDefined()
    expect(geometry.elementalBalance).toBeDefined()

    // Assign patterns
    geometry.sacredPatterns = patterns

    // Generate NatalSigilRune
    const sigil = createNatalSigilRune(geometry, 'alchemical', 'aspect-based')
    expect(sigil).toBeDefined()
    expect(sigil.id).toContain('natal-sigil-aspect-based-')
    expect(sigil.name).toBe('Alchemical Natal Sigil')
    expect(sigil.runeType).toBe('cosmic')
    expect(sigil.element).toBeDefined()
    expect(sigil.rarity).toBeDefined()
    expect(sigil.personalizedMeaning).toBeDefined()
    expect(sigil.meditationInstructions).toBeInstanceOf(Array)
    expect(sigil.activationRitual).toBeDefined()

    // Generate SVG Geometry
    const svg = createSigilSvg(sigil)
    expect(svg).toContain('<svg')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('viewBox="0 0 1024 1024"')
    expect(svg).toContain(sigil.symbol) // Symbol embedded inside the SVG

    const dataUrl = sigilSvgToDataUrl(svg)
    expect(dataUrl).toContain('data:image/svg+xml;')
  })
})
