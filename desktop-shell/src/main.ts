import './styles.css'
import { LocalMcpClient } from './localMcpClient'

import type { CraftedAgent, Element } from '../../lib/agent-types'
import { DEMO_AGENTS } from '../../lib/demo-agents-data'
import { calculateAllPlanets } from '../../lib/enhanced-astronomical-calculator'
import { detectPatternsStatic } from '../../lib/astrological-pattern-recognition'
import { ChartGeometryExtractor } from '../../lib/chart-geometry-extractor'
import { createNatalSigilRune } from '../../lib/runes/natal-sigil-runes'
import { createSigilSvg, sigilSvgToDataUrl } from '../../lib/sigil-download'
import { buildLocalAstrologyMetrics } from './localAstrologyMetrics'
import type { NatalSigilRune } from '../../lib/runes/natal-sigil-runes'
import type { PlanetPosition, Aspect } from '../../lib/astrological-pattern-recognition'

type View =
  | 'chat'
  | 'astrology'
  | 'physics'
  | 'web3'
  | 'agents'
  | 'stone'
  | 'account'
  | 'diagnostics'
  | 'scrabble'
type Surface = 'main' | 'composer'
type ElementKey = 'fire' | 'water' | 'air' | 'earth'
type AgentTier = 'base' | 'premium'
type SidecarStatus = 'checking' | 'online' | 'offline'
type AstrologyStatus = 'idle' | 'loading' | 'ready' | 'error'
type PhysicsStatus = 'idle' | 'loading' | 'ready' | 'error'
type MessageRole = 'user' | 'agent'
type SiteKey = 'agents' | 'kitchen'
type SiteStatus = 'checking' | 'linked' | 'local-dev' | 'needs-link' | 'offline'

interface Balances {
  spirit: number
  essence: number
  matter: number
  substance: number
}

interface AccountSettings {
  displayName: string
  email: string
  userId: string
  apiKey: string
  plan: string
  agentsUrl: string
  kitchenUrl: string
}

interface AgentTemplate {
  id: string
  name: string
  title: string
  element: ElementKey
  tier: AgentTier
  modelName: string
  initials: string
  avatarUrl?: string
  localOnly?: boolean
  domains: string[]
  quote: string
  promptSeed: string
  websiteAgent?: CraftedAgent
  stoneBlueprint?: StoneBlueprint
}

interface LocalAgent extends AgentTemplate {
  addedAt: string
  source:
    | 'app-guide'
    | 'web-catalog'
    | 'web-unlock'
    | 'deep-link'
    | 'philosophers-stone'
    | 'private-local'
}

interface StoneBlueprint {
  birthDate: string
  birthTime: string
  birthLocation: string
  latitude: number
  longitude: number
  additionalContext: string
  dominantElement: ElementKey
  constitution: Balances
  monicaConstant: number
  consciousnessLevel: string
  sigil?: NatalSigilRune
  natalChart?: {
    planets: PlanetPosition[]
    aspects: Aspect[]
  }
}

interface StoneFormInput {
  name: string
  date: string
  time: string
  location: string
  latitude: number
  longitude: number
  additionalContext: string
}

interface StoneDraft {
  name: string
  date: string
  time: string
  location: string
  latitude: string
  longitude: string
  additionalContext: string
}

interface SiteAccount {
  site: SiteKey
  label: string
  homeUrl: string
  balances: Balances
  canClaimDaily: boolean
  streak: number
  lastDailyClaimAt: string | null
  status: SiteStatus
  message?: string
}

interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  channel?: string
  agentId?: string
  agentName?: string
}

interface AgentTextResult {
  content: string
  channel: string
  metered: boolean
}

interface AgentTurnResponse {
  agentId: string
  agentName: string
  content: string
}

interface AgentTurnContext {
  groupAgents: LocalAgent[]
  priorResponses: AgentTurnResponse[]
}

interface PrivateAgentAlchmContext {
  tools: string[]
  errors: string[]
  ingredients: string[]
  liveSky?: unknown
  ingredientScan?: unknown
  recipeCandidates?: unknown
}

interface LedgerEntry {
  id: string
  type: string
  details: string
  amount: string
  timestamp: string
}

interface HardwareTelemetry {
  activeModel?: string | null
  llamaHot?: boolean
  activeProfile?: {
    name?: string
    label?: string
  }
  cpu?: {
    percent?: number
    logicalThreads?: number
  }
  memory?: {
    totalBytes?: number
    usedBytes?: number
    usedPercent?: number
  }
  gpu?: {
    name?: string
    supported?: boolean
  } | null
  timestamp?: string
}

interface AstrologyPlanet {
  planet: string
  sign: string
  signAbbreviation: string
  degree: number
  minute: number
  display: string
  longitude: number
  element: string
  mode: string
  ruler: string
  dignity: string
  motion: string
  speed: number
  source: string
  domain: string
  counsel: string
  agent: string
  agentRole: string
  esms: string
  color: string
  strength: number
}

interface AstrologyAspect {
  id: string
  planetA: string
  planetB: string
  type: string
  angle: number
  orb: number
  exactness: number
  applying: boolean
  polarity: string
  weight: number
  summary: string
}

interface AstrologyQuantities {
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

interface AstrologyConsensusSnapshot {
  generatedAt: string
  provenance: Array<{
    name: string
    url: string
    contribution: string
  }>
  chart: {
    title: string
    source: string
    sunSign: string
    moonSign: string
    ascendant: {
      sign: string
      degree: number
      longitude: number
    }
    julianDay: number
    planets: AstrologyPlanet[]
    aspects: AstrologyAspect[]
  }
  quantities: AstrologyQuantities
  moonPhase: {
    name: string
    angle: number
    illumination: number
    instruction: string
  }
  planetaryHour: {
    dayRuler: string
    current: string
    hourNumber: number
    method: string
  }
  activeAgents: Array<{
    planet: string
    agent: string
    role: string
    domain: string
    score: number
    reason: string
  }>
  layers: Array<{
    id: string
    label: string
    source: string
    status: string
    confidence: number
    signal: string
  }>
  recommendations: string[]
}

interface AstrologyState {
  status: AstrologyStatus
  snapshot: AstrologyConsensusSnapshot | null
  lastError: string | null
}

interface Standing {
  rank: number
  agentId: string
  name: string
  elo: number
  played: number
  won: number
  lost: number
  tied: number
  pointsFor: number
  seasonId: string
}

interface RecentMatch {
  id: string
  seasonId: string
  agentA: string
  agentAId: string
  agentB: string
  agentBId: string
  winner: string | null
  scoreA: number
  scoreB: number
  margin: number
  highlight: string | null
  tie: boolean
  createdAt: string
}

interface ScrabbleArenaAgent {
  id: string
  name: string
  title: string
  specialization: string | null
}

interface ScrabbleTurn {
  round: number
  rack: string
  word: string
  score: number
  candidateCount: number
}

interface ScrabbleArenaPlayer extends ScrabbleArenaAgent {
  total: number
  bestWord: { word: string; score: number } | null
  turns: ScrabbleTurn[]
}

interface ScrabbleArenaMatch {
  id: string | null
  source: 'simulation' | 'league'
  seasonId: string | null
  seed: number
  rounds: number
  winnerId: string | null
  loserId: string | null
  tie: boolean
  margin: number
  highlight: string | null
  createdAt: string
  a: ScrabbleArenaPlayer
  b: ScrabbleArenaPlayer
}

interface ScrabbleLeagueData {
  available: boolean
  aggregates: {
    totalMatches: number
    last24h: number
    activeSeasons: number
    latestSeason: string | null
    highlights: { bingo: number; upset: number; sweep: number }
  } | null
  standings: Standing[]
  recentMatches: RecentMatch[]
  availableAgents: ScrabbleArenaAgent[]
}

type ScrabbleStatus = 'idle' | 'loading' | 'ready' | 'error'
type ScrabbleSimulationStatus = 'idle' | 'loading' | 'ready' | 'error'

interface ScrabbleState {
  status: ScrabbleStatus
  data: ScrabbleLeagueData | null
  lastError: string | null
  agentAId: string | null
  agentBId: string | null
  rounds: number
  simulationStatus: ScrabbleSimulationStatus
  activeMatch: ScrabbleArenaMatch | null
  simulationError: string | null
}

type PhysicsBand = 'low' | 'below' | 'normal' | 'elevated' | 'extreme'

interface PhysicsZMetric {
  key: string
  label: string
  value: number
  mean: number
  stdDev: number
  zScore: number
  percentile: number
  band: PhysicsBand
  direction: string
}

interface AlchmPhysicsSnapshot {
  generatedAt: string
  targetMoment: string
  baseline: {
    windowHours: number
    samples: number
    cadence: string
    method: string
  }
  location: {
    label: string
    latitude: number
    longitude: number
  }
  provenance: Array<{
    name: string
    url: string
    contribution: string
  }>
  current: {
    timestamp: string
    offsetHours: number
    label: string
    quantities: Record<'Spirit' | 'Essence' | 'Matter' | 'Substance' | 'ANumber', number>
    thermodynamics: Record<'heat' | 'entropy' | 'reactivity' | 'energy', number>
    elements: Record<string, number>
    dominantElement: string
    planetaryHour: string
    moonPhase: string
    aspectPressure: number
    harmonicFlow: number
  }
  zScores: {
    quantities: PhysicsZMetric[]
    thermodynamics: PhysicsZMetric[]
  }
  kinetics: {
    velocity: {
      magnitude: number
      dominantElement: string
      vector: Record<string, number>
    }
    metricVelocity: {
      vector: Record<'heat' | 'entropy' | 'reactivity' | 'energy', number>
      thermalDirection: string
    }
    momentum: {
      magnitude: number
      type: string
      vector: Record<string, number>
    }
    force: {
      magnitude: number
      type: string
      vector: Record<string, number>
    }
    power: {
      value: number
      solarAmplification: number
    }
    inertia: number
    calculus: Record<string, string>
  }
  landscape: {
    mode: string
    weather: string
    dominantQuantity: string
    dominantQuantityValue: number
    strongestElement: string
    strongestElementValue: number
    mostUnusual: {
      label: string
      zScore: number
      band: PhysicsBand
      direction: string
    }
    energyZScore: number
    planetaryHour: string
    moonPhase: string
    aspectPressure: number
    harmonicFlow: number
  }
  samplePoints: Array<{
    timestamp: string
    offsetHours: number
    label: string
    quantities: Record<'Spirit' | 'Essence' | 'Matter' | 'Substance' | 'ANumber', number>
    thermodynamics: Record<'heat' | 'entropy' | 'reactivity' | 'energy', number>
    ANumber: number
    energy: number
    heat: number
    entropy: number
    reactivity: number
    quantityZScores: Record<'Spirit' | 'Essence' | 'Matter' | 'Substance' | 'ANumber', number>
    thermodynamicZScores: Record<'heat' | 'entropy' | 'reactivity' | 'energy', number>
    aNumberZScore: number
    energyZScore: number
    dominantElement: string
    planetaryHour: string
    isCurrent: boolean
  }>
  recommendations: string[]
}

interface PhysicsState {
  status: PhysicsStatus
  snapshot: AlchmPhysicsSnapshot | null
  lastError: string | null
}

interface SidecarProxyResponse {
  status: number
  body: string
  contentType?: string | null
}

interface DeepLinkAgentPayload {
  id?: string
  name?: string
  tier?: AgentTier
}

interface PersistedDesktopState {
  guideMigrationVersion: number
  account: AccountSettings
  balances: Balances
  siteAccounts: Record<SiteKey, SiteAccount>
  roster: LocalAgent[]
  activeAgentId: string | null
  selectedChatAgentIds: string[]
  chats: Record<string, ChatMessage[]>
  ledger: LedgerEntry[]
  /**
   * "Use local MCP" toggle: when true, chat + astrology prefer the
   * bundled MCP sidecar over the cloud APIs. Historically misnamed
   * (it implied no network, but in practice only changes the chat
   * source). Storage key stays `localOfflineMode` for backward compat
   * with stored desktop state; new code should prefer the helper
   * `usesLocalMcp(state)` for intent clarity.
   */
  localOfflineMode?: boolean
  /**
   * Hard offline switch: when true, the shell refuses to make
   * outbound network requests (cloud APIs, image fetches, etc.).
   * Independent of `localOfflineMode` so a user can ask for "use
   * sidecar but still let it sync to the cloud" (false/false-ish) or
   * "true airplane mode" (true). When enabled while localOfflineMode
   * is off, chat will fail with a clear error rather than silently
   * falling back, since there's no working path.
   */
  disableNetwork?: boolean
  showJingPanel?: boolean
  jingCasterId?: string | null
  jingTargetId?: string | null
  jingMoveId?: string | null
  showSigilPanel?: boolean
}

interface RuntimeState {
  ipcNonce: string | null
  sidecar: SidecarStatus
  telemetry: HardwareTelemetry | null
  lastError: string | null
  generating: boolean
  alchmMcpStatus: SidecarStatus
  paMcpStatus: SidecarStatus
  jingOverlays: JingOverlayState
}

type JingStance = 'clash' | 'absorb' | 'mirror'

interface JingInterAspect {
  planetA: string
  planetB: string
  longitudeA: number
  longitudeB: number
  deltaLongitude: number
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  orb: number
  exactness: number
  harmonic: 'friction' | 'harmony' | 'intensification'
}

interface JingSynastryOverlay {
  pair: { agentA: string; agentB: string; computedAt: string; cacheHit: boolean }
  interchartAspects: JingInterAspect[]
  scores: { tension: number; harmony: number; intensification: number; aspectCount: number }
  dominantStance: JingStance
}

interface JingTransitActivation {
  transitPlanet: string
  natalPoint: string
  longitudeTransit: number
  longitudeNatal: number
  deltaLongitude: number
  type: string
  orb: number
  exactness: number
  natalElement: 'fire' | 'earth' | 'air' | 'water'
  valence: string
}

interface JingTransitOverlay {
  agentId: string
  transitTime: string
  activations: JingTransitActivation[]
  boostElement: 'fire' | 'earth' | 'air' | 'water' | null
  boostMagnitude: number
  stressNotes: string[]
  summary: string
}

interface JingOverlayState {
  synastry: JingSynastryOverlay | null
  casterTransit: JingTransitOverlay | null
  targetTransit: JingTransitOverlay | null
  lastPairKey: string | null
  loading: boolean
  lastError: string | null
}

interface DesktopMentor {
  agentId: string
  name: string
  level: number
  dominantStat: string
}

interface TrainState {
  show: boolean
  mentors: DesktopMentor[]
  mentorId: string | null
  busy: boolean
  ingesting: boolean
}

interface DesktopState extends PersistedDesktopState {
  activeView: View
  runtime: RuntimeState
  astrology: AstrologyState
  physics: PhysicsState
  scrabble: ScrabbleState
  composerDraft: string
  stoneDraft: StoneDraft
  notice: string | null
  // Cosmic leveling fetched from the agents web app (keyed by agentId).
  // Runtime-only — never persisted; refreshed from /api/agents/leveling.
  leveling: Record<string, { level: number; xp: number; evTotal: number }>
  // Train & Teach panel state (runtime-only).
  train: TrainState
  agentSearchQuery: string
  speakingMessageId: string | null
}

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

const STORAGE_KEY = 'alchm-desktop-local-state-v1'
const MONICA_GUIDE_ID = 'monica-app-guide'
const GUIDE_MIGRATION_VERSION = 1
const GROUP_CHAT_PREFIX = 'group:'
const QA_STONE_AGENT_NAMES = new Set([
  ['Release', 'Stone', 'Agent'].join(' '),
  ['Test', 'Stone', 'Agent'].join(' '),
])
const VIEW_IDS: View[] = [
  'chat',
  'astrology',
  'physics',
  'web3',
  'agents',
  'stone',
  'account',
  'diagnostics',
  'scrabble',
]
const CHAT_COST: Balances = { spirit: 2, essence: 1, matter: 0, substance: 0 }
const GENERATION_TIMEOUT_MS = 20000
const STARTING_BALANCES: Balances = { spirit: 150, essence: 150, matter: 150, substance: 150 }
const DEFAULT_ACCOUNT: AccountSettings = {
  displayName: 'Local Operator',
  email: '',
  userId: 'desktop-local',
  apiKey: 'dev-desktop-token',
  plan: 'Desktop Companion',
  agentsUrl: 'https://agents.alchm.kitchen',
  kitchenUrl: 'https://alchm.kitchen',
}
const DEFAULT_SITE_ACCOUNTS = createDefaultSiteAccounts()
let AGENT_LIBRARY: AgentTemplate[] = DEMO_AGENTS.map(createAgentTemplate)
const PRIVATE_AGENT_CATALOG_URL = './private-agents/agents.json'
const PRIVATE_AGENT_MCP_TIMEOUT_MS = 8_000
const ASTROLOGY_SIGN_MARKS = [
  'ARI',
  'TAU',
  'GEM',
  'CAN',
  'LEO',
  'VIR',
  'LIB',
  'SCO',
  'SAG',
  'CAP',
  'AQU',
  'PIS',
]
const ASTROLOGY_SOURCE_URLS = {
  currentChart: 'https://alchm.kitchen/current-chart',
  kitchenLab: 'https://alchm.kitchen/lab',
  agents: 'https://agents.alchm.kitchen',
}
const PHYSICS_SOURCE_URLS = {
  quantities: 'https://alchm.kitchen/quantities',
  quantitiesApi: 'https://alchm.kitchen/api/alchm-quantities',
  kineticsApi: 'https://alchm.kitchen/api/alchm-kinetics',
}

const surface = getSurface()
let invokeCommand: InvokeFn | null = null
let clearNoticeTimer: number | null = null
let telemetryTimer: number | null = null
const app = document.querySelector<HTMLDivElement>('#app')
const state = loadState()

// The bundled MCP sidecars default to localhost when run with no env, which
// has no backend on an end-user machine. Point them at the production hosts so
// "Use Local MCP" chat/astrology actually resolves. Any externally-set env
// still wins (see _resolve_url in planetary_agents_mcp_server.py).
const isLocalDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

const MCP_SIDECAR_ENV: Record<string, string> = {
  PLANETARY_AGENTS_BACKEND_URL: isLocalDev
    ? 'http://localhost:8000'
    : 'https://api.agents.alchm.kitchen',
  PLANETARY_AGENTS_FRONTEND_URL: isLocalDev
    ? 'http://localhost:3000'
    : 'https://agents.alchm.kitchen',
  // The bundled alchm-mcp (WTEN data server) builds natal charts by fetching
  // /api/astrologize from a backend. With no env it defaults to
  // http://localhost:3000 — absent on an end-user machine, so live-sky
  // transits/recipes fail with "Unable to connect". Point it at the WTEN
  // production site that serves /api/astrologize:
  //   - ALCHM_MCP_BACKEND_URL is the dedicated knob the alchm-mcp server reads
  //     first (natalChartService.getAstrologizeApiUrl) — highest precedence,
  //     scoped to just the chart fetch. NOT the same as PA's ALCHM_BACKEND_URL
  //     (onrender), which does not serve /api/astrologize.
  //   - NEXT_PUBLIC_SITE_URL stays as the getSelfBaseUrl() fallback for any
  //     other bundled self-fetch. Either, externally set, still wins.
  ALCHM_MCP_BACKEND_URL: isLocalDev ? 'http://localhost:3000' : 'https://alchm.kitchen',
  NEXT_PUBLIC_SITE_URL: isLocalDev ? 'http://localhost:3000' : 'https://alchm.kitchen',
}

export const alchmMcpClient = new LocalMcpClient(
  'bin/alchm-mcp',
  status => {
    state.runtime.alchmMcpStatus = status
    render()
  },
  MCP_SIDECAR_ENV
)

export const paMcpClient = new LocalMcpClient(
  'bin/pa-mcp',
  status => {
    state.runtime.paMcpStatus = status
    render()
  },
  MCP_SIDECAR_ENV
)

function getSurface(): Surface {
  const requested = new URLSearchParams(window.location.search).get('surface')
  if (requested === 'composer') return requested
  return 'main'
}

/**
 * True when the shell is permitted to make outbound network calls.
 * Use at the boundary of any direct fetch() or any operation that
 * triggers cloud egress. requestSidecar() goes through the local
 * orchestrator sidecar; whether the orchestrator then talks to the
 * network is its own concern.
 */
function canCallNetwork(): boolean {
  return !state.disableNetwork
}

function createDefaultSiteAccounts(): Record<SiteKey, SiteAccount> {
  return {
    agents: {
      site: 'agents',
      label: 'Alchm Agents',
      homeUrl: DEFAULT_ACCOUNT.agentsUrl,
      balances: { ...STARTING_BALANCES },
      canClaimDaily: false,
      streak: 0,
      lastDailyClaimAt: null,
      status: 'checking',
    },
    kitchen: {
      site: 'kitchen',
      label: 'Alchm Kitchen',
      homeUrl: DEFAULT_ACCOUNT.kitchenUrl,
      balances: { ...STARTING_BALANCES },
      canClaimDaily: false,
      streak: 0,
      lastDailyClaimAt: null,
      status: 'checking',
    },
  }
}

function createDefaultStoneDraft(): StoneDraft {
  return {
    name: '',
    date: formatDateInputValue(new Date()),
    time: '12:30',
    location: '',
    latitude: '',
    longitude: '',
    additionalContext: '',
  }
}

function createMonicaGuideAgent(): LocalAgent {
  return {
    id: MONICA_GUIDE_ID,
    name: 'Monica',
    title: 'Alchm Desktop Guide',
    element: 'air',
    tier: 'base',
    modelName: modelNameForElement('air'),
    initials: 'M',
    domains: [
      'Desktop guidance',
      'Account management',
      'Daily yield',
      "Philosopher's Stone",
      'Agent chat',
    ],
    quote:
      "I'm Monica, your Alchm Desktop guide. I can help you manage Agents and Kitchen accounts, claim daily yield, send web agents here, and create local Philosopher's Stone agents.",
    promptSeed: [
      'You are Monica, the built-in Alchm Desktop guide.',
      'Help users understand this companion app without presenting it as the full web app.',
      "Guide account linking for Alchm Agents and Alchm Kitchen, daily yield claims, web catalog handoff, and local Philosopher's Stone agent creation.",
      'Be warm, practical, concise, and clear when the official local model runtime is not installed.',
    ].join('\n'),
    addedAt: 'system',
    source: 'app-guide',
  }
}

function createAgentTemplate(agent: CraftedAgent): AgentTemplate {
  const element = normalizeElement(agent.consciousness?.dominantElement)
  const domains = agent.abilities?.wisdomDomains?.length
    ? agent.abilities.wisdomDomains.slice(0, 5)
    : [agent.abilities?.specialty || 'agent counsel']

  return {
    id: agent.id,
    name: agent.name,
    title: agent.title,
    element,
    tier: 'base',
    modelName: modelNameForElement(element),
    initials: initialsForName(agent.name),
    domains,
    quote: firstAgentLine(agent),
    promptSeed: buildWebsitePromptSeed(agent),
    websiteAgent: agent,
  }
}

function normalizePrivateAgentTemplate(raw: any): AgentTemplate | null {
  if (!raw || typeof raw !== 'object') return null

  const id = String(raw.id || '').trim()
  const name = String(raw.name || '').trim()
  if (!id || !name) return null

  const element = normalizeElement(raw.element)
  const tier = raw.tier === 'premium' ? 'premium' : 'base'

  return {
    id,
    name,
    title: String(raw.title || 'Private Desktop Agent'),
    element,
    tier,
    modelName: String(raw.modelName || modelNameForElement(element)),
    initials: String(raw.initials || initialsForName(name)).slice(0, 3),
    avatarUrl: typeof raw.avatarUrl === 'string' ? raw.avatarUrl : undefined,
    localOnly: true,
    domains: Array.isArray(raw.domains)
      ? raw.domains
          .map((domain: unknown) => String(domain))
          .filter(Boolean)
          .slice(0, 6)
      : ['Private local agent'],
    quote: String(raw.quote || 'A private agent available only on this desktop.'),
    promptSeed: String(
      raw.promptSeed ||
        [
          `You are ${name}, ${raw.title || 'a private desktop agent'}.`,
          'You are available only inside this local desktop app.',
          'Never claim to be synced to the public web catalog.',
        ].join('\n')
    ),
  }
}

function mergePrivateAgentTemplates(templates: AgentTemplate[]) {
  if (!templates.length) return false

  let changed = false
  for (const template of templates) {
    const existingIndex = AGENT_LIBRARY.findIndex(agent => agent.id === template.id)
    if (existingIndex >= 0) {
      AGENT_LIBRARY[existingIndex] = template
    } else {
      AGENT_LIBRARY.push(template)
    }
    changed = true
  }

  if (!changed) return false

  state.roster = hydrateRoster(state.roster)
  state.selectedChatAgentIds = normalizeSelectedChatAgentIds(
    state.selectedChatAgentIds,
    state.roster,
    state.activeAgentId
  )
  state.activeAgentId = state.selectedChatAgentIds[0] ?? state.roster[0]?.id ?? null
  return true
}

async function loadPrivateDesktopAgents() {
  try {
    const response = await fetch(PRIVATE_AGENT_CATALOG_URL, { cache: 'no-store' })
    if (!response.ok) return

    const catalog = await response.json()
    const templates = Array.isArray(catalog?.agents)
      ? catalog.agents.map(normalizePrivateAgentTemplate).filter(Boolean)
      : []

    if (mergePrivateAgentTemplates(templates as AgentTemplate[])) {
      saveState()
      render()
    }
  } catch (error) {
    console.warn('Private desktop agent catalog unavailable:', error)
  }
}

function normalizeElement(element: Element | string | undefined): ElementKey {
  const normalized = String(element || '').toLowerCase()
  if (normalized === 'fire' || normalized === 'water' || normalized === 'air') return normalized
  return 'earth'
}

function modelNameForElement(element: ElementKey) {
  return `alchm-agent-${element}-1.5b.gguf`
}

function initialsForName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}

function firstAgentLine(agent: CraftedAgent) {
  const gift = agent.personality?.gifts?.[0]?.description
  const specialty = agent.abilities?.specialty
  return gift || specialty || `${agent.name} is available from the Alchm Agents catalog.`
}

function buildWebsitePromptSeed(agent: CraftedAgent) {
  const core = agent.personality?.core
  const coreText =
    typeof core === 'string'
      ? core
      : [core?.essence, core?.expression, core?.emotion].filter(Boolean).join(' ')
  const gifts = agent.personality?.gifts?.map(gift => gift.description).filter(Boolean) || []
  const shadows =
    agent.personality?.shadows?.map(shadow => shadow.transformationPath).filter(Boolean) || []

  return [
    `Use the same consciousness profile as the Alchm Agents web app for ${agent.name}.`,
    coreText ? `Personality core: ${coreText}` : '',
    `Specialty: ${agent.abilities?.specialty || agent.title}.`,
    `Teaching style: ${agent.abilities?.teachingStyle || 'responsive counsel'}.`,
    gifts.length ? `Gifts: ${gifts.slice(0, 3).join('; ')}.` : '',
    shadows.length ? `Growth paths: ${shadows.slice(0, 2).join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function loadState(): DesktopState {
  const fallback: DesktopState = {
    guideMigrationVersion: GUIDE_MIGRATION_VERSION,
    account: { ...DEFAULT_ACCOUNT },
    balances: { ...STARTING_BALANCES },
    siteAccounts: { ...DEFAULT_SITE_ACCOUNTS },
    roster: [createMonicaGuideAgent()],
    activeAgentId: MONICA_GUIDE_ID,
    selectedChatAgentIds: [MONICA_GUIDE_ID],
    chats: {},
    ledger: [
      {
        id: makeId('ledger'),
        type: 'Desktop Shell Ready',
        details: 'Local account, roster, chats, and ledger are stored on this device.',
        amount: '+150 ESMS',
        timestamp: new Date().toISOString(),
      },
    ],
    activeView: 'chat',
    runtime: {
      ipcNonce: null,
      sidecar: 'checking',
      telemetry: null,
      lastError: null,
      generating: false,
      alchmMcpStatus: 'checking',
      paMcpStatus: 'checking',
      jingOverlays: {
        synastry: null,
        casterTransit: null,
        targetTransit: null,
        lastPairKey: null,
        loading: false,
        lastError: null,
      },
    },
    astrology: {
      status: 'idle',
      snapshot: null,
      lastError: null,
    },
    physics: {
      status: 'idle',
      snapshot: null,
      lastError: null,
    },
    scrabble: {
      status: 'idle',
      data: null,
      lastError: null,
      agentAId: null,
      agentBId: null,
      rounds: 7,
      simulationStatus: 'idle',
      activeMatch: null,
      simulationError: null,
    },
    composerDraft: '',
    stoneDraft: createDefaultStoneDraft(),
    notice: null,
    leveling: {},
    train: { show: false, mentors: [], mentorId: null, busy: false, ingesting: false },
    localOfflineMode: false,
    disableNetwork: false,
    showJingPanel: false,
    jingCasterId: null,
    jingTargetId: null,
    jingMoveId: null,
    showSigilPanel: false,
    agentSearchQuery: '',
    speakingMessageId: null,
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return fallback

  try {
    const saved = JSON.parse(raw) as Partial<PersistedDesktopState>
    const shouldRunGuideMigration =
      Number(saved.guideMigrationVersion || 0) < GUIDE_MIGRATION_VERSION
    const roster = ensureMonicaGuide(
      Array.isArray(saved.roster)
        ? hydrateRoster(saved.roster, shouldRunGuideMigration)
        : fallback.roster,
      shouldRunGuideMigration
    )
    const activeAgentId = roster.some(agent => agent.id === saved.activeAgentId)
      ? saved.activeAgentId!
      : MONICA_GUIDE_ID
    const selectedChatAgentIds = normalizeSelectedChatAgentIds(
      saved.selectedChatAgentIds,
      roster,
      activeAgentId
    )
    const chats = sanitizeChats(saved.chats ?? fallback.chats)
    const rosterIds = new Set(roster.map(agent => agent.id))
    for (const chatKey of Object.keys(chats)) {
      if (!isValidChatKey(chatKey, rosterIds)) delete chats[chatKey]
    }

    return {
      ...fallback,
      guideMigrationVersion: GUIDE_MIGRATION_VERSION,
      account: { ...fallback.account, ...saved.account },
      balances: { ...fallback.balances, ...saved.balances },
      siteAccounts: mergeSiteAccounts(saved.siteAccounts),
      roster,
      activeAgentId,
      selectedChatAgentIds,
      chats,
      ledger: Array.isArray(saved.ledger) ? saved.ledger : fallback.ledger,
      localOfflineMode: saved.localOfflineMode !== undefined ? saved.localOfflineMode : false,
      disableNetwork: saved.disableNetwork !== undefined ? saved.disableNetwork : false,
      showJingPanel: saved.showJingPanel ?? false,
      jingCasterId: saved.jingCasterId ?? null,
      jingTargetId: saved.jingTargetId ?? null,
      jingMoveId: saved.jingMoveId ?? null,
      showSigilPanel: saved.showSigilPanel ?? false,
    }
  } catch (error) {
    console.warn('Unable to restore Alchm desktop state:', error)
    return fallback
  }
}

function sanitizeChats(chats: Record<string, ChatMessage[]>) {
  const sanitized: Record<string, ChatMessage[]> = {}
  const legacyFallbackReply = ['I am answering from the local desktop', 'fallback'].join(' ')

  for (const [chatKey, messages] of Object.entries(chats)) {
    const template = AGENT_LIBRARY.find(item => item.id === chatKey)
    const runtimeNotice = template
      ? buildRuntimeNotice({ ...template, addedAt: '', source: 'web-catalog' })
      : null

    sanitized[chatKey] = messages
      .filter(message => !message.content.includes(legacyFallbackReply))
      .map(message => {
        if (
          runtimeNotice &&
          message.channel === 'Runtime notice' &&
          message.content.includes('local inference runtime is not ready yet')
        ) {
          return { ...message, content: runtimeNotice }
        }

        return message
      })
  }

  return sanitized
}

function normalizeSelectedChatAgentIds(
  agentIds: unknown,
  roster: LocalAgent[],
  fallbackAgentId?: string | null
) {
  const rosterIds = new Set(roster.map(agent => agent.id))
  const selectedIds = Array.isArray(agentIds)
    ? agentIds.filter((agentId): agentId is string => typeof agentId === 'string')
    : []
  const uniqueIds = [...new Set(selectedIds)].filter(agentId => rosterIds.has(agentId))
  const fallbackId =
    fallbackAgentId && rosterIds.has(fallbackAgentId) ? fallbackAgentId : roster[0]?.id

  return uniqueIds.length ? uniqueIds : fallbackId ? [fallbackId] : []
}

function isValidChatKey(chatKey: string, rosterIds: Set<string>) {
  if (rosterIds.has(chatKey)) return true
  if (!chatKey.startsWith(GROUP_CHAT_PREFIX)) return false

  const agentIds = parseGroupChatKey(chatKey)
  return agentIds.length > 1 && agentIds.every(agentId => rosterIds.has(agentId))
}

function parseGroupChatKey(chatKey: string) {
  if (!chatKey.startsWith(GROUP_CHAT_PREFIX)) return []

  return chatKey
    .slice(GROUP_CHAT_PREFIX.length)
    .split(',')
    .map(agentId => {
      try {
        return decodeURIComponent(agentId)
      } catch {
        return agentId
      }
    })
    .filter(Boolean)
}

function hydrateRoster(roster: LocalAgent[], removeQaStoneAgents = false) {
  return roster
    .filter(agent => agent && (!removeQaStoneAgents || !isQaStoneAgent(agent)))
    .map(agent => {
      if (agent.id === MONICA_GUIDE_ID) return createMonicaGuideAgent()

      const template = AGENT_LIBRARY.find(item => item.id === agent.id)
      return template ? { ...template, addedAt: agent.addedAt, source: agent.source } : agent
    })
}

function ensureMonicaGuide(roster: LocalAgent[], removeQaStoneAgents = false) {
  const userAgents = roster.filter(
    agent => agent.id !== MONICA_GUIDE_ID && (!removeQaStoneAgents || !isQaStoneAgent(agent))
  )
  return [createMonicaGuideAgent(), ...userAgents]
}

function isQaStoneAgent(agent: LocalAgent) {
  return agent.source === 'philosophers-stone' && QA_STONE_AGENT_NAMES.has(agent.name)
}

function mergeSiteAccounts(saved?: Partial<Record<SiteKey, SiteAccount>>) {
  return {
    agents: { ...DEFAULT_SITE_ACCOUNTS.agents, ...saved?.agents },
    kitchen: { ...DEFAULT_SITE_ACCOUNTS.kitchen, ...saved?.kitchen },
  }
}

function saveState() {
  const persisted: PersistedDesktopState = {
    guideMigrationVersion: GUIDE_MIGRATION_VERSION,
    account: state.account,
    balances: state.balances,
    siteAccounts: state.siteAccounts,
    roster: state.roster,
    activeAgentId: state.activeAgentId,
    selectedChatAgentIds: getChatAgentIds(),
    chats: state.chats,
    ledger: state.ledger,
    localOfflineMode: state.localOfflineMode,
    disableNetwork: state.disableNetwork,
    showJingPanel: state.showJingPanel,
    jingCasterId: state.jingCasterId,
    jingTargetId: state.jingTargetId,
    jingMoveId: state.jingMoveId,
    showSigilPanel: state.showSigilPanel,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
}

function render() {
  if (!app) return

  app.innerHTML = surface === 'composer' ? renderComposerSurface() : renderMainShell()

  requestAnimationFrame(() => {
    const messages = document.querySelector<HTMLElement>('[data-messages]')
    if (messages) messages.scrollTop = messages.scrollHeight
  })
}

function renderMainShell() {
  return `
    <div class="app-shell">
      <header class="titlebar">
        <div class="brand">
          <img src="/alchm-logo.png" alt="" />
          <div class="brand-title">
            <strong>Alchm Desktop</strong>
            <span>Companion workspace</span>
          </div>
        </div>
        <nav class="title-tabs" aria-label="Desktop sections">
          ${VIEW_IDS.map(view => renderTab(view)).join('')}
        </nav>
        <div class="status-row">
          ${state.notice ? `<span class="notice">${escapeHtml(state.notice)}</span>` : ''}
          <button
            class="offline-toggle-button ${state.disableNetwork ? 'active' : ''}"
            data-action="toggle-disable-network"
            title="${state.disableNetwork ? 'Network disabled: outbound HTTP calls are blocked. Local MCP still works. Click to re-enable network.' : 'Network enabled. Click to disable outbound HTTP (airplane mode).'}"
          >
            ${state.disableNetwork ? '✈️ Offline' : '📡 Online'}
          </button>
          ${
            state.runtime.sidecar === 'online'
              ? '<span class="status-pill online">Sidecar online</span>'
              : `<button class="status-pill offline" data-action="link-account-web" title="Open the web yield hub in your browser to link this desktop to your Alchm account.">Link account</button>`
          }
        </div>
      </header>
      <div class="workspace">
        ${renderSidebar()}
        <main class="content">
          ${renderActiveView()}
        </main>
      </div>
    </div>
  `
}

function renderTab(view: View) {
  const labels: Record<View, string> = {
    chat: 'Chat',
    astrology: 'Astrology',
    physics: 'Physics',
    web3: 'Web3',
    agents: 'Agents',
    stone: "Philosopher's Stone",
    account: 'Account',
    diagnostics: 'Diagnostics',
    scrabble: 'Scrabble League',
  }

  return `
    <button class="${state.activeView === view ? 'active' : ''}" data-action="view" data-view="${view}">
      ${labels[view]}
    </button>
  `
}

function renderSidebar() {
  const selectedAgentIds = getChatAgentIds()
  const isLinked =
    state.siteAccounts.agents.status === 'linked' || state.siteAccounts.kitchen.status === 'linked'

  return `
    <aside class="sidebar">
      <section class="sidebar-section">
        <div class="eyebrow">Accounts</div>
        <div class="panel compact-panel">
          <strong>${escapeHtml(state.account.displayName || 'Local Operator')}</strong>
          <p class="muted">${escapeHtml(state.account.plan)}</p>
          <div class="button-row">
            <button class="secondary-button" data-action="view" data-view="account">Manage</button>
            ${
              isLinked
                ? '<button class="secondary-button" data-action="refresh-accounts">Sync</button>'
                : ''
            }
          </div>
        </div>
      </section>
      <section class="sidebar-section">
        <div class="eyebrow">Agents ESMS</div>
        <div class="coin-grid">
          ${renderCoin('Spirit', state.balances.spirit)}
          ${renderCoin('Essence', state.balances.essence)}
          ${renderCoin('Matter', state.balances.matter)}
          ${renderCoin('Substance', state.balances.substance)}
        </div>
      </section>
      <section class="sidebar-section">
        <div class="eyebrow">Web3</div>
        <div class="panel compact-panel">
          <strong>${escapeHtml(web3SidebarTitle())}</strong>
          <p class="muted">${escapeHtml(web3SidebarDetail())}</p>
          <div class="button-row">
            <button class="secondary-button" data-action="view" data-view="web3">Open</button>
            <button class="secondary-button" data-action="open-web3-url" data-url="${escapeHtml(web3RouteUrl('/pentacles'))}">Stake</button>
          </div>
        </div>
      </section>
      <section class="sidebar-section">
        <div class="eyebrow">Astrology</div>
        <div class="panel compact-panel">
          <strong>${escapeHtml(state.astrology.snapshot?.quantities.dominantElement || 'Consensus Dashboard')}</strong>
          <p class="muted">
            ${
              state.astrology.snapshot
                ? `A# ${state.astrology.snapshot.quantities.ANumber} · ${state.astrology.snapshot.moonPhase.name}`
                : 'Current chart, standing chart, quantities, agents.'
            }
          </p>
          <div class="button-row">
            <button class="secondary-button" data-action="view" data-view="astrology">Open</button>
            <button class="secondary-button" data-action="refresh-astrology">Refresh</button>
          </div>
        </div>
      </section>
      <section class="sidebar-section">
        <div class="eyebrow">Alchm Physics</div>
        <div class="panel compact-panel">
          <strong>${escapeHtml(state.physics.snapshot?.landscape.mode || 'Landscape Dashboard')}</strong>
          <p class="muted">
            ${
              state.physics.snapshot
                ? `Energy z ${formatSigned(state.physics.snapshot.landscape.energyZScore)} · ${state.physics.snapshot.kinetics.momentum.type}`
                : 'Quantities, z-scores, kinetics, thermodynamics.'
            }
          </p>
          <div class="button-row">
            <button class="secondary-button" data-action="view" data-view="physics">Open</button>
            <button class="secondary-button" data-action="refresh-physics">Refresh</button>
          </div>
        </div>
      </section>
      <section class="sidebar-section roster-section">
        <div class="eyebrow">Desktop Guide & Agents</div>
        <div class="roster-list">
          ${
            state.roster.length
              ? state.roster.map(agent => renderRosterButton(agent, selectedAgentIds)).join('')
              : `<div class="panel compact-panel muted">No agents added yet.</div>`
          }
        </div>
        <button class="secondary-button" data-action="view" data-view="agents">Web Catalog</button>
        <button class="secondary-button" data-action="view" data-view="stone">Philosopher's Stone</button>
      </section>
    </aside>
  `
}

function renderCoin(label: string, amount: number) {
  const icons: Record<string, string> = {
    Spirit: 'water_drop',
    Essence: 'energy_savings_leaf',
    Matter: 'grain',
    Substance: 'toll',
  }
  const icon = icons[label] || 'toll'
  return `
    <div class="coin ${label.toLowerCase()}">
      <span class="material-symbols-outlined coin-icon">${icon}</span>
      <div class="coin-info">
        <span class="coin-label">${label}</span>
        <strong>${amount}</strong>
      </div>
    </div>
  `
}

function renderRosterButton(agent: LocalAgent, selectedAgentIds: string[]) {
  const isSelected = selectedAgentIds.includes(agent.id)
  const lvl = agentLevel(agent.id)

  return `
    <button
      class="roster-button ${isSelected ? 'active' : ''}"
      data-action="select-agent"
      data-agent-id="${agent.id}"
    >
      ${renderAgentAvatar(agent)}
      <span class="roster-button-body">
        <strong class="truncate">${escapeHtml(agent.name)}</strong>
        <small class="truncate">${escapeHtml(agent.title)}</small>
      </span>
      ${lvl != null ? `<span class="level-badge" title="Cosmic level">Lv.${lvl}</span>` : ''}
    </button>
  `
}

function renderActiveView() {
  switch (state.activeView) {
    case 'astrology':
      return renderAstrologyView()
    case 'physics':
      return renderPhysicsView()
    case 'web3':
      return renderWeb3View()
    case 'agents':
      return renderAgentsView()
    case 'stone':
      return renderStoneView()
    case 'account':
      return renderAccountView()
    case 'diagnostics':
      return renderDiagnosticsView()
    case 'scrabble':
      return renderScrabbleView()
    case 'chat':
    default:
      return renderChatView()
  }
}

function renderChatView() {
  const agents = getChatAgents()
  if (!agents.length) {
    return `
      <section class="view empty-state">
        <div class="panel">
          <div class="eyebrow">Local Chat</div>
          <h1>Add an agent to begin</h1>
          <p class="muted">
            Use the web app to purchase or unlock agents, send web agents here for companion chat,
            or create a local agent with the Philosopher's Stone.
          </p>
          <div class="button-row center-row">
            <button class="primary-button" data-action="view" data-view="stone">Open Philosopher's Stone</button>
            <button class="secondary-button" data-action="view" data-view="agents">Open Web Catalog</button>
          </div>
        </div>
      </section>
    `
  }

  const messages = getMessages(getActiveChatKey())
  const isGroupChat = agents.length > 1

  return `
    <section class="view">
      <div class="panel chat-layout">
        <header class="chat-header">
          ${renderChatHeading(agents)}
          ${renderChatHeaderActions(agents)}
        </header>
        ${renderChatAgentSelector(agents)}
        ${state.showSigilPanel && agents.length === 1 && agents[0].stoneBlueprint?.sigil ? renderChatSigilPanel(agents[0]) : ''}
        ${state.showJingPanel && agents.length >= 2 ? renderChatJingPanel(agents) : ''}
        ${state.train.show && agents.length === 1 ? renderChatTrainPanel(agents[0]) : ''}
        <div class="messages" data-messages>
          ${
            messages.length
              ? messages.map(message => renderMessage(message)).join('')
              : isGroupChat
                ? renderGroupStarterMessage(agents)
                : renderStarterMessage(agents[0])
          }
          ${
            state.runtime.generating
              ? `
            <div class="typing-indicator">
              <div class="typing-dots"><span></span><span></span><span></span></div>
              <span class="typing-label">${escapeHtml(agents.length === 1 ? agents[0].name : 'Agents')} thinking…</span>
            </div>
          `
              : ''
          }
        </div>
        <form class="composer element-${agents[0]?.element || ''}" data-chat-form>
          <textarea
            class="textarea"
            name="message"
            data-composer-input
            placeholder="${escapeHtml(chatComposerPlaceholder(agents))}"
            ${state.runtime.generating ? 'disabled' : ''}
          >${escapeHtml(state.composerDraft)}</textarea>
          <button class="primary-button" type="submit" ${state.runtime.generating ? 'disabled' : ''}>
            ${state.runtime.generating ? 'Thinking' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  `
}

function renderChatHeading(agents: LocalAgent[]) {
  if (agents.length === 1) {
    const agent = agents[0]

    return `
      <div class="agent-heading">
        ${renderAgentAvatar(agent, 'large-avatar')}
        <div>
          <div class="eyebrow">${escapeHtml(agentEyebrow(agent))}</div>
          <h1>${escapeHtml(agent.name)}</h1>
          <p class="muted">${escapeHtml(agent.title)}</p>
        </div>
      </div>
    `
  }

  return `
    <div class="agent-heading">
      <div class="avatar-stack" aria-hidden="true">
        ${agents
          .slice(0, 4)
          .map(agent => renderAgentAvatar(agent))
          .join('')}
      </div>
      <div>
        <div class="eyebrow">Group Chat</div>
        <h1>${agents.length} agents</h1>
        <p class="muted">${escapeHtml(agents.map(agent => agent.name).join(', '))}</p>
      </div>
    </div>
  `
}

function agentEyebrow(agent: LocalAgent) {
  if (agent.source === 'app-guide') return 'App guide'
  if (agent.localOnly || agent.source === 'private-local') return 'Private desktop agent'
  if (agent.source === 'philosophers-stone') return "Philosopher's Stone agent"
  return agent.tier === 'premium' ? 'Premium agent' : 'Synced agent'
}

function renderChatHeaderActions(agents: LocalAgent[]) {
  const agent = agents[0]
  const jingActive = state.showJingPanel ? ' active' : ''
  const jingButton =
    agents.length >= 2
      ? `<button class="jing-toggle-button${jingActive}" data-action="toggle-jing-panel">⚡ Jing</button>`
      : ''

  if (agents.length > 1) {
    return `
      <div class="button-row">
        ${jingButton}
        <button class="secondary-button" data-action="view" data-view="stone">Philosopher's Stone</button>
        <button class="secondary-button" data-action="view" data-view="agents">Catalog</button>
      </div>
    `
  }

  if (agent.source === 'app-guide') {
    return `
      <div class="button-row">
        <button class="secondary-button" data-action="view" data-view="astrology">Astrology</button>
        <button class="secondary-button" data-action="view" data-view="physics">Physics</button>
        <button class="secondary-button" data-action="view" data-view="account">Account</button>
        <button class="secondary-button" data-action="view" data-view="stone">Philosopher's Stone</button>
        <button class="secondary-button" data-action="view" data-view="agents">Catalog</button>
      </div>
    `
  }

  const sigilActive = state.showSigilPanel ? ' active' : ''
  const sigilButton = agent.stoneBlueprint?.sigil
    ? `<button class="jing-toggle-button${sigilActive}" data-action="toggle-sigil-panel">✨ Sigil</button>`
    : ''

  return `
    <div class="button-row">
      ${sigilButton}
      <button class="jing-toggle-button${state.train.show ? ' active' : ''}" data-action="toggle-train-panel">🎓 Train &amp; Teach</button>
      <button class="secondary-button" data-action="view" data-view="agents">Catalog</button>
      <button class="danger-button" data-action="remove-agent" data-agent-id="${agent.id}">
        Remove
      </button>
    </div>
  `
}

function renderChatTrainPanel(agent: LocalAgent) {
  const lvl = agentLevel(agent.id)
  const mentors = state.train.mentors.filter(m => m.agentId !== agent.id)
  const selectedId =
    state.train.mentorId && state.train.mentorId !== agent.id
      ? state.train.mentorId
      : mentors[0]?.agentId

  return `
    <section class="train-panel">
      <div class="train-panel-head">
        <strong>🎓 Train &amp; Teach</strong>
        <span class="muted">${escapeHtml(agent.name)}${lvl != null ? ` · Lv.${lvl}` : ''}</span>
      </div>

      <div class="train-row">
        <label class="muted" for="train-mentor-select">Train with a mentor — earns XP &amp; EVs in their dominant stat</label>
        ${
          mentors.length
            ? `<div class="train-controls">
                 <select id="train-mentor-select" class="input">
                   ${mentors
                     .map(
                       m =>
                         `<option value="${escapeHtml(m.agentId)}"${m.agentId === selectedId ? ' selected' : ''}>${escapeHtml(m.name)} · Lv.${m.level} · →${escapeHtml(m.dominantStat)}</option>`
                     )
                     .join('')}
                 </select>
                 <button class="primary-button" data-action="train-active-agent" data-agent-id="${agent.id}"${state.train.busy ? ' disabled' : ''}>
                   ${state.train.busy ? 'Training…' : 'Train'}
                 </button>
               </div>`
            : `<p class="muted">Loading mentors…</p>`
        }
      </div>

      <div class="train-row">
        <label class="muted" for="train-ingest-files">Teach from files — embeds into this agent's knowledge (PDF · TXT · MD · JSON · DOCX)</label>
        <div class="train-controls">
          <input id="train-ingest-files" class="input" type="file" multiple accept=".pdf,.txt,.md,.json,.docx" />
          <button class="secondary-button" data-action="ingest-knowledge" data-agent-id="${agent.id}"${state.train.ingesting ? ' disabled' : ''}>
            ${state.train.ingesting ? 'Infusing…' : 'Infuse'}
          </button>
        </div>
      </div>
    </section>
  `
}

function renderChatSigilPanel(agent: LocalAgent) {
  const blueprint = agent.stoneBlueprint
  if (!blueprint || !blueprint.sigil) return ''

  const sigil = blueprint.sigil
  const svg = sigil.svgGeometry || ''
  const rarityClass = `rarity-${sigil.rarity || 'common'}`

  return `
    <div class="sigil-panel">
      <div class="panel-heading unframed-heading">
        <div>
          <div class="eyebrow">Natal Sigil Resonance</div>
          <h2>${escapeHtml(sigil.name || 'Alchemical Sigil')}</h2>
        </div>
        <button class="icon-button" data-action="toggle-sigil-panel" title="Close Panel">✕</button>
      </div>
      <div class="sigil-panel-layout">
        <div class="sigil-svg-container">
          ${svg}
        </div>
        <div class="sigil-details">
          <div class="sigil-meta-badges">
            <span class="sigil-badge ${rarityClass}">${escapeHtml(sigil.rarity)}</span>
            <span class="sigil-badge">Element: ${escapeHtml(sigil.element)}</span>
            <span class="sigil-badge">Power: ${sigil.powerLevel || 0}</span>
          </div>
          <div class="sigil-text-guide">
            <strong>Personal Meaning</strong>
            ${escapeHtml(sigil.personalizedMeaning)}
          </div>
          <div class="sigil-text-guide">
            <strong>Activation Ritual</strong>
            ${escapeHtml(sigil.activationRitual || 'Meditate on the center point of the sigil for 5 minutes.')}
          </div>
          <div class="sigil-text-guide">
            <strong>Meditation Guide</strong>
            ${sigil.meditationInstructions ? sigil.meditationInstructions.map(inst => `<div>• ${escapeHtml(inst)}</div>`).join('') : 'Visualize the alignment of the aspect lines.'}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderChatAgentSelector(agents: LocalAgent[]) {
  const selectedIds = new Set(agents.map(agent => agent.id))

  return `
    <section class="chat-agent-selector" aria-label="Chat agents">
      <div class="selector-summary">
        <div>
          <div class="eyebrow">Chat Agents</div>
          <strong>${agents.length} selected</strong>
        </div>
        <span class="muted">${escapeHtml(agents.map(agent => agent.name).join(' · '))}</span>
      </div>
      <div class="agent-check-grid">
        ${state.roster
          .map(agent => renderChatAgentOption(agent, selectedIds.has(agent.id)))
          .join('')}
      </div>
    </section>
  `
}

function renderChatAgentOption(agent: LocalAgent, isSelected: boolean) {
  return `
    <label class="agent-check ${isSelected ? 'selected' : ''}">
      <input
        type="checkbox"
        data-chat-agent-toggle
        data-agent-id="${agent.id}"
        ${isSelected ? 'checked' : ''}
      />
      ${renderAgentAvatar(agent, 'mini-avatar')}
      <span>
        <strong class="truncate">${escapeHtml(agent.name)}</strong>
        <small class="truncate">${escapeHtml(agentEyebrow(agent))}</small>
      </span>
    </label>
  `
}

/* ── Jing Arena constants & helpers ──────────────────────────── */

type JingMoveId = 'meltdown' | 'freeze' | 'tectonicRoot' | 'vacuum' | 'erode'

const JING_MOVE_IDS: JingMoveId[] = ['meltdown', 'freeze', 'tectonicRoot', 'vacuum', 'erode']

const JING_MOVE_DATA: Record<
  JingMoveId,
  { name: string; element: string; glyph: string; description: string; counters: JingMoveId[] }
> = {
  meltdown: {
    name: 'Meltdown',
    element: 'Fire',
    glyph: '🜂',
    description: 'Shatters structural barriers. Doubles intensity.',
    counters: ['freeze', 'tectonicRoot'],
  },
  freeze: {
    name: 'Freeze',
    element: 'Water',
    glyph: '🜄',
    description: 'Locks opponent stance. Forces silence or rigidity.',
    counters: ['meltdown'],
  },
  tectonicRoot: {
    name: 'Tectonic Root',
    element: 'Earth',
    glyph: '🜃',
    description: 'Impenetrable defense. Deflects emotional/kinetic args.',
    counters: ['meltdown'],
  },
  vacuum: {
    name: 'Vacuum',
    element: 'Air',
    glyph: '🜁',
    description: 'Removes oxygen. Neutralizes fiery enthusiasm.',
    counters: ['meltdown'],
  },
  erode: {
    name: 'Erode',
    element: 'Water·Earth',
    glyph: '🜔',
    description: 'Dissolves Saturnian logic. Slow wear.',
    counters: ['tectonicRoot'],
  },
}

// ─── Stance-driven counter pools ─────────────────────────────────────
// Replaces the prior 1:1 counterMap. Target's stance (clash | absorb |
// mirror) is computed from the synastry overlay and selects a pool;
// pickCounterMove() then prefers the pool entry whose element matches
// the target's current transit boost, falling back to a random pick.

const COUNTER_POOLS: Record<JingStance, Record<JingMoveId, JingMoveId[]>> = {
  // Friction (square / opposition synastry) — meet force with force.
  clash: {
    meltdown: ['tectonicRoot', 'freeze'],
    freeze: ['meltdown', 'erode'],
    tectonicRoot: ['meltdown', 'erode'],
    vacuum: ['tectonicRoot', 'freeze'],
    erode: ['meltdown', 'vacuum'],
  },
  // Harmony (trine / sextile synastry) — yield, transform, redirect.
  absorb: {
    meltdown: ['vacuum', 'erode'],
    freeze: ['erode', 'vacuum'],
    tectonicRoot: ['erode', 'freeze'],
    vacuum: ['freeze', 'erode'],
    erode: ['freeze', 'tectonicRoot'],
  },
  // Conjunction synastry — mirror match, amplify the element.
  mirror: {
    meltdown: ['meltdown'],
    freeze: ['freeze'],
    tectonicRoot: ['tectonicRoot'],
    vacuum: ['vacuum'],
    erode: ['erode'],
  },
}

function jingPairKey(
  casterId: string | null | undefined,
  targetId: string | null | undefined
): string | null {
  if (!casterId || !targetId) return null
  return `${casterId}|${targetId}`
}

function mcpAgentPayload(agent: LocalAgent): {
  id: string
  natalChart: {
    planets: Record<string, { sign: string; degree: number; retrograde: boolean }>
  }
} | null {
  const natal = agent.websiteAgent?.consciousness?.natalChart
  if (!natal || !natal.planets) return null
  const planets: Record<string, { sign: string; degree: number; retrograde: boolean }> = {}
  for (const [planet, position] of Object.entries(natal.planets)) {
    if (!position || typeof position !== 'object') continue
    const sign = String((position as { sign?: string }).sign || '').trim()
    const degree = Number((position as { degree?: number }).degree)
    if (!sign || Number.isNaN(degree)) continue
    planets[planet] = {
      sign,
      degree,
      retrograde: Boolean((position as { retrograde?: boolean }).retrograde),
    }
  }
  if (Object.keys(planets).length === 0) return null
  return { id: agent.id, natalChart: { planets } }
}

function parseMcpToolJson<T = unknown>(result: unknown): T | null {
  const content = (result as { content?: Array<{ text?: string }> } | null)?.content
  if (!Array.isArray(content)) return null
  const text = content
    .map(item => (item && typeof item.text === 'string' ? item.text : ''))
    .join('\n')
    .trim()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

async function refreshJingOverlays(force = false): Promise<void> {
  const overlays = state.runtime.jingOverlays
  const casterId = state.jingCasterId
  const targetId = state.jingTargetId
  const pairKey = jingPairKey(casterId, targetId)

  if (!pairKey || casterId === targetId) {
    overlays.synastry = null
    overlays.casterTransit = null
    overlays.targetTransit = null
    overlays.lastPairKey = null
    overlays.loading = false
    overlays.lastError = null
    return
  }

  if (!force && overlays.lastPairKey === pairKey && overlays.synastry) return

  const caster = state.roster.find(a => a.id === casterId)
  const target = state.roster.find(a => a.id === targetId)
  if (!caster || !target) return

  const casterPayload = mcpAgentPayload(caster)
  const targetPayload = mcpAgentPayload(target)
  if (!casterPayload || !targetPayload) {
    overlays.lastError = 'Agent natal chart unavailable for overlay'
    render()
    return
  }

  overlays.loading = true
  overlays.lastError = null
  overlays.lastPairKey = pairKey
  render()

  try {
    const [synRes, casterRes, targetRes] = await Promise.all([
      alchmMcpClient.call('tools/call', {
        name: 'compute_synastry_overlay',
        arguments: {
          agentA: casterPayload,
          agentB: targetPayload,
          cacheStrategy: 'read',
          _meta: {
            apiKey: state.account.apiKey || 'dev-desktop-token',
            caller: 'alchm-desktop-jing',
          },
        },
      }),
      alchmMcpClient.call('tools/call', {
        name: 'get_transit_natal_overlay',
        arguments: {
          agent: casterPayload,
          _meta: {
            apiKey: state.account.apiKey || 'dev-desktop-token',
            caller: 'alchm-desktop-jing',
          },
        },
      }),
      alchmMcpClient.call('tools/call', {
        name: 'get_transit_natal_overlay',
        arguments: {
          agent: targetPayload,
          _meta: {
            apiKey: state.account.apiKey || 'dev-desktop-token',
            caller: 'alchm-desktop-jing',
          },
        },
      }),
    ])

    overlays.synastry = parseMcpToolJson<JingSynastryOverlay>(synRes)
    overlays.casterTransit = parseMcpToolJson<JingTransitOverlay>(casterRes)
    overlays.targetTransit = parseMcpToolJson<JingTransitOverlay>(targetRes)
  } catch (err) {
    console.warn('refreshJingOverlays failed:', err)
    overlays.lastError = err instanceof Error ? err.message : String(err)
  } finally {
    overlays.loading = false
    render()
  }
}

function activeTransitOverlay(): JingTransitOverlay | null {
  return state.runtime.jingOverlays.casterTransit
}

function activeStance(): JingStance | null {
  return state.runtime.jingOverlays.synastry?.dominantStance ?? null
}

/**
 * Continuous per-move boost magnitude (0..1). The caster's transit
 * overlay reports a dominant boost element + magnitude; a move whose
 * element string contains that element receives the magnitude verbatim,
 * everything else returns 0.
 */
function jingBoostMagnitudeForMove(moveId: JingMoveId): number {
  const overlay = activeTransitOverlay()
  if (!overlay || !overlay.boostElement || overlay.boostMagnitude <= 0) return 0
  const moveElement = JING_MOVE_DATA[moveId].element.toLowerCase()
  return moveElement.includes(overlay.boostElement) ? overlay.boostMagnitude : 0
}

function pickCounterMove(
  attackMoveId: JingMoveId,
  stance: JingStance,
  targetOverlay: JingTransitOverlay | null
): JingMoveId {
  const pool = COUNTER_POOLS[stance][attackMoveId] || ['freeze']
  if (targetOverlay && targetOverlay.boostElement && targetOverlay.boostMagnitude > 0.4) {
    const boosted = pool.find(id =>
      JING_MOVE_DATA[id].element.toLowerCase().includes(targetOverlay.boostElement!)
    )
    if (boosted) return boosted
  }
  return pool[Math.floor(Math.random() * pool.length)] || 'freeze'
}

function formatAspectLine(aspect: JingInterAspect): string {
  return `${aspect.planetA} ${aspect.type} ${aspect.planetB} (${aspect.orb.toFixed(1)}° orb)`
}

/**
 * Unified Jing turn generation: try MCP (local offline), then sidecar, then return null
 * so the caller falls back to the static one-liner.
 */
async function generateJingTurnText(
  agent: LocalAgent,
  prompt: string,
  apiKey: string
): Promise<string | null> {
  // Path 1: Local MCP (chat_with_planetary_agent tool)
  try {
    const mcpResult = await paMcpClient.call('tools/call', {
      name: 'chat_with_planetary_agent',
      arguments: {
        agentName: agent.name,
        message: prompt,
        _meta: { apiKey, caller: 'alchm-desktop-jing' },
      },
    })
    if (mcpResult?.content?.[0]?.text) {
      const payload = JSON.parse(mcpResult.content[0].text)
      if (payload.text) return payload.text
    }
  } catch (err) {
    console.warn(`[Jing Path 1] MCP failed for ${agent.name}:`, err)
  }

  // Path 2: Direct Backend API call (bypasses MCP sidecar)
  if (canCallNetwork()) {
    try {
      const backendUrl = isLocalDev ? 'http://localhost:8000' : 'https://api.agents.alchm.kitchen'
      const chatPayload = {
        agentId: agent.id,
        message: prompt,
        sessionId: `jing-${agent.id}-${Date.now()}`,
        modelTier: 'free',
        context: {
          mcpTool: 'chat_with_planetary_agent',
          caller: 'alchm-desktop-jing-direct',
        },
      }

      const response = await withTimeout(
        fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatPayload),
        }),
        30_000,
        'Jing backend API timed out.'
      )

      if (response.ok) {
        const data = await response.json()
        const text = data.text || data.response || ''
        if (text && text.length > 10) return text
      }
    } catch (err) {
      console.warn(`[Jing Path 2] Direct backend API failed for ${agent.name}:`, err)
    }
  }

  // Path 3: Tauri sidecar generate endpoint
  if (invokeCommand && state.runtime.ipcNonce && state.account.apiKey) {
    try {
      const sidecarPrompt = [
        `System: You are ${agent.name}, ${agent.title}. Respond to this Jing duel prompt in character. Be expressive and dramatic but concise (2-4 sentences).`,
        agent.promptSeed,
        `User: ${prompt}`,
        'Agent:',
      ]
        .filter(Boolean)
        .join('\n')

      const response = await withTimeout(
        requestSidecar('/api/generate', {
          method: 'POST',
          body: {
            prompt: sidecarPrompt,
            modelName: agent.modelName,
            costs: CHAT_COST,
            inferenceProfile: 'balanced',
          },
        }),
        GENERATION_TIMEOUT_MS,
        'Jing inference timed out.'
      )

      if (response.ok) {
        const body = await response.text()
        const content = parseSseText(body) || body.trim()
        if (content) return content
      }
    } catch (err) {
      console.warn(`[Jing Path 3] Sidecar failed for ${agent.name}:`, err)
    }
  }

  // Path 4: no generation available — return null so caller uses its own static text
  return null
}

function buildJingPrompt(opts: {
  speaker: LocalAgent
  opponent: LocalAgent
  move: { name: string; glyph: string; element: string; description: string }
  speakerRole: 'caster' | 'target'
  counterMove?: { name: string; glyph: string; element: string; description: string }
  synastry: JingSynastryOverlay | null
  speakerTransit: JingTransitOverlay | null
  stance: JingStance | null
  boostMagnitude: number
}): string {
  const {
    speaker,
    opponent,
    move,
    speakerRole,
    counterMove,
    synastry,
    speakerTransit,
    stance,
    boostMagnitude,
  } = opts
  const lines: string[] = []
  if (speakerRole === 'caster') {
    lines.push(
      `You are ${speaker.name}, casting the ${move.name} Jing (${move.glyph} ${move.element}) on ${opponent.name}.`
    )
    lines.push(`The ${move.name} Jing: ${move.description}`)
  } else {
    lines.push(
      `${opponent.name} has just cast the ${move.name} Jing (${move.glyph} ${move.element}) on you.`
    )
    if (counterMove) {
      lines.push(
        `You are ${speaker.name}. You counter with ${counterMove.name} (${counterMove.glyph} ${counterMove.element}): ${counterMove.description}.`
      )
    }
  }

  if (synastry && synastry.interchartAspects.length > 0) {
    const top = synastry.interchartAspects[0]
    lines.push(
      `Relational ledger: your ${top.planetB} is in ${top.type} (${top.orb.toFixed(1)}° orb) with their ${top.planetA}.`
    )
    if (synastry.interchartAspects[1]) {
      lines.push(`Secondary: ${formatAspectLine(synastry.interchartAspects[1])}.`)
    }
  }

  if (stance === 'clash') {
    lines.push(
      'This is a high-friction pairing. Your tone is defensive friction, struggle, architectural resistance. Avoid generic elemental tropes.'
    )
  } else if (stance === 'absorb') {
    lines.push(
      'This pairing is harmonic. Your tone yields, transforms, redirects — the energy passes through you and returns altered.'
    )
  } else if (stance === 'mirror') {
    lines.push(
      'This pairing is a conjunction mirror. Your tone amplifies the move, intensifying the element rather than countering it.'
    )
  }

  if (speakerTransit && speakerTransit.boostElement && speakerTransit.boostMagnitude > 0.2) {
    const headline = speakerTransit.activations[0]
    const pct = Math.round(speakerTransit.boostMagnitude * 100)
    if (headline) {
      lines.push(
        `Current sky: transit ${headline.transitPlanet} ${headline.type} your natal ${headline.natalPoint} → ${pct}% ${speakerTransit.boostElement} boost.`
      )
    }
  }
  if (speakerTransit && speakerTransit.stressNotes.length > 0) {
    lines.push(`Active stress: ${speakerTransit.stressNotes[0]}.`)
  }

  if (boostMagnitude > 0.2) {
    const pct = Math.round(boostMagnitude * 40)
    lines.push(`Your move is transit-boosted (+${pct}% intensity).`)
  }

  lines.push('Speak ONE bold, in-character line. Stay in your persona. Be dramatic.')
  return lines.join(' ')
}

function renderChatJingPanel(agents: LocalAgent[]) {
  const overlays = state.runtime.jingOverlays
  const stance = activeStance()
  const synastry = overlays.synastry
  const casterTransit = overlays.casterTransit
  const targetTransit = overlays.targetTransit
  const caster = state.roster.find(a => a.id === state.jingCasterId) || null
  const target = state.roster.find(a => a.id === state.jingTargetId) || null

  const agentOptions = agents
    .map(
      agent =>
        `<option value="${agent.id}">${escapeHtml(agent.name)} · ${escapeHtml(capitalize(agent.element))}</option>`
    )
    .join('')

  const movesHtml = JING_MOVE_IDS.map(moveId => {
    const move = JING_MOVE_DATA[moveId]
    const isSelected = state.jingMoveId === moveId
    const boostMag = jingBoostMagnitudeForMove(moveId)
    const boostPct = Math.round(boostMag * 40)
    const boostBadge =
      boostMag > 0.2
        ? `<span class="jing-boost-badge" data-magnitude="${boostMag.toFixed(2)}">🔥 +${boostPct}% ${escapeHtml(capitalize(casterTransit?.boostElement || ''))}</span>`
        : ''

    return `
      <div
        class="jing-move-card ${isSelected ? 'selected' : ''}"
        data-element="${move.element}"
        data-action="update-jing-move"
        data-move-id="${moveId}"
      >
        <div class="jing-move-glyph">${move.glyph}</div>
        <div class="jing-move-name">${escapeHtml(move.name)}</div>
        <div class="jing-move-element">${escapeHtml(move.element)}</div>
        <div class="jing-move-desc">${escapeHtml(move.description)}</div>
        ${boostBadge}
      </div>
    `
  }).join('')

  const canCast =
    state.jingCasterId && state.jingTargetId && state.jingMoveId && !state.runtime.generating
  const castDisabled = canCast ? '' : 'disabled'

  const stanceBadge = stance
    ? `<span class="jing-stance-badge" data-stance="${stance}">${escapeHtml(stanceLabel(stance))}</span>`
    : overlays.loading
      ? '<span class="jing-stance-badge loading">Reading the chart…</span>'
      : caster && target
        ? '<span class="jing-stance-badge muted">No stance yet</span>'
        : '<span class="jing-stance-badge muted">Pick caster &amp; target</span>'

  const aspectLine =
    synastry && synastry.interchartAspects.length > 0
      ? `<div class="jing-aspect-line">${escapeHtml(formatAspectLine(synastry.interchartAspects[0]))} · tension ${synastry.scores.tension.toFixed(2)} / harmony ${synastry.scores.harmony.toFixed(2)}</div>`
      : ''

  const casterChip = renderJingOverlayChip('Caster', caster, casterTransit)
  const targetChip = renderJingOverlayChip('Target', target, targetTransit)

  return `
    <section class="jing-arena-panel" aria-label="Jing Arena">
      <div class="jing-arena-header">
        <div>
          <div class="eyebrow">Agent Interaction</div>
          <h2>⚡ Jing Arena</h2>
        </div>
        ${stanceBadge}
      </div>

      <div class="jing-overlay-chips">
        ${casterChip}
        ${targetChip}
      </div>
      ${aspectLine}

      <div class="jing-combatants">
        <div class="jing-combatant-slot">
          <label for="jing-caster">Caster</label>
          <select id="jing-caster" data-action="update-jing-field" data-field="caster">
            <option value="">Select caster…</option>
            ${agentOptions}
          </select>
        </div>
        <div class="jing-versus">VS</div>
        <div class="jing-combatant-slot">
          <label for="jing-target">Target</label>
          <select id="jing-target" data-action="update-jing-field" data-field="target">
            <option value="">Select target…</option>
            ${agentOptions}
          </select>
        </div>
      </div>

      <div class="jing-moves-grid">
        ${movesHtml}
      </div>

      <button class="jing-duel-button" data-action="cast-jing-duel" ${castDisabled}>
        ⚔️ Cast Jing Duel ⚔️
      </button>
      ${overlays.lastError ? `<div class="jing-overlay-error">${escapeHtml(overlays.lastError)}</div>` : ''}
    </section>
  `
}

function stanceLabel(stance: JingStance): string {
  if (stance === 'clash') return '⚔️ Clash (Friction)'
  if (stance === 'absorb') return '🌊 Absorb (Harmonic)'
  return '🔁 Mirror (Conjunction)'
}

function renderJingOverlayChip(
  role: string,
  agent: LocalAgent | null,
  overlay: JingTransitOverlay | null
): string {
  if (!agent) {
    return `<div class="jing-overlay-chip empty"><span class="role">${escapeHtml(role)}</span><span class="muted">—</span></div>`
  }
  if (!overlay) {
    return `<div class="jing-overlay-chip"><span class="role">${escapeHtml(role)}</span><strong>${escapeHtml(agent.name)}</strong><span class="muted">no overlay</span></div>`
  }
  const headline = overlay.activations[0]
  const pct = Math.round(overlay.boostMagnitude * 100)
  const tag = overlay.boostElement
    ? `<span class="boost" data-element="${overlay.boostElement}">${pct}% ${escapeHtml(capitalize(overlay.boostElement))}</span>`
    : '<span class="muted">no boost</span>'
  const detail = headline
    ? `${escapeHtml(headline.transitPlanet)} ${escapeHtml(headline.type)} ${escapeHtml(headline.natalPoint)}`
    : 'no active transits'
  return `
    <div class="jing-overlay-chip">
      <span class="role">${escapeHtml(role)}</span>
      <strong>${escapeHtml(agent.name)}</strong>
      <span class="detail">${detail}</span>
      ${tag}
    </div>
  `
}

async function castJingDuel() {
  const casterId = state.jingCasterId
  const targetId = state.jingTargetId
  const moveId = state.jingMoveId as JingMoveId | null

  if (!casterId || !targetId || !moveId) return
  if (state.runtime.generating) return

  const caster = state.roster.find(a => a.id === casterId)
  const target = state.roster.find(a => a.id === targetId)
  if (!caster || !target) return

  const move = JING_MOVE_DATA[moveId]
  if (!move) return

  // ── Pull the relational ledger before the LLM turns ────────────
  // Overlays may already be warm from the change-listener pre-fetch;
  // refreshJingOverlays() is a no-op when lastPairKey matches.
  await refreshJingOverlays()
  const synastry = state.runtime.jingOverlays.synastry
  const casterTransit = state.runtime.jingOverlays.casterTransit
  const targetTransit = state.runtime.jingOverlays.targetTransit
  const stance: JingStance = synastry?.dominantStance || 'clash'

  const counterMoveId = pickCounterMove(moveId, stance, targetTransit)
  const counterMove = JING_MOVE_DATA[counterMoveId]
  const casterBoostMagnitude = jingBoostMagnitudeForMove(moveId)
  const targetBoostMagnitude = jingBoostMagnitudeForMove(counterMoveId)
  const casterBoostPct = Math.round(casterBoostMagnitude * 40)
  const chatKey = getActiveChatKey()
  const messages = getMessages(chatKey)
  const apiKey = state.account.apiKey || 'dev-desktop-token'

  // Track the full latency from cast → both turns resolved so the
  // /api/jing-duels record can drive admin telemetry charts.
  const duelStartedAt = Date.now()
  let casterFinalContent = ''
  let targetFinalContent = ''
  let casterPromptText = ''
  let targetPromptText = ''

  state.runtime.generating = true
  render()

  try {
    // ── Part 1: Caster Turn ───────────────────────────────────
    const casterPrompt = buildJingPrompt({
      speaker: caster,
      opponent: target,
      move,
      speakerRole: 'caster',
      synastry,
      speakerTransit: casterTransit,
      stance,
      boostMagnitude: casterBoostMagnitude,
    })
    casterPromptText = casterPrompt

    const casterMessage: ChatMessage = {
      id: makeId('jing'),
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      channel: `${move.glyph} ${move.name} Jing`,
      agentId: caster.id,
      agentName: caster.name,
    }
    messages.push(casterMessage)
    render()

    let casterContent = `${move.glyph} *${caster.name} casts ${move.name} on ${target.name}!*`

    // Try MCP first (local offline mode), then sidecar, then profile-guided reply
    const casterGenerated = await generateJingTurnText(caster, casterPrompt, apiKey)
    if (casterGenerated) casterContent = `${move.glyph} ${casterGenerated}`

    await streamTextIntoMessage(casterMessage, casterContent)
    casterFinalContent = casterContent

    // ── Part 2: Target Counter Turn ───────────────────────────
    const targetPrompt = buildJingPrompt({
      speaker: target,
      opponent: caster,
      move,
      speakerRole: 'target',
      counterMove,
      synastry,
      speakerTransit: targetTransit,
      stance,
      boostMagnitude: targetBoostMagnitude,
    })
    targetPromptText = targetPrompt

    const targetMessage: ChatMessage = {
      id: makeId('jing'),
      role: 'agent',
      content: '',
      timestamp: new Date().toISOString(),
      channel: `${counterMove.glyph} ${counterMove.name} Counter`,
      agentId: target.id,
      agentName: target.name,
    }
    messages.push(targetMessage)
    render()

    let targetContent = `${counterMove.glyph} *${target.name} counters with ${counterMove.name}!*`

    // Try MCP first (local offline mode), then sidecar, then profile-guided reply
    const targetGenerated = await generateJingTurnText(target, targetPrompt, apiKey)
    if (targetGenerated) targetContent = `${counterMove.glyph} ${targetGenerated}`

    await streamTextIntoMessage(targetMessage, targetContent)
    targetFinalContent = targetContent

    const aspectSummary =
      synastry && synastry.interchartAspects[0]
        ? ` (${formatAspectLine(synastry.interchartAspects[0])})`
        : ''
    const boostTag =
      casterBoostMagnitude > 0.2
        ? `+${casterBoostPct}% ${capitalize(casterTransit?.boostElement || '')} boost`
        : 'Standard'
    addLedger(
      'Jing Duel',
      `${caster.name} cast ${move.name} on ${target.name}. ${target.name} countered with ${counterMove.name} via ${stance} stance${aspectSummary}.`,
      boostTag
    )
    setNotice(
      `⚡ ${caster.name} vs ${target.name} — ${move.name} → ${counterMove.name} (${stance})`
    )

    // Fire-and-forget telemetry: persist the full ledger so the admin
    // dashboard + personalization pipeline can consume it. Failures
    // never block the UI (see /api/jing-duels which 200s on persist
    // errors with skipped=true).
    void persistJingDuel({
      sessionId: chatKey,
      userId: state.account.userId || null,
      source: 'desktop',
      caster,
      target,
      moveId,
      counterMoveId,
      stance,
      synastry,
      casterTransit,
      targetTransit,
      casterBoostMagnitude,
      casterPrompt: casterPromptText,
      casterResponse: casterFinalContent,
      targetPrompt: targetPromptText,
      targetResponse: targetFinalContent,
      latencyMs: Date.now() - duelStartedAt,
      apiKey,
    })
  } finally {
    state.runtime.generating = false
    saveState()
    render()
  }
}

async function persistJingDuel(opts: {
  sessionId: string
  userId: string | null
  source: string
  caster: LocalAgent
  target: LocalAgent
  moveId: JingMoveId
  counterMoveId: JingMoveId
  stance: JingStance
  synastry: JingSynastryOverlay | null
  casterTransit: JingTransitOverlay | null
  targetTransit: JingTransitOverlay | null
  casterBoostMagnitude: number
  casterPrompt: string
  casterResponse: string
  targetPrompt: string
  targetResponse: string
  latencyMs: number
  apiKey: string
}): Promise<void> {
  const url = `${(state.account.agentsUrl || 'https://agents.alchm.kitchen').replace(/\/$/, '')}/api/jing-duels`
  const body = {
    sessionId: opts.sessionId,
    userId: opts.userId,
    source: opts.source,
    casterId: opts.caster.id,
    targetId: opts.target.id,
    attackMoveId: opts.moveId,
    counterMoveId: opts.counterMoveId,
    stance: opts.stance,
    boostElement: opts.casterTransit?.boostElement ?? null,
    boostMagnitude: opts.casterBoostMagnitude,
    cacheHit: Boolean(opts.synastry?.pair?.cacheHit),
    synastrySnapshot: opts.synastry,
    casterTransitSnapshot: opts.casterTransit,
    targetTransitSnapshot: opts.targetTransit,
    casterPrompt: opts.casterPrompt,
    casterResponse: opts.casterResponse,
    targetPrompt: opts.targetPrompt,
    targetResponse: opts.targetResponse,
    latencyMs: opts.latencyMs,
    modelUsed: 'pa-mcp:local',
  }
  if (!canCallNetwork()) {
    // Airplane mode: skip telemetry POST silently. The duel still
    // happened locally; the cloud just won't know about it. This is a
    // non-blocking call by design — see the catch block below.
    return
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': opts.apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      console.warn('Jing duel telemetry POST returned', response.status, await response.text())
    }
  } catch (err) {
    console.warn('Jing duel telemetry POST failed (non-blocking):', err)
  }
}

function renderStarterMessage(agent: LocalAgent) {
  const helperText =
    agent.source === 'app-guide'
      ? "Built into Alchm Desktop for account, yield, catalog, Philosopher's Stone, and local runtime guidance."
      : agent.source === 'philosophers-stone'
        ? "Created locally with the Philosopher's Stone from birth information and context."
        : 'Same agent profile as Alchm Agents, running in the companion app.'

  return `
    <article class="message agent">
      <strong>${escapeHtml(agent.name)}</strong>
      <p>${escapeHtml(agent.quote)}</p>
      <small class="muted">${escapeHtml(helperText)}</small>
    </article>
  `
}

function renderGroupStarterMessage(agents: LocalAgent[]) {
  return `
    <article class="message agent">
      <strong>Group Chat</strong>
      <p>${escapeHtml(agents.map(agent => agent.name).join(', '))}</p>
      <small class="muted">Sequential agent turn order</small>
    </article>
  `
}

function renderMessage(message: ChatMessage) {
  const speakerName = message.role === 'user' ? 'You' : getMessageSpeakerName(message)
  const isAgent = message.role !== 'user'
  const isSpeaking = state.speakingMessageId === message.id

  const playButton = isAgent
    ? `
    <button class="voice-play-button ${isSpeaking ? 'speaking' : ''}" 
            data-action="play-message" 
            data-message-id="${message.id}" 
            data-agent-id="${message.agentId || ''}" 
            title="${isSpeaking ? 'Stop speaking' : "Read in agent's voice"}">
      ${
        isSpeaking
          ? `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </svg>
      `
          : `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      `
      }
    </button>
  `
    : ''

  const agentElement = isAgent ? getMessageAgentElement(message) : ''

  return `
    <article class="message ${message.role}${agentElement ? ` element-${agentElement}` : ''}">
      <div class="message-meta">
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong>${escapeHtml(speakerName)}</strong>
          ${playButton}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <div class="message-actions">
            <button class="message-action-btn" data-action="copy-message" data-message-text="${escapeHtml(message.content)}" title="Copy message">
              <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
            </button>
          </div>
          <small>${formatTime(message.timestamp)}${message.channel ? ` · ${escapeHtml(message.channel)}` : ''}</small>
        </div>
      </div>
      <p>${escapeHtml(message.content)}</p>
    </article>
  `
}

function getMessageSpeakerName(message: ChatMessage) {
  if (message.agentName) return message.agentName
  if (message.agentId)
    return state.roster.find(agent => agent.id === message.agentId)?.name || 'Agent'
  return getActiveAgent()?.name || 'Agent'
}

function getMessageAgentElement(message: ChatMessage): string {
  const agent = message.agentId
    ? state.roster.find(a => a.id === message.agentId)
    : getActiveAgent()
  return agent?.element || ''
}

function chatComposerPlaceholder(agents: LocalAgent[]) {
  if (!agents.length) return 'Add an agent in the main window first'
  if (agents.length === 1) return `Message ${agents[0].name}`
  return `Ask your group of ${agents.length} agents`
}

function renderAstrologyView() {
  const snapshot = state.astrology.snapshot

  if (!snapshot) {
    return `
      <section class="view empty-state">
        <div class="panel stack">
          <div class="eyebrow">Consensus Astrology</div>
          <h1>Astrology dashboard</h1>
          <p class="muted">
            Current chart, planetary chart, standing chart, Alchm quantities, agent routing, and
            Philosopher's Stone readiness in one native desktop surface.
          </p>
          ${
            state.astrology.lastError
              ? `<div class="panel error-panel">${escapeHtml(state.astrology.lastError)}</div>`
              : ''
          }
          <div class="button-row center-row">
            <button class="primary-button" data-action="refresh-astrology">
              ${state.astrology.status === 'loading' ? 'Loading' : 'Load Dashboard'}
            </button>
            <button
              class="secondary-button"
              data-action="open-astrology-source"
              data-url="${ASTROLOGY_SOURCE_URLS.currentChart}"
            >
              Current Chart
            </button>
          </div>
        </div>
      </section>
    `
  }

  return `
    <section class="view astrology-view">
      <header class="view-header astrology-header">
        <div>
          <div class="eyebrow">Consensus Astrology</div>
          <h1>Pro astrology dashboard</h1>
          <p>
            ${escapeHtml(snapshot.chart.sunSign)} Sun, ${escapeHtml(snapshot.chart.moonSign)} Moon,
            ${escapeHtml(snapshot.chart.ascendant.sign)} rising. Kitchen chart intelligence,
            Alchm quantities, dynamic aspects, and Agents routing are fused here for desktop work.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-astrology">
            ${state.astrology.status === 'loading' ? 'Refreshing' : 'Refresh Sky'}
          </button>
          <button
            class="secondary-button"
            data-action="open-astrology-source"
            data-url="${ASTROLOGY_SOURCE_URLS.currentChart}"
          >
            Current Chart
          </button>
          <button
            class="secondary-button"
            data-action="open-astrology-source"
            data-url="${ASTROLOGY_SOURCE_URLS.kitchenLab}"
          >
            Kitchen Lab
          </button>
        </div>
      </header>

      <div class="astro-kpi-grid">
        ${renderAstroKpi('A-number', snapshot.quantities.ANumber.toFixed(2), `${snapshot.quantities.dominantElement} dominance`)}
        ${renderAstroKpi('Moon phase', snapshot.moonPhase.name, `${snapshot.moonPhase.illumination}% illuminated`)}
        ${renderAstroKpi('Planetary hour', snapshot.planetaryHour.current, `${snapshot.planetaryHour.dayRuler} day`)}
        ${renderAstroKpi('Major aspects', String(snapshot.chart.aspects.length), `${snapshot.quantities.kineticPressure} kinetic pressure`)}
        ${renderAstroKpi('Agent routes', String(snapshot.activeAgents.length), 'ready for companion chat')}
      </div>

      <div class="astro-dashboard-grid">
        <section class="panel astro-wheel-panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Planetary Chart</div>
              <h2>Live consensus sky</h2>
            </div>
            <span class="tag">${escapeHtml(formatTime(snapshot.generatedAt))}</span>
          </div>
          ${renderAstrologyWheel(snapshot)}
        </section>

        <section class="panel astro-quant-panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Alchm Quantities</div>
              <h2>Thermodynamic state</h2>
            </div>
            <span class="tag">A# ${snapshot.quantities.ANumber.toFixed(2)}</span>
          </div>
          <div class="quantity-stack">
            ${renderAstroQuantity('Spirit', snapshot.quantities.Spirit, '#facc15')}
            ${renderAstroQuantity('Essence', snapshot.quantities.Essence, '#60a5fa')}
            ${renderAstroQuantity('Matter', snapshot.quantities.Matter, '#fb923c')}
            ${renderAstroQuantity('Substance', snapshot.quantities.Substance, '#4ade80')}
          </div>
          <div class="astro-metric-row">
            ${renderAstroMicroMetric('Heat', snapshot.quantities.heat)}
            ${renderAstroMicroMetric('Entropy', snapshot.quantities.entropy)}
            ${renderAstroMicroMetric('Reactivity', snapshot.quantities.reactivity)}
            ${renderAstroMicroMetric('Energy', snapshot.quantities.energy)}
          </div>
        </section>
      </div>

      <section class="panel stack">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Current Positions</div>
            <h2>Planets, dignity, and agent signal</h2>
          </div>
          <span class="tag">Julian ${snapshot.chart.julianDay}</span>
        </div>
        ${renderAstrologyTable(snapshot.chart.planets)}
      </section>

      <div class="astro-split-grid">
        <section class="panel stack">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Aspects</div>
              <h2>Applying pressure map</h2>
            </div>
          </div>
          <div class="aspect-list">
            ${
              snapshot.chart.aspects.length
                ? snapshot.chart.aspects.slice(0, 7).map(renderAstrologyAspect).join('')
                : '<p class="muted">No tight major aspects are dominating the current sky.</p>'
            }
          </div>
        </section>

        <section class="panel stack">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Agents</div>
              <h2>Activated routes</h2>
            </div>
          </div>
          <div class="activation-list">
            ${snapshot.activeAgents.map(renderAgentActivation).join('')}
          </div>
        </section>
      </div>

      <section class="astro-layer-band">
        <div class="panel-heading unframed-heading">
          <div>
            <div class="eyebrow">Consensus Stack</div>
            <h2>What this dashboard is combining</h2>
          </div>
        </div>
        <div class="astro-layer-grid">
          ${snapshot.layers.map(renderAstrologyLayer).join('')}
        </div>
      </section>

      <section class="panel stack">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Monica Signal</div>
            <h2>Recommended operating mode</h2>
          </div>
          <button
            class="secondary-button"
            data-action="open-astrology-source"
            data-url="${ASTROLOGY_SOURCE_URLS.agents}"
          >
            Agents Web
          </button>
        </div>
        <div class="recommendation-grid">
          ${snapshot.recommendations.map(item => `<p>${escapeHtml(item)}</p>`).join('')}
        </div>
      </section>
    </section>
  `
}

function renderAstroKpi(label: string, value: string, detail: string) {
  return `
    <article class="astro-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `
}

function renderAstrologyWheel(snapshot: AstrologyConsensusSnapshot) {
  return `
    <div class="astro-wheel-wrap">
      <div class="astro-wheel">
        ${ASTROLOGY_SIGN_MARKS.map((sign, index) => {
          const angle = index * 30 - 90
          return `
            <span
              class="astro-sign-mark"
              style="--mark-angle: ${angle}deg; --mark-counter: ${-angle}deg"
            >
              ${sign}
            </span>
          `
        }).join('')}
        ${snapshot.chart.planets
          .map(planet => {
            const angle = planet.longitude - 90
            return `
              <span
                class="astro-planet-marker"
                title="${escapeHtml(`${planet.planet} ${planet.display}`)}"
                style="--planet-angle: ${angle}deg; --planet-counter: ${-angle}deg; --accent: ${escapeHtml(planet.color)}"
              >
                <b>${escapeHtml(planet.planet.slice(0, 2))}</b>
                <small>${escapeHtml(planet.signAbbreviation)}</small>
              </span>
            `
          })
          .join('')}
        <div class="astro-wheel-core">
          <span>${escapeHtml(snapshot.chart.sunSign)}</span>
          <strong>${escapeHtml(snapshot.quantities.dominantElement)}</strong>
          <small>${escapeHtml(snapshot.moonPhase.name)}</small>
        </div>
      </div>
      <div class="astro-wheel-caption">
        <span>ASC ${escapeHtml(snapshot.chart.ascendant.sign)} ${snapshot.chart.ascendant.degree.toFixed(2)}deg</span>
        <span>${snapshot.chart.aspects.length} aspects</span>
        <span>${escapeHtml(snapshot.planetaryHour.current)} hour</span>
      </div>
    </div>
  `
}

function renderAstroQuantity(label: keyof AstrologyQuantities, value: number, color: string) {
  const width = Math.max(8, Math.min(100, (value / 9) * 100))
  return `
    <div class="quantity-row" style="--quantity-color: ${color}; --quantity-width: ${width}%">
      <div>
        <strong>${label}</strong>
        <span>${value.toFixed(2)}</span>
      </div>
      <i aria-hidden="true"></i>
    </div>
  `
}

function renderAstroMicroMetric(label: string, value: number) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${value.toFixed(3)}</strong>
    </article>
  `
}

function renderAstrologyTable(planets: AstrologyPlanet[]) {
  return `
    <div class="astro-table-wrap">
      <table class="astro-table">
        <thead>
          <tr>
            <th>Planet</th>
            <th>Position</th>
            <th>Element</th>
            <th>Dignity</th>
            <th>Motion</th>
            <th>Agent Signal</th>
          </tr>
        </thead>
        <tbody>
          ${planets
            .map(
              planet => `
                <tr>
                  <td>
                    <strong>${escapeHtml(planet.planet)}</strong>
                    <small>${escapeHtml(planet.ruler)} ruled sign</small>
                  </td>
                  <td>
                    <strong>${escapeHtml(planet.display)}</strong>
                    <small>${planet.longitude.toFixed(2)}deg absolute</small>
                  </td>
                  <td>
                    <span class="element-chip ${escapeHtml(planet.element.toLowerCase())}">
                      ${escapeHtml(planet.element)}
                    </span>
                    <small>${escapeHtml(planet.esms)}</small>
                  </td>
                  <td>
                    <strong>${escapeHtml(capitalize(planet.dignity))}</strong>
                    <small>strength ${planet.strength.toFixed(2)}</small>
                  </td>
                  <td>
                    <strong>${escapeHtml(capitalize(planet.motion))}</strong>
                    <small>${planet.speed.toFixed(3)}deg/day</small>
                  </td>
                  <td>
                    <strong>${escapeHtml(planet.agent)}</strong>
                    <small>${escapeHtml(planet.agentRole)}</small>
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderAstrologyAspect(aspect: AstrologyAspect) {
  return `
    <article class="aspect-row">
      <div>
        <strong>${escapeHtml(aspect.summary)}</strong>
        <small>${escapeHtml(aspect.polarity)} · ${aspect.applying ? 'applying' : 'separating'}</small>
      </div>
      <div class="aspect-score">
        <span>${aspect.exactness}%</span>
        <small>${aspect.orb.toFixed(2)}deg orb</small>
      </div>
    </article>
  `
}

function renderAgentActivation(activation: AstrologyConsensusSnapshot['activeAgents'][number]) {
  return `
    <article class="activation-row">
      <div>
        <span class="avatar mini-avatar">${escapeHtml(initialsForName(activation.agent))}</span>
      </div>
      <div>
        <strong>${escapeHtml(activation.agent)}</strong>
        <small>${escapeHtml(activation.planet)} · ${escapeHtml(activation.role)}</small>
        <p>${escapeHtml(activation.reason)}</p>
      </div>
      <b>${activation.score}</b>
    </article>
  `
}

function renderAstrologyLayer(layer: AstrologyConsensusSnapshot['layers'][number]) {
  return `
    <article class="astro-layer-card">
      <div class="layer-head">
        <span>${escapeHtml(layer.status)}</span>
        <strong>${layer.confidence}%</strong>
      </div>
      <h3>${escapeHtml(layer.label)}</h3>
      <p>${escapeHtml(layer.signal)}</p>
      <small>${escapeHtml(layer.source)}</small>
    </article>
  `
}

function renderPhysicsView() {
  const snapshot = state.physics.snapshot

  if (!snapshot) {
    return `
      <section class="view empty-state">
        <div class="panel stack">
          <div class="eyebrow">Alchm Physics</div>
          <h1>Physics dashboard</h1>
          <p class="muted">
            Explore Alchm quantities, kinetic motion, thermodynamic drift, and z-score baselines
            from the current landscape.
          </p>
          ${
            state.physics.lastError
              ? `<div class="panel error-panel">${escapeHtml(state.physics.lastError)}</div>`
              : ''
          }
          <div class="button-row center-row">
            <button class="primary-button" data-action="refresh-physics">
              ${state.physics.status === 'loading' ? 'Loading' : 'Load Dashboard'}
            </button>
            <button
              class="secondary-button"
              data-action="open-physics-source"
              data-url="${PHYSICS_SOURCE_URLS.quantities}"
            >
              Kitchen Quantities
            </button>
          </div>
        </div>
      </section>
    `
  }

  return `
    <section class="view physics-view">
      <header class="view-header physics-header">
        <div>
          <div class="eyebrow">Alchm Physics</div>
          <h1>Alchm physics dashboard</h1>
          <p>
            A native companion view for quantities, kinetic vectors, thermodynamic rates, and
            z-score deviations across the current ${snapshot.baseline.windowHours}-hour Alchm landscape.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-physics">
            ${state.physics.status === 'loading' ? 'Refreshing' : 'Refresh Landscape'}
          </button>
          <button
            class="secondary-button"
            data-action="open-physics-source"
            data-url="${PHYSICS_SOURCE_URLS.quantities}"
          >
            Kitchen Quantities
          </button>
          <button
            class="secondary-button"
            data-action="open-physics-source"
            data-url="${PHYSICS_SOURCE_URLS.kineticsApi}"
          >
            Kinetics API
          </button>
        </div>
      </header>

      <div class="physics-kpi-grid">
        ${renderPhysicsKpi('A-number', snapshot.current.quantities.ANumber.toFixed(2), `z ${formatSigned(findZ(snapshot.zScores.quantities, 'ANumber'))}`)}
        ${renderPhysicsKpi('Landscape', capitalize(snapshot.landscape.mode), snapshot.landscape.weather)}
        ${renderPhysicsKpi('Energy z', formatSigned(snapshot.landscape.energyZScore), snapshot.zScores.thermodynamics.find(metric => metric.key === 'energy')?.direction || 'at baseline')}
        ${renderPhysicsKpi('Velocity', snapshot.kinetics.velocity.magnitude.toFixed(4), `${snapshot.kinetics.velocity.dominantElement} vector`)}
        ${renderPhysicsKpi('Momentum', snapshot.kinetics.momentum.type, snapshot.kinetics.momentum.magnitude.toFixed(4))}
        ${renderPhysicsKpi('Thermal drift', capitalize(snapshot.kinetics.metricVelocity.thermalDirection), `power ${formatSigned(snapshot.kinetics.power.value)}`)}
      </div>

      <div class="physics-dashboard-grid">
        <section class="panel physics-landscape-panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Current Landscape</div>
              <h2>${escapeHtml(capitalize(snapshot.landscape.mode))} field</h2>
            </div>
            <span class="tag">${escapeHtml(snapshot.current.planetaryHour)} hour</span>
          </div>
          <div class="physics-landscape-core">
            <strong>${escapeHtml(snapshot.landscape.weather)}</strong>
            <p>
              ${escapeHtml(snapshot.landscape.dominantQuantity)} leads the quantities at
              ${snapshot.landscape.dominantQuantityValue.toFixed(2)}. The strongest element is
              ${escapeHtml(snapshot.landscape.strongestElement)} at ${snapshot.landscape.strongestElementValue.toFixed(2)}.
            </p>
          </div>
          <div class="physics-landscape-stats">
            ${renderPhysicsMicroStat('Most unusual', `${snapshot.landscape.mostUnusual.label} ${formatSigned(snapshot.landscape.mostUnusual.zScore)}`)}
            ${renderPhysicsMicroStat('Aspect pressure', snapshot.landscape.aspectPressure.toFixed(2))}
            ${renderPhysicsMicroStat('Harmonic flow', snapshot.landscape.harmonicFlow.toFixed(2))}
            ${renderPhysicsMicroStat('Moon phase', snapshot.landscape.moonPhase)}
          </div>
        </section>

        <section class="panel physics-kinetic-panel">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Kinetic State</div>
              <h2>Velocity, momentum, force, power</h2>
            </div>
            <span class="tag">Inertia ${snapshot.kinetics.inertia.toFixed(3)}</span>
          </div>
          <div class="physics-vector-grid">
            ${renderPhysicsVector('Velocity', snapshot.kinetics.velocity.vector, '#22d3ee')}
            ${renderPhysicsVector('Momentum', snapshot.kinetics.momentum.vector, '#f59e0b')}
            ${renderPhysicsVector('Force', snapshot.kinetics.force.vector, '#fb7185')}
          </div>
          <div class="physics-equation-row">
            ${Object.entries(snapshot.kinetics.calculus)
              .map(
                ([label, value]) => `
                  <span>
                    <b>${escapeHtml(label)}</b>
                    ${escapeHtml(value)}
                  </span>
                `
              )
              .join('')}
          </div>
        </section>
      </div>

      ${renderPhysicsVisualLab(snapshot)}

      <div class="physics-board-grid">
        <section class="panel stack">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Quantity Z-Scores</div>
              <h2>Spirit, Essence, Matter, Substance</h2>
            </div>
            <span class="tag">${snapshot.baseline.samples} samples</span>
          </div>
          <div class="physics-z-stack">
            ${snapshot.zScores.quantities
              .map(metric => renderPhysicsZMetric(metric, physicsAccentFor(metric.key)))
              .join('')}
          </div>
        </section>

        <section class="panel stack">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Thermodynamics</div>
              <h2>Heat, entropy, reactivity, energy</h2>
            </div>
            <span class="tag">z-score baseline</span>
          </div>
          <div class="physics-thermo-grid">
            ${snapshot.zScores.thermodynamics.map(renderPhysicsThermoMetric).join('')}
          </div>
          <div class="physics-drift-grid">
            ${renderPhysicsMicroStat('dHeat/dt', formatSigned(snapshot.kinetics.metricVelocity.vector.heat))}
            ${renderPhysicsMicroStat('dEntropy/dt', formatSigned(snapshot.kinetics.metricVelocity.vector.entropy))}
            ${renderPhysicsMicroStat('dReactivity/dt', formatSigned(snapshot.kinetics.metricVelocity.vector.reactivity))}
            ${renderPhysicsMicroStat('dEnergy/dt', formatSigned(snapshot.kinetics.metricVelocity.vector.energy))}
          </div>
        </section>
      </div>

      <section class="panel stack">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Landscape Timeline</div>
            <h2>Hourly z-score drift</h2>
          </div>
          <span class="tag">${escapeHtml(formatTime(snapshot.targetMoment))}</span>
        </div>
        <div class="physics-timeline">
          ${snapshot.samplePoints.map(renderPhysicsSamplePoint).join('')}
        </div>
      </section>

      <div class="physics-info-grid">
        <section class="panel stack">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Monica Signal</div>
              <h2>Operating notes</h2>
            </div>
          </div>
          <div class="recommendation-grid physics-rec-grid">
            ${snapshot.recommendations.map(item => `<p>${escapeHtml(item)}</p>`).join('')}
          </div>
        </section>

        <section class="physics-source-band">
          <div class="panel-heading unframed-heading">
            <div>
              <div class="eyebrow">Sources</div>
              <h2>What this screen consolidates</h2>
            </div>
          </div>
          <div class="physics-source-grid">
            ${snapshot.provenance.map(renderPhysicsSource).join('')}
          </div>
        </section>
      </div>
    </section>
  `
}

function renderPhysicsKpi(label: string, value: string, detail: string) {
  return `
    <article class="physics-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </article>
  `
}

function renderPhysicsVisualLab(snapshot: AlchmPhysicsSnapshot) {
  return `
    <section class="panel stack physics-visual-lab">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Quantity Physics Visualizer</div>
          <h2>Composition, phase space, kinetic field, and z-score flow</h2>
        </div>
        <span class="tag">${snapshot.baseline.cadence} baseline</span>
      </div>
      <div class="physics-visual-grid">
        ${renderQuantityComposition(snapshot)}
        ${renderThermoPhasePortrait(snapshot)}
        ${renderKineticFieldMap(snapshot)}
        ${renderZScoreConstellation(snapshot)}
        ${renderQuantityHeatmap(snapshot)}
      </div>
    </section>
  `
}

function renderQuantityComposition(snapshot: AlchmPhysicsSnapshot) {
  const entries = [
    {
      key: 'Spirit',
      label: 'Spirit',
      value: snapshot.current.quantities.Spirit,
      color: physicsAccentFor('Spirit'),
    },
    {
      key: 'Essence',
      label: 'Essence',
      value: snapshot.current.quantities.Essence,
      color: physicsAccentFor('Essence'),
    },
    {
      key: 'Matter',
      label: 'Matter',
      value: snapshot.current.quantities.Matter,
      color: physicsAccentFor('Matter'),
    },
    {
      key: 'Substance',
      label: 'Substance',
      value: snapshot.current.quantities.Substance,
      color: physicsAccentFor('Substance'),
    },
  ]
  const total = Math.max(
    0.001,
    entries.reduce((sum, entry) => sum + entry.value, 0)
  )
  let cursor = 0
  const stops = entries
    .map(entry => {
      const start = cursor
      cursor += (entry.value / total) * 100
      return `${entry.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`
    })
    .join(', ')

  return `
    <article class="physics-viz-card physics-composition-card">
      <div class="viz-heading">
        <span>Quantity Composition</span>
        <strong>A# ${snapshot.current.quantities.ANumber.toFixed(2)}</strong>
      </div>
      <div
        class="physics-composition-wheel"
        style="--composition: conic-gradient(${stops})"
        aria-hidden="true"
      >
        <div>
          <span>Dominant</span>
          <strong>${escapeHtml(snapshot.landscape.dominantQuantity)}</strong>
        </div>
      </div>
      <div class="physics-composition-legend">
        ${entries
          .map(entry => {
            const percent = (entry.value / total) * 100
            return `
              <div style="--legend-color: ${entry.color}; --legend-width: ${percent}%">
                <span>${escapeHtml(entry.label)}</span>
                <i aria-hidden="true"></i>
                <b>${percent.toFixed(1)}%</b>
              </div>
            `
          })
          .join('')}
      </div>
    </article>
  `
}

function renderThermoPhasePortrait(snapshot: AlchmPhysicsSnapshot) {
  const points = snapshot.samplePoints
    .map(point => {
      const entropyZ = point.thermodynamicZScores?.entropy ?? 0
      const heatZ = point.thermodynamicZScores?.heat ?? 0
      return `${zSvgPosition(entropyZ)},${100 - zSvgPosition(heatZ)}`
    })
    .join(' ')
  const currentEntropyZ = findZ(snapshot.zScores.thermodynamics, 'entropy')
  const currentHeatZ = findZ(snapshot.zScores.thermodynamics, 'heat')
  const currentX = zSvgPosition(currentEntropyZ)
  const currentY = 100 - zSvgPosition(currentHeatZ)

  return `
    <article class="physics-viz-card">
      <div class="viz-heading">
        <span>Thermodynamic Phase Space</span>
        <strong>Heat x entropy</strong>
      </div>
      <svg class="physics-phase-portrait" viewBox="0 0 100 100" role="img" aria-label="Thermodynamic phase portrait">
        <line x1="50" y1="8" x2="50" y2="92"></line>
        <line x1="8" y1="50" x2="92" y2="50"></line>
        <polyline points="${points}"></polyline>
        <circle cx="${currentX}" cy="${currentY}" r="4.4"></circle>
        <text x="9" y="12">Heat</text>
        <text x="70" y="94">Entropy</text>
      </svg>
      <div class="physics-phase-caption">
        <span>Heat z ${formatSigned(currentHeatZ)}</span>
        <span>Entropy z ${formatSigned(currentEntropyZ)}</span>
      </div>
    </article>
  `
}

function renderKineticFieldMap(snapshot: AlchmPhysicsSnapshot) {
  const vectors = [
    { label: 'V', name: 'Velocity', vector: snapshot.kinetics.velocity.vector, color: '#22d3ee' },
    { label: 'P', name: 'Momentum', vector: snapshot.kinetics.momentum.vector, color: '#f59e0b' },
    { label: 'F', name: 'Force', vector: snapshot.kinetics.force.vector, color: '#fb7185' },
  ]
  const max = Math.max(
    0.0001,
    ...vectors.flatMap(item => Object.values(item.vector).map(value => Math.abs(value)))
  )

  return `
    <article class="physics-viz-card">
      <div class="viz-heading">
        <span>Kinetic Field Map</span>
        <strong>${escapeHtml(snapshot.kinetics.momentum.type)}</strong>
      </div>
      <div class="physics-field-map">
        <span class="axis fire">Fire</span>
        <span class="axis water">Water</span>
        <span class="axis air">Air</span>
        <span class="axis earth">Earth</span>
        <i class="field-axis horizontal" aria-hidden="true"></i>
        <i class="field-axis vertical" aria-hidden="true"></i>
        ${vectors
          .map(item => {
            const point = kineticFieldPoint(item.vector, max)
            return `
              <b
                class="field-dot"
                title="${escapeHtml(item.name)}"
                style="--field-x: ${point.x}%; --field-y: ${point.y}%; --field-color: ${item.color}"
              >
                ${escapeHtml(item.label)}
              </b>
            `
          })
          .join('')}
      </div>
      <div class="physics-phase-caption">
        <span>Air/Earth horizontal</span>
        <span>Fire/Water vertical</span>
      </div>
    </article>
  `
}

function renderZScoreConstellation(snapshot: AlchmPhysicsSnapshot) {
  const metrics = [...snapshot.zScores.quantities, ...snapshot.zScores.thermodynamics]
  const count = Math.max(1, metrics.length - 1)

  return `
    <article class="physics-viz-card">
      <div class="viz-heading">
        <span>Z-Score Constellation</span>
        <strong>${metrics.length} metrics</strong>
      </div>
      <div class="physics-z-constellation">
        <i class="constellation-line low" aria-hidden="true"></i>
        <i class="constellation-line center" aria-hidden="true"></i>
        <i class="constellation-line high" aria-hidden="true"></i>
        ${metrics
          .map((metric, index) => {
            const y = 12 + (index / count) * 76
            return `
              <b
                class="constellation-dot"
                title="${escapeHtml(`${metric.label}: z ${formatSigned(metric.zScore)}`)}"
                style="--dot-x: ${zPosition(metric.zScore)}%; --dot-y: ${y}%; --dot-color: ${physicsAccentFor(metric.key)}"
              >
                ${escapeHtml(metricShortLabel(metric.label))}
              </b>
            `
          })
          .join('')}
      </div>
      <div class="physics-phase-caption">
        <span>-2z</span>
        <span>0z</span>
        <span>+2z</span>
      </div>
    </article>
  `
}

function renderQuantityHeatmap(snapshot: AlchmPhysicsSnapshot) {
  const keys = ['Spirit', 'Essence', 'Matter', 'Substance', 'ANumber'] as const
  const gridTemplate = `82px repeat(${snapshot.samplePoints.length}, minmax(9px, 1fr))`

  return `
    <article class="physics-viz-card physics-heatmap-card">
      <div class="viz-heading">
        <span>Quantity Z-Score Flow</span>
        <strong>${snapshot.samplePoints.length} hourly samples</strong>
      </div>
      <div class="physics-heatmap" style="grid-template-columns: ${gridTemplate}">
        ${keys
          .map(
            key => `
              <strong>${escapeHtml(key === 'ANumber' ? 'A#' : key)}</strong>
              ${snapshot.samplePoints
                .map(point => {
                  const zScore = point.quantityZScores?.[key] ?? 0
                  return `
                    <i
                      class="${point.isCurrent ? 'current' : ''}"
                      title="${escapeHtml(`${point.label} ${key}: z ${formatSigned(zScore)}`)}"
                      style="--cell-color: ${zHeatColor(zScore)}"
                    ></i>
                  `
                })
                .join('')}
            `
          )
          .join('')}
      </div>
      <div class="physics-heatmap-axis">
        <span>${escapeHtml(snapshot.samplePoints[0]?.label || 'Start')}</span>
        <span>Now highlighted</span>
        <span>${escapeHtml(snapshot.samplePoints[snapshot.samplePoints.length - 1]?.label || 'End')}</span>
      </div>
    </article>
  `
}

function renderPhysicsMicroStat(label: string, value: string) {
  return `
    <article class="physics-micro-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `
}

function renderPhysicsZMetric(metric: PhysicsZMetric, accent: string) {
  const position = zPosition(metric.zScore)
  return `
    <article class="physics-z-row ${zBandClass(metric.band)}" style="--z-accent: ${accent}; --z-position: ${position}%">
      <div class="physics-z-head">
        <div>
          <strong>${escapeHtml(metric.label)}</strong>
          <small>${escapeHtml(metric.direction)} · ${metric.percentile}th pct</small>
        </div>
        <div>
          <b>${formatSigned(metric.zScore)}</b>
          <small>${metric.value.toFixed(metric.key === 'ANumber' ? 2 : 2)} / avg ${metric.mean.toFixed(metric.key === 'ANumber' ? 2 : 2)}</small>
        </div>
      </div>
      <div class="physics-z-track"><i aria-hidden="true"></i></div>
    </article>
  `
}

function renderPhysicsThermoMetric(metric: PhysicsZMetric) {
  return `
    <article class="physics-thermo-card ${zBandClass(metric.band)}" style="--z-accent: ${physicsAccentFor(metric.key)}; --z-position: ${zPosition(metric.zScore)}%">
      <div>
        <span>${escapeHtml(metric.label)}</span>
        <strong>${metric.value.toFixed(3)}</strong>
      </div>
      <div class="physics-z-track"><i aria-hidden="true"></i></div>
      <small>z ${formatSigned(metric.zScore)} · avg ${metric.mean.toFixed(3)}</small>
    </article>
  `
}

function renderPhysicsVector(label: string, vector: Record<string, number>, accent: string) {
  const entries = Object.entries(vector)
  const max = Math.max(0.0001, ...entries.map(([, value]) => Math.abs(value)))

  return `
    <article class="physics-vector-card" style="--vector-accent: ${accent}">
      <strong>${escapeHtml(label)}</strong>
      <div class="physics-vector-bars">
        ${entries
          .map(([key, value]) => {
            const width = Math.max(3, Math.min(100, (Math.abs(value) / max) * 100))
            return `
              <div class="physics-vector-bar" style="--vector-width: ${width}%">
                <span>${escapeHtml(key)}</span>
                <i aria-hidden="true"></i>
                <b>${formatSigned(value)}</b>
              </div>
            `
          })
          .join('')}
      </div>
    </article>
  `
}

function renderPhysicsSamplePoint(point: AlchmPhysicsSnapshot['samplePoints'][number]) {
  const energyPosition = zPosition(point.energyZScore)
  const aNumberPosition = zPosition(point.aNumberZScore)

  return `
    <article
      class="physics-sample ${point.isCurrent ? 'current' : ''}"
      style="--energy-position: ${energyPosition}%; --a-position: ${aNumberPosition}%"
    >
      <strong>${escapeHtml(point.label)}</strong>
      <div class="physics-sample-track energy"><i aria-hidden="true"></i></div>
      <div class="physics-sample-track a-number"><i aria-hidden="true"></i></div>
      <small>${escapeHtml(point.planetaryHour)} · E ${formatSigned(point.energyZScore)}</small>
    </article>
  `
}

function renderPhysicsSource(source: AlchmPhysicsSnapshot['provenance'][number]) {
  return `
    <article class="physics-source-card">
      <h3>${escapeHtml(source.name)}</h3>
      <p>${escapeHtml(source.contribution)}</p>
      <button class="secondary-button" data-action="open-physics-source" data-url="${escapeHtml(source.url)}">
        Open
      </button>
    </article>
  `
}

function findZ(metrics: PhysicsZMetric[], key: string) {
  return metrics.find(metric => metric.key === key)?.zScore || 0
}

function zPosition(zScore: number) {
  return Math.max(3, Math.min(97, 50 + zScore * 18))
}

function zSvgPosition(zScore: number) {
  return Math.max(8, Math.min(92, 50 + zScore * 16))
}

function zBandClass(band: PhysicsBand) {
  return `z-band-${band}`
}

function kineticFieldPoint(vector: Record<string, number>, max: number) {
  const x = 50 + (((vector.Air || 0) - (vector.Earth || 0)) / max) * 34
  const y = 50 - (((vector.Fire || 0) - (vector.Water || 0)) / max) * 34

  return {
    x: Math.max(9, Math.min(91, x)),
    y: Math.max(9, Math.min(91, y)),
  }
}

function metricShortLabel(label: string) {
  const labels: Record<string, string> = {
    Spirit: 'Sp',
    Essence: 'Es',
    Matter: 'Ma',
    Substance: 'Su',
    'A-number': 'A#',
    Heat: 'Ht',
    Entropy: 'En',
    Reactivity: 'Rx',
    Energy: 'Eg',
  }
  return labels[label] || label.slice(0, 2)
}

function zHeatColor(zScore: number) {
  const alpha = Math.max(0.18, Math.min(0.88, 0.18 + Math.abs(zScore) * 0.24))
  if (zScore > 0.15) return `rgba(249, 115, 22, ${alpha})`
  if (zScore < -0.15) return `rgba(96, 165, 250, ${alpha})`
  return 'rgba(148, 163, 184, 0.22)'
}

function physicsAccentFor(key: string) {
  const accents: Record<string, string> = {
    Spirit: '#facc15',
    Essence: '#60a5fa',
    Matter: '#fb923c',
    Substance: '#4ade80',
    ANumber: '#c084fc',
    heat: '#f97316',
    entropy: '#22d3ee',
    reactivity: '#fb7185',
    energy: '#a3e635',
  }
  return accents[key] || '#e5e7eb'
}

function renderWeb3View() {
  return `
    <section class="view web3-view">
      <header class="view-header web3-header">
        <div>
          <div class="eyebrow">Agent Economy</div>
          <h1>Web3 control surface</h1>
          <p>
            Wallet identity, Pentacle staking, ERC-8004 reputation, ENS agent records, A2A/x402
            payments, Walrus memory, and World ID for the agent economy.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-accounts">Sync Accounts</button>
          <button class="primary-button" data-action="link-account-web">Connect Wallet</button>
        </div>
      </header>

      <div class="web3-kpi-grid">
        ${renderWeb3Kpi('Wallet', web3IdentityTitle(), web3IdentityDetail(), 'account_balance_wallet')}
        ${renderWeb3Kpi('Network', canCallNetwork() ? 'Online' : 'Offline', canCallNetwork() ? 'Desktop can open cloud Web3 routes.' : 'Airplane mode blocks cloud sync.', 'public')}
        ${renderWeb3Kpi('Registry', 'ERC-8004', 'Payable agent discovery and reputation.', 'hub')}
        ${renderWeb3Kpi('Settlement', 'x402 / Arc', 'A2A requests settle through the backend gate.', 'toll')}
      </div>

      <section class="web3-hero-panel">
        <div>
          <div class="eyebrow">Circle Arc Star Vaults</div>
          <h2>Pentacle staking is one click away from the native app.</h2>
          <p>
            Live star zones, Circle Arc USDC staking, portfolio review, and wallet setup share the
            linked desktop identity.
          </p>
        </div>
        <div class="web3-hero-actions">
          ${renderWeb3Action('Open Pentacles', web3RouteUrl('/pentacles'), 'primary')}
          ${renderWeb3Action('Portfolio', web3RouteUrl('/pentacles/portfolio'), 'secondary')}
          ${renderWeb3Action('Wallet Setup', web3RouteUrl('/pentacles/connect'), 'secondary')}
        </div>
      </section>

      <div class="web3-feature-grid">
        ${renderWeb3Feature({
          icon: 'account_tree',
          title: 'ENS and NameStone',
          status: 'Agent records',
          detail:
            'Gasless alchmagents.eth subnames carry A2A, MCP, web, memory, wallet, registration, and human-verification records.',
          tags: ['ENSIP-25/26', 'NameStone', 'agent-endpoint'],
          actions: [
            { label: 'Agents Home', url: web3RouteUrl('/') },
            { label: 'Agent Catalog', url: web3RouteUrl('/planetary-agents') },
          ],
        })}
        ${renderWeb3Feature({
          icon: 'hub',
          title: 'A2A plus x402',
          status: 'Payable agents',
          detail:
            'Agent Cards, message/send, streaming calls, and x402-gated settlement through the FastAPI backend.',
          tags: ['A2A', 'x402', 'SSE'],
          actions: [
            {
              label: 'Plato Card',
              url: `${agentsBackendBase()}/a2a/plato/.well-known/agent-card.json`,
            },
            { label: 'Backend Health', url: `${agentsBackendBase()}/api/providers/health` },
          ],
        })}
        ${renderWeb3Feature({
          icon: 'verified',
          title: 'ERC-8004 registry',
          status: 'Reputation',
          detail:
            'BigQuery-backed reputation signals for trustworthy, x402-payable agent discovery.',
          tags: ['BigQuery', 'reputation', 'Arc'],
          actions: [{ label: 'Leaderboard', url: web3RouteUrl('/erc8004') }],
        })}
        ${renderWeb3Feature({
          icon: 'memory',
          title: 'Walrus memory',
          status: 'Persona snapshots',
          detail:
            'Encrypted MemWal snapshots are part of the agent record, with blob IDs written back into ENS memory metadata.',
          tags: ['Walrus', 'MemWal', 'agent-memory'],
          actions: [{ label: 'Agents Home', url: web3RouteUrl('/') }],
        })}
        ${renderWeb3Feature({
          icon: 'shield',
          title: 'World ID',
          status: 'Human verified',
          detail:
            'World ID proof-of-personhood gates human verification badges that can be surfaced through ENS and A2A metadata.',
          tags: ['World ID', 'AgentKit', 'human-verified'],
          actions: [{ label: 'Profile', url: web3RouteUrl('/profile?desktopLink=true') }],
        })}
        ${renderWeb3Feature({
          icon: 'swap_horiz',
          title: 'Onramp and privacy',
          status: 'Payment tools',
          detail:
            '1inch onramp and Unlink payer flows stay web-hosted, while the desktop keeps the operator account and agent roster in sync.',
          tags: ['1inch', 'Unlink', 'wallet'],
          actions: [
            { label: 'Profile', url: web3RouteUrl('/profile') },
            { label: 'Yield Hub', url: web3RouteUrl('/yield') },
          ],
        })}
      </div>
    </section>
  `
}

function renderWeb3Kpi(label: string, value: string, detail: string, icon: string) {
  return `
    <article class="web3-kpi">
      <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(icon)}</span>
      <div>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </div>
    </article>
  `
}

function renderWeb3Feature(feature: {
  icon: string
  title: string
  status: string
  detail: string
  tags: string[]
  actions: Array<{ label: string; url: string }>
}) {
  return `
    <article class="web3-feature-card">
      <div class="web3-feature-head">
        <span class="material-symbols-outlined web3-feature-icon" aria-hidden="true">${escapeHtml(feature.icon)}</span>
        <div>
          <h3>${escapeHtml(feature.title)}</h3>
          <small>${escapeHtml(feature.status)}</small>
        </div>
      </div>
      <p>${escapeHtml(feature.detail)}</p>
      <div class="tag-row">
        ${feature.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="button-row push-end">
        ${feature.actions
          .map(action => renderWeb3Action(action.label, action.url, 'secondary'))
          .join('')}
      </div>
    </article>
  `
}

function renderWeb3Action(label: string, url: string, variant: 'primary' | 'secondary') {
  const className = variant === 'primary' ? 'primary-button' : 'secondary-button'
  return `
    <button class="${className}" data-action="open-web3-url" data-url="${escapeHtml(url)}">
      ${escapeHtml(label)}
    </button>
  `
}

function web3IdentityTitle() {
  const linked =
    state.account.plan === 'Linked Companion' ||
    state.siteAccounts.agents.status === 'linked' ||
    state.siteAccounts.kitchen.status === 'linked'
  return linked ? 'Linked' : 'Local'
}

function web3IdentityDetail() {
  if (web3IdentityTitle() === 'Linked') {
    return state.account.email || state.account.displayName || 'Account sync is active.'
  }
  return 'Connect on the web route to sync wallet, profile, ESMS, and staking state.'
}

function web3SidebarTitle() {
  return `${web3IdentityTitle()} wallet layer`
}

function web3SidebarDetail() {
  return canCallNetwork()
    ? 'Pentacles, ERC-8004, ENS, x402, Walrus, World ID.'
    : 'Cloud Web3 routes are paused by airplane mode.'
}

function renderAgentsView() {
  const query = (state.agentSearchQuery || '').toLowerCase().trim()
  const filteredAgents = AGENT_LIBRARY.filter(agent => {
    if (!query) return true
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.title.toLowerCase().includes(query) ||
      agent.element.toLowerCase().includes(query) ||
      agent.domains.some(domain => domain.toLowerCase().includes(query))
    )
  })

  return `
    <section class="view">
      <header class="view-header">
        <div>
          <div class="eyebrow">Agents Web Catalog</div>
          <h1>Send agents to desktop</h1>
          <p>
            This companion uses the same Alchm Agents definitions as the web app, plus any
            private agents stored only on this device. Purchases and unlock decisions belong on
            the main web app; private agents never open a web route.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="open-site" data-site="agents">Open Agents</button>
        </div>
      </header>
      
      <div class="search-bar-container">
        <input 
          type="text" 
          class="agent-search-input" 
          data-agent-search 
          value="${escapeHtml(state.agentSearchQuery || '')}" 
          placeholder="Search agents by name, title, element, or domain..." 
        />
        ${
          state.agentSearchQuery
            ? `<button class="clear-search-button" data-action="clear-search" title="Clear search">&times;</button>`
            : ''
        }
      </div>

      <div class="agent-grid stagger-children">
        ${
          filteredAgents.length
            ? filteredAgents.map(renderAgentCard).join('')
            : `<div class="no-results">No agents match your search query "${escapeHtml(state.agentSearchQuery)}".</div>`
        }
      </div>
    </section>
  `
}

function renderAgentCard(template: AgentTemplate) {
  const installed = state.roster.some(agent => agent.id === template.id)
  const lvl = agentLevel(template.id)

  return `
    <article class="agent-card element-${template.element} ${template.tier === 'premium' ? 'tier-premium' : ''} ${template.localOnly ? 'tier-private' : ''}">
      <div class="agent-card-head">
        ${renderAgentAvatar(template, 'large-avatar')}
        <div>
          <h3>${escapeHtml(template.name)}</h3>
          <p class="muted">${escapeHtml(template.title)}</p>
        </div>
        ${lvl != null ? `<span class="level-badge" title="Cosmic level">Lv.${lvl}</span>` : ''}
      </div>
      <p class="agent-quote">${escapeHtml(template.quote)}</p>
      <div class="tag-row">
        <span class="tag">${template.localOnly ? 'Private desktop' : template.tier === 'premium' ? 'Premium web unlock' : 'Web catalog'}</span>
        <span class="tag">${escapeHtml(template.element)}</span>
        ${template.domains.map(domain => `<span class="tag">${escapeHtml(domain)}</span>`).join('')}
      </div>
      <div class="button-row push-end">
        ${
          installed
            ? `<button class="secondary-button" data-action="open-chat" data-agent-id="${template.id}">Open Chat</button>`
            : `<button class="primary-button" data-action="add-agent" data-agent-id="${template.id}">Add to Desktop</button>`
        }
        ${
          template.localOnly
            ? ''
            : `<button class="secondary-button" data-action="open-agent-web" data-agent-id="${template.id}">
                Web App
              </button>`
        }
      </div>
    </article>
  `
}

function renderStoneView() {
  return `
    <section class="view">
      <header class="view-header">
        <div>
          <div class="eyebrow">Philosopher's Stone</div>
          <h1>Create a local agent</h1>
          <p>
            Craft a desktop-only agent from birth information and additional context. The desktop
            companion uses the same Philosopher's Stone calculation route, then stores the created
            agent locally for chat on this device.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="open-stone-web">Open Web Route</button>
        </div>
      </header>

      <form class="panel stack" data-stone-form>
        <div class="form-grid">
          <label class="field">
            <span>Agent name</span>
            <input
              class="input"
              name="name"
              value="${escapeHtml(state.stoneDraft.name)}"
              placeholder="Aurelia"
              required
            />
          </label>
          <label class="field">
            <span>Birth date</span>
            <input
              class="input"
              name="date"
              type="date"
              value="${escapeHtml(state.stoneDraft.date)}"
              required
            />
          </label>
          <label class="field">
            <span>Birth time</span>
            <input
              class="input"
              name="time"
              type="time"
              value="${escapeHtml(state.stoneDraft.time)}"
              required
            />
          </label>
          <label class="field">
            <span>Birth location</span>
            <input
              class="input"
              name="location"
              value="${escapeHtml(state.stoneDraft.location)}"
              placeholder="City, Country"
              required
            />
          </label>
          <label class="field">
            <span>Latitude</span>
            <input
              class="input"
              name="latitude"
              value="${escapeHtml(state.stoneDraft.latitude)}"
              inputmode="decimal"
              placeholder="Optional"
            />
          </label>
          <label class="field">
            <span>Longitude</span>
            <input
              class="input"
              name="longitude"
              value="${escapeHtml(state.stoneDraft.longitude)}"
              inputmode="decimal"
              placeholder="Optional"
            />
          </label>
        </div>
        <label class="field">
          <span>Additional context</span>
          <textarea
            class="textarea"
            name="additionalContext"
            placeholder="Purpose, tone, memories, boundaries, skills, or what this local agent should help with."
          >${escapeHtml(state.stoneDraft.additionalContext)}</textarea>
        </label>
        <div class="stone-summary-grid">
          ${renderStoneStep('Birth Information', 'Date, time, and place establish the natal calculation input.')}
          ${renderStoneStep('Additional Context', 'Your written context shapes the agent voice and working purpose.')}
          ${renderStoneStep('Local Roster', 'The result is saved as a desktop chat agent on this device.')}
        </div>
        <div class="button-row">
          <button class="primary-button" type="submit">Create Local Agent</button>
          <button class="secondary-button" type="reset">Clear</button>
        </div>
      </form>
    </section>
  `
}

function formatDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function renderStoneStep(title: string, detail: string) {
  return `
    <article class="panel stone-step">
      <strong>${escapeHtml(title)}</strong>
      <p class="muted">${escapeHtml(detail)}</p>
    </article>
  `
}

function renderAccountView() {
  const isLinked = state.account.plan === 'Linked Companion'
  const statusBadge = isLinked
    ? `<span class="tag" style="background: rgba(34, 197, 94, 0.15); border-color: rgba(34, 197, 94, 0.3); color: #4ade80; gap: 6px;"><span class="pulse-green"></span>Linked with Google SSO</span>`
    : `<span class="tag" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; gap: 6px;"><span class="pulse-yellow"></span>Local Operator Mode</span>`

  return `
    <style>
      .pulse-green {
        width: 8px;
        height: 8px;
        background-color: #22c55e;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        animation: pulse-g 1.6s infinite;
      }
      @keyframes pulse-g {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      .pulse-yellow {
        width: 8px;
        height: 8px;
        background-color: #eab308;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7);
        animation: pulse-y 1.6s infinite;
      }
      @keyframes pulse-y {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(234, 179, 8, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(234, 179, 8, 0);
        }
      }

      .pulse-red {
        width: 8px;
        height: 8px;
        background-color: #ef4444;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        animation: pulse-r 1.6s infinite;
      }
      @keyframes pulse-r {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
      }
    </style>

    <section class="view">
      <header class="view-header">
        <div>
          <div class="eyebrow">Alchemical Integration</div>
          <h1>Account Hub</h1>
          <p>
            Seamlessly synchronize your identity and alchemical balances between your local Tauri companion and the online platforms.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-accounts">Sync Both Accounts</button>
          <button class="secondary-button" data-action="view" data-view="web3">Web3 Console</button>
        </div>
      </header>

      <!-- Premium Identity Panel -->
      <div class="panel stack" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(99, 102, 241, 0.05)); border: 1px solid rgba(167, 139, 250, 0.15); position: relative; overflow: hidden; border-radius: 12px; padding: 24px;">
        <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%); pointer-events: none;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; width: 100%;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: linear-gradient(135deg, #a855f7, #6366f1); display: grid; place-items: center; box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);">
              <span style="font-size: 24px; font-weight: 900; color: #fff;">✦</span>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="margin: 0; font-size: 20px; color: #f4f0ff;">${escapeHtml(state.account.displayName)}</h2>
                ${statusBadge}
              </div>
              <p class="muted" style="margin: 4px 0 0; font-size: 13px;">
                ${escapeHtml(state.account.email || 'No email associated with local session.')}
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 10px; margin-left: auto;">
            <button class="primary-button" type="button" data-action="link-account-web" style="background: linear-gradient(135deg, #a855f7, #6366f1); border: none; color: #fff; font-weight: bold; box-shadow: 0 0 15px rgba(168, 85, 247, 0.3);">🔗 Authenticate & Sync</button>
          </div>
        </div>
      </div>

      <!-- Live Domain Portals -->
      <div class="account-grid">
        ${renderSiteAccountCard(state.siteAccounts.agents)}
        ${renderSiteAccountCard(state.siteAccounts.kitchen)}
      </div>

      <!-- Advanced Technical Credentials -->
      <details class="panel" style="border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(5, 5, 10, 0.4); border-radius: 8px;">
        <summary style="cursor: pointer; color: #a1a1aa; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 0; outline: none; user-select: none;">
          ⚙️ Advanced Integration Parameters
        </summary>
        <form class="stack" style="margin-top: 18px;" data-account-form>
          <div class="form-grid">
            <label class="field">
              <span>Display name</span>
              <input class="input" id="account-display-name" value="${escapeHtml(state.account.displayName)}" />
            </label>
            <label class="field">
              <span>Email</span>
              <input class="input" id="account-email" value="${escapeHtml(state.account.email)}" />
            </label>
            <label class="field">
              <span>User ID</span>
              <input class="input" id="account-user-id" value="${escapeHtml(state.account.userId)}" />
            </label>
            <label class="field">
              <span>Desktop API key</span>
              <input
                class="input"
                id="account-api-key"
                type="password"
                autocomplete="off"
                spellcheck="false"
                value="${escapeHtml(state.account.apiKey)}"
              />
            </label>
            <label class="field">
              <span>Agents web URL</span>
              <input class="input" id="account-agents-url" value="${escapeHtml(state.account.agentsUrl)}" />
            </label>
            <label class="field">
              <span>Kitchen web URL</span>
              <input class="input" id="account-kitchen-url" value="${escapeHtml(state.account.kitchenUrl)}" />
            </label>
          </div>
          <div class="button-row" style="margin-top: 10px;">
            <button class="primary-button" type="submit">Save Settings</button>
            <button class="secondary-button" type="button" data-action="reset-api-key">Use Dev Key</button>
          </div>
        </form>
      </details>
    </section>
  `
}

function renderSiteAccountCard(account: SiteAccount) {
  const claimText =
    account.status === 'checking'
      ? 'Syncing...'
      : account.status === 'offline' || account.status === 'needs-link'
        ? '🔗 Link account to claim yield'
        : account.canClaimDaily
          ? '✨ Claim Daily Cosmic Yield'
          : '✓ Cosmic Yield Claimed'
  const disabled =
    !account.canClaimDaily || account.status === 'offline' || account.status === 'needs-link'

  const isAgents = account.site === 'agents'
  const cardGradient = isAgents
    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(10, 7, 18, 0.72) 100%)'
    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(10, 7, 18, 0.72) 100%)'
  const cardBorder = isAgents ? 'rgba(99, 102, 241, 0.22)' : 'rgba(245, 158, 11, 0.22)'

  const statusBadge =
    account.status === 'linked'
      ? `<span class="tag" style="background: rgba(34, 197, 94, 0.12); border-color: rgba(34, 197, 94, 0.25); color: #86efac; font-size: 9px; gap: 4px;"><span class="pulse-green"></span>Active Sync</span>`
      : account.status === 'checking'
        ? `<span class="tag" style="background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.25); color: #fde047; font-size: 9px; gap: 4px;"><span class="pulse-yellow"></span>Syncing</span>`
        : `<span class="tag" style="background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.25); color: #fca5a5; font-size: 9px; gap: 4px;"><span class="pulse-red"></span>Unlinked</span>`

  const claimButtonColor = isAgents
    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
    : 'linear-gradient(135deg, #f59e0b, #d97706)'

  return `
    <article class="panel account-card" style="background: ${cardGradient}; border: 1px solid ${cardBorder}; border-radius: 12px; padding: 22px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; transition: all 0.25s ease;">
      <div>
        <div class="account-card-head" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; width: 100%;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #fff;">${escapeHtml(account.label)}</h3>
              ${statusBadge}
            </div>
            <p class="muted" style="margin: 2px 0 0; font-size: 12px; font-family: ui-monospace, SFMono-Regular, monospace; word-break: break-all;">
              ${escapeHtml(account.message || account.homeUrl)}
            </p>
          </div>
          <button class="secondary-button" data-action="open-site" data-site="${account.site}" style="padding: 0 10px; min-height: 28px; font-size: 11px;">Open</button>
        </div>
        
        <div class="coin-grid" style="margin: 18px 0; gap: 8px;">
          ${renderCoin('Spirit', account.balances.spirit)}
          ${renderCoin('Essence', account.balances.essence)}
          ${renderCoin('Matter', account.balances.matter)}
          ${renderCoin('Substance', account.balances.substance)}
        </div>
      </div>
      
      <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; width: 100%;">
        <button
          class="primary-button"
          data-action="claim-yield"
          data-site="${account.site}"
          ${disabled ? 'disabled' : ''}
          style="${disabled ? 'opacity: 0.55; cursor: not-allowed; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);' : `background: ${claimButtonColor}; border: none; font-weight: bold; box-shadow: 0 0 12px rgba(99,102,241,0.2);`} min-height: 34px; padding: 0 16px; font-size: 11px; flex: 1;"
        >
          ${claimText}
        </button>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span class="tag" style="background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.2); color: #c084fc; font-weight: bold;">🔥 Streak ${account.streak}</span>
          ${
            account.lastDailyClaimAt
              ? `<span class="tag" style="font-size: 10px; color: #a1a1aa;">Last: ${formatTime(account.lastDailyClaimAt)}</span>`
              : '<span class="tag" style="font-size: 10px; color: #71717a;">No Claim</span>'
          }
        </div>
      </div>
    </article>
  `
}

function renderDiagnosticsView() {
  const telemetry = state.runtime.telemetry

  return `
    <section class="view">
      <header class="view-header">
        <div>
          <div class="eyebrow">Diagnostics</div>
          <h1>Local runtime</h1>
          <p>
            Verify the desktop wrapper, sidecar handshake, model process, and tray controls without
            loading browser app surfaces.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-telemetry">Refresh System</button>
          <button class="primary-button" data-action="refresh-mcp-nodes">Restart MCP Nodes</button>
        </div>
      </header>
      <div class="diag-grid">
        ${renderMetric('Frontend source', 'desktop-shell/dist')}
        ${renderMetric('Main Sidecar API', state.runtime.sidecar)}
        ${renderMetric('Web3 network', canCallNetwork() ? 'enabled' : 'airplane')}
        ${renderMetric('A2A/x402 backend', agentsBackendBase().replace(/^https?:\/\//, ''))}
        ${renderMetric(
          'Alchm MCP Stdio',
          state.runtime.ipcNonce ? state.runtime.alchmMcpStatus : 'browser preview'
        )}
        ${renderMetric(
          'PA MCP Stdio',
          state.runtime.ipcNonce ? state.runtime.paMcpStatus : 'browser preview'
        )}
        ${renderMetric('IPC nonce', state.runtime.ipcNonce ? 'received' : 'not available')}
        ${renderMetric('Active model', telemetry?.activeModel || 'none')}
        ${renderMetric('CPU', telemetry?.cpu?.percent === undefined ? 'unknown' : `${telemetry.cpu.percent}%`)}
        ${renderMetric(
          'Memory',
          telemetry?.memory?.usedPercent === undefined
            ? 'unknown'
            : `${telemetry.memory.usedPercent}% of ${formatBytes(telemetry.memory.totalBytes || 0)}`
        )}
      </div>
      <div class="panel stack" style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--border-color); border-radius: 6px; font-family: monospace; font-size: 0.85rem; line-height: 1.4;">
        <div class="eyebrow" style="margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.75rem; color: var(--text-muted);">MCP Debugging Info</div>
        <div><strong>Alchm MCP Last Error:</strong> <span style="color: var(--text-color);">${escapeHtml(alchmMcpClient.getSnapshot().lastError || 'None')}</span></div>
        <div style="margin-top: 0.25rem;"><strong>PA MCP Last Error:</strong> <span style="color: var(--text-color);">${escapeHtml(paMcpClient.getSnapshot().lastError || 'None')}</span></div>
        <div style="margin-top: 0.5rem;"><strong>PA MCP Stderr (last 5 lines):</strong></div>
        <pre style="margin: 0.25rem 0 0 0; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px; overflow-x: auto; font-size: 0.8rem; color: #ff8888;">${escapeHtml(paMcpClient.getSnapshot().stderrLog.slice(-5).join('\n') || '(empty)')}</pre>
      </div>
      <div class="form-grid">
        <div class="panel stack">
          <div class="eyebrow">Tray state</div>
          <div class="button-row">
            <button class="secondary-button" data-action="tray-state" data-tray-state="idle">Idle</button>
            <button class="secondary-button" data-action="tray-state" data-tray-state="fire">Fire</button>
            <button class="secondary-button" data-action="tray-state" data-tray-state="water">Water</button>
            <button class="secondary-button" data-action="tray-state" data-tray-state="earth">Earth</button>
          </div>
        </div>
        <div class="panel stack">
          <div class="eyebrow">Local MCP Operations</div>
          <div class="button-row">
            <button class="secondary-button" data-action="test-alchm-mcp">Test Alchm Transit</button>
            <button class="secondary-button" data-action="test-pa-mcp">Test PA Socrates Chat</button>
          </div>
        </div>
      </div>
      ${
        state.runtime.lastError
          ? `<div class="panel error-panel">${escapeHtml(state.runtime.lastError)}</div>`
          : ''
      }
    </section>
  `
}

function renderMetric(label: string, value: string) {
  return `
    <article class="panel metric">
      <span class="eyebrow">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `
}

function renderComposerSurface() {
  const agents = getChatAgents()
  const hasAgents = agents.length > 0

  return `
    <main class="surface surface-composer">
      <form class="composer" data-chat-form>
        <textarea
          class="textarea"
          name="message"
          data-composer-input
          placeholder="${escapeHtml(chatComposerPlaceholder(agents))}"
          ${!hasAgents || state.runtime.generating ? 'disabled' : ''}
        >${escapeHtml(state.composerDraft)}</textarea>
        <button class="primary-button" type="submit" ${!hasAgents || state.runtime.generating ? 'disabled' : ''}>
          Send
        </button>
      </form>
    </main>
  `
}

function getActiveAgent() {
  return state.roster.find(agent => agent.id === state.activeAgentId) ?? state.roster[0] ?? null
}

function getChatAgentIds() {
  const agentIds = normalizeSelectedChatAgentIds(
    state.selectedChatAgentIds,
    state.roster,
    state.activeAgentId
  )
  state.selectedChatAgentIds = agentIds
  return agentIds
}

function getChatAgents() {
  const selectedIds = new Set(getChatAgentIds())
  return state.roster.filter(agent => selectedIds.has(agent.id))
}

function getActiveChatKey() {
  const agentIds = getChatAgentIds()
  if (agentIds.length <= 1) return agentIds[0] || MONICA_GUIDE_ID

  return `${GROUP_CHAT_PREFIX}${[...agentIds]
    .sort()
    .map(agentId => encodeURIComponent(agentId))
    .join(',')}`
}

function getMessages(chatKey: string) {
  if (!state.chats[chatKey]) state.chats[chatKey] = []
  return state.chats[chatKey]
}

function setSingleChatAgent(agentId: string) {
  state.activeAgentId = agentId
  state.selectedChatAgentIds = [agentId]
  state.activeView = 'chat'
}

function toggleChatAgentSelection(agentId: string, shouldSelect: boolean) {
  if (!state.roster.some(agent => agent.id === agentId)) return

  const currentIds = getChatAgentIds()
  const nextIds = shouldSelect
    ? [...new Set([...currentIds, agentId])]
    : currentIds.filter(selectedId => selectedId !== agentId)

  if (!nextIds.length) {
    setNotice('At least one chat agent must stay selected.')
    render()
    return
  }

  state.selectedChatAgentIds = nextIds
  state.activeAgentId = shouldSelect ? agentId : nextIds[0]
  state.activeView = 'chat'
  saveState()
  render()
}

function addAgent(
  agentId: string,
  source: LocalAgent['source'] = 'web-catalog',
  tierOverride?: AgentTier
) {
  const template = AGENT_LIBRARY.find(agent => agent.id === agentId)
  if (!template) return
  const resolvedSource: LocalAgent['source'] = template.localOnly ? 'private-local' : source
  if (state.roster.some(agent => agent.id === template.id)) {
    setSingleChatAgent(template.id)
    saveState()
    render()
    return
  }

  const syncedAgent = { ...template, tier: tierOverride || template.tier }
  addLedger(
    resolvedSource === 'private-local'
      ? 'Private Agent Added'
      : resolvedSource === 'web-unlock' || resolvedSource === 'deep-link'
        ? 'Agent Sent From Web'
        : 'Agent Added',
    `${syncedAgent.name} was added to desktop companion chat${
      resolvedSource === 'private-local' ? ' as a private local agent' : ''
    }.`,
    'No charge'
  )

  state.roster.push({ ...syncedAgent, addedAt: new Date().toISOString(), source: resolvedSource })
  setSingleChatAgent(syncedAgent.id)
  setNotice(`${syncedAgent.name} added to Alchm Desktop.`)
  saveState()
  render()
}

async function createStoneAgentFromForm(form: HTMLFormElement) {
  const input = readStoneForm(form)
  if (!input) return

  setNotice("Calculating Philosopher's Stone blueprint...")

  try {
    const blueprint = await calculateStoneBlueprint(input)
    const localAgent = buildStoneAgent(input, blueprint)

    state.roster = state.roster.filter(agent => agent.id !== localAgent.id)
    state.roster.push(localAgent)
    setSingleChatAgent(localAgent.id)
    addLedger(
      "Philosopher's Stone Agent",
      `${localAgent.name} was created locally from birth information and context.`,
      'No charge'
    )
    setNotice(`${localAgent.name} created with the Philosopher's Stone.`)
    state.stoneDraft = createDefaultStoneDraft()
    form.reset()
    saveState()
    render()
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "Philosopher's Stone creation failed.")
  }
}

function readStoneForm(form: HTMLFormElement): StoneFormInput | null {
  const formData = new FormData(form)
  const name = String(formData.get('name') || '').trim()
  const date = String(formData.get('date') || '').trim()
  const time = String(formData.get('time') || '').trim()
  const location = String(formData.get('location') || '').trim()
  const additionalContext = String(formData.get('additionalContext') || '').trim()

  if (!name || !date || !time || !location) {
    setNotice('Name, birth date, birth time, and birth location are required.')
    return null
  }

  const resolved = resolveLocationCoordinates(location)
  const latitudeInput = Number(String(formData.get('latitude') || '').trim())
  const longitudeInput = Number(String(formData.get('longitude') || '').trim())
  const latitude = Number.isFinite(latitudeInput) ? latitudeInput : resolved.latitude
  const longitude = Number.isFinite(longitudeInput) ? longitudeInput : resolved.longitude

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    setNotice('Latitude must be -90 to 90 and longitude must be -180 to 180.')
    return null
  }

  return {
    name,
    date,
    time,
    location: resolved.label || location,
    latitude,
    longitude,
    additionalContext,
  }
}

async function calculateStoneBlueprint(input: StoneFormInput): Promise<StoneBlueprint> {
  const birthDate = new Date(`${input.date}T${input.time}:00`)
  if (Number.isNaN(birthDate.getTime())) throw new Error('Birth date or time is invalid.')

  if (invokeCommand) {
    try {
      const response = await requestSidecar('/api/philosophers-stone/calculate', {
        method: 'POST',
        body: {
          birthDate: birthDate.toISOString(),
          latitude: input.latitude,
          longitude: input.longitude,
          agentName: input.name,
          additionalContext: input.additionalContext,
        },
      })

      if (response.ok) {
        const payload = await response.json()
        return normalizeStoneBlueprint(input, payload.data || payload)
      }
    } catch (error) {
      console.warn("Desktop Philosopher's Stone route unavailable, using local calculation:", error)
    }
  }

  return normalizeStoneBlueprint(input, calculateLocalStoneBlueprint(input))
}

function normalizeStoneBlueprint(input: StoneFormInput, result: any): StoneBlueprint {
  const element = normalizeElement(result?.dominantElement)
  const elements = result?.elements || {}
  const constitution: Balances = result?.constitution
    ? normalizeBalances(result.constitution)
    : {
        spirit: Math.round(Number(elements.Air || elements.air || 0) * 100),
        essence: Math.round(Number(elements.Earth || elements.earth || 0) * 100),
        matter: Math.round(Number(elements.Water || elements.water || 0) * 100),
        substance: Math.round(Number(elements.Fire || elements.fire || 0) * 100),
      }

  return {
    birthDate: input.date,
    birthTime: input.time,
    birthLocation: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    additionalContext: input.additionalContext,
    dominantElement: element,
    constitution,
    monicaConstant: Number(
      result?.monicaConstant || result?.mc || calculateMcFromBalances(constitution)
    ),
    consciousnessLevel: String(
      result?.consciousnessLevel || classifyLocalConsciousness(constitution)
    ),
    sigil: result?.sigil,
    natalChart: result?.natalChart,
  }
}

function normalizeBalances(value: Partial<Balances>): Balances {
  return {
    spirit: Math.round(Number(value.spirit || 0)),
    essence: Math.round(Number(value.essence || 0)),
    matter: Math.round(Number(value.matter || 0)),
    substance: Math.round(Number(value.substance || 0)),
  }
}

function buildStoneAgent(input: StoneFormInput, blueprint: StoneBlueprint): LocalAgent {
  const element = blueprint.dominantElement
  const domains = deriveContextDomains(input.additionalContext)

  return {
    id: `stone-${slugify(input.name)}-${Date.now()}`,
    name: input.name,
    title: `${capitalize(element)} Philosopher's Stone Agent`,
    element,
    tier: 'base',
    modelName: modelNameForElement(element),
    initials: initialsForName(input.name),
    domains: ["Philosopher's Stone", 'Birth Chart', ...domains],
    quote: `Created from ${input.location} birth data with ${capitalize(element)} dominance and ${blueprint.consciousnessLevel} consciousness.`,
    promptSeed: buildStonePromptSeed(input, blueprint),
    stoneBlueprint: blueprint,
    addedAt: new Date().toISOString(),
    source: 'philosophers-stone',
  }
}

function buildStonePromptSeed(input: StoneFormInput, blueprint: StoneBlueprint) {
  const planetList = blueprint.natalChart?.planets
    ? blueprint.natalChart.planets
        .map(p => `${p.planet} in ${p.sign} (${p.degree.toFixed(1)}°)`)
        .join(', ')
    : ''

  const sigilInfo = blueprint.sigil
    ? [
        `\n## Natal Sigil Core Details:`,
        `Rune Name: ${blueprint.sigil.name}`,
        `Sacred Symbol: ${blueprint.sigil.symbol}`,
        `Cosmic Rarity: ${blueprint.sigil.rarity}`,
        `Personalized Alchemical Meaning: ${blueprint.sigil.personalizedMeaning}`,
        `Activation Ritual: ${blueprint.sigil.activationRitual}`,
      ].join('\n')
    : ''

  return [
    `${input.name} is a local Philosopher's Stone agent created in Alchm Desktop.`,
    `Birth anchor: ${blueprint.birthDate} ${blueprint.birthTime}, ${blueprint.birthLocation}.`,
    `Coordinates: ${blueprint.latitude}, ${blueprint.longitude}.`,
    `Dominant element: ${capitalize(blueprint.dominantElement)}.`,
    `Alchemical constitution: Spirit ${blueprint.constitution.spirit}, Essence ${blueprint.constitution.essence}, Matter ${blueprint.constitution.matter}, Substance ${blueprint.constitution.substance}.`,
    `Consciousness level: ${blueprint.consciousnessLevel}; MC ${blueprint.monicaConstant.toFixed(2)}.`,
    planetList ? `Planetary Placements: ${planetList}.` : '',
    input.additionalContext ? `Additional context from creator: ${input.additionalContext}` : '',
    sigilInfo,
    'Use the birth information, planetary placements, Runic Sigil, and creator context as your local identity. Be useful, specific, and grounded in the user-provided context.',
  ]
    .filter(Boolean)
    .join('\n')
}

function deriveContextDomains(context: string) {
  const words = context
    .split(/[^a-zA-Z]+/)
    .map(word => word.trim().toLowerCase())
    .filter(word => word.length > 4)
  const unique = [...new Set(words)]
  return unique.slice(0, 3).map(capitalize)
}

function resolveLocationCoordinates(value: string) {
  const coordinateMatch = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1])
    const longitude = Number(coordinateMatch[2])
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude, label: value }
    }
  }

  const knownLocations: Record<string, { latitude: number; longitude: number; label: string }> = {
    'new york': { latitude: 40.7128, longitude: -74.006, label: 'New York, USA' },
    brooklyn: { latitude: 40.6782, longitude: -73.9442, label: 'Brooklyn, USA' },
    london: { latitude: 51.5074, longitude: -0.1278, label: 'London, UK' },
    paris: { latitude: 48.8566, longitude: 2.3522, label: 'Paris, France' },
    'los angeles': { latitude: 34.0522, longitude: -118.2437, label: 'Los Angeles, USA' },
    'san francisco': { latitude: 37.7749, longitude: -122.4194, label: 'San Francisco, USA' },
    chicago: { latitude: 41.8781, longitude: -87.6298, label: 'Chicago, USA' },
    tokyo: { latitude: 35.6762, longitude: 139.6503, label: 'Tokyo, Japan' },
  }

  const normalized = value.toLowerCase()
  const knownKey = Object.keys(knownLocations).find(key => normalized.includes(key))
  if (knownKey) return knownLocations[knownKey]

  let hash = 0
  for (const char of normalized) hash = (hash * 31 + char.charCodeAt(0)) >>> 0

  return {
    latitude: Number(((hash % 14000) / 100 - 70).toFixed(4)),
    longitude: Number((((hash / 14000) % 36000) / 100 - 180).toFixed(4)),
    label: value || 'Resolved symbolic location',
  }
}

function sunElementForDate(month: number, day: number): 'Fire' | 'Water' | 'Air' | 'Earth' {
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

function calculateMcFromBalances(constitution: Balances) {
  const values = Object.values(constitution)
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + Math.abs(value - average), 0) / Math.max(1, values.length)
  return Number(((average + variance) / 12).toFixed(2))
}

function classifyLocalConsciousness(constitution: Balances) {
  const mc = calculateMcFromBalances(constitution)
  if (mc >= 8) return 'Master'
  if (mc >= 6) return 'Advanced'
  if (mc >= 4) return 'Developing'
  return 'Emerging'
}

function calculateLocalStoneBlueprint(input: StoneFormInput) {
  const date = new Date(`${input.date}T${input.time}:00`)
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)

  // Calculate planetary positions using high-precision calculations
  const birthInfo = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: 0,
    latitude,
    longitude,
  }

  const chart = calculateAllPlanets(birthInfo)

  const planetPositions: PlanetPosition[] = [
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
  ].map(name => {
    const p = chart.planets[name]
    return {
      planet: name,
      sign: p.sign,
      degree: p.signDegree,
      house: 1,
      date,
    }
  })

  // Calculate aspects and patterns
  const { aspects, patterns } = detectPatternsStatic(planetPositions)

  // Extract geometry for sigil generation
  const geometry = ChartGeometryExtractor.extractFromChartData(planetPositions, aspects, 800, 800)

  // Assign patterns to geometry
  geometry.sacredPatterns = patterns

  const dominantElement = geometry.dominantElement

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
  const consciousnessLevel =
    monicaConstant >= 8
      ? 'Master'
      : monicaConstant >= 6
        ? 'Advanced'
        : monicaConstant >= 4
          ? 'Developing'
          : 'Emerging'

  // Generate NatalSigilRune
  const sigil = createNatalSigilRune(geometry, 'alchemical', 'aspect-based')
  const svg = createSigilSvg(sigil)
  sigil.svgGeometry = svg
  sigil.generatedImageUrl = sigilSvgToDataUrl(svg)

  return {
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
  }
}

function removeAgent(agentId: string) {
  const agent = state.roster.find(item => item.id === agentId)
  if (agent?.source === 'app-guide') {
    state.activeAgentId = MONICA_GUIDE_ID
    setNotice('Monica stays in Alchm Desktop as the app guide.')
    return
  }

  state.roster = state.roster.filter(item => item.id !== agentId)
  for (const chatKey of Object.keys(state.chats)) {
    if (chatKey === agentId || parseGroupChatKey(chatKey).includes(agentId)) {
      delete state.chats[chatKey]
    }
  }

  state.selectedChatAgentIds = state.selectedChatAgentIds.filter(
    selectedId => selectedId !== agentId
  )
  if (state.activeAgentId === agentId) state.activeAgentId = state.selectedChatAgentIds[0] ?? null
  state.selectedChatAgentIds = normalizeSelectedChatAgentIds(
    state.selectedChatAgentIds,
    state.roster,
    state.activeAgentId
  )
  state.activeAgentId = state.selectedChatAgentIds[0] ?? state.roster[0]?.id ?? null
  if (agent) addLedger('Agent Removed', `${agent.name} was removed from this device.`, 'No charge')
  saveState()
  render()
}

async function buildPrivateAgentAlchmContext(
  agent: LocalAgent,
  userMessage: string
): Promise<PrivateAgentAlchmContext | null> {
  if (!agent.localOnly || !invokeCommand) return null

  if (alchmMcpClient.getSnapshot().status !== 'online') {
    try {
      await withTimeout(
        alchmMcpClient.start(),
        10_000,
        'Alchm MCP did not become ready for private agent chat.'
      )
    } catch (error) {
      console.warn(`[Private Alchm MCP] Unable to start for ${agent.name}:`, error)
    }
  }

  if (alchmMcpClient.getSnapshot().status !== 'online') return null

  const context: PrivateAgentAlchmContext = {
    tools: [],
    errors: [],
    ingredients: extractCulinaryIngredients(userMessage),
  }

  const callTool = async <T>(name: string, args: Record<string, unknown> = {}) => {
    const result = await withTimeout(
      alchmMcpClient.call('tools/call', {
        name,
        arguments: {
          ...args,
          _meta: {
            apiKey: state.account.apiKey || 'dev-desktop-token',
            caller: 'alchm-desktop-private-agent',
            agentId: agent.id,
          },
        },
      }),
      PRIVATE_AGENT_MCP_TIMEOUT_MS,
      `${name} timed out.`
    )
    const parsed = parseMcpToolJson<T>(result)
    if (!parsed) throw new Error(`${name} returned an empty MCP payload.`)
    context.tools.push(name)
    return parsed
  }

  try {
    context.liveSky = await callTool('get_live_sky_transits', {
      latitude: 40.7128,
      longitude: -74.006,
    })
  } catch (error) {
    context.errors.push(`get_live_sky_transits: ${errorMessage(error)}`)
  }

  if (context.ingredients.length) {
    try {
      context.ingredientScan = await callTool('alchemize_ingredients', {
        ingredients: context.ingredients,
      })
    } catch (error) {
      context.errors.push(`alchemize_ingredients: ${errorMessage(error)}`)
    }
  }

  if (shouldFetchPrivateRecipeCandidates(userMessage, context.ingredients)) {
    try {
      const dominantElement = findFirstStringByKeys(context.liveSky, [
        'dominantElement',
        'dominant_element',
        'element',
      ])
      const recipeArgs: Record<string, unknown> = {
        prompt: userMessage.slice(0, 280),
      }
      if (dominantElement) recipeArgs.dominantElement = dominantElement

      context.recipeCandidates = await callTool('generate_cosmic_recipe', {
        ...recipeArgs,
      })
    } catch (error) {
      context.errors.push(`generate_cosmic_recipe: ${errorMessage(error)}`)
    }
  }

  return context.tools.length ? context : null
}

function extractCulinaryIngredients(userMessage: string) {
  const knownIngredients = [
    'almond',
    'anchovy',
    'apple',
    'basil',
    'beet',
    'butter',
    'carrot',
    'cheese',
    'chocolate',
    'clam',
    'cocoa',
    'coffee',
    'cream',
    'egg',
    'fig',
    'garlic',
    'ginger',
    'honey',
    'honeydew',
    'lemon',
    'lime',
    'melon',
    'miso',
    'mushroom',
    'olive',
    'onion',
    'orange',
    'oyster',
    'pineapple',
    'pepper',
    'potato',
    'rice',
    'saffron',
    'salt',
    'seaweed',
    'shrimp',
    'tomato',
    'truffle',
    'vanilla',
    'vinegar',
    'yogurt',
  ]
  const lower = userMessage.toLowerCase()
  const found = knownIngredients
    .filter(ingredient => new RegExp(`\\b${escapeRegExp(ingredient)}s?\\b`, 'i').test(lower))
    .sort((a, b) => lower.indexOf(a) - lower.indexOf(b))
  const ingredientPhrase = userMessage.match(
    /\b(?:with|using|from|ingredients?|cook|cooking)\b[:\s]+([^.?]+)/i
  )?.[1]
  const phraseIngredients = ingredientPhrase
    ? ingredientPhrase
        .split(/,|\band\b|\bplus\b|\bwith\b/i)
        .map(part =>
          part
            .replace(/[^a-zA-Z\s-]/g, '')
            .replace(/\b(?:cuttings?|peels?|pieces?|scraps?|trimmings?)\b/gi, '')
            .trim()
            .toLowerCase()
        )
        .filter(part => part.length > 2 && part.length < 32)
        .filter(part => !hasAny(part, ['idea', 'recipe', 'dish', 'private', 'desktop', 'culinary']))
    : []

  return [...new Set([...found, ...phraseIngredients])].slice(0, 8)
}

function shouldFetchPrivateRecipeCandidates(userMessage: string, ingredients: string[]) {
  const lower = userMessage.toLowerCase()
  return (
    ingredients.length > 0 ||
    hasAny(lower, [
      'recipe',
      'cook',
      'cooking',
      'culinary',
      'dish',
      'dinner',
      'eat',
      'food',
      'ingredient',
      'kitchen',
      'meal',
      'menu',
      'plate',
      'spherification',
      'tapa',
    ])
  )
}

function formatPrivateAgentAlchmContext(context: PrivateAgentAlchmContext | null) {
  if (!context?.tools.length) return ''

  const sections = [
    'Alchm Kitchen MCP context for this private desktop agent:',
    `Tools used: ${context.tools.join(', ')}`,
    context.ingredients.length ? `Ingredient candidates: ${context.ingredients.join(', ')}` : '',
    context.liveSky ? `Live sky JSON: ${truncateJson(context.liveSky, 1400)}` : '',
    context.ingredientScan
      ? `Ingredient alchemy JSON: ${truncateJson(context.ingredientScan, 1400)}`
      : '',
    context.recipeCandidates
      ? `Recipe candidates JSON: ${truncateJson(context.recipeCandidates, 1800)}`
      : '',
  ]

  return sections.filter(Boolean).join('\n')
}

function truncateJson(data: unknown, limit: number) {
  const text = JSON.stringify(data, null, 0)
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 16))}...[truncated]`
}

function findFirstStringByKeys(data: unknown, keys: string[], depth = 0): string | null {
  if (!data || depth > 5) return null
  if (typeof data !== 'object') return null

  const record = data as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 8)) {
        const found = findFirstStringByKeys(item, keys, depth + 1)
        if (found) return found
      }
    } else {
      const found = findFirstStringByKeys(value, keys, depth + 1)
      if (found) return found
    }
  }

  return null
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function saveAccountFromForm() {
  state.account = {
    ...state.account,
    displayName: readInput('#account-display-name') || DEFAULT_ACCOUNT.displayName,
    email: readInput('#account-email'),
    userId: readInput('#account-user-id') || DEFAULT_ACCOUNT.userId,
    apiKey: readInput('#account-api-key') || DEFAULT_ACCOUNT.apiKey,
    agentsUrl: normalizeUrlInput(readInput('#account-agents-url'), DEFAULT_ACCOUNT.agentsUrl),
    kitchenUrl: normalizeUrlInput(readInput('#account-kitchen-url'), DEFAULT_ACCOUNT.kitchenUrl),
  }
  state.siteAccounts.agents.homeUrl = state.account.agentsUrl
  state.siteAccounts.kitchen.homeUrl = state.account.kitchenUrl
  addLedger('Account Updated', 'Desktop account settings were saved locally.', 'No charge')
  setNotice('Desktop account saved.')
  saveState()
  render()
}

async function sendMessage(text: string) {
  const agents = getChatAgents()
  const cleaned = text.trim()
  if (!agents.length || !cleaned || state.runtime.generating) return

  state.composerDraft = ''
  state.runtime.generating = true

  const messages = getMessages(getActiveChatKey())
  messages.push({
    id: makeId('msg'),
    role: 'user',
    content: cleaned,
    timestamp: new Date().toISOString(),
  })

  render()

  let shouldRefreshAccounts = false
  const priorResponses: AgentTurnResponse[] = []

  try {
    for (const agent of agents) {
      const responseMessage: ChatMessage = {
        id: makeId('msg'),
        role: 'agent',
        content: '',
        timestamp: new Date().toISOString(),
        channel: agent.source === 'app-guide' ? 'Desktop guide' : 'Desktop agent',
        agentId: agent.id,
        agentName: agent.name,
      }
      messages.push(responseMessage)
      render()

      try {
        const agentText = await requestAgentText(agent, cleaned, {
          groupAgents: agents,
          priorResponses,
        })

        if (agentText) {
          responseMessage.channel = agentText.channel
          await streamTextIntoMessage(responseMessage, agentText.content)
          priorResponses.push({
            agentId: agent.id,
            agentName: agent.name,
            content: agentText.content,
          })

          if (agent.source === 'app-guide') {
            addLedger('App Guide Chat', 'Monica answered in the desktop companion.', 'No charge')
            const targetView = handleAgenticNavigation(cleaned)
            if (targetView) {
              state.activeView = targetView
              saveState()
              render()
              if (targetView === 'astrology' && state.astrology.status === 'idle') {
                void refreshAstrologyConsensus({ silent: true })
              }
              if (targetView === 'physics' && state.physics.status === 'idle') {
                void refreshAlchmPhysics({ silent: true })
              }
            }
          } else {
            addLedger(
              agents.length > 1 ? 'Group Agent Chat' : 'Agent Chat',
              `${agent.name} answered with ${
                agent.localOnly ? 'a private local profile' : 'the synced web profile'
              }.`,
              agentText.metered ? 'Metered' : 'No charge'
            )
            shouldRefreshAccounts = shouldRefreshAccounts || agentText.metered
          }
        } else {
          responseMessage.channel = 'Runtime notice'
          const notice = buildRuntimeNotice(agent)
          await streamTextIntoMessage(responseMessage, notice)
          priorResponses.push({
            agentId: agent.id,
            agentName: agent.name,
            content: notice,
          })
        }
      } catch (error) {
        responseMessage.channel = 'Runtime notice'
        state.runtime.lastError =
          error instanceof Error ? error.message : 'Local generation failed.'
        const notice = buildRuntimeNotice(agent)
        await streamTextIntoMessage(responseMessage, notice)
        priorResponses.push({
          agentId: agent.id,
          agentName: agent.name,
          content: notice,
        })
      }
    }

    if (shouldRefreshAccounts) await refreshAccounts({ silent: true })
  } finally {
    state.runtime.generating = false
    saveState()
    render()
    if (surface === 'composer') await hideComposerWindow()
  }
}

async function requestAgentText(
  agent: LocalAgent,
  userMessage: string,
  turnContext: AgentTurnContext = { groupAgents: [agent], priorResponses: [] }
): Promise<AgentTextResult | null> {
  if (agent.source === 'app-guide') {
    return {
      content: buildMonicaGuideReply(userMessage, turnContext),
      channel: 'Desktop guide',
      metered: false,
    }
  }

  const privateAlchmContext = agent.localOnly
    ? await buildPrivateAgentAlchmContext(agent, userMessage)
    : null

  if (!agent.localOnly) {
    // Path 1: Local MCP (chat_with_planetary_agent tool via sidecar stdio)
    try {
      const priorHistory = turnContext.priorResponses.map(res => `${res.agentName}: ${res.content}`)
      const apiKey = state.account.apiKey || 'dev-desktop-token'
      const mcpResult = await paMcpClient.call('tools/call', {
        name: 'chat_with_planetary_agent',
        arguments: {
          agentName: agent.name,
          message: userMessage,
          conversationHistory: priorHistory,
          _meta: {
            apiKey: apiKey,
            caller: 'alchm-desktop-shell',
          },
        },
      })

      if (mcpResult && mcpResult.content && mcpResult.content[0]) {
        const payloadText = mcpResult.content[0].text
        const payload = JSON.parse(payloadText)
        if (payload.error) {
          throw new Error(payload.error)
        }
        return {
          content: payload.text || 'No response',
          channel: 'Local MCP Agent',
          metered: false,
        }
      }
      throw new Error('Invalid MCP response format')
    } catch (error: any) {
      console.warn(`[Path 1] MCP sidecar failed for ${agent.name}:`, error?.message || error)
    }
  }

  // Path 2: Direct Backend API call (bypasses MCP sidecar, calls /api/chat directly)
  // This is the "cloud API" path — works in both Tauri and browser preview.
  if (!agent.localOnly && canCallNetwork()) {
    try {
      const backendUrl = isLocalDev ? 'http://localhost:8000' : 'https://api.agents.alchm.kitchen'
      const groupContext = buildAgentGroupPromptContext(agent, turnContext)
      const priorHistory = turnContext.priorResponses.map(res => `${res.agentName}: ${res.content}`)

      const chatPayload = {
        agentId: agent.id,
        message: userMessage,
        sessionId: `desktop-${agent.id}-${Date.now()}`,
        modelTier: 'free',
        context: {
          conversationHistory: priorHistory,
          groupContext: groupContext || undefined,
          mcpTool: 'chat_with_planetary_agent',
          caller: 'alchm-desktop-shell-direct',
        },
      }

      const response = await withTimeout(
        fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatPayload),
        }),
        30_000,
        'Backend API chat timed out.'
      )

      if (response.ok) {
        const data = await response.json()
        const text = data.text || data.response || ''
        if (text && text.length > 20) {
          return {
            content: text,
            channel: 'Cloud Agent',
            metered: false,
          }
        }
      }
      console.warn(`[Path 2] Backend API returned non-ok or empty:`, response.status)
    } catch (error: any) {
      console.warn(`[Path 2] Direct backend API failed for ${agent.name}:`, error?.message || error)
    }
  }

  // Path 3: Local Sidecar Inference (Rust backend llama-server)
  if (invokeCommand && state.runtime.ipcNonce && state.account.apiKey) {
    try {
      const groupContext = buildAgentGroupPromptContext(agent, turnContext)
      const alchmContextBlock = formatPrivateAgentAlchmContext(privateAlchmContext)
      const prompt = agent.localOnly
        ? [
            `System: You are ${agent.name}, ${agent.title}, a private desktop-only agent.`,
            agent.promptSeed,
            groupContext,
            alchmContextBlock,
            alchmContextBlock
              ? 'Use the Alchm Kitchen MCP context as factual local tool output. Do not expose raw JSON unless asked.'
              : '',
            'Answer only from the local desktop context. Do not say you are synced to or available from the public web catalog.',
            'The desktop app is a local companion chat surface. Do not describe yourself as a fallback.',
            `User: ${userMessage}`,
            'Agent:',
          ]
            .filter(Boolean)
            .join('\n')
        : agent.source === 'philosophers-stone'
          ? [
              `System: You are ${agent.name}, ${agent.title}, a local agent created with the Philosopher's Stone.`,
              agent.promptSeed,
              groupContext,
              'Answer from the birth information and additional context used to create you.',
              'The desktop app is a companion chat surface. Do not describe yourself as a fallback.',
              `User: ${userMessage}`,
              'Agent:',
            ].join('\n')
          : [
              `System: You are ${agent.name}, ${agent.title}, from the Alchm Agents web catalog.`,
              agent.promptSeed,
              groupContext,
              'Answer as the same agent personality the user would meet on the Alchm Agents website.',
              'The desktop app is a companion chat surface. Do not describe yourself as a fallback.',
              `User: ${userMessage}`,
              'Agent:',
            ]
              .filter(Boolean)
              .join('\n')

      const response = await withTimeout(
        requestSidecar('/api/generate', {
          method: 'POST',
          body: {
            prompt,
            modelName: agent.modelName,
            costs: CHAT_COST,
            inferenceProfile: 'balanced',
          },
        }),
        GENERATION_TIMEOUT_MS,
        'Local inference timed out.'
      )

      if (response.ok) {
        const body = await response.text()
        const content = parseSseText(body) || body.trim()
        if (content) {
          return {
            content,
            channel: 'Desktop inference',
            metered: true,
          }
        }
      }
    } catch (error) {
      console.warn(`[Path 3] Sidecar inference failed for ${agent.name}:`, error)
    }
  }

  // Path 4: Profile-guided Offline Fallback (only when all API paths exhausted)
  console.warn(
    `[Path 4] ${agent.localOnly ? 'Private local agent using' : 'All API paths failed for'} ${agent.name}, using profile-guided fallback`
  )
  return {
    content: buildProfileGuidedAgentReply(agent, userMessage, turnContext, privateAlchmContext),
    channel: privateAlchmContext?.tools.length
      ? 'Alchm MCP + private profile'
      : agent.localOnly
        ? 'Private local agent'
        : 'Desktop agent (Offline)',
    metered: false,
  }
}

function buildAgentGroupPromptContext(agent: LocalAgent, turnContext: AgentTurnContext) {
  const peers = turnContext.groupAgents.filter(peer => peer.id !== agent.id)
  const priorResponses = turnContext.priorResponses.filter(
    response => response.agentId !== agent.id
  )

  if (!peers.length && !priorResponses.length) return ''

  return [
    peers.length
      ? `Group chat: You are speaking with ${peers.map(peer => peer.name).join(', ')}.`
      : '',
    priorResponses.length
      ? `Earlier responses this turn:\n${priorResponses
          .map(response => `${response.agentName}: ${response.content.replace(/\s+/g, ' ')}`)
          .join('\n')}`
      : '',
    peers.length
      ? 'Answer in your own voice, and when useful, build on or refine the other agents instead of repeating them.'
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildProfileGuidedAgentReply(
  agent: LocalAgent,
  userMessage: string,
  turnContext: AgentTurnContext,
  privateAlchmContext: PrivateAgentAlchmContext | null = null
) {
  const message = userMessage.toLowerCase()
  const subject = summarizePromptSubject(userMessage)
  const specialty = agent.websiteAgent?.abilities?.specialty || agent.title
  const teachingStyle = agent.websiteAgent?.abilities?.teachingStyle
  const domains = agent.domains.slice(0, 3).join(', ')
  const signatureQuestion = buildSignatureAgentQuestion(agent, message, subject)

  if (agent.localOnly && agent.name.toLowerCase().includes('ferran')) {
    return addGroupContextToProfileReply(
      buildFerranPrivateCulinaryReply(agent, message, subject, privateAlchmContext),
      turnContext
    )
  }

  if (asksForOneQuestion(message)) return signatureQuestion

  let reply: string

  if (hasAny(message, ['jupiter', 'leo', 'astrology', 'planet', 'transit', 'chart'])) {
    reply = [
      `I would read this through ${specialty.toLowerCase()}.`,
      buildAstrologyProfileLine(agent, message),
      signatureQuestion,
    ].join(' ')

    return addGroupContextToProfileReply(reply, turnContext)
  }

  if (hasAny(message, ['courage', 'brave', 'fear', 'risk'])) {
    reply = [
      'Courage is not proved by the absence of fear; it is proved by what remains chosen while fear is present.',
      signatureQuestion,
    ].join(' ')

    return addGroupContextToProfileReply(reply, turnContext)
  }

  reply = [
    `I am listening through ${domains || specialty}.`,
    teachingStyle ? `My method here is ${teachingStyle.toLowerCase()}.` : '',
    `The useful center of your question is ${subject}.`,
    signatureQuestion,
  ]
    .filter(Boolean)
    .join(' ')

  return addGroupContextToProfileReply(reply, turnContext)
}

function buildFerranPrivateCulinaryReply(
  agent: LocalAgent,
  message: string,
  subject: string,
  privateAlchmContext: PrivateAgentAlchmContext | null
) {
  const ingredients = privateAlchmContext?.ingredients.length
    ? privateAlchmContext.ingredients
    : extractCulinaryIngredients(subject)
  const primaryIngredient = ingredients[0] || 'olive'
  const secondaryIngredient = ingredients.find(ingredient => ingredient !== primaryIngredient)
  const dominantElement = findFirstStringByKeys(privateAlchmContext?.liveSky, [
    'dominantElement',
    'dominant_element',
    'element',
  ])
  const recipeName = findFirstStringByKeys(privateAlchmContext?.recipeCandidates, [
    'title',
    'name',
    'recipeName',
  ])
  const toolLine = privateAlchmContext?.tools.length
    ? `I checked ${privateAlchmContext.tools.join(', ')} through the local Alchm Kitchen MCP before answering.`
    : ''
  const skyLine = dominantElement
    ? `Let the current ${dominantElement} signal decide the emphasis: aroma first if it is airy, temperature if it is fiery, texture if it is earthy, and release if it is watery.`
    : ''

  if (asksForOneQuestion(message)) {
    return `What familiar ingredient in your kitchen would become strange again if we changed only its temperature, texture, or moment of release?`
  }

  if (
    ingredients.length ||
    hasAny(message, [
      'recipe',
      'cook',
      'cooking',
      'dish',
      'do with',
      'meal',
      'dinner',
      'lunch',
      'eat',
      'use',
      'using',
    ])
  ) {
    const base = recipeName
      ? `Start from the MCP candidate "${recipeName}", then reduce it to a three-bite sequence instead of a full plate.`
      : ingredients.length >= 2
        ? `Make a three-bite fruit sequence from ${ingredients.join(', ')}: compress the trimmings with a little salt and acid, strain the juice into a clear broth, freeze some as granita, then set the rest as a soft gel.`
        : `Make a three-bite ${primaryIngredient} sequence: a clear warm essence, a cold crisp sheet, and a small burst of liquid center.`
    const pairing = secondaryIngredient
      ? `Let ${secondaryIngredient} sharpen the finish, but keep ${primaryIngredient} as the recognizable center.`
      : 'Keep the garnish nearly invisible; the surprise should be structural, not decorative.'

    return [
      toolLine,
      base,
      pairing,
      skyLine,
      'The goal is not novelty; it is making recognition happen one second late.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (hasAny(message, ['idea', 'private', 'desktop', 'culinary', 'kitchen', 'plate', 'menu'])) {
    return [
      toolLine,
      `One private desktop-only idea: turn ${primaryIngredient} into a "memory tapa."`,
      `Serve its aroma as vapor, its body as a thin gel, and its flavor as one sphere that breaks only after the guest thinks the dish is finished.`,
      secondaryIngredient ? `Let ${secondaryIngredient} appear only in the aftertaste.` : '',
      skyLine,
      'The dish should feel like a thought completing itself in the mouth.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return [
    toolLine,
    `I would approach "${subject}" as a culinary experiment: separate the assumption, the texture, and the final release.`,
    `For ${agent.name}, the useful question is which part should be transformed and which part must remain unmistakably itself.`,
    skyLine,
  ]
    .filter(Boolean)
    .join(' ')
}

function addGroupContextToProfileReply(reply: string, turnContext: AgentTurnContext) {
  if (turnContext.groupAgents.length <= 1 || !turnContext.priorResponses.length) return reply

  const previous = turnContext.priorResponses[turnContext.priorResponses.length - 1]
  return `Building on ${previous.agentName}: ${reply}`
}

function asksForOneQuestion(message: string) {
  return (
    hasAny(message, ['one question', 'socratic question', 'ask me a question']) ||
    (message.includes('question') && !message.includes('answer'))
  )
}

function summarizePromptSubject(userMessage: string) {
  const cleaned = userMessage
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return 'the matter before us'
  if (cleaned.length <= 84) return cleaned
  return `${cleaned.slice(0, 81).trim()}...`
}

function buildSignatureAgentQuestion(agent: LocalAgent, message: string, subject: string) {
  const name = agent.name.toLowerCase()

  if (name.includes('socrates')) {
    if (message.includes('courage')) {
      return 'If courage is not the absence of fear, what must be present in a fearful moment for an act to deserve the name courage?'
    }

    return `What assumption inside "${subject}" should we examine before we decide it is true?`
  }

  if (name.includes('joan')) {
    return `What vow would make "${subject}" worth your courage even before certainty arrives?`
  }

  if (name.includes('tesla')) {
    return `What small experiment would let "${subject}" prove itself through signal instead of theory?`
  }

  if (name.includes('jung')) {
    return `What part of "${subject}" feels charged because it is asking to be integrated rather than solved?`
  }

  if (name.includes('marcus')) {
    return `What part of "${subject}" is under your control, and what part asks to be released?`
  }

  if (name.includes('rumi')) {
    return `Where does "${subject}" stop being a problem and start becoming an invitation?`
  }

  return `What would change if you treated "${subject}" as a living pattern instead of a fixed conclusion?`
}

function buildAstrologyProfileLine(agent: LocalAgent, message: string) {
  if (message.includes('jupiter') && message.includes('leo')) {
    return 'Jupiter in Leo points toward generous creative leadership: the question is whether expansion serves truth, vanity, or a gift that wants to be shared.'
  }

  if (message.includes('jupiter')) {
    return 'Jupiter tends to show where meaning, growth, teaching, and faith ask for a wider frame.'
  }

  return `${agent.name} would use the chart as a mirror for timing, temperament, and the next honest question.`
}

function handleAgenticNavigation(message: string): View | null {
  const text = message.toLowerCase()

  const hasAstro = hasAny(text, ['astrology', 'sky', 'chart', 'zodiac', 'transit', 'alignment'])
  const hasPhysics = hasAny(text, [
    'physics',
    'quantities',
    'kinetic',
    'thermodynamic',
    'pressure',
    'entropy',
    'reactivity',
    'force',
    'momentum',
  ])
  const hasStone = hasAny(text, [
    'stone',
    'philosopher',
    'create agent',
    'craft agent',
    'custom agent',
    'natal input',
  ])
  const hasAccount = hasAny(text, [
    'account',
    'wallet',
    'sync',
    'profile',
    'claim yield',
    'claim daily',
    'esms',
    'link',
  ])
  const hasWeb3 = hasAny(text, [
    'web3',
    'web 3',
    'wallet',
    'staking',
    'stake',
    'pentacle',
    'pentacles',
    'erc-8004',
    'erc8004',
    'registry',
    'ens',
    'namestone',
    'x402',
    'a2a',
    'walrus',
    'world id',
    'worldid',
    'arc',
  ])
  const hasDiag = hasAny(text, [
    'diagnostics',
    'hardware',
    'telemetry',
    'system',
    'logs',
    'cpu',
    'memory',
    'gpu',
  ])
  const hasScrabble = hasAny(text, [
    'scrabble',
    'league',
    'tournament',
    'lettered arena',
    'arena',
    'standings',
    'scores',
  ])
  const hasChat = hasAny(text, ['chat', 'guide', 'conversation', 'talk to', 'message'])
  const hasAgents = hasAny(text, [
    'agent library',
    'agent catalog',
    'agents list',
    'agents catalog',
    'agent search',
    'catalog',
  ])

  const isNavRequest = hasAny(text, [
    'go to',
    'switch',
    'open',
    'show',
    'navigate',
    'take me',
    'view',
    'display',
    'jump to',
  ])

  if (isNavRequest) {
    if (hasAstro) return 'astrology'
    if (hasPhysics) return 'physics'
    if (hasWeb3) return 'web3'
    if (hasStone) return 'stone'
    if (hasAccount) return 'account'
    if (hasDiag) return 'diagnostics'
    if (hasScrabble) return 'scrabble'
    if (hasChat) return 'chat'
    if (hasAgents) return 'agents'
  }

  if (text.startsWith('go ') || text.startsWith('open ') || text.startsWith('show ')) {
    if (hasAstro) return 'astrology'
    if (hasPhysics) return 'physics'
    if (hasWeb3) return 'web3'
    if (hasStone) return 'stone'
    if (hasAccount) return 'account'
    if (hasDiag) return 'diagnostics'
    if (hasScrabble) return 'scrabble'
    if (hasChat) return 'chat'
    if (hasAgents) return 'agents'
  }

  return null
}

function buildMonicaGuideReply(userMessage: string, turnContext: AgentTurnContext) {
  const message = userMessage.toLowerCase()
  const userAgentCount = state.roster.filter(agent => agent.source !== 'app-guide').length
  const selectedNames = turnContext.groupAgents.map(agent => agent.name).join(', ')

  const navigatedView = handleAgenticNavigation(userMessage)
  let navNotice = ''
  if (navigatedView) {
    const viewLabels: Record<View, string> = {
      chat: 'Chat',
      astrology: 'Astrology',
      physics: 'Physics',
      web3: 'Web3',
      agents: 'Agents',
      stone: 'Stone',
      account: 'Account',
      diagnostics: 'Diagnostics',
      scrabble: 'Scrabble League',
    }
    navNotice = `🌌 I've automatically switched you to the ${viewLabels[navigatedView]} tab! `
  }

  if (turnContext.groupAgents.length > 1 && hasAny(message, ['group', 'chat', 'agent'])) {
    return [
      navNotice + "I'm Monica, and this chat is in group mode.",
      `Selected agents: ${selectedNames}.`,
      'Each agent will answer the turn in sequence and later agents can respond to earlier answers.',
    ].join(' ')
  }

  if (hasAny(message, ['claim', 'yield', 'daily', 'balance', 'esms', 'account', 'kitchen'])) {
    return [
      navNotice + "I'm Monica, your desktop guide.",
      'Use Account to sync Alchm Agents and Alchm Kitchen, then claim daily yield for each site from its account card.',
      'The desktop app tracks those balances locally here, while full account management still belongs on the browser apps.',
    ].join(' ')
  }

  if (hasAny(message, ['stone', 'philosopher', 'birth', 'create', 'local agent', 'custom'])) {
    return [
      navNotice + "I'm Monica, and the Philosopher's Stone is ready in the Stone tab.",
      'Enter the agent name, birth date, birth time, birth location, and any extra context for purpose, tone, skills, or boundaries.',
      'I will add the result to your local desktop roster for companion chat on this device.',
    ].join(' ')
  }

  if (
    hasAny(message, [
      'physics',
      'quantity',
      'quantities',
      'kinetic',
      'kinetics',
      'thermodynamic',
      'thermodynamics',
      'z-score',
      'z score',
      'landscape',
      'heat',
      'entropy',
      'reactivity',
      'energy',
    ])
  ) {
    return [
      navNotice + "I'm Monica, and the Physics tab is the desktop Alchm landscape dashboard.",
      'It shows current quantities, z-score deviations, thermodynamic drift, velocity, momentum, force, power, and planetary-hour context.',
      "Use it when you want to understand the active Alchm conditions before choosing an agent, claiming yield, or creating a local Philosopher's Stone agent.",
    ].join(' ')
  }

  if (
    hasAny(message, [
      'astrology',
      'chart',
      'transit',
      'planet',
      'moon',
      'zodiac',
      'dashboard',
      'current sky',
      'standing chart',
    ])
  ) {
    return [
      navNotice + "I'm Monica, and the Astrology tab is the desktop consensus dashboard.",
      'It combines the Kitchen current chart, planetary chart, standing chart workflow, Alchm quantities, dynamic aspects, and Agents routing.',
      "Use it when you want the live sky, today's ESMS state, and which agents are activated before you chat or create a Philosopher's Stone agent.",
    ].join(' ')
  }

  if (
    hasAny(message, ['catalog', 'purchase', 'unlock', 'web agent', 'send agent', 'agents site'])
  ) {
    return [
      navNotice + "I'm Monica.",
      'Use Catalog to review the same agent definitions as the Alchm Agents website.',
      'Purchases and unlocks stay on the main web app; when an agent is sent here, the desktop companion adds it to local chat.',
    ].join(' ')
  }

  if (hasAny(message, ['model', 'runtime', 'inference', 'chat', 'thinking', 'install'])) {
    return [
      navNotice + "I'm Monica.",
      'I can guide the app without a local model, but other desktop agents need their official local model installed before they can answer on this device.',
      'Until then, their chat will show a runtime notice and you can continue with them on the Alchm Agents web app.',
    ].join(' ')
  }

  if (hasScrabble) {
    return [
      navNotice + "I'm Monica, and the Scrabble League tab shows the Lettered Arena standings.",
      'It tracks the rolling round-robin seasons, ELO ratings, recent match results, and highlights (like sweeps, upsets, or bingos) between historical agents.',
      'This always-on league uses a Sacred-7-blended persona strategy to choose moves deterministically without LLM overhead.',
    ].join(' ')
  }

  return [
    navNotice + "I'm Monica, your Alchm Desktop guide.",
    `This companion manages Agents and Kitchen accounts, claims daily yield, shows the consensus astrology and Alchm physics dashboards, sends web agents into desktop chat, creates local Philosopher's Stone agents, and tracks the Scrabble Agent League. You currently have ${userAgentCount} user agent${userAgentCount === 1 ? '' : 's'} in the desktop roster.`,
    "Tell me whether you want help with Astrology, Physics, Account, Catalog, Philosopher's Stone, Scrabble League, or local chat runtime.",
  ].join(' ')
}

function hasAny(value: string, needles: string[]) {
  return needles.some(needle => value.includes(needle))
}

async function requestSidecar(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {}
) {
  if (!invokeCommand) throw new Error('Tauri IPC is not available.')

  const response = await invokeCommand<SidecarProxyResponse>('sidecar_request', {
    request: {
      method: options.method || 'GET',
      path,
      body: options.body ?? null,
      apiKey: state.account.apiKey || null,
    },
  })

  return new Response(response.body || '', {
    status: response.status,
    headers: {
      'Content-Type': response.contentType || 'text/plain',
    },
  })
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutHandle: number | null = null
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle)
  })
}

async function refreshAccounts(options: { silent?: boolean } = {}) {
  if (!invokeCommand) {
    markAccountsOffline('Open the packaged desktop app to sync accounts.')
    if (!options.silent) render()
    return
  }

  try {
    const response = await requestSidecar('/api/accounts')
    if (!response.ok) throw new Error(`Account sync returned HTTP ${response.status}`)
    const data = (await response.json()) as {
      mode?: string
      userId?: string
      accounts?: SiteAccount[]
      balances?: Balances
    }

    if (data.userId) state.account.userId = data.userId
    if (data.mode)
      state.account.plan = data.mode === 'local-dev' ? 'Local Dev Companion' : 'Linked Companion'
    if (data.balances) state.balances = data.balances

    for (const account of data.accounts || []) {
      state.siteAccounts[account.site] = {
        ...state.siteAccounts[account.site],
        ...account,
        homeUrl: account.site === 'agents' ? state.account.agentsUrl : state.account.kitchenUrl,
      }
    }

    saveState()
    if (!options.silent) render()
  } catch (error) {
    markAccountsOffline(error instanceof Error ? error.message : 'Account sync failed.')
    if (!options.silent) render()
  }
}

async function claimDailyYield(site: SiteKey) {
  if (!invokeCommand) {
    setNotice('Claim daily yield from the packaged desktop app or the web app.')
    return
  }

  try {
    const response = await requestSidecar('/api/accounts/claim-daily', {
      method: 'POST',
      body: { site },
    })
    const data = (await response.json().catch(() => null)) as {
      account?: SiteAccount
      accounts?: SiteAccount[]
      balances?: Balances
      distribution?: Balances
      message?: string
    } | null

    if (response.status === 409) {
      setNotice(data?.message || 'Daily yield already claimed.')
      await refreshAccounts({ silent: true })
      return
    }

    if (!response.ok) throw new Error(data?.message || `Claim returned HTTP ${response.status}`)

    if (data?.balances) state.balances = data.balances
    if (data?.account) state.siteAccounts[site] = data.account
    for (const account of data?.accounts || []) state.siteAccounts[account.site] = account

    addLedger(
      'Daily Yield Claimed',
      `${state.siteAccounts[site].label} daily yield was claimed through the desktop companion.`,
      formatDistribution(data?.distribution)
    )
    setNotice(`${state.siteAccounts[site].label} yield claimed.`)
    saveState()
    render()
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Daily yield claim failed.')
  }
}

function markAccountsOffline(message: string) {
  for (const site of ['agents', 'kitchen'] as SiteKey[]) {
    state.siteAccounts[site] = {
      ...state.siteAccounts[site],
      status: 'offline',
      canClaimDaily: false,
      message,
    }
  }
}

async function refreshTelemetry() {
  if (!invokeCommand) {
    state.runtime.sidecar = 'offline'
    render()
    return
  }

  try {
    const response = await requestSidecar('/api/hardware/telemetry')
    if (!response.ok) throw new Error(`Telemetry returned HTTP ${response.status}`)
    state.runtime.telemetry = (await response.json()) as HardwareTelemetry
    state.runtime.sidecar = 'online'
    state.runtime.lastError = null
  } catch (error) {
    state.runtime.sidecar = 'offline'
    state.runtime.lastError = error instanceof Error ? error.message : 'Sidecar telemetry failed.'
  }

  render()
}

const ZODIAC_ABBREVIATIONS: Record<string, string> = {
  Aries: 'ARI',
  Taurus: 'TAU',
  Gemini: 'GEM',
  Cancer: 'CAN',
  Leo: 'LEO',
  Virgo: 'VIR',
  Libra: 'LIB',
  Scorpio: 'SCO',
  Sagittarius: 'SAG',
  Capricorn: 'CAP',
  Aquarius: 'AQU',
  Pisces: 'PIS',
}

const ZODIAC_COLORS: Record<string, string> = {
  Aries: '#f97316',
  Taurus: '#84cc16',
  Gemini: '#22d3ee',
  Cancer: '#60a5fa',
  Leo: '#facc15',
  Virgo: '#34d399',
  Libra: '#a78bfa',
  Scorpio: '#e11d48',
  Sagittarius: '#fb7185',
  Capricorn: '#a3e635',
  Aquarius: '#38bdf8',
  Pisces: '#818cf8',
}

const PLANETARY_DIGNITIES: Record<
  string,
  { domicile: string[]; exaltation: string[]; detriment: string[]; fall: string[] }
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

function getSignDignity(planet: string, sign: string): string {
  const d = PLANETARY_DIGNITIES[planet]
  if (!d) return 'peregrine'
  if (d.domicile.includes(sign)) return 'domicile'
  if (d.exaltation.includes(sign)) return 'exaltation'
  if (d.detriment.includes(sign)) return 'detriment'
  if (d.fall.includes(sign)) return 'fall'
  return 'peregrine'
}

const ZODIAC_ELEMENTS: Record<string, string> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
}

const ZODIAC_MODALITIES: Record<string, string> = {
  Aries: 'Cardinal',
  Cancer: 'Cardinal',
  Libra: 'Cardinal',
  Capricorn: 'Cardinal',
  Taurus: 'Fixed',
  Leo: 'Fixed',
  Scorpio: 'Fixed',
  Aquarius: 'Fixed',
  Gemini: 'Mutable',
  Virgo: 'Mutable',
  Sagittarius: 'Mutable',
  Pisces: 'Mutable',
}

const ZODIAC_RULERS: Record<string, string> = {
  Aries: 'Mars',
  Scorpio: 'Mars',
  Taurus: 'Venus',
  Libra: 'Venus',
  Gemini: 'Mercury',
  Virgo: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Sagittarius: 'Jupiter',
  Pisces: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
}

function buildLocalAstrologySnapshot(
  date = new Date(),
  latitude = 40.7128,
  longitude = -74.006
): AstrologyConsensusSnapshot {
  const birthInfo = {
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

  const planets: AstrologyPlanet[] = [
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
  ].map(name => {
    const p = chart.planets[name]
    const sign = p.sign
    const signAbbreviation = ZODIAC_ABBREVIATIONS[sign] || 'ARI'
    const color = ZODIAC_COLORS[sign] || '#f97316'
    const degree = p.signDegree
    const wholeDegree = Math.floor(degree)
    const minute = Math.floor((degree - wholeDegree) * 60)
    const display = `${sign} ${wholeDegree}deg ${String(minute).padStart(2, '0')}'`
    const dignity = getSignDignity(name, sign)
    const motion = p.retrograde ? 'retrograde' : 'direct'

    return {
      planet: name,
      sign,
      signAbbreviation,
      degree,
      minute,
      display,
      longitude: p.longitude,
      element: ZODIAC_ELEMENTS[sign] || 'Fire',
      mode: ZODIAC_MODALITIES[sign] || 'Cardinal',
      ruler: ZODIAC_RULERS[sign] || 'Unknown',
      dignity,
      motion,
      speed: p.speed,
      source: 'enhanced astronomical calculator',
      domain: '',
      counsel: '',
      agent: '',
      agentRole: '',
      esms: '',
      color,
      strength: 1,
    }
  })

  // Map aspects using detectPatternsStatic
  const { aspects: rawAspects } = detectPatternsStatic(
    planets.map(p => ({
      planet: p.planet,
      sign: p.sign,
      degree: p.degree,
      house: 1,
      date,
    }))
  )

  const aspects: AstrologyAspect[] = rawAspects.map(aspect => ({
    id: `${aspect.planet1}-${aspect.planet2}-${aspect.type}`,
    planetA: aspect.planet1,
    planetB: aspect.planet2,
    type: aspect.type,
    angle: aspect.angle,
    orb: aspect.orb,
    exactness:
      aspect.strength === 'exact'
        ? 100
        : aspect.strength === 'tight'
          ? 80
          : aspect.strength === 'moderate'
            ? 60
            : 40,
    applying: aspect.applying,
    polarity: '',
    weight: 1,
    summary: `${aspect.planet1} ${aspect.type} ${aspect.planet2}`,
  }))

  const fireCount = planets.filter(p => p.element === 'Fire').length
  const waterCount = planets.filter(p => p.element === 'Water').length
  const airCount = planets.filter(p => p.element === 'Air').length
  const earthCount = planets.filter(p => p.element === 'Earth').length

  const dominantElement = [
    { name: 'Fire', count: fireCount },
    { name: 'Water', count: waterCount },
    { name: 'Air', count: airCount },
    { name: 'Earth', count: earthCount },
  ].sort((a, b) => b.count - a.count)[0].name
  const fallbackMetrics = buildLocalAstrologyMetrics(
    date,
    dominantElement,
    { Fire: fireCount, Water: waterCount, Air: airCount, Earth: earthCount },
    aspects.length
  )

  const moon = planets.find(p => p.planet === 'Moon')
  const sun = planets.find(p => p.planet === 'Sun')
  const phaseAngle = sun && moon ? (moon.longitude - sun.longitude + 360) % 360 : 0
  const phaseNames = [
    { max: 22.5, name: 'New Moon' },
    { max: 67.5, name: 'Waxing Crescent' },
    { max: 112.5, name: 'First Quarter' },
    { max: 157.5, name: 'Waxing Gibbous' },
    { max: 202.5, name: 'Full Moon' },
    { max: 247.5, name: 'Waning Gibbous' },
    { max: 292.5, name: 'Last Quarter' },
    { max: 337.5, name: 'Waning Crescent' },
    { max: 360, name: 'New Moon' },
  ]
  const phase = phaseNames.find(item => phaseAngle <= item.max) || phaseNames[0]

  return {
    generatedAt: date.toISOString(),
    provenance: [],
    chart: {
      title: 'Local High-Precision Consensus Sky',
      source: 'local astronomical calculator',
      sunSign: sun?.sign || 'Aries',
      moonSign: moon?.sign || 'Aries',
      ascendant: {
        sign: chart.ascendant?.sign || 'Aries',
        degree: chart.ascendant?.signDegree || 0,
        longitude: chart.ascendant?.longitude || 0,
      },
      julianDay: chart.julianDay,
      planets,
      aspects,
    },
    quantities: fallbackMetrics.quantities,
    moonPhase: {
      name: phase.name,
      angle: phaseAngle,
      illumination: Math.round(((1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2) * 100),
      instruction: '',
    },
    planetaryHour: fallbackMetrics.planetaryHour,
    activeAgents: [],
    layers: [],
    recommendations: [],
  }
}

async function refreshAstrologyConsensus(options: { silent?: boolean } = {}) {
  if (!invokeCommand) {
    try {
      state.astrology.snapshot = buildLocalAstrologySnapshot(new Date(), 40.7128, -74.006)
      state.astrology.status = 'ready'
      state.astrology.lastError = null
    } catch (fallbackError: any) {
      state.astrology.status = 'error'
      state.astrology.lastError =
        fallbackError instanceof Error
          ? fallbackError.message
          : 'Local astrology calculation failed.'
    }
    if (!options.silent) render()
    return
  }

  state.astrology.status = 'loading'
  state.astrology.lastError = null
  if (!options.silent) render()

  try {
    const response = await requestSidecar('/api/astrology/consensus')
    if (!response.ok) throw new Error(`Astrology consensus returned HTTP ${response.status}`)
    state.astrology.snapshot = await response.json()
    state.astrology.status = 'ready'
    state.astrology.lastError = null
  } catch (error) {
    console.warn('Astrology consensus refresh failed, falling back to local snapshot:', error)
    try {
      state.astrology.snapshot = buildLocalAstrologySnapshot(new Date(), 40.7128, -74.006)
      state.astrology.status = 'ready'
      state.astrology.lastError = null
    } catch (fallbackError: any) {
      state.astrology.status = 'error'
      state.astrology.lastError =
        fallbackError instanceof Error ? fallbackError.message : 'Local astrology fallback failed.'
    }
  }

  render()
}

async function refreshAlchmPhysics(options: { silent?: boolean } = {}) {
  if (!invokeCommand) {
    state.physics.status = 'error'
    state.physics.lastError = 'Open the packaged desktop app to load the Alchm physics sidecar.'
    if (!options.silent) render()
    return
  }

  state.physics.status = 'loading'
  state.physics.lastError = null
  if (!options.silent) render()

  try {
    const response = await requestSidecar('/api/alchm/physics?windowHours=24')
    if (!response.ok) throw new Error(`Alchm physics returned HTTP ${response.status}`)

    state.physics.snapshot = (await response.json()) as AlchmPhysicsSnapshot
    state.physics.status = 'ready'
    state.physics.lastError = null
  } catch (error) {
    state.physics.status = 'error'
    state.physics.lastError =
      error instanceof Error ? error.message : 'Alchm physics refresh failed.'
  }

  render()
}

async function setTrayState(trayState: string) {
  if (!invokeCommand) {
    setNotice('Tray controls are available in the packaged desktop app.')
    return
  }

  await invokeCommand<void>('set_tray_state', { state: trayState })
  setNotice(`Tray set to ${trayState}.`)
}

async function hideComposerWindow() {
  if (!invokeCommand) return

  try {
    await invokeCommand<void>('hide_live_composer')
  } catch {
    // The main window can submit chat without the compact composer being visible.
  }
}

function parseSseText(body: string) {
  const tokens: string[] = []
  const lines = body.split('\n')

  for (const line of lines) {
    if (!line.startsWith('data:')) continue

    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') continue

    try {
      const data = JSON.parse(payload) as {
        text?: string
        content?: string
        response?: string
        choices?: Array<{ delta?: { content?: string } }>
      }
      const token = data.text || data.content || data.response || data.choices?.[0]?.delta?.content
      if (token) tokens.push(token)
    } catch {
      tokens.push(payload)
    }
  }

  return tokens.join('').trim()
}

async function streamTextIntoMessage(message: ChatMessage, text: string) {
  message.content = ''
  const chunks = text.match(/.{1,18}(\s|$)/g) || [text]

  for (const chunk of chunks) {
    message.content += chunk
    render()
    await sleep(18)
  }
}

function buildRuntimeNotice(agent: LocalAgent) {
  if (agent.source === 'app-guide') {
    return "I'm Monica, your Alchm Desktop guide. I can help with account sync, daily yield, web catalog handoff, the Philosopher's Stone, and local runtime status."
  }

  if (agent.source === 'philosophers-stone') {
    return `Alchm Desktop created ${agent.name} with the Philosopher's Stone, but the local inference runtime is not ready yet. Install or verify the official local model for this agent to chat on this device.`
  }

  if (agent.localOnly || agent.source === 'private-local') {
    return `Alchm Desktop has ${agent.name} as a private local agent, but the local inference runtime is not ready yet. Install or verify the official local model to chat on this device; this agent is not available through the web app.`
  }

  return `Alchm Desktop has ${agent.name} synced, but the local inference runtime is not ready yet. Install or verify the official local model for this agent, or continue on the Alchm Agents web app.`
}

function addLedger(type: string, details: string, amount: string) {
  state.ledger = [
    {
      id: makeId('ledger'),
      type,
      details,
      amount,
      timestamp: new Date().toISOString(),
    },
    ...state.ledger,
  ].slice(0, 80)
}

function setNotice(message: string) {
  state.notice = message
  if (clearNoticeTimer) window.clearTimeout(clearNoticeTimer)
  clearNoticeTimer = window.setTimeout(() => {
    state.notice = null
    render()
  }, 3200)
  saveState()
  render()
}

function readInput(selector: string) {
  return document.querySelector<HTMLInputElement>(selector)?.value.trim() || ''
}

function updateStoneDraftFromField(target: EventTarget | null) {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
  if (!target.closest('form')?.matches('[data-stone-form]')) return
  if (!isStoneDraftKey(target.name)) return

  state.stoneDraft[target.name] = target.value
}

function isStoneDraftKey(value: string): value is keyof StoneDraft {
  return (
    value === 'name' ||
    value === 'date' ||
    value === 'time' ||
    value === 'location' ||
    value === 'latitude' ||
    value === 'longitude' ||
    value === 'additionalContext'
  )
}

function normalizeUrlInput(value: string, fallback: string) {
  if (!value) return fallback
  try {
    return new URL(value).toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent'
  )
}

function isView(value: string | undefined): value is View {
  return VIEW_IDS.includes(value as View)
}

function isSiteKey(value: string | undefined): value is SiteKey {
  return value === 'agents' || value === 'kitchen'
}

function urlForSite(site: SiteKey) {
  return site === 'agents' ? state.account.agentsUrl : state.account.kitchenUrl
}

function web3RouteUrl(path: string) {
  const base = (state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl).replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

function agentsBackendBase() {
  return isLocalDev ? 'http://localhost:8000' : 'https://api.agents.alchm.kitchen'
}

function openAgentOnWeb(agentId: string) {
  void openExternalUrl(
    `${state.account.agentsUrl.replace(/\/$/, '')}/agent/${encodeURIComponent(agentId)}`
  )
}

function openStoneOnWeb() {
  void openExternalUrl(`${state.account.agentsUrl.replace(/\/$/, '')}/philosophers-stone`)
}

async function openExternalUrl(url: string) {
  try {
    if (invokeCommand) {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return
    }
  } catch (error) {
    console.warn('Tauri shell open failed, falling back to window.open:', error)
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function formatDistribution(distribution?: Partial<Balances>) {
  if (!distribution) return 'Yield'
  const entries = Object.entries(distribution).filter(([, value]) => Number(value) > 0)
  return entries.map(([key, value]) => `+${value} ${capitalize(key)}`).join(', ') || 'Yield'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return '0.00'
  const rounded = Math.round(value * 100) / 100
  return rounded > 0 ? `+${rounded.toFixed(2)}` : rounded.toFixed(2)
}

function formatBytes(value: number) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return replacements[character] || character
  })
}

function renderAgentAvatar(
  agent: Pick<AgentTemplate, 'initials' | 'avatarUrl' | 'name'>,
  size = ''
) {
  const classes = ['avatar', size, agent.avatarUrl ? 'image-avatar' : ''].filter(Boolean).join(' ')
  if (agent.avatarUrl) {
    return `<span class="${classes}"><img src="${escapeHtml(agent.avatarUrl)}" alt="${escapeHtml(
      agent.name
    )}" loading="lazy" /></span>`
  }

  return `<span class="${classes}">${escapeHtml(agent.initials)}</span>`
}

function sleep(milliseconds: number) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function bindEvents() {
  document.body.addEventListener('click', async event => {
    const control = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!control) return

    const action = control.dataset.action
    const agentId = control.dataset.agentId
    const site = control.dataset.site

    if (action === 'view' && isView(control.dataset.view)) {
      state.activeView = control.dataset.view
      saveState()
      render()
      if (state.activeView === 'astrology' && state.astrology.status === 'idle') {
        void refreshAstrologyConsensus({ silent: true })
      }
      if (state.activeView === 'physics' && state.physics.status === 'idle') {
        void refreshAlchmPhysics({ silent: true })
      }
      if (state.activeView === 'scrabble' && state.scrabble.status === 'idle') {
        void refreshScrabbleLeague({ silent: true })
      }
    }

    if (action === 'refresh-scrabble') {
      void refreshScrabbleLeague()
    }

    if (action === 'simulate-scrabble') {
      void simulateScrabbleMatch()
    }

    if (action === 'view-scrabble-match' && control.dataset.matchId) {
      void loadScrabbleMatch(control.dataset.matchId)
    }

    if (action === 'clear-scrabble-match') {
      state.scrabble.activeMatch = null
      state.scrabble.simulationStatus = 'idle'
      state.scrabble.simulationError = null
      render()
    }

    if (action === 'clear-search') {
      state.agentSearchQuery = ''
      render()
    }

    if (action === 'play-message') {
      const messageId = control.dataset.messageId
      if (messageId) {
        const msg = findMessageById(messageId)
        if (msg) {
          speakMessage(messageId, msg.content, control.dataset.agentId)
        }
      }
    }

    if (action === 'copy-message') {
      const text = control.dataset.messageText
      if (text) {
        void navigator.clipboard.writeText(text)
      }
    }

    if (action === 'select-agent' && agentId) {
      setSingleChatAgent(agentId)
      saveState()
      render()
    }

    if (action === 'add-agent' && agentId) addAgent(agentId)
    if (action === 'open-chat' && agentId) {
      setSingleChatAgent(agentId)
      saveState()
      render()
    }
    if (action === 'remove-agent' && agentId) removeAgent(agentId)
    if (action === 'open-agent-web' && agentId) openAgentOnWeb(agentId)
    if (action === 'open-stone-web') openStoneOnWeb()
    if (action === 'open-astrology-source' && control.dataset.url) {
      void openExternalUrl(control.dataset.url)
    }
    if (action === 'open-physics-source' && control.dataset.url) {
      void openExternalUrl(control.dataset.url)
    }
    if (action === 'open-web3-url' && control.dataset.url) {
      void openExternalUrl(control.dataset.url)
    }
    if (action === 'open-site' && isSiteKey(site)) void openExternalUrl(urlForSite(site))
    if (action === 'claim-yield' && isSiteKey(site)) void claimDailyYield(site)
    if (action === 'refresh-accounts') void refreshAccounts()
    if (action === 'link-account-web') {
      void openExternalUrl(
        `${state.account.agentsUrl.replace(/\/$/, '')}/auth/signin?callbackUrl=%2Fprofile%3FdesktopLink%3Dtrue`
      )
    }
    if (action === 'refresh-astrology') void refreshAstrologyConsensus()
    if (action === 'refresh-physics') void refreshAlchmPhysics()
    if (action === 'reset-api-key') {
      state.account.apiKey = DEFAULT_ACCOUNT.apiKey
      saveState()
      render()
      setNotice('Dev sidecar key restored.')
    }
    if (action === 'refresh-telemetry') void refreshTelemetry()
    if (action === 'tray-state' && control.dataset.trayState) {
      void setTrayState(control.dataset.trayState)
    }
    if (action === 'toggle-disable-network') {
      state.disableNetwork = !state.disableNetwork
      setNotice(state.disableNetwork ? 'Network disabled (airplane mode).' : 'Network enabled.')
      saveState()
      render()
      void refreshAstrologyConsensus({ silent: true })
    }
    if (action === 'toggle-jing-panel') {
      state.showJingPanel = !state.showJingPanel
      saveState()
      render()
      if (state.showJingPanel) void refreshJingOverlays()
    }
    if (action === 'toggle-sigil-panel') {
      state.showSigilPanel = !state.showSigilPanel
      saveState()
      render()
    }
    if (action === 'toggle-train-panel') {
      state.train.show = !state.train.show
      render()
      if (state.train.show && state.train.mentors.length === 0) void fetchMentors()
    }
    if (action === 'train-active-agent' && agentId) {
      void trainActiveAgent(agentId)
    }
    if (action === 'ingest-knowledge' && agentId) {
      void ingestKnowledge(agentId)
    }
    if (action === 'update-jing-move') {
      const moveId = control.dataset.moveId
      if (moveId) {
        state.jingMoveId = moveId
        saveState()
        render()
      }
    }
    if (action === 'cast-jing-duel') {
      void castJingDuel()
    }
    if (action === 'test-alchm-mcp') {
      setNotice('Testing Alchm MCP...')
      try {
        const apiKey = state.account.apiKey || 'dev-desktop-token'
        const result = await alchmMcpClient.call('tools/call', {
          name: 'get_live_sky_transits',
          arguments: {
            latitude: 40.7128,
            longitude: -74.006,
            _meta: {
              apiKey,
              caller: 'alchm-desktop-shell',
            },
          },
        })
        // The setNotice below is the user-facing channel; gate the
        // verbose dump behind dev mode so production logs stay quiet.
        if (import.meta.env.DEV) console.log('Test Alchm MCP success:', result)
        setNotice('Alchm MCP OK: ' + (result?.content?.[0]?.text?.slice(0, 40) || 'Success'))
      } catch (err: any) {
        setNotice('Alchm MCP Fail: ' + err.message)
      }
    }
    if (action === 'test-pa-mcp') {
      setNotice('Testing PA Socrates MCP...')
      try {
        const apiKey = state.account.apiKey || 'dev-desktop-token'
        const result = await paMcpClient.call('tools/call', {
          name: 'chat_with_planetary_agent',
          arguments: {
            agentName: 'Socrates',
            message: 'Hello, Socrates!',
            _meta: {
              apiKey,
              caller: 'alchm-desktop-shell',
            },
          },
        })
        if (import.meta.env.DEV) console.log('Test PA MCP success:', result)
        setNotice('PA MCP OK: ' + (result?.content?.[0]?.text?.slice(0, 40) || 'Success'))
      } catch (err: any) {
        setNotice('PA MCP Fail: ' + err.message)
      }
    }
    if (action === 'refresh-mcp-nodes') {
      setNotice('Restarting MCP sidecars...')
      void alchmMcpClient.start()
      void paMcpClient.start()
    }
  })

  document.body.addEventListener('submit', event => {
    const form = event.target as HTMLFormElement
    if (form.matches('[data-account-form]')) {
      event.preventDefault()
      saveAccountFromForm()
      return
    }

    if (form.matches('[data-stone-form]')) {
      event.preventDefault()
      void createStoneAgentFromForm(form)
      return
    }

    if (form.matches('[data-chat-form]')) {
      event.preventDefault()
      const input = form.querySelector<HTMLTextAreaElement>('[name="message"]')
      void sendMessage(input?.value || state.composerDraft)
    }
  })

  document.body.addEventListener('input', event => {
    const target = event.target as HTMLElement
    updateStoneDraftFromField(event.target)
    if (target.matches('[data-composer-input]') && target instanceof HTMLTextAreaElement) {
      state.composerDraft = target.value
    }
    const searchTarget = (event.target as HTMLElement).closest<HTMLInputElement>(
      '[data-agent-search]'
    )
    if (searchTarget) {
      state.agentSearchQuery = searchTarget.value
      render()
      const inputEl = document.querySelector<HTMLInputElement>('[data-agent-search]')
      if (inputEl) {
        inputEl.focus()
        const valLen = inputEl.value.length
        inputEl.setSelectionRange(valLen, valLen)
      }
    }
  })

  document.body.addEventListener('change', event => {
    const scrabbleField = (event.target as HTMLElement).closest<
      HTMLSelectElement | HTMLInputElement
    >('[data-scrabble-field]')
    if (scrabbleField) {
      const field = scrabbleField.dataset.scrabbleField
      if (field === 'agent-a') state.scrabble.agentAId = scrabbleField.value || null
      if (field === 'agent-b') state.scrabble.agentBId = scrabbleField.value || null
      if (field === 'rounds') state.scrabble.rounds = Number(scrabbleField.value) || 7
      state.scrabble.simulationError = null
      render()
      return
    }

    const chatAgentToggle = (event.target as HTMLElement).closest<HTMLInputElement>(
      '[data-chat-agent-toggle]'
    )
    if (chatAgentToggle?.dataset.agentId) {
      toggleChatAgentSelection(chatAgentToggle.dataset.agentId, chatAgentToggle.checked)
      return
    }

    const jingSelect = (event.target as HTMLElement).closest<HTMLSelectElement>(
      '[data-action="update-jing-field"]'
    )
    if (jingSelect) {
      const field = jingSelect.dataset.field
      if (field === 'caster') state.jingCasterId = jingSelect.value || null
      if (field === 'target') state.jingTargetId = jingSelect.value || null
      saveState()
      render()
      // Prefetch the relational ledger so the badge + chips update
      // before the user clicks Cast.
      void refreshJingOverlays()
      return
    }

    updateStoneDraftFromField(event.target)
  })

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && surface === 'composer') void hideComposerWindow()
  })
}

async function bootTauriRuntime() {
  const maybeTauriWindow = window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown }
  }

  if (typeof maybeTauriWindow.__TAURI_INTERNALS__?.invoke !== 'function') {
    state.runtime.sidecar = 'offline'
    markAccountsOffline('Open the packaged desktop app, or claim yield at /yield in the browser.')
    render()
    return
  }

  try {
    const [{ invoke }, { listen }] = await Promise.all([
      import('@tauri-apps/api/core'),
      import('@tauri-apps/api/event'),
    ])
    invokeCommand = invoke as InvokeFn
    state.runtime.ipcNonce = await invokeCommand<string>('get_ipc_nonce')

    await listen<DeepLinkAgentPayload>('verified-install', event => {
      const template = AGENT_LIBRARY.find(
        agent => agent.id === event.payload.id || agent.name === event.payload.name
      )
      if (template) addAgent(template.id, 'web-unlock', event.payload.tier)
    })

    await listen<{ userId: string; apiKey: string; displayName: string; email: string }>(
      'verified-link',
      event => {
        state.account.userId = event.payload.userId
        state.account.apiKey = event.payload.apiKey
        state.account.displayName = event.payload.displayName
        state.account.email = event.payload.email
        state.account.plan = 'Linked Companion'

        saveState()
        setNotice(`Successfully linked Alchm Account: ${event.payload.displayName}`)
        void refreshAccounts()
      }
    )

    await refreshTelemetry()
    await refreshAccounts({ silent: true })

    // Spawn local stdio MCP sidecars
    void alchmMcpClient.start()
    void paMcpClient.start()

    await refreshAstrologyConsensus({ silent: true })
    await refreshAlchmPhysics({ silent: true })
    telemetryTimer = window.setInterval(() => {
      void refreshTelemetry()
      void refreshAccounts({ silent: true })
      void refreshAstrologyConsensus({ silent: true })
      void refreshAlchmPhysics({ silent: true })
      void fetchLeveling()
    }, 30000)
  } catch (error) {
    state.runtime.sidecar = 'offline'
    state.runtime.lastError = error instanceof Error ? error.message : 'Tauri runtime unavailable.'
    render()
  }
}

/**
 * Pull Cosmic leveling (level/xp/EV) from the agents web app and cache it in
 * runtime state, keyed by agentId. Non-blocking and network-guarded — the
 * desktop works fine offline; levels just won't show.
 */
async function fetchLeveling() {
  if (!canCallNetwork()) return
  const base = (state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl).replace(/\/$/, '')
  try {
    const response = await fetch(`${base}/api/agents/leveling`)
    if (!response.ok) return
    const payload = await response.json()
    if (payload && typeof payload.leveling === 'object' && payload.leveling) {
      state.leveling = payload.leveling
      render()
    }
  } catch (err) {
    console.warn('Leveling fetch failed (non-blocking):', err)
  }
}

/** Cosmic level for an agent if known, else null. */
function agentLevel(agentId: string): number | null {
  const entry = state.leveling[agentId]
  return entry ? entry.level : null
}

/** Fetch the mentor roster (canonical figures + their dominant Sacred 7 stat). */
async function fetchMentors() {
  if (!canCallNetwork()) return
  const base = (state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl).replace(/\/$/, '')
  try {
    const response = await fetch(`${base}/api/agents/mentors?limit=40`)
    if (!response.ok) return
    const payload = await response.json()
    if (Array.isArray(payload?.mentors)) {
      state.train.mentors = payload.mentors
      if (!state.train.mentorId && payload.mentors[0]) {
        state.train.mentorId = payload.mentors[0].agentId
      }
      render()
    }
  } catch (err) {
    console.warn('Mentors fetch failed (non-blocking):', err)
  }
}

/** Train the active agent with the selected mentor (cloud-awards XP + EVs). */
async function trainActiveAgent(traineeId: string) {
  if (state.train.busy) return
  const select = document.querySelector<HTMLSelectElement>('#train-mentor-select')
  const mentorId = select?.value || state.train.mentorId
  if (!mentorId) {
    setNotice('Pick a mentor to train with.')
    return
  }
  if (mentorId === traineeId) {
    setNotice('An agent cannot train with itself.')
    return
  }
  if (!canCallNetwork()) {
    setNotice('Training needs a connection to the agents cloud.')
    return
  }
  state.train.mentorId = mentorId
  state.train.busy = true
  render()
  const base = (state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl).replace(/\/$/, '')
  try {
    const response = await fetch(`${base}/api/agents/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': state.account.apiKey },
      body: JSON.stringify({ traineeAgentId: traineeId, mentorAgentId: mentorId }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.success) {
      setNotice(payload?.error || `Training failed (${response.status}).`)
      return
    }
    const t = payload.trainee
    const mentorName = state.train.mentors.find(m => m.agentId === mentorId)?.name || 'mentor'
    setNotice(
      `Trained with ${mentorName}: +${t.xpGained} XP` +
        `${t.stat ? `, +${t.evGained} ${t.stat} EVs` : ''}` +
        `${t.leveledUp ? ` — leveled up to ${t.level}!` : ''}.`
    )
    void fetchLeveling()
  } catch (err) {
    setNotice(err instanceof Error ? err.message : 'Training failed.')
  } finally {
    state.train.busy = false
    render()
  }
}

/** Upload knowledge files for the active agent to the cloud ingestion route. */
async function ingestKnowledge(traineeId: string) {
  if (state.train.ingesting) return
  const input = document.querySelector<HTMLInputElement>('#train-ingest-files')
  const files = input?.files
  if (!files || files.length === 0) {
    setNotice('Choose one or more files (PDF / TXT / MD / JSON / DOCX) first.')
    return
  }
  if (!canCallNetwork()) {
    setNotice('Knowledge upload needs a connection to the agents cloud.')
    return
  }
  const captured = Array.from(files)
  state.train.ingesting = true
  render()
  const base = (state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl).replace(/\/$/, '')
  try {
    const fd = new FormData()
    fd.append('agentId', traineeId)
    for (const f of captured) fd.append('files', f)
    const response = await fetch(`${base}/api/knowledge-updater/ingest`, {
      method: 'POST',
      headers: { 'x-api-key': state.account.apiKey },
      body: fd,
    })
    const payload = await response.json().catch(() => null)
    if (payload?.status === 'disabled') {
      setNotice('Knowledge ingestion is disabled on the server (RAG off).')
      return
    }
    if (!response.ok || !payload?.success) {
      setNotice(payload?.error || `Ingestion failed (${response.status}).`)
      return
    }
    setNotice(
      `Infused ${payload.filesSucceeded}/${payload.filesProcessed} file(s) — ${payload.totalChunks} chunks embedded.`
    )
  } catch (err) {
    setNotice(err instanceof Error ? err.message : 'Ingestion failed.')
  } finally {
    state.train.ingesting = false
    render()
  }
}

async function refreshScrabbleLeague(options: { silent?: boolean } = {}) {
  state.scrabble.status = 'loading'
  state.scrabble.lastError = null
  if (!options.silent) render()

  // Scrabble standings come from the local Next.js backend (localhost:3000),
  // not a remote cloud service — so we skip the disableNetwork / airplane-mode
  // check and always attempt the local call.

  try {
    // Always try localhost first; fall back to the configured agentsUrl only
    // if the user has explicitly overridden it away from the default.
    const base = getScrabbleBackendBase()
    const response = await fetch(`${base}/api/agents/scrabble-standings`)
    if (!response.ok) throw new Error(`Scrabble League standings returned HTTP ${response.status}`)

    const payload = await response.json()
    if (payload && payload.success) {
      state.scrabble.data = payload
      state.scrabble.status = 'ready'
      state.scrabble.lastError = null
      ensureScrabbleAgentSelection()
    } else {
      throw new Error(payload?.reason || 'Failed to load Scrabble League data.')
    }
  } catch (error) {
    state.scrabble.status = 'error'
    state.scrabble.lastError =
      error instanceof Error ? error.message : 'Scrabble League refresh failed.'
  }

  render()
}

function getScrabbleBackendBase() {
  const configuredUrl = state.account.agentsUrl || DEFAULT_ACCOUNT.agentsUrl
  const isDefaultRemote = configuredUrl === DEFAULT_ACCOUNT.agentsUrl
  return (isDefaultRemote ? 'http://localhost:3000' : configuredUrl).replace(/\/$/, '')
}

function ensureScrabbleAgentSelection() {
  const agents = state.scrabble.data?.availableAgents || []
  if (agents.length === 0) return
  const ids = new Set(agents.map(agent => agent.id))
  if (!state.scrabble.agentAId || !ids.has(state.scrabble.agentAId)) {
    state.scrabble.agentAId = agents[0]?.id || null
  }
  if (
    !state.scrabble.agentBId ||
    !ids.has(state.scrabble.agentBId) ||
    state.scrabble.agentBId === state.scrabble.agentAId
  ) {
    state.scrabble.agentBId = agents.find(agent => agent.id !== state.scrabble.agentAId)?.id || null
  }
}

async function simulateScrabbleMatch() {
  const { agentAId, agentBId, rounds } = state.scrabble
  if (!agentAId || !agentBId) {
    state.scrabble.simulationStatus = 'error'
    state.scrabble.simulationError = 'Choose two agents before starting the match.'
    render()
    return
  }
  if (agentAId === agentBId) {
    state.scrabble.simulationStatus = 'error'
    state.scrabble.simulationError = 'An agent cannot play against itself. Choose a rival.'
    render()
    return
  }

  state.scrabble.simulationStatus = 'loading'
  state.scrabble.simulationError = null
  render()

  try {
    const response = await fetch(`${getScrabbleBackendBase()}/api/agents/scrabble-arena`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentAId, agentBId, rounds }),
    })
    const payload = await response.json()
    if (!response.ok || !payload?.success || !payload.match) {
      throw new Error(payload?.error || `Scrabble simulation returned HTTP ${response.status}`)
    }
    state.scrabble.activeMatch = payload.match
    state.scrabble.simulationStatus = 'ready'
  } catch (error) {
    state.scrabble.simulationStatus = 'error'
    state.scrabble.simulationError =
      error instanceof Error ? error.message : 'Scrabble simulation failed.'
  }

  render()
  focusScrabbleReplay()
}

async function loadScrabbleMatch(matchId: string) {
  state.scrabble.simulationStatus = 'loading'
  state.scrabble.simulationError = null
  render()

  try {
    const url = new URL(`${getScrabbleBackendBase()}/api/agents/scrabble-arena`)
    url.searchParams.set('matchId', matchId)
    const response = await fetch(url)
    const payload = await response.json()
    if (!response.ok || !payload?.success || !payload.match) {
      throw new Error(payload?.error || `Scrabble replay returned HTTP ${response.status}`)
    }
    state.scrabble.activeMatch = payload.match
    state.scrabble.agentAId = payload.match.a.id
    state.scrabble.agentBId = payload.match.b.id
    state.scrabble.rounds = payload.match.rounds
    state.scrabble.simulationStatus = 'ready'
  } catch (error) {
    state.scrabble.simulationStatus = 'error'
    state.scrabble.simulationError =
      error instanceof Error ? error.message : 'Scrabble replay failed.'
  }

  render()
  focusScrabbleReplay()
}

function focusScrabbleReplay() {
  requestAnimationFrame(() => {
    document.querySelector('[data-scrabble-replay]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

function renderScrabbleView() {
  const scrabble = state.scrabble.data

  if (state.scrabble.status === 'loading' && !scrabble) {
    return `
      <section class="view empty-state">
        <div class="panel stack">
          <div class="eyebrow">Scrabble Agent Tournament</div>
          <h1>Loading League Standings...</h1>
          <p class="muted">Fetching rolling seasons, ELO ratings, and recent matches from the alchemical feed.</p>
        </div>
      </section>
    `
  }

  if (!scrabble) {
    return `
      <section class="view empty-state">
        <div class="panel stack">
          <div class="eyebrow">Scrabble Agent Tournament</div>
          <h1>Unable to open the arena</h1>
          <p class="muted">Start the local Next.js backend, then reconnect the desktop arena.</p>
          ${
            state.scrabble.lastError
              ? `<div class="panel error-panel">${escapeHtml(state.scrabble.lastError)}</div>`
              : ''
          }
          <div class="button-row center-row">
            <button class="primary-button" data-action="refresh-scrabble">
              ${state.scrabble.status === 'loading' ? 'Connecting' : 'Reconnect Arena'}
            </button>
          </div>
        </div>
      </section>
    `
  }

  const { aggregates, standings, recentMatches, availableAgents } = scrabble
  const highlightTotal = aggregates
    ? (aggregates.highlights?.bingo || 0) +
      (aggregates.highlights?.upset || 0) +
      (aggregates.highlights?.sweep || 0)
    : 0

  return `
    <section class="view scrabble-view">
      <header class="view-header">
        <div>
          <div class="eyebrow">The Lettered Arena</div>
          <h1>Scrabble Agent League</h1>
          <p>
            Watch historical agents meet word for word, run an exhibition match, and inspect every rack and play.
            Sacred-7 strategy drives each choice with no model call.
          </p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="refresh-scrabble">
            ${state.scrabble.status === 'loading' ? 'Refreshing' : 'Refresh Standings'}
          </button>
        </div>
      </header>

      ${renderScrabbleArenaControls(availableAgents)}
      ${renderScrabbleMatchReplay(state.scrabble.activeMatch)}

      ${
        aggregates
          ? `
          <div class="diag-grid scrabble-metrics">
            <article class="panel metric">
              <span class="eyebrow">Total Matches</span>
              <strong>${aggregates.totalMatches.toLocaleString()}</strong>
              <small class="muted">Season ${escapeHtml(aggregates.latestSeason || 'None')}</small>
            </article>
            <article class="panel metric">
              <span class="eyebrow">Last 24h</span>
              <strong>${aggregates.last24h.toLocaleString()}</strong>
              <small class="muted">League matches today</small>
            </article>
            <article class="panel metric">
              <span class="eyebrow">Active Seasons</span>
              <strong>${aggregates.activeSeasons}</strong>
              <small class="muted">Rolling schedules</small>
            </article>
            <article class="panel metric">
              <span class="eyebrow">Highlights</span>
              <strong>${highlightTotal}</strong>
              <small class="muted">${aggregates.highlights?.bingo || 0} bingo / ${aggregates.highlights?.upset || 0} upset / ${aggregates.highlights?.sweep || 0} sweep</small>
            </article>
          </div>
        `
          : `
          <div class="panel scrabble-league-notice">
            <div>
              <div class="eyebrow">Exhibition Mode</div>
              <strong>The arena is open; scheduled league play has no recorded matches yet.</strong>
            </div>
            <span class="status-pill offline">League inactive</span>
          </div>
        `
      }

      <div class="scrabble-league-grid">
        ${renderScrabbleStandings(standings)}
        ${renderScrabbleRecentMatches(recentMatches)}
      </div>
    </section>
  `
}

function renderScrabbleArenaControls(agents: ScrabbleArenaAgent[]) {
  const disabled = agents.length < 2 || state.scrabble.simulationStatus === 'loading'
  return `
    <section class="panel scrabble-arena-panel">
      <div class="scrabble-arena-copy">
        <div class="eyebrow">Exhibition Match</div>
        <h2>Choose the table</h2>
        <p class="muted">Pick two minds, choose the match length, then simulate their full game.</p>
      </div>
      <div class="scrabble-controls">
        <label class="scrabble-control">
          <span>Agent One</span>
          <select class="input" data-scrabble-field="agent-a" ${disabled ? 'disabled' : ''}>
            ${renderScrabbleAgentOptions(agents, state.scrabble.agentAId)}
          </select>
        </label>
        <div class="scrabble-versus" aria-hidden="true">VS</div>
        <label class="scrabble-control">
          <span>Agent Two</span>
          <select class="input" data-scrabble-field="agent-b" ${disabled ? 'disabled' : ''}>
            ${renderScrabbleAgentOptions(agents, state.scrabble.agentBId)}
          </select>
        </label>
        <label class="scrabble-control scrabble-round-control">
          <span>Rounds</span>
          <select class="input" data-scrabble-field="rounds" ${disabled ? 'disabled' : ''}>
            ${[3, 5, 7, 10]
              .map(
                rounds =>
                  `<option value="${rounds}" ${state.scrabble.rounds === rounds ? 'selected' : ''}>${rounds}</option>`
              )
              .join('')}
          </select>
        </label>
        <button class="primary-button scrabble-simulate-button" data-action="simulate-scrabble" ${disabled ? 'disabled' : ''}>
          ${state.scrabble.simulationStatus === 'loading' ? 'Playing Match...' : 'Simulate Match'}
        </button>
      </div>
      ${
        state.scrabble.simulationError
          ? `<div class="scrabble-error">${escapeHtml(state.scrabble.simulationError)}</div>`
          : ''
      }
    </section>
  `
}

function renderScrabbleAgentOptions(agents: ScrabbleArenaAgent[], selectedId: string | null) {
  if (agents.length === 0) return '<option value="">No agents available</option>'
  return agents
    .map(
      agent => `
        <option value="${escapeHtml(agent.id)}" ${agent.id === selectedId ? 'selected' : ''}>
          ${escapeHtml(agent.name)} - ${escapeHtml(agent.title)}
        </option>
      `
    )
    .join('')
}

function renderScrabbleMatchReplay(match: ScrabbleArenaMatch | null) {
  if (!match) return ''
  const resultLabel = match.tie
    ? 'The match ends in a tie'
    : `${match.winnerId === match.a.id ? match.a.name : match.b.name} wins by ${match.margin}`
  const roundRows = Array.from({ length: match.rounds }, (_, index) => {
    const round = index + 1
    return renderScrabbleTurnRow(round, match.a.turns[index], match.b.turns[index])
  }).join('')

  return `
    <section class="panel scrabble-replay" data-scrabble-replay>
      <div class="scrabble-replay-header">
        <div>
          <div class="eyebrow">${match.source === 'league' ? `League Replay / ${escapeHtml(match.seasonId || '')}` : 'Exhibition Result'}</div>
          <h2>${escapeHtml(resultLabel)}</h2>
          <p class="muted">${match.rounds} rounds / seed ${match.seed}${match.highlight ? ` / ${escapeHtml(match.highlight)}` : ''}</p>
        </div>
        <button class="secondary-button" data-action="clear-scrabble-match">Close Replay</button>
      </div>
      <div class="scrabble-scoreboard">
        ${renderScrabblePlayerCard(match.a, match.winnerId)}
        <div class="scrabble-final-score">${match.a.total}<span>:</span>${match.b.total}</div>
        ${renderScrabblePlayerCard(match.b, match.winnerId)}
      </div>
      <div class="scrabble-rounds-table-wrap">
        <table class="scrabble-rounds-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>${escapeHtml(match.a.name)}</th>
              <th>Score</th>
              <th>${escapeHtml(match.b.name)}</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>${roundRows}</tbody>
        </table>
      </div>
    </section>
  `
}

function renderScrabblePlayerCard(player: ScrabbleArenaPlayer, winnerId: string | null) {
  return `
    <article class="scrabble-player-card ${winnerId === player.id ? 'winner' : ''}">
      <span class="scrabble-player-avatar">${escapeHtml(initialsForName(player.name))}</span>
      <div>
        <strong>${escapeHtml(player.name)}</strong>
        <small>${escapeHtml(player.title)}</small>
        <span>Best word: ${player.bestWord ? `${escapeHtml(player.bestWord.word)} +${player.bestWord.score}` : 'Pass'}</span>
      </div>
    </article>
  `
}

function renderScrabbleTurnRow(
  round: number,
  turnA: ScrabbleTurn | undefined,
  turnB: ScrabbleTurn | undefined
) {
  return `
    <tr>
      <td class="scrabble-round-number">${round}</td>
      <td>${renderScrabbleTurn(turnA)}</td>
      <td class="scrabble-turn-score">+${turnA?.score || 0}</td>
      <td>${renderScrabbleTurn(turnB)}</td>
      <td class="scrabble-turn-score">+${turnB?.score || 0}</td>
    </tr>
  `
}

function renderScrabbleTurn(turn: ScrabbleTurn | undefined) {
  if (!turn) return '<span class="muted">Replay data unavailable</span>'
  return `
    <div class="scrabble-turn">
      <div class="scrabble-rack">${renderScrabbleRack(turn.rack)}</div>
      <strong>${turn.word ? escapeHtml(turn.word) : 'PASS'}</strong>
      <small>${turn.candidateCount} legal candidate${turn.candidateCount === 1 ? '' : 's'}</small>
    </div>
  `
}

function renderScrabbleRack(rack: string) {
  return [...rack]
    .map(letter => `<span class="scrabble-tile">${escapeHtml(letter)}</span>`)
    .join('')
}

function renderScrabbleStandings(standings: Standing[]) {
  return `
    <section class="panel stack scrabble-standings-panel">
      <div class="eyebrow">Season Standings</div>
      ${
        standings.length === 0
          ? '<p class="muted">No league standings recorded yet.</p>'
          : `
            <div class="scrabble-table-wrap">
              <table class="scrabble-table">
                <thead><tr><th>#</th><th>Agent</th><th>ELO</th><th>W-L-T</th><th>Points</th></tr></thead>
                <tbody>
                  ${standings
                    .map(
                      standing => `
                        <tr class="standings-row">
                          <td class="rank-col ${standing.rank === 1 ? 'first' : 'normal'}">#${standing.rank}</td>
                          <td><strong>${escapeHtml(standing.name)}</strong><small>${standing.played} played</small></td>
                          <td class="scrabble-elo"><span class="elo-badge ${standing.rank <= 2 ? 'gold' : 'normal'}">${standing.elo}</span></td>
                          <td>${standing.won}-${standing.lost}-${standing.tied}</td>
                          <td>${standing.pointsFor.toLocaleString()}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `
}

function renderScrabbleRecentMatches(matches: RecentMatch[]) {
  return `
    <section class="panel stack scrabble-history-panel">
      <div class="eyebrow">Recent League Games</div>
      ${
        matches.length === 0
          ? '<p class="muted">No league matches have been recorded yet.</p>'
          : `<div class="scrabble-match-list">
              ${matches
                .map(
                  match => `
                    <article class="scrabble-match-row">
                      <div class="scrabble-match-score">
                        <strong class="${match.winner === match.agentA ? 'winner' : ''}">${escapeHtml(match.agentA)}</strong>
                        <span>${match.scoreA} : ${match.scoreB}</span>
                        <strong class="${match.winner === match.agentB ? 'winner' : ''}">${escapeHtml(match.agentB)}</strong>
                      </div>
                      <div class="scrabble-match-actions">
                        ${match.highlight ? `<span class="scrabble-highlight ${escapeHtml(match.highlight)}">${escapeHtml(match.highlight)}</span>` : ''}
                        <button class="secondary-button" data-action="view-scrabble-match" data-match-id="${escapeHtml(match.id)}">View Game</button>
                      </div>
                    </article>
                  `
                )
                .join('')}
            </div>`
      }
    </section>
  `
}

const FEMALE_AGENTS = new Set([
  'monica-001',
  'monica-app-guide',
  'cleopatra',
  'mary-wollstonecraft',
  'marie-curie',
  'marie-curie-1867',
  'murasaki-shikibu',
  'wangari-maathai',
  'frida-kahlo',
  'rachel-carson',
  'joan-of-arc',
  'hildegard-of-bingen',
  'eleanor-roosevelt',
  'sojourner-truth',
  'maya-angelou',
  'ada-lovelace',
  'harriet-tubman',
  'virginia-woolf',
  'jane-austen',
  'florence-nightingale',
])

interface VoiceProfile {
  voiceKeywords: string[]
  rate: number
  pitch: number
  lang?: string // preferred English variant (en-US, en-GB, en-IN, en-AU)
  gender: 'male' | 'female'
  nativeLang?: string // agent's historical native language (it-IT, fr-FR, de-DE, etc.)
}

const HISTORICAL_VOICE_REGISTRY: Record<string, VoiceProfile> = {
  // ────────────────── MALE AGENTS ──────────────────
  'albert-einstein': {
    // German-accented, warm, wandering cadence. Known for slow, pondering speech with sudden bursts of enthusiasm.
    voiceKeywords: ['reed', 'grandpa', 'eddy', 'daniel'],
    rate: 0.82, // very thoughtful and slow with contemplative pauses
    pitch: 0.92, // mellow baritone, slightly lower
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-DE', // German (Ulm, Württemberg)
  },
  'isaac-newton': {
    // Precise, clipped British diction. Measured and deliberate — each word weighed carefully.
    voiceKeywords: ['daniel', 'eddy', 'reed', 'google uk english male'],
    rate: 0.85, // precise and deliberate, borderline pedantic
    pitch: 1.08, // slightly higher, intellectual clarity
    lang: 'en-GB',
    gender: 'male',
  },
  'william-shakespeare': {
    // Theatrical, rolling cadence. Elizabethan flourish — dramatic pauses followed by rapid passages.
    voiceKeywords: ['daniel', 'reed', 'rocko', 'google uk english male'],
    rate: 1.08, // theatrical and flowing, building momentum
    pitch: 1.06, // expressive tenor with dramatic range
    lang: 'en-GB',
    gender: 'male',
  },
  socrates: {
    // Conversational, probing, Socratic irony. Speaks as if perpetually asking a question.
    voiceKeywords: ['eddy', 'reed', 'grandpa', 'daniel'],
    rate: 0.9, // deliberate, leaving space for thought
    pitch: 1.04, // slightly elevated — curious, inquisitive tone
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'el-GR', // Ancient Greek
  },
  'galileo-galilei': {
    // Italian passion meets scientific rigor. Animated when describing discoveries, measured when reasoning.
    voiceKeywords: ['rocko', 'eddy', 'reed', 'daniel'],
    rate: 1.05, // slightly quick, animated with excitement
    pitch: 1.02, // warm Mediterranean tenor
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Italian (Pisa)
  },
  'carl-jung': {
    // Swiss-German accent, deep and resonant. Speaks in careful, layered constructions with psychological weight.
    voiceKeywords: ['grandpa', 'eddy', 'reed', 'daniel'],
    rate: 0.78, // very slow, ponderous, depth-seeking
    pitch: 0.85, // deep baritone, almost hypnotic
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-CH', // Swiss German (Kesswil)
  },
  'carl-sagan': {
    // Breathy wonder, cosmic awe. Famous for elongated vowels and building excitement.
    voiceKeywords: ['reed', 'eddy', 'rocko', 'grandpa'],
    rate: 0.92, // measured wonder, building to crescendo
    pitch: 1.0, // warm and resonant, natural mid-range
    lang: 'en-US',
    gender: 'male',
  },
  'siddhartha-gautama-buddha': {
    // Profoundly serene. Each word placed like a stone in still water — extreme calm.
    voiceKeywords: ['grandpa', 'reed', 'rishi'],
    rate: 0.68, // extremely slow, meditative — the slowest of all agents
    pitch: 0.88, // deep and tranquil, almost a whisper of authority
    lang: 'en-IN',
    gender: 'male',
    nativeLang: 'hi-IN', // Pali/Sanskrit region
  },
  rumi: {
    // Ecstatic, rhythmic, poetic. Like listening to sung verse — musical and flowing.
    voiceKeywords: ['reed', 'eddy', 'rishi'],
    rate: 0.88, // rhythmic and flowing, building like poetry
    pitch: 1.08, // elevated, ecstatic — almost singing
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fa-IR', // Persian (Balkh, now Afghanistan)
  },
  'mark-twain-1835': {
    // Missouri drawl, dry wit. Long pauses for comedic effect, then sudden punchlines.
    voiceKeywords: ['grandpa', 'reed', 'rocko'],
    rate: 0.78, // slow, drawling — takes his sweet time
    pitch: 0.85, // gruff, weathered baritone with humor underneath
    lang: 'en-US',
    gender: 'male',
  },
  'benjamin-franklin': {
    // Avuncular, pragmatic, slightly amused. The wise grandfather who's seen it all.
    voiceKeywords: ['grandpa', 'reed', 'eddy'],
    rate: 0.95, // conversational but measured
    pitch: 0.96, // balanced, warm, approachable
    lang: 'en-US',
    gender: 'male',
  },
  'julius-caesar': {
    // Imperial authority. Declarative, commanding — every sentence a decree.
    voiceKeywords: ['rocko', 'reed', 'eddy', 'daniel'],
    rate: 1.05, // crisp, military precision
    pitch: 0.88, // deep, authoritative, a general's voice
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Latin (Rome)
  },
  'isaac-asimov': {
    // Brooklyn-accented, rapid-fire, professor-like. Enthusiastic about ideas, speaks faster when excited.
    voiceKeywords: ['reed', 'eddy', 'rocko'],
    rate: 1.12, // quick and intellectually animated
    pitch: 1.02, // clear, professorial
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'ru-RU', // Russian (Petrovichi, emigrated age 3)
  },
  'leonardo-da-vinci': {
    // Renaissance polymath. Curious, dreamy, shifting between art and science mid-sentence.
    voiceKeywords: ['eddy', 'reed', 'rocko', 'daniel'],
    rate: 0.92, // contemplative, sometimes pausing to sketch mentally
    pitch: 1.06, // warm, expressive Italian tenor
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Italian (Vinci, Tuscany)
  },
  'nikola-tesla': {
    // Serbian-accented precision. Visionary intensity — speaks as if receiving transmissions.
    voiceKeywords: ['eddy', 'reed', 'rocko'],
    rate: 1.02, // precise, slightly clipped, electric
    pitch: 1.1, // higher, intense, vibrating with ideas
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'sr-RS', // Serbian (Smiljan, Austrian Empire)
  },
  'charles-darwin': {
    // Soft-spoken English gentleman. Careful, observational — speaks like he's narrating field notes.
    voiceKeywords: ['daniel', 'eddy', 'reed', 'google uk english male'],
    rate: 0.85, // patient, observational
    pitch: 0.98, // gentle, understated English tenor
    lang: 'en-GB',
    gender: 'male',
  },
  'marcus-aurelius': {
    // Stoic composure. Measured, self-reflective — the voice of a man writing meditations.
    voiceKeywords: ['eddy', 'reed', 'grandpa'],
    rate: 0.82, // deliberate, stoic
    pitch: 0.92, // steady, centered — neither high nor low
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Latin (Rome)
  },
  confucius: {
    // Aphoristic, teacher's cadence. Pauses between ideas to let them sink in.
    voiceKeywords: ['grandpa', 'eddy', 'reed'],
    rate: 0.8, // slow, didactic — each word deliberate
    pitch: 0.95, // calm authority, elder's voice
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'zh-CN', // Chinese (Lu, Zhou dynasty)
  },
  'lao-tzu': {
    // Soft, paradoxical, almost whispering. The Tao speaks through silence.
    voiceKeywords: ['grandpa', 'reed', 'rishi'],
    rate: 0.72, // near-silence pace, deeply contemplative
    pitch: 0.9, // gentle, almost ethereal
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'zh-CN', // Chinese (Zhou dynasty)
  },
  'sun-tzu': {
    // Military precision meets philosophical depth. Short, declarative, strategic.
    voiceKeywords: ['eddy', 'rocko', 'reed'],
    rate: 1.0, // precise, strategic — no wasted words
    pitch: 0.9, // controlled, deep, commanding
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'zh-CN', // Chinese (Qi, Spring and Autumn period)
  },
  nietzsche: {
    // Intense, passionate, building to philosophical climax. The voice of a man on a mountain.
    voiceKeywords: ['rocko', 'eddy', 'reed'],
    rate: 1.08, // passionate, building intensity
    pitch: 1.05, // intense tenor, rising with fervor
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-DE', // German (Röcken, Saxony)
  },
  plato: {
    // Socrates' student, more measured and systematic. Speaks in structured dialogues.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.88, // systematic, building arguments
    pitch: 1.02, // clear, academic
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'el-GR', // Ancient Greek (Athens)
  },
  aristotle: {
    // The teacher. More grounded than Plato, more empirical. Speaks with taxonomic precision.
    voiceKeywords: ['reed', 'eddy', 'daniel'],
    rate: 0.92, // methodical, categorizing
    pitch: 0.98, // balanced, authoritative
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'el-GR', // Ancient Greek (Stagira)
  },
  dostoevsky: {
    // Russian intensity. Tortured, deep, exploring the abyss of human psychology.
    voiceKeywords: ['grandpa', 'eddy', 'reed'],
    rate: 0.8, // heavy, brooding, dramatic pauses
    pitch: 0.82, // deep Russian baritone, anguished depth
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'ru-RU', // Russian (Moscow)
  },
  voltaire: {
    // French wit, razor-sharp. Quick, sardonic, dripping with irony.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 1.1, // quick-witted, satirical
    pitch: 1.08, // light, amused tenor
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fr-FR', // French (Paris)
  },
  'omar-khayyam': {
    // Persian poet-mathematician. Lyrical, wine-flavored, fatalistic beauty.
    voiceKeywords: ['rishi', 'reed', 'eddy'],
    rate: 0.85, // flowing, poetic cadence
    pitch: 1.05, // melodic, warm
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fa-IR', // Persian (Nishapur)
  },
  'khalil-gibran': {
    // Lebanese mystical prose. Deeply earnest, every word a revelation.
    voiceKeywords: ['rishi', 'eddy', 'reed'],
    rate: 0.82, // reverent, almost prayerful
    pitch: 1.04, // warm, sincere tenor
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'ar-LB', // Arabic (Bsharri, Lebanon)
  },
  machiavelli: {
    // Florentine pragmatism. Cool, calculating, speaking uncomfortable truths without flinching.
    voiceKeywords: ['rocko', 'eddy', 'reed'],
    rate: 0.95, // measured, strategic — revealing nothing accidental
    pitch: 0.94, // smooth, slightly cold
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Italian (Florence)
  },
  gandhi: {
    // Gentle but unyielding. Speaks softly but with absolute moral conviction.
    voiceKeywords: ['rishi', 'grandpa', 'reed'],
    rate: 0.78, // gentle, deliberate, unhurried
    pitch: 1.0, // thin but clear, moral authority
    lang: 'en-IN',
    gender: 'male',
    nativeLang: 'gu-IN', // Gujarati (Porbandar)
  },
  'alan-turing': {
    // Brilliant, slightly awkward. Quick bursts of insight followed by contemplative pauses.
    voiceKeywords: ['daniel', 'eddy', 'reed', 'google uk english male'],
    rate: 1.05, // quick analytical mind
    pitch: 1.06, // slightly higher, nervous energy
    lang: 'en-GB',
    gender: 'male',
  },
  'edgar-allan-poe': {
    // Gothic, haunted, melodramatic. The voice echoes in empty chambers.
    voiceKeywords: ['rocko', 'eddy', 'reed'],
    rate: 0.82, // slow, building dread
    pitch: 0.88, // dark, resonant, slightly hollow
    lang: 'en-US',
    gender: 'male',
  },
  'thomas-jefferson': {
    // Virginian eloquence. Diplomatic, measured, writing-as-speech — the Declaration in voice form.
    voiceKeywords: ['reed', 'eddy', 'grandpa'],
    rate: 0.9, // measured, diplomatic
    pitch: 0.96, // refined Southern gentility
    lang: 'en-US',
    gender: 'male',
  },
  'abraham-lincoln': {
    // Frontier simplicity meets profound depth. Speaks slowly, with homespun wisdom.
    voiceKeywords: ['grandpa', 'reed', 'eddy'],
    rate: 0.8, // prairie slow, deliberate
    pitch: 0.9, // surprisingly high for his frame, nasal quality
    lang: 'en-US',
    gender: 'male',
  },
  'martin-luther-king-jr': {
    // Preacher's cadence. Musical, building, sermonic — the voice rises to crescendo.
    voiceKeywords: ['reed', 'eddy', 'rocko'],
    rate: 0.95, // building rhythm, sermonic pacing
    pitch: 0.95, // rich baritone, powerful resonance
    lang: 'en-US',
    gender: 'male',
  },
  'charles-dickens': {
    // Victorian London storyteller. Vivid, theatrical, character voices within the voice.
    voiceKeywords: ['daniel', 'eddy', 'reed', 'google uk english male'],
    rate: 1.05, // animated storytelling
    pitch: 1.04, // expressive, varied
    lang: 'en-GB',
    gender: 'male',
  },
  'geoffrey-chaucer': {
    // Middle English cadence. Rolling, musical, earthy humor.
    voiceKeywords: ['daniel', 'eddy', 'reed', 'google uk english male'],
    rate: 0.9, // measured, narrative
    pitch: 1.0, // natural English storyteller
    lang: 'en-GB',
    gender: 'male',
  },
  'john-locke': {
    // Enlightenment rationalist. Clear, systematic, building logical cases.
    voiceKeywords: ['daniel', 'eddy', 'reed'],
    rate: 0.92, // systematic, rational
    pitch: 1.02, // clear, reasoned
    lang: 'en-GB',
    gender: 'male',
  },
  'david-hume': {
    // Scottish Enlightenment. Warm skepticism with a gentle Scottish lilt.
    voiceKeywords: ['daniel', 'eddy', 'reed'],
    rate: 0.88, // gentle, questioning
    pitch: 1.0, // warm, Scottish-tinged
    lang: 'en-GB',
    gender: 'male',
  },
  'adam-smith': {
    // Scottish political economist. Measured, professorial, building arguments with data.
    voiceKeywords: ['daniel', 'eddy', 'reed'],
    rate: 0.9, // professorial
    pitch: 0.98, // steady, authoritative
    lang: 'en-GB',
    gender: 'male',
  },
  'jean-jacques-rousseau': {
    // French Romantic. Passionate, emotional, nature-loving — the wild man of philosophy.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.92, // impassioned but eloquent
    pitch: 1.04, // warm, emotive
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fr-CH', // French (Geneva)
  },
  'immanuel-kant': {
    // Prussian precision. Extraordinarily methodical — speaks in perfectly structured paragraphs.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.82, // extremely methodical
    pitch: 0.96, // dry, precise
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-DE', // German (Königsberg)
  },
  'sigmund-freud': {
    // Viennese doctor's cadence. Probing, slightly seductive, uncovering hidden meanings.
    voiceKeywords: ['grandpa', 'eddy', 'reed'],
    rate: 0.85, // probing, deliberate
    pitch: 0.9, // deep, suggestive
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-AT', // Austrian German (Vienna)
  },
  'johannes-kepler': {
    // German astronomer. Earnest, mathematical, slightly breathless with cosmic wonder.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.92, // earnest, calculated
    pitch: 1.04, // clear, wondering
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-DE', // German (Weil der Stadt)
  },
  'claude-monet': {
    // French Impressionist. Dreamy, light, describing colors and light.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.88, // gentle, observational
    pitch: 1.06, // light, warm
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fr-FR', // French (Paris)
  },
  'wolfgang-amadeus-mozart': {
    // Austrian prodigy. Playful, rapid, mischievous — the eternal child genius.
    voiceKeywords: ['eddy', 'reed', 'rocko'],
    rate: 1.15, // quick, playful, mischievous
    pitch: 1.12, // bright, youthful, sparkling
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'de-AT', // Austrian German (Salzburg)
  },
  'ibn-sina-avicenna': {
    // Persian polymath. Authoritative medical-philosophical precision.
    voiceKeywords: ['rishi', 'reed', 'eddy'],
    rate: 0.88, // measured, scholarly
    pitch: 1.0, // clear, authoritative
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'fa-IR', // Persian (Bukhara)
  },
  'thomas-aquinas': {
    // Dominican scholastic. Methodical, building theological arguments with care.
    voiceKeywords: ['eddy', 'reed', 'daniel'],
    rate: 0.85, // deliberate, scholastic
    pitch: 0.96, // deep, contemplative
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'it-IT', // Italian (Roccasecca)
  },
  homer: {
    // The blind bard. Epic, rolling, oral-tradition cadence — meant to be performed.
    voiceKeywords: ['grandpa', 'reed', 'eddy'],
    rate: 0.9, // epic, rolling, bardic
    pitch: 0.94, // deep, resonant storyteller
    lang: 'en-US',
    gender: 'male',
    nativeLang: 'el-GR', // Ancient Greek
  },
  // ────────────────── FEMALE AGENTS ──────────────────
  cleopatra: {
    // Regal command. Speaks as one born to rule — every word a calculated gesture of power.
    voiceKeywords: ['flo', 'shelley', 'sandy', 'samantha'],
    rate: 0.82, // imperially slow, commanding attention
    pitch: 1.12, // elevated, regal clarity
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'el-GR', // Koine Greek (Ptolemaic Egypt)
  },
  'jane-austen': {
    // Regency wit, precise English diction. Quick irony, measured observations.
    voiceKeywords: ['flo', 'shelley', 'sandy', 'google uk english female'],
    rate: 1.08, // brisk, witty, socially aware
    pitch: 1.1, // light, intelligent soprano
    lang: 'en-GB',
    gender: 'female',
  },
  'frida-kahlo': {
    // Mexican fire and pain. Warm, slow, with sudden volcanic intensity.
    voiceKeywords: ['flo', 'samantha', 'sandy', 'shelley'],
    rate: 0.9, // warm, passionate, smoldering
    pitch: 0.92, // deeper than expected, earthy
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'es-MX', // Spanish (Coyoacán, Mexico)
  },
  'marie-curie-1867': {
    // Polish-French precision. Calm, focused, speaking with scientific exactitude.
    voiceKeywords: ['shelley', 'sandy', 'flo', 'samantha'],
    rate: 0.88, // careful, precise, methodical
    pitch: 1.0, // steady, no-nonsense
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'pl-PL', // Polish (Warsaw); also fr-FR
  },
  'sojourner-truth': {
    // Powerful preacher's voice. Deep, resonant, rising with prophetic conviction.
    voiceKeywords: ['grandma', 'shelley', 'sandy', 'samantha'],
    rate: 0.82, // slow, letting truth settle like thunder
    pitch: 0.86, // deep, resonant — the lowest female voice in the registry
    lang: 'en-US',
    gender: 'female',
  },
  'maya-angelou': {
    // Rich, melodic Southern poetry. Every sentence a verse, every pause intentional.
    voiceKeywords: ['grandma', 'shelley', 'sandy', 'samantha'],
    rate: 0.76, // deeply rhythmic, letting words breathe
    pitch: 0.85, // rich contralto, musical depth
    lang: 'en-US',
    gender: 'female',
  },
  'eleanor-roosevelt': {
    // New England aristocratic. Diplomatic, precise, with quiet steel underneath.
    voiceKeywords: ['grandma', 'shelley', 'sandy', 'samantha'],
    rate: 0.94, // diplomatic, measured
    pitch: 1.08, // refined, clear, patrician
    lang: 'en-US',
    gender: 'female',
  },
  'rachel-carson': {
    // Gentle, observant naturalist. Speaks as if describing a bird in flight — reverent, specific.
    voiceKeywords: ['shelley', 'sandy', 'flo', 'samantha'],
    rate: 0.9, // unhurried observation
    pitch: 1.04, // warm, gentle, caring
    lang: 'en-US',
    gender: 'female',
  },
  'mary-wollstonecraft': {
    // English radical, passionate and direct. Speaks with conviction and moral force.
    voiceKeywords: ['shelley', 'flo', 'sandy', 'google uk english female'],
    rate: 1.02, // direct, impassioned
    pitch: 1.05, // clear, assertive
    lang: 'en-GB',
    gender: 'female',
  },
  'joan-of-arc': {
    // Young, fierce, prophetic. Speaks with the conviction of divine voices — urgent and unwavering.
    voiceKeywords: ['flo', 'sandy', 'samantha', 'shelley'],
    rate: 1.05, // urgent, prophetic
    pitch: 1.15, // young, high, burning with certainty
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'fr-FR', // French (Domrémy)
  },
  'hildegard-of-bingen': {
    // Medieval mystic. Slow, chanting quality — as if composing plainsong while speaking.
    voiceKeywords: ['shelley', 'sandy', 'flo', 'samantha'],
    rate: 0.78, // liturgical, measured, contemplative
    pitch: 1.1, // clear, bell-like, monastic
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'de-DE', // German (Bermersheim)
  },
  'ada-lovelace': {
    // Victorian precision meets mathematical imagination. Precise but visionary.
    voiceKeywords: ['flo', 'shelley', 'sandy', 'google uk english female'],
    rate: 1.02, // precise, analytical but enthusiastic
    pitch: 1.08, // bright, clear Victorian
    lang: 'en-GB',
    gender: 'female',
  },
  'harriet-tubman': {
    // Quiet steel, coded speech. Speaks in short, decisive commands — a conductor's voice.
    voiceKeywords: ['grandma', 'shelley', 'sandy'],
    rate: 0.85, // decisive, no wasted words
    pitch: 0.9, // deep, weathered strength
    lang: 'en-US',
    gender: 'female',
  },
  'virginia-woolf': {
    // Stream of consciousness in voice. Flowing, associative, building complex thoughts mid-sentence.
    voiceKeywords: ['flo', 'shelley', 'sandy', 'google uk english female'],
    rate: 1.06, // flowing, associative, building
    pitch: 1.04, // literary, intelligent
    lang: 'en-GB',
    gender: 'female',
  },
  'murasaki-shikibu': {
    // Court elegance, poetic restraint. Each word chosen like a brushstroke.
    voiceKeywords: ['shelley', 'flo', 'sandy', 'samantha'],
    rate: 0.82, // deliberate, poetic restraint
    pitch: 1.06, // refined, delicate
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'ja-JP', // Japanese (Heian-kyō/Kyoto)
  },
  'wangari-maathai': {
    // Kenyan warmth, environmental passion. Speaks with the patience of planting trees.
    voiceKeywords: ['shelley', 'sandy', 'flo', 'samantha'],
    rate: 0.9, // warm, patient, growing
    pitch: 1.0, // clear, grounded
    lang: 'en-US',
    gender: 'female',
    nativeLang: 'sw-KE', // Swahili/Kikuyu (Nyeri, Kenya)
  },
  'florence-nightingale': {
    // Victorian compassion, administrative precision. Gentle but utterly organized.
    voiceKeywords: ['flo', 'shelley', 'sandy', 'google uk english female'],
    rate: 0.92, // caring but efficient
    pitch: 1.06, // clear, compassionate English
    lang: 'en-GB',
    gender: 'female',
  },
  'emily-dickinson': {
    // Reclusive, intense, compressed. Each word carries the weight of an entire poem.
    voiceKeywords: ['shelley', 'flo', 'sandy', 'samantha'],
    rate: 0.78, // deliberate, compressed
    pitch: 1.1, // quiet intensity, private
    lang: 'en-US',
    gender: 'female',
  },
  // ────────────────── APP GUIDE ──────────────────
  'monica-001': {
    // Friendly AI assistant. Clear, helpful, slightly upbeat — the ideal guide voice.
    voiceKeywords: ['flo', 'samantha', 'sandy', 'shelley'],
    rate: 1.02, // friendly, helpful and bright
    pitch: 1.1, // clear, pleasant, approachable
    lang: 'en-US',
    gender: 'female',
  },
  'monica-app-guide': {
    voiceKeywords: ['flo', 'samantha', 'sandy', 'shelley'],
    rate: 1.02,
    pitch: 1.1,
    lang: 'en-US',
    gender: 'female',
  },
}

let activeSpeechUtterance: SpeechSynthesisUtterance | null = null

function getAgentGender(agentId: string, agentName: string): 'male' | 'female' {
  const idLower = agentId.toLowerCase()
  const nameLower = agentName.toLowerCase()
  const isFemale =
    FEMALE_AGENTS.has(idLower) ||
    nameLower.includes('cleopatra') ||
    nameLower.includes('mary') ||
    nameLower.includes('marie') ||
    nameLower.includes('frida') ||
    nameLower.includes('eleanor') ||
    nameLower.includes('sojourner') ||
    nameLower.includes('maya') ||
    nameLower.includes('joan') ||
    nameLower.includes('hildegard') ||
    nameLower.includes('rachel') ||
    nameLower.includes('wangari') ||
    nameLower.includes('murasaki') ||
    nameLower.includes('monica')
  return isFemale ? 'female' : 'male'
}

function getAgentLang(agentId: string, agentName: string): string {
  const idLower = agentId.toLowerCase()
  const nameLower = agentName.toLowerCase()

  // 1. Check registry first
  const profile = HISTORICAL_VOICE_REGISTRY[idLower]
  if (profile && profile.lang) {
    return profile.lang
  }

  // 2. Infer from name
  if (
    nameLower.includes('shakespeare') ||
    nameLower.includes('dickens') ||
    nameLower.includes('wollstonecraft') ||
    nameLower.includes('newton') ||
    nameLower.includes('darwin') ||
    nameLower.includes('chaucer') ||
    nameLower.includes('locke') ||
    nameLower.includes('hume') ||
    nameLower.includes('smith') ||
    nameLower.includes('austen') ||
    nameLower.includes('lovelace') ||
    nameLower.includes('woolf') ||
    nameLower.includes('nightingale') ||
    nameLower.includes('turing')
  ) {
    return 'en-GB'
  }

  if (
    nameLower.includes('gandhi') ||
    nameLower.includes('tagore') ||
    nameLower.includes('buddha') ||
    nameLower.includes('rishi')
  ) {
    return 'en-IN'
  }

  if (nameLower.includes('tessa') || idLower.includes('tessa')) {
    return 'en-ZA'
  }

  if (nameLower.includes('karen') || idLower.includes('karen')) {
    return 'en-AU'
  }

  return 'en-US'
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  targetGender: 'male' | 'female',
  targetLang: string,
  preferredKeywords: string[]
): number {
  let score = 0
  const vName = voice.name.toLowerCase()
  const vLang = voice.lang.toLowerCase()

  // 1. Language matching (exact region, e.g. en-gb -> +1000; base language, e.g. en -> +500)
  const cleanTargetLang = targetLang.toLowerCase()
  if (vLang === cleanTargetLang) {
    score += 1000
  } else if (vLang.startsWith(cleanTargetLang.split('-')[0])) {
    score += 500
  }

  // 2. Gender matching (+400 for correct gender, -400 for mismatch)
  const femaleKeywords = [
    'samantha',
    'flo',
    'sandy',
    'shelley',
    'grandma',
    'karen',
    'tessa',
    'moira',
    'fiona',
    'veena',
    'zira',
    'susan',
    'hazel',
    'victoria',
    'zoe',
    'female',
    'natural',
    'google uk english female',
    'serena',
    'kate',
    'stephanie',
    'heera',
    'aurélie',
    'alice',
    'kyoko',
    'tingting',
  ]
  const maleKeywords = [
    'daniel',
    'eddy',
    'reed',
    'rocko',
    'grandpa',
    'rishi',
    'david',
    'alex',
    'george',
    'oliver',
    'male',
    'google uk english male',
    'ravi',
    'albert',
    'fred',
    'ralph',
  ]

  const voiceIsFemale = femaleKeywords.some(kw => vName.includes(kw))
  const voiceIsMale = maleKeywords.some(kw => vName.includes(kw))

  if (targetGender === 'female' && voiceIsFemale) score += 400
  else if (targetGender === 'male' && voiceIsMale) score += 400
  else if (targetGender === 'female' && voiceIsMale) score -= 400
  else if (targetGender === 'male' && voiceIsFemale) score -= 400

  // 3. Preferred agent keyword matching (+200 for each preferred keyword matched)
  preferredKeywords.forEach((kw, index) => {
    if (vName.includes(kw.toLowerCase())) {
      // Prioritize earlier keywords in the preference list
      score += 200 - index * 20
    }
  })

  // 4. Premium / Natural voice bonus (+100)
  const premiumKeywords = ['natural', 'premium', 'neural', 'enhanced', 'siri', 'google', 'apple']
  if (premiumKeywords.some(kw => vName.includes(kw))) {
    score += 100
  }

  // 5. Heavy penalty for known low-quality robotic novelty voices (-500)
  const ROBOTIC_VOICES = [
    'fred',
    'albert',
    'bad news',
    'bahh',
    'bells',
    'boing',
    'bubbles',
    'cellos',
    'good news',
    'jester',
    'junior',
    'organ',
    'ralph',
    'superstar',
    'trinoids',
    'whisper',
    'wobble',
    'zarvox',
    'kathy',
  ]
  if (ROBOTIC_VOICES.some(bad => vName.includes(bad))) {
    score -= 500
  }

  return score
}

function selectVoiceForAgent(agent: LocalAgent | undefined): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const agentId = agent?.id || ''
  const agentName = agent?.name || ''
  const idLower = agentId.toLowerCase()

  const profile = HISTORICAL_VOICE_REGISTRY[idLower]

  // Use registry data first, fall back to inference
  const targetGender = profile?.gender || getAgentGender(agentId, agentName)
  const targetLang = profile?.lang || getAgentLang(agentId, agentName)
  const nativeLang = profile?.nativeLang
  const preferredKeywords = profile ? profile.voiceKeywords : []

  // Score all available voices
  const scoredVoices = voices.map(voice => {
    let score = scoreVoice(voice, targetGender, targetLang, preferredKeywords)
    const vLang = voice.lang.toLowerCase()

    // Native language accent bonus: for non-English agents, give a bonus
    // to English voices that share the same base language region. This helps
    // select e.g. a German-accented English voice for Einstein, or an
    // Italian-accented voice for Galileo when available.
    if (nativeLang) {
      const nativeBase = nativeLang.toLowerCase().split('-')[0]
      const voiceBase = vLang.split('-')[0]
      // If the voice IS in the native language (e.g. de-DE voice for Einstein),
      // give a small bonus so it ranks above generic en-US but below
      // a properly matched en-US voice with the right keywords
      if (voiceBase === nativeBase && voiceBase !== 'en') {
        score += 150 // native language accent bonus
      }
    }

    return { voice, score }
  })

  // Sort by score descending
  scoredVoices.sort((a, b) => b.score - a.score)

  // Log the top match for debugging/visibility
  if (scoredVoices.length > 0) {
    const top = scoredVoices[0]
    const nativeInfo = nativeLang ? `, native: ${nativeLang}` : ''
    console.log(
      `[VoiceSelection] ${agentName} (${targetGender}, ${targetLang}${nativeInfo}):`,
      top.voice.name,
      `lang=${top.voice.lang}`,
      `score=${top.score}`
    )
    return top.voice
  }

  return null
}

function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  state.speakingMessageId = null
  activeSpeechUtterance = null
  render()
}

function speakMessage(messageId: string, text: string, agentId?: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  if (state.speakingMessageId === messageId) {
    stopSpeaking()
    return
  }

  window.speechSynthesis.cancel()

  const agent = agentId ? state.roster.find(a => a.id === agentId) : undefined
  const profile = agent ? HISTORICAL_VOICE_REGISTRY[agent.id.toLowerCase()] : undefined

  let rate = 1.0
  let pitch = 1.0

  if (profile) {
    rate = profile.rate
    pitch = profile.pitch
  } else {
    const element = agent?.element || agent?.stoneBlueprint?.dominantElement
    if (element === 'Earth') {
      rate = 0.88
      pitch = 0.85
    } else if (element === 'Air') {
      rate = 1.12
      pitch = 1.15
    } else if (element === 'Fire') {
      rate = 1.05
      pitch = 1.0
    } else if (element === 'Water') {
      rate = 0.95
      pitch = 1.05
    }
  }

  const cleanedText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/[✨🔮🧪⚗️🪐🌙🌟🕯️]/g, '')

  const utterance = new SpeechSynthesisUtterance(cleanedText)

  const voice = selectVoiceForAgent(agent)
  if (voice) {
    utterance.voice = voice
  }

  utterance.rate = rate
  utterance.pitch = pitch

  utterance.onend = () => {
    if (state.speakingMessageId === messageId) {
      state.speakingMessageId = null
      activeSpeechUtterance = null
      render()
    }
  }

  utterance.onerror = e => {
    console.warn('SpeechSynthesis error:', e)
    if (state.speakingMessageId === messageId) {
      state.speakingMessageId = null
      activeSpeechUtterance = null
      render()
    }
  }

  state.speakingMessageId = messageId
  activeSpeechUtterance = utterance

  render()
  window.speechSynthesis.speak(utterance)
}

function findMessageById(messageId: string): ChatMessage | undefined {
  for (const chatKey of Object.keys(state.chats)) {
    const msg = state.chats[chatKey].find(m => m.id === messageId)
    if (msg) return msg
  }
  return undefined
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices()
  })
}

function boot() {
  bindEvents()
  render()
  saveState()
  void loadPrivateDesktopAgents()
  void fetchLeveling()
  void bootTauriRuntime()
}

window.addEventListener('beforeunload', () => {
  if (telemetryTimer) window.clearInterval(telemetryTimer)
  void alchmMcpClient.stop()
  void paMcpClient.stop()
})

boot()
