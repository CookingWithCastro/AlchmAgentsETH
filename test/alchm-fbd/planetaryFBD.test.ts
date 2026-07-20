/**
 * Tests for planetaryFBD — the free-body-diagram builder.
 *
 * The builder no longer accepts a caller-supplied `perPlanet` stub: it derives
 * every ESMS number from the engine's own three-layer decomposition
 * (calculateEnhancedAlchemicalFromPlanetsDetailed). That makes the cards a
 * DECOMPOSITION of the sky rather than a lookalike recomputation, so the
 * headline test here is the reconciliation invariant:
 *
 *   Σ cards[].esms + totals.groundingVessel.esms === totals.esms
 *
 * The remaining suites use small hand-computable synthetic skies where the
 * expected geometry is obvious by inspection.
 */
import {
  ASPECT_GLYPHS,
  ASPECT_MAX_ORBS,
  ELEMENT_ANGLES,
  buildFreeBodyDiagrams,
  formatDegMin,
  normalizeAngle,
  signedDeltaDeg,
  type BuildFBDInput,
  type FBDPositionInput,
  type PlanetFBD,
} from '@/lib/alchm-fbd/planetaryFBD'
import { getAspectESMSEffect } from '@/lib/alchm-fbd/aspectESMSEffects'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Axis = 'Spirit' | 'Essence' | 'Matter' | 'Substance'
const AXES: Axis[] = ['Spirit', 'Essence', 'Matter', 'Substance']

/** Reconciliation tolerance — the invariant is exact up to float accumulation. */
const EPSILON = 1e-9

function byPlanet(cards: PlanetFBD[], planet: string): PlanetFBD {
  const card = cards.find(c => c.planet === planet)
  if (!card) throw new Error(`no card for ${planet}`)
  return card
}

function sumCardEsms(cards: PlanetFBD[]): Record<Axis, number> {
  return cards.reduce<Record<Axis, number>>(
    (acc, card) => {
      for (const axis of AXES) acc[axis] += card.esms[axis]
      return acc
    },
    { Spirit: 0, Essence: 0, Matter: 0, Substance: 0 }
  )
}

/**
 * A full ten-planet sky with self-consistent sign/longitude pairs, producing 19
 * aspects. No Ascendant is supplied, so the engine injects the grounding
 * vessel — exactly the "live sky" path that has no computed rising sign.
 *
 * The longitudes are deliberately off round numbers so that no pair lands
 * EXACTLY on an aspect's maximum orb. A max-orb pair has cosine-bell strength
 * exactly 0, and calculateAspectESMSModifications' `aspect.strength || 1.0`
 * then reads that 0 as "no strength supplied" and applies the effect at FULL
 * weight — so the engine's Layer-3 total would disagree with the per-aspect
 * deltas the cards split. That is an upstream quirk in aspectESMSEffects, not
 * an FBD behaviour, so this fixture stays clear of the degenerate case.
 */
const RICH_SKY_POSITIONS: Record<string, FBDPositionInput> = {
  Sun: { sign: 'leo', degree: 15.4, exactLongitude: 135.4, longitudeSpeed: 0.98 },
  Moon: { sign: 'cancer', degree: 2.3, exactLongitude: 92.3, longitudeSpeed: 13.2 },
  Mercury: { sign: 'virgo', degree: 1.7, exactLongitude: 151.7, longitudeSpeed: 1.4 },
  Venus: { sign: 'virgo', degree: 20.9, exactLongitude: 170.9, longitudeSpeed: 1.1 },
  Mars: { sign: 'cancer', degree: 10.2, exactLongitude: 100.2, longitudeSpeed: 0.52 },
  Jupiter: { sign: 'aries', degree: 0.6, exactLongitude: 0.6, longitudeSpeed: 0.13 },
  Saturn: { sign: 'pisces', degree: 7.8, exactLongitude: 337.8, longitudeSpeed: 0.03 },
  Uranus: { sign: 'taurus', degree: 11.5, exactLongitude: 41.5, longitudeSpeed: 0.04 },
  Neptune: { sign: 'pisces', degree: 24.6, exactLongitude: 354.6, longitudeSpeed: -0.01 },
  Pluto: { sign: 'aquarius', degree: 0.9, exactLongitude: 300.9, longitudeSpeed: -0.02 },
}

// ---------------------------------------------------------------------------
// THE KEY INVARIANT — the cards must decompose the sky, not approximate it
// ---------------------------------------------------------------------------

describe('buildFreeBodyDiagrams — reconciliation invariant', () => {
  for (const diurnal of [true, false]) {
    describe(`${diurnal ? 'day' : 'night'} chart`, () => {
      const { cards, totals } = buildFreeBodyDiagrams({
        positions: RICH_SKY_POSITIONS,
        diurnal,
      })

      test('every one of the ten planets gets a card', () => {
        expect(cards).toHaveLength(10)
      })

      test('Σ cards[].esms + groundingVessel.esms === totals.esms on all four axes', () => {
        const vessel = totals.groundingVessel
        expect(vessel).not.toBeNull()
        const summed = sumCardEsms(cards)

        for (const axis of AXES) {
          const reconciled = summed[axis] + (vessel?.esms[axis] ?? 0)
          expect(Math.abs(reconciled - totals.esms[axis])).toBeLessThan(EPSILON)
        }
      })

      test('the grounding vessel is injected when no Ascendant is supplied', () => {
        expect(totals.groundingVessel?.injected).toBe(true)
        // Physical Vessel = flat (+1) to all four, weight 1.0, dignity Neutral.
        for (const axis of AXES) {
          expect(totals.groundingVessel?.esms[axis]).toBeCloseTo(1, 9)
        }
      })

      test('the aspect layer is already inside totals.esms, not added on top', () => {
        for (const axis of AXES) {
          expect(Number.isFinite(totals.aspectModifications[axis])).toBe(true)
        }
        // Σ cards already carries the FULL aspect layer: each pair effect is
        // split in half across two cards, so the halves re-add to the whole.
        const summed = sumCardEsms(cards)
        const vessel = totals.groundingVessel
        for (const axis of AXES) {
          const planetBaseLayer = summed[axis] - totals.aspectModifications[axis]
          const engineBaseLayer =
            totals.esms[axis] - totals.aspectModifications[axis] - (vessel?.esms[axis] ?? 0)
          expect(planetBaseLayer).toBeCloseTo(engineBaseLayer, 9)
        }
      })
    })
  }

  test('in a DAY chart Matter/Substance come entirely from the grounding vessel', () => {
    // Every planet maps to Spirit/Essence in the diurnal sect, so the planets'
    // base Matter/Substance is 0 and the whole material floor is the vessel.
    // A regression that drops the vessel makes the cards claim Q = 0 for the
    // entire sky — which is why this is asserted separately from the sum.
    const { cards, totals } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
    })
    const summed = sumCardEsms(cards)

    for (const axis of ['Matter', 'Substance'] as Axis[]) {
      // Whatever Matter/Substance the cards carry is purely the aspect layer.
      expect(summed[axis]).toBeCloseTo(totals.aspectModifications[axis], 9)
      // …and the vessel supplies a real, non-zero material floor.
      expect(totals.groundingVessel?.esms[axis]).toBeGreaterThan(0)
    }
  })

  test('in a NIGHT chart the planets themselves carry Matter', () => {
    const { cards, totals } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: false,
    })
    const summed = sumCardEsms(cards)
    expect(summed.Matter - totals.aspectModifications.Matter).toBeGreaterThan(0)
  })

  test('a SUPPLIED Ascendant is still card-less, still reconciles, and is not flagged injected', () => {
    // 18° virgo aspects neither body, so the only aspect is the Mars–Venus
    // trine and the vessel's contribution is purely Layer 1×2.
    const { cards, totals } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100 },
        Venus: { sign: 'scorpio', degree: 10, exactLongitude: 220 },
        Ascendant: { sign: 'virgo', degree: 18, exactLongitude: 168 },
      },
      diurnal: true,
    })

    expect(cards.map(c => c.planet)).toEqual(['Venus', 'Mars'])
    expect(cards.find(c => c.planet === 'Ascendant')).toBeUndefined()
    // Supplied rather than injected this time.
    expect(totals.groundingVessel?.injected).toBe(false)

    const summed = sumCardEsms(cards)
    for (const axis of AXES) {
      const reconciled = summed[axis] + (totals.groundingVessel?.esms[axis] ?? 0)
      expect(Math.abs(reconciled - totals.esms[axis])).toBeLessThan(EPSILON)
    }
  })
})

// ---------------------------------------------------------------------------
// signedDeltaDeg / normalizeAngle / formatDegMin
// ---------------------------------------------------------------------------

describe('signedDeltaDeg', () => {
  test('wraps forward across 0° Aries: 350° → 10° is +20', () => {
    expect(signedDeltaDeg(350, 10)).toBeCloseTo(20, 9)
  })

  test('wraps backward across 0° Aries: 10° → 350° is −20', () => {
    expect(signedDeltaDeg(10, 350)).toBeCloseTo(-20, 9)
  })

  test('±180° boundary lands in (−180, 180]', () => {
    expect(signedDeltaDeg(0, 180)).toBeCloseTo(180, 9)
    expect(signedDeltaDeg(180, 0)).toBeCloseTo(180, 9) // −180 excluded → +180
    expect(signedDeltaDeg(90, 270)).toBeCloseTo(180, 9)
    expect(signedDeltaDeg(270, 90)).toBeCloseTo(180, 9)
  })

  test('plain offsets stay signed', () => {
    expect(signedDeltaDeg(100, 220)).toBeCloseTo(120, 9)
    expect(signedDeltaDeg(220, 100)).toBeCloseTo(-120, 9)
    expect(signedDeltaDeg(45, 45)).toBeCloseTo(0, 9)
  })
})

describe('normalizeAngle', () => {
  test('maps into [0, 360)', () => {
    expect(normalizeAngle(-120)).toBeCloseTo(240, 9)
    expect(normalizeAngle(370)).toBeCloseTo(10, 9)
    expect(normalizeAngle(360)).toBeCloseTo(0, 9)
    expect(normalizeAngle(450)).toBeCloseTo(90, 9)
    expect(normalizeAngle(-360)).toBeCloseTo(0, 9)
  })
})

describe('formatDegMin', () => {
  test('zero-pads arc-minutes', () => {
    expect(formatDegMin(18, 42)).toBe('18°42′')
    expect(formatDegMin(3, 5)).toBe('3°05′')
    expect(formatDegMin(0, 0)).toBe('0°00′')
  })

  test('floors fractional inputs rather than rounding into 60', () => {
    expect(formatDegMin(12.9, 59.9)).toBe('12°59′')
  })
})

// ---------------------------------------------------------------------------
// Aspect vectors — exact trine (harmonious) and exact square (challenging)
// ---------------------------------------------------------------------------

const TRINE_SKY: BuildFBDInput = {
  // Mars 10° cancer (fall) and Venus 10° scorpio (detriment) — exactly 120°.
  positions: {
    Mars: { sign: 'cancer', degree: 10, exactLongitude: 100, longitudeSpeed: 0.5 },
    Venus: { sign: 'scorpio', degree: 10, exactLongitude: 220, longitudeSpeed: 1.2 },
  },
  diurnal: true,
}

describe('aspect vectors (exact trine)', () => {
  const { cards } = buildFreeBodyDiagrams(TRINE_SKY)

  test('the only aspect in a two-body sky 120° apart is one exact trine', () => {
    const mars = byPlanet(cards, 'Mars')
    const aspectVectors = mars.vectors.filter(v => v.kind === 'aspect')
    expect(aspectVectors).toHaveLength(1)
    expect(aspectVectors[0].source).toBe('Venus')
    expect(aspectVectors[0].aspect?.type).toBe('trine')
  })

  test('bearing, magnitude and polarity of an exact trine', () => {
    const mars = byPlanet(cards, 'Mars')
    const trine = mars.vectors.find(v => v.kind === 'aspect')

    expect(trine?.aspect?.orb).toBeCloseTo(0, 9)
    expect(trine?.aspect?.strength).toBeCloseTo(1, 9)
    // Trine's engine orb budget is 8 → baseWeight 8/8 = 1.
    expect(trine?.aspect?.baseWeight).toBeCloseTo(1, 9)
    // angleDeg is the NORMALIZED signed ecliptic offset to the other body.
    expect(trine?.aspect?.offsetDeg).toBeCloseTo(120, 9)
    expect(trine?.angleDeg).toBeCloseTo(normalizeAngle(signedDeltaDeg(100, 220)), 9)
    // magnitude = strength × baseWeight = 1 × (8/8) = 1 at exact orb.
    expect(trine?.magnitude).toBeCloseTo(1, 9)
    expect(trine?.polarity).toBe('harmonious')
  })

  test('the partner card sees the mirrored bearing (240°)', () => {
    const venus = byPlanet(cards, 'Venus')
    const trine = venus.vectors.find(v => v.kind === 'aspect')
    expect(trine?.source).toBe('Mars')
    expect(trine?.angleDeg).toBeCloseTo(240, 9)
    expect(trine?.aspect?.offsetDeg).toBeCloseTo(-120, 9)
  })

  test("each card carries HALF the pair's ESMS delta, so the pair re-adds to one", () => {
    const mars = byPlanet(cards, 'Mars')
    const venus = byPlanet(cards, 'Venus')
    const strength = mars.vectors.find(v => v.kind === 'aspect')?.aspect?.strength ?? NaN
    const effect = getAspectESMSEffect('Mars', 'Venus', 'trine')

    const marsDelta = mars.vectors.find(v => v.kind === 'aspect')?.aspect?.esmsDelta
    expect(marsDelta?.Spirit).toBeCloseTo(effect.Spirit * strength, 9)
    expect(marsDelta?.Essence).toBeCloseTo(effect.Essence * strength, 9)
    expect(mars.vectors.find(v => v.kind === 'aspect')?.aspect?.description).toBe(
      effect.description
    )

    // netHarmony: one harmonious aspect at strength 1 on each card.
    expect(mars.resultant.netHarmony).toBeCloseTo(strength, 9)
    expect(venus.resultant.netHarmony).toBeCloseTo(strength, 9)
  })

  test("physics.charge is aspect-INCLUSIVE — it equals the card's own Matter + Substance", () => {
    for (const card of cards) {
      expect(card.physics.charge).toBeCloseTo(card.esms.Matter + card.esms.Substance, 9)
      // esms and resultant.esms are the same aspect-inclusive row.
      expect(card.resultant.esms.Matter).toBeCloseTo(card.esms.Matter, 9)
      expect(card.resultant.esms.Substance).toBeCloseTo(card.esms.Substance, 9)
    }
  })
})

describe('aspect vectors (exact square)', () => {
  test('a 90° separation is a challenging square weighted 7/8', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100 },
        Saturn: { sign: 'libra', degree: 10, exactLongitude: 190 },
      },
      diurnal: true,
    })

    const square = byPlanet(cards, 'Mars').vectors.find(v => v.kind === 'aspect')
    expect(square?.aspect?.type).toBe('square')
    expect(square?.aspect?.orb).toBeCloseTo(0, 9)
    expect(square?.aspect?.strength).toBeCloseTo(1, 9)
    expect(square?.aspect?.baseWeight).toBeCloseTo(7 / 8, 9)
    expect(square?.magnitude).toBeCloseTo(7 / 8, 9)
    expect(square?.angleDeg).toBeCloseTo(90, 9)
    expect(square?.polarity).toBe('challenging')
    // Challenging aspects push netHarmony negative.
    expect(byPlanet(cards, 'Mars').resultant.netHarmony).toBeCloseTo(-1, 9)
  })
})

// ---------------------------------------------------------------------------
// Applying vs separating
// ---------------------------------------------------------------------------

/** Mars 100°, Venus 222° — a 2° orb off an exact trine, so the orb can close. */
function wideTrine(marsSpeed?: number, venusSpeed?: number): BuildFBDInput {
  return {
    positions: {
      Mars: {
        sign: 'cancer',
        degree: 10,
        exactLongitude: 100,
        ...(marsSpeed === undefined ? {} : { longitudeSpeed: marsSpeed }),
      },
      Venus: {
        sign: 'scorpio',
        degree: 12,
        exactLongitude: 222,
        ...(venusSpeed === undefined ? {} : { longitudeSpeed: venusSpeed }),
      },
    },
    diurnal: true,
  }
}

describe('aspect kinematics (applying / separating / degraded)', () => {
  test('closing the orb reads as applying', () => {
    // Mars (behind) gains on Venus → the 122° separation shrinks toward 120°.
    const { cards } = buildFreeBodyDiagrams(wideTrine(1.0, 0.2))
    const mars = byPlanet(cards, 'Mars')
    const k = mars.vectors.find(v => v.kind === 'aspect')?.aspect?.kinematics

    expect(k).not.toBeNull()
    expect(k?.applying).toBe(true)
    expect(k?.state).toBe('applying')
    expect(k?.orbVelocity).toBeLessThan(0)
    expect(k?.relativeAngularVelocity).toBeCloseTo(1.0 - 0.2, 9)
    expect(mars.kinematicsAvailable).toBe(true)
  })

  test('opening the orb reads as separating', () => {
    const { cards } = buildFreeBodyDiagrams(wideTrine(0.2, 1.0))
    const k = byPlanet(cards, 'Mars').vectors.find(v => v.kind === 'aspect')?.aspect?.kinematics

    expect(k).not.toBeNull()
    expect(k?.applying).toBe(false)
    expect(k?.state).toBe('separating')
    expect(k?.orbVelocity).toBeGreaterThan(0)
    expect(k?.relativeAngularVelocity).toBeCloseTo(0.2 - 1.0, 9)
  })

  test('no speeds at all (stored natal chart) degrades honestly', () => {
    const { cards } = buildFreeBodyDiagrams(wideTrine())
    const mars = byPlanet(cards, 'Mars')

    // The aspect is still drawn — only its verdict is withheld.
    expect(mars.vectors.find(v => v.kind === 'aspect')).toBeDefined()
    expect(mars.vectors.find(v => v.kind === 'aspect')?.aspect?.kinematics).toBeNull()
    expect(mars.kinematicsAvailable).toBe(false)
    expect(mars.vectors.find(v => v.kind === 'momentum')).toBeUndefined()
    expect(mars.physics.momentum).toBeNull()
    expect(mars.physics.speedDegPerDay).toBeNull()
    expect(mars.physics.arcminutesPerDay).toBeNull()
    expect(mars.vectors.find(v => v.kind === 'aspect')?.detail).toContain('motion unavailable')
  })

  test('partner speed missing: the card keeps its own motion, the pair degrades', () => {
    const { cards } = buildFreeBodyDiagrams(wideTrine(0.5, undefined))
    const mars = byPlanet(cards, 'Mars')
    const venus = byPlanet(cards, 'Venus')

    expect(mars.kinematicsAvailable).toBe(true)
    expect(mars.vectors.find(v => v.kind === 'momentum')).toBeDefined()
    expect(mars.vectors.find(v => v.kind === 'aspect')?.aspect?.kinematics).toBeNull()

    expect(venus.kinematicsAvailable).toBe(false)
    expect(venus.vectors.find(v => v.kind === 'momentum')).toBeUndefined()
  })

  test("longitudeSpeed of exactly 0 is the 'unknown motion' sentinel, not a standstill", () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100, longitudeSpeed: 0 },
        Venus: { sign: 'scorpio', degree: 12, exactLongitude: 222, longitudeSpeed: 1.2 },
      },
      diurnal: true,
    })
    const mars = byPlanet(cards, 'Mars')

    expect(mars.kinematicsAvailable).toBe(false)
    expect(mars.vectors.find(v => v.id === 'momentum')).toBeUndefined()
    expect(mars.vectors.find(v => v.kind === 'momentum')).toBeUndefined()
    expect(mars.physics.momentum).toBeNull()
    expect(mars.physics.speedDegPerDay).toBeNull()
    expect(mars.physics.arcminutesPerDay).toBeNull()
    // …and the pair's verdict is withheld rather than invented.
    expect(mars.vectors.find(v => v.kind === 'aspect')?.aspect?.kinematics).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Sign / sect pulls
// ---------------------------------------------------------------------------

describe('sign and sect pulls', () => {
  const { cards } = buildFreeBodyDiagrams(TRINE_SKY)

  test("sign pull: 0.6 along the occupied sign's element axis", () => {
    const mars = byPlanet(cards, 'Mars')
    const signVec = mars.vectors.find(v => v.kind === 'sign')
    expect(signVec?.magnitude).toBeCloseTo(0.6, 9)
    expect(signVec?.angleDeg).toBeCloseTo(ELEMENT_ANGLES.Water, 9) // cancer → Water ↓ 270°
    expect(signVec?.source).toBe('cancer')
    expect(mars.signElement).toBe('Water')
  })

  test("sect pull: 0.4 along the planet's SECTARIAN element axis (Mars by day → Fire)", () => {
    const mars = byPlanet(cards, 'Mars')
    const sectVec = mars.vectors.find(v => v.kind === 'sect')
    expect(sectVec?.magnitude).toBeCloseTo(0.4, 9)
    expect(sectVec?.angleDeg).toBeCloseTo(ELEMENT_ANGLES.Fire, 9)
    expect(sectVec?.source).toBe('Fire')
  })

  test("the elements row is the engine's 0.6 sign + 0.4 sect blend", () => {
    const mars = byPlanet(cards, 'Mars')
    expect(mars.elements.Water).toBeCloseTo(0.6, 9) // cancer
    expect(mars.elements.Fire).toBeCloseTo(0.4, 9) // Mars diurnal sect
    expect(mars.elements.Earth).toBeCloseTo(0, 9)
    expect(mars.elements.Air).toBeCloseTo(0, 9)
    expect(mars.resultant.elementalPush.dominant).toBe('Water')
  })

  test('sect flips at night: Mars nocturnal is Water, stacking on the sign', () => {
    const { cards: night } = buildFreeBodyDiagrams({ ...TRINE_SKY, diurnal: false })
    const mars = byPlanet(night, 'Mars')
    expect(mars.elements.Water).toBeCloseTo(1.0, 9) // 0.6 sign + 0.4 sect
    expect(mars.vectors.find(v => v.kind === 'sect')?.angleDeg).toBeCloseTo(ELEMENT_ANGLES.Water, 9)
  })
})

// ---------------------------------------------------------------------------
// Dignity — the ESMS scale (±10 / ±7), NOT the ±15%-per-level food scale
// ---------------------------------------------------------------------------

function singleBody(planet: string, sign: string, exactLongitude: number) {
  return buildFreeBodyDiagrams({
    positions: {
      [planet]: { sign, degree: exactLongitude % 30, exactLongitude },
    },
    diurnal: true,
  }).cards[0]
}

describe('dignity vector', () => {
  test('FALL (Venus in virgo): −10 ESMS points, ×0.90, dragging against the sign axis', () => {
    const venus = singleBody('Venus', 'virgo', 171)

    expect(venus.dignity.type).toBe('Fall')
    expect(venus.dignity.esmsScale).toBe(-10)
    expect(venus.dignity.multiplier).toBeCloseTo(0.9, 9)

    const dignityVec = venus.vectors.find(v => v.kind === 'dignity')
    expect(dignityVec).toBeDefined()
    // |multiplier − 1| = 0.10 — the ESMS scale, not a 30% food-scale swing.
    expect(dignityVec?.magnitude).toBeCloseTo(0.1, 9)
    // virgo → Earth (180°), flipped 180° because the dignity drags.
    expect(dignityVec?.angleDeg).toBeCloseTo(normalizeAngle(ELEMENT_ANGLES.Earth + 180), 9)
    expect(dignityVec?.polarity).toBe('challenging')
  })

  test("EXALTATION (Sun in aries): +7 ESMS points, ×1.07 — never the food scale's 1.30", () => {
    const sun = singleBody('Sun', 'aries', 5)

    expect(sun.dignity.type).toBe('Exaltation')
    expect(sun.dignity.esmsScale).toBe(7)
    expect(sun.dignity.multiplier).toBeCloseTo(1.07, 9)
    // Guard against re-introducing the ±15%-per-level food scale.
    expect(sun.dignity.multiplier).not.toBeCloseTo(1.3, 2)

    const dignityVec = sun.vectors.find(v => v.kind === 'dignity')
    expect(dignityVec?.magnitude).toBeCloseTo(0.07, 9)
    // aries → Fire (90°), ALONG the axis because the dignity boosts.
    expect(dignityVec?.angleDeg).toBeCloseTo(ELEMENT_ANGLES.Fire, 9)
    expect(dignityVec?.polarity).toBe('harmonious')
  })

  test('DOMICILE (Sun in leo): +10 ESMS points, ×1.10, along the sign axis', () => {
    const sun = singleBody('Sun', 'leo', 135)

    expect(sun.dignity.type).toBe('Domicile')
    expect(sun.dignity.esmsScale).toBe(10)
    expect(sun.dignity.multiplier).toBeCloseTo(1.1, 9)

    const dignityVec = sun.vectors.find(v => v.kind === 'dignity')
    expect(dignityVec?.magnitude).toBeCloseTo(0.1, 9)
    expect(dignityVec?.angleDeg).toBeCloseTo(ELEMENT_ANGLES.Fire, 9) // leo → Fire
    expect(dignityVec?.polarity).toBe('harmonious')
  })

  test('DETRIMENT (Venus in aries): −7 ESMS points, ×0.93, flipped', () => {
    const venus = singleBody('Venus', 'aries', 12)

    expect(venus.dignity.type).toBe('Detriment')
    expect(venus.dignity.esmsScale).toBe(-7)
    expect(venus.dignity.multiplier).toBeCloseTo(0.93, 9)
    const dignityVec = venus.vectors.find(v => v.kind === 'dignity')
    expect(dignityVec?.magnitude).toBeCloseTo(0.07, 9)
    expect(dignityVec?.angleDeg).toBeCloseTo(normalizeAngle(ELEMENT_ANGLES.Fire + 180), 9)
  })

  test('NEUTRAL: no dignity vector at all (scale 0 would be a zero-length arrow)', () => {
    const jupiter = singleBody('Jupiter', 'leo', 135)

    expect(jupiter.dignity.type).toBe('Neutral')
    expect(jupiter.dignity.esmsScale).toBe(0)
    expect(jupiter.dignity.multiplier).toBeCloseTo(1, 9)
    expect(jupiter.vectors.find(v => v.kind === 'dignity')).toBeUndefined()
  })

  test('the multiplier the card reports is the one the engine applied: 1 + esmsScale/100', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
    })
    for (const card of cards) {
      expect(card.dignity.multiplier).toBeCloseTo(1 + card.dignity.esmsScale / 100, 12)
      expect([10, 7, 0, -7, -10]).toContain(card.dignity.esmsScale)
    }
  })
})

// ---------------------------------------------------------------------------
// Per-card normalization
// ---------------------------------------------------------------------------

describe('per-card normalization', () => {
  test('the largest-magnitude vector normalizes to 1 and everything sits in [0.12, 1]', () => {
    const { cards } = buildFreeBodyDiagrams(TRINE_SKY)

    for (const card of cards) {
      const maxMagnitude = Math.max(...card.vectors.map(v => v.magnitude))
      expect(card.normalizationScale).toBeCloseTo(maxMagnitude, 9)

      const biggest = card.vectors.find(v => v.magnitude === maxMagnitude)
      expect(biggest?.normalized).toBeCloseTo(1, 9)

      for (const vector of card.vectors) {
        expect(vector.normalized).toBeGreaterThanOrEqual(0.12)
        expect(vector.normalized).toBeLessThanOrEqual(1)
      }
    }
  })

  test('a vector under 12% of the card max is clamped to the visibility floor', () => {
    // Mars card max is the exact trine (1.0); its Fall dignity is only 0.10.
    const mars = byPlanet(buildFreeBodyDiagrams(TRINE_SKY).cards, 'Mars')
    const dignity = mars.vectors.find(v => v.kind === 'dignity')
    expect(dignity?.magnitude).toBeCloseTo(0.1, 9)
    expect(dignity?.normalized).toBeCloseTo(0.12, 9) // floored, raw preserved
  })

  test('a card with no aspects normalizes against its own sign pull', () => {
    const jupiter = singleBody('Jupiter', 'leo', 135)
    expect(jupiter.vectors.map(v => v.kind).sort()).toEqual(['sect', 'sign'])
    expect(jupiter.normalizationScale).toBeCloseTo(0.6, 9)
    expect(jupiter.vectors.find(v => v.kind === 'sign')?.normalized).toBeCloseTo(1, 9)
    expect(jupiter.vectors.find(v => v.kind === 'sect')?.normalized).toBeCloseTo(0.4 / 0.6, 9)
  })
})

// ---------------------------------------------------------------------------
// Momentum direction
// ---------------------------------------------------------------------------

describe('momentum vector', () => {
  test('direct motion points ahead along the zodiac (0°)', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100, longitudeSpeed: 0.5 },
      },
      diurnal: true,
    })
    const mars = cards[0]
    const momentum = mars.vectors.find(v => v.kind === 'momentum')

    expect(momentum?.angleDeg).toBeCloseTo(0, 9)
    expect(momentum?.label).toBe('MOMENTUM')
    // |speed × alchmWeight| — the weight is engine-supplied, so read it back.
    expect(momentum?.magnitude).toBeCloseTo(0.5 * mars.physics.alchmWeight, 9)
    expect(mars.physics.momentum).toBeCloseTo(0.5 * mars.physics.alchmWeight, 9)
    expect(mars.physics.speedDegPerDay).toBeCloseTo(0.5, 9)
    expect(mars.physics.arcminutesPerDay).toBeCloseTo(30, 9)
  })

  test('retrograde motion points backward (180°)', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: {
          sign: 'cancer',
          degree: 10,
          exactLongitude: 100,
          longitudeSpeed: -0.2,
          isRetrograde: true,
        },
      },
      diurnal: true,
    })
    const mars = cards[0]
    const momentum = mars.vectors.find(v => v.kind === 'momentum')

    expect(mars.isRetrograde).toBe(true)
    expect(momentum?.angleDeg).toBeCloseTo(180, 9)
    expect(momentum?.label).toBe('℞ MOMENTUM')
    expect(momentum?.magnitude).toBeCloseTo(0.2 * mars.physics.alchmWeight, 9)
    expect(mars.physics.momentum).toBeCloseTo(-0.2 * mars.physics.alchmWeight, 9)
    expect(mars.physics.arcminutesPerDay).toBeCloseTo(-12, 9)
  })
})

// ---------------------------------------------------------------------------
// Orb formatting — whole arc-minutes, never "°60′"
// ---------------------------------------------------------------------------

describe('orb formatting', () => {
  test('an orb a hair under a whole degree rolls up to the next degree, not 60′', () => {
    // Separation 122.9999° → 2.9999° off an exact trine. Rounding the minutes
    // independently of a floored degree would render this as "2°60′".
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100 },
        Venus: { sign: 'scorpio', degree: 12, exactLongitude: 222.9999 },
      },
      diurnal: true,
    })

    const detail = byPlanet(cards, 'Mars').vectors.find(v => v.kind === 'aspect')?.detail
    expect(detail).toBeDefined()
    expect(detail).not.toContain('°60′')
    expect(detail).toContain('3°00′')
  })

  test('no aspect vector on any card ever renders 60 arc-minutes', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
    })
    for (const card of cards) {
      for (const vector of card.vectors) {
        expect(vector.detail).not.toContain('°60′')
      }
    }
  })

  // The two tests above only pin the `detail` STRING. The orb split is also
  // exposed as `orbDeg`/`orbMin` precisely so other surfaces (the aspect
  // ledger on /planetary-chart) never re-derive it — a consumer doing
  // `floor(orb)` + `round(frac*60)` reintroduces "N°60′" while `detail`
  // stays correct, so the two surfaces disagree about the same aspect.
  test('the exposed orbDeg/orbMin never carry 60 arc-minutes either', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
    })
    for (const card of cards) {
      for (const vector of card.vectors) {
        if (!vector.aspect) continue
        expect(vector.aspect.orbMin).toBeGreaterThanOrEqual(0)
        expect(vector.aspect.orbMin).toBeLessThan(60)
        expect(Number.isInteger(vector.aspect.orbDeg)).toBe(true)
        expect(Number.isInteger(vector.aspect.orbMin)).toBe(true)
      }
    }
  })

  test('orbDeg/orbMin agree with the detail string for the same aspect', () => {
    // 2.9999° off an exact trine — the danger band. detail says 3°00′, so the
    // structured fields must too, not 2°60′.
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100 },
        Venus: { sign: 'scorpio', degree: 12, exactLongitude: 222.9999 },
      },
      diurnal: true,
    })
    const vector = byPlanet(cards, 'Mars').vectors.find(v => v.kind === 'aspect')
    expect(vector?.aspect).toBeDefined()
    expect(vector!.aspect!.orbDeg).toBe(3)
    expect(vector!.aspect!.orbMin).toBe(0)
    expect(vector!.detail).toContain(
      `${vector!.aspect!.orbDeg}°${String(vector!.aspect!.orbMin).padStart(2, '0')}′`
    )
  })
})

// ---------------------------------------------------------------------------
// Aspect glyphs — every type the calculator can emit needs one, or a surface
// that reads the glyph renders a whole uppercase word in a glyph-sized slot.
// ---------------------------------------------------------------------------

describe('aspect glyphs', () => {
  test('every aspect type the engine scores has a glyph', () => {
    for (const type of Object.keys(ASPECT_MAX_ORBS) as Array<keyof typeof ASPECT_MAX_ORBS>) {
      expect(ASPECT_GLYPHS[type]).toBeDefined()
      expect(ASPECT_GLYPHS[type].length).toBeGreaterThan(0)
    }
  })

  test('no glyph is a whole word — they render in a glyph-sized column', () => {
    for (const glyph of Object.values(ASPECT_GLYPHS)) {
      expect(glyph.length).toBeLessThanOrEqual(2)
    }
  })

  test('vector labels never start with an uppercased type name', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
    })
    for (const card of cards) {
      for (const vector of card.vectors) {
        if (vector.kind !== 'aspect' || !vector.aspect) continue
        const first = vector.label.split(' ')[0]
        expect(first).not.toBe(vector.aspect.type.toUpperCase())
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Excluded bodies — the cards must draw the aspect universe Layer 3 consumes
// ---------------------------------------------------------------------------

describe('excluded aspect bodies', () => {
  test('a North Node sitting on an exact aspect produces no vector anywhere', () => {
    const { cards, totals } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, exactLongitude: 100 },
        Venus: { sign: 'scorpio', degree: 10, exactLongitude: 220 },
        // 340° is an exact trine to Mars AND an exact sextile-family angle to
        // Venus — if nodes leaked in, both cards would gain phantom forces.
        'North Node': { sign: 'pisces', degree: 10, exactLongitude: 340 },
      },
      diurnal: true,
    })

    expect(cards.find(c => c.planet === 'North Node')).toBeUndefined()
    for (const card of cards) {
      expect(card.vectors.some(v => v.source === 'North Node')).toBe(false)
      expect(card.vectors.some(v => v.aspect?.otherPlanet === 'North Node')).toBe(false)
    }
    // Mars still sees only its one real aspect (the Venus trine).
    expect(byPlanet(cards, 'Mars').vectors.filter(v => v.kind === 'aspect')).toHaveLength(1)

    // …and the node contributes nothing to the sky totals either, so the
    // invariant still closes.
    const summed = sumCardEsms(cards)
    for (const axis of AXES) {
      const reconciled = summed[axis] + (totals.groundingVessel?.esms[axis] ?? 0)
      expect(Math.abs(reconciled - totals.esms[axis])).toBeLessThan(EPSILON)
    }
  })
})

// ---------------------------------------------------------------------------
// Card identity fields
// ---------------------------------------------------------------------------

describe('card identity', () => {
  test('degree/minute are derived from the resolved longitude', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: {
        Mars: { sign: 'cancer', degree: 10, minute: 30, exactLongitude: 100.5 },
      },
      diurnal: true,
    })
    const mars = cards[0]

    expect(mars.sign).toBe('cancer')
    expect(mars.signElement).toBe('Water')
    expect(mars.degree).toBe(10)
    expect(mars.minute).toBe(30)
    expect(mars.exactLongitude).toBeCloseTo(100.5, 9)
  })

  test('longitude falls back to sign + degree + minute when exactLongitude is absent', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: { Mars: { sign: 'cancer', degree: 10, minute: 30 } },
      diurnal: true,
    })
    expect(cards[0].exactLongitude).toBeCloseTo(100.5, 9)
  })

  test('only the requested planets get cards', () => {
    const { cards } = buildFreeBodyDiagrams({
      positions: RICH_SKY_POSITIONS,
      diurnal: true,
      planets: ['Sun', 'Moon'],
    })
    expect(cards.map(c => c.planet)).toEqual(['Sun', 'Moon'])
  })
})
