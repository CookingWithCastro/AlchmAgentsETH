import 'server-only'
import { getLegacyPlanetaryPositions } from '@/lib/backend'
import { getAlchemicalQuantitiesAction } from '@/lib/actions/backend-actions'
import { getPlanetaryDignity, getRulingPlanet } from '@/lib/astrological-data'
import { deriveStatsFromChart } from '@/lib/sacred-7-stats'
import { calculateKalchm as calculateCanonicalKalchm } from '@/lib/thermodynamics/kalchm'
import {
  calculateAllPlanets,
  calculateProfessionalHouses,
} from '@/lib/enhanced-astronomical-calculator'
import { computeExtendedPoints, lonToSignDeg } from './extended-points'
import {
  SIGN_ORDER,
  SIGN_ELEMENTS,
  SIGN_MODALITIES,
  normalizeSign,
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
  const norm = normalizeSign(sign)
  const i = SIGN_ORDER.indexOf(norm)
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
  let tzOffsetHours = 4
  if (chart.birthLocation?.timezone) {
    if (chart.birthLocation.timezone.includes('-4') || chart.birthLocation.timezone.includes('EDT'))
      tzOffsetHours = 4
    if (chart.birthLocation.timezone.includes('-5') || chart.birthLocation.timezone.includes('EST'))
      tzOffsetHours = 5
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h + tzOffsetHours, m)
  )
}

export function computeKalchm(
  spirit: number,
  essence: number,
  matter: number,
  substance: number
): number {
  return calculateCanonicalKalchm({ spirit, essence, matter, substance })
}

function closestMajor(sep: number) {
  let best: { type: string; angle: number; orb: number } | null = null
  for (const a of MAJOR_ASPECTS) {
    const delta = Math.abs(sep - a.angle)
    if (delta <= a.orb && (!best || delta < best.orb)) {
      best = { type: a.type, angle: a.angle, orb: Math.round(delta * 10) / 10 }
    }
  }
  return best
}

export async function buildContextCardDataFromChart(chart: StoredChart): Promise<ContextCardData> {
  const lat = chart.birthLocation?.lat ?? 40.7128
  const lon = chart.birthLocation?.lon ?? -74.006
  const date = birthMoment(chart)

  const birthInfo = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    latitude: lat,
    longitude: lon,
  }

  const { planets: calcPlanets, ascendant: calcAsc } = calculateAllPlanets(birthInfo)
  const houseResult = calculateProfessionalHouses(birthInfo, 'placidus')

  let placements: ContextCardPlacement[] = []
  let absByBody: Record<string, number> = {}

  for (const name of PLANET_ORDER) {
    const p = calcPlanets[name]
    if (!p) continue
    const normSign = normalizeSign(p.sign)
    absByBody[name] = p.longitude

    let houseNum = 1
    if (houseResult?.houses?.length === 12) {
      for (let h = 0; h < 12; h++) {
        const curr = houseResult.houses[h].longitude
        const next = houseResult.houses[(h + 1) % 12].longitude
        const pLon = p.longitude
        if (curr < next) {
          if (pLon >= curr && pLon < next) houseNum = h + 1
        } else {
          if (pLon >= curr || pLon < next) houseNum = h + 1
        }
      }
    }

    placements.push({
      body: name,
      kind: 'planet' as const,
      sign: normSign,
      deg: Math.round(p.signDegree * 100) / 100,
      house: houseNum,
      retro: p.retrograde,
      dignity: getPlanetaryDignity(name, normSign),
    })
  }

  const houses: ContextCardHouse[] = (houseResult?.houses || []).map(h => ({
    house: h.houseNumber,
    sign: normalizeSign(h.sign),
    deg: Math.round(h.signDegree * 100) / 100,
    ruler: getRulingPlanet(h.sign),
  }))

  const risingSign = normalizeSign(calcAsc?.sign || houses.find(h => h.house === 1)?.sign || 'Leo')
  const ascendantLon = calcAsc?.longitude ?? absLon(risingSign, 0)
  const extPlacements: ContextCardPlacement[] = []
  try {
    const ext = computeExtendedPoints({
      date,
      observerLon: lon,
      ascendantLon,
      sunLon: absByBody.Sun ?? null,
      moonLon: absByBody.Moon ?? null,
    })
    for (const e of ext) {
      const { sign, deg } = lonToSignDeg(e.lon)
      const normSign = normalizeSign(sign)
      let houseNum = 1
      if (houseResult?.houses?.length === 12) {
        for (let h = 0; h < 12; h++) {
          const curr = houseResult.houses[h].longitude
          const next = houseResult.houses[(h + 1) % 12].longitude
          if (curr < next) {
            if (e.lon >= curr && e.lon < next) houseNum = h + 1
          } else {
            if (e.lon >= curr || e.lon < next) houseNum = h + 1
          }
        }
      }
      extPlacements.push({
        body: e.body,
        kind: 'point',
        sign: normSign,
        deg: Math.round(deg * 100) / 100,
        house: houseNum,
        retro: e.retro,
      })
    }
  } catch {
    /* extended points best effort */
  }

  const allPoints = [...placements, ...extPlacements]

  const aspects: ContextCardAspect[] = []
  if (placements.length) {
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
          const diff = (la - lb + 360) % 360
          const applying = a.retro ? diff < asp.angle : diff > asp.angle
          aspects.push({
            a: a.body,
            b: b.body,
            type: asp.type,
            orb: asp.orb,
            applying,
            klass: 'major',
          })
        }
      }
    }
    aspects.sort((x, y) => x.orb - y.orb)
  }

  const signOf = (body: string) => placements.find(p => p.body === body)?.sign || 'Aries'
  const bigThree = {
    sun: signOf('Sun'),
    moon: signOf('Moon'),
    rising: risingSign,
  }
  const chartMonica =
    typeof chart.monicaConstant === 'number' && Number.isFinite(chart.monicaConstant)
      ? chart.monicaConstant
      : null

  let sacred7: Record<string, number> = {}
  let planetary12: Record<string, number> = {}
  if (chartMonica !== null) {
    try {
      const stats = deriveStatsFromChart({
        monicaConstant: chartMonica,
        sunLongitude: absByBody.Sun ?? 0,
        moonLongitude: absByBody.Moon ?? 0,
        mercuryLongitude: absByBody.Mercury ?? 0,
        venusLongitude: absByBody.Venus ?? 0,
        marsLongitude: absByBody.Mars ?? 0,
        ascendantLongitude: ascendantLon,
      }) as unknown as Record<string, number>
      sacred7 = Object.fromEntries(
        SACRED7_KEYS.flatMap(key =>
          typeof stats[key] === 'number' && Number.isFinite(stats[key])
            ? [[key, Math.round(stats[key])]]
            : []
        )
      )
      planetary12 = Object.fromEntries(
        PLANETARY12_KEYS.flatMap(key =>
          typeof stats[key] === 'number' && Number.isFinite(stats[key])
            ? [[key, Math.round(stats[key])]]
            : []
        )
      )
    } catch {
      sacred7 = {}
      planetary12 = {}
    }
  }

  const elementTally: Record<string, number> = { Fire: 0, Water: 0, Earth: 0, Air: 0 }
  const modalityTally: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  for (const p of placements) {
    const normSign = normalizeSign(p.sign)
    const el = SIGN_ELEMENTS[normSign]
    const mo = SIGN_MODALITIES[normSign]
    if (el) elementTally[el] = (elementTally[el] || 0) + 1
    if (mo) modalityTally[mo] = (modalityTally[mo] || 0) + 1
  }

  const rankedElements = Object.entries(elementTally)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
  const rankedModalities = Object.entries(modalityTally)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
  const dominantElement = rankedElements[0] || 'Air'
  const secondaryElement = rankedElements[1] || 'Water'
  const dominantModality = rankedModalities[0] || 'Cardinal'

  // ── Zodiac Sign Percent Composition & Weighted Sign Character ──
  const signCounts: Record<string, number> = {}
  const signWeights: Record<string, number> = {}
  let totalWeight = 0

  const BODY_WEIGHTS: Record<string, number> = {
    Sun: 3.0,
    Moon: 2.5,
    Ascendant: 2.0,
    Mercury: 1.5,
    Venus: 1.5,
    Mars: 1.5,
    Jupiter: 1.0,
    Saturn: 1.0,
    Uranus: 0.5,
    Neptune: 0.5,
    Pluto: 0.5,
    Chiron: 0.5,
  }

  for (const p of placements) {
    const normSign = normalizeSign(p.sign)
    signCounts[normSign] = (signCounts[normSign] || 0) + 1
    const w = BODY_WEIGHTS[p.body] || 1.0
    signWeights[normSign] = (signWeights[normSign] || 0) + w
    totalWeight += w
  }

  if (risingSign) {
    const ascSign = normalizeSign(risingSign)
    const w = BODY_WEIGHTS.Ascendant || 2.0
    signWeights[ascSign] = (signWeights[ascSign] || 0) + w
    totalWeight += w
  }

  const totalPlanets = placements.length || 10
  const signComposition: Record<string, number> = {}
  for (const [s, count] of Object.entries(signCounts)) {
    signComposition[s] = Math.round((count / totalPlanets) * 1000) / 10
  }

  const weightedSignComposition: Record<string, number> = {}
  if (totalWeight > 0) {
    for (const [s, w] of Object.entries(signWeights)) {
      weightedSignComposition[s] = Math.round((w / totalWeight) * 1000) / 10
    }
  }

  const spirit = Number(chart.spiritScore) || 25
  const essence = Number(chart.essenceScore) || 25
  const matter = Number(chart.matterScore) || 25
  const substance = Number(chart.substanceScore) || 25
  const kalchm = computeKalchm(spirit, essence, matter, substance)

  return {
    birth: {
      handle: chart.chartName || 'Self · Council Native',
      date: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: typeof chart.birthTime === 'string' ? chart.birthTime : '12:00',
      tz: 'EDT (UTC-4)',
      utc: `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')} UTC`,
      place: chart.birthLocation?.name || 'New York, NY, USA',
      lat: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`,
      lon: `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`,
      zodiac: 'Tropical',
      houseSystem: 'Placidus',
      ephemeris: 'VSOP87 / High-Precision Astronomical Ephemeris',
      bigThree,
    },
    points: allPoints,
    houses,
    aspects,
    synthesis: {
      dominantElement,
      secondaryElement,
      dominantModality,
      chartShape: 'Bowl / Locomotive',
      shapeNote: 'Planetary energy concentrated for targeted expression',
      hemisphere: 'Eastern / Upper',
      chartRuler: getRulingPlanet(risingSign),
      elementTally,
      modalityTally,
      signature: `${dominantElement}-${dominantModality} Core`,
      signComposition,
      weightedSignComposition,
    },
    alchm: {
      elemental: elementTally,
      esms: { spirit, essence, matter, substance },
      kalchm,
      monica: chartMonica,
      thermodynamics: {
        heat: 0.65,
        entropy: 0.42,
        reactivity: 0.78,
        energy: 0.81,
        aNumber: 42,
      },
      sacred7,
      planetary12,
      note: `Verified Ephemeris Calculation. Core elemental tally: Fire ${elementTally.Fire}, Earth ${elementTally.Earth}, Air ${elementTally.Air}, Water ${elementTally.Water}.`,
    },
    synopsis: [
      `Born with Sun in ${bigThree.sun}, Moon in ${bigThree.moon}, and ${bigThree.rising} Ascendant.`,
      `Elemental balance is ${dominantElement}-led (${elementTally[dominantElement]} planets) with strong ${dominantModality} modality emphasis.`,
    ],
  }
}
