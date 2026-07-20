/**
 * Planetary free-body diagrams.
 *
 * For each planet, decompose everything the engine already knows about it into
 * force vectors suitable for a free-body-diagram card:
 *
 *   - one vector per ASPECT from another body (true-bearing, strength-weighted,
 *     with applying/separating kinematics when daily motions are available)
 *   - a SIGN pull along the occupied sign's element axis (the engine's 0.6
 *     sign-element weight)
 *   - a SECT pull along the planet's sectarian element axis (the 0.4 weight)
 *   - a DIGNITY boost/drag along (or against) the sign's element axis
 *   - a MOMENTUM vector along the planet's direction of motion
 *
 * plus a RESULTANT in ESMS space — the planet's alchemical tendency — and an
 * honest physics readout. Every magnitude is an engine-native quantity (no
 * invented constants); per-card normalization is applied for display with the
 * raw value preserved.
 *
 * Card space convention (renderers translate to SVG):
 *   polar angle in degrees, 0° = direction of INCREASING ecliptic longitude
 *   ("ahead" along the zodiac), increasing counterclockwise.
 *   SVG mapping: x = cos(θ), y = −sin(θ).
 *
 * Element compass (fixed axes, matches ElementalWheel):
 *   Fire ↑ 90°, Air → 0°, Water ↓ 270°, Earth ← 180°.
 * ESMS compass (fixed axes, same rose):
 *   Spirit ↑ 90°, Essence → 0°, Matter ↓ 270°, Substance ← 180°.
 *
 * This module is deliberately free of Node-only imports so both server pages
 * and client components can use it.
 */

import type { AspectType, DignityType } from './types'
import {
  calculateComprehensiveAspects,
  signDegreeToLongitude,
  type AspectData,
} from './aspectCalculator'
import { getAspectESMSEffect } from './aspectESMSEffects'
import { computeAspectKinematics, type AspectKinematics } from './aspectKinematics'
import {
  calculateEnhancedAlchemicalFromPlanetsDetailed,
  getPlanetarySectElement,
  type EnhancedPlanetContribution,
} from './planetaryAlchemyMapping'

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface FBDPositionInput {
  sign: string
  /** Degree within the sign (0–29.999…). */
  degree: number
  minute?: number
  /** Absolute ecliptic longitude 0–360; preferred (sub-arcminute precision). */
  exactLongitude?: number
  isRetrograde?: boolean
  /**
   * Signed daily motion in deg/day (negative while retrograde). When absent —
   * e.g. a stored natal chart — kinematics and momentum degrade honestly:
   * no applying/separating verdicts, no momentum vector.
   */
  longitudeSpeed?: number
}

export interface BuildFBDInput {
  positions: Record<string, FBDPositionInput>
  /**
   * Sect for the moment — day charts map every planet to Spirit/Essence, so
   * this flips which ESMS axes a planet can even contribute to.
   */
  diurnal: boolean
  /** Bodies to build cards for; defaults to the ten planets present. */
  planets?: string[]
}

/** What a card's numbers reconcile against — see {@link FBDSkyTotals}. */
export interface FBDSkyTotals {
  /** The engine's ESMS totals for this moment. */
  esms: { Spirit: number; Essence: number; Matter: number; Substance: number }
  /** Layer-3 aspect total, already included in `esms`. */
  aspectModifications: {
    Spirit: number
    Essence: number
    Matter: number
    Substance: number
  }
  /**
   * ESMS inside `esms` that no card carries, so the parts always add up:
   *
   *   Σ cards[].esms + unattributed === esms   (exactly)
   *
   * Two things land here. The Ascendant's Physical-Vessel grounding term (it
   * is not a planet and gets no card), and the far half of any aspect whose
   * partner has no card — pair effects are split evenly between the two
   * bodies, so an Ascendant–Mars square puts Mars's half on Mars's card and
   * the Ascendant's half here. Surfaces must disclose this rather than
   * implying the ten cards are the whole sky.
   */
  unattributed: {
    Spirit: number
    Essence: number
    Matter: number
    Substance: number
  }
  /** The grounding vessel's own Layer-1×2 term, part of `unattributed`. */
  groundingVessel: {
    esms: { Spirit: number; Essence: number; Matter: number; Substance: number }
    injected: boolean
  } | null
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type FBDForceKind = 'aspect' | 'sign' | 'sect' | 'dignity' | 'momentum'
export type FBDPolarity = 'harmonious' | 'challenging' | 'neutral'

export interface FBDAspectDetail {
  otherPlanet: string
  type: AspectType
  /** Orb in degrees (distance from exact). */
  orb: number
  /**
   * The orb pre-split into whole degrees + arc-minutes, rounded to whole
   * arc-minutes FIRST so the pair can never read "2°60′". Exposed because
   * every surface that shows an orb must use the SAME split — re-deriving it
   * with `floor(orb)` + `round(frac*60)` reintroduces exactly that bug, and
   * two surfaces on one page then disagree about the same aspect.
   */
  orbDeg: number
  orbMin: number
  /** Cosine-bell strength 0–1 (1 = exact). */
  strength: number
  /** Type importance = the engine's own orb budget, maxOrb/8 (0.25–1). */
  baseWeight: number
  /** Signed ecliptic offset to the other body, −180…180 (positive = ahead). */
  offsetDeg: number
  /** null when either body lacks a daily motion (e.g. natal charts). */
  kinematics: AspectKinematics | null
  /** Pair-archetype ESMS delta, already scaled by strength. */
  esmsDelta: { Spirit: number; Essence: number; Matter: number; Substance: number }
  /** Archetypal description of the pair effect. */
  description: string
}

export interface FBDVector {
  id: string
  kind: FBDForceKind
  /** What exerts the force: a planet name, a sign, an element, or "motion". */
  source: string
  /** Short display label, e.g. "△ VENUS" or "LEO → FIRE". */
  label: string
  /** Card-space polar angle (0° = ahead along the zodiac, CCW). */
  angleDeg: number
  /** Raw engine-native magnitude (unitless). */
  magnitude: number
  /** Display length 0–1, per-card normalized with a visibility floor. */
  normalized: number
  polarity: FBDPolarity
  /** One-line tooltip detail with the raw numbers. */
  detail: string
  aspect?: FBDAspectDetail
}

export interface FBDResultant {
  /** ESMS-space tendency angle on the Spirit/Essence/Matter/Substance rose. */
  angleDeg: number
  /** |(Essence−Substance, Spirit−Matter)| — raw ESMS-space magnitude. */
  magnitude: number
  /** Display length 0–1 (magnitude / RESULTANT_DISPLAY_SCALE, clamped). */
  normalized: number
  /**
   * The planet's ESMS involvement: its base contribution plus HALF of each of
   * its aspects' pair deltas (each pair effect is shared by two planets, so
   * summing every card's aspect share reproduces the engine's Layer-3 total).
   */
  esms: { Spirit: number; Essence: number; Matter: number; Substance: number }
  dominant: 'Spirit' | 'Essence' | 'Matter' | 'Substance'
  /** The planet's elemental push (sign + sect blend) and its dominant axis. */
  elementalPush: {
    Fire: number
    Water: number
    Earth: number
    Air: number
    dominant: 'Fire' | 'Water' | 'Earth' | 'Air'
  }
  /** Σ signed aspect influence (+harmonious −challenging, strength-weighted). */
  netHarmony: number
}

export interface FBDPhysics {
  /** Q = Matter + Substance of this planet's ESMS contribution. */
  charge: number
  /** p = daily motion × alchemical weight (deg/day-weighted); null w/o speed. */
  momentum: number | null
  /** Signed daily motion, deg/day. */
  speedDegPerDay: number | null
  /** Signed daily motion, arc-minutes/day — the card's arc-minute tie-in. */
  arcminutesPerDay: number | null
  /** Orbital-period alchemical weight (log-normalized, Moon≈0.28 Pluto=1). */
  alchmWeight: number
}

export interface PlanetFBD {
  planet: string
  sign: string
  signElement: string
  /** Integer degree within sign. */
  degree: number
  /** Integer arc-minute within degree. */
  minute: number
  /** Absolute ecliptic longitude (sub-arcminute precision when available). */
  exactLongitude: number
  isRetrograde: boolean
  dignity: {
    /** ESMS-scale points (+10 domicile … −10 fall) — the scale the engine applies. */
    esmsScale: number
    type: DignityType
    /** The multiplier the engine actually applied: 1 + esmsScale/100. */
    multiplier: number
  }
  vectors: FBDVector[]
  resultant: FBDResultant
  physics: FBDPhysics
  esms: { Spirit: number; Essence: number; Matter: number; Substance: number }
  elements: { Fire: number; Water: number; Earth: number; Air: number }
  /** false when the source chart carries no daily motions (stored natal). */
  kinematicsAvailable: boolean
  /** Raw magnitude that maps to normalized = 1 on this card. */
  normalizationScale: number
  /** This planet's half of its aspects' pair deltas — the Layer-3 part of `esms`. */
  aspectShare: { Spirit: number; Essence: number; Matter: number; Substance: number }
}

export interface FBDResult {
  cards: PlanetFBD[]
  /** The sky-level ESMS the cards decompose. See {@link FBDSkyTotals}. */
  totals: FBDSkyTotals
}

// ---------------------------------------------------------------------------
// Constants (engine-native — no invented tuning knobs)
// ---------------------------------------------------------------------------

export const TEN_PLANETS = [
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
] as const

/** Fixed element compass, matches ElementalWheel (Fire up, Air right…). */
export const ELEMENT_ANGLES: Record<string, number> = {
  Fire: 90,
  Air: 0,
  Water: 270,
  Earth: 180,
}

/** Fixed ESMS compass on the same rose (Spirit up, Essence right…). */
export const ESMS_ANGLES: Record<string, number> = {
  Spirit: 90,
  Essence: 0,
  Matter: 270,
  Substance: 180,
}

/** Mirrors RealAlchemizeService's elemental blending weights. */
const SIGN_WEIGHT = 0.6
const SECT_WEIGHT = 0.4

/** Ideal angles per aspect type (matches aspectCalculator's definitions). */
const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150,
  inconjunct: 150,
  'semi-sextile': 30,
  sesquisquare: 135,
  semisquare: 45,
  quintile: 72,
  biquintile: 144,
}

/**
 * Max orbs per aspect type (matches aspectCalculator). The type's importance
 * weight is derived from the engine's own orb budget — maxOrb/8 — rather than
 * a new hand-tuned table: conjunction/opposition/trine 1.0 … quintile 0.25.
 */
/**
 * The engine's own orb budget per aspect type. Exported alongside
 * {@link ASPECT_GLYPHS} so a consumer (or a port to another repo) can assert
 * the two stay in step: every type that gets scored here must have a glyph.
 * `baseWeight = maxOrb / 8` is load-bearing — it sets vector length.
 */
export const ASPECT_MAX_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 8,
  square: 7,
  sextile: 6,
  quincunx: 5,
  inconjunct: 5,
  'semi-sextile': 4,
  sesquisquare: 3,
  semisquare: 3,
  quintile: 2,
  biquintile: 2,
}

/**
 * Aspect glyphs, keyed by type. Exported so every surface that shows an aspect
 * reads the SAME glyph rather than reverse-parsing it out of `vector.label`
 * (`label.split(" ")[0]`), which silently yields a whole uppercase word for
 * any type missing from this map.
 *
 * `aspectCalculator` emits — and `ASPECT_ANGLES`/`ASPECT_MAX_ORBS` below treat
 * as first-class — four minor types that have no standard single glyph:
 * semisquare, sesquisquare, quintile and biquintile. They get short mono
 * abbreviations rather than being omitted, because a `Partial` map here is
 * what produced "Mar SESQUISQUARE Sat" in a glyph-sized column.
 */
export const ASPECT_GLYPHS: Record<AspectType, string> = {
  conjunction: '☌',
  opposition: '☍',
  trine: '△',
  square: '□',
  sextile: '⚹',
  quincunx: '⚻',
  inconjunct: '⚻',
  'semi-sextile': '⚺',
  semisquare: '∠',
  sesquisquare: '⚼',
  quintile: 'Q',
  biquintile: 'bQ',
}

/** Vectors shorter than this fraction of the card max stay visible. */
const MIN_VISUAL_NORM = 0.12

/**
 * Raw ESMS-space magnitude that renders as a full-length resultant. Planet
 * ESMS contributions live in roughly 0–1.3 (alchmWeight × dignity), so the
 * axis differences rarely exceed ~1.5.
 */
const RESULTANT_DISPLAY_SCALE = 1.5

// ---------------------------------------------------------------------------
// Small helpers (exported for tests + renderers)
// ---------------------------------------------------------------------------

/** Signed shortest angular offset from `from` to `to`, in (−180, 180]. */
export function signedDeltaDeg(from: number, to: number): number {
  let delta = (to - from) % 360
  if (delta > 180) delta -= 360
  if (delta <= -180) delta += 360
  return delta
}

/** Normalize an angle to [0, 360). */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

/** "18°42′" from a sign-relative degree + minute. */
export function formatDegMin(degree: number, minute: number): string {
  return `${Math.floor(degree)}°${String(Math.floor(minute)).padStart(2, '0')}′`
}

function harmonyOf(type: AspectType): FBDPolarity {
  if (type === 'conjunction' || type === 'trine' || type === 'sextile') {
    return 'harmonious'
  }
  if (type === 'opposition' || type === 'square') return 'challenging'
  return 'neutral'
}

function resolveLongitude(pos: FBDPositionInput): number | null {
  if (typeof pos.exactLongitude === 'number' && Number.isFinite(pos.exactLongitude)) {
    return normalizeAngle(pos.exactLongitude)
  }
  return signDegreeToLongitude(pos.sign, pos.degree, pos.minute ?? 0)
}

/**
 * Bodies the ESMS engine excludes from its aspect universe (mirrors the
 * positionData filter in RealAlchemizeService.alchemize). The FBD cards must
 * draw the same aspect set Layer 3 actually consumes — a node aspect the
 * engine never sees would be a phantom force. Ascendant stays: the engine
 * includes it when a position is provided.
 */
const EXCLUDED_ASPECT_BODIES = new Set([
  'NorthNode',
  'SouthNode',
  'True Node',
  // The Swiss-Ephemeris backend spells the nodes with a space — the engine's
  // own inline list misses "North Node", which is a known gap being fixed
  // separately; the cards draw the intended (node-free) aspect universe.
  'North Node',
  'South Node',
  'Chiron',
  'Lilith',
  'Vertex',
  'Pars Fortune',
  'Mean Node',
  'MC',
])

const SIGN_ELEMENT: Record<string, 'Fire' | 'Water' | 'Earth' | 'Air'> = {
  aries: 'Fire',
  leo: 'Fire',
  sagittarius: 'Fire',
  taurus: 'Earth',
  virgo: 'Earth',
  capricorn: 'Earth',
  gemini: 'Air',
  libra: 'Air',
  aquarius: 'Air',
  cancer: 'Water',
  scorpio: 'Water',
  pisces: 'Water',
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build a free-body diagram for every requested planet.
 *
 * All bodies present in `positions` participate as aspect sources (an
 * Ascendant can pull on a card's planet), but cards are produced only for the
 * requested planets (default: the ten planets).
 */
export function buildFreeBodyDiagrams(input: BuildFBDInput): FBDResult {
  const { positions, diurnal } = input

  const longitudes: Record<string, number> = {}
  for (const [name, pos] of Object.entries(positions)) {
    const lon = resolveLongitude(pos)
    if (lon !== null) longitudes[name] = lon
  }

  // One aspect pass for the whole sky (cosine-bell strengths, majors+minors).
  const aspects: AspectData[] = calculateComprehensiveAspects(
    Object.fromEntries(
      Object.entries(positions)
        .filter(([name]) => longitudes[name] !== undefined && !EXCLUDED_ASPECT_BODIES.has(name))
        .map(([name, pos]) => [
          name,
          {
            sign: String(pos.sign).toLowerCase(),
            degree: pos.degree,
            exactLongitude: longitudes[name],
            isRetrograde: pos.isRetrograde,
          },
        ])
    )
  )

  // The ESMS numbers on every card come from the engine's OWN three-layer
  // decomposition, so a card's Spirit/Essence/Matter/Substance is literally
  // that planet's term in the totals — not a lookalike recomputation.
  const signMap: Record<string, string> = {}
  for (const [name, pos] of Object.entries(positions)) {
    if (EXCLUDED_ASPECT_BODIES.has(name)) continue
    signMap[name] = String(pos.sign).toLowerCase()
  }
  const engine = calculateEnhancedAlchemicalFromPlanetsDetailed(
    signMap,
    diurnal,
    aspects.map(a => ({
      planet1: a.planet1,
      planet2: a.planet2,
      type: a.type,
      strength: a.strength,
    }))
  )

  const cardPlanets = input.planets ?? TEN_PLANETS.filter(planet => positions[planet] !== undefined)

  const cards = cardPlanets
    .map(planet => {
      const pos = positions[planet]
      const contribution = engine.perPlanet[planet]
      const lon = longitudes[planet]
      if (!pos || !contribution || lon === undefined) return null
      return buildCard(planet, pos, lon, contribution, diurnal, aspects, longitudes, positions)
    })
    .filter((card): card is PlanetFBD => card !== null)

  // Momentum normalizes across the whole sky rather than per card, so arrow
  // length stays comparable between planets (the Moon really does carry ~200×
  // Pluto's) instead of every card rendering its own momentum at full length.
  const maxMomentum = Math.max(
    ...cards.flatMap(card => card.vectors.filter(v => v.kind === 'momentum').map(v => v.magnitude)),
    1e-9
  )
  for (const card of cards) {
    for (const vector of card.vectors) {
      if (vector.kind !== 'momentum') continue
      vector.normalized = Math.min(1, Math.max(MIN_VISUAL_NORM, vector.magnitude / maxMomentum))
    }
  }

  const vessel = engine.perPlanet.Ascendant
  // Whatever the cards don't carry — the vessel's own term plus the far half
  // of any aspect whose partner has no card — is reported, never dropped.
  const unattributed = { Spirit: 0, Essence: 0, Matter: 0, Substance: 0 }
  for (const axis of ['Spirit', 'Essence', 'Matter', 'Substance'] as const) {
    const carried = cards.reduce((sum, card) => sum + card.esms[axis], 0)
    unattributed[axis] = engine.totals[axis] - carried
  }

  return {
    cards,
    totals: {
      esms: engine.totals,
      aspectModifications: engine.aspectModifications,
      unattributed,
      groundingVessel: vessel ? { esms: vessel.esms, injected: engine.ascendantInjected } : null,
    },
  }
}

function buildCard(
  planet: string,
  pos: FBDPositionInput,
  lon: number,
  contribution: EnhancedPlanetContribution,
  diurnal: boolean,
  allAspects: AspectData[],
  longitudes: Record<string, number>,
  positions: Record<string, FBDPositionInput>
): PlanetFBD {
  const sign = String(pos.sign).toLowerCase()
  const signElement = SIGN_ELEMENT[sign] ?? 'Air'
  const degreeInSign = lon % 30
  const degree = Math.floor(degreeInSign)
  const minute = Math.floor((degreeInSign - degree) * 60)

  // Elemental blend mirrors the engine's own 60/40 sign-vs-sect weighting.
  const sectElement = getPlanetarySectElement(planet, diurnal)
  const elements = { Fire: 0, Water: 0, Earth: 0, Air: 0 }
  if (signElement in elements) {
    elements[signElement] += SIGN_WEIGHT
  }
  if (sectElement in elements) {
    elements[sectElement] += SECT_WEIGHT
  }

  const dignityEsmsScale = contribution.dignityEsmsScale
  const multiplier = contribution.dignityMultiplier
  // A speed of exactly 0 is astronomy-engine's "no motion computed" sentinel
  // (serverPlanetaryCalculations initializes longitudeSpeed = 0 and only
  // overwrites it on success), not a real standstill — treat it as unknown so
  // the card degrades honestly instead of drawing a zero-length momentum arrow
  // and claiming kinematics it does not have.
  const speed =
    typeof pos.longitudeSpeed === 'number' &&
    Number.isFinite(pos.longitudeSpeed) &&
    pos.longitudeSpeed !== 0
      ? pos.longitudeSpeed
      : null

  const vectors: FBDVector[] = []
  const aspectEsmsShare = { Spirit: 0, Essence: 0, Matter: 0, Substance: 0 }
  let netHarmony = 0
  // Card-level flag: does THIS planet carry a daily motion? Individual aspects
  // additionally need the partner's motion and carry their own kinematics|null.
  const kinematicsAvailable = speed !== null

  // --- Aspect force vectors ------------------------------------------------
  for (const aspect of allAspects) {
    const isP1 = aspect.planet1 === planet
    const isP2 = aspect.planet2 === planet
    if (!isP1 && !isP2) continue
    const other = isP1 ? aspect.planet2 : aspect.planet1
    const otherLon = longitudes[other]
    if (otherLon === undefined) continue

    const offsetDeg = signedDeltaDeg(lon, otherLon)
    const baseWeight = (ASPECT_MAX_ORBS[aspect.type] ?? 2) / 8
    const magnitude = aspect.strength * baseWeight
    const polarity = harmonyOf(aspect.type)
    if (polarity === 'harmonious') netHarmony += aspect.strength
    if (polarity === 'challenging') netHarmony -= aspect.strength

    const otherSpeed = positions[other]?.longitudeSpeed
    // The `!== 0` test mirrors the planet's own speed guard above: exactly 0 is
    // the "no motion computed" sentinel, not a real standstill. Both sides of a
    // pair must apply it, or a partner whose speed failed to compute would be
    // read as stationary and yield a confident, wrong applying/separating
    // verdict instead of an honest "motion unavailable".
    const kinematics =
      speed !== null &&
      typeof otherSpeed === 'number' &&
      Number.isFinite(otherSpeed) &&
      otherSpeed !== 0
        ? computeAspectKinematics(lon, otherLon, ASPECT_ANGLES[aspect.type] ?? 0, speed, otherSpeed)
        : null

    const rawEffect = getAspectESMSEffect(aspect.planet1, aspect.planet2, aspect.type)
    const esmsDelta = {
      Spirit: rawEffect.Spirit * aspect.strength,
      Essence: rawEffect.Essence * aspect.strength,
      Matter: rawEffect.Matter * aspect.strength,
      Substance: rawEffect.Substance * aspect.strength,
    }
    // Half of the pair effect belongs to this card (see FBDResultant.esms).
    aspectEsmsShare.Spirit += esmsDelta.Spirit / 2
    aspectEsmsShare.Essence += esmsDelta.Essence / 2
    aspectEsmsShare.Matter += esmsDelta.Matter / 2
    aspectEsmsShare.Substance += esmsDelta.Substance / 2

    // Round to whole arc-minutes FIRST, then split — rounding the minutes
    // independently of a floored degree renders 2.999° as "2°60′".
    const orbTotalMin = Math.round(aspect.orb * 60)
    const orbDeg = Math.floor(orbTotalMin / 60)
    const orbMin = orbTotalMin % 60
    const kinematicsNote = kinematics
      ? kinematics.state === 'stationary'
        ? 'stationary'
        : kinematics.state === 'applying'
          ? `applying · ${kinematics.daysToExact.toFixed(1)}d to exact`
          : `separating · ${kinematics.daysToExact.toFixed(1)}d since exact`
      : 'motion unavailable'

    vectors.push({
      id: `aspect-${other}-${aspect.type}`,
      kind: 'aspect',
      source: other,
      label: `${ASPECT_GLYPHS[aspect.type]} ${other.toUpperCase()}`,
      angleDeg: normalizeAngle(offsetDeg),
      magnitude,
      normalized: 0, // filled after per-card normalization
      polarity,
      detail: `${aspect.type} · orb ${orbDeg}°${String(orbMin).padStart(2, '0')}′ · strength ${(aspect.strength * 100).toFixed(0)}% × weight ${baseWeight.toFixed(2)} · ${kinematicsNote}`,
      aspect: {
        otherPlanet: other,
        type: aspect.type,
        orb: aspect.orb,
        orbDeg,
        orbMin,
        strength: aspect.strength,
        baseWeight,
        offsetDeg,
        kinematics,
        esmsDelta,
        description: rawEffect.description,
      },
    })
  }

  // --- Sign pull (engine's 0.6 sign-element weight) -------------------------
  vectors.push({
    id: 'sign-pull',
    kind: 'sign',
    source: sign,
    label: `${sign.toUpperCase()} → ${signElement.toUpperCase()}`,
    angleDeg: ELEMENT_ANGLES[signElement],
    magnitude: SIGN_WEIGHT,
    normalized: 0,
    polarity: 'neutral',
    detail: `sign pull · ${signElement} · engine sign-element weight ${SIGN_WEIGHT.toFixed(2)}`,
  })

  // --- Sect pull (engine's 0.4 sectarian-element weight) --------------------
  if (ELEMENT_ANGLES[sectElement] !== undefined) {
    vectors.push({
      id: 'sect-pull',
      kind: 'sect',
      source: sectElement,
      label: `SECT → ${sectElement.toUpperCase()}`,
      angleDeg: ELEMENT_ANGLES[sectElement],
      magnitude: SECT_WEIGHT,
      normalized: 0,
      polarity: 'neutral',
      detail: `sectarian pull · ${sectElement} · engine sect-element weight ${SECT_WEIGHT.toFixed(2)}`,
    })
  }

  // --- Dignity boost/drag along the sign's element axis ---------------------
  //
  // Magnitude and label both come from the ESMS-scale multiplier the engine
  // actually applied (1 + esmsScale/100 → ±7% exaltation/detriment, ±10%
  // domicile/fall). The ±15%-per-level food scale is a different system and
  // would have the card claim a boost the ESMS totals never received.
  if (dignityEsmsScale !== 0) {
    const boosting = dignityEsmsScale > 0
    const label = contribution.dignityType.toUpperCase()
    vectors.push({
      id: 'dignity',
      kind: 'dignity',
      source: contribution.dignityType,
      label: `${label} ${boosting ? '+' : '−'}${Math.abs(dignityEsmsScale)}%`,
      angleDeg: boosting
        ? ELEMENT_ANGLES[signElement]
        : normalizeAngle(ELEMENT_ANGLES[signElement] + 180),
      magnitude: Math.abs(multiplier - 1),
      normalized: 0,
      polarity: boosting ? 'harmonious' : 'challenging',
      detail: `dignity · ${contribution.dignityType} in ${sign} · ESMS multiplier ×${multiplier.toFixed(2)}`,
    })
  }

  // --- Momentum along the direction of motion -------------------------------
  const momentum = speed !== null ? speed * contribution.alchmWeight : null
  if (speed !== null && momentum !== null) {
    vectors.push({
      id: 'momentum',
      kind: 'momentum',
      source: 'motion',
      label: pos.isRetrograde ? '℞ MOMENTUM' : 'MOMENTUM',
      angleDeg: speed >= 0 ? 0 : 180,
      magnitude: Math.abs(momentum),
      normalized: 0,
      polarity: 'neutral',
      detail: `momentum · ${speed.toFixed(3)}°/day (${(speed * 60).toFixed(1)}′/day) × alchemical weight ${contribution.alchmWeight.toFixed(2)}`,
    })
  }

  // --- Per-card normalization (raw values preserved) -------------------------
  //
  // Momentum is deliberately excluded from the force scale: it is |deg/day ×
  // weight| while every other magnitude is a dimensionless 0–1 engine weight.
  // Letting the two share a scale means the Moon's momentum (~3.7) sets the
  // card max and squashes a strength-1.00 trine into the same 12px band as a
  // trivial one — destroying exactly the comparison the card exists to make.
  // Momentum is normalized separately, across cards, in buildFreeBodyDiagrams.
  const scale = Math.max(...vectors.filter(v => v.kind !== 'momentum').map(v => v.magnitude), 1e-9)
  for (const vector of vectors) {
    if (vector.kind === 'momentum') continue
    vector.normalized = Math.min(1, Math.max(MIN_VISUAL_NORM, vector.magnitude / scale))
  }

  // --- Resultant: ESMS tendency ---------------------------------------------
  const esms = {
    Spirit: contribution.esms.Spirit + aspectEsmsShare.Spirit,
    Essence: contribution.esms.Essence + aspectEsmsShare.Essence,
    Matter: contribution.esms.Matter + aspectEsmsShare.Matter,
    Substance: contribution.esms.Substance + aspectEsmsShare.Substance,
  }
  const rx = esms.Essence - esms.Substance
  const ry = esms.Spirit - esms.Matter
  const resultantMagnitude = Math.hypot(rx, ry)
  const resultantAngle = normalizeAngle((Math.atan2(ry, rx) * 180) / Math.PI)
  const dominant = (Object.entries(esms) as Array<[FBDResultant['dominant'], number]>).sort(
    (a, b) => b[1] - a[1]
  )[0][0]

  const elementalEntries = Object.entries(elements) as Array<
    ['Fire' | 'Water' | 'Earth' | 'Air', number]
  >
  const dominantElement = elementalEntries.sort((a, b) => b[1] - a[1])[0][0]

  return {
    planet,
    sign,
    signElement,
    degree,
    minute,
    exactLongitude: lon,
    isRetrograde: Boolean(pos.isRetrograde),
    dignity: {
      esmsScale: dignityEsmsScale,
      type: contribution.dignityType,
      multiplier,
    },
    vectors,
    resultant: {
      angleDeg: resultantAngle,
      magnitude: resultantMagnitude,
      normalized: Math.min(1, resultantMagnitude / RESULTANT_DISPLAY_SCALE),
      esms,
      dominant,
      elementalPush: { ...elements, dominant: dominantElement },
      netHarmony,
    },
    physics: {
      // Charge and the ESMS row must agree: both are aspect-inclusive.
      charge: esms.Matter + esms.Substance,
      momentum,
      speedDegPerDay: speed,
      arcminutesPerDay: speed !== null ? speed * 60 : null,
      alchmWeight: contribution.alchmWeight,
    },
    esms,
    elements,
    kinematicsAvailable,
    normalizationScale: scale,
    aspectShare: aspectEsmsShare,
  }
}
