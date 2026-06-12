// Alchemizer Engine
// This module implements the core alchemical calculation system

import { performanceCache, createBirthInfoHash } from './performance-cache'
import { generateAccurateHoroscope } from './monica/horoscope-generator'
import { recordElementalLogicMode } from './observability'

// Zodiac signs indexed by number
export const signs: Record<number, string> = {
  0: 'Aries',
  1: 'Taurus',
  2: 'Gemini',
  3: 'Cancer',
  4: 'Leo',
  5: 'Virgo',
  6: 'Libra',
  7: 'Scorpio',
  8: 'Sagittarius',
  9: 'Capricorn',
  10: 'Aquarius',
  11: 'Pisces',
}

// Reverse mapping for convenience
export const signIndices: Record<string, number> = Object.entries(signs).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: parseInt(key) }),
  {}
)

// Planet information including dignity effects and elemental properties
export const planetInfo: Record<string, any> = {
  Sun: {
    'Dignity Effect': {
      Leo: 1,
      Aries: 2,
      Aquarius: -1,
      Libra: -2,
    },
    Elements: ['Fire', 'Fire'],
    Alchemy: {
      Spirit: 1,
      Essence: 0,
      Matter: 0,
      Substance: 0,
    },
    'Diurnal Element': 'Fire',
    'Nocturnal Element': 'Fire',
  },
  Moon: {
    'Dignity Effect': {
      Cancer: 1,
      Taurus: 2,
      Capricorn: -1,
      Scorpio: -2,
    },
    Elements: ['Water', 'Water'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Water',
    'Nocturnal Element': 'Water',
  },
  Mercury: {
    'Dignity Effect': {
      Gemini: 1,
      Virgo: 3,
      Sagittarius: 1,
      Pisces: -3,
    },
    Elements: ['Air', 'Earth'],
    Alchemy: {
      Spirit: 1,
      Essence: 0,
      Matter: 0,
      Substance: 1,
    },
    'Diurnal Element': 'Air',
    'Nocturnal Element': 'Earth',
  },
  Venus: {
    'Dignity Effect': {
      Libra: 1,
      Taurus: 1,
      Pisces: 2,
      Aries: -1,
      Scorpio: -1,
      Virgo: -2,
    },
    Elements: ['Water', 'Earth'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Water',
    'Nocturnal Element': 'Earth',
  },
  Mars: {
    'Dignity Effect': {
      Aries: 1,
      Scorpio: 1,
      Capricorn: 2,
      Taurus: -1,
      Libra: -1,
      Cancer: -2,
    },
    Elements: ['Fire', 'Water'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Fire',
    'Nocturnal Element': 'Water',
  },
  Jupiter: {
    'Dignity Effect': {
      Pisces: 1,
      Sagittarius: 1,
      Cancer: 2,
      Gemini: -1,
      Virgo: -1,
      Capricorn: -2,
    },
    Elements: ['Air', 'Fire'],
    Alchemy: {
      Spirit: 1,
      Essence: 1,
      Matter: 0,
      Substance: 0,
    },
    'Diurnal Element': 'Air',
    'Nocturnal Element': 'Fire',
  },
  Saturn: {
    'Dignity Effect': {
      Aquarius: 1,
      Capricorn: 1,
      Libra: 2,
      Cancer: -1,
      Leo: -1,
      Aries: -2,
    },
    Elements: ['Air', 'Earth'],
    Alchemy: {
      Spirit: 1,
      Essence: 0,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Air',
    'Nocturnal Element': 'Earth',
  },
  Uranus: {
    'Dignity Effect': {
      Aquarius: 1,
      Scorpio: 2,
      Taurus: -3,
    },
    Elements: ['Water', 'Air'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Water',
    'Nocturnal Element': 'Air',
  },
  Neptune: {
    'Dignity Effect': {
      Pisces: 1,
      Cancer: 2,
      Virgo: -1,
      Capricorn: -2,
    },
    Elements: ['Water', 'Water'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 0,
      Substance: 1,
    },
    'Diurnal Element': 'Water',
    'Nocturnal Element': 'Water',
  },
  Pluto: {
    'Dignity Effect': {
      Scorpio: 1,
      Leo: 2,
      Taurus: -1,
      Aquarius: -2,
    },
    Elements: ['Earth', 'Water'],
    Alchemy: {
      Spirit: 0,
      Essence: 1,
      Matter: 1,
      Substance: 0,
    },
    'Diurnal Element': 'Earth',
    'Nocturnal Element': 'Water',
  },
  Ascendant: {
    'Diurnal Element': 'Earth',
    'Nocturnal Element': 'Earth',
  },
}

// Sign information
export const signInfo: Record<string, any> = {
  Aries: {
    Element: 'Fire',
    Ruler: 'Mars',
    Modality: 'Cardinal',
  },
  Taurus: {
    Element: 'Earth',
    Ruler: 'Venus',
    Modality: 'Fixed',
  },
  Gemini: {
    Element: 'Air',
    Ruler: 'Mercury',
    Modality: 'Mutable',
  },
  Cancer: {
    Element: 'Water',
    Ruler: 'Moon',
    Modality: 'Cardinal',
  },
  Leo: {
    Element: 'Fire',
    Ruler: 'Sun',
    Modality: 'Fixed',
  },
  Virgo: {
    Element: 'Earth',
    Ruler: 'Mercury',
    Modality: 'Mutable',
  },
  Libra: {
    Element: 'Air',
    Ruler: 'Venus',
    Modality: 'Cardinal',
  },
  Scorpio: {
    Element: 'Water',
    Ruler: 'Mars',
    Modality: 'Fixed',
  },
  Sagittarius: {
    Element: 'Fire',
    Ruler: 'Jupiter',
    Modality: 'Mutable',
  },
  Capricorn: {
    Element: 'Earth',
    Ruler: 'Saturn',
    Modality: 'Cardinal',
  },
  Aquarius: {
    Element: 'Air',
    Ruler: 'Saturn',
    Modality: 'Fixed',
  },
  Pisces: {
    Element: 'Water',
    Ruler: 'Jupiter',
    Modality: 'Mutable',
  },
}

// Helper function to capitalize strings
export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

// Create an empty element object
export function createElementObject(): Record<string, number> {
  return {
    Fire: 0,
    Water: 0,
    Air: 0,
    Earth: 0,
  }
}

// Combine two element objects
export function combineElementObjects(
  element_object_1: Record<string, number>,
  element_object_2: Record<string, number>
): Record<string, number> {
  const combined_object = createElementObject()
  combined_object['Fire'] = element_object_1['Fire'] + element_object_2['Fire']
  combined_object['Water'] = element_object_1['Water'] + element_object_2['Water']
  combined_object['Air'] = element_object_1['Air'] + element_object_2['Air']
  combined_object['Earth'] = element_object_1['Earth'] + element_object_2['Earth']
  return combined_object
}

// Get ranking of elements by value
export function getElementRanking(
  element_object: Record<string, number>,
  rank = 1
): Record<number, string> {
  const element_rank_dict: Record<number, string> = {
    1: '',
    2: '',
    3: '',
    4: '',
  }

  let largest_element_value = -Infinity
  let largest_element = ''

  // Find the largest element
  for (const element in element_object) {
    if (element_object[element] > largest_element_value) {
      largest_element_value = element_object[element]
      largest_element = element
    }
  }

  element_rank_dict[1] = largest_element

  // For a complete implementation, you would continue to find 2nd, 3rd, and 4th
  // largest elements, but this simplified version just returns the dominant element

  return element_rank_dict
}

// Get sum of all element values
export function getAbsoluteElementValue(element_object: Record<string, number>): number {
  return (
    element_object['Fire'] +
    element_object['Water'] +
    element_object['Air'] +
    element_object['Earth']
  )
}

// Calculate elemental compatibility according to elementallogic principles
export function getElementalCompatibility(element1: string, element2: string): number {
  // Same element has highest compatibility
  if (element1 === element2) {
    return 0.9 // Same element has high compatibility
  }

  // All different element combinations have good compatibility
  return 0.7 // Different elements have good compatibility
}

// Get the complementary element (according to elementallogic, each element complements itself)
export function getComplementaryElement(element: string): string {
  return element // Each element complements itself most strongly
}

// Main alchemizer function
export function alchemize(
  birth_info: Record<string, any>,
  horoscope_dict: Record<string, any>
): Record<string, any> {
  // Feature flag: additive-only elemental logic (no negative penalties)
  // Prefer env var if present; default false to preserve legacy behavior until rollout
  // Runtime UI override via localStorage if available
  let uiOverride: boolean | null = null
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const v = window.localStorage.getItem('additiveOnlyElements')
      if (v === 'true') uiOverride = true
      else if (v === 'false') uiOverride = false
    }
  } catch {
    // localStorage may be unavailable (SSR/private mode) — fall back to the env flag.
  }

  const envFlag =
    (typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_ADDITIVE_ONLY_ELEMENTS === 'true') ||
    false
  const ADDITIVE_ONLY_ELEMENTS = uiOverride !== null ? uiOverride : envFlag
  // Emit analytics for A/B tracking
  recordElementalLogicMode(ADDITIVE_ONLY_ELEMENTS ? 'additive' : 'legacy')
  // Check cache first
  const birthInfoHash = createBirthInfoHash(birth_info)
  const cachedResult = performanceCache.getAlchemicalData(birthInfoHash)
  if (cachedResult) {
    return cachedResult
  }

  // Simplified implementation for UI integration
  const horoscope = horoscope_dict['tropical'] || horoscope_dict
  const silent_mode = true

  // Determine if time is diurnal or nocturnal
  let diurnal_or_nocturnal = 'Diurnal'
  if (birth_info['hour'] < 5 || birth_info['hour'] > 17) {
    diurnal_or_nocturnal = 'Nocturnal'
  }

  // Create metadata and initial alchmInfo structure
  const metadata: Record<string, any> = {
    name: 'Alchm NFT',
    description:
      'Alchm is unlike any other NFT collection on Earth. Just like people, no two Alchm NFTs are the same, and there is no limit on how many can exist. Your Alchm NFT has no random features, and is completely customized and unique to you. By minting, you gain permanent access to limitless information about your astrology and identity through our sites and apps.',
    attributes: [],
  }

  // Initialize the alchemical information object
  const alchmInfo: Record<string, any> = {
    'Sun Sign': '',
    'Major Arcana': { Sun: '', Ascendant: '' },
    'Minor Arcana': { Decan: '', Cusp: 'None' },
    'Alchemy Effects': {
      'Total Spirit': 0,
      'Total Essence': 0,
      'Total Day Essence': 0,
      'Total Matter': 0,
      'Total Substance': 0,
      'Total Night Essence': 0,
    },
    'Chart Ruler': '',
    'Total Dignity Effect': createElementObject(),
    'Total Decan Effect': createElementObject(),
    'Total Degree Effect': createElementObject(),
    'Total Aspect Effect': createElementObject(),
    'Total Elemental Effect': createElementObject(),
    'Total Effect Value': createElementObject(),
    'Dominant Element': '',
    'Total Chart Absolute Effect': 0,
    Heat: 0,
    Entropy: 0,
    Reactivity: 0,
    Energy: 0,
    '# Cardinal': 0,
    '# Fixed': 0,
    '# Mutable': 0,
    '% Cardinal': 0,
    '% Fixed': 0,
    '% Mutable': 0,
    'Dominant Modality': '',
    'All Conjunctions': [],
    'All Trines': [],
    'All Squares': [],
    'All Oppositions': [],
    Stelliums: [],
    Signs: {},
    Planets: {},
  }

  // Initialize the Signs and Planets objects
  Object.values(signs).forEach(sign => {
    alchmInfo['Signs'][sign] = {}
  })

  Object.keys(planetInfo).forEach(planet => {
    alchmInfo['Planets'][planet] = {}
  })

  // Add Ascendant to Planets if not already present
  if (!alchmInfo['Planets']['Ascendant']) {
    alchmInfo['Planets']['Ascendant'] = {}
  }

  // Process Ascendant information first (if available)
  if (horoscope.Ascendant?.Sign?.label) {
    const rising_sign = horoscope.Ascendant.Sign.label
    // Set Ascendant element based on rising sign
    const rising_element = signInfo[rising_sign]?.Element || 'Earth'

    // Update alchmInfo with Ascendant data
    alchmInfo['Planets']['Ascendant']['Diurnal Element'] = rising_element
    alchmInfo['Planets']['Ascendant']['Nocturnal Element'] = rising_element

    // Set Major Arcana for Ascendant if available
    if (signInfo[rising_sign]?.['Major Tarot Card']) {
      alchmInfo['Major Arcana']['Ascendant'] = signInfo[rising_sign]['Major Tarot Card']
    }
  }

  // Process Sun placement to get Sun Sign and Chart Ruler
  let sun_sign = ''
  if (horoscope.CelestialBodies?.all) {
    const sunData = horoscope.CelestialBodies.all.find((p: any) => p.label === 'Sun')
    if (sunData?.Sign?.label) {
      sun_sign = sunData.Sign.label
      alchmInfo['Sun Sign'] = sun_sign
      alchmInfo['Chart Ruler'] = signInfo[sun_sign]?.Ruler || ''

      // Set Major Arcana for Sun if available
      if (signInfo[sun_sign]?.['Major Tarot Card']) {
        alchmInfo['Major Arcana']['Sun'] = signInfo[sun_sign]['Major Tarot Card']
      }
    }
  }

  // Calculate elemental values and alchemy effects from planetary positions
  if (horoscope.CelestialBodies?.all) {
    horoscope.CelestialBodies.all.forEach((planet_data: any) => {
      const planet = planet_data.label
      const sign = planet_data.Sign?.label

      if (planet && sign && signInfo[sign]) {
        const element = signInfo[sign].Element
        const modality = signInfo[sign].Modality

        // Update modality counts
        if (modality === 'Cardinal') alchmInfo['# Cardinal'] += 1
        else if (modality === 'Fixed') alchmInfo['# Fixed'] += 1
        else if (modality === 'Mutable') alchmInfo['# Mutable'] += 1

        // Update element values
        if (element) {
          alchmInfo['Total Effect Value'][element] += 1

          // Add elemental effect from planet-sign affinity (using core alchemizer logic)
          if (planetInfo[planet]) {
            let elemental_effect_value = 0

            // Different logic for Sun/Moon vs other planets
            if (planet === 'Sun' || planet === 'Moon') {
              // For Sun/Moon: use time-based diurnal/nocturnal element
              const planetElement =
                diurnal_or_nocturnal === 'Diurnal'
                  ? planetInfo[planet]['Diurnal Element']
                  : planetInfo[planet]['Nocturnal Element']

              if (planetElement === element) {
                elemental_effect_value = 1
              }
            } else {
              // For other planets: check both diurnal and nocturnal elements
              if (planetInfo[planet]['Diurnal Element'] === element) {
                elemental_effect_value = 1
              } else if (planetInfo[planet]['Nocturnal Element'] === element) {
                elemental_effect_value = 1
              } else {
                // Elemental logic compliance: if additive-only is enabled, do not penalize mismatches
                elemental_effect_value = ADDITIVE_ONLY_ELEMENTS ? 0 : -1
              }
            }

            // Apply the elemental effect
            alchmInfo['Total Effect Value'][element] += elemental_effect_value

            // Store the planet's sign and element
            if (!alchmInfo['Planets'][planet]) {
              alchmInfo['Planets'][planet] = {}
            }
            alchmInfo['Planets'][planet]['Sign'] = sign
            alchmInfo['Planets'][planet]['Element'] = element

            // Calculate planetary dignities and effects
            const dignity_effect = planetInfo[planet]['Dignity Effect']?.[sign] || 0
            let total_effect_multiplier = 1

            // Apply dignity effect to total multiplier
            if (dignity_effect) {
              total_effect_multiplier += Math.abs(dignity_effect) * 0.1
            }

            // Store the total effect multiplier
            alchmInfo['Planets'][planet]['Total Effect Multiplier'] = total_effect_multiplier

            // Calculate alchemical values for this planet (following core alchemizer logic)
            if (planetInfo[planet]['Alchemy']) {
              const base_alchemy_values = planetInfo[planet]['Alchemy']
              const alchemy_values: Record<string, any> = {}

              // Initialize Day/Night Alchemy tracking for this planet
              if (!alchmInfo['Planets'][planet]['Alchemy Effects']) {
                alchmInfo['Planets'][planet]['Alchemy Effects'] = {}
              }

              // Spirit - goes to Day Alchemy
              if (base_alchemy_values['Spirit']) {
                const spirit_bonus = base_alchemy_values['Spirit'] * total_effect_multiplier
                alchemy_values['Spirit'] = spirit_bonus
                alchmInfo['Alchemy Effects']['Total Spirit'] += spirit_bonus
                alchemy_values['Day Alchemy'] = { Spirit: spirit_bonus }
              }

              // Essence - goes to Night if planet has Spirit, Day if not
              if (base_alchemy_values['Essence']) {
                const essence_bonus = base_alchemy_values['Essence'] * total_effect_multiplier
                alchemy_values['Essence'] = essence_bonus
                alchmInfo['Alchemy Effects']['Total Essence'] += essence_bonus

                if (alchemy_values['Spirit']) {
                  alchemy_values['Night Alchemy'] = { Essence: essence_bonus }
                  alchmInfo['Alchemy Effects']['Total Night Essence'] += essence_bonus
                } else {
                  alchemy_values['Day Alchemy'] = { Essence: essence_bonus }
                  alchmInfo['Alchemy Effects']['Total Day Essence'] += essence_bonus
                }
              }

              // Matter - goes to Night Alchemy
              if (base_alchemy_values['Matter']) {
                const matter_bonus = base_alchemy_values['Matter'] * total_effect_multiplier
                alchemy_values['Matter'] = matter_bonus
                alchmInfo['Alchemy Effects']['Total Matter'] += matter_bonus
                alchemy_values['Night Alchemy'] = { Matter: matter_bonus }
              }

              // Substance - goes to Night Alchemy
              if (base_alchemy_values['Substance']) {
                const substance_bonus = base_alchemy_values['Substance'] * total_effect_multiplier
                alchemy_values['Substance'] = substance_bonus
                alchmInfo['Alchemy Effects']['Total Substance'] += substance_bonus
                alchemy_values['Night Alchemy'] = { Substance: substance_bonus }
              }

              // Store the planet's alchemy effects
              alchmInfo['Planets'][planet]['Alchemy Effects'] = alchemy_values
            }
          }
        }
      }
    })
  }

  // Handle aspects to further modify alchemical values
  if (horoscope.Aspects?.points) {
    Object.entries(horoscope.Aspects.points).forEach(([planetKey, aspects]) => {
      if (Array.isArray(aspects)) {
        aspects.forEach((aspect: any) => {
          const aspectType = aspect.aspectKey
          const planet1 = aspect.point1Label
          const planet2 = aspect.point2Label

          // Apply aspect effects to alchemical values
          // Conjunctions enhance, squares challenge, trines harmonize, oppositions polarize
          let aspectMultiplier = 1.0

          if (aspectType === 'conjunction') aspectMultiplier = 1.2
          else if (aspectType === 'trine') aspectMultiplier = 1.1
          else if (aspectType === 'square') aspectMultiplier = 0.9
          else if (aspectType === 'opposition') aspectMultiplier = 0.8

          // Only apply if both planets have alchemical values
          if (planetInfo[planet1]?.['Alchemy'] && planetInfo[planet2]?.['Alchemy']) {
            // Get the average of both planets' alchemical values and apply the aspect multiplier
            for (const key of ['Spirit', 'Essence', 'Matter', 'Substance']) {
              const value1 = planetInfo[planet1]['Alchemy'][key] || 0
              const value2 = planetInfo[planet2]['Alchemy'][key] || 0

              // Add a small bonus for aspects between planets with matching alchemical properties
              if (value1 > 0 && value2 > 0) {
                alchmInfo['Alchemy Effects'][`Total ${key}`] += 0.1 * aspectMultiplier
              }
            }
          }
        })
      }
    })
  }

  // Determine dominant element
  alchmInfo['Dominant Element'] = getElementRanking(alchmInfo['Total Effect Value'])[1]

  // Calculate percentages for modalities
  const total_planets = alchmInfo['# Cardinal'] + alchmInfo['# Fixed'] + alchmInfo['# Mutable']
  if (total_planets > 0) {
    alchmInfo['% Cardinal'] = alchmInfo['# Cardinal'] / total_planets
    alchmInfo['% Fixed'] = alchmInfo['# Fixed'] / total_planets
    alchmInfo['% Mutable'] = alchmInfo['# Mutable'] / total_planets

    // Determine dominant modality
    if (
      alchmInfo['% Cardinal'] >= alchmInfo['% Fixed'] &&
      alchmInfo['% Cardinal'] >= alchmInfo['% Mutable']
    ) {
      alchmInfo['Dominant Modality'] = 'Cardinal'
    } else if (
      alchmInfo['% Fixed'] >= alchmInfo['% Cardinal'] &&
      alchmInfo['% Fixed'] >= alchmInfo['% Mutable']
    ) {
      alchmInfo['Dominant Modality'] = 'Fixed'
    } else if (
      alchmInfo['% Mutable'] >= alchmInfo['% Cardinal'] &&
      alchmInfo['% Mutable'] >= alchmInfo['% Fixed']
    ) {
      alchmInfo['Dominant Modality'] = 'Mutable'
    }
  }

  // Calculate Heat, Entropy, Reactivity and Energy
  const fire = alchmInfo['Total Effect Value']['Fire'] || 0
  const water = alchmInfo['Total Effect Value']['Water'] || 0
  const air = alchmInfo['Total Effect Value']['Air'] || 0
  const earth = alchmInfo['Total Effect Value']['Earth'] || 0
  const spirit = alchmInfo['Alchemy Effects']['Total Spirit'] || 0
  const essence = alchmInfo['Alchemy Effects']['Total Essence'] || 0
  const matter = alchmInfo['Alchemy Effects']['Total Matter'] || 0
  const substance = alchmInfo['Alchemy Effects']['Total Substance'] || 0

  // Prevent division by zero in calculations
  const denominator = substance + essence + matter + water + air + earth || 1
  const earthWaterDenominator = matter + earth + water || 1

  alchmInfo['Heat'] = (spirit ** 2 + fire ** 2) / denominator ** 2 || 0
  alchmInfo['Entropy'] =
    (spirit ** 2 + substance ** 2 + fire ** 2 + air ** 2) / earthWaterDenominator ** 2 || 0
  alchmInfo['Reactivity'] =
    (spirit ** 2 + substance ** 2 + essence ** 2 + fire ** 2 + air ** 2 + water ** 2) /
      ((matter + earth) ** 2 || 1) || 0
  alchmInfo['Energy'] = alchmInfo['Heat'] - alchmInfo['Reactivity'] * alchmInfo['Entropy'] || 0

  // Calculate A-Number: Total Spirit + Total Essence + Total Matter + Total Substance
  alchmInfo['Alchemy Effects']['A #'] = spirit + essence + matter + substance

  // Cache the result before returning
  performanceCache.setAlchemicalData(birthInfoHash, alchmInfo)

  return alchmInfo
}

// Function to generate alchemical data for the current moment
// Simple cache for current moment calculations (5-minute TTL)
const currentMomentCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function generateAlchmForCurrentMoment(): Promise<Record<string, any>> {
  try {
    console.log('Generating alchemical data for current moment...')

    // Get current date and time
    const now = new Date()

    // Create cache key (rounded to 5-minute intervals for efficiency)
    const roundedTime = Math.floor(now.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000)
    const cacheKey = `current-moment-${roundedTime}`

    // Check cache first
    const cached = currentMomentCache.get(cacheKey)
    if (cached && now.getTime() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached alchemical data for current moment')
      return cached.data
    }

    // Format date as YYYY-MM-DD
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    // Format time as HH:MM
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const timeString = `${hour}:${minute}`

    console.log(`Current datetime: ${dateString} ${timeString}`)

    // Create birth info object for the current moment
    const currentMomentInfo = {
      year,
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      latitude: 0, // Using equator as default
      longitude: 0, // Using prime meridian as default
    }

    // Import the getCurrentPlanetaryPositions function to get accurate positions
    const { getCurrentPlanetaryPositions } = await import('./calculate-transits')

    console.log('Fetching current planetary positions...')
    const currentPositions = getCurrentPlanetaryPositions()

    if (!currentPositions || Object.keys(currentPositions).length === 0) {
      throw new Error('Failed to get current planetary positions')
    }

    console.log('Current positions obtained:', Object.keys(currentPositions).join(', '))

    // Ensure all required planets are present
    const requiredPlanets = [
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
      'Ascendant',
    ]
    for (const planet of requiredPlanets) {
      if (!currentPositions[planet]) {
        console.error(`Missing position data for ${planet}`)
        currentPositions[planet] = { sign: 'Aries', degree: 0, retrograde: false } as any // Fallback only if absolutely necessary
      }
    }

    // Ensure each planet has a sign and degree
    Object.entries(currentPositions).forEach(([planet, data]) => {
      if (!data.sign) {
        console.error(`Missing sign for ${planet}, using fallback`)
        currentPositions[planet].sign = 'Aries' // Fallback
      }
      if (data.degree === undefined) {
        console.error(`Missing degree for ${planet}, using fallback`)
        currentPositions[planet].degree = 0 // Fallback
      }
    })

    // Log what we're working with
    console.log('Building horoscope with the following positions:')
    Object.entries(currentPositions).forEach(([planet, data]) => {
      console.log(`${planet}: ${data.sign} ${data.degree}°`)
    })

    // Create a horoscope object using the calculated positions
    const horoscope = {
      tropical: {
        Ascendant: {
          Sign: {
            label: currentPositions['Ascendant'].sign,
          },
        },
        CelestialBodies: {
          all: [
            { label: 'Sun', Sign: { label: currentPositions['Sun'].sign }, House: { label: '10' } },
            {
              label: 'Moon',
              Sign: { label: currentPositions['Moon'].sign },
              House: { label: '9' },
            },
            {
              label: 'Mercury',
              Sign: { label: currentPositions['Mercury'].sign },
              House: { label: '11' },
            },
            {
              label: 'Venus',
              Sign: { label: currentPositions['Venus'].sign },
              House: { label: '12' },
            },
            {
              label: 'Mars',
              Sign: { label: currentPositions['Mars'].sign },
              House: { label: '7' },
            },
            {
              label: 'Jupiter',
              Sign: { label: currentPositions['Jupiter'].sign },
              House: { label: '4' },
            },
            {
              label: 'Saturn',
              Sign: { label: currentPositions['Saturn'].sign },
              House: { label: '5' },
            },
            {
              label: 'Uranus',
              Sign: { label: currentPositions['Uranus'].sign },
              House: { label: '6' },
            },
            {
              label: 'Neptune',
              Sign: { label: currentPositions['Neptune'].sign },
              House: { label: '7' },
            },
            {
              label: 'Pluto',
              Sign: { label: currentPositions['Pluto'].sign },
              House: { label: '2' },
            },
          ],
          sun: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Sun'].degree}°` },
            },
          },
          moon: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Moon'].degree}°` },
            },
          },
          mercury: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Mercury'].degree}°` },
            },
          },
          venus: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Venus'].degree}°` },
            },
          },
          mars: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Mars'].degree}°` },
            },
          },
          jupiter: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Jupiter'].degree}°` },
            },
          },
          saturn: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Saturn'].degree}°` },
            },
          },
          uranus: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Uranus'].degree}°` },
            },
          },
          neptune: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Neptune'].degree}°` },
            },
          },
          pluto: {
            ChartPosition: {
              Ecliptic: { ArcDegreesFormatted30: `${currentPositions['Pluto'].degree}°` },
            },
          },
        },
        Aspects: {
          points: generateCurrentAspects(currentPositions),
        },
      },
    }

    console.log('Calculating alchemical data...')
    // Calculate alchemical data using the alchemize function
    const alchmData = alchemize(currentMomentInfo, horoscope)

    // Log the calculated values
    console.log('Alchemical calculations complete:')
    console.log(`Spirit: ${alchmData['Alchemy Effects']['Total Spirit']}`)
    console.log(`Essence: ${alchmData['Alchemy Effects']['Total Essence']}`)
    console.log(`Matter: ${alchmData['Alchemy Effects']['Total Matter']}`)
    console.log(`Substance: ${alchmData['Alchemy Effects']['Total Substance']}`)

    // Cache the result for future requests
    currentMomentCache.set(cacheKey, {
      data: alchmData,
      timestamp: now.getTime(),
    })

    // Clean up old cache entries (keep only last 10)
    if (currentMomentCache.size > 10) {
      const oldestKey = currentMomentCache.keys().next().value
      if (oldestKey !== undefined) currentMomentCache.delete(oldestKey)
    }

    return alchmData
  } catch (error) {
    console.error('Error generating alchemical data:', error)
    throw error
  }
}

// Helper function to generate aspects based on current planetary positions
function generateCurrentAspects(positions: Record<string, any>): Record<string, any> {
  const aspects: Record<string, any> = {}
  const planets = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
  ]

  // Initialize aspect arrays for each planet
  planets.forEach(planet => {
    aspects[planet] = []
  })

  // Calculate aspects between planets
  for (let i = 0; i < planets.length; i++) {
    const planet1 = planets[i]
    const planet1Cap = planet1.charAt(0).toUpperCase() + planet1.slice(1)

    for (let j = i + 1; j < planets.length; j++) {
      const planet2 = planets[j]
      const planet2Cap = planet2.charAt(0).toUpperCase() + planet2.slice(1)

      // Skip if either planet's position is missing
      if (!positions[planet1Cap] || !positions[planet2Cap]) continue

      // Get sign indices (0-11 for Aries-Pisces)
      const signIndices = getSignIndices()
      const planet1SignIndex = signIndices[positions[planet1Cap].sign] || 0
      const planet2SignIndex = signIndices[positions[planet2Cap].sign] || 0

      // Calculate aspect type based on sign relationship
      const difference = Math.abs(planet1SignIndex - planet2SignIndex)

      let aspectType = ''

      // Simple aspect calculation based on sign relationships
      if (difference === 0) {
        aspectType = 'conjunction'
      } else if (difference === 4 || difference === 8) {
        aspectType = 'trine'
      } else if (difference === 3 || difference === 9) {
        aspectType = 'square'
      } else if (difference === 6) {
        aspectType = 'opposition'
      } else {
        continue // No significant aspect
      }

      // Add the aspect to both planets' arrays
      aspects[planet1].push({
        aspectKey: aspectType,
        point1Label: planet1Cap,
        point2Label: planet2Cap,
      })

      aspects[planet2].push({
        aspectKey: aspectType,
        point1Label: planet2Cap,
        point2Label: planet1Cap,
      })
    }
  }

  return aspects
}

// Helper function to get sign indices
function getSignIndices(): Record<string, number> {
  return {
    Aries: 0,
    Taurus: 1,
    Gemini: 2,
    Cancer: 3,
    Leo: 4,
    Virgo: 5,
    Libra: 6,
    Scorpio: 7,
    Sagittarius: 8,
    Capricorn: 9,
    Aquarius: 10,
    Pisces: 11,
  }
}

// Export the main alchemizer function
const alchemizerExport = { alchemize, generateAlchmForCurrentMoment }
export default alchemizerExport

// Generate alchemical data for a provided birth date/time/location
// Accepts flexible string inputs and normalizes to BirthInfo used by horoscope generator
export async function generateAlchmForBirthInfo(input: {
  birthDate: string // YYYY-MM-DD or any Date-parsable string
  birthTime?: string // HH:MM
  birthLocation?: string // Optional (not geocoded in this helper)
}): Promise<Record<string, any>> {
  try {
    const dateObj = new Date(input.birthDate)
    if (isNaN(dateObj.getTime())) {
      // Try manual parse for YYYY-MM-DD
      const [y, m, d] = input.birthDate.split('-').map(v => parseInt(v, 10))
      if (!y || !m || !d) throw new Error('Invalid birthDate format')
      // month expected 1-12 by horoscope generator
      dateObj.setFullYear(y)
      dateObj.setMonth(m - 1)
      dateObj.setDate(d)
    }

    const time = input.birthTime || '12:00'
    const [hhStr, mmStr] = time.split(':')
    const hour = Math.max(0, Math.min(23, parseInt(hhStr || '12', 10)))
    const minute = Math.max(0, Math.min(59, parseInt(mmStr || '0', 10)))

    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1 // horoscope generator expects 1-12
    const day = dateObj.getDate()

    const birthInfo = {
      year,
      month,
      day,
      hour,
      minute,
      // Default coordinates; future enhancement: parse input.birthLocation
      latitude: 0,
      longitude: 0,
    }

    const horoscope = generateAccurateHoroscope(birthInfo as any)
    const alchmData = alchemize(birthInfo as any, horoscope as any)
    return alchmData
  } catch (error) {
    console.error('generateAlchmForBirthInfo error:', error)
    // Provide a minimal fallback to avoid breaking callers
    return {
      'Alchemy Effects': {
        'Total Spirit': 0,
        'Total Essence': 0,
        'Total Matter': 0,
        'Total Substance': 0,
        'A #': 0,
      },
      'Total Effect Value': createElementObject(),
      'Dominant Element': 'Fire',
      Heat: 0,
      Entropy: 0,
      Reactivity: 0,
      Energy: 0,
    }
  }
}
