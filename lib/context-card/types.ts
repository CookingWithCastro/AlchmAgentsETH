export interface ContextCardBirth {
  handle: string
  date: string
  time: string
  tz: string
  utc: string
  place: string
  lat: string
  lon: string
  zodiac: string
  houseSystem: string
  ephemeris: string
  bigThree: { sun: string; moon: string; rising: string }
}

export interface ContextCardPlacement {
  body: string
  kind: 'planet' | 'point'
  sign: string
  deg: number
  house: number
  retro: boolean
  dignity?: string
}

export interface ContextCardHouse {
  house: number
  sign: string
  deg: number
  ruler: string
}

export interface ContextCardAspect {
  a: string
  b: string
  type: string
  orb: number
  applying: boolean
  klass: 'major' | 'minor'
}

export interface ContextCardSynthesis {
  dominantElement: string
  secondaryElement: string
  dominantModality: string
  chartShape: string
  shapeNote: string
  hemisphere: string
  chartRuler: string
  elementTally: Record<string, number>
  modalityTally: Record<string, number>
  signature: string
}

export interface ContextCardAlchm {
  elemental: Record<string, number>
  esms: { spirit: number; essence: number; matter: number; substance: number }
  kalchm: number
  monica: number
  thermodynamics: {
    heat: number
    entropy: number
    reactivity: number
    energy: number
    aNumber: number
  }
  sacred7: Record<string, number>
  planetary12: Record<string, number>
  note: string
}

export interface TransitAspect {
  t: string
  tRetro: boolean
  n: string
  type: string
  orb: number
}

export interface TransitMeta {
  when: string
  location: string
  planetaryHour: string
  moonPhase: string
  moonIllumination: number
  dominantPlanet: string
  dominantSign: string
}

export interface ContextCardTransits {
  meta: TransitMeta
  aspects: TransitAspect[]
}

export interface ContextCardData {
  birth: ContextCardBirth
  points: ContextCardPlacement[]
  houses: ContextCardHouse[]
  aspects: ContextCardAspect[]
  synthesis: ContextCardSynthesis
  alchm: ContextCardAlchm
  synopsis: string[]
  transits?: ContextCardTransits
}

export interface ExportOptions {
  promptHeader: boolean
  synopsis: boolean
  houses: boolean
  aspects: boolean
  minorAspects: boolean
  transits: boolean
  alchm: boolean
  annotated: boolean
}

export type ExportFormat = 'md' | 'txt' | 'json'

export const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

export const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
}

export const SIGN_MODALITIES: Record<string, string> = {
  Aries: 'Cardinal',
  Taurus: 'Fixed',
  Gemini: 'Mutable',
  Cancer: 'Cardinal',
  Leo: 'Fixed',
  Virgo: 'Mutable',
  Libra: 'Cardinal',
  Scorpio: 'Fixed',
  Sagittarius: 'Mutable',
  Capricorn: 'Cardinal',
  Aquarius: 'Fixed',
  Pisces: 'Mutable',
}

export const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
}

export const BODY_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Chiron: '⚷',
  'North Node': '☊',
  'South Node': '☋',
  Lilith: '⚸',
  Ascendant: 'AC',
  Midheaven: 'MC',
  Vertex: 'Vx',
  'Part of Fortune': '⊗',
}

export const ASPECT_SYMBOLS: Record<string, string> = {
  conjunction: '☌',
  sextile: '⚹',
  square: '□',
  trine: '△',
  opposition: '☍',
  quincunx: '⚻',
  semisextile: '⚺',
  semisquare: '∠',
  sesquiquadrate: '⚼',
  quintile: 'Q',
}

export const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0,
  semisextile: 30,
  semisquare: 45,
  sextile: 60,
  quintile: 72,
  square: 90,
  trine: 120,
  sesquiquadrate: 135,
  quincunx: 150,
  opposition: 180,
}

export const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#ef5d4e',
  Water: '#5e9bd6',
  Earth: '#8aa56a',
  Air: '#d9c87a',
}

export const PLANET_COLORS: Record<string, string> = {
  Sun: '#f5b542',
  Moon: '#cfd6e8',
  Mercury: '#9bd0ff',
  Venus: '#f4a8c8',
  Mars: '#ef5d4e',
  Jupiter: '#c89b6a',
  Saturn: '#8a8aa3',
  Uranus: '#7ad1c4',
  Neptune: '#7ea0e8',
  Pluto: '#8d7ab5',
}

export const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}
