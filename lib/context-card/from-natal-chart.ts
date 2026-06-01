import 'server-only'
import { getLegacyPlanetaryPositions } from '@/lib/backend'
import { getAlchemicalQuantitiesAction } from '@/lib/actions/backend-actions'
import { getPlanetaryDignity, getRulingPlanet } from '@/lib/astrological-data'
import { deriveStatsFromChart } from '@/lib/sacred-7-stats'
import { computeExtendedPoints, lonToSignDeg } from './extended-points'
import {
  SIGN_ORDER,
  SIGN_ELEMENTS,
  SIGN_MODALITIES,
  type ContextCardAspect,
  type ContextCardData,
  type ContextCardHouse,
  type ContextCardPlacement,
} from './types'

const SACRED7_KEYS = [
  'power',
  'resonance',
  'wisdom',
  'charisma',
  'intuition',
  'adaptability',
  'vitality',
] as const
const PLANETARY12_KEYS = [
  'solarAgency',
  'lunarReceptivity',
  'mercurialVelocity',
  'venusianCoherence',
  'martialImpetus',
  'jovianExpansion',
  'saturnianStructure',
  'chironicAdaptation',
  'uranianSurprisal',
  'neptunianResonance',
  'plutonicIntegration',
  'kineticAlignment',
] as const

/** Loose view of the stored chart — JSON fields are `any` in the DB. */
interface StoredChart {
  chartName?: string
  birthDate?: Date | string
  birthTime?: string
  birthLocation?: { name?: string; lat?: number; lon?: number; timezone?: string } | null
  planets?: unknown
  houses?: unknown
  monicaConstant?: number
  dominantElement?: string
  dominantModality?: string
  spiritScore?: number
  essenceScore?: number
  matterScore?: number
  substanceScore?: number
}

const PLANET_ORDER = [
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
]

const signIdx = (sign: string) => {
  const i = SIGN_ORDER.indexOf(sign)
  return i < 0 ? 0 : i
}
const absLon = (sign: string, deg: number) => signIdx(sign) * 30 + deg

const MAJOR_ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'sextile', angle: 60, orb: 5 },
]

function fmtCoord(v: number | undefined, posSuffix: string, negSuffix: string): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  const s = v >= 0 ? posSuffix : negSuffix
  return `${Math.abs(v).toFixed(4)}°${s}`
}

function birthMoment(chart: StoredChart): Date {
  const d = chart.birthDate ? new Date(chart.birthDate) : new Date()
  let h = 12
  let m = 0
  if (typeof chart.birthTime === 'string') {
    const match = chart.birthTime.match(/(\d{1,2}):(\d{2})/)
    if (match) {
      h = parseInt(match[1], 10)
      m = parseInt(match[2], 10)
    }
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m))
}

function computeKalchm(spirit: number, essence: number, matter: number, substance: number): number {
  const num = Math.pow(spirit, spirit) * Math.pow(essence, essence)
  const den = Math.pow(matter, matter) * Math.pow(substance, substance)
  const k = num / den
  return Number.isFinite(k) && !Number.isNaN(k) ? Math.round(k * 100) / 100 : 1.0
}

function closestMajor(sep: number) {
  let best: { type: string; orb: number } | null = null
  for (const a of MAJOR_ASPECTS) {
    const delta = Math.abs(sep - a.angle)
    if (delta <= a.orb && (!best || delta < best.orb)) {
      best = { type: a.type, orb: Math.round(delta * 10) / 10 }
    }
  }
  return best
}

/**
 * Maps a signed-in user's stored natal chart into the rich ContextCardData the
 * card renders. The persisted chart only reliably stores per-planet sign +
 * retrograde, equal-house cusps, and the real alchm scores — so accurate
 * degrees and aspects are recomputed from the stored birth date/time/place via
 * the same backend ephemeris the rest of the app uses. Everything degrades
 * gracefully: if the backend is unreachable, the card still renders from stored
 * signs and the real alchm layer.
 */
export async function buildContextCardDataFromChart(chart: StoredChart): Promise<ContextCardData> {
  const lat = chart.birthLocation?.lat
  const lon = chart.birthLocation?.lon

  // ── placements: recompute accurate positions, fall back to stored signs ──
  let placements: ContextCardPlacement[] = []
  let absByBody: Record<string, number> = {}

  try {
    const raw = await getLegacyPlanetaryPositions(birthMoment(chart), lat, lon)
    const byName = Object.fromEntries((raw || []).map(p => [p.name, p]))
    placements = PLANET_ORDER.filter(name => byName[name] && byName[name].sign).map(name => {
      const p = byName[name]
      absByBody[name] =
        typeof p.longitude === 'number' && p.longitude > 0 ? p.longitude : absLon(p.sign, p.degree)
      return {
        body: name,
        kind: 'planet' as const,
        sign: p.sign,
        deg: p.degree,
        house: 0,
        retro: p.isRetrograde,
        dignity: getPlanetaryDignity(name, p.sign),
      }
    })
  } catch {
    /* fall through to stored */
  }

  if (!placements.length && Array.isArray(chart.planets)) {
    const stored = chart.planets as Array<{ label?: string; sign?: string; retrograde?: boolean }>
    placements = stored
      .filter(p => p.label && p.sign && PLANET_ORDER.includes(p.label))
      .map(p => {
        absByBody[p.label as string] = absLon(p.sign as string, 0)
        return {
          body: p.label as string,
          kind: 'planet' as const,
          sign: p.sign as string,
          deg: 0,
          house: 0,
          retro: !!p.retrograde,
          dignity: getPlanetaryDignity(p.label as string, p.sign as string),
        }
      })
  }

  // ── houses (equal-house cusps as stored) + derived rulers ──
  const storedHouses = Array.isArray(chart.houses)
    ? (chart.houses as Array<{ number?: number; sign?: string; degree?: number }>)
    : []
  const houses: ContextCardHouse[] = storedHouses
    .filter(h => typeof h.number === 'number' && h.sign)
    .map(h => ({
      house: h.number as number,
      sign: h.sign as string,
      deg: typeof h.degree === 'number' ? h.degree : 0,
      ruler: getRulingPlanet(h.sign as string),
    }))
    .sort((a, b) => a.house - b.house)

  const risingSign = houses.find(h => h.house === 1)?.sign || ''

  // equal-house assignment for each placement (each house = one sign from the Ascendant)
  if (risingSign) {
    const riseIdx = signIdx(risingSign)
    for (const p of placements) {
      p.house = ((signIdx(p.sign) - riseIdx + 12) % 12) + 1
    }
  }

  // ── extended points (computed; the storage pipeline never stores these) ──
  const risingDeg = houses.find(h => h.house === 1)?.deg ?? 0
  const ascendantLon = risingSign ? absLon(risingSign, risingDeg) : null
  const extPlacements: ContextCardPlacement[] = []
  try {
    const ext = computeExtendedPoints({
      date: birthMoment(chart),
      observerLon: lon,
      ascendantLon,
      sunLon: absByBody.Sun ?? null,
      moonLon: absByBody.Moon ?? null,
    })
    const riseIdx = risingSign ? signIdx(risingSign) : -1
    for (const e of ext) {
      const { sign, deg } = lonToSignDeg(e.lon)
      const house =
        e.body === 'Ascendant' ? 1 : riseIdx >= 0 ? ((signIdx(sign) - riseIdx + 12) % 12) + 1 : 0
      extPlacements.push({ body: e.body, kind: 'point', sign, deg, house, retro: e.retro })
    }
  } catch {
    /* extended points are best-effort */
  }

  // ── natal aspects from recomputed longitudes ──
  const aspects: ContextCardAspect[] = []
  if (placements.length && Object.keys(absByBody).length >= placements.length) {
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i]
        const b = placements[j]
        const la = absByBody[a.body]
        const lb = absByBody[b.body]
        if (la == null || lb == null) continue
        let sep = Math.abs(la - lb) % 360
        if (sep > 180) sep = 360 - sep
        const asp = closestMajor(sep)
        if (asp) {
          aspects.push({
            a: a.body,
            b: b.body,
            type: asp.type,
            orb: asp.orb,
            applying: false,
            klass: 'major',
          })
        }
      }
    }
    aspects.sort((x, y) => x.orb - y.orb)
  }

  // ── big three ──
  const signOf = (body: string) => placements.find(p => p.body === body)?.sign || ''
  const bigThree = {
    sun: signOf('Sun') || '—',
    moon: signOf('Moon') || '—',
    rising: risingSign || '—',
  }

  // ── per-user Sacred 7 / Planetary 12 derived from the chart ──
  let sacred7: Record<string, number> = {}
  let planetary12: Record<string, number> = {}
  try {
    const stats = deriveStatsFromChart({
      monicaConstant: Number(chart.monicaConstant) || 0,
      sunLongitude: absByBody.Sun ?? 0,
      moonLongitude: absByBody.Moon ?? 0,
      mercuryLongitude: absByBody.Mercury ?? 0,
      venusLongitude: absByBody.Venus ?? 0,
      marsLongitude: absByBody.Mars ?? 0,
      ascendantLongitude: ascendantLon ?? 0,
    }) as unknown as Record<string, number>
    sacred7 = Object.fromEntries(SACRED7_KEYS.map(k => [k, Math.round(stats[k] ?? 0)]))
    planetary12 = Object.fromEntries(PLANETARY12_KEYS.map(k => [k, Math.round(stats[k] ?? 0)]))
  } catch {
    /* leave empty — the alchm block degrades to no stat bars */
  }

  // ── element / modality tallies across the planets ──
  const elementTally: Record<string, number> = { Fire: 0, Water: 0, Earth: 0, Air: 0 }
  const modalityTally: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  for (const p of placements) {
    const el = SIGN_ELEMENTS[p.sign]
    const mo = SIGN_MODALITIES[p.sign]
    if (el) elementTally[el] += 1
    if (mo) modalityTally[mo] += 1
  }
  const rankedElements = Object.entries(elementTally)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
  const rankedModalities = Object.entries(modalityTally)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
  const dominantElement = chart.dominantElement || rankedElements[0] || 'Air'
  const secondaryElement =
    rankedElements.find(e => e !== dominantElement) || rankedElements[1] || 'Water'
  const dominantModality = chart.dominantModality || rankedModalities[0] || 'Cardinal'

  // elemental balance (% of placements by element)
  const total = placements.length || 1
  const elemental: Record<string, number> = {
    Fire: Math.round((elementTally.Fire / total) * 100),
    Water: Math.round((elementTally.Water / total) * 100),
    Earth: Math.round((elementTally.Earth / total) * 100),
    Air: Math.round((elementTally.Air / total) * 100),
  }

  // ── alchm layer from the real stored scores ──
  const round1 = (n: number | undefined, d = 0) =>
    typeof n === 'number' && Number.isFinite(n)
      ? Math.round(n * Math.pow(10, d)) / Math.pow(10, d)
      : 0
  const esms = {
    spirit: round1(chart.spiritScore),
    essence: round1(chart.essenceScore),
    matter: round1(chart.matterScore),
    substance: round1(chart.substanceScore),
  }
  const monica = round1(chart.monicaConstant, 2)
  const kalchm = computeKalchm(
    esms.spirit || 1,
    esms.essence || 1,
    esms.matter || 1,
    esms.substance || 1
  )

  // thermodynamics — best-effort from the alchemize backend for the birth moment
  const thermodynamics = { heat: 0, entropy: 0, reactivity: 0, energy: 0, aNumber: 0 }
  try {
    const q = (await getAlchemicalQuantitiesAction(
      true,
      birthMoment(chart).toISOString(),
      lat,
      lon
    )) as Record<string, unknown>
    if (q && !('error' in q)) {
      thermodynamics.heat = round1(q.Heat as number, 2)
      thermodynamics.entropy = round1(q.Entropy as number, 2)
      thermodynamics.reactivity = round1(q.Reactivity as number, 2)
      thermodynamics.energy = round1(q.Energy as number, 2)
      thermodynamics.aNumber = round1((q['A-Number'] ?? q.aNumber) as number, 2)
    }
  } catch {
    /* leave zeros */
  }

  // ── templated synopsis (authored prose isn't stored per-user) ──
  const synopsis: string[] = []
  if (bigThree.sun !== '—') {
    const topQuad =
      Object.entries(esms).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ||
      'substance'
    synopsis.push(
      `A ${bigThree.sun} Sun${bigThree.moon !== '—' ? ` with a ${bigThree.moon} Moon` : ''}${
        bigThree.rising !== '—' ? ` and ${bigThree.rising} rising` : ''
      } — the core signature this whole profile is read from.`
    )
    synopsis.push(
      `The chart leans ${dominantElement} over ${secondaryElement}, in a predominantly ${dominantModality} key. In alchm terms ${topQuad} runs highest in the ESMS quad, with a Kalchm of ${kalchm} against a Monica of ${monica}.`
    )
  }

  // ── birth identity ──
  const bd = chart.birthDate ? new Date(chart.birthDate) : null
  const birth = {
    handle: chart.chartName || 'Your Chart',
    date: bd
      ? bd.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '—',
    time: chart.birthTime && chart.birthTime !== 'unknown' ? chart.birthTime : 'time unknown',
    tz: chart.birthLocation?.timezone || '',
    utc: '',
    place: chart.birthLocation?.name || '—',
    lat: fmtCoord(lat, 'N', 'S'),
    lon: fmtCoord(lon, 'E', 'W'),
    zodiac: 'Tropical',
    houseSystem: 'Equal',
    ephemeris: 'alchm.kitchen',
    bigThree,
  }

  return {
    birth,
    points: [...placements, ...extPlacements], // 10 planets + computed extended points
    houses,
    aspects,
    synthesis: {
      dominantElement,
      secondaryElement,
      dominantModality,
      chartShape: '—',
      shapeNote: '',
      hemisphere: '—',
      chartRuler: risingSign
        ? `${getRulingPlanet(risingSign)} (ruler of ${risingSign} rising)`
        : '—',
      elementTally,
      modalityTally,
      signature: `${dominantElement}-led, ${dominantModality}-keyed`,
    },
    alchm: {
      elemental,
      esms,
      kalchm,
      monica,
      thermodynamics,
      sacred7,
      planetary12,
      note:
        'alchm.kitchen derives the ESMS quad, Kalchm and Monica constants from your natal chart. ' +
        'ESMS = Spirit/Essence/Matter/Substance. Thermodynamics: Energy = Heat − Reactivity×Entropy; A# = total alchemical power.',
    },
    synopsis,
  }
}
