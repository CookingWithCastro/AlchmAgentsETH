/**
 * Natal Chart Storage Service
 *
 * Manages CRUD operations for user natal charts with alchemical calculations
 * and transit monitoring integration.
 */

import { prisma } from '@/lib/db'
import { generateAccurateHoroscope } from '../monica/horoscope-generator'
import { signDegreeToLongitude } from '../enhanced-astronomical-calculator'
import { alchemize } from '../alchemizer'

export interface CreateNatalChartInput {
  userId: string
  chartName: string
  description?: string
  birthDate: Date
  birthTime: string // "HH:MM" or "unknown"
  birthLocation: {
    name: string
    lat: number
    lon: number
    timezone?: string
  }
  preferences?: {
    notificationThreshold?: number
    enabledTransits?: string[]
    reminderFrequency?: 'daily' | 'weekly' | 'realtime'
    transitTypes?: string[]
  }
}

export interface UpdateNatalChartInput {
  chartName?: string
  description?: string
  preferences?: {
    notificationThreshold?: number
    enabledTransits?: string[]
    reminderFrequency?: 'daily' | 'weekly' | 'realtime'
    transitTypes?: string[]
  }
  notificationOn?: boolean
}

export interface NatalChartWithTransits {
  id: string
  userId: string
  chartName: string
  description?: string
  birthDate: Date
  birthTime: string
  birthLocation: any
  planets: any
  houses: any
  aspects?: any
  nodes?: any
  monicaConstant: number
  dominantElement: string
  dominantModality?: string
  spiritScore: number
  essenceScore: number
  matterScore: number
  substanceScore: number
  preferences: any
  isActive: boolean
  isPrimary: boolean
  lastAnalyzed?: Date
  analysisCount: number
  transitCount: number
  notificationOn: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Create a new natal chart with full calculations
 */
export async function createNatalChart(
  input: CreateNatalChartInput
): Promise<NatalChartWithTransits> {
  // Calculate natal chart positions
  const natalData = calculateNatalChart({
    date: input.birthDate,
    time: input.birthTime,
    latitude: input.birthLocation.lat,
    longitude: input.birthLocation.lon,
  })

  // Calculate alchemical quantities
  const alchmData = await calculateAlchemicalQuantities(natalData.planets)

  // Determine dominant element
  const elementCounts = { Fire: 0, Water: 0, Air: 0, Earth: 0 }
  natalData.planets.forEach((p: any) => {
    const element = getElementForSign(p.sign)
    elementCounts[element]++
  })
  const dominantElement = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0][0] as string

  // Determine dominant modality
  const modalityCounts = { Cardinal: 0, Fixed: 0, Mutable: 0 }
  natalData.planets.forEach((p: any) => {
    const modality = getModalityForSign(p.sign)
    modalityCounts[modality]++
  })
  const dominantModality = Object.entries(modalityCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0] as string

  // Default preferences
  const defaultPreferences = {
    notificationThreshold: 0.6, // Only notify for significance > 0.6
    enabledTransits: ['Sun'], // Currently only Sun transits
    reminderFrequency: 'daily' as const,
    transitTypes: ['conjunction', 'opposition', 'trine', 'square'],
  }

  // Check if this is the user's first chart (make it primary)
  const existingCharts = await prisma.userNatalChart.count({
    where: { userId: input.userId },
  })

  const isPrimary = existingCharts === 0

  // Create chart record
  const chart = await prisma.userNatalChart.create({
    data: {
      userId: input.userId,
      chartName: input.chartName,
      description: input.description,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      birthLocation: input.birthLocation,
      planets: natalData.planets,
      houses: natalData.houses,
      aspects: natalData.aspects,
      nodes: natalData.nodes,
      monicaConstant: alchmData.monicaConstant,
      dominantElement,
      dominantModality,
      spiritScore: alchmData.spirit,
      essenceScore: alchmData.essence,
      matterScore: alchmData.matter,
      substanceScore: alchmData.substance,
      preferences: input.preferences || defaultPreferences,
      isPrimary,
      isActive: true,
      notificationOn: true,
    },
  })

  return chart as NatalChartWithTransits
}

/**
 * Get natal chart by ID
 */
export async function getNatalChart(
  chartId: string,
  userId: string
): Promise<NatalChartWithTransits | null> {
  const chart = await prisma.userNatalChart.findFirst({
    where: {
      id: chartId,
      userId,
    },
  })

  return chart as NatalChartWithTransits | null
}

/**
 * Get all natal charts for a user
 */
export async function getUserNatalCharts(
  userId: string,
  activeOnly = true
): Promise<NatalChartWithTransits[]> {
  const charts = await prisma.userNatalChart.findMany({
    where: {
      userId,
      ...(activeOnly && { isActive: true }),
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  })

  return charts as NatalChartWithTransits[]
}

/**
 * Get user's primary natal chart
 */
export async function getPrimaryNatalChart(userId: string): Promise<NatalChartWithTransits | null> {
  const chart = await prisma.userNatalChart.findFirst({
    where: {
      userId,
      isPrimary: true,
      isActive: true,
    },
  })

  return chart as NatalChartWithTransits | null
}

/**
 * Update natal chart
 */
export async function updateNatalChart(
  chartId: string,
  userId: string,
  updates: UpdateNatalChartInput
): Promise<NatalChartWithTransits> {
  const chart = await prisma.userNatalChart.update({
    where: {
      id: chartId,
      userId,
    },
    data: {
      ...updates,
      updatedAt: new Date(),
    },
  })

  return chart as NatalChartWithTransits
}

/**
 * Set chart as primary (and unset others)
 */
export async function setPrimaryChart(chartId: string, userId: string): Promise<void> {
  await prisma.$transaction([
    // Unset all other primary charts
    prisma.userNatalChart.updateMany({
      where: {
        userId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    }),
    // Set this chart as primary
    prisma.userNatalChart.update({
      where: {
        id: chartId,
        userId,
      },
      data: {
        isPrimary: true,
      },
    }),
  ])
}

/**
 * Delete (soft delete) natal chart
 */
export async function deleteNatalChart(chartId: string, userId: string): Promise<void> {
  await prisma.userNatalChart.update({
    where: {
      id: chartId,
      userId,
    },
    data: {
      isActive: false,
      notificationOn: false,
    },
  })
}

/**
 * Increment analysis count
 */
export async function incrementAnalysisCount(chartId: string): Promise<void> {
  await prisma.userNatalChart.update({
    where: { id: chartId },
    data: {
      analysisCount: { increment: 1 },
      lastAnalyzed: new Date(),
    },
  })
}

/**
 * Update transit count
 */
export async function updateTransitCount(chartId: string, count: number): Promise<void> {
  await prisma.userNatalChart.update({
    where: { id: chartId },
    data: {
      transitCount: count,
    },
  })
}

// Wrapper functions for compatibility

/**
 * Calculate natal chart using horoscope generator
 */
function calculateNatalChart({
  date,
  time,
  latitude,
  longitude,
}: {
  date: Date
  time: string
  latitude: number
  longitude: number
}) {
  // Validate inputs
  if (!date || isNaN(date.getTime())) {
    throw new Error('Invalid date provided')
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid coordinates provided')
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Coordinates out of valid range')
  }

  // Parse birth info with validation
  let hour: number
  let minute: number

  try {
    if (time === 'unknown') {
      hour = 12
      minute = 0
    } else {
      const timeParts = time.split(':')
      if (timeParts.length !== 2) {
        throw new Error('Invalid time format')
      }
      hour = parseInt(timeParts[0])
      minute = parseInt(timeParts[1]) || 0

      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error('Invalid time values')
      }
    }
  } catch (timeError) {
    throw new Error(`Invalid time format: ${time}`)
  }

  const birthInfo = {
    year: date.getFullYear(),
    month: date.getMonth() + 1, // Convert to 1-based
    day: date.getDate(),
    hour,
    minute,
    latitude,
    longitude,
  }

  // Generate horoscope with error handling
  let horoscope: any
  try {
    horoscope = generateAccurateHoroscope(birthInfo)
    if (!horoscope || !horoscope.tropical || !horoscope.tropical.CelestialBodies) {
      throw new Error('Horoscope generation returned invalid data')
    }
  } catch (horoscopeError) {
    console.error('Error generating horoscope:', horoscopeError)
    throw new Error(
      `Failed to generate horoscope: ${horoscopeError instanceof Error ? horoscopeError.message : 'Unknown error'}`
    )
  }

  return {
    planets: horoscope.tropical.CelestialBodies.all.map((body: any) => {
      const sign = body.Sign?.label || ''
      // generateAccurateHoroscope returns `degrees` (within-sign 0-30); the
      // ChartPosition path covers the circular-natal-horoscope-js shape.
      const signDegree =
        Number(body.degrees ?? body.ChartPosition?.Ecliptic?.ArcDegreesFormatted30) || 0
      return {
        label: body.label,
        degree: signDegree, // within-sign 0-30
        longitude: signDegreeToLongitude(sign, signDegree) ?? signDegree, // absolute 0-360
        sign,
        house: body.House?.label || '',
        retrograde: body.retrograde ?? body.ChartPosition?.Retrograde ?? false,
      }
    }),
    houses: horoscope.tropical.Houses
      ? Object.entries(horoscope.tropical.Houses).map(([number, house]: [string, any]) => ({
          number: parseInt(number),
          sign: house.sign,
          degree: house.degree,
        }))
      : [],
    aspects: {}, // Not available in this horoscope format
    nodes: {}, // Not available in this horoscope format
    ascendant: {
      sign: horoscope.tropical.Ascendant.Sign.label,
      degree: horoscope.tropical.Ascendant.degrees,
    },
  }
}

/**
 * Calculate alchemical quantities from planets data
 */
async function calculateAlchemicalQuantities(planets: any[]) {
  // Validate planets array
  if (!Array.isArray(planets) || planets.length === 0) {
    throw new Error('Invalid planets data: must be non-empty array')
  }

  // Create a mock horoscope dict for alchemize function
  let mockHoroscope
  try {
    mockHoroscope = {
      tropical: {
        CelestialBodies: {
          all: planets.map(planet => {
            if (!planet.sign) {
              throw new Error(`Planet missing sign: ${planet.label || planet.name}`)
            }
            return {
              label: planet.label || planet.name,
              Sign: { label: planet.sign },
              House: { label: planet.house || '' },
              ChartPosition: {
                Ecliptic: {
                  ArcDegreesFormatted30: planet.longitude || planet.degree || 0,
                },
                Retrograde: planet.retrograde || false,
              },
            }
          }),
        },
        Ascendant: {
          Sign: { label: planets.find(p => p.label === 'Ascendant')?.sign || 'Aries' },
        },
        Aspects: { points: {} },
        Houses: [],
      },
    }
  } catch (mockError) {
    throw new Error(
      `Error creating mock horoscope: ${mockError instanceof Error ? mockError.message : 'Unknown error'}`
    )
  }

  // Create mock birth info
  const mockBirthInfo = {
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
  }

  // Calculate alchemical quantities with error handling
  let alchmResult
  try {
    alchmResult = await alchemize(mockBirthInfo, mockHoroscope)

    if (!alchmResult || !alchmResult['Alchemy Effects']) {
      throw new Error('Alchemical calculation returned invalid data')
    }
  } catch (alchemError) {
    console.error('Error calculating alchemical quantities:', alchemError)
    throw new Error(
      `Failed to calculate alchemical quantities: ${alchemError instanceof Error ? alchemError.message : 'Unknown error'}`
    )
  }

  return {
    monicaConstant: 2.1, // Default value
    spirit: alchmResult['Alchemy Effects']['Total Spirit'] || 0,
    essence: alchmResult['Alchemy Effects']['Total Essence'] || 0,
    matter: alchmResult['Alchemy Effects']['Total Matter'] || 0,
    substance: alchmResult['Alchemy Effects']['Total Substance'] || 0,
  }
}

// Helper functions

function getElementForSign(sign: string): 'Fire' | 'Water' | 'Air' | 'Earth' {
  const elementMap: Record<string, 'Fire' | 'Water' | 'Air' | 'Earth'> = {
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
  return elementMap[sign] || 'Fire'
}

function getModalityForSign(sign: string): 'Cardinal' | 'Fixed' | 'Mutable' {
  const modalityMap: Record<string, 'Cardinal' | 'Fixed' | 'Mutable'> = {
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
  return modalityMap[sign] || 'Cardinal'
}
