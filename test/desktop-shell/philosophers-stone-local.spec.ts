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
  // RENAMED. This test was called "correctly calculates planetary positions using
  // VSOP87 approximations" while asserting only that longitude is in [0, 360) and
  // signDegree in [0, 30). Those hold for literally any number the engine can
  // produce, so it passed for the entire period the engine was returning Mercury
  // opposite the Sun. Correctness lives in
  // test/astronomy/chart-engine-physical-bounds.spec.ts; this one checks the
  // shape of the returned chart and nothing more.
  it('returns a well-formed chart: every body present, in range, and provenance-stamped', () => {
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

    // Nothing was withheld for this date, so every body should be present.
    expect(chart.unavailable).toEqual([])
    for (const body of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
      const p = chart.planets[body]
      expect(p, `${body} missing from chart`).toBeDefined()
      expect(p.longitude).toBeGreaterThanOrEqual(0)
      expect(p.longitude).toBeLessThan(360)
      expect(typeof p.sign).toBe('string')
      expect(p.signDegree).toBeGreaterThanOrEqual(0)
      expect(p.signDegree).toBeLessThan(30)
      // Provenance is required and must never claim to be a measurement.
      expect(p.source).toBe('vsop87-approximation')
    }

    expect(chart.source).toBe('vsop87-approximation')
    expect(chart.ascendant.source).toBe('vsop87-approximation')
    expect(chart.withinElementSetRange).toBe(true)
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
