// Planetary dignities and astrological lookup tables

export const CANONICAL_SIGNS = [
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
] as const

/** Canonical normalization helper to ensure case-insensitive sign matching */
export function normalizeSign(sign: string): string {
  if (!sign) return 'Aries'
  const clean = sign.trim().toLowerCase()
  const found = CANONICAL_SIGNS.find(s => s.toLowerCase() === clean)
  return found || 'Aries'
}

export const planetaryDignities = {
  Sun: {
    domicile: ['Leo'],
    exaltation: ['Aries'],
    detriment: ['Aquarius'],
    fall: ['Libra'],
  },
  Moon: {
    domicile: ['Cancer'],
    exaltation: ['Taurus'],
    detriment: ['Capricorn'],
    fall: ['Scorpio'],
  },
  Mercury: {
    domicile: ['Gemini', 'Virgo'],
    exaltation: ['Virgo'],
    detriment: ['Sagittarius', 'Pisces'],
    fall: ['Pisces'],
  },
  Venus: {
    domicile: ['Taurus', 'Libra'],
    exaltation: ['Pisces'],
    detriment: ['Scorpio', 'Aries'],
    fall: ['Virgo'],
  },
  Mars: {
    domicile: ['Aries', 'Scorpio'],
    exaltation: ['Capricorn'],
    detriment: ['Libra', 'Taurus'],
    fall: ['Cancer'],
  },
  Jupiter: {
    domicile: ['Sagittarius', 'Pisces'],
    exaltation: ['Cancer'],
    detriment: ['Gemini', 'Virgo'],
    fall: ['Capricorn'],
  },
  Saturn: {
    domicile: ['Capricorn', 'Aquarius'],
    exaltation: ['Libra'],
    detriment: ['Cancer', 'Leo'],
    fall: ['Aries'],
  },
  Uranus: {
    domicile: ['Aquarius'],
    exaltation: ['Scorpio'],
    detriment: ['Leo'],
    fall: ['Taurus'],
  },
  Neptune: {
    domicile: ['Pisces'],
    exaltation: ['Cancer'],
    detriment: ['Virgo'],
    fall: ['Capricorn'],
  },
  Pluto: {
    domicile: ['Scorpio'],
    exaltation: ['Leo'],
    detriment: ['Taurus'],
    fall: ['Aquarius'],
  },
}

export const signElements = {
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

export const signModalities = {
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

export const planetaryElements = {
  Sun: { diurnal: 'Fire', nocturnal: 'Fire' },
  Moon: { diurnal: 'Water', nocturnal: 'Water' },
  Mercury: { diurnal: 'Air', nocturnal: 'Earth' },
  Venus: { diurnal: 'Water', nocturnal: 'Earth' },
  Mars: { diurnal: 'Fire', nocturnal: 'Water' },
  Jupiter: { diurnal: 'Air', nocturnal: 'Fire' },
  Saturn: { diurnal: 'Air', nocturnal: 'Earth' },
  Uranus: { diurnal: 'Water', nocturnal: 'Air' },
  Neptune: { diurnal: 'Water', nocturnal: 'Water' },
  Pluto: { diurnal: 'Earth', nocturnal: 'Water' },
  Ascendant: { diurnal: 'Earth', nocturnal: 'Earth' },
}

export function getPlanetaryDignity(planet: string, sign: string): string {
  const normSign = normalizeSign(sign)
  const dignities = planetaryDignities[planet as keyof typeof planetaryDignities]

  if (!dignities) return 'peregrine'

  if (dignities.domicile.includes(normSign)) {
    return 'domicile'
  } else if (dignities.exaltation.includes(normSign)) {
    return 'exaltation'
  } else if (dignities.detriment.includes(normSign)) {
    return 'detriment'
  } else if (dignities.fall.includes(normSign)) {
    return 'fall'
  } else {
    return 'peregrine'
  }
}

export function getSignElement(sign: string): 'Fire' | 'Water' | 'Air' | 'Earth' | 'Unknown' {
  const normSign = normalizeSign(sign)
  return (signElements[normSign as keyof typeof signElements] || 'Unknown') as any
}

export function getSignModality(sign: string): 'Cardinal' | 'Fixed' | 'Mutable' | 'Unknown' {
  const normSign = normalizeSign(sign)
  return (signModalities[normSign as keyof typeof signModalities] || 'Unknown') as any
}

export function getPlanetaryElement(planet: string, isDiurnal: boolean = true): string {
  const planetElement = planetaryElements[planet as keyof typeof planetaryElements]
  if (!planetElement) return 'Unknown'
  return isDiurnal ? planetElement.diurnal : planetElement.nocturnal
}

export function calculateElementalAffinity(
  planet: string,
  sign: string,
  isDiurnal: boolean = true
): number {
  const signElement = getSignElement(sign)
  const planetElement = getPlanetaryElement(planet, isDiurnal)
  if (signElement === planetElement) return 0.9
  return 0.7
}

export function getDegreeMeaning(sign: string, degree: number): string {
  const normSign = normalizeSign(sign)
  const decanate = Math.ceil(degree / 10)
  return `${normSign} ${degree}° (${decanate}rd decanate)`
}

export function getDecan(degree: number): string {
  if (degree < 10) return '1st Decan'
  if (degree < 20) return '2nd Decan'
  return '3rd Decan'
}

export function getRulingPlanet(sign: string): string {
  const normSign = normalizeSign(sign)
  const rulerMap: Record<string, string> = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Pluto',
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Uranus',
    Pisces: 'Neptune',
  }
  return rulerMap[normSign] || 'Sun'
}
