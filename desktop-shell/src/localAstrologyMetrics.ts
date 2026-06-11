export type LocalElementCounts = Record<'Fire' | 'Water' | 'Air' | 'Earth', number>

export interface LocalAstrologyMetrics {
  quantities: {
    Spirit: number
    Essence: number
    Matter: number
    Substance: number
    ANumber: number
    dominantElement: string
    elementalBalance: Record<string, number>
    heat: number
    entropy: number
    reactivity: number
    energy: number
    kineticPressure: number
    harmonicFlow: number
  }
  planetaryHour: {
    dayRuler: string
    current: string
    hourNumber: number
    method: string
  }
}

const DAY_RULERS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

function round(value: number, digits = 3) {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export function buildLocalAstrologyMetrics(
  date: Date,
  dominantElement: string,
  elementCounts: LocalElementCounts,
  aspectCount: number
): LocalAstrologyMetrics {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000)
  const timeOfDay = date.getUTCHours() + date.getUTCMinutes() / 60

  const Spirit = 3 + Math.sin((dayOfYear / 365) * 2 * Math.PI) * 2
  const Essence = 3 + Math.cos((timeOfDay / 24) * 2 * Math.PI) * 2
  const Matter = 3 + Math.sin(((dayOfYear + 91) / 365) * 2 * Math.PI) * 2
  const Substance = 3 + Math.cos(((timeOfDay + 6) / 24) * 2 * Math.PI) * 2
  const ANumber = Spirit + Essence + Matter + Substance
  const heat = (Spirit * Spirit + 1) / (Essence + Matter + Substance + 1)
  const entropy = (Spirit * Spirit + Substance * Substance + 1) / (Essence + Matter + 1)
  const reactivity =
    (Spirit * Spirit + Substance * Substance + Essence * Essence + 1) / (Matter + 1)
  const energy = heat - reactivity * entropy
  const totalElements = Math.max(
    1,
    Object.values(elementCounts).reduce((sum, value) => sum + value, 0)
  )

  const dayRuler = DAY_RULERS[date.getUTCDay()]
  const dayStart = CHALDEAN_ORDER.indexOf(dayRuler)
  const hourNumber = date.getUTCHours() + 1
  const current = CHALDEAN_ORDER[(dayStart + hourNumber - 1) % CHALDEAN_ORDER.length]

  return {
    quantities: {
      Spirit: round(Spirit, 2),
      Essence: round(Essence, 2),
      Matter: round(Matter, 2),
      Substance: round(Substance, 2),
      ANumber: round(ANumber, 2),
      dominantElement,
      elementalBalance: Object.fromEntries(
        Object.entries(elementCounts).map(([element, count]) => [
          element,
          round((count / totalElements) * 100, 1),
        ])
      ),
      heat: round(heat),
      entropy: round(entropy),
      reactivity: round(reactivity),
      energy: round(energy),
      kineticPressure: aspectCount,
      harmonicFlow: round(Math.max(0, 1 - aspectCount / 20)),
    },
    planetaryHour: {
      dayRuler,
      current,
      hourNumber,
      method: 'Local UTC Chaldean approximation',
    },
  }
}
