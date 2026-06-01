import { describe, it, expect } from 'vitest'
import {
  getWeekStart,
  getWeekKey,
  rankPlanetsByDignity,
  getActiveAspects,
  getWeeklyFeature,
  selectFeaturedGuides,
  degreeSpriteId,
  type GuideCandidate,
} from '@/lib/agents/weekly-feature-rotation'

const FIXED = new Date('2026-05-27T12:00:00Z') // a Wednesday

describe('weekly-feature-rotation (deterministic engine)', () => {
  it('getWeekStart returns the Monday 00:00 UTC of the week', () => {
    const start = getWeekStart(FIXED)
    expect(start.getUTCDay()).toBe(1) // Monday
    expect(start.getUTCHours()).toBe(0)
    expect(getWeekKey(FIXED)).toBe('2026-05-25')
    // Sunday belongs to the week that started the previous Monday
    expect(getWeekKey(new Date('2026-05-31T23:00:00Z'))).toBe('2026-05-25')
    // Monday starts a new week
    expect(getWeekKey(new Date('2026-06-01T00:00:00Z'))).toBe('2026-06-01')
  })

  it('degreeSpriteId matches the planetary sprite convention', () => {
    expect(degreeSpriteId('Sun', 'Gemini', 8.4)).toBe('planetary-sun-gemini-8')
    expect(degreeSpriteId('mars', 'aries', 3.7)).toBe('planetary-mars-aries-4')
  })

  it('rankPlanetsByDignity is sorted strongest-first and stable', () => {
    const ranked = rankPlanetsByDignity(FIXED)
    expect(ranked.length).toBeGreaterThan(0)
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.factor).toBeGreaterThanOrEqual(ranked[i]!.factor)
    }
    // every entry carries a usable sprite id + longitude
    for (const r of ranked) {
      expect(r.spriteId).toMatch(/^planetary-[a-z]+-[a-z]+-\d{1,2}$/)
      expect(r.longitude).toBeGreaterThanOrEqual(0)
      expect(r.longitude).toBeLessThan(360)
    }
  })

  it('getActiveAspects returns valid, orb-sorted aspects', () => {
    const aspects = getActiveAspects(FIXED)
    for (let i = 1; i < aspects.length; i++) {
      expect(aspects[i - 1]!.orb).toBeLessThanOrEqual(aspects[i]!.orb)
    }
    for (const a of aspects) {
      expect(a.a).not.toBe(a.b)
      expect(['conjunction', 'opposition', 'trine', 'square', 'sextile']).toContain(a.aspect)
      expect(a.aSprite).toMatch(/^planetary-/)
      expect(a.bSprite).toMatch(/^planetary-/)
    }
  })

  it('getWeeklyFeature is deterministic for a fixed date', () => {
    const a = JSON.stringify(getWeeklyFeature({ date: FIXED }))
    const b = JSON.stringify(getWeeklyFeature({ date: FIXED }))
    expect(a).toBe(b)
  })

  it('freeAgentIds = featured guides ∪ degree participants', () => {
    const candidates: GuideCandidate[] = [
      { id: 'fire-sage', element: 'Fire' },
      { id: 'earth-sage', element: 'Earth' },
      { id: 'air-sage', element: 'Air' },
      { id: 'water-sage', element: 'Water' },
    ]
    const f = getWeeklyFeature({ date: FIXED, guideCandidates: candidates })
    for (const id of f.featuredGuideIds) expect(f.freeAgentIds).toContain(id)
    for (const id of f.degreeParticipantIds) expect(f.freeAgentIds).toContain(id)
    // no duplicates
    expect(new Set(f.freeAgentIds).size).toBe(f.freeAgentIds.length)
  })

  it('selectFeaturedGuides picks from matching elements and rotates by week', () => {
    const candidates: GuideCandidate[] = [
      { id: 'fire-1', element: 'Fire' },
      { id: 'fire-2', element: 'Fire' },
      { id: 'earth-1', element: 'Earth' },
    ]
    const top = rankPlanetsByDignity(FIXED).slice(0, 3)
    const picks = selectFeaturedGuides(top, candidates, getWeekKey(FIXED))
    expect(picks.length).toBeGreaterThan(0)
    // every pick is a real candidate id, unique
    for (const id of picks) expect(candidates.map(c => c.id)).toContain(id)
    expect(new Set(picks).size).toBe(picks.length)

    // Different weeks can rotate the pick within a pool of >1.
    const wk1 = selectFeaturedGuides(top, candidates, '2026-05-25')
    const wk2 = selectFeaturedGuides(top, candidates, '2026-06-29')
    expect(wk1.length).toBeGreaterThan(0)
    expect(wk2.length).toBeGreaterThan(0)
  })

  it('selectFeaturedGuides returns nothing without candidates', () => {
    const top = rankPlanetsByDignity(FIXED).slice(0, 3)
    expect(selectFeaturedGuides(top, [], getWeekKey(FIXED))).toEqual([])
  })
})
