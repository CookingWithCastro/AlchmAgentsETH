// Temporal Delta Engine for The Philosopher's Stone
// Tracks changes between sessions, planetary movement deltas, and consciousness growth

export type PlanetPosition = {
  planet: string
  sign: string
  degree: number // 0-29.99 within sign
}

export type SessionSnapshot = {
  timestamp: string // ISO
  planetaryPositions: PlanetPosition[]
  alchmQuantities?: {
    spirit: number
    essence: number
    matter: number
    substance: number
    Heat?: number
    Entropy?: number
    Reactivity?: number
    Energy?: number
  }
  monicaConstant?: number | null
}

export type TemporalDelta = {
  daysSinceLast: number
  planetaryMovement: Array<{
    planet: string
    movedDegrees: number // 0-360
    from: { sign: string; degree: number }
    to: { sign: string; degree: number }
  }>
  consciousnessDelta?: {
    monicaConstantDelta?: number
    energyDelta?: number
  }
}

// Utility function to safely validate numeric values with comprehensive NaN protection
function safeNumber(value: any, fallback: number = 0): number {
  const num = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeDegree(deg: number): number {
  // Keep within 0-360 with NaN protection
  const safeDeg = safeNumber(deg, 0)
  const x = ((safeDeg % 360) + 360) % 360
  return Number.isFinite(x) ? x : 0
}

function signDegreeToAbsolute(sign: string, degree: number): number {
  const order = [
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

  // Ensure sign is valid with fallback
  const validSign = typeof sign === 'string' ? sign : 'Aries'
  const idx = order.indexOf(validSign)
  const base = idx >= 0 ? idx * 30 : 0

  // Ensure degree is valid with comprehensive protection
  const safeDegree = safeNumber(degree, 0)
  const clampedDegree = Math.max(0, Math.min(29.9999, safeDegree))

  return normalizeDegree(base + clampedDegree)
}

function shortestAngularDistance(from: number, to: number): number {
  const safeFrom = safeNumber(from, 0)
  const safeTo = safeNumber(to, 0)
  const diff = normalizeDegree(safeTo - safeFrom)
  return Number.isFinite(diff) && diff <= 180 ? diff : Number.isFinite(diff) ? 360 - diff : 0
}

export function computePlanetaryMovement(
  previous: PlanetPosition[],
  current: PlanetPosition[]
): TemporalDelta['planetaryMovement'] {
  // Validate input arrays
  if (!Array.isArray(previous) || !Array.isArray(current)) {
    console.warn('Invalid planet position arrays provided, returning empty movement')
    return []
  }

  const byPlanetPrev = new Map(previous.map(p => [p.planet?.toLowerCase() || 'unknown', p]))
  const result: TemporalDelta['planetaryMovement'] = []

  for (const now of current) {
    // Validate current position data
    if (!now || typeof now.planet !== 'string') {
      console.warn('Invalid planet position data, skipping:', now)
      continue
    }

    const prev = byPlanetPrev.get(now.planet.toLowerCase())
    if (!prev) continue

    // Calculate movement with comprehensive validation
    const fromAbs = signDegreeToAbsolute(prev.sign, prev.degree)
    const toAbs = signDegreeToAbsolute(now.sign, now.degree)
    const moved = shortestAngularDistance(fromAbs, toAbs)

    // Ensure moved degrees is valid
    const safeMovedDegrees = safeNumber(moved, 0)
    const roundedMovement = Math.round(safeMovedDegrees * 100) / 100

    result.push({
      planet: now.planet,
      movedDegrees: roundedMovement,
      from: {
        sign: typeof prev.sign === 'string' ? prev.sign : 'Aries',
        degree: safeNumber(prev.degree, 0),
      },
      to: {
        sign: typeof now.sign === 'string' ? now.sign : 'Aries',
        degree: safeNumber(now.degree, 0),
      },
    })
  }

  // Sort by greatest movement with NaN protection
  return result.sort((a, b) => {
    const aMovement = safeNumber(a.movedDegrees, 0)
    const bMovement = safeNumber(b.movedDegrees, 0)
    return bMovement - aMovement
  })
}

export function computeTemporalDelta(
  previousSession: SessionSnapshot,
  currentSession: SessionSnapshot
): TemporalDelta {
  // Validate session snapshots
  if (!previousSession || !currentSession) {
    console.warn('Invalid session snapshots provided for temporal delta computation')
    return {
      daysSinceLast: 0,
      planetaryMovement: [],
      consciousnessDelta: undefined,
    }
  }

  // Calculate time difference with validation
  let daysSinceLast = 0
  try {
    const prevTime = new Date(previousSession.timestamp || new Date().toISOString())
    const curTime = new Date(currentSession.timestamp || new Date().toISOString())

    if (!isNaN(prevTime.getTime()) && !isNaN(curTime.getTime())) {
      const timeDiff = (curTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60 * 24)
      daysSinceLast = Math.max(0, Math.round(safeNumber(timeDiff, 0) * 10) / 10)
    }
  } catch (error) {
    console.warn('Error computing time difference:', error)
    daysSinceLast = 0
  }

  // Compute planetary movement with enhanced validation
  const planetaryMovement = computePlanetaryMovement(
    previousSession.planetaryPositions || [],
    currentSession.planetaryPositions || []
  )

  // Calculate consciousness delta with comprehensive validation
  let consciousnessDelta: TemporalDelta['consciousnessDelta'] | undefined
  const mcPrev =
    typeof previousSession.monicaConstant === 'number' &&
    Number.isFinite(previousSession.monicaConstant)
      ? previousSession.monicaConstant
      : null
  const mcCur =
    typeof currentSession.monicaConstant === 'number' &&
    Number.isFinite(currentSession.monicaConstant)
      ? currentSession.monicaConstant
      : null
  const energyPrev = safeNumber(previousSession.alchmQuantities?.Energy, 0)
  const energyCur = safeNumber(currentSession.alchmQuantities?.Energy, 0)

  // Only include consciousness delta if we have valid data
  if ((mcPrev !== null && mcCur !== null) || energyPrev !== 0 || energyCur !== 0) {
    const energyDelta = energyCur - energyPrev

    consciousnessDelta = {
      ...(mcPrev !== null && mcCur !== null
        ? { monicaConstantDelta: Math.round((mcCur - mcPrev) * 1000) / 1000 }
        : {}),
      energyDelta: Math.round(safeNumber(energyDelta, 0) * 100) / 100,
    }
  }

  return { daysSinceLast, planetaryMovement, consciousnessDelta }
}

export function summarizeDelta(delta: TemporalDelta): string[] {
  const lines: string[] = []
  lines.push(`${delta.daysSinceLast} days since last session`)
  const moonMove = delta.planetaryMovement.find(p => p.planet.toLowerCase() === 'moon')
  if (moonMove) lines.push(`The Moon has journeyed ${moonMove.movedDegrees}°`)
  const mercuryMove = delta.planetaryMovement.find(p => p.planet.toLowerCase() === 'mercury')
  if (mercuryMove) lines.push(`Mercury has rewired ${mercuryMove.movedDegrees}° of mental patterns`)
  if (delta.consciousnessDelta?.monicaConstantDelta !== undefined) {
    lines.push(
      `Your consciousness has expanded by ${delta.consciousnessDelta.monicaConstantDelta} points`
    )
  }
  return lines
}
