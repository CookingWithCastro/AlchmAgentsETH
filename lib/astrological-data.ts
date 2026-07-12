// Planetary dignities data
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
    exaltation: ['Virgo'], // Some traditions
    detriment: ['Sagittarius', 'Pisces'],
    fall: ['Pisces'], // Some traditions
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
    domicile: ['Aquarius'], // Modern rulership
    exaltation: ['Scorpio'], // Some modern systems
    detriment: ['Leo'],
    fall: ['Taurus'],
  },
  Neptune: {
    domicile: ['Pisces'], // Modern rulership
    exaltation: ['Cancer'], // Some modern systems
    detriment: ['Virgo'],
    fall: ['Capricorn'],
  },
  Pluto: {
    domicile: ['Scorpio'], // Modern rulership
    exaltation: ['Leo'], // Some modern systems
    detriment: ['Taurus'],
    fall: ['Aquarius'],
  },
}

// Zodiac sign elements
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

// Zodiac sign modalities
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

// Planetary elemental associations (diurnal/nocturnal)
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

// Get the dignity of a planet in a specific sign
export function getPlanetaryDignity(planet: string, sign: string): string {
  const dignities = planetaryDignities[planet as keyof typeof planetaryDignities]

  if (!dignities) return 'peregrine'

  if (dignities.domicile.includes(sign)) {
    return 'domicile'
  } else if (dignities.exaltation.includes(sign)) {
    return 'exaltation'
  } else if (dignities.detriment.includes(sign)) {
    return 'detriment'
  } else if (dignities.fall.includes(sign)) {
    return 'fall'
  } else {
    return 'peregrine'
  }
}

// Get the element of a sign
export function getSignElement(sign: string): 'Fire' | 'Water' | 'Air' | 'Earth' | 'Unknown' {
  return (signElements[sign as keyof typeof signElements] || 'Unknown') as
    | 'Fire'
    | 'Water'
    | 'Air'
    | 'Earth'
    | 'Unknown'
}

// Get the modality of a sign
export function getSignModality(sign: string): 'Cardinal' | 'Fixed' | 'Mutable' | 'Unknown' {
  return (signModalities[sign as keyof typeof signModalities] || 'Unknown') as
    | 'Cardinal'
    | 'Fixed'
    | 'Mutable'
    | 'Unknown'
}

// Get the planetary element based on time of day
export function getPlanetaryElement(planet: string, isDiurnal: boolean = true): string {
  const planetElement = planetaryElements[planet as keyof typeof planetaryElements]
  if (!planetElement) return 'Unknown'

  return isDiurnal ? planetElement.diurnal : planetElement.nocturnal
}

// Calculate elemental affinity between a planet and its sign
export function calculateElementalAffinity(
  planet: string,
  sign: string,
  isDiurnal: boolean = true
): number {
  const signElement = getSignElement(sign)
  const planetElement = getPlanetaryElement(planet, isDiurnal)

  // Same element has highest affinity
  if (signElement === planetElement) {
    return 0.9
  }

  // All elements work well together according to elementallogic
  return 0.7
}

// Get specific degree meanings (simplified example)
export function getDegreeMeaning(sign: string, degree: number): string {
  // This would be expanded with actual degree meanings from traditional sources
  const decanate = Math.ceil(degree / 10)
  return `${sign} ${degree}° (${decanate}rd decanate)`
}

// Calculate decan based on degree
export function getDecan(degree: number): string {
  if (degree < 10) return '1st Decan'
  if (degree < 20) return '2nd Decan'
  return '3rd Decan'
}

// Get the ruling planet of a sign
export function getRulingPlanet(sign: string): string {
  const rulerMap: Record<string, string> = {
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Mars', // Traditional ruler (or Pluto in modern)
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Saturn', // Traditional ruler (or Uranus in modern)
    Pisces: 'Jupiter', // Traditional ruler (or Neptune in modern)
  }

  return rulerMap[sign] || 'Unknown'
}
