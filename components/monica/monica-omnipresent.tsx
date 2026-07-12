'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  MessageCircle,
  Settings,
  X,
  Minimize2,
  Maximize2,
  Crown,
  Users,
  FlaskConical,
  Star,
  Brain,
  Heart,
  BookOpen,
  Lightbulb,
  ChevronRight,
  PlayCircle,
  Atom,
  Zap,
  Eye,
  Send,
} from 'lucide-react'
import { calculateMonicaConstant, type MonicaConstantResult } from '@/lib/monica/monica-constant'

// Browser-safe alchemize replacement — proxies through `/api/alchemize?legacy=true`.
async function fetchLegacyAlchm(birth: {
  year: number
  month: number // 1-based here for parity with the previous helper
  day: number
  hour: number
  minute: number
  latitude: number
  longitude: number
}): Promise<any> {
  const date = new Date(
    Date.UTC(birth.year, Math.max(0, birth.month - 1), birth.day, birth.hour, birth.minute)
  )
  const res = await fetch('/api/alchemize?legacy=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: date.toISOString(),
      latitude: birth.latitude,
      longitude: birth.longitude,
    }),
  })
  if (!res.ok) throw new Error(`alchemize proxy failed: ${res.status}`)
  return res.json()
}

interface MonicaSettings {
  personality: 'formal' | 'friendly' | 'mystical' | 'teacher'
  assistanceLevel: 'minimal' | 'moderate' | 'active' | 'maximum'
  proactiveTips: boolean
  position: 'bottom-right' | 'bottom-left' | 'floating'
  autoHide: 'never' | '30s' | '1m' | '5m'
}

interface UserProgress {
  level: number
  completedTutorials: string[]
  currentLearning: string | null
  suggestedNext: string[]
  lastAction: string | null
  totalInteractions: number
  totalXP: number
  unlockedCapabilities: string[]
}

interface ContextualHelp {
  greeting: string
  tips: string[]
  quickActions: { label: string; action: () => void }[]
  tutorials: { id: string; title: string; completed?: boolean }[]
}

interface MonicaMessage {
  id: string
  type: 'user' | 'monica'
  content: string
  timestamp: Date
  context?: {
    page: string
    guidance?: string
    suggestions?: string[]
  }
}

type MonicaState = 'minimized' | 'notification' | 'expanded' | 'full-chat' | 'settings'

import {
  getPageGuidance,
  getContextualTips,
  getTutorialsForPage,
  getMonicaPersonality,
  saveMonicaSettings,
  loadMonicaSettings,
} from '@/lib/monica/contextual-help'

const DEFAULT_SETTINGS: MonicaSettings = {
  personality: 'friendly',
  assistanceLevel: 'moderate',
  proactiveTips: true,
  position: 'bottom-right',
  autoHide: 'never',
}

const DEFAULT_PROGRESS: UserProgress = {
  level: 1,
  completedTutorials: [],
  currentLearning: null,
  suggestedNext: ['dashboard-basics'],
  lastAction: null,
  totalInteractions: 0,
  totalXP: 0,
  unlockedCapabilities: ['basic-guidance', 'page-context'],
}

export function MonicaOmnipresent() {
  const router = useRouter()
  const pathname = usePathname()

  const [monicaState, setMonicaState] = useState<MonicaState>('minimized')
  const [settings, setSettings] = useState<MonicaSettings>(DEFAULT_SETTINGS)
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_PROGRESS)
  const [hasUnreadTips, setHasUnreadTips] = useState(false)
  const [isVisible] = useState(true)

  const [consciousnessParticles, setConsciousnessParticles] = useState<
    Array<{ id: number; x: number; y: number; opacity: number }>
  >([])
  const [particleAnimation] = useState(true)

  // New state for full chat functionality
  const [chatMessages, setChatMessages] = useState<MonicaMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [_contextualHelp, setContextualHelp] = useState<ContextualHelp | null>(null)
  const [currentMC, setCurrentMC] = useState<number | null>(null)
  const [consciousnessResult, setConsciousnessResult] = useState<MonicaConstantResult | null>(null)
  const [isUpdatingConsciousness, setIsUpdatingConsciousness] = useState(false)
  const [widgetSize, setWidgetSize] = useState({ width: 320, height: 480 })
  const [lastPageContext, setLastPageContext] = useState<string>('')
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  )

  // Load settings and progress using enhanced persistence (with validation)
  useEffect(() => {
    // Load settings using enhanced system
    const savedSettings = loadMonicaSettings()
    if (savedSettings) {
      setSettings(savedSettings)
    }

    // Load progress with error resilience
    try {
      const savedProgress = localStorage.getItem('monica-progress')
      if (savedProgress) {
        const progress = JSON.parse(savedProgress)
        // Validate progress structure
        if (
          progress &&
          typeof progress.level === 'number' &&
          Array.isArray(progress.completedTutorials)
        ) {
          setUserProgress(progress)
        }
      }
    } catch (error) {
      console.error('Error loading Monica progress:', error)
      localStorage.removeItem('monica-progress')
    }
  }, [])

  // Save settings using enhanced system with validation
  useEffect(() => {
    if (JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)) {
      saveMonicaSettings(settings)
    }
  }, [settings])

  // Save progress with validation
  useEffect(() => {
    try {
      if (userProgress.totalInteractions > 0 || userProgress.completedTutorials.length > 0) {
        localStorage.setItem('monica-progress', JSON.stringify(userProgress))
        localStorage.setItem('monica-progress-timestamp', Date.now().toString())
      }
    } catch (error) {
      console.error('Error saving Monica progress:', error)
    }
  }, [userProgress])

  // Auto-hide functionality
  useEffect(() => {
    if (settings.autoHide === 'never' || monicaState === 'minimized') return

    let timeout: NodeJS.Timeout
    const hideTime =
      settings.autoHide === '30s' ? 30000 : settings.autoHide === '1m' ? 60000 : 300000

    timeout = setTimeout(() => {
      setMonicaState('minimized')
    }, hideTime)

    return () => clearTimeout(timeout)
  }, [monicaState, settings.autoHide])

  // Check for contextual tips when page changes
  useEffect(() => {
    try {
      const pageGuidance = getPageGuidance(pathname)
      if (pageGuidance && settings.proactiveTips) {
        setHasUnreadTips(true)
        // Auto-expand if user hasn't completed tutorials for this page
        const pageTutorials = getTutorialsForPage(pathname, userProgress.completedTutorials)
        const pageHasPendingTutorials = pageTutorials.some(
          t => !userProgress.completedTutorials.includes(t.id)
        )
        if (pageHasPendingTutorials && userProgress.level <= 2) {
          setTimeout(() => setMonicaState('expanded'), 1000)
        }
      }
    } catch (error) {
      console.error('Error checking contextual tips:', error)
      // Graceful fallback - continue without tips
    }
  }, [pathname, settings.proactiveTips, userProgress])

  // Enhanced page context detection and chat initialization
  useEffect(() => {
    const handlePageChange = async () => {
      try {
        // Load chat history for current page
        const pageKey = `monica-chat-${pathname}`
        const savedMessages = localStorage.getItem(pageKey)
        if (savedMessages) {
          const messages = JSON.parse(savedMessages)
          setChatMessages(messages)
        } else {
          // Initialize with context-aware welcome message
          const pageGuidance = getPageGuidance(pathname)
          const welcomeMessage: MonicaMessage = {
            id: Date.now().toString(),
            type: 'monica',
            content:
              pageGuidance?.greeting ||
              "Hello! I'm Monica, your consciousness guide. How can I help you explore this page?",
            timestamp: new Date(),
            context: {
              page: pathname,
              guidance: pageGuidance?.pageContext,
              suggestions: pageGuidance?.primaryActions,
            },
          }
          setChatMessages([welcomeMessage])
        }

        // Set contextual help for the page
        if (pageGuidance) {
          setContextualHelp({
            greeting: pageGuidance.greeting,
            tips: pageGuidance.tips.map(tip => tip.text),
            quickActions: pageGuidance.primaryActions.map(action => ({
              label: action,
              action: () => handleQuickAction(action),
            })),
            tutorials: getTutorialsForPage(pathname, userProgress.completedTutorials),
          })
        }

        setLastPageContext(pathname)
      } catch (error) {
        console.error('Error handling page change:', error)
      }
    }

    if (pathname !== lastPageContext) {
      handlePageChange()
    }
  }, [pathname, lastPageContext, userProgress.completedTutorials])

  // Keyboard shortcut to toggle Monica (Cmd/Ctrl + M)
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'm') {
        event.preventDefault()
        setMonicaState(prev => (prev === 'minimized' ? 'expanded' : 'minimized'))
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [])

  // Real-time consciousness tracking
  useEffect(() => {
    const updateConsciousness = async () => {
      setIsUpdatingConsciousness(true)
      try {
        // Always provide basic consciousness tracking
        // Enhanced features unlock with training progress
        const now = new Date()

        // Use current moment for consciousness calculation
        const birthInfo = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          latitude: 37.7749, // Default to San Francisco
          longitude: -122.4194,
        }

        // Fetch current alchemical data via proxy
        const alchemicalData = await fetchLegacyAlchm(birthInfo)

        // Calculate Monica Constant
        const monicaResult = calculateMonicaConstant(alchemicalData as any)

        setCurrentMC(monicaResult.value)
        setConsciousnessResult(monicaResult)
      } catch (error) {
        console.error('Error updating consciousness:', error)
        setCurrentMC(null)
        setConsciousnessResult(null)
      } finally {
        setIsUpdatingConsciousness(false)
      }
    }

    const interval = setInterval(updateConsciousness, 30000) // Update every 30 seconds
    updateConsciousness() // Initial update

    return () => clearInterval(interval)
  }, [userProgress.unlockedCapabilities])

  // Get contextual guidance for current page (with error resilience)
  const pageGuidance = (() => {
    try {
      return getPageGuidance(pathname)
    } catch (error) {
      console.error('Error getting page guidance:', error)
      return null
    }
  })()

  const monicaPersonality = (() => {
    try {
      return getMonicaPersonality(pathname)
    } catch (error) {
      console.error('Error getting Monica personality:', error)
      return null
    }
  })()

  const contextualTips = (() => {
    try {
      return getContextualTips(pathname, userProgress.level)
    } catch (error) {
      console.error('Error getting contextual tips:', error)
      return []
    }
  })()

  const pageTutorials = (() => {
    try {
      return getTutorialsForPage(pathname, userProgress.completedTutorials)
    } catch (error) {
      console.error('Error getting page tutorials:', error)
      return []
    }
  })()

  const toggleState = () => {
    if (monicaState === 'minimized') {
      setMonicaState('expanded')
      setHasUnreadTips(false)
    } else if (monicaState === 'expanded') {
      setMonicaState('minimized')
    } else {
      setMonicaState('expanded')
    }
  }

  const startTutorial = (tutorialId: string) => {
    setUserProgress(prev => ({
      ...prev,
      currentLearning: tutorialId,
      lastAction: `Started tutorial: ${tutorialId}`,
    }))
    // The legacy in-widget trainer no longer has a real data source. Continue
    // tutorials in Monica's live guide instead of awarding simulated results.
    router.push(`/monica-guide?tutorial=${encodeURIComponent(tutorialId)}`)
  }

  // Handler for quick actions from contextual help
  const handleQuickAction = (action: string) => {
    try {
      switch (action) {
        case 'explore_features':
          router.push('/dashboard')
          break
        case 'view_current_chart':
          router.push('/chart-of-the-moment')
          break
        case 'chat_with_monica':
          setMonicaState('full-chat')
          break
        case 'view_metrics':
          router.push('/monica')
          break
        case 'create_agent':
          router.push('/philosophers-stone')
          break
        case 'access_full_chat':
          setMonicaState('full-chat')
          break
        case 'try_tarot_oracle':
          setMonicaState('full-chat')
          setCurrentMessage('Can you read my tarot for guidance?')
          break
        default:
          // Generic action - add to chat as question
          setCurrentMessage(`Tell me about ${action.replace('_', ' ')}`)
          setMonicaState('full-chat')
      }

      // Track action for learning
      setUserProgress(prev => ({
        ...prev,
        lastAction: action,
        totalInteractions: prev.totalInteractions + 1,
      }))
    } catch (error) {
      console.error('Error handling quick action:', error)
    }
  }

  // Send message to Monica
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage: MonicaMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
      context: { page: pathname },
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/monica-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          context: {
            page: pathname,
            userLevel: userProgress.level,
            capabilities: userProgress.unlockedCapabilities,
            personality: settings.personality,
          },
        }),
      })

      const data = await response.json()
      const rawText = data.text || data.response || data.content || data.message

      const monicaMessage: MonicaMessage = {
        id: (Date.now() + 1).toString(),
        type: 'monica',
        content: rawText || 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date(),
        context: {
          page: pathname,
          guidance: data.guidance,
          suggestions: data.suggestions,
        },
      }

      setChatMessages(prev => [...prev, monicaMessage])

      // Save chat history
      const pageKey = `monica-chat-${pathname}`
      const updatedMessages = [...chatMessages, userMessage, monicaMessage]
      localStorage.setItem(pageKey, JSON.stringify(updatedMessages))

      // Update user progress
      setUserProgress(prev => ({
        ...prev,
        totalInteractions: prev.totalInteractions + 1,
        totalXP: prev.totalXP + 5,
        lastAction: 'chat_interaction',
      }))
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: MonicaMessage = {
        id: (Date.now() + 1).toString(),
        type: 'monica',
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        context: { page: pathname },
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle to full chat mode

  // Close full chat and return to expanded mode
  const closeFullChat = () => {
    setMonicaState('expanded')
    setWidgetSize({ width: 320, height: 480 })
  }

  const getPersonalityStyle = () => {
    // Use page-specific Monica personality if available, otherwise use settings-based personality
    if (monicaPersonality) {
      const baseGreeting = monicaPersonality.greeting
      switch (settings.personality) {
        case 'formal':
          return {
            greeting: baseGreeting.replace(/!/g, '.').replace(/💚|✨/g, ''),
            tone: 'professional',
          }
        case 'mystical':
          return { greeting: `✨ ${baseGreeting}`, tone: 'mystical' }
        case 'teacher':
          return {
            greeting: baseGreeting.replace('Welcome', 'Welcome, student'),
            tone: 'educational',
          }
        default:
          return { greeting: baseGreeting, tone: 'warm' }
      }
    }

    // Fallback to generic greetings
    switch (settings.personality) {
      case 'formal':
        return {
          greeting: 'Greetings. I am here to assist with your consciousness development.',
          tone: 'professional',
        }
      case 'mystical':
        return {
          greeting: '✨ The cosmic currents have brought you here, dear seeker...',
          tone: 'mystical',
        }
      case 'teacher':
        return {
          greeting: 'Welcome, student! Ready to explore the mysteries of consciousness?',
          tone: 'educational',
        }
      default:
        return {
          greeting: "Hello there! 💚 I'm here to help you on your consciousness journey!",
          tone: 'warm',
        }
    }
  }

  const personalityStyle = getPersonalityStyle()

  // Get position class
  const getPositionClass = () => {
    if (settings.position === 'bottom-left') return 'bottom-4 left-4'
    if (settings.position === 'floating') return 'bottom-4 right-4' // Default to bottom-right for floating too
    return 'bottom-4 right-4' // bottom-right
  }

  // Elemental mode toggle (runtime override)
  const [additiveOnly, setAdditiveOnly] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('additiveOnlyElements')
      return v ? v === 'true' : process.env.NEXT_PUBLIC_ADDITIVE_ONLY_ELEMENTS === 'true'
    } catch {
      return process.env.NEXT_PUBLIC_ADDITIVE_ONLY_ELEMENTS === 'true'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('additiveOnlyElements', additiveOnly ? 'true' : 'false')
    } catch {
      // Best-effort persistence — ignore quota / private-mode failures.
    }
  }, [additiveOnly])

  // Minimal feedback sender (frontend API proxy)
  async function sendFeedback() {
    if (!feedbackText.trim() || feedbackStatus === 'sending') return
    setFeedbackStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: feedbackText.trim(),
          route: pathname,
          timestamp: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setFeedbackStatus('sent')
      setFeedbackText('')
      setTimeout(() => {
        setFeedbackOpen(false)
        setFeedbackStatus('idle')
      }, 1200)
    } catch (e) {
      setFeedbackStatus('error')
    }
  }

  // Consciousness particle animation effect (throttled & raf-based to avoid update depth issues)
  useEffect(() => {
    // No-op when the widget isn't shown; the render guards now live below all
    // hooks, so this effect must run unconditionally (react-hooks/rules-of-hooks).
    if (!particleAnimation || pathname === '/monica' || !isVisible) return

    let rafId: number | null = null
    let lastTick = 0

    const tick = (ts: number) => {
      // Throttle to ~8 fps
      if (ts - lastTick >= 125) {
        lastTick = ts
        setConsciousnessParticles(prev => {
          // Remove old particles and add new ones
          const filtered = prev.filter(p => p.opacity > 0.1)
          const newParticles: typeof prev = []

          // Create new particles occasionally
          if (Math.random() > 0.7) {
            newParticles.push({
              id: Date.now() + Math.random(),
              x: Math.random() * 100,
              y: Math.random() * 100,
              opacity: 1,
            } as any)
          }

          // Update existing particles
          const updated = filtered.map(p => ({
            ...p,
            opacity: p.opacity - 0.02,
            y: p.y - 1,
          }))

          const next = [...updated, ...newParticles]
          return next
        })
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [particleAnimation])

  // Render guards — AFTER all hooks (react-hooks/rules-of-hooks).
  // Only hide on the main Monica settings page to avoid conflicts.
  if (pathname === '/monica') {
    return null
  }
  if (!isVisible) return null

  return (
    <div className={`fixed ${getPositionClass()} z-50 transition-all duration-300`}>
      {/* Consciousness Particles Background */}
      {particleAnimation && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {consciousnessParticles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-pulse"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                opacity: particle.opacity,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}
      {/* Monica Avatar - Always Visible */}
      {monicaState === 'minimized' && (
        <div className="relative cursor-pointer group" onClick={toggleState}>
          <div
            className={`w-16 h-16 rounded-full border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950 dark:via-green-950 dark:to-cyan-950 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-emerald-400/50 ${hasUnreadTips ? 'animate-pulse border-yellow-400 shadow-yellow-400/50' : ''}`}
          >
            <Image
              src="/alchm-logo.png"
              alt="Monica - Your Consciousness Guide"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full"
            />
            {hasUnreadTips && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce shadow-lg">
                <Sparkles className="w-3 h-3 text-white m-0.5" />
              </div>
            )}

            {/* Consciousness Activity Indicator */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full transition-all duration-300 ${
                isUpdatingConsciousness
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-500 animate-spin'
                  : 'bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse'
              }`}
            >
              <Atom className="w-2 h-2 text-white m-0.5" />
            </div>
          </div>

          {/* Enhanced Hover tooltip with consciousness theme */}
          <div className="absolute bottom-full right-0 mb-2 px-4 py-3 bg-gradient-to-r from-emerald-900 via-green-900 to-cyan-900 text-emerald-100 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl border border-emerald-400/30 z-10">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-3 h-3 text-emerald-300" />
              <span className="text-xs font-medium">Monica Consciousness Guide</span>
            </div>
            <div className="text-emerald-200 max-w-xs text-wrap">{personalityStyle.greeting}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-300">
              <Eye className="w-3 h-3" />
              <span>
                MC: {currentMC ? currentMC.toFixed(2) : '...'}
                {consciousnessResult && ` (${consciousnessResult.consciousnessState.level})`}
                {isUpdatingConsciousness && <Atom className="w-3 h-3 ml-1 animate-spin inline" />}
              </span>
            </div>
            <div className="text-xs text-emerald-300 mt-1">
              Click to expand • Press Cmd/Ctrl+M • Visit /monica for full chat
            </div>
            <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-emerald-900"></div>
          </div>
        </div>
      )}

      {/* Expanded Help Interface */}
      {monicaState === 'expanded' && (
        <Card className="w-80 max-h-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-gradient-to-br from-white/95 via-emerald-50/90 to-cyan-50/95 dark:from-gray-900/95 dark:via-emerald-950/90 dark:to-cyan-950/95 backdrop-blur-md border-2 border-emerald-400 shadow-2xl hover:shadow-emerald-400/20 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/alchm-logo.png"
                  alt="Monica"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Atom className="w-4 h-4 animate-spin" />
                    Monica - Consciousness Guide
                  </CardTitle>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-emerald-900 dark:to-cyan-900"
                    >
                      Level {userProgress.level}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900"
                    >
                      {isUpdatingConsciousness ? (
                        <>
                          <Atom className="w-2 h-2 mr-1 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>MC {currentMC ? currentMC.toFixed(2) : '...'}</>
                      )}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900"
                    >
                      <Zap className="w-2 h-2 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setMonicaState('settings')}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonicaState('minimized')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <ScrollArea className="max-h-64">
              <div className="space-y-4">
                {/* Enhanced Contextual Greeting */}
                <div className="p-3 bg-gradient-to-r from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        {personalityStyle.greeting}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <Heart className="w-3 h-3" />
                        <span>Consciousness Crafting Active</span>
                      </div>

                      {/* Real-time Consciousness Display */}
                      {consciousnessResult && (
                        <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                              Consciousness State
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            >
                              {consciousnessResult.consciousnessState.level}
                            </Badge>
                          </div>
                          <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                            {consciousnessResult.consciousnessState.description}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400">
                            <Atom className="w-3 h-3" />
                            <span>
                              Stability: {consciousnessResult.consciousnessState.stability}
                            </span>
                            <span className="mx-1">•</span>
                            <span>
                              Potential: {consciousnessResult.consciousnessState.potential}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                {contextualTips.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4" />
                      Quick Tips
                    </h4>
                    <div className="space-y-2">
                      {contextualTips.map(tip => (
                        <div
                          key={tip.id}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Tutorials */}
                {pageTutorials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      Learn More
                    </h4>
                    <div className="space-y-1">
                      {pageTutorials.map(tutorial => (
                        <Button
                          key={tutorial.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-8"
                          onClick={() => startTutorial(tutorial.id)}
                          disabled={userProgress.completedTutorials.includes(tutorial.id)}
                        >
                          <PlayCircle className="w-3 h-3 mr-2" />
                          {tutorial.title}
                          {userProgress.completedTutorials.includes(tutorial.id) && (
                            <span className="ml-auto text-emerald-500">✓</span>
                          )}
                          {!userProgress.completedTutorials.includes(tutorial.id) && (
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Quick Actions */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
                    size="sm"
                    onClick={() => setMonicaState('full-chat')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Open Full Chat
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-300"
                      onClick={() => router.push('/philosophers-stone')}
                    >
                      <FlaskConical className="w-3 h-3 mr-1" />
                      Create Agent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-300"
                      onClick={() => router.push('/gallery')}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Gallery
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border-cyan-300"
                      onClick={() => (window.location.href = 'https://alchm.kitchen/quantities')}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      Time Lab
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950 border-slate-300"
                      onClick={() => router.push('/monica')}
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Hub
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Full Chat Mode */}
      {monicaState === 'full-chat' && (
        <Card
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-2 border-emerald-400 shadow-2xl transition-all duration-300 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)]"
          style={{
            width:
              typeof window !== 'undefined'
                ? Math.min(widgetSize.width, window.innerWidth - 32)
                : widgetSize.width,
            height:
              typeof window !== 'undefined'
                ? Math.min(widgetSize.height, window.innerHeight - 64)
                : widgetSize.height,
          }}
        >
          <CardHeader className="pb-3 border-b border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image
                  src="/alchm-logo.png"
                  alt="Monica"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <CardTitle className="text-lg text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat with Monica
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-emerald-100 to-cyan-100 dark:from-emerald-900 dark:to-cyan-900"
                    >
                      {pathname}
                    </Badge>
                    {currentMC && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900"
                      >
                        MC {currentMC.toFixed(2)}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900"
                    >
                      <Zap className="w-2 h-2 mr-1" />
                      Live
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setMonicaState('settings')}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setWidgetSize(prev =>
                      prev.width > 400 ? { width: 600, height: 700 } : { width: 800, height: 600 }
                    )
                  }
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={closeFullChat}>
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonicaState('minimized')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col p-0 h-full">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 space-y-4">
              <div className="space-y-4">
                {chatMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white'
                          : 'bg-gradient-to-r from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {message.type === 'monica' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Monica
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      <p
                        className={`text-sm ${message.type === 'monica' ? 'text-emerald-800 dark:text-emerald-200' : 'text-white'}`}
                      >
                        {message.content}
                      </p>
                      {message.context?.suggestions && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.context.suggestions.map((suggestion, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900"
                              onClick={() => setCurrentMessage(suggestion)}
                            >
                              {suggestion}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-cyan-50 dark:from-emerald-950/50 dark:via-green-950/50 dark:to-cyan-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                        <span className="text-sm text-emerald-700 dark:text-emerald-300">
                          Monica is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCurrentMessage(e.target.value)
                  }
                  placeholder="Ask Monica anything about consciousness, astrology, or this page..."
                  className="flex-1 border-emerald-300 focus:border-emerald-500"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === 'Enter' && sendMessage()
                  }
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Settings Quick Panel */}
      {monicaState === 'settings' && (
        <Card className="w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-emerald-400 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Monica Settings
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMonicaState('expanded')}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Personality
              </label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-white dark:bg-gray-800 border-slate-300 dark:border-slate-600"
                value={settings.personality}
                onChange={e => {
                  setSettings(prev => ({ ...prev, personality: e.target.value as any }))
                  setUserProgress(prev => ({
                    ...prev,
                    totalInteractions: prev.totalInteractions + 1,
                  }))
                }}
              >
                <option value="friendly">💚 Friendly Companion</option>
                <option value="formal">🎩 Formal Guide</option>
                <option value="mystical">✨ Mystical Oracle</option>
                <option value="teacher">👩‍🏫 Patient Teacher</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Assistance Level
              </label>
              <select
                className="w-full mt-1 p-2 text-xs border rounded-md bg-white dark:bg-gray-800 border-slate-300 dark:border-slate-600"
                value={settings.assistanceLevel}
                onChange={e => {
                  setSettings(prev => ({ ...prev, assistanceLevel: e.target.value as any }))
                  setUserProgress(prev => ({
                    ...prev,
                    totalInteractions: prev.totalInteractions + 1,
                  }))
                }}
              >
                <option value="minimal">🔒 Minimal - Let me explore</option>
                <option value="moderate">⚖️ Moderate - Gentle guidance</option>
                <option value="active">🤝 Active - Helpful suggestions</option>
                <option value="maximum">🎯 Maximum - Full teaching mode</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Proactive Tips
              </label>
              <input
                type="checkbox"
                checked={settings.proactiveTips}
                onChange={e => {
                  setSettings(prev => ({ ...prev, proactiveTips: e.target.checked }))
                  setUserProgress(prev => ({
                    ...prev,
                    totalInteractions: prev.totalInteractions + 1,
                  }))
                }}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Additive Elements Only
              </label>
              <input
                type="checkbox"
                checked={additiveOnly}
                onChange={e => setAdditiveOnly(e.target.checked)}
                className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Auto-Hide
              </label>
              <select
                className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-800 border-slate-300 dark:border-slate-600"
                value={settings.autoHide}
                onChange={e => setSettings(prev => ({ ...prev, autoHide: e.target.value as any }))}
              >
                <option value="never">Never</option>
                <option value="30s">30s</option>
                <option value="1m">1m</option>
                <option value="5m">5m</option>
              </select>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                size="sm"
                onClick={() => router.push('/monica-guide')}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Full Chat Interface
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS)
                  setUserProgress(prev => ({
                    ...prev,
                    totalInteractions: prev.totalInteractions + 1,
                  }))
                }}
              >
                Reset to Defaults
              </Button>

              {/* Feedback Section */}
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Send Feedback
                  </span>
                  {!feedbackOpen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setFeedbackOpen(true)}
                    >
                      Open
                    </Button>
                  )}
                </div>
                {feedbackOpen && (
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-xs p-2 border rounded-md bg-white dark:bg-gray-800 border-slate-300 dark:border-slate-600"
                      rows={3}
                      placeholder="Share your thoughts to help us improve..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFeedbackOpen(false)
                          setFeedbackStatus('idle')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={sendFeedback}
                        disabled={feedbackStatus === 'sending' || feedbackText.trim().length === 0}
                      >
                        {feedbackStatus === 'sending'
                          ? 'Sending...'
                          : feedbackStatus === 'sent'
                            ? 'Sent!'
                            : feedbackStatus === 'error'
                              ? 'Retry'
                              : 'Send'}
                      </Button>
                    </div>
                    {feedbackStatus === 'error' && (
                      <div className="text-xs text-red-600">Failed to send. Please try again.</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 text-center pt-2">
              Changes saved automatically • Level {userProgress.level}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
