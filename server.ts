// @ts-ignore
import { serve, Subprocess } from 'bun'
declare const Bun: any
import { Pool } from 'pg'
import { cpus, freemem, loadavg, totalmem } from 'os'
import { join, dirname, basename } from 'path'
import { createHash, randomUUID } from 'crypto'
import { mkdir, rename, unlink } from 'fs/promises'
import { calculateAllPlanets, type EnhancedBirthInfo } from './lib/enhanced-astronomical-calculator'
import { detectPatternsStatic, type PlanetPosition } from './lib/astrological-pattern-recognition'
import { createNatalSigilRune, type SigilStyle } from './lib/runes/natal-sigil-runes'
import { ChartGeometryExtractor } from './lib/chart-geometry-extractor'
import { createSigilSvg, sigilSvgToDataUrl } from './lib/sigil-download'
import {
  computeElementalMomentum,
  computeElementalVelocity,
  computeForce,
  computeInertia,
  computeMetricVelocity,
  computePower,
  type ElementVector,
} from './lib/alchemical-kinetics'

const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null
const DEV_DESKTOP_API_KEY = process.env.DESKTOP_DEV_API_KEY || 'dev-desktop-token'
const DEV_DESKTOP_USER_ID = process.env.DESKTOP_DEV_USER_ID || 'desktop-local'

const IPC_NONCE = process.env.IPC_NONCE
if (!IPC_NONCE) throw new Error('CRITICAL: IPC_NONCE not provided to sidecar.')

const ALLOWED_MODELS = new Set([
  'alchm-agent-fire-8b.gguf',
  'alchm-agent-water-8b.gguf',
  'alchm-agent-air-8b.gguf',
  'alchm-agent-earth-8b.gguf',
  'alchm-agent-fire-1.5b.gguf',
  'alchm-agent-water-1.5b.gguf',
  'alchm-agent-air-1.5b.gguf',
  'alchm-agent-earth-1.5b.gguf',
])

// Path resolution for sidecar and models
const APP_DATA_DIR = process.env.APP_DATA_DIR || './models'
const isCompiled = process.execPath.includes('orchestrator')
const binDir = isCompiled ? dirname(process.execPath) : './src-tauri/bin'
const llamaServerExec = isCompiled
  ? basename(process.execPath).replace('orchestrator', 'llama-server')
  : 'llama-server-aarch64-apple-darwin'
const LLAMA_SERVER_PATH = join(binDir, llamaServerExec)

// --- State & Process Management ---
let llamaServer: Subprocess | null = null
let currentModel: string | null = null
let currentProfileName = 'balanced'
let idleTimer: ReturnType<typeof setTimeout> | null = null
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 Minutes
const LOGICAL_THREADS = Math.max(1, cpus().length || 1)
const LOCAL_LEDGER_STARTING_BALANCE = 150

interface TokenCosts {
  spirit: number
  essence: number
  matter: number
  substance: number
}

interface TokenBalances extends TokenCosts {}

const localLedger = new Map<string, TokenBalances>()
const localClaims = new Map<
  string,
  {
    agents?: string
    kitchen?: string
    agentsStreak: number
    kitchenStreak: number
  }
>()

function getLocalBalances(userId: string) {
  if (!localLedger.has(userId)) {
    localLedger.set(userId, {
      spirit: LOCAL_LEDGER_STARTING_BALANCE,
      essence: LOCAL_LEDGER_STARTING_BALANCE,
      matter: LOCAL_LEDGER_STARTING_BALANCE,
      substance: LOCAL_LEDGER_STARTING_BALANCE,
    })
  }

  return localLedger.get(userId)!
}

function getLocalClaimState(userId: string) {
  if (!localClaims.has(userId)) {
    localClaims.set(userId, {
      agentsStreak: 0,
      kitchenStreak: 0,
    })
  }

  return localClaims.get(userId)!
}

function normalizeCosts(costs: Partial<TokenCosts>): TokenCosts {
  return {
    spirit: Number(costs.spirit || 0),
    essence: Number(costs.essence || 0),
    matter: Number(costs.matter || 0),
    substance: Number(costs.substance || 0),
  }
}

function hasEnoughBalance(balances: TokenBalances, costs: TokenCosts) {
  return (
    balances.spirit >= costs.spirit &&
    balances.essence >= costs.essence &&
    balances.matter >= costs.matter &&
    balances.substance >= costs.substance
  )
}

function missingBalance(balances: TokenBalances, costs: TokenCosts) {
  return {
    spirit: Math.max(0, costs.spirit - balances.spirit),
    essence: Math.max(0, costs.essence - balances.essence),
    matter: Math.max(0, costs.matter - balances.matter),
    substance: Math.max(0, costs.substance - balances.substance),
  }
}

async function getTokenBalances(userId: string): Promise<TokenBalances> {
  if (!pool || userId === DEV_DESKTOP_USER_ID) return { ...getLocalBalances(userId) }

  const result = await pool.query(
    `
      INSERT INTO token_balances (user_id, spirit, essence, matter, substance, updated_at)
      VALUES ($1, 0, 0, 0, 0, NOW())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = token_balances.updated_at
      RETURNING spirit, essence, matter, substance;
    `,
    [userId]
  )

  const row = result.rows[0]
  return {
    spirit: Number(row.spirit),
    essence: Number(row.essence),
    matter: Number(row.matter),
    substance: Number(row.substance),
  }
}

type AccountSite = 'agents' | 'kitchen'
type StoneElement = 'Fire' | 'Water' | 'Air' | 'Earth'
type AstrologyElement = 'Fire' | 'Water' | 'Air' | 'Earth'
type AstrologyMode = 'Cardinal' | 'Fixed' | 'Mutable'
type ZodiacSignName =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'
type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

interface AccountSnapshot {
  site: AccountSite
  label: string
  homeUrl: string
  balances: TokenBalances
  canClaimDaily: boolean
  streak: number
  lastDailyClaimAt: string | null
  status: 'linked' | 'local-dev'
  message?: string
}

interface PhilosopherStoneInput {
  birthDate: string
  latitude: number
  longitude: number
  agentName?: string
  additionalContext?: string
  style?: string
}

const DAILY_YIELD_TOTAL = 10
const DAILY_YIELD_PER_TYPE = DAILY_YIELD_TOTAL / 4

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

function isToday(value?: string | Date | null) {
  if (!value) return false
  return new Date(value).toISOString().split('T')[0] === todayKey()
}

function normalizeAccountSite(site: unknown): AccountSite {
  return site === 'kitchen' ? 'kitchen' : 'agents'
}

function siteLabel(site: AccountSite) {
  return site === 'agents' ? 'Alchm Agents' : 'Alchm Kitchen'
}

function siteHomeUrl(site: AccountSite) {
  return site === 'agents' ? 'https://agents.alchm.kitchen' : 'https://alchm.kitchen'
}

function snapshotForSite(
  site: AccountSite,
  balances: TokenBalances,
  lastClaim: string | null,
  streak: number,
  status: AccountSnapshot['status'],
  message?: string
): AccountSnapshot {
  return {
    site,
    label: siteLabel(site),
    homeUrl: siteHomeUrl(site),
    balances,
    canClaimDaily: !isToday(lastClaim),
    streak,
    lastDailyClaimAt: lastClaim,
    status,
    message,
  }
}

function sunElementForDate(month: number, day: number): StoneElement {
  const signElements = [
    { start: [3, 21], end: [4, 19], element: 'Fire' },
    { start: [4, 20], end: [5, 20], element: 'Earth' },
    { start: [5, 21], end: [6, 20], element: 'Air' },
    { start: [6, 21], end: [7, 22], element: 'Water' },
    { start: [7, 23], end: [8, 22], element: 'Fire' },
    { start: [8, 23], end: [9, 22], element: 'Earth' },
    { start: [9, 23], end: [10, 22], element: 'Air' },
    { start: [10, 23], end: [11, 21], element: 'Water' },
    { start: [11, 22], end: [12, 21], element: 'Fire' },
    { start: [12, 22], end: [1, 19], element: 'Earth' },
    { start: [1, 20], end: [2, 18], element: 'Air' },
    { start: [2, 19], end: [3, 20], element: 'Water' },
  ] as const

  const dateKey = month * 100 + day
  for (const sign of signElements) {
    const start = sign.start[0] * 100 + sign.start[1]
    const end = sign.end[0] * 100 + sign.end[1]
    if (start <= end) {
      if (dateKey >= start && dateKey <= end) return sign.element
    } else if (dateKey >= start || dateKey <= end) {
      return sign.element
    }
  }

  return 'Earth'
}

function calculateLocalPhilosopherStone(input: PhilosopherStoneInput) {
  const date = new Date(input.birthDate)
  if (Number.isNaN(date.getTime())) {
    return { ok: false, status: 400, message: 'Invalid birthDate.' }
  }

  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { ok: false, status: 400, message: 'Latitude or longitude is invalid.' }
  }

  // Calculate planetary positions using high-precision calculations
  const birthInfo: EnhancedBirthInfo = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds() || 0,
    latitude,
    longitude,
  }

  const chart = calculateAllPlanets(birthInfo)

  // Map to PlanetPosition interface
  const planetPositions: PlanetPosition[] = ASTROLOGY_PLANET_ORDER.map(name => {
    const p = chart.planets[name]
    return {
      planet: name,
      sign: p.sign,
      degree: p.signDegree,
      house: 1,
      date,
    }
  })

  // Calculate aspects and patterns static
  const { aspects, patterns } = detectPatternsStatic(planetPositions)

  // Extract geometry for sigil generation
  const geometry = ChartGeometryExtractor.extractFromChartData(planetPositions, aspects, 800, 800)

  // Assign patterns to geometry
  geometry.sacredPatterns = patterns

  const dominantElement = geometry.dominantElement as StoneElement

  // Elements map: Air -> spirit, Earth -> essence, Water -> matter, Fire -> substance
  const constitution = {
    spirit: geometry.elementalBalance.air,
    essence: geometry.elementalBalance.earth,
    matter: geometry.elementalBalance.water,
    substance: geometry.elementalBalance.fire,
  }

  const elements = {
    Fire: geometry.elementalBalance.fire / 100,
    Water: geometry.elementalBalance.water / 100,
    Air: geometry.elementalBalance.air / 100,
    Earth: geometry.elementalBalance.earth / 100,
  }

  const average =
    (constitution.spirit + constitution.essence + constitution.matter + constitution.substance) / 4
  const spread =
    Math.abs(constitution.spirit - average) +
    Math.abs(constitution.essence - average) +
    Math.abs(constitution.matter - average) +
    Math.abs(constitution.substance - average)
  const monicaConstant = Number(((average + spread / 4) / 12).toFixed(2))
  // constitution is four percentages that always sum to 100 (see
  // ChartGeometryExtractor.calculateElementalBalanceFromPlanets), so average is
  // fixed at 25 and spread peaks at 150 for a single-element chart. That caps
  // monicaConstant at (25 + 150 / 4) / 12 = 5.21; the observed range over all
  // 286 ten-planet compositions is [2.50, 5.21]. Only these two tiers are
  // attainable — do not add higher ones without changing the formula above.
  const consciousnessLevel = monicaConstant >= 4 ? 'Developing' : 'Emerging'

  // Generate NatalSigilRune
  const style = (input.style as SigilStyle) || 'alchemical'
  const sigil = createNatalSigilRune(geometry, style, 'aspect-based')
  const svg = createSigilSvg(sigil)
  sigil.svgGeometry = svg
  sigil.generatedImageUrl = sigilSvgToDataUrl(svg)

  return {
    ok: true,
    data: {
      agentName: input.agentName,
      birthDate: date.toISOString(),
      latitude,
      longitude,
      dominantElement,
      elements,
      constitution,
      monicaConstant,
      consciousnessLevel,
      sigil,
      natalChart: {
        planets: planetPositions,
        aspects,
      },
    },
  }
}

const ASTROLOGY_SIGNS: Array<{
  name: ZodiacSignName
  abbreviation: string
  element: AstrologyElement
  mode: AstrologyMode
  ruler: PlanetName
  color: string
}> = [
  {
    name: 'Aries',
    abbreviation: 'ARI',
    element: 'Fire',
    mode: 'Cardinal',
    ruler: 'Mars',
    color: '#f97316',
  },
  {
    name: 'Taurus',
    abbreviation: 'TAU',
    element: 'Earth',
    mode: 'Fixed',
    ruler: 'Venus',
    color: '#84cc16',
  },
  {
    name: 'Gemini',
    abbreviation: 'GEM',
    element: 'Air',
    mode: 'Mutable',
    ruler: 'Mercury',
    color: '#22d3ee',
  },
  {
    name: 'Cancer',
    abbreviation: 'CAN',
    element: 'Water',
    mode: 'Cardinal',
    ruler: 'Moon',
    color: '#60a5fa',
  },
  {
    name: 'Leo',
    abbreviation: 'LEO',
    element: 'Fire',
    mode: 'Fixed',
    ruler: 'Sun',
    color: '#facc15',
  },
  {
    name: 'Virgo',
    abbreviation: 'VIR',
    element: 'Earth',
    mode: 'Mutable',
    ruler: 'Mercury',
    color: '#34d399',
  },
  {
    name: 'Libra',
    abbreviation: 'LIB',
    element: 'Air',
    mode: 'Cardinal',
    ruler: 'Venus',
    color: '#a78bfa',
  },
  {
    name: 'Scorpio',
    abbreviation: 'SCO',
    element: 'Water',
    mode: 'Fixed',
    ruler: 'Mars',
    color: '#e11d48',
  },
  {
    name: 'Sagittarius',
    abbreviation: 'SAG',
    element: 'Fire',
    mode: 'Mutable',
    ruler: 'Jupiter',
    color: '#fb7185',
  },
  {
    name: 'Capricorn',
    abbreviation: 'CAP',
    element: 'Earth',
    mode: 'Cardinal',
    ruler: 'Saturn',
    color: '#a3e635',
  },
  {
    name: 'Aquarius',
    abbreviation: 'AQU',
    element: 'Air',
    mode: 'Fixed',
    ruler: 'Saturn',
    color: '#38bdf8',
  },
  {
    name: 'Pisces',
    abbreviation: 'PIS',
    element: 'Water',
    mode: 'Mutable',
    ruler: 'Jupiter',
    color: '#818cf8',
  },
]

const ASTROLOGY_PLANET_ORDER: PlanetName[] = [
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

const ASTROLOGY_DIGNITIES: Record<
  PlanetName,
  {
    domicile: ZodiacSignName[]
    exaltation: ZodiacSignName[]
    detriment: ZodiacSignName[]
    fall: ZodiacSignName[]
  }
> = {
  Sun: { domicile: ['Leo'], exaltation: ['Aries'], detriment: ['Aquarius'], fall: ['Libra'] },
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
  Uranus: { domicile: ['Aquarius'], exaltation: ['Scorpio'], detriment: ['Leo'], fall: ['Taurus'] },
  Neptune: {
    domicile: ['Pisces'],
    exaltation: ['Cancer'],
    detriment: ['Virgo'],
    fall: ['Capricorn'],
  },
  Pluto: { domicile: ['Scorpio'], exaltation: ['Leo'], detriment: ['Taurus'], fall: ['Aquarius'] },
}

const PLANET_WEIGHTS: Record<PlanetName, number> = {
  Sun: 1.45,
  Moon: 1.35,
  Mercury: 1,
  Venus: 0.95,
  Mars: 1,
  Jupiter: 1.1,
  Saturn: 1.1,
  Uranus: 0.78,
  Neptune: 0.76,
  Pluto: 0.8,
}

const PLANET_SIGNALS: Record<
  PlanetName,
  {
    domain: string
    counsel: string
    agent: string
    agentRole: string
  }
> = {
  Sun: {
    domain: 'Identity, coherence, creative authority',
    counsel: 'Lead with the clearest center instead of chasing every signal.',
    agent: 'Monica',
    agentRole: 'consciousness synthesis',
  },
  Moon: {
    domain: 'Body timing, memory, instinct, care',
    counsel: 'Let emotional weather set the pacing for heavier work.',
    agent: 'Joan of Arc',
    agentRole: 'devotion and courage',
  },
  Mercury: {
    domain: 'Language, routing, teaching, interpretation',
    counsel: 'Name the pattern, then choose the right agent for the next move.',
    agent: 'Monica',
    agentRole: 'desktop guide and interpreter',
  },
  Venus: {
    domain: 'Taste, relationship, value, design',
    counsel: 'Refine the interface between desire and reality.',
    agent: 'Frida Kahlo',
    agentRole: 'beauty and emotional truth',
  },
  Mars: {
    domain: 'Action, risk, conflict, precision',
    counsel: 'Convert tension into a bounded action with a clean finish line.',
    agent: 'Cleopatra',
    agentRole: 'strategy and command',
  },
  Jupiter: {
    domain: 'Meaning, law, expansion, education',
    counsel: 'Use the broadest perspective that still produces a concrete next step.',
    agent: 'Buddha',
    agentRole: 'wisdom and expansion',
  },
  Saturn: {
    domain: 'Structure, limits, mastery, accountability',
    counsel: 'Strengthen the frame before increasing complexity.',
    agent: 'Marcus Aurelius',
    agentRole: 'discipline and judgment',
  },
  Uranus: {
    domain: 'Breakthroughs, systems change, invention',
    counsel: 'Preserve the working circuit while testing the bold improvement.',
    agent: 'Nikola Tesla',
    agentRole: 'innovation and electricity',
  },
  Neptune: {
    domain: 'Imagination, compassion, myth, dream logic',
    counsel: 'Let symbolic insight inspire the work without blurring the task.',
    agent: 'Rumi',
    agentRole: 'mystic imagination',
  },
  Pluto: {
    domain: 'Depth psychology, power, shadow, regeneration',
    counsel: 'Follow the pressure to the root assumption that wants to transform.',
    agent: 'Carl Jung',
    agentRole: 'shadow integration',
  },
}

const ELEMENT_TO_ESMS: Record<AstrologyElement, keyof TokenCosts> = {
  Fire: 'spirit',
  Water: 'essence',
  Earth: 'matter',
  Air: 'substance',
}

const ASTRO_ASPECTS = [
  { type: 'conjunction', angle: 0, orb: 8, polarity: 'fusion', weight: 1.15 },
  { type: 'opposition', angle: 180, orb: 8, polarity: 'polarity', weight: 1.05 },
  { type: 'trine', angle: 120, orb: 6, polarity: 'flow', weight: 0.8 },
  { type: 'square', angle: 90, orb: 6, polarity: 'friction', weight: 1 },
  { type: 'sextile', angle: 60, orb: 4, polarity: 'opportunity', weight: 0.62 },
  { type: 'quincunx', angle: 150, orb: 3, polarity: 'adjustment', weight: 0.55 },
] as const

function buildAstrologyConsensusSnapshot({
  date = new Date(),
  latitude = 40.7128,
  longitude = -74.006,
}: {
  date?: Date
  latitude?: number
  longitude?: number
} = {}) {
  const birthInfo = dateToEnhancedBirthInfo(date, latitude, longitude)
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000)
  const chart = calculateAllPlanets(birthInfo)
  const nextChart = calculateAllPlanets(dateToEnhancedBirthInfo(tomorrow, latitude, longitude))
  const planets = ASTROLOGY_PLANET_ORDER.map(planet =>
    buildPlanetSnapshot(planet, chart.planets[planet], nextChart.planets[planet])
  )
  const aspects = calculateConsensusAspects(planets)
  const quantities = calculateConsensusQuantities(planets, aspects)
  const moonPhase = calculateMoonPhase(planets)
  const planetaryHour = calculatePlanetaryHourSnapshot(date)
  const activeAgents = buildAgentActivations(planets, aspects, quantities.dominantElement)
  const layers = buildConsensusLayers(planets, aspects, quantities, moonPhase)
  const recommendations = buildAstrologyRecommendations(
    quantities.dominantElement,
    aspects,
    moonPhase,
    planetaryHour.current
  )

  return {
    generatedAt: date.toISOString(),
    location: {
      label: 'Desktop consensus default',
      latitude,
      longitude,
      note: 'Planetary longitudes are time driven; location supports chart frame and future houses.',
    },
    provenance: [
      {
        name: 'Kitchen Current Chart',
        url: 'https://alchm.kitchen/current-chart',
        contribution: 'Live sky and A-number compact chart',
      },
      {
        name: 'Kitchen Lab',
        url: 'https://alchm.kitchen/lab',
        contribution: 'Planetary chart, current chart, standing chart workflow',
      },
      {
        name: 'Alchm Quantities',
        url: 'https://alchm.kitchen/api/alchm-quantities',
        contribution: 'Spirit, Essence, Matter, Substance, heat, entropy, reactivity, energy',
      },
      {
        name: 'Alchm Agents',
        url: 'https://agents.alchm.kitchen',
        contribution: 'Agent activation layer and Monica consciousness routing',
      },
      {
        name: "Philosopher's Stone",
        url: 'https://agents.alchm.kitchen/philosophers-stone',
        contribution: 'Birth data to local agent creation path',
      },
    ],
    chart: {
      title: 'Consensus Sky',
      source: 'desktop sidecar plus shared Alchm astrology libraries',
      sunSign: planets.find(planet => planet.planet === 'Sun')?.sign || 'Aries',
      moonSign: planets.find(planet => planet.planet === 'Moon')?.sign || 'Aries',
      ascendant: {
        sign: chart.ascendant.sign,
        degree: roundNumber(chart.ascendant.signDegree, 2),
        longitude: roundNumber(chart.ascendant.longitude, 2),
      },
      julianDay: roundNumber(chart.julianDay, 5),
      planets,
      aspects,
    },
    quantities,
    moonPhase,
    planetaryHour,
    activeAgents,
    layers,
    recommendations,
  }
}

function dateToEnhancedBirthInfo(
  date: Date,
  latitude: number,
  longitude: number
): EnhancedBirthInfo {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    latitude,
    longitude,
  }
}

function buildPlanetSnapshot(
  planet: PlanetName,
  current: { longitude: number; sign: string; signDegree: number },
  next: { longitude: number; sign: string; signDegree: number }
) {
  const sign = normalizeZodiacSign(current.sign)
  const signMeta = signMetaFor(sign)
  const speed = signedAngleDelta(current.longitude, next.longitude)
  const dignity = dignityForPlanet(planet, sign)
  const degree = roundNumber(current.signDegree, 2)
  const wholeDegree = Math.floor(degree)
  const minute = Math.floor((degree - wholeDegree) * 60)
  const dignityScore = dignityScoreFor(dignity)

  return {
    planet,
    sign,
    signAbbreviation: signMeta.abbreviation,
    degree,
    minute,
    display: `${sign} ${wholeDegree}deg ${String(minute).padStart(2, '0')}'`,
    longitude: roundNumber(normalizeAngle(current.longitude), 3),
    element: signMeta.element,
    mode: signMeta.mode,
    ruler: signMeta.ruler,
    dignity,
    dignityScore,
    motion: speed < -0.01 ? 'retrograde' : 'direct',
    speed: roundNumber(speed, 3),
    source: 'enhanced astronomical calculator',
    domain: PLANET_SIGNALS[planet].domain,
    counsel: PLANET_SIGNALS[planet].counsel,
    agent: PLANET_SIGNALS[planet].agent,
    agentRole: PLANET_SIGNALS[planet].agentRole,
    esms: capitalizeWord(ELEMENT_TO_ESMS[signMeta.element]),
    color: signMeta.color,
    strength: roundNumber(PLANET_WEIGHTS[planet] + dignityScore * 0.15, 2),
  }
}

function calculateConsensusAspects(planets: ReturnType<typeof buildPlanetSnapshot>[]): Array<{
  id: string
  planetA: PlanetName
  planetB: PlanetName
  type: string
  angle: number
  orb: number
  exactness: number
  applying: boolean
  polarity: string
  weight: number
  summary: string
}> {
  const aspects: Array<{
    id: string
    planetA: PlanetName
    planetB: PlanetName
    type: string
    angle: number
    orb: number
    exactness: number
    applying: boolean
    polarity: string
    weight: number
    summary: string
  }> = []

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planetA = planets[i]
      const planetB = planets[j]
      const distance = angularSeparation(planetA.longitude, planetB.longitude)
      const match = ASTRO_ASPECTS.map(aspect => ({
        type: aspect.type,
        angle: aspect.angle,
        maxOrb: aspect.orb,
        polarity: aspect.polarity,
        weight: aspect.weight,
        orb: Math.abs(distance - aspect.angle),
      }))
        .filter(aspect => aspect.orb <= aspect.maxOrb)
        .sort((a, b) => a.orb - b.orb)[0]

      if (!match) continue

      const nextDistance = angularSeparation(
        planetA.longitude + planetA.speed,
        planetB.longitude + planetB.speed
      )
      const applying = Math.abs(nextDistance - match.angle) < match.orb
      const exactness = Math.max(0, 1 - match.orb / match.maxOrb)

      aspects.push({
        id: `${planetA.planet}-${planetB.planet}-${match.type}`,
        planetA: planetA.planet,
        planetB: planetB.planet,
        type: match.type,
        angle: match.angle,
        orb: roundNumber(match.orb, 2),
        exactness: Math.round(exactness * 100),
        applying,
        polarity: match.polarity,
        weight: roundNumber(match.weight * exactness, 2),
        summary: `${planetA.planet} ${match.type} ${planetB.planet}`,
      })
    }
  }

  return aspects.sort((a, b) => b.exactness - a.exactness).slice(0, 14)
}

function calculateConsensusQuantities(
  planets: ReturnType<typeof buildPlanetSnapshot>[],
  aspects: ReturnType<typeof calculateConsensusAspects>
) {
  const elements: Record<AstrologyElement, number> = {
    Fire: 0,
    Water: 0,
    Earth: 0,
    Air: 0,
  }

  for (const planet of planets) {
    const dignityBonus = Math.max(-0.3, planet.dignityScore * 0.12)
    elements[planet.element] += Math.max(0.35, PLANET_WEIGHTS[planet.planet] + dignityBonus)
  }

  const kineticPressure = aspects.reduce((sum, aspect) => sum + aspect.weight, 0)
  const hardPressure = aspects
    .filter(aspect => aspect.type === 'square' || aspect.type === 'opposition')
    .reduce((sum, aspect) => sum + aspect.weight, 0)
  const harmonicFlow = aspects
    .filter(aspect => aspect.type === 'trine' || aspect.type === 'sextile')
    .reduce((sum, aspect) => sum + aspect.weight, 0)

  const spirit = 2.4 + elements.Fire * 1.2 + kineticPressure * 0.12
  const essence = 2.2 + elements.Water * 1.18 + harmonicFlow * 0.15
  const matter = 2.1 + elements.Earth * 1.22 + hardPressure * 0.11
  const substance = 2.3 + elements.Air * 1.16 + kineticPressure * 0.1
  const aNumber = spirit + essence + matter + substance
  const sortedElements = Object.entries(elements).sort((a, b) => b[1] - a[1]) as Array<
    [AstrologyElement, number]
  >
  const dominantElement = sortedElements[0][0]
  const heat = spirit / Math.max(1, essence + matter * 0.5)
  const entropy = (substance + hardPressure + 1) / Math.max(1, matter + essence)
  const reactivity = (hardPressure + kineticPressure * 0.4 + spirit * 0.2) / Math.max(1, matter)
  const energy = spirit + substance + harmonicFlow - entropy * reactivity

  return {
    Spirit: roundNumber(spirit, 2),
    Essence: roundNumber(essence, 2),
    Matter: roundNumber(matter, 2),
    Substance: roundNumber(substance, 2),
    ANumber: roundNumber(aNumber, 2),
    dominantElement,
    elementalBalance: {
      Fire: roundNumber(elements.Fire, 2),
      Water: roundNumber(elements.Water, 2),
      Earth: roundNumber(elements.Earth, 2),
      Air: roundNumber(elements.Air, 2),
    },
    heat: roundNumber(heat, 3),
    entropy: roundNumber(entropy, 3),
    reactivity: roundNumber(reactivity, 3),
    energy: roundNumber(energy, 3),
    kineticPressure: roundNumber(kineticPressure, 2),
    harmonicFlow: roundNumber(harmonicFlow, 2),
  }
}

function calculateMoonPhase(planets: ReturnType<typeof buildPlanetSnapshot>[]) {
  const sun = planets.find(planet => planet.planet === 'Sun')
  const moon = planets.find(planet => planet.planet === 'Moon')
  const phaseAngle = sun && moon ? normalizeAngle(moon.longitude - sun.longitude) : 0
  const illumination = (1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2
  const phaseNames = [
    { max: 22.5, name: 'New Moon', instruction: 'seed' },
    { max: 67.5, name: 'Waxing Crescent', instruction: 'commit' },
    { max: 112.5, name: 'First Quarter', instruction: 'choose' },
    { max: 157.5, name: 'Waxing Gibbous', instruction: 'refine' },
    { max: 202.5, name: 'Full Moon', instruction: 'reveal' },
    { max: 247.5, name: 'Waning Gibbous', instruction: 'teach' },
    { max: 292.5, name: 'Last Quarter', instruction: 'release' },
    { max: 337.5, name: 'Waning Crescent', instruction: 'restore' },
    { max: 360, name: 'New Moon', instruction: 'seed' },
  ]
  const phase = phaseNames.find(item => phaseAngle <= item.max) || phaseNames[0]

  return {
    name: phase.name,
    angle: roundNumber(phaseAngle, 2),
    illumination: Math.round(illumination * 100),
    instruction: phase.instruction,
  }
}

function calculatePlanetaryHourSnapshot(date: Date) {
  const dayRulers: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
  const chaldean: PlanetName[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']
  const dayRuler = dayRulers[date.getDay()]
  const hourIndex = date.getHours()
  const dayRulerIndex = chaldean.indexOf(dayRuler)
  const current = chaldean[(dayRulerIndex + hourIndex) % chaldean.length]

  return {
    dayRuler,
    current,
    hourNumber: hourIndex + 1,
    sequence: chaldean,
    method: 'local clock consensus',
  }
}

function buildAgentActivations(
  planets: ReturnType<typeof buildPlanetSnapshot>[],
  aspects: ReturnType<typeof calculateConsensusAspects>,
  dominantElement: AstrologyElement
) {
  const exactPlanetNames = new Set<PlanetName>()
  for (const aspect of aspects.slice(0, 5)) {
    exactPlanetNames.add(aspect.planetA)
    exactPlanetNames.add(aspect.planetB)
  }

  return planets
    .map(planet => {
      const aspectBoost = exactPlanetNames.has(planet.planet) ? 18 : 0
      const elementBoost = planet.element === dominantElement ? 12 : 0
      const dignityBoost = Math.max(0, planet.dignityScore * 5)
      const score = Math.round(
        54 + PLANET_WEIGHTS[planet.planet] * 8 + aspectBoost + elementBoost + dignityBoost
      )

      return {
        planet: planet.planet,
        agent: planet.agent,
        role: planet.agentRole,
        domain: planet.domain,
        score: Math.min(99, score),
        reason: `${planet.planet} in ${planet.sign} routes ${planet.domain.toLowerCase()}.`,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}

function buildConsensusLayers(
  planets: ReturnType<typeof buildPlanetSnapshot>[],
  aspects: ReturnType<typeof calculateConsensusAspects>,
  quantities: ReturnType<typeof calculateConsensusQuantities>,
  moonPhase: ReturnType<typeof calculateMoonPhase>
) {
  const dignifiedPlanets = planets.filter(
    planet => planet.dignity === 'domicile' || planet.dignity === 'exaltation'
  ).length

  return [
    {
      id: 'current-chart',
      label: 'Current Chart',
      source: 'Kitchen current-chart',
      status: 'online',
      confidence: 96,
      signal: `${planets[0].sign} Sun, ${planets[1].sign} Moon`,
    },
    {
      id: 'planetary-chart',
      label: 'Planetary Chart',
      source: 'Kitchen chart tools',
      status: 'online',
      confidence: 94,
      signal: `${planets.length} bodies resolved with sign degree and motion`,
    },
    {
      id: 'standing-chart',
      label: 'Standing Chart',
      source: 'Kitchen stored natal layer',
      status: 'ready',
      confidence: 88,
      signal: 'Prepared for encrypted natal overlay when account data is linked',
    },
    {
      id: 'quantities',
      label: 'Alchm Quantities',
      source: 'ESMS thermodynamic layer',
      status: 'online',
      confidence: 93,
      signal: `A# ${quantities.ANumber}, ${quantities.dominantElement} dominance`,
    },
    {
      id: 'aspects',
      label: 'Dynamic Aspects',
      source: 'aspect consensus engine',
      status: 'online',
      confidence: 91,
      signal: `${aspects.length} major aspects, ${dignifiedPlanets} dignified placements`,
    },
    {
      id: 'agents',
      label: 'Agent Activations',
      source: 'Agents consciousness map',
      status: 'ready',
      confidence: 90,
      signal: 'Planetary rulers mapped to companion agent routing',
    },
    {
      id: 'stone',
      label: "Philosopher's Stone",
      source: 'local agent creation',
      status: 'ready',
      confidence: 92,
      signal: 'Birth data route available for local agent generation',
    },
    {
      id: 'lunar',
      label: 'Lunar Timing',
      source: 'desktop temporal layer',
      status: 'online',
      confidence: 89,
      signal: `${moonPhase.name}, ${moonPhase.illumination}% illuminated`,
    },
  ]
}

function buildAstrologyRecommendations(
  dominantElement: AstrologyElement,
  aspects: ReturnType<typeof calculateConsensusAspects>,
  moonPhase: ReturnType<typeof calculateMoonPhase>,
  planetaryHour: PlanetName
) {
  const topAspect = aspects[0]
  const elementAdvice: Record<AstrologyElement, string> = {
    Fire: 'Lead with spirit: ship the decisive version, then iterate in public.',
    Water: 'Lead with essence: capture emotional truth before optimizing structure.',
    Earth: 'Lead with matter: make the chart actionable, measurable, and grounded.',
    Air: 'Lead with substance: clarify language, routing, and agent handoffs.',
  }

  return [
    elementAdvice[dominantElement],
    `The ${moonPhase.name.toLowerCase()} phase favors ${moonPhase.instruction} work.`,
    `${planetaryHour} hour is the best immediate routing signal for agent choice.`,
    topAspect
      ? `${topAspect.summary} is the sharpest aspect to watch at ${topAspect.orb} deg orb.`
      : 'No tight major aspect dominates; use the dashboard as a calm baseline.',
  ]
}

type PhysicsQuantityKey = 'Spirit' | 'Essence' | 'Matter' | 'Substance' | 'ANumber'
type PhysicsThermodynamicKey = 'heat' | 'entropy' | 'reactivity' | 'energy'
type PhysicsBand = 'low' | 'below' | 'normal' | 'elevated' | 'extreme'

interface AlchmPhysicsPoint {
  timestamp: string
  offsetHours: number
  label: string
  quantities: Record<PhysicsQuantityKey, number>
  thermodynamics: Record<PhysicsThermodynamicKey, number>
  elements: ElementVector
  dominantElement: AstrologyElement
  planetaryHour: PlanetName
  moonPhase: string
  aspectPressure: number
  harmonicFlow: number
}

interface PhysicsZMetric {
  key: string
  label: string
  value: number
  mean: number
  stdDev: number
  zScore: number
  percentile: number
  band: PhysicsBand
  direction: 'below baseline' | 'at baseline' | 'above baseline'
}

const PHYSICS_QUANTITY_METRICS: Array<{
  key: PhysicsQuantityKey
  label: string
  precision: number
}> = [
  { key: 'Spirit', label: 'Spirit', precision: 2 },
  { key: 'Essence', label: 'Essence', precision: 2 },
  { key: 'Matter', label: 'Matter', precision: 2 },
  { key: 'Substance', label: 'Substance', precision: 2 },
  { key: 'ANumber', label: 'A-number', precision: 2 },
]

const PHYSICS_THERMO_METRICS: Array<{
  key: PhysicsThermodynamicKey
  label: string
  precision: number
}> = [
  { key: 'heat', label: 'Heat', precision: 3 },
  { key: 'entropy', label: 'Entropy', precision: 3 },
  { key: 'reactivity', label: 'Reactivity', precision: 3 },
  { key: 'energy', label: 'Energy', precision: 3 },
]

const PHYSICS_HOUR_MS = 60 * 60 * 1000

function buildAlchmPhysicsSnapshot({
  date = new Date(),
  latitude = 40.7128,
  longitude = -74.006,
  windowHours = 24,
}: {
  date?: Date
  latitude?: number
  longitude?: number
  windowHours?: number
} = {}) {
  const baselineWindowHours = clampWholeNumber(windowHours, 6, 72)
  const radiusHours = Math.max(3, Math.floor(baselineWindowHours / 2))
  const points = buildAlchmPhysicsSeries(date, latitude, longitude, radiusHours)
  const currentIndex = Math.max(
    0,
    points.findIndex(point => point.offsetHours === 0)
  )
  const current = points[currentIndex] || points[Math.floor(points.length / 2)]
  const quantityZScores = PHYSICS_QUANTITY_METRICS.map(metric =>
    buildPhysicsZMetric(
      metric.key,
      metric.label,
      current.quantities[metric.key],
      points.map(point => point.quantities[metric.key]),
      metric.precision
    )
  )
  const thermodynamicZScores = PHYSICS_THERMO_METRICS.map(metric =>
    buildPhysicsZMetric(
      metric.key,
      metric.label,
      current.thermodynamics[metric.key],
      points.map(point => point.thermodynamics[metric.key]),
      metric.precision
    )
  )
  const kinetics = buildAlchmPhysicsKinetics(points, currentIndex)
  const landscape = buildAlchmLandscape(current, quantityZScores, thermodynamicZScores, kinetics)
  const samplePoints = buildPhysicsSamplePoints(points, quantityZScores, thermodynamicZScores)

  return {
    generatedAt: new Date().toISOString(),
    targetMoment: current.timestamp,
    baseline: {
      windowHours: baselineWindowHours,
      samples: points.length,
      cadence: 'hourly',
      method:
        'Current value compared against the surrounding live-sky Alchm landscape with z = (x - mean) / sigma.',
    },
    location: {
      label: 'Desktop physics default',
      latitude,
      longitude,
    },
    provenance: [
      {
        name: 'Kitchen Alchm Quantities',
        url: 'https://alchm.kitchen/quantities',
        contribution: 'Source product surface for ESMS quantities and current alchemical landscape',
      },
      {
        name: 'Kitchen Quantities API',
        url: 'https://alchm.kitchen/api/alchm-quantities',
        contribution: 'Spirit, Essence, Matter, Substance, A-number, and thermodynamic metrics',
      },
      {
        name: 'Kitchen Kinetics API',
        url: 'https://alchm.kitchen/api/alchm-kinetics',
        contribution: 'Velocity, momentum, force, power, and planetary timing model',
      },
      {
        name: 'Current Chart',
        url: 'https://alchm.kitchen/current-chart',
        contribution: 'Live sky basis for the desktop consensus snapshot',
      },
    ],
    current,
    zScores: {
      quantities: quantityZScores,
      thermodynamics: thermodynamicZScores,
    },
    kinetics,
    landscape,
    samplePoints,
    recommendations: buildPhysicsRecommendations(
      landscape,
      quantityZScores,
      thermodynamicZScores,
      kinetics
    ),
  }
}

function buildAlchmPhysicsSeries(
  date: Date,
  latitude: number,
  longitude: number,
  radiusHours: number
) {
  const points: AlchmPhysicsPoint[] = []

  for (let offsetHours = -radiusHours; offsetHours <= radiusHours; offsetHours++) {
    const sampleDate = new Date(date.getTime() + offsetHours * PHYSICS_HOUR_MS)
    points.push(buildAlchmPhysicsPoint(sampleDate, offsetHours, latitude, longitude))
  }

  return points
}

function buildAlchmPhysicsPoint(
  date: Date,
  offsetHours: number,
  latitude: number,
  longitude: number
): AlchmPhysicsPoint {
  const snapshot = buildAstrologyConsensusSnapshot({ date, latitude, longitude })

  return {
    timestamp: snapshot.generatedAt,
    offsetHours,
    label: formatPhysicsSampleLabel(date, offsetHours),
    quantities: {
      Spirit: snapshot.quantities.Spirit,
      Essence: snapshot.quantities.Essence,
      Matter: snapshot.quantities.Matter,
      Substance: snapshot.quantities.Substance,
      ANumber: snapshot.quantities.ANumber,
    },
    thermodynamics: {
      heat: snapshot.quantities.heat,
      entropy: snapshot.quantities.entropy,
      reactivity: snapshot.quantities.reactivity,
      energy: snapshot.quantities.energy,
    },
    elements: {
      Fire: snapshot.quantities.elementalBalance.Fire,
      Water: snapshot.quantities.elementalBalance.Water,
      Air: snapshot.quantities.elementalBalance.Air,
      Earth: snapshot.quantities.elementalBalance.Earth,
    },
    dominantElement: snapshot.quantities.dominantElement,
    planetaryHour: snapshot.planetaryHour.current,
    moonPhase: snapshot.moonPhase.name,
    aspectPressure: snapshot.quantities.kineticPressure,
    harmonicFlow: snapshot.quantities.harmonicFlow,
  }
}

function buildAlchmPhysicsKinetics(points: AlchmPhysicsPoint[], currentIndex: number) {
  const elementalSamples = points.map(point => ({
    t: new Date(point.timestamp),
    totals: {
      Fire: point.quantities.Spirit,
      Water: point.quantities.Essence,
      Air: point.quantities.Substance,
      Earth: point.quantities.Matter,
    },
    planetaryHour: point.planetaryHour,
  }))
  const metricSamples = points.map(point => ({
    t: new Date(point.timestamp),
    Heat: point.thermodynamics.heat,
    Entropy: point.thermodynamics.entropy,
    Reactivity: point.thermodynamics.reactivity,
    Energy: point.thermodynamics.energy,
  }))
  const powerSamples = points.map(point => ({
    t: new Date(point.timestamp),
    Energy: point.thermodynamics.energy,
    planetaryHour: point.planetaryHour,
  }))

  const elementalVelocity = computeElementalVelocity(elementalSamples)
  const metricVelocity = computeMetricVelocity(metricSamples)
  const power = computePower(powerSamples, { window: 3 })
  const momentumInput = elementalVelocity.map((velocity, index) => {
    const point = points[index]
    return {
      t: velocity.t,
      v: velocity.v,
      inertia: computeInertia({
        matter: point.quantities.Matter,
        earth: point.elements.Earth,
        substance: point.quantities.Substance,
        planetaryHour: point.planetaryHour,
      }),
      substance: point.quantities.Substance,
    }
  })
  const elementalMomentum = computeElementalMomentum(momentumInput)
  const elementalForce = computeForce(
    elementalMomentum.map((momentum, index) => ({
      t: momentum.t,
      p: momentum.p,
      inertia: momentumInput[index]?.inertia || 1,
      planetaryHour: points[index]?.planetaryHour,
    })),
    elementalVelocity.map((velocity, index) => ({
      t: velocity.t,
      v: velocity.v,
      planetaryHour: points[index]?.planetaryHour,
    }))
  )

  const velocity =
    elementalVelocity[currentIndex] || elementalVelocity[elementalVelocity.length - 1]
  const metrics = metricVelocity[currentIndex] || metricVelocity[metricVelocity.length - 1]
  const momentum =
    elementalMomentum[currentIndex] || elementalMomentum[elementalMomentum.length - 1]
  const force = elementalForce[currentIndex] || elementalForce[elementalForce.length - 1]
  const currentPower = power[currentIndex] || power[power.length - 1]
  const inertia = momentumInput[currentIndex]?.inertia || 1

  return {
    velocity: {
      magnitude: roundNumber(velocity?.magnitude || 0, 4),
      dominantElement: velocity?.dominantElement || points[currentIndex]?.dominantElement || 'Fire',
      vector: roundElementVector(velocity?.v),
    },
    metricVelocity: {
      vector: {
        heat: roundNumber(metrics?.dvdt.Heat || 0, 4),
        entropy: roundNumber(metrics?.dvdt.Entropy || 0, 4),
        reactivity: roundNumber(metrics?.dvdt.Reactivity || 0, 4),
        energy: roundNumber(metrics?.dvdt.Energy || 0, 4),
      },
      thermalDirection: metrics?.thermalDirection || 'stable',
    },
    momentum: {
      magnitude: roundNumber(momentum?.magnitude || 0, 4),
      type: momentum?.momentumType || 'sustained',
      vector: roundElementVector(momentum?.p),
    },
    force: {
      magnitude: roundNumber(force?.magnitude || 0, 4),
      type: force?.forceType || 'balanced',
      vector: roundElementVector(force?.f),
    },
    power: {
      value: roundNumber(currentPower?.power || 0, 4),
      solarAmplification: currentPower?.solarAmplification || 1,
    },
    inertia: roundNumber(inertia, 3),
    calculus: {
      velocity: 'dx/dt',
      momentum: 'm x v',
      force: 'dp/dt',
      power: 'dE/dt',
    },
  }
}

function buildPhysicsZMetric(
  key: string,
  label: string,
  value: number,
  baselineValues: number[],
  precision: number
): PhysicsZMetric {
  const stats = calculatePhysicsStats(baselineValues)
  const zScore = stats.stdDev > 0.000001 ? (value - stats.mean) / stats.stdDev : 0

  return {
    key,
    label,
    value: roundNumber(value, precision),
    mean: roundNumber(stats.mean, precision),
    stdDev: roundNumber(stats.stdDev, precision),
    zScore: roundNumber(zScore, 2),
    percentile: percentileFromZScore(zScore),
    band: classifyZScore(zScore),
    direction: zScore > 0.15 ? 'above baseline' : zScore < -0.15 ? 'below baseline' : 'at baseline',
  }
}

function calculatePhysicsStats(values: number[]) {
  const finiteValues = values.filter(value => Number.isFinite(value))
  if (!finiteValues.length) return { mean: 0, stdDev: 0 }

  const mean = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
  const variance =
    finiteValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, finiteValues.length)

  return {
    mean,
    stdDev: Math.sqrt(variance),
  }
}

function classifyZScore(zScore: number): PhysicsBand {
  if (zScore <= -2) return 'low'
  if (zScore < -1) return 'below'
  if (zScore < 1) return 'normal'
  if (zScore < 2) return 'elevated'
  return 'extreme'
}

function percentileFromZScore(zScore: number) {
  return Math.max(1, Math.min(99, Math.round(100 / (1 + Math.exp(-1.702 * zScore)))))
}

function buildAlchmLandscape(
  current: AlchmPhysicsPoint,
  quantityZScores: PhysicsZMetric[],
  thermodynamicZScores: PhysicsZMetric[],
  kinetics: ReturnType<typeof buildAlchmPhysicsKinetics>
) {
  const currentQuantities = quantityZScores.filter(metric => metric.key !== 'ANumber')
  const dominantQuantity = [...currentQuantities].sort((a, b) => b.value - a.value)[0]
  const strongestElement = (
    Object.entries(current.elements).sort((a, b) => b[1] - a[1]) as Array<
      [AstrologyElement, number]
    >
  )[0]
  const mostUnusual = [...quantityZScores, ...thermodynamicZScores].sort(
    (a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)
  )[0]
  const energyMetric =
    thermodynamicZScores.find(metric => metric.key === 'energy') || thermodynamicZScores[0]

  const mode =
    Math.abs(mostUnusual.zScore) >= 2
      ? 'anomalous'
      : kinetics.momentum.type === 'building' || kinetics.power.value > 0.02
        ? 'accelerating'
        : kinetics.momentum.type === 'dissipating' || kinetics.power.value < -0.02
          ? 'dissipating'
          : 'steady'

  const weather =
    mode === 'anomalous'
      ? `${mostUnusual.label} is ${mostUnusual.direction}`
      : mode === 'accelerating'
        ? `${dominantQuantity.label} is gaining kinetic support`
        : mode === 'dissipating'
          ? `${energyMetric.label} is releasing pressure`
          : `${dominantQuantity.label} is holding the field`

  return {
    mode,
    weather,
    dominantQuantity: dominantQuantity.label,
    dominantQuantityValue: dominantQuantity.value,
    strongestElement: strongestElement[0],
    strongestElementValue: roundNumber(strongestElement[1], 2),
    mostUnusual: {
      label: mostUnusual.label,
      zScore: mostUnusual.zScore,
      band: mostUnusual.band,
      direction: mostUnusual.direction,
    },
    energyZScore: energyMetric.zScore,
    planetaryHour: current.planetaryHour,
    moonPhase: current.moonPhase,
    aspectPressure: current.aspectPressure,
    harmonicFlow: current.harmonicFlow,
  }
}

function buildPhysicsSamplePoints(
  points: AlchmPhysicsPoint[],
  quantityZScores: PhysicsZMetric[],
  thermodynamicZScores: PhysicsZMetric[]
) {
  const quantityStats = Object.fromEntries(
    PHYSICS_QUANTITY_METRICS.map(metric => [
      metric.key,
      calculatePhysicsStats(points.map(point => point.quantities[metric.key])),
    ])
  ) as Record<PhysicsQuantityKey, { mean: number; stdDev: number }>
  const thermodynamicStats = Object.fromEntries(
    PHYSICS_THERMO_METRICS.map(metric => [
      metric.key,
      calculatePhysicsStats(points.map(point => point.thermodynamics[metric.key])),
    ])
  ) as Record<PhysicsThermodynamicKey, { mean: number; stdDev: number }>
  const currentQuantityBands = Object.fromEntries(
    quantityZScores.map(metric => [metric.key, metric.band])
  )
  const currentThermoBands = Object.fromEntries(
    thermodynamicZScores.map(metric => [metric.key, metric.band])
  )

  return points.map(point => ({
    timestamp: point.timestamp,
    offsetHours: point.offsetHours,
    label: point.label,
    quantities: point.quantities,
    thermodynamics: point.thermodynamics,
    ANumber: point.quantities.ANumber,
    energy: point.thermodynamics.energy,
    heat: point.thermodynamics.heat,
    entropy: point.thermodynamics.entropy,
    reactivity: point.thermodynamics.reactivity,
    quantityZScores: Object.fromEntries(
      PHYSICS_QUANTITY_METRICS.map(metric => [
        metric.key,
        roundNumber(zScoreForValue(point.quantities[metric.key], quantityStats[metric.key]), 2),
      ])
    ),
    thermodynamicZScores: Object.fromEntries(
      PHYSICS_THERMO_METRICS.map(metric => [
        metric.key,
        roundNumber(
          zScoreForValue(point.thermodynamics[metric.key], thermodynamicStats[metric.key]),
          2
        ),
      ])
    ),
    aNumberZScore: roundNumber(zScoreForValue(point.quantities.ANumber, quantityStats.ANumber), 2),
    energyZScore: roundNumber(
      zScoreForValue(point.thermodynamics.energy, thermodynamicStats.energy),
      2
    ),
    dominantElement: point.dominantElement,
    planetaryHour: point.planetaryHour,
    isCurrent: point.offsetHours === 0,
    quantityBands: currentQuantityBands,
    thermodynamicBands: currentThermoBands,
  }))
}

function buildPhysicsRecommendations(
  landscape: ReturnType<typeof buildAlchmLandscape>,
  quantityZScores: PhysicsZMetric[],
  thermodynamicZScores: PhysicsZMetric[],
  kinetics: ReturnType<typeof buildAlchmPhysicsKinetics>
) {
  const aNumber = quantityZScores.find(metric => metric.key === 'ANumber')
  const heat = thermodynamicZScores.find(metric => metric.key === 'heat')
  const entropy = thermodynamicZScores.find(metric => metric.key === 'entropy')
  const energy = thermodynamicZScores.find(metric => metric.key === 'energy')

  return [
    `Track ${landscape.mostUnusual.label}: z ${formatSignedNumber(landscape.mostUnusual.zScore)} is the strongest deviation in the current landscape.`,
    `${landscape.planetaryHour} hour gives the kinetic layer its immediate timing context; velocity is ${kinetics.velocity.magnitude.toFixed(4)} and momentum is ${kinetics.momentum.type}.`,
    energy && Math.abs(energy.zScore) >= 1
      ? `Energy is ${energy.direction} at z ${formatSignedNumber(energy.zScore)}; use this as the main thermodynamic watchpoint.`
      : `A-number is ${aNumber?.direction || 'at baseline'} at z ${formatSignedNumber(aNumber?.zScore || 0)}; the landscape is readable without a major energy anomaly.`,
    heat && entropy && heat.zScore > entropy.zScore
      ? 'Heat is leading entropy, so near-term changes favor activation before diffusion.'
      : 'Entropy is matching or leading heat, so near-term changes favor sorting, labeling, and clean routing.',
  ]
}

function zScoreForValue(value: number, stats: { mean: number; stdDev: number }) {
  return stats.stdDev > 0.000001 ? (value - stats.mean) / stats.stdDev : 0
}

function roundElementVector(vector?: Partial<ElementVector>): ElementVector {
  return {
    Fire: roundNumber(vector?.Fire || 0, 4),
    Water: roundNumber(vector?.Water || 0, 4),
    Air: roundNumber(vector?.Air || 0, 4),
    Earth: roundNumber(vector?.Earth || 0, 4),
  }
}

function clampWholeNumber(value: number, min: number, max: number) {
  const parsed = Number.isFinite(value) ? Math.round(value) : min
  return Math.max(min, Math.min(max, parsed))
}

function formatPhysicsSampleLabel(date: Date, offsetHours: number) {
  if (offsetHours === 0) return 'Now'
  const hour = date.toLocaleTimeString([], { hour: 'numeric' })
  return `${formatSignedNumber(offsetHours)}h ${hour}`
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${roundNumber(value, 2)}`
  return `${roundNumber(value, 2)}`
}

function normalizeZodiacSign(value: string): ZodiacSignName {
  const found = ASTROLOGY_SIGNS.find(sign => sign.name === value)
  return found?.name || 'Aries'
}

function signMetaFor(sign: ZodiacSignName) {
  return ASTROLOGY_SIGNS.find(item => item.name === sign) || ASTROLOGY_SIGNS[0]
}

function dignityForPlanet(planet: PlanetName, sign: ZodiacSignName) {
  const dignities = ASTROLOGY_DIGNITIES[planet]
  if (dignities.domicile.includes(sign)) return 'domicile'
  if (dignities.exaltation.includes(sign)) return 'exaltation'
  if (dignities.detriment.includes(sign)) return 'detriment'
  if (dignities.fall.includes(sign)) return 'fall'
  return 'peregrine'
}

function dignityScoreFor(dignity: string) {
  if (dignity === 'domicile') return 5
  if (dignity === 'exaltation') return 4
  if (dignity === 'detriment') return -4
  if (dignity === 'fall') return -5
  return 0
}

function normalizeAngle(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function signedAngleDelta(from: number, to: number) {
  let delta = normalizeAngle(to) - normalizeAngle(from)
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

function angularSeparation(a: number, b: number) {
  return Math.abs(signedAngleDelta(a, b))
}

function roundNumber(value: number, precision = 2) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function capitalizeWord(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

async function getAccountSnapshots(userId: string) {
  if (!pool || userId === DEV_DESKTOP_USER_ID) {
    const balances = { ...getLocalBalances(userId) }
    const claims = getLocalClaimState(userId)
    return {
      mode: 'local-dev',
      userId,
      balances,
      accounts: [
        snapshotForSite(
          'agents',
          balances,
          claims.agents || null,
          claims.agentsStreak,
          'local-dev',
          'Local development account'
        ),
        snapshotForSite(
          'kitchen',
          balances,
          claims.kitchen || null,
          claims.kitchenStreak,
          'local-dev',
          'Local development account'
        ),
      ],
    }
  }

  const result = await pool.query(
    `
      INSERT INTO token_balances (user_id, spirit, essence, matter, substance, updated_at)
      VALUES ($1, 0, 0, 0, 0, NOW())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = token_balances.updated_at
      RETURNING spirit, essence, matter, substance, last_daily_claim_at, last_daily_claim_agents_at;
    `,
    [userId]
  )
  const row = result.rows[0]
  const balances = {
    spirit: Number(row.spirit),
    essence: Number(row.essence),
    matter: Number(row.matter),
    substance: Number(row.substance),
  }

  return {
    mode: 'linked',
    userId,
    balances,
    accounts: [
      snapshotForSite(
        'agents',
        balances,
        row.last_daily_claim_agents_at?.toISOString?.() || row.last_daily_claim_agents_at || null,
        0,
        'linked'
      ),
      snapshotForSite(
        'kitchen',
        balances,
        row.last_daily_claim_at?.toISOString?.() || row.last_daily_claim_at || null,
        0,
        'linked'
      ),
    ],
  }
}

async function claimDailyYield(userId: string, site: AccountSite) {
  const distribution = {
    spirit: DAILY_YIELD_PER_TYPE,
    essence: DAILY_YIELD_PER_TYPE,
    matter: DAILY_YIELD_PER_TYPE,
    substance: DAILY_YIELD_PER_TYPE,
  }

  if (!pool || userId === DEV_DESKTOP_USER_ID) {
    const balances = getLocalBalances(userId)
    const claims = getLocalClaimState(userId)
    const lastClaim = claims[site]

    if (isToday(lastClaim)) {
      return { ok: false, status: 409, message: `${siteLabel(site)} yield already claimed today.` }
    }

    balances.spirit += distribution.spirit
    balances.essence += distribution.essence
    balances.matter += distribution.matter
    balances.substance += distribution.substance
    claims[site] = new Date().toISOString()
    if (site === 'agents') claims.agentsStreak += 1
    else claims.kitchenStreak += 1

    const snapshots = await getAccountSnapshots(userId)
    return {
      ok: true,
      distribution,
      balances: { ...balances },
      accounts: snapshots.accounts,
      account: snapshots.accounts.find(account => account.site === site),
    }
  }

  const claimColumn = site === 'agents' ? 'last_daily_claim_agents_at' : 'last_daily_claim_at'
  const sourceType = site === 'agents' ? 'agents_daily_yield' : 'kitchen_daily_yield'
  const dateStr = todayKey()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `
        INSERT INTO token_balances (user_id, spirit, essence, matter, substance, updated_at)
        VALUES ($1, 0, 0, 0, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING;
      `,
      [userId]
    )

    const current = await client.query(
      `
        SELECT spirit, essence, matter, substance, last_daily_claim_at, last_daily_claim_agents_at
        FROM token_balances
        WHERE user_id = $1
        FOR UPDATE;
      `,
      [userId]
    )
    const row = current.rows[0]
    const lastClaim = site === 'agents' ? row.last_daily_claim_agents_at : row.last_daily_claim_at

    if (isToday(lastClaim)) {
      await client.query('ROLLBACK')
      return { ok: false, status: 409, message: `${siteLabel(site)} yield already claimed today.` }
    }

    const updated = await client.query(
      `
        UPDATE token_balances
        SET spirit = spirit + $2,
            essence = essence + $3,
            matter = matter + $4,
            substance = substance + $5,
            ${claimColumn} = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
        RETURNING spirit, essence, matter, substance, last_daily_claim_at, last_daily_claim_agents_at;
      `,
      [
        userId,
        distribution.spirit,
        distribution.essence,
        distribution.matter,
        distribution.substance,
      ]
    )

    const transactionGroupId = randomUUID()
    for (const [tokenType, amount] of Object.entries(distribution)) {
      await client.query(
        `
          INSERT INTO token_transactions (
            transaction_group_id, user_id, token_type, amount, source_type, description,
            idempotency_key, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (idempotency_key) DO NOTHING;
        `,
        [
          transactionGroupId,
          userId,
          tokenType,
          amount,
          sourceType,
          `${siteLabel(site)} Daily Yield`,
          `daily:${site}:${userId}:${dateStr}:${tokenType}`,
        ]
      )
    }

    await client.query('COMMIT')

    const updatedRow = updated.rows[0]
    const balances = {
      spirit: Number(updatedRow.spirit),
      essence: Number(updatedRow.essence),
      matter: Number(updatedRow.matter),
      substance: Number(updatedRow.substance),
    }
    const accounts = [
      snapshotForSite(
        'agents',
        balances,
        updatedRow.last_daily_claim_agents_at?.toISOString?.() ||
          updatedRow.last_daily_claim_agents_at ||
          null,
        0,
        'linked'
      ),
      snapshotForSite(
        'kitchen',
        balances,
        updatedRow.last_daily_claim_at?.toISOString?.() || updatedRow.last_daily_claim_at || null,
        0,
        'linked'
      ),
    ]

    return {
      ok: true,
      distribution,
      balances,
      accounts,
      account: accounts.find(account => account.site === site),
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

async function debitTokens(userId: string, costs: TokenCosts, description: string) {
  if (!hasAnyCost(costs)) return { success: true, balances: await getTokenBalances(userId) }

  if (!pool || userId === DEV_DESKTOP_USER_ID) {
    const balances = getLocalBalances(userId)
    if (!hasEnoughBalance(balances, costs)) {
      return { success: false, balances: { ...balances }, missing: missingBalance(balances, costs) }
    }

    balances.spirit -= costs.spirit
    balances.essence -= costs.essence
    balances.matter -= costs.matter
    balances.substance -= costs.substance
    return { success: true, balances: { ...balances } }
  }

  const client = await pool.connect()
  const transactionGroupId = randomUUID()

  try {
    await client.query('BEGIN')
    const updated = await client.query(
      `
        UPDATE token_balances
        SET spirit = spirit - $2,
            essence = essence - $3,
            matter = matter - $4,
            substance = substance - $5,
            updated_at = NOW()
        WHERE user_id = $1
          AND spirit >= $2
          AND essence >= $3
          AND matter >= $4
          AND substance >= $5
        RETURNING spirit, essence, matter, substance;
      `,
      [userId, costs.spirit, costs.essence, costs.matter, costs.substance]
    )

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK')
      const balances = await getTokenBalances(userId)
      return { success: false, balances, missing: missingBalance(balances, costs) }
    }

    const entries = Object.entries(costs).filter(([, amount]) => amount > 0)
    for (const [tokenType, amount] of entries) {
      await client.query(
        `
          INSERT INTO token_transactions (
            transaction_group_id, user_id, token_type, amount, source_type, description, created_at
          )
          VALUES ($1, $2, $3, $4, 'local_inference', $5, NOW());
        `,
        [transactionGroupId, userId, tokenType, -amount, description]
      )
    }

    await client.query('COMMIT')
    const row = updated.rows[0]
    return {
      success: true,
      balances: {
        spirit: Number(row.spirit),
        essence: Number(row.essence),
        matter: Number(row.matter),
        substance: Number(row.substance),
      },
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

function hasAnyCost(costs: TokenCosts) {
  return costs.spirit > 0 || costs.essence > 0 || costs.matter > 0 || costs.substance > 0
}

type InferenceProfileName =
  | 'balanced'
  | 'fire-meltdown'
  | 'water-freeze'
  | 'earth-tectonic-root'
  | 'air-vacuum'

interface InferenceProfile {
  name: InferenceProfileName
  label: string
  element: 'Fire' | 'Water' | 'Earth' | 'Air' | 'Aether'
  contextPolicy: string
  threads: number
  batchThreads: number
  contextSize: number
  batchSize: number
  ubatchSize: number
  priority: number
  poll: number
  completion: {
    nPredict: number
    temperature: number
    topK: number
    topP: number
    repeatPenalty: number
  }
}

function clampThreads(value: number) {
  return Math.max(1, Math.min(LOGICAL_THREADS, Math.round(value)))
}

const INFERENCE_PROFILES: Record<InferenceProfileName, InferenceProfile> = {
  balanced: {
    name: 'balanced',
    label: 'Balanced Local Inference',
    element: 'Aether',
    contextPolicy: 'Default balanced context and throughput profile.',
    threads: clampThreads(LOGICAL_THREADS * 0.75),
    batchThreads: clampThreads(LOGICAL_THREADS * 0.75),
    contextSize: 8192,
    batchSize: 2048,
    ubatchSize: 512,
    priority: 0,
    poll: 50,
    completion: {
      nPredict: 512,
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      repeatPenalty: 1,
    },
  },
  'fire-meltdown': {
    name: 'fire-meltdown',
    label: 'Fire Meltdown',
    element: 'Fire',
    contextPolicy: 'Maximum throughput: all logical threads, high priority, large batch window.',
    threads: LOGICAL_THREADS,
    batchThreads: LOGICAL_THREADS,
    contextSize: 8192,
    batchSize: 4096,
    ubatchSize: 1024,
    priority: 2,
    poll: 100,
    completion: {
      nPredict: 768,
      temperature: 0.92,
      topK: 64,
      topP: 0.96,
      repeatPenalty: 1,
    },
  },
  'water-freeze': {
    name: 'water-freeze',
    label: 'Water Freeze',
    element: 'Water',
    contextPolicy: 'Deterministic cooling: low temperature and stable medium context.',
    threads: clampThreads(LOGICAL_THREADS * 0.6),
    batchThreads: clampThreads(LOGICAL_THREADS * 0.6),
    contextSize: 4096,
    batchSize: 1024,
    ubatchSize: 384,
    priority: 0,
    poll: 25,
    completion: {
      nPredict: 448,
      temperature: 0.22,
      topK: 16,
      topP: 0.82,
      repeatPenalty: 1.08,
    },
  },
  'earth-tectonic-root': {
    name: 'earth-tectonic-root',
    label: 'Earth Tectonic Root',
    element: 'Earth',
    contextPolicy: 'RAG-locked context: tight window, strict prompt grounding, low drift.',
    threads: clampThreads(LOGICAL_THREADS * 0.5),
    batchThreads: clampThreads(LOGICAL_THREADS * 0.5),
    contextSize: 2048,
    batchSize: 512,
    ubatchSize: 256,
    priority: 0,
    poll: 0,
    completion: {
      nPredict: 384,
      temperature: 0.18,
      topK: 12,
      topP: 0.72,
      repeatPenalty: 1.16,
    },
  },
  'air-vacuum': {
    name: 'air-vacuum',
    label: 'Air Vacuum',
    element: 'Air',
    contextPolicy: 'Lean detached execution: reduced context with crisp sampling.',
    threads: clampThreads(LOGICAL_THREADS * 0.65),
    batchThreads: clampThreads(LOGICAL_THREADS * 0.65),
    contextSize: 4096,
    batchSize: 1024,
    ubatchSize: 384,
    priority: 0,
    poll: 35,
    completion: {
      nPredict: 448,
      temperature: 0.52,
      topK: 28,
      topP: 0.9,
      repeatPenalty: 1.04,
    },
  },
}

function profileFromMove(moveId?: string): InferenceProfileName {
  switch (moveId) {
    case 'meltdown':
      return 'fire-meltdown'
    case 'freeze':
      return 'water-freeze'
    case 'tectonicRoot':
      return 'earth-tectonic-root'
    case 'vacuum':
      return 'air-vacuum'
    default:
      return 'balanced'
  }
}

function resolveProfile(profileName?: string, moveId?: string): InferenceProfile {
  const resolvedName = (profileName || profileFromMove(moveId)) as InferenceProfileName
  return INFERENCE_PROFILES[resolvedName] || INFERENCE_PROFILES.balanced
}

function applyProfilePrompt(prompt: string, profile: InferenceProfile) {
  if (profile.name !== 'earth-tectonic-root') return prompt

  return `[Earth Tectonic Root constraints]
Use only the context explicitly present in this prompt. If the supplied context is insufficient, say precisely what is missing. Prefer grounded, compact claims over speculation.

${prompt}`
}

function stopServer() {
  if (llamaServer) {
    console.log('Shutting down llama-server to free unified memory...')
    if (llamaServer.exitCode === null) llamaServer.kill(9)
    llamaServer = null
    currentModel = null
    currentProfileName = 'balanced'
  }
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    console.log(`[RAM Saver] Idle for 5 minutes. Terminating model ${currentModel}.`)
    stopServer()
  }, IDLE_TIMEOUT_MS)
}

async function waitForServerReady(): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:8081/health')
      if (res.ok) return true
    } catch (e) {
      // Expected connection refused until server binds
    }
    await Bun.sleep(500) // Wait 500ms before retrying
  }
  return false
}

async function startServer(modelName: string, profile: InferenceProfile) {
  stopServer() // Ensure clean slate
  console.log(
    `Cold booting llama-server with model: ${modelName} (${profile.label}, ${profile.threads} threads)`
  )

  llamaServer = Bun.spawn({
    cmd: [
      LLAMA_SERVER_PATH,
      '-m',
      join(APP_DATA_DIR, modelName),
      '-t',
      String(profile.threads),
      '-tb',
      String(profile.batchThreads),
      '-ngl',
      '99',
      '-c',
      String(profile.contextSize),
      '-b',
      String(profile.batchSize),
      '-ub',
      String(profile.ubatchSize),
      '--prio',
      String(profile.priority),
      '--poll',
      String(profile.poll),
      '--port',
      '8081',
    ],
    stdout: 'ignore',
    stderr: 'ignore', // Llama.cpp logs heavily to stderr, ignoring to keep sidecar quiet
  })

  currentModel = modelName
  currentProfileName = profile.name

  const isReady = await waitForServerReady()
  if (!isReady) {
    stopServer()
    throw new Error('Failed to start llama-server. Health check timed out.')
  }
  console.log('llama-server is hot and ready.')
}

// Ensure cleanup on sidecar termination
process.on('exit', stopServer)
process.on('SIGINT', () => {
  stopServer()
  process.exit(0)
})

// --- API Auth ---
async function authenticateToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.split(' ')[1]

  if (token === DEV_DESKTOP_API_KEY) return DEV_DESKTOP_USER_ID
  if (!pool) return null

  try {
    const result = await pool.query(
      `
        UPDATE desktop_api_keys
        SET last_used_at = NOW()
        WHERE token = $1
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        RETURNING user_id;
      `,
      [token]
    )
    return result.rows.length > 0 ? result.rows[0].user_id : null
  } catch (error: any) {
    if (error?.code === '42P01') {
      console.warn('desktop_api_keys table is missing; falling back to dev desktop API key only.')
      return null
    }
    throw error
  }
}

// --- HTTP Server ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-IPC-Nonce',
  'Access-Control-Max-Age': '86400',
}

function corsResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
  const headers = { ...CORS_HEADERS, ...(init.headers || {}) }
  return new Response(body, { ...init, headers })
}

async function commandText(cmd: string[], timeoutMs = 1500): Promise<string> {
  const proc = Bun.spawn({
    cmd,
    stdout: 'pipe',
    stderr: 'ignore',
  })

  const timeout = Bun.sleep(timeoutMs).then(() => {
    if (proc.exitCode === null) proc.kill(9)
    return ''
  })

  try {
    return await Promise.race([new Response(proc.stdout).text(), timeout])
  } catch {
    return ''
  }
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  const reader = Bun.file(path).stream().getReader()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) hash.update(Buffer.from(value))
  }

  return hash.digest('hex')
}

async function sampleCpuPercent() {
  const output = await commandText(['top', '-l', '1', '-n', '0', '-s', '0'])
  const match = output.match(/CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys,\s*([\d.]+)% idle/)
  if (!match) return null

  return Number((100 - Number(match[3])).toFixed(1))
}

async function sampleGpuTelemetry() {
  const output = await commandText(['ioreg', '-r', '-c', 'IOAccelerator', '-d', '1'], 1200)
  if (!output) return null

  const readNumber = (label: string) => {
    const match = output.match(new RegExp(`"${label}"=(\\d+)`))
    return match ? Number(match[1]) : null
  }

  return {
    utilizationPercent: readNumber('Device Utilization %'),
    rendererPercent: readNumber('Renderer Utilization %'),
    vramUsedBytes: readNumber('In use system memory'),
    vramAllocatedBytes: readNumber('Alloc system memory'),
  }
}

async function buildHardwareTelemetry() {
  const totalMemoryBytes = totalmem()
  const freeMemoryBytes = freemem()
  const gpu = await sampleGpuTelemetry()

  return {
    online: true,
    activeModel: currentModel,
    activeProfile: INFERENCE_PROFILES[currentProfileName as InferenceProfileName],
    llamaHot: Boolean(llamaServer && llamaServer.exitCode === null),
    cpu: {
      percent: await sampleCpuPercent(),
      logicalThreads: LOGICAL_THREADS,
      loadAverage: loadavg().map(value => Number(value.toFixed(2))),
    },
    memory: {
      totalBytes: totalMemoryBytes,
      usedBytes: totalMemoryBytes - freeMemoryBytes,
      freeBytes: freeMemoryBytes,
      usedPercent: Number(
        (((totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes) * 100).toFixed(1)
      ),
    },
    gpu,
    timestamp: new Date().toISOString(),
  }
}

const server = serve({
  port: 8080,
  async fetch(req: Request) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // 1. Validate IPC Handshake
    const incomingNonce = req.headers.get('X-IPC-Nonce')
    if (incomingNonce !== IPC_NONCE) {
      return corsResponse('Unauthorized IPC', { status: 403 })
    }

    const url = new URL(req.url)

    if (req.method === 'GET' && url.pathname === '/api/hardware/telemetry') {
      return corsResponse(JSON.stringify(await buildHardwareTelemetry()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/astrology/consensus') {
      const latitude = Number(url.searchParams.get('lat') || 40.7128)
      const longitude = Number(url.searchParams.get('lon') || -74.006)
      const snapshot = buildAstrologyConsensusSnapshot({
        latitude: Number.isFinite(latitude) ? latitude : 40.7128,
        longitude: Number.isFinite(longitude) ? longitude : -74.006,
      })

      return corsResponse(JSON.stringify(snapshot), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/alchm/physics') {
      const latitude = Number(url.searchParams.get('lat') || 40.7128)
      const longitude = Number(url.searchParams.get('lon') || -74.006)
      const windowHours = Number(url.searchParams.get('windowHours') || 24)
      const requestedDate = url.searchParams.get('date')
      const date = requestedDate ? new Date(requestedDate) : new Date()

      if (requestedDate && Number.isNaN(date.getTime())) {
        return corsResponse(JSON.stringify({ error: 'Invalid date query parameter.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const snapshot = buildAlchmPhysicsSnapshot({
        date,
        latitude: Number.isFinite(latitude) ? latitude : 40.7128,
        longitude: Number.isFinite(longitude) ? longitude : -74.006,
        windowHours: Number.isFinite(windowHours) ? windowHours : 24,
      })

      return corsResponse(JSON.stringify(snapshot), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/philosophers-stone/calculate') {
      const body = (await req.json().catch(() => ({}))) as PhilosopherStoneInput
      const result = calculateLocalPhilosopherStone(body)

      if (!result.ok) {
        return corsResponse(JSON.stringify({ success: false, message: result.message }), {
          status: result.status || 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return corsResponse(JSON.stringify({ success: true, data: result.data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/accounts') {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

      if (!pool && token && token !== DEV_DESKTOP_API_KEY) {
        try {
          const agentsUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://agents.alchm.kitchen'
          const res = await fetch(`${agentsUrl.replace(/\/$/, '')}/api/desktop/session`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (res.ok) {
            const data = await res.json()
            if (data.mode === 'authenticated') {
              return corsResponse(
                JSON.stringify({
                  mode: 'linked',
                  userId: data.userId,
                  balances: data.balances,
                  accounts: data.accounts,
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }
              )
            }
          }
          return corsResponse('Session verification failed on online portal', {
            status: res.status || 401,
          })
        } catch (err) {
          console.error('Failed to proxy accounts fetch to online portal:', err)
          return corsResponse('Failed to reach online portal', { status: 502 })
        }
      }

      const userId = await authenticateToken(req)
      if (!userId) return corsResponse('Invalid API Key', { status: 401 })

      return corsResponse(JSON.stringify(await getAccountSnapshots(userId)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/accounts/claim-daily') {
      const authHeader = req.headers.get('Authorization')
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

      if (!pool && token && token !== DEV_DESKTOP_API_KEY) {
        try {
          const body = await req.json().catch(() => ({}))
          const agentsUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://agents.alchm.kitchen'
          const res = await fetch(`${agentsUrl.replace(/\/$/, '')}/api/desktop/claim-yield`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const data = await res.json()
            return corsResponse(
              JSON.stringify({
                success: true,
                distribution: data.distribution,
                balances: data.balances,
              }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          } else {
            const errData = await res.json().catch(() => ({}))
            return corsResponse(
              JSON.stringify({ message: errData.message || 'Daily claim failed' }),
              {
                status: res.status,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }
        } catch (err) {
          console.error('Failed to proxy claim-daily request to online portal:', err)
          return corsResponse(JSON.stringify({ message: 'Failed to reach online portal' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      const userId = await authenticateToken(req)
      if (!userId) return corsResponse('Invalid API Key', { status: 401 })

      const body = await req.json().catch(() => ({}))
      const result = await claimDailyYield(userId, normalizeAccountSite(body.site))

      if (!result.ok) {
        return corsResponse(JSON.stringify({ message: result.message }), {
          status: result.status || 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return corsResponse(JSON.stringify({ success: true, ...result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && url.pathname === '/api/models/check') {
      const models = [
        'alchm-agent-fire-8b.gguf',
        'alchm-agent-water-8b.gguf',
        'alchm-agent-air-8b.gguf',
        'alchm-agent-earth-8b.gguf',
        'alchm-agent-fire-1.5b.gguf',
        'alchm-agent-water-1.5b.gguf',
        'alchm-agent-air-1.5b.gguf',
        'alchm-agent-earth-1.5b.gguf',
      ]

      const results = await Promise.all(
        models.map(async modelName => {
          const file = Bun.file(join(APP_DATA_DIR, modelName))
          const exists = await file.exists()
          let verified = false
          let size = 0
          if (exists) {
            size = file.size
            verified = size > 1024 * 1024 // At least 1MB to be considered a valid weights file
          }

          return {
            id: modelName,
            present: exists,
            verified,
            size,
          }
        })
      )

      return corsResponse(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/forge/transmute') {
      const { tier, modelName } = await req.json()

      const userId = await authenticateToken(req)
      if (!userId) return corsResponse('Invalid API Key', { status: 401 })

      if (tier === 'premium') {
        try {
          const cost = 125
          const debit = await debitTokens(
            userId,
            { spirit: cost, essence: cost, matter: cost, substance: cost },
            `Astral Engine Premium Model Unlock: ${modelName || 'unknown model'}`
          )

          if (!debit.success) {
            return corsResponse(
              JSON.stringify({
                error: 'Insufficient Alchemical Quantities.',
                missing: debit.missing,
                balances: debit.balances,
              }),
              { status: 402, headers: { 'Content-Type': 'application/json' } }
            )
          }

          console.log(`✨ User ${userId} transmuted 500 ESMS coins.`)
          return corsResponse(
            JSON.stringify({
              success: true,
              balances: debit.balances,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err: any) {
          console.error('Database quantity transaction failed:', err)
          return corsResponse(
            JSON.stringify({ error: 'Failed to connect to the off-chain vault' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return corsResponse(
          JSON.stringify({ success: true, message: 'Base model requires no transmutation' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/models/install') {
      const { modelName, downloadUrl, tier, sha256, size } = await req.json()

      const userId = await authenticateToken(req)
      if (!userId) return corsResponse('Invalid API Key', { status: 401 })

      if (!ALLOWED_MODELS.has(modelName)) {
        return corsResponse(
          'Invalid or unsupported model selected. Use official Alchm models only.',
          { status: 403 }
        )
      }

      if (tier === 'premium') {
        // Deduction is handled by /api/forge/transmute now
        console.log(`Model install requested for premium model: ${modelName}`)
      }

      let tmpPath = ''
      try {
        await mkdir(APP_DATA_DIR, { recursive: true })
        const response = await fetch(downloadUrl)
        if (!response.ok) throw new Error('Failed to fetch model from R2')
        const modelPath = join(APP_DATA_DIR, modelName)
        tmpPath = `${modelPath}.download`

        await Bun.write(tmpPath, response)
        const file = Bun.file(tmpPath)

        if (size && file.size !== Number(size)) {
          throw new Error(
            `Downloaded size mismatch for ${modelName}: expected ${size}, received ${file.size}`
          )
        }

        if (sha256) {
          const actualSha256 = await sha256File(tmpPath)
          if (actualSha256.toLowerCase() !== String(sha256).toLowerCase()) {
            throw new Error(`SHA-256 verification failed for ${modelName}`)
          }
        }

        await rename(tmpPath, modelPath).catch(async () => {
          await Bun.write(modelPath, file)
          await unlink(tmpPath).catch(() => {})
        })
        return corsResponse(
          JSON.stringify({
            success: true,
            message: `${tier.toUpperCase()} engine instantiated successfully.`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } catch (err: any) {
        if (tmpPath) await unlink(tmpPath).catch(() => {})
        return corsResponse(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const { prompt, modelName, costs, inferenceProfile, jingMoveId } = await req.json()
      const profile = resolveProfile(inferenceProfile, jingMoveId)

      // 2. Validate User API Key
      const userId = await authenticateToken(req)
      if (!userId) return corsResponse('Invalid API Key', { status: 401 })

      // 3. Strict Model Validation (No BYOM)
      if (!ALLOWED_MODELS.has(modelName)) {
        return corsResponse(
          'Invalid or unsupported model selected. Use official Alchm models only.',
          { status: 403 }
        )
      }

      const modelFile = Bun.file(join(APP_DATA_DIR, modelName))
      const modelExists = await modelFile.exists()
      if (!modelExists || modelFile.size < 1024 * 1024) {
        return corsResponse(
          JSON.stringify({
            error: 'Official local model is not installed on this device.',
            modelName,
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 4. Atomic Transaction
      const debit = await debitTokens(
        userId,
        normalizeCosts(costs || {}),
        'Local LLM Generation Deduction'
      )
      if (!debit.success) {
        return corsResponse(
          JSON.stringify({
            error: 'Insufficient Alchemical Tokens',
            missing: debit.missing,
            balances: debit.balances,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // 5. Manage Model Process Lifecycle
      try {
        if (!llamaServer || currentModel !== modelName || currentProfileName !== profile.name) {
          await startServer(modelName, profile)
        }
        resetIdleTimer()
      } catch (err) {
        return corsResponse(JSON.stringify({ error: 'Failed to initialize inference engine' }), {
          status: 500,
        })
      }

      // 6. Reverse Proxy to llama-server
      try {
        const proxyRes = await fetch('http://127.0.0.1:8081/completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: applyProfilePrompt(prompt, profile),
            stream: true,
            n_predict: profile.completion.nPredict,
            temperature: profile.completion.temperature,
            top_k: profile.completion.topK,
            top_p: profile.completion.topP,
            repeat_penalty: profile.completion.repeatPenalty,
          }),
        })

        if (!proxyRes.ok) throw new Error(`llama-server responded with ${proxyRes.status}`)

        // Stream the SSE response directly to the frontend
        return corsResponse(proxyRes.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        })
      } catch (error) {
        console.error('Proxy error:', error)
        return corsResponse('Error connecting to inference engine.', { status: 502 })
      }
    }

    return corsResponse('Not Found', { status: 404 })
  },
})

console.log(`Alchemical Orchestrator listening on port ${server.port}`)
