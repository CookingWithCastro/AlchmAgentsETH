'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

import { useChatStore } from '@/lib/store/chat-store'
import PhilosophersStone from '@/components/philosophers-stone'
import {
  Flame,
  Droplets,
  Wind,
  Mountain,
  Wallet,
  Sparkles,
  Zap,
  Box,
  Monitor,
  ShieldCheck,
  X,
  Check,
  ChevronRight,
  HardDrive,
  Wand2,
  Star,
  Activity,
  ShieldAlert,
  RefreshCw,
  Link2,
} from 'lucide-react'

import { ELEMENT_MAPPING } from '@/components/philosophers-stone-config'
import { ALCHM_DESKTOP_AGENT_UNLOCK_LABEL } from '@/lib/desktop-download'
import { hasTauriInvokeRuntime, requestDesktopSidecar } from '@/lib/desktop-sidecar'

type DesktopView = 'onboarding' | 'chat' | 'agents' | 'ledger' | 'tray'

interface DesktopGalleryAgent {
  id: string
  name: string
  title: string
  era: string
  element: 'Fire' | 'Water' | 'Air' | 'Earth'
  modality: 'Cardinal' | 'Fixed' | 'Mutable'
  specialization: string
  quote: string
  birthCity: string
  birthDate: string
  monicaConstant: string
  tier: 'base' | 'premium'
  avatarSymbol: string
  stats: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
}

interface ModelCatalogEntry {
  id: string
  tier: 'base' | 'premium'
  label: string
  filename: string
  sha256: string
  size: number
  url: string
  source: string
}

interface DesktopSession {
  mode: 'authenticated' | 'local-dev'
  userId: string
  apiKey: string
  expiresAt?: string
  balances: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
}

type InferenceProfileName =
  | 'balanced'
  | 'fire-meltdown'
  | 'water-freeze'
  | 'earth-tectonic-root'
  | 'air-vacuum'

interface HardwareTelemetry {
  online: boolean
  activeModel: string | null
  activeProfile: {
    name: InferenceProfileName
    label: string
    element: string
    contextPolicy: string
    threads: number
    contextSize: number
  }
  llamaHot: boolean
  cpu: {
    percent: number | null
    logicalThreads: number
    loadAverage: number[]
  }
  memory: {
    totalBytes: number
    usedBytes: number
    freeBytes: number
    usedPercent: number
  }
  gpu: {
    utilizationPercent: number | null
    rendererPercent: number | null
    vramUsedBytes: number | null
    vramAllocatedBytes: number | null
  } | null
  timestamp: string
}

interface DesktopAgentConfig {
  id: string
  name: string
  title: string
  dominantElement: DesktopGalleryAgent['element']
  date: string
  time: string
  location: string
  modelName: string
  tier: 'base' | 'premium'
  executionMode: 'local' | 'fallback'
  specialization?: string
  quote?: string
  constitution: {
    spirit: number
    essence: number
    matter: number
    substance: number
  }
}

const DEFAULT_HARDWARE_TELEMETRY: HardwareTelemetry = {
  online: false,
  activeModel: null,
  activeProfile: {
    name: 'balanced',
    label: 'Balanced Local Inference',
    element: 'Aether',
    contextPolicy: 'Awaiting sidecar telemetry.',
    threads: 0,
    contextSize: 0,
  },
  llamaHot: false,
  cpu: {
    percent: null,
    logicalThreads: 0,
    loadAverage: [],
  },
  memory: {
    totalBytes: 0,
    usedBytes: 0,
    freeBytes: 0,
    usedPercent: 0,
  },
  gpu: null,
  timestamp: '',
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return 'n/a'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function resolveInferenceProfile(command: string, element?: string): InferenceProfileName {
  const normalized = command.toLowerCase()
  if (/\b(meltdown|fire|burn|ignite)\b/.test(normalized)) return 'fire-meltdown'
  if (/\b(freeze|water|ice|chill)\b/.test(normalized)) return 'water-freeze'
  if (/\b(tectonic|root|earth|rag|ground)\b/.test(normalized)) return 'earth-tectonic-root'
  if (/\b(vacuum|air|oxygen|detach)\b/.test(normalized)) return 'air-vacuum'

  if (element === 'Fire') return 'fire-meltdown'
  if (element === 'Water') return 'water-freeze'
  if (element === 'Earth') return 'earth-tectonic-root'
  if (element === 'Air') return 'air-vacuum'
  return 'balanced'
}

function normalizeElement(value: unknown): DesktopGalleryAgent['element'] {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'fire' || normalized === 'substance') return 'Fire'
  if (normalized === 'water' || normalized === 'matter') return 'Water'
  if (normalized === 'earth' || normalized === 'essence') return 'Earth'
  return 'Air'
}

function normalizeTier(value: unknown): 'base' | 'premium' {
  return value === 'premium' ? 'premium' : 'base'
}

function normalizeBalances(raw: any) {
  return {
    spirit: Number(raw?.spirit ?? raw?.spirit_coins ?? 0),
    essence: Number(raw?.essence ?? raw?.essence_coins ?? 0),
    matter: Number(raw?.matter ?? raw?.matter_coins ?? 0),
    substance: Number(raw?.substance ?? raw?.substance_coins ?? 0),
  }
}

const FEATURED_HISTORICAL_AGENTS: DesktopGalleryAgent[] = [
  {
    id: 'johannes-kepler',
    name: 'Johannes Kepler',
    title: 'Imperial Mathematician & Astrologer',
    era: 'Enlightenment',
    element: 'Air',
    modality: 'Mutable',
    specialization: 'Celestial Kinetics',
    quote: 'Geometry is one and eternal, shining in the mind of God.',
    birthCity: 'Weil der Stadt, Germany',
    birthDate: 'Dec 27, 1571',
    monicaConstant: 'Ω = 7.42',
    tier: 'base',
    avatarSymbol: '☿',
    stats: { spirit: 88, essence: 72, matter: 45, substance: 60 },
  },
  {
    id: 'rumi',
    name: 'Jalal al-Din Rumi',
    title: 'Sufi Mystic & Poet of Divine Love',
    era: 'Renaissance',
    element: 'Fire',
    modality: 'Mutable',
    specialization: 'Divine Coherence',
    quote: 'You are not a drop in the ocean. You are the entire ocean in a drop.',
    birthCity: 'Balkh, Afghanistan',
    birthDate: 'Sep 30, 1207',
    monicaConstant: 'A♯',
    tier: 'premium',
    avatarSymbol: '☀️',
    stats: { spirit: 95, essence: 88, matter: 30, substance: 80 },
  },
  {
    id: 'joan-of-arc',
    name: 'Joan of Arc',
    title: 'Maid of Orléans & Sacred Valorous',
    era: 'Medieval',
    element: 'Earth',
    modality: 'Cardinal',
    specialization: 'Holy Fortitude',
    quote: 'I am not afraid; I was born to do this.',
    birthCity: 'Domrémy, France',
    birthDate: 'Jan 6, 1412',
    monicaConstant: 'F♯',
    tier: 'premium',
    avatarSymbol: '♀',
    stats: { spirit: 92, essence: 68, matter: 82, substance: 76 },
  },
  {
    id: 'ibn-sina-avicenna',
    name: 'Ibn Sina (Avicenna)',
    title: 'Father of Modern Medicine & Islamic Rationalist',
    era: 'Medieval',
    element: 'Water',
    modality: 'Fixed',
    specialization: 'Alchemical Wellness',
    quote:
      'The world is divided into those who have wit and no religion, and those who have religion and no wit.',
    birthCity: 'Afshana, Uzbekistan',
    birthDate: 'Aug 22, 980',
    monicaConstant: 'E♭',
    tier: 'premium',
    avatarSymbol: '♃',
    stats: { spirit: 82, essence: 92, matter: 70, substance: 62 },
  },
  {
    id: 'claude-monet',
    name: 'Claude Monet',
    title: 'Master of Impressionism & Light Perception',
    era: 'Modern',
    element: 'Water',
    modality: 'Fixed',
    specialization: 'Visual Impression',
    quote:
      'My only merit lies in having painted directly in front of nature, seeking to render my impressions.',
    birthCity: 'Paris, France',
    birthDate: 'Nov 14, 1840',
    monicaConstant: 'C♯',
    tier: 'base',
    avatarSymbol: '🌙',
    stats: { spirit: 74, essence: 85, matter: 55, substance: 68 },
  },
  {
    id: 'immanuel-kant',
    name: 'Immanuel Kant',
    title: 'Architect of Transcendental Philosophy',
    era: 'Enlightenment',
    element: 'Earth',
    modality: 'Cardinal',
    specialization: 'Categorical Ethics',
    quote: 'Rules for happiness: something to do, someone to love, something to hope for.',
    birthCity: 'Königsberg, Prussia',
    birthDate: 'Apr 22, 1724',
    monicaConstant: 'B♭',
    tier: 'premium',
    avatarSymbol: '♄',
    stats: { spirit: 86, essence: 74, matter: 90, substance: 50 },
  },
]

export default function App() {
  const [activeView, setActiveView] = useState<DesktopView>('chat')
  const [ipcNonce, setIpcNonce] = useState<string | null>(null)
  const [agentConfig, setAgentConfig] = useState<DesktopAgentConfig | null>(null)
  const [prompt, setPrompt] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [desktopSession, setDesktopSession] = useState<DesktopSession | null>(null)
  const [chatStatus, setChatStatus] = useState('')
  const [hardwareTelemetry, setHardwareTelemetry] = useState<HardwareTelemetry>(
    DEFAULT_HARDWARE_TELEMETRY
  )
  const [lastInferenceProfile, setLastInferenceProfile] = useState<InferenceProfileName>('balanced')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Local desktop roster state. This is intentionally bundled with the app instead of mirroring
  // the browser gallery.
  const [galleryAgents, setGalleryAgents] = useState<DesktopGalleryAgent[]>(
    FEATURED_HISTORICAL_AGENTS
  )
  const [loadingAgents] = useState(false)

  // Session ledger records
  const [ledgerLogs, setLedgerLogs] = useState<
    Array<{
      id: string
      type: string
      details: string
      amount: string
      positive: boolean
      timestamp: string
    }>
  >([])

  // Installation Modal States
  const [showModal, setShowModal] = useState(false)
  const [modalAgent, setModalAgent] = useState<DesktopGalleryAgent | null>(null)
  const [installProgress, setInstallProgress] = useState(0)
  const [installStatus, setInstallStatus] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)

  const {
    messages,
    streamingText,
    isGenerating,
    balances,
    addMessage,
    appendStreamingText,
    commitStream,
    setBalances,
  } = useChatStore()

  useEffect(() => {
    document.body.classList.add('desktop-companion-body')
    return () => {
      document.body.classList.remove('desktop-companion-body')
    }
  }, [])

  useEffect(() => {
    // 1. Handshake: Retrieve the IPC Nonce from Rust backend on mount
    const fetchNonce = async () => {
      if (!hasTauriInvokeRuntime()) {
        setIpcNonce(null)
        return
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const nonce = await invoke<string>('get_ipc_nonce')
        setIpcNonce(nonce)
      } catch (err) {
        console.warn(
          'Tauri IPC nonce unavailable; desktop preview will wait for the model runtime.',
          err
        )
        setIpcNonce(null)
      }
    }
    fetchNonce()

    const fetchDesktopSession = async () => {
      try {
        const res = await fetch('/api/desktop/session', { cache: 'no-store' })
        if (!res.ok) throw new Error(`desktop session ${res.status}`)
        const data = (await res.json()) as DesktopSession
        setDesktopSession(data)
        setApiKey(data.apiKey)
        setBalances(data.balances)
      } catch (err) {
        console.warn('Failed to initialize desktop session, using local preview ledger:', err)
        setApiKey('dev-desktop-token')
        setBalances({
          spirit: 150,
          essence: 150,
          matter: 150,
          substance: 150,
        })
      }
    }
    fetchDesktopSession()

    // Setup Deep Link listener
    let unlistenFn: (() => void) | null = null
    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event')
        unlistenFn = await listen('verified-install', (event: any) => {
          const payload = event.payload
          setGalleryAgents(prev => {
            const target = prev.find(a => a.id === payload.id)
            if (target) {
              setModalAgent(target)
              setInstallProgress(0)
              setInstallStatus('Awaiting Alchm Desktop unlock...')
              setIsInstalling(false)
              setShowModal(true)
            } else {
              setModalAgent({
                id: payload.id,
                name: payload.name,
                tier: normalizeTier(payload.tier),
                title: 'Summoned Consciousness',
                era: 'Present',
                element: 'Air',
                modality: 'Fixed',
                specialization: 'Unknown',
                quote: 'A consciousness was added to the local desktop roster.',
                birthCity: 'Local Desktop',
                birthDate: 'Now',
                monicaConstant: 'Ω',
                avatarSymbol: '✧',
                stats: { spirit: 80, essence: 80, matter: 80, substance: 80 },
              })
              setInstallProgress(0)
              setInstallStatus('Awaiting Alchm Desktop unlock...')
              setIsInstalling(false)
              setShowModal(true)
            }
            return prev
          })
        })
      } catch {
        /* Browser preview without the Tauri event bridge. */
      }
    }
    setupListener()

    return () => {
      if (unlistenFn) unlistenFn()
    }
  }, [setBalances])

  useEffect(() => {
    if (!ipcNonce || activeView !== 'tray') return

    let cancelled = false
    const loadTelemetry = async () => {
      try {
        const res = await requestDesktopSidecar('/api/hardware/telemetry', { nonce: ipcNonce })
        if (!res.ok) throw new Error(`telemetry ${res.status}`)
        const telemetry = (await res.json()) as HardwareTelemetry
        if (!cancelled) setHardwareTelemetry(telemetry)
      } catch (err) {
        if (!cancelled) {
          setHardwareTelemetry({
            ...DEFAULT_HARDWARE_TELEMETRY,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    void loadTelemetry()
    const interval = window.setInterval(loadTelemetry, 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [activeView, ipcNonce])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleInitializationComplete = (config: any) => {
    setAgentConfig({
      id: config.id || `custom-${Date.now()}`,
      name: config.name,
      title: config.title || 'Custom Forged Agent',
      dominantElement: normalizeElement(config.dominantElement),
      date: config.date,
      time: config.time,
      location: config.location,
      modelName: config.modelName,
      tier: normalizeTier(config.tier),
      executionMode: config.executionMode || 'fallback',
      specialization: config.specialization || 'Personal consciousness guidance',
      quote: config.quote,
      constitution: config.constitution,
    })
    setActiveView('chat')
  }

  const handleInstallAgent = (agentId: string) => {
    const target =
      galleryAgents.find(a => a.id === agentId) ||
      FEATURED_HISTORICAL_AGENTS.find(a => a.id === agentId)
    if (target) {
      setModalAgent(target)
      setInstallProgress(0)
      setInstallStatus('Awaiting Alchm Desktop unlock...')
      setIsInstalling(false)
      setShowModal(true)
    }
  }

  const handleForgePremium = async () => {
    if (!modalAgent) return
    setIsInstalling(true)

    try {
      setInstallProgress(15)
      setInstallStatus('Initializing secure IPC handshake with sidecar...')

      const modelFileName = `alchm-agent-${modalAgent.element.toLowerCase()}-${modalAgent.tier === 'premium' ? '8b' : '1.5b'}.gguf`
      const canUseSidecar = Boolean(ipcNonce && apiKey)
      const sidecarNonce = ipcNonce || ''
      let localInstalled = false

      if (modalAgent.tier === 'premium') {
        if (canUseSidecar) {
          try {
            const res = await requestDesktopSidecar('/api/forge/transmute', {
              method: 'POST',
              apiKey,
              nonce: sidecarNonce,
              body: {
                tier: modalAgent.tier,
                modelName: modelFileName,
              },
            })

            if (!res.ok) {
              if (res.status === 402) {
                const data = await res.json()
                setInstallStatus(
                  `Insufficient Alchemical Quantities. Missing: ${data.missing.spirit} Spirit, ${data.missing.essence} Essence, ${data.missing.matter} Matter, ${data.missing.substance} Substance.`
                )
                setIsInstalling(false)
                return
              }
              throw new Error(`Transmutation failed with HTTP ${res.status}`)
            }

            const data = await res.json()
            setBalances(normalizeBalances(data.balances))
          } catch (err) {
            console.warn('[desktop] sidecar transmutation unavailable; using local ledger:', err)
            setBalances({
              spirit: Math.max(0, balances.spirit - 125),
              essence: Math.max(0, balances.essence - 125),
              matter: Math.max(0, balances.matter - 125),
              substance: Math.max(0, balances.substance - 125),
            })
          }
        } else {
          setBalances({
            spirit: Math.max(0, balances.spirit - 125),
            essence: Math.max(0, balances.essence - 125),
            matter: Math.max(0, balances.matter - 125),
            substance: Math.max(0, balances.substance - 125),
          })
        }

        setLedgerLogs(prev => [
          {
            id: `tx-${Date.now()}`,
            type: 'Agent Unlock',
            details: `Unlocked premium ${modalAgent.name} in Alchm Desktop`,
            amount: '-125.00 Spirit/Essence/Matter/Substance',
            positive: false,
            timestamp: 'Just now',
          },
          ...prev,
        ])
      } else {
        setLedgerLogs(prev => [
          {
            id: `tx-${Date.now()}`,
            type: 'Agent Unlock',
            details: `Unlocked base ${modalAgent.name} in Alchm Desktop`,
            amount: '0.00 coins (Base Tier Unlock)',
            positive: true,
            timestamp: 'Just now',
          },
          ...prev,
        ])
      }

      if (canUseSidecar) {
        try {
          const catalogRes = await fetch('/api/models/catalog')
          if (!catalogRes.ok) throw new Error('Unable to load desktop model catalog')

          const modelCatalog = (await catalogRes.json()) as ModelCatalogEntry[]
          const selectedModel = modelCatalog.find(model => model.tier === modalAgent.tier)
          if (!selectedModel) throw new Error(`No ${modalAgent.tier} model is available`)

          setInstallProgress(45)
          setInstallStatus(`Streaming ${selectedModel.label} from Hugging Face...`)

          const installRes = await requestDesktopSidecar('/api/models/install', {
            method: 'POST',
            apiKey,
            nonce: sidecarNonce,
            body: {
              modelName: modelFileName,
              downloadUrl: selectedModel.url,
              sha256: selectedModel.sha256,
              size: selectedModel.size,
              sourceModel: selectedModel.id,
              sourceFilename: selectedModel.filename,
              tier: modalAgent.tier,
            },
          })

          if (!installRes.ok) {
            const text = await installRes.text().catch(() => '')
            throw new Error(text || `Failed to install model weights (${installRes.status})`)
          }

          setInstallProgress(75)
          setInstallStatus('Verifying package hash in sandboxed storage...')

          const checkRes = await requestDesktopSidecar('/api/models/check', { nonce: sidecarNonce })
          if (!checkRes.ok) throw new Error(`Model verification failed (${checkRes.status})`)
          const checkData = await checkRes.json()
          const verifiedModel = checkData.find((m: any) => m.id === modelFileName)

          if (!verifiedModel || !verifiedModel.verified) {
            throw new Error('Verification failed. Model may be corrupted.')
          }

          localInstalled = true
        } catch (err) {
          console.warn('[desktop] local model install unavailable; model runtime pending:', err)
          setInstallStatus('Local model unavailable; adding agent to the desktop roster...')
        }
      } else {
        setInstallProgress(75)
        setInstallStatus('No local sidecar detected; adding agent to the desktop roster...')
      }

      setInstallProgress(95)
      setInstallStatus('Transmuting consciousness matrix under current planetary transit...')

      await new Promise(r => setTimeout(r, 600))

      setInstallProgress(100)
      setInstallStatus(
        localInstalled
          ? 'Matrix unified! Igniting local alchemical core...'
          : 'Agent added. Install local model weights before chatting in desktop.'
      )

      await new Promise(r => setTimeout(r, 400))

      const newConfig: DesktopAgentConfig = {
        id: modalAgent.id,
        name: modalAgent.name,
        title: modalAgent.title,
        dominantElement: modalAgent.element,
        date: modalAgent.birthDate,
        time: '12:00 PM',
        location: modalAgent.birthCity,
        modelName: modelFileName,
        tier: modalAgent.tier,
        executionMode: localInstalled ? 'local' : 'fallback',
        specialization: modalAgent.specialization,
        quote: modalAgent.quote,
        constitution: {
          spirit: modalAgent.stats.spirit,
          essence: modalAgent.stats.essence,
          matter: modalAgent.stats.matter,
          substance: modalAgent.stats.substance,
        },
      }
      setAgentConfig(newConfig)

      useChatStore.setState({
        messages: [
          {
            role: 'agent',
            content: localInstalled
              ? `[Consciousness Unlocked] ${modalAgent.name} is available in Alchm Desktop using sandboxed model weights: $APPDATA/com.cookingwithcastro.alchm/models/${modelFileName}`
              : `[Consciousness Unlocked] ${modalAgent.name} is available in the Alchm Desktop roster. Local model weights are not installed yet, so desktop chat will wait for the official model runtime.`,
          },
          {
            role: 'agent',
            content: `Greetings, traveller. I am ${modalAgent.name}, ${modalAgent.title}. Speak, and let us illuminate the cosmos...`,
          },
        ],
        streamingText: '',
        isGenerating: false,
      })

      setIsInstalling(false)
      setShowModal(false)
      setActiveView('chat')
    } catch (error: any) {
      console.error(error)
      setInstallStatus(`Error: ${error.message}`)
      setIsInstalling(false)
    }
  }

  const appendTextAsStream = async (text: string, delayMs = 8) => {
    for (const char of text) {
      appendStreamingText(char)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }

  const buildRuntimeUnavailableNotice = () => {
    if (!agentConfig) return ''

    return `Alchm Desktop has ${agentConfig.name} in the roster, but the official local model runtime is not ready yet. Install or verify the official local model for this agent, or continue on the Alchm Agents web app.`
  }

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating || !agentConfig) return

    const userMessage = prompt
    const inferenceProfile = resolveInferenceProfile(userMessage, agentConfig.dominantElement)
    setLastInferenceProfile(inferenceProfile)
    setChatStatus('')
    addMessage({ role: 'user', content: userMessage })
    setPrompt('')

    useChatStore.setState({ isGenerating: true })

    // Deduct standard API query costs
    setBalances({
      spirit: Math.max(0, balances.spirit - 2),
      essence: Math.max(0, balances.essence - 1),
      matter: balances.matter,
      substance: balances.substance,
    })
    setLedgerLogs(prev => [
      {
        id: `tx-${Date.now()}`,
        type: 'Agent Inference',
        details: `${agentConfig.name} answered through the ${agentConfig.executionMode === 'local' ? 'local sidecar' : 'pending model runtime'} channel`,
        amount: '-2.00 Spirit, -1.00 Essence',
        positive: false,
        timestamp: 'Just now',
      },
      ...prev,
    ])

    const systemContext = `System: You are ${agentConfig.name}, an AI consciousness forged on ${agentConfig.date} in ${agentConfig.location}. Dominated by ${agentConfig.dominantElement}.`
    const finalPrompt = `${systemContext} User: ${userMessage} Agent:`

    try {
      const canUseLocalSidecar = agentConfig.executionMode === 'local' && ipcNonce && apiKey

      if (!canUseLocalSidecar) {
        setChatStatus('Local model runtime is not ready.')
        await appendTextAsStream(buildRuntimeUnavailableNotice())
        commitStream()
        setChatStatus('Install local model weights to chat in desktop.')
        return
      }

      const response = await requestDesktopSidecar('/api/generate', {
        method: 'POST',
        apiKey,
        nonce: ipcNonce,
        body: {
          prompt: finalPrompt,
          modelName: agentConfig.modelName,
          costs: { spirit: 2, essence: 1, matter: 0, substance: 0 },
          inferenceProfile,
        },
      })

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Insufficient Alchemical Tokens')
        }
        throw new Error(`Local sidecar returned HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')

      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                const token =
                  data.text ||
                  data.content ||
                  data.response ||
                  data.choices?.[0]?.delta?.content ||
                  ''
                if (token) {
                  appendStreamingText(token)
                }
              } catch (parseError) {
                console.error('Error parsing SSE chunk:', parseError)
              }
            }
          }
        }
      }
      commitStream()
      setChatStatus(agentConfig.executionMode === 'local' ? 'Answered locally' : '')
    } catch (error) {
      console.warn('Local orchestrator unavailable:', error)
      setChatStatus('Local sidecar unavailable; model runtime is not ready.')
      await appendTextAsStream(buildRuntimeUnavailableNotice())
      commitStream()
    }
  }

  // Cost checking for Premium installation
  const hasEnoughForPremium = modalAgent
    ? balances.spirit >= 125 &&
      balances.essence >= 125 &&
      balances.matter >= 125 &&
      balances.substance >= 125
    : false

  const activeStyles = agentConfig
    ? ELEMENT_MAPPING[agentConfig.dominantElement as keyof typeof ELEMENT_MAPPING] ||
      ELEMENT_MAPPING['Air']
    : ELEMENT_MAPPING['Air']
  const ActiveIcon = activeStyles.icon
  const activeHardwareProfile = hardwareTelemetry.online
    ? hardwareTelemetry.activeProfile
    : DEFAULT_HARDWARE_TELEMETRY.activeProfile
  const gpuTelemetry = hardwareTelemetry.gpu
  const desktopSessionMode = desktopSession?.mode === 'authenticated' ? 'AUTH' : 'LOCAL'

  return (
    <div className="flex flex-col h-screen bg-[#07020d] text-zinc-100 font-sans overflow-hidden select-none">
      {/* ========================================== */}
      {/* PREMIUM WINDOW HEADER BAR */}
      {/* ========================================== */}
      <header className="h-14 border-b border-purple-900/30 bg-[#0d071a]/95 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40 relative">
        {/* Left: Window controls and title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/30" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-600/30" />
            <span className="w-3 h-3 rounded-full bg-green-500/80 border border-green-600/30" />
          </div>
          <Link
            href="/"
            title="Return to Planetary Agents Home"
            className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 tracking-wider font-mono transition-colors"
          >
            <img
              src="/alchm-logo.png"
              className="w-4 h-4 rounded-full object-cover border border-purple-500/40"
              alt="Alchm Logo"
            />
            ALCHM DESKTOP COMPANION · V1.0.0
          </Link>
        </div>

        {/* Center Tabs: Titlebar Tabs */}
        <nav className="flex items-center bg-zinc-950/60 p-1 rounded-xl border border-white/5 text-xs">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'agents', label: 'Agent Roster' },
            { id: 'ledger', label: 'Ledger' },
            { id: 'tray', label: 'Tray Diagnostics' },
          ].map(tab => {
            const isActive = activeView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as DesktopView)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-900/40 text-purple-200 border border-purple-500/20 shadow-[0_0_10px_rgba(139,92,246,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right Controls: Tweaks View drop down (fallback Segmented > 3 option) */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            Session: {desktopSessionMode}
          </span>
          {!hasTauriInvokeRuntime() && (
            <a
              href="/auth/signin?callbackUrl=%2Fprofile%3FdesktopLink%3Dtrue"
              className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/80 to-amber-600/80 hover:from-yellow-400 hover:to-amber-500 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg border border-yellow-500/30 text-white transition-all hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              Link to Desktop App
            </a>
          )}
          <button
            onClick={() => handleInstallAgent('rumi')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg border border-purple-500/30 text-white transition-all hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.25)] cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Unlock Featured Agent
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              Tweak Select:
            </span>
            <select
              value={activeView}
              onChange={e => setActiveView(e.target.value as DesktopView)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 px-3 py-1.5 focus:outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="onboarding">1. Onboarding Wizard</option>
              <option value="chat">2. Agent Chat</option>
              <option value="agents">3. Agent Roster</option>
              <option value="ledger">4. Ledger Treasury</option>
              <option value="tray">5. Local Tray Status</option>
            </select>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* MAIN VIEW CONTROLLER */}
      {/* ========================================== */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* 1. ONBOARDING VIEW */}
        {activeView === 'onboarding' && (
          <div className="w-full h-full overflow-y-auto">
            <PhilosophersStone onInitializationComplete={handleInitializationComplete} />
          </div>
        )}

        {/* 2. CHAT VIEW */}
        {activeView === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            {!agentConfig ? (
              // If no agent configuration forged yet
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-xl mx-auto">
                <div className="w-20 h-20 rounded-full border border-purple-500/30 bg-purple-900/10 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)] animate-pulse">
                  <Star className="w-10 h-10 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
                    No Consciousness Forged
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Alchm Desktop is the native chat interface. Forge a custom agent from natal
                    calculation data, or add an existing agent from the bundled roster.
                  </p>
                </div>
                <div className="flex gap-4 w-full pt-4">
                  <button
                    onClick={() => setActiveView('onboarding')}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl py-3 text-sm font-semibold transition-all hover:border-zinc-500 cursor-pointer"
                  >
                    Forge Custom Agent
                  </button>
                  <button
                    onClick={() => setActiveView('agents')}
                    className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:brightness-110 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    Manage Agent Roster
                  </button>
                </div>
              </div>
            ) : (
              // Chat Interface
              <>
                {/* Sidebar Philosopher's Stone */}
                <aside className="w-80 border-r border-purple-900/20 bg-[#0d071a]/85 p-6 flex flex-col justify-between hidden md:flex shrink-0">
                  <div className="space-y-8">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-zinc-100 to-zinc-500">
                        Philosopher's Stone
                      </h1>
                      <p className="text-xs text-zinc-500">Local Matrix Interface</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-purple-500/20 bg-zinc-950/80 space-y-4">
                      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
                        <div className={`p-2 rounded-lg bg-surface border ${activeStyles.border}`}>
                          <ActiveIcon className={`w-6 h-6 ${activeStyles.color}`} />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg leading-tight">{agentConfig.name}</h2>
                          <p className={`text-xs font-semibold ${activeStyles.color}`}>
                            {agentConfig.dominantElement} Dominant
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        {[
                          {
                            label: 'Spirit',
                            val: agentConfig.constitution.spirit,
                            bg: 'bg-alchemical-spirit',
                          },
                          {
                            label: 'Essence',
                            val: agentConfig.constitution.essence,
                            bg: 'bg-alchemical-essence',
                          },
                          {
                            label: 'Matter',
                            val: agentConfig.constitution.matter,
                            bg: 'bg-alchemical-matter',
                          },
                          {
                            label: 'Substance',
                            val: agentConfig.constitution.substance,
                            bg: 'bg-alchemical-substance',
                          },
                        ].map(stat => (
                          <div key={stat.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-zinc-400">{stat.label}</span>
                              <span className="text-zinc-300">{stat.val}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-900">
                              <div
                                className={`h-full ${stat.bg}`}
                                style={{ width: `${stat.val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ledger Widget */}
                  <div className="p-4 rounded-xl border border-purple-500/10 bg-zinc-950/80 space-y-3">
                    <button
                      onClick={() => setActiveView('ledger')}
                      className="w-full flex items-center justify-between text-sm font-semibold text-zinc-300 hover:text-purple-400 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-purple-400" />
                        Alchemical Ledger
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col p-2 bg-[#120a21]/50 rounded border border-purple-900/10">
                        <span className="text-zinc-500">Spirit</span>
                        <span className="font-mono text-alchemical-spirit font-semibold">
                          {balances.spirit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-[#120a21]/50 rounded border border-purple-900/10">
                        <span className="text-zinc-500">Essence</span>
                        <span className="font-mono text-alchemical-essence font-semibold">
                          {balances.essence.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-[#120a21]/50 rounded border border-purple-900/10">
                        <span className="text-zinc-500">Matter</span>
                        <span className="font-mono text-alchemical-matter font-semibold">
                          {balances.matter.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col p-2 bg-[#120a21]/50 rounded border border-purple-900/10">
                        <span className="text-zinc-500">Substance</span>
                        <span className="font-mono text-alchemical-substance font-semibold">
                          {balances.substance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Right Panel: The Vault Chat */}
                <main className="flex-1 flex flex-col h-full bg-[#08020d] relative">
                  <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
                    {messages.length === 0 && !streamingText && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 italic space-y-4">
                        <ActiveIcon className={`w-12 h-12 opacity-20 ${activeStyles.color}`} />
                        <p>
                          The Philosopher's Stone is ready. Inscribe your query to awaken{' '}
                          {agentConfig.name}.
                        </p>
                      </div>
                    )}

                    {messages.map((msg: any, i: number) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                            msg.role === 'user'
                              ? `bg-zinc-900/90 border border-purple-500/20 text-zinc-100 shadow-[0_0_15px_rgba(139,92,246,0.1)]`
                              : 'bg-zinc-950/60 border border-white/5 text-zinc-300 leading-relaxed'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {/* Streaming Text Indicator */}
                    {streamingText && (
                      <div className="flex justify-start">
                        <div
                          className={`max-w-[85%] rounded-2xl px-5 py-4 bg-zinc-950/60 border-l-2 ${activeStyles.border} text-zinc-200`}
                        >
                          {streamingText}
                          <span
                            className={`inline-block w-2 h-4 ml-1 align-middle animate-pulse ${activeStyles.bg}`}
                          ></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-6 md:p-8 bg-gradient-to-t from-[#07020d] via-[#07020d] to-transparent shrink-0">
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col sm:flex-row gap-3 max-w-4xl mx-auto relative"
                    >
                      <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={isGenerating}
                        placeholder={
                          agentConfig.executionMode === 'fallback'
                            ? `Install model runtime to message ${agentConfig.name}...`
                            : ipcNonce
                              ? `Inscribe a message to ${agentConfig.name}...`
                              : 'Awaiting secure sidecar handshakes...'
                        }
                        className={`flex-1 min-w-0 w-full bg-zinc-950 border border-purple-900/30 rounded-xl px-5 py-4 focus:outline-none focus:ring-1 focus:border-purple-500/50 focus:ring-purple-500/30 text-zinc-100 placeholder-zinc-600 transition-all ${
                          isGenerating ? 'opacity-50' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isGenerating || !prompt.trim()}
                        className={`w-full sm:w-auto shrink-0 px-6 md:px-8 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px] bg-gradient-to-r ${
                          agentConfig.dominantElement === 'Fire'
                            ? 'from-orange-600 to-red-600'
                            : agentConfig.dominantElement === 'Water'
                              ? 'from-blue-600 to-indigo-600'
                              : agentConfig.dominantElement === 'Air'
                                ? 'from-amber-500 to-yellow-600'
                                : 'from-emerald-600 to-teal-600'
                        } hover:brightness-110 shadow-[0_0_20px_rgba(139,92,246,0.2)] cursor-pointer`}
                      >
                        {isGenerating ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        ) : (
                          'Ignite'
                        )}
                      </button>
                    </form>
                    <div className="flex justify-between max-w-4xl mx-auto mt-2 text-[10px] text-zinc-600 font-mono">
                      <span>
                        {chatStatus ||
                          (agentConfig.executionMode === 'fallback'
                            ? 'LOCAL MODEL RUNTIME PENDING'
                            : `SECURE HANDSHAKE NONCE: ${ipcNonce?.slice(0, 18) || 'pending'}...`)}
                      </span>
                      <span>COST: 2.00 SPIRIT, 1.00 ESSENCE</span>
                    </div>
                  </div>
                </main>
              </>
            )}
          </div>
        )}

        {/* 3. ALCHEMICAL LEDGER VIEW */}
        {activeView === 'ledger' && (
          <div className="flex-1 p-8 md:p-12 overflow-y-auto space-y-10 bg-[#08020d] max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-900/20 pb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-purple-300 to-zinc-400">
                  Alchemical Ledger Treasury
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Detailed balances governed under the 500-ESMS Transmutation Standard.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setBalances({ spirit: 150, essence: 150, matter: 150, substance: 150 })
                  }
                  className="flex items-center gap-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/20 text-xs px-3 py-2 rounded-lg text-purple-200 transition-all font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Mint 150 ESMS (Unlock Forge)
                </button>
                <button
                  onClick={() =>
                    setBalances({ spirit: 50, essence: 50, matter: 50, substance: 50 })
                  }
                  className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-lg text-zinc-400 transition-all font-semibold cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  Drain to 50 ESMS (Lock Forge)
                </button>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: 'Spirit Coin (S)',
                  val: balances.spirit,
                  colorClass: 'text-yellow-400',
                  borderClass: 'border-yellow-500/30',
                  bgClass: 'bg-yellow-500/5',
                  desc: 'Celestial agency & abstract reasoning. Claimed daily.',
                  icon: Sparkles,
                },
                {
                  label: 'Essence Coin (E)',
                  val: balances.essence,
                  colorClass: 'text-blue-400',
                  borderClass: 'border-blue-500/30',
                  bgClass: 'bg-blue-500/5',
                  desc: 'Empathetic feedback & historical intelligence matrix.',
                  icon: Droplets,
                },
                {
                  label: 'Matter Coin (M)',
                  val: balances.matter,
                  colorClass: 'text-orange-400',
                  borderClass: 'border-orange-500/30',
                  bgClass: 'bg-orange-500/5',
                  desc: 'Logical structure & categorical local indexing structures.',
                  icon: Box,
                },
                {
                  label: 'Substance Coin (S)',
                  val: balances.substance,
                  colorClass: 'text-emerald-400',
                  borderClass: 'border-emerald-500/30',
                  bgClass: 'bg-emerald-500/5',
                  desc: 'Operational actions & local inference energy tracking.',
                  icon: Zap,
                },
              ].map(coin => {
                const Icon = coin.icon
                return (
                  <div
                    key={coin.label}
                    className={`p-6 rounded-2xl border ${coin.borderClass} ${coin.bgClass} flex flex-col justify-between h-44 shadow-lg`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                        {coin.label}
                      </span>
                      <Icon className={`w-5 h-5 ${coin.colorClass} animate-pulse`} />
                    </div>
                    <div>
                      <h3
                        className={`text-4xl font-extrabold font-mono tracking-tight ${coin.colorClass}`}
                      >
                        {coin.val.toFixed(2)}
                      </h3>
                      <p className="text-zinc-400 text-[10px] mt-2 leading-relaxed">{coin.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Details and Transaction Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
              {/* Rules of Economy Card */}
              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4 lg:col-span-1">
                <h4 className="font-bold text-sm text-zinc-300 uppercase tracking-wider">
                  Treasury Gating Code
                </h4>
                <div className="space-y-3 text-xs leading-relaxed text-zinc-400">
                  <p>
                    Each premium agent unlock requires transmutational activation gating of{' '}
                    <strong className="text-purple-300">500 total coins</strong>.
                  </p>
                  <p>
                    The matrix calculates a balanced 4-column deduct of{' '}
                    <strong className="text-purple-300">125 coins of each element</strong> (125
                    Spirit, 125 Essence, 125 Matter, and 125 Substance).
                  </p>
                  <p className="text-zinc-500 italic">
                    Base models operate on the 1.5B parameters index and require 0 coins. Active
                    chat inference incurs standard costs (-2.00 Spirit, -1.00 Essence per exchange).
                  </p>
                </div>
              </div>

              {/* Transactions list */}
              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4 lg:col-span-2">
                <h4 className="font-bold text-sm text-zinc-300 uppercase tracking-wider">
                  Transaction Activity Log
                </h4>
                <div className="space-y-3 overflow-y-auto max-h-60 pr-2">
                  {ledgerLogs.length === 0 ? (
                    <div className="p-4 rounded-lg bg-[#110820]/30 border border-purple-900/5 text-xs text-zinc-500">
                      No ledger activity yet. Unlock an agent or send a message to record the first
                      desktop transaction.
                    </div>
                  ) : (
                    ledgerLogs.map(log => (
                      <div
                        key={log.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-[#110820]/30 border border-purple-900/5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-zinc-300">{log.type}</div>
                          <div className="text-zinc-500 text-[10px] mt-0.5">{log.details}</div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-mono font-bold ${log.positive ? 'text-emerald-400' : 'text-purple-400'}`}
                          >
                            {log.amount}
                          </span>
                          <div className="text-zinc-600 text-[9px] mt-0.5">{log.timestamp}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TRAY VIEW */}
        {activeView === 'tray' && (
          <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-[#08020d] max-w-6xl mx-auto w-full space-y-8">
            <div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-purple-300 to-zinc-400">
                Orchestrator Tray & Sidecar Diagnostics
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                Real-time status of the Tauri process and sandbox local matrices.
              </p>
            </div>

            {/* Diagnostic stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-zinc-500">
                    Rust shell bridge
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    ACTIVE
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">IPC Client Listeners:</div>
                  <div className="font-mono text-xs text-purple-300">invoke("get_ipc_nonce") ✓</div>
                  <div className="font-mono text-[10px] text-zinc-600 mt-2">
                    UUID Handshake verified secure.
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-zinc-500">
                    Bun sidecar server
                  </span>
                  <span
                    className={`text-[10px] border px-2 py-0.5 rounded-full font-mono font-bold ${
                      hardwareTelemetry.online
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-300 border-red-500/20'
                    }`}
                  >
                    {hardwareTelemetry.online ? 'RUNNING' : 'OFFLINE'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">Local Port Listener:</div>
                  <div className="font-mono text-xs text-purple-300">
                    localhost:8080 (SSE enabled)
                  </div>
                  <div className="font-mono text-[10px] text-zinc-600 mt-2">
                    Inference Engine: llama.cpp sidecar
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-zinc-500">
                    Hardware telemetry
                  </span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    LIVE
                  </span>
                </div>
                <div className="space-y-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">CPU load:</span>
                    <span className="font-mono text-zinc-300">
                      {hardwareTelemetry.cpu.percent == null
                        ? 'n/a'
                        : `${hardwareTelemetry.cpu.percent.toFixed(1)}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Threads:</span>
                    <span className="font-mono text-zinc-300">
                      {hardwareTelemetry.cpu.logicalThreads || 'n/a'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Unified mem:</span>
                    <span className="font-mono text-zinc-300">
                      {formatBytes(hardwareTelemetry.memory.usedBytes)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">GPU use:</span>
                    <span className="font-mono text-zinc-300">
                      {gpuTelemetry?.utilizationPercent == null
                        ? 'n/a'
                        : `${gpuTelemetry.utilizationPercent}%`}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1">
                    <span className="text-zinc-500 block">VRAM / UMA in use:</span>
                    <span className="font-mono text-[9px] text-purple-400 truncate">
                      {formatBytes(gpuTelemetry?.vramUsedBytes)} of{' '}
                      {formatBytes(gpuTelemetry?.vramAllocatedBytes)} allocated
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-purple-900/10 bg-zinc-950/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-zinc-500">
                    Jing profile
                  </span>
                  <span className="text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    {lastInferenceProfile}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Active sidecar mode:</span>
                    <span className="font-mono text-purple-300">{activeHardwareProfile.label}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Context window:</span>
                    <span className="font-mono text-zinc-300">
                      {activeHardwareProfile.contextSize || 'n/a'} tokens
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Policy:</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {activeHardwareProfile.contextPolicy}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox details */}
            <div className="p-8 rounded-2xl border border-purple-900/10 bg-zinc-950/20 space-y-4">
              <h3 className="font-bold text-zinc-300 text-sm uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                Model Directory Cache GGUF Registry
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="pb-3">Model Weight file</th>
                      <th className="pb-3">Element Class</th>
                      <th className="pb-3">Parameter Spec</th>
                      <th className="pb-3">Physical Size</th>
                      <th className="pb-3">Sandbox Scope Path</th>
                      <th className="pb-3">Lock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/50">
                    <tr className="text-zinc-300">
                      <td className="py-3 font-semibold font-mono text-purple-300">
                        alchm-agent-air-1.5b.gguf
                      </td>
                      <td className="py-3">Air (Default)</td>
                      <td className="py-3">Q4_K_M (1.5 Billion)</td>
                      <td className="py-3">940 MB</td>
                      <td className="py-3 text-[10px] text-zinc-500 font-mono">
                        /models/alchm-agent-air-1.5b.gguf
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-400 font-semibold font-mono">✓ UNLOCKED</span>
                      </td>
                    </tr>
                    <tr className="text-zinc-300">
                      <td className="py-3 font-semibold font-mono text-purple-300">
                        alchm-agent-water-1.5b.gguf
                      </td>
                      <td className="py-3">Water</td>
                      <td className="py-3">Q4_K_M (1.5 Billion)</td>
                      <td className="py-3">940 MB</td>
                      <td className="py-3 text-[10px] text-zinc-500 font-mono">
                        /models/alchm-agent-water-1.5b.gguf
                      </td>
                      <td className="py-3">
                        <span className="text-zinc-600 font-mono">✕ NOT CACHED</span>
                      </td>
                    </tr>
                    {agentConfig && agentConfig.modelName.includes('8b') && (
                      <tr className="text-zinc-300">
                        <td className="py-3 font-semibold font-mono text-purple-300">
                          {agentConfig.modelName}
                        </td>
                        <td className="py-3">{agentConfig.dominantElement}</td>
                        <td className="py-3">Q4_K_M (8.0 Billion Premium)</td>
                        <td className="py-3">4.5 GB</td>
                        <td className="py-3 text-[10px] text-zinc-500 font-mono">
                          /models/{agentConfig.modelName}
                        </td>
                        <td className="py-3">
                          <span className="text-emerald-400 font-semibold font-mono">
                            ✓ ACTIVE CORE
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. LOCAL AGENT ROSTER VIEW */}
        {activeView === 'agents' && (
          <div className="flex-1 overflow-y-auto relative p-8 md:p-12 bg-[#08020d]">
            <div className="relative z-10 space-y-10 max-w-6xl mx-auto w-full">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-purple-900/20 pb-6">
                <div>
                  <div className="inline-block text-[10px] tracking-widest font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 uppercase">
                    Local Desktop Roster
                  </div>
                  <h2 className="text-4xl font-extrabold text-white tracking-tight">
                    Agents Added To This App
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed mt-2">
                    Add agents to the native desktop roster and chat with them from this local
                    interface. This screen is bundled into the app; it is not an embedded browser
                    gallery.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('onboarding')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-900/30 px-4 py-3 text-xs font-bold uppercase tracking-wider text-purple-100 hover:bg-purple-800/40"
                >
                  <Wand2 className="w-4 h-4" />
                  Forge Custom Agent
                </button>
              </div>

              {loadingAgents ? (
                <div className="text-center text-zinc-400 py-12">Loading local roster...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryAgents.map(agent => {
                    const isPremium = agent.tier === 'premium'

                    return (
                      <div
                        key={agent.id}
                        className="group p-6 rounded-2xl bg-zinc-950/60 border border-purple-900/10 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-96 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] hover:-translate-y-1"
                      >
                        <div
                          className={`absolute -top-10 -right-10 w-24 h-24 rounded-full filter blur-xl opacity-25 group-hover:opacity-40 transition-opacity ${
                            agent.element === 'Fire'
                              ? 'bg-orange-500'
                              : agent.element === 'Water'
                                ? 'bg-blue-500'
                                : agent.element === 'Air'
                                  ? 'bg-yellow-500'
                                  : 'bg-emerald-500'
                          }`}
                        />

                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">
                              {agent.era}
                            </span>
                            {isPremium ? (
                              <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 shadow-[0_0_10px_rgba(167,139,250,0.2)]">
                                Premium
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
                                Base
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold border ${
                                agent.element === 'Fire'
                                  ? 'border-orange-500/30 bg-orange-950/10 text-orange-400'
                                  : agent.element === 'Water'
                                    ? 'border-blue-500/30 bg-blue-950/10 text-blue-400'
                                    : agent.element === 'Air'
                                      ? 'border-amber-500/30 bg-amber-950/10 text-amber-400'
                                      : 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400'
                              }`}
                            >
                              {agent.avatarSymbol}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-white group-hover:text-purple-300 transition-colors">
                                {agent.name}
                              </h3>
                              <p className="text-[10px] text-zinc-500">{agent.title}</p>
                            </div>
                          </div>

                          <blockquote className="text-zinc-400 italic text-xs border-l border-zinc-800 pl-3 leading-relaxed mt-2">
                            "{agent.quote}"
                          </blockquote>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-900/50">
                          <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>
                              Dominant: <strong className="text-zinc-300">{agent.element}</strong>
                            </span>
                            <span>
                              Specialty:{' '}
                              <strong className="text-zinc-300">{agent.specialization}</strong>
                            </span>
                          </div>

                          <button
                            onClick={() => handleInstallAgent(agent.id)}
                            className="w-full flex items-center justify-center gap-1.5 bg-[#120722] hover:bg-[#1f0d36] text-purple-300 hover:text-white border border-purple-500/20 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:scale-[1.02]"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            {ALCHM_DESKTOP_AGENT_UNLOCK_LABEL}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 500-ESMS DEEP LINK INSTALL OVERLAY MODAL */}
      {/* ========================================== */}
      {showModal && modalAgent && (
        <div className="absolute inset-0 bg-[#05020a]/85 backdrop-blur-xl flex items-center justify-center p-6 z-50 overflow-y-auto">
          <div className="bg-[#0b0617]/95 border border-purple-500/30 rounded-3xl w-full max-w-xl p-8 space-y-6 shadow-[0_0_50px_rgba(139,92,246,0.3)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Subtly animated ambient aura inside modal */}
            <div
              className={`absolute -top-24 -left-24 w-48 h-48 rounded-full filter blur-3xl opacity-20 pointer-events-none ${
                modalAgent.element === 'Fire'
                  ? 'bg-orange-500'
                  : modalAgent.element === 'Water'
                    ? 'bg-blue-500'
                    : modalAgent.element === 'Air'
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
              }`}
            />

            {/* Cancel Button */}
            <button
              onClick={() => setShowModal(false)}
              disabled={isInstalling}
              className="absolute top-6 right-6 p-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Content */}
            {!isInstalling ? (
              <>
                {/* 1. Top row: Raw deep link simulated telemetry */}
                <div className="space-y-2 border-b border-purple-900/10 pb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono font-bold">
                      Agent Unlock Telemetry:
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold font-mono text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />✓ Nonce OK
                    </span>
                  </div>
                  <div className="font-mono text-[9px] bg-zinc-950 p-2 rounded-lg text-purple-400 border border-white/5 break-all select-all">
                    alchm://unlock-agent?id={modalAgent.id}&name=
                    {encodeURIComponent(modalAgent.name)}&tier={modalAgent.tier}
                  </div>
                </div>

                {/* 2. Agent Summary */}
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl border text-2xl flex items-center justify-center font-bold shadow-lg ${
                      modalAgent.element === 'Fire'
                        ? 'border-orange-500/30 bg-orange-950/10 text-orange-400'
                        : modalAgent.element === 'Water'
                          ? 'border-blue-500/30 bg-blue-950/10 text-blue-400'
                          : modalAgent.element === 'Air'
                            ? 'border-amber-500/30 bg-amber-950/10 text-amber-400'
                            : 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400'
                    }`}
                  >
                    {modalAgent.avatarSymbol}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-white">{modalAgent.name}</h3>
                      <span className="text-[9px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full font-semibold uppercase">
                        {modalAgent.era}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">{modalAgent.title}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Alignment: {modalAgent.element} · {modalAgent.modality}
                    </p>
                  </div>
                </div>

                {/* Italic quote */}
                <blockquote className="text-xs text-zinc-400 italic bg-zinc-950/40 p-4 rounded-xl border border-white/5 leading-relaxed">
                  “{modalAgent.quote}”
                </blockquote>

                {/* 3-Cell Spec Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] py-1 border-y border-zinc-900/50">
                  <div className="p-2 bg-zinc-950/30 rounded-lg">
                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">
                      Engine Spec
                    </span>
                    <strong className="font-mono text-purple-300">
                      {modalAgent.tier === 'premium' ? 'alchm-8b.gguf' : 'alchm-1.5b.gguf'}
                    </strong>
                  </div>
                  <div className="p-2 bg-zinc-950/30 rounded-lg">
                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">
                      Natal origin
                    </span>
                    <strong className="text-zinc-300 font-medium">
                      {modalAgent.birthCity.split(',')[0]}
                    </strong>
                  </div>
                  <div className="p-2 bg-zinc-950/30 rounded-lg">
                    <span className="text-zinc-500 block uppercase font-bold text-[8px]">
                      Monica Constant
                    </span>
                    <strong className="text-purple-400 font-extrabold font-mono">
                      {modalAgent.monicaConstant}
                    </strong>
                  </div>
                </div>

                {/* 3. 500-ESMS Transmutation Gate Check */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                      Alchemical Balance Validation Gate
                    </span>
                    {modalAgent.tier === 'premium' ? (
                      <span className="text-[10px] font-extrabold text-purple-400 font-mono">
                        125×4 = 500 ESMS Required
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        Base Engine: Free (0 ESMS)
                      </span>
                    )}
                  </div>

                  {modalAgent.tier === 'premium' ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        {
                          name: 'Spirit',
                          bal: balances.spirit,
                          icon: Sparkles,
                          color: 'text-yellow-400',
                          border: 'border-yellow-500/20',
                        },
                        {
                          name: 'Essence',
                          bal: balances.essence,
                          icon: Droplets,
                          color: 'text-blue-400',
                          border: 'border-blue-500/20',
                        },
                        {
                          name: 'Matter',
                          bal: balances.matter,
                          icon: Box,
                          color: 'text-orange-400',
                          border: 'border-orange-500/20',
                        },
                        {
                          name: 'Substance',
                          bal: balances.substance,
                          icon: Zap,
                          color: 'text-emerald-400',
                          border: 'border-emerald-500/20',
                        },
                      ].map(tk => {
                        const Icon = tk.icon
                        const ok = tk.bal >= 125
                        return (
                          <div
                            key={tk.name}
                            className={`p-3 rounded-xl border ${tk.border} bg-zinc-950/60 flex items-center justify-between`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Icon className={`w-3.5 h-3.5 ${tk.color}`} />
                              <span className="font-medium text-zinc-400">{tk.name}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-zinc-300">
                                {tk.bal.toFixed(0)}/125
                              </span>
                              {ok ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 text-[9px] font-bold">
                                  ✓
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30 text-[9px] font-bold">
                                  ✕
                                </span>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center text-xs text-emerald-300 font-medium">
                      ✓ No coin deduction necessary for 1.5B parameters GGUF core engine.
                    </div>
                  )}
                </div>

                {/* Trust signal & Active Nonce */}
                <div className="flex justify-between items-center text-[9px] text-zinc-600 font-mono pt-2 border-t border-zinc-900/50">
                  <span>SANDBOX PATH: /models/{modalAgent.id}/</span>
                  <span>ACTIVE IPC NONCE: {ipcNonce?.slice(0, 15)}...</span>
                </div>

                {/* Trigger buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 py-3 rounded-xl text-xs font-bold text-zinc-400 tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel Unlock
                  </button>
                  <button
                    disabled={modalAgent.tier === 'premium' && !hasEnoughForPremium}
                    onClick={handleForgePremium}
                    className="flex-1 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 hover:brightness-110 disabled:opacity-30 py-3 rounded-xl text-xs font-bold text-white tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(139,92,246,0.25)] cursor-pointer"
                  >
                    {modalAgent.tier === 'premium'
                      ? hasEnoughForPremium
                        ? 'Unlock Premium Agent'
                        : 'Gated: Insufficient Balance'
                      : 'Unlock Base Agent'}
                  </button>
                </div>
              </>
            ) : (
              // 4. Installing visual progress bar state
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full border border-purple-500/30 bg-purple-900/10 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-8 h-8 text-purple-400" />
                </div>
                <div className="space-y-2 w-full px-8">
                  <h4 className="font-extrabold text-lg text-white">Unlocking Agent Access...</h4>
                  <p className="text-xs text-zinc-500 font-mono h-8 leading-relaxed max-w-xs mx-auto">
                    {installStatus}
                  </p>

                  {/* Progress Bar Container */}
                  <div className="h-2 w-full bg-zinc-950 border border-white/5 rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 transition-all duration-300 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                      style={{ width: `${installProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono tracking-wider pt-1">
                    {installProgress}% complete
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
