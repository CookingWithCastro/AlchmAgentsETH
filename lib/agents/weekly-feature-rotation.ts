/**
 * Weekly feature rotation — "the best dignity of the week."
 *
 * Each week we feature a rotating, FREE-to-chat set of agents tied to the live
 * sky, and assemble the cast for a guided "attunement circle" group chat:
 *
 *   • topPlanets          — planets ranked by current essential dignity
 *                           (the strongest sky positions this week).
 *   • activeAspects       — the major aspects between transiting planets now in
 *                           orb ("the active aspects of the week").
 *   • featuredGuideIds    — historical-agent GUIDES, chosen from the element of
 *                           the week's top planet(s), rotated deterministically
 *                           by week so the marquee is stable Mon→Sun.
 *   • degreeParticipantIds— the degree sprites (`planetary-<planet>-<sign>-<deg>`)
 *                           of the planets in those active aspects — the chat's
 *                           planetary participants.
 *   • freeAgentIds        — guides ∪ degree participants; chatting any of these
 *                           is free this week (the ESMS cost is waived).
 *
 * Everything is a DETERMINISTIC function of (week, ephemeris) — no DB row, no
 * migration. The rotation is stable within a week; degree participants reflect
 * the current sky so users always talk to the live degree agents.
 */

import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import {
  convertSignDegreesToLongitude,
  angularSeparation,
  closestAspectAngle,
} from '@/lib/aspects-dynamics'
import {
  dignityOf,
  DIGNITY_FACTOR,
  PLANETS,
  type Planet,
  type DignityTier,
} from './agent-type-model'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// convertSignDegreesToLongitude matches Title-case signs; normalize first.
const toTitleSign = (s: string | undefined): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''

/** Traditional element of each planet (by the nature of its domicile). */
const PLANET_ELEMENT: Record<string, 'Fire' | 'Water' | 'Air' | 'Earth'> = {
  sun: 'Fire',
  moon: 'Water',
  mercury: 'Air',
  venus: 'Earth',
  mars: 'Fire',
  jupiter: 'Fire',
  saturn: 'Earth',
  uranus: 'Air',
  neptune: 'Water',
  pluto: 'Water',
  chiron: 'Earth',
}

export interface RankedPlanet {
  planet: string
  sign: string
  degree: number
  tier: DignityTier
  factor: number
  longitude: number
  retrograde: boolean
  spriteId: string
}

export interface ActiveAspect {
  a: string
  b: string
  aspect: string
  orb: number
  exact: boolean
  aSprite: string
  bSprite: string
}

export interface GuideCandidate {
  id: string
  name?: string
  element?: string
}

export interface WeeklyFeature {
  weekStart: string
  weekEnd: string
  weekKey: string
  topPlanets: RankedPlanet[]
  activeAspects: ActiveAspect[]
  featuredGuideIds: string[]
  degreeParticipantIds: string[]
  freeAgentIds: string[]
}

/** Monday 00:00 UTC that starts the week containing `date`. */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const daysSinceMonday = (d.getUTCDay() + 6) % 7 // Sun=0 → 6, Mon=1 → 0, …
  d.setUTCDate(d.getUTCDate() - daysSinceMonday)
  return d
}

export function getWeekKey(date: Date = new Date()): string {
  return getWeekStart(date).toISOString().split('T')[0]!
}

/** Degree sprite agentId for a planet at sign/degree (matches transit-attunement). */
export function degreeSpriteId(planet: string, sign: string, degree: number): string {
  return `planetary-${planet.toLowerCase()}-${sign.toLowerCase()}-${Math.round(degree)}`
}

/** Stable non-negative hash of the week key, for deterministic rotation. */
function hashWeek(weekKey: string): number {
  let h = 0
  for (let i = 0; i < weekKey.length; i++) h = (h * 31 + weekKey.charCodeAt(i)) >>> 0
  return h
}

/** Planets ranked by current essential dignity (strongest first). */
export function rankPlanetsByDignity(date: Date = new Date()): RankedPlanet[] {
  const live = getCurrentPlanetaryPositions(date)
  const ranked: RankedPlanet[] = []
  for (const [planet, pos] of Object.entries(live)) {
    const p = planet.toLowerCase()
    if (!(PLANETS as readonly string[]).includes(p)) continue
    if (!pos?.sign || typeof pos.degree !== 'number') continue
    const tier = dignityOf(p, pos.sign)
    ranked.push({
      planet: p,
      sign: pos.sign,
      degree: pos.degree,
      tier,
      factor: DIGNITY_FACTOR[tier],
      longitude: convertSignDegreesToLongitude(toTitleSign(pos.sign), pos.degree),
      retrograde: Boolean(pos.retrograde),
      spriteId: degreeSpriteId(p, pos.sign, pos.degree),
    })
  }
  ranked.sort(
    (a, b) =>
      b.factor - a.factor ||
      (PLANETS as readonly string[]).indexOf(a.planet) -
        (PLANETS as readonly string[]).indexOf(b.planet)
  )
  return ranked
}

/** Major aspects between transiting planets currently in orb (tightest first). */
export function getActiveAspects(date: Date = new Date()): ActiveAspect[] {
  const ranked = rankPlanetsByDignity(date)
  const aspects: ActiveAspect[] = []
  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const A = ranked[i]!
      const B = ranked[j]!
      const asp = closestAspectAngle(angularSeparation(A.longitude, B.longitude))
      if (!asp) continue
      aspects.push({
        a: A.planet,
        b: B.planet,
        aspect: asp.type,
        orb: Math.round(asp.orb * 100) / 100,
        exact: asp.orb <= 1,
        aSprite: A.spriteId,
        bSprite: B.spriteId,
      })
    }
  }
  aspects.sort((a, b) => a.orb - b.orb)
  return aspects
}

/**
 * Pick the historical-agent guides for the week: from the element(s) of the
 * top-dignity planet(s), rotated deterministically by week so the marquee is
 * stable Mon→Sun but changes week to week.
 */
export function selectFeaturedGuides(
  topPlanets: RankedPlanet[],
  candidates: GuideCandidate[],
  weekKey: string,
  count = 3
): string[] {
  if (!candidates.length || !topPlanets.length) return []
  const seed = hashWeek(weekKey)

  // Elements of the week, in dignity order, de-duplicated.
  const elements: string[] = []
  for (const tp of topPlanets) {
    const el = PLANET_ELEMENT[tp.planet]
    if (el && !elements.includes(el)) elements.push(el)
  }

  const picks: string[] = []
  const takeFrom = (pool: GuideCandidate[]): void => {
    const avail = pool.filter(c => !picks.includes(c.id))
    if (avail.length) picks.push(avail[(seed + picks.length) % avail.length]!.id)
  }

  // One pick per element of the week (dignity order)…
  for (const el of elements) {
    if (picks.length >= count) break
    takeFrom(candidates.filter(c => (c.element || '').toLowerCase() === el.toLowerCase()))
  }
  // …then keep filling from this week's elements…
  const inWeekElements = (c: GuideCandidate): boolean =>
    elements.some(el => (c.element || '').toLowerCase() === el.toLowerCase())
  while (picks.length < count) {
    const before = picks.length
    takeFrom(candidates.filter(inWeekElements))
    if (picks.length === before) break
  }
  // …finally top up deterministically from the whole roster.
  while (picks.length < count) {
    const before = picks.length
    takeFrom(candidates)
    if (picks.length === before) break
  }

  return picks.slice(0, count)
}

/**
 * Pure weekly feature. Rotation/guides derive from the week key; aspects and
 * degree participants from the live sky at `date`.
 */
export function getWeeklyFeature(
  opts: { date?: Date; guideCandidates?: GuideCandidate[]; topN?: number } = {}
): WeeklyFeature {
  const date = opts.date ?? new Date()
  const start = getWeekStart(date)
  const weekKey = start.toISOString().split('T')[0]!
  const weekEnd = new Date(start.getTime() + WEEK_MS - 1).toISOString().split('T')[0]!

  const ranked = rankPlanetsByDignity(date)
  const topPlanets = ranked.slice(0, opts.topN ?? 3)
  const activeAspects = getActiveAspects(date)
  const featuredGuideIds = selectFeaturedGuides(topPlanets, opts.guideCandidates ?? [], weekKey)

  const degreeSet = new Set<string>()
  for (const asp of activeAspects) {
    degreeSet.add(asp.aSprite)
    degreeSet.add(asp.bSprite)
  }
  const degreeParticipantIds = [...degreeSet]
  const freeAgentIds = [...new Set([...featuredGuideIds, ...degreeParticipantIds])]

  return {
    weekStart: weekKey,
    weekEnd,
    weekKey,
    topPlanets,
    activeAspects,
    featuredGuideIds,
    degreeParticipantIds,
    freeAgentIds,
  }
}

// ── Roster-backed convenience layer (lazy import of the 71 historical agents) ──

let _candidates: GuideCandidate[] | null = null
async function loadGuideCandidates(): Promise<GuideCandidate[]> {
  if (_candidates) return _candidates
  try {
    const mod: any = await import('@/lib/agents/historical')
    const list: any[] = mod.HISTORICAL_AGENTS ?? []
    _candidates = list
      .map(a => ({ id: a.id, name: a.name, element: a.consciousness?.dominantElement }))
      .filter(c => c.id)
  } catch {
    _candidates = []
  }
  return _candidates
}

let _featureCache: { key: string; feature: WeeklyFeature } | null = null

/**
 * Weekly feature with historical guides resolved. Memoized per DAY so the sky
 * (aspects + degree participants) refreshes daily; the featured guides stay
 * week-stable because they derive from the week key inside selectFeaturedGuides.
 */
export async function resolveWeeklyFeature(date: Date = new Date()): Promise<WeeklyFeature> {
  const key = date.toISOString().split('T')[0]! // day key
  if (_featureCache && _featureCache.key === key) return _featureCache.feature
  const guideCandidates = await loadGuideCandidates()
  const feature = getWeeklyFeature({ date, guideCandidates })
  _featureCache = { key, feature }
  return feature
}

/** Is this agent in this week's free set (featured guide or active degree sprite)? */
export async function isAgentFreeThisWeek(
  agentId: string,
  date: Date = new Date()
): Promise<boolean> {
  if (!agentId) return false
  const feature = await resolveWeeklyFeature(date)
  const id = agentId.toLowerCase()
  return feature.freeAgentIds.some(x => x.toLowerCase() === id)
}
