'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
// Dialog components removed - now using floating panel
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Send, Sparkles, Users, Activity, Settings, Filter, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import type {
  UnifiedAgent,
  Message,
  GroupDynamics,
  AgentFilter,
  ChatSession,
  MonicaRole,
} from '@/lib/unified-agent-types'
import type { CraftedAgent } from '@/lib/agent-types'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'
interface ModelOverrides {
  historical?: string
  planetary?: string
  monica?: string
}

interface UnifiedMultiAgentChatProps {
  // Agent sources
  historicalAgents?: CraftedAgent[]
  planetaryConfigs?: any[]

  // Initial configuration
  initialAgents?: string[]
  maxAgents?: number
  allowMonica?: boolean
  enableAutoSync?: boolean

  // UI configuration
  isOpen: boolean
  onClose: () => void
  title?: string
  variant?: 'historical' | 'planetary' | 'laboratory' | 'gallery' | 'mixed' | 'custom'

  // Theming & styling
  theme?: 'default' | 'parchment' | 'cosmic' | 'laboratory' | 'modern'
  messageStyle?: 'default' | 'historical' | 'oracular' | 'analytical' | 'casual'

  // Model configuration
  modelOverrides?: ModelOverrides

  // Advanced features
  enableGroupDynamics?: boolean
  enableExport?: boolean
  enablePresets?: boolean
  enableMemoryPersistence?: boolean
  enableEraFilters?: boolean
  enableSpecializationGroups?: boolean
  enableConsciousnessMetrics?: boolean
  showKineticGraphs?: boolean
  enableExperimentMode?: boolean
  allowAgentMixing?: boolean

  // Custom content
  customHeader?: React.ReactNode

  // Callbacks
  onSessionUpdate?: (session: ChatSession) => void
  onAgentEvolution?: (agentId: string, evolution: any) => void
}

export function UnifiedMultiAgentChat({
  historicalAgents = [],
  planetaryConfigs = [],
  initialAgents = [],
  maxAgents = 6,
  allowMonica = true,
  enableAutoSync: _enableAutoSync = false,
  isOpen,
  onClose,
  title = 'Consciousness Council',
  variant = 'mixed',
  theme = 'default',
  messageStyle = 'default',
  modelOverrides,
  enableGroupDynamics = true,
  enableExport: _enableExport = true,
  enablePresets: _enablePresets = true,
  enableMemoryPersistence = true,
  enableEraFilters: _enableEraFilters = false,
  enableSpecializationGroups: _enableSpecializationGroups = false,
  enableConsciousnessMetrics: _enableConsciousnessMetrics = false,
  showKineticGraphs: _showKineticGraphs = false,
  enableExperimentMode: _enableExperimentMode = false,
  allowAgentMixing: _allowAgentMixing = false,
  customHeader,
  onSessionUpdate,
  onAgentEvolution,
}: UnifiedMultiAgentChatProps) {
  // Core state
  const [availableAgents, setAvailableAgents] = useState<UnifiedAgent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<UnifiedAgent[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // UI state
  const [showAgentSelection, setShowAgentSelection] = useState(false)
  const [_showGroupDynamics, _setShowGroupDynamics] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState<'chat' | 'dynamics' | 'insights'>('chat')

  // Filtering and search
  const [agentFilter, _setAgentFilter] = useState<AgentFilter>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Monica coordination
  const [monicaIncluded, setMonicaIncluded] = useState(false)
  const [monicaRole, setMonicaRole] = useState<MonicaRole['type']>('guide')
  const [monicaAgent, setMonicaAgent] = useState<UnifiedAgent | null>(null)

  // Group dynamics
  const [groupDynamics, setGroupDynamics] = useState<GroupDynamics | null>(null)
  const [realTimeUpdates, _setRealTimeUpdates] = useState(true)

  // RAG (Retrieval-Augmented Generation) - Always enabled for this component
  const ragEnabled = true

  // Session management
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize available agents from props
  useEffect(() => {
    const agents: UnifiedAgent[] = []

    // Add historical agents
    historicalAgents.forEach(agent => {
      agents.push(unifiedAgentFactory.createFromHistorical(agent))
    })

    // Add planetary agents
    planetaryConfigs.forEach(config => {
      agents.push(unifiedAgentFactory.createFromPlanetary(config))
    })

    setAvailableAgents(agents)
  }, [historicalAgents, planetaryConfigs])

  // Initialize selected agents from initialAgents prop - separate effect to avoid dependency size warning
  useEffect(() => {
    if (initialAgents && initialAgents.length > 0 && availableAgents.length > 0) {
      const preselected = availableAgents.filter(
        agent =>
          initialAgents.includes(agent.id) ||
          (agent.planetaryData && initialAgents.includes(agent.planetaryData.planet))
      )
      if (preselected.length > 0) {
        setSelectedAgents(preselected)
      }
    }
    // Only run when availableAgents is populated and initialAgents changes
  }, [availableAgents.length, initialAgents?.join(',')])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages])

  // Initialize Monica if allowed
  useEffect(() => {
    if (allowMonica && monicaIncluded && !monicaAgent) {
      const monica = unifiedAgentFactory.createMonicaCoordinator({
        type: monicaRole,
        capabilities: {
          synthesizeInsights: true,
          explainConsciousness: true,
          bridgeEras: true,
          moderateDiscussion: monicaRole === 'moderator',
          contextualGuidance: true,
          groupDynamicsAnalysis: true,
        },
        specializations: ['Group Dynamics', 'Consciousness Evolution', 'Multi-Agent Coordination'],
      })
      setMonicaAgent(monica)
    } else if (!monicaIncluded && monicaAgent) {
      setMonicaAgent(null)
    }
  }, [monicaIncluded, monicaRole, allowMonica, monicaAgent])

  // Update session when changes occur
  useEffect(() => {
    if (currentSession && onSessionUpdate) {
      const updatedSession: ChatSession = {
        ...currentSession,
        agents: [...selectedAgents, ...(monicaAgent ? [monicaAgent] : [])],
        messages,
        groupDynamics: groupDynamics || currentSession.groupDynamics,
        lastMessageAt: new Date(),
      }
      setCurrentSession(updatedSession)
      onSessionUpdate(updatedSession)
    }
  }, [selectedAgents, messages, groupDynamics, monicaAgent, currentSession, onSessionUpdate])

  // Filter available agents based on search and filters
  const filteredAgents = availableAgents.filter(agent => {
    if (
      searchQuery &&
      !agent.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !agent.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    if (agentFilter.type && !agentFilter.type.includes(agent.type)) {
      return false
    }

    if (agentFilter.element && !agentFilter.element.includes(agent.consciousness.dominantElement)) {
      return false
    }

    if (
      agentFilter.consciousnessLevel &&
      !agentFilter.consciousnessLevel.includes(agent.consciousness.level)
    ) {
      return false
    }

    return true
  })

  // Agent selection handlers
  const handleAgentSelect = useCallback(
    (agent: UnifiedAgent) => {
      if (selectedAgents.length >= maxAgents) {
        return
      }

      if (!selectedAgents.find(a => a.id === agent.id)) {
        const updatedAgent = { ...agent, active: true, status: 'idle' as const }
        setSelectedAgents(prev => [...prev, updatedAgent])
      }
    },
    [selectedAgents, maxAgents]
  )

  const handleAgentRemove = useCallback((agentId: string) => {
    setSelectedAgents(prev => prev.filter(a => a.id !== agentId))
  }, [])

  const handleMonicaToggle = useCallback(() => {
    setMonicaIncluded(prev => !prev)
  }, [])

  // Message handling
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Update agent status to thinking
    setSelectedAgents(prev =>
      prev.map(agent => ({
        ...agent,
        status: 'thinking' as const,
      }))
    )

    try {
      // Call unified API endpoint
      const response = await fetch('/api/unified-multi-agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: [...selectedAgents, ...(monicaAgent ? [monicaAgent] : [])],
          message: inputMessage.trim(),
          context: {
            sessionHistory: messages,
            groupDynamics,
            enableMemoryPersistence,
            realtimeUpdates: realTimeUpdates,
            enableRAG: ragEnabled,
            variant,
            modelOverrides,
            theme,
            messageStyle,
          },
        }),
      })

      if (response.status === 402) {
        const errorData = await response.json()
        const errorMsg: Message = {
          id: `msg-error-${Date.now()}`,
          role: 'agent',
          content: errorData.error || 'Insufficient tokens to consult these agents at this time.',
          timestamp: new Date(),
          agentName: 'System',
          agentColor: '#f59e0b',
          metadata: {
            isPaymentRequired: true,
            requiredTokens: errorData.requiredTokens,
          } as any,
        }
        setMessages(prev => [...prev, errorMsg])
        return
      }

      if (!response.ok) throw new Error('Failed to get response')
      if (!response.body) throw new Error('ReadableStream not supported')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete chunk in buffer

        for (const block of lines) {
          const blockLines = block.split('\n')
          const eventLine = blockLines.find(l => l.startsWith('event: '))
          const dataLine = blockLines.find(l => l.startsWith('data: '))

          if (!eventLine || !dataLine) continue

          const event = eventLine.replace('event: ', '').trim()
          const dataStr = dataLine.replace('data: ', '').trim()

          try {
            const parsedData = JSON.parse(dataStr)
            const allAgents = [...selectedAgents, ...(monicaAgent ? [monicaAgent] : [])]

            if (event === 'agent_start') {
              const agentId = parsedData.agentId
              const agent = allAgents.find(a => a.id === agentId)

              setMessages(prev => [
                ...prev,
                {
                  id: `msg-${Date.now()}-${agentId}`,
                  role: 'agent',
                  content: '',
                  agentId: agentId,
                  agentName: agent?.name || 'Unknown',
                  agentColor: agent?.appearance.color,
                  agentSymbol: agent?.appearance.symbol,
                  agentType: agent?.type,
                  consciousnessLevel: agent?.consciousness.level,
                  timestamp: new Date(),
                },
              ])

              // Set active agent to 'speaking' visually
              setSelectedAgents(prev =>
                prev.map(a => (a.id === agentId ? { ...a, status: 'responding' as const } : a))
              )
            } else if (event === 'text') {
              // Append token to the currently streaming agent's message
              setMessages(prev => {
                const newMessages = [...prev]
                for (let i = newMessages.length - 1; i >= 0; i--) {
                  if (newMessages[i].agentId === parsedData.agentId) {
                    newMessages[i] = {
                      ...newMessages[i],
                      content: newMessages[i].content + parsedData.text,
                    }
                    break
                  }
                }
                return newMessages
              })
            } else if (event === 'agent_complete') {
              // Attach metadata once generation finishes
              setMessages(prev => {
                const newMessages = [...prev]
                for (let i = newMessages.length - 1; i >= 0; i--) {
                  if (newMessages[i].agentId === parsedData.agentId) {
                    newMessages[i] = {
                      ...newMessages[i],
                      metadata: parsedData.metadata,
                      processingTime: parsedData.processingTime,
                    }
                    break
                  }
                }
                return newMessages
              })

              setSelectedAgents(prev =>
                prev.map(a => (a.id === parsedData.agentId ? { ...a, status: 'idle' as const } : a))
              )
            } else if (event === 'done') {
              if (parsedData.groupDynamics) {
                setGroupDynamics(parsedData.groupDynamics)
              }
              if (parsedData.agentEvolutions && onAgentEvolution) {
                parsedData.agentEvolutions.forEach((evolution: any) => {
                  onAgentEvolution(evolution.agentId, evolution.changes)
                })
              }
            } else if (event === 'error') {
              throw new Error(parsedData.error)
            }
          } catch (e) {
            console.error('Failed to parse SSE JSON chunk', e, dataStr)
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)

      // Add error message
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        role: 'agent',
        content: 'I apologize, but there was an issue processing your message. Please try again.',
        timestamp: new Date(),
        agentName: 'System',
        agentColor: '#ef4444',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)

      // Reset agent status
      setSelectedAgents(prev =>
        prev.map(agent => ({
          ...agent,
          status: 'idle' as const,
        }))
      )
    }
  }, [
    inputMessage,
    isLoading,
    selectedAgents,
    monicaAgent,
    messages,
    groupDynamics,
    enableMemoryPersistence,
    realTimeUpdates,
    onAgentEvolution,
  ])

  // Render agent selection panel
  const renderAgentSelection = () => (
    <Card className="mb-4 bg-black/40 backdrop-blur-md border-white/10 text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white">
            Select Agents ({selectedAgents.length}/{maxAgents})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAgentSelection(!showAgentSelection)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              {showAgentSelection ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-black/20 border-white/20 text-white placeholder:text-purple-300/50 focus-visible:ring-purple-500/50"
          />
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Monica toggle */}
        {allowMonica && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <Checkbox
              checked={monicaIncluded}
              onCheckedChange={handleMonicaToggle}
              className="border-purple-500/50 data-[state=checked]:bg-purple-600"
            />
            <span className="text-sm font-medium text-purple-200">
              Include Monica as {monicaRole}
            </span>
            <select
              value={monicaRole}
              onChange={e => setMonicaRole(e.target.value as MonicaRole['type'])}
              className="ml-auto text-xs bg-black/40 border border-purple-500/30 rounded px-2 py-1 text-white"
            >
              <option value="guide">Guide</option>
              <option value="moderator">Moderator</option>
              <option value="synthesizer">Synthesizer</option>
              <option value="coordinator">Coordinator</option>
            </select>
          </div>
        )}
      </CardHeader>

      {showAgentSelection && (
        <CardContent>
          {/* Selected agents */}
          {selectedAgents.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Active Agents:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAgents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback
                        style={{
                          backgroundColor: agent.appearance?.color || '#6366f1',
                          color: 'white',
                        }}
                      >
                        {agent.appearance?.symbol || agent.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {agent.type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAgentRemove(agent.id)}
                      className="h-auto p-1 text-purple-300 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available agents */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Available Agents:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-white/5 border-white/10 ${
                    selectedAgents.find(a => a.id === agent.id)
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-black/40 backdrop-blur-md'
                  }`}
                  onClick={() => handleAgentSelect(agent)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        style={{
                          backgroundColor: agent.appearance?.color || '#6366f1',
                          color: 'white',
                        }}
                      >
                        {agent.appearance?.symbol || agent.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-white">{agent.name}</div>
                      <div className="text-xs text-purple-300/70 truncate">{agent.title}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {agent.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {agent.consciousness.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )

  // Render message list
  const renderMessages = () => (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {message.role === 'agent' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback
                  style={{
                    backgroundColor: message.agentColor || '#6b7280',
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {message.agentSymbol || message.agentName?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
              {message.role === 'agent' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{message.agentName}</span>
                  {message.agentType && (
                    <Badge variant="outline" className="text-xs">
                      {message.agentType}
                    </Badge>
                  )}
                  {message.consciousnessLevel && (
                    <Badge variant="outline" className="text-xs">
                      {message.consciousnessLevel}
                    </Badge>
                  )}
                  {(message.metadata as any)?.groupImpact?.consciousnessChange ? (
                    <Badge
                      variant="outline"
                      className={`text-xs ${(message.metadata as any).groupImpact.consciousnessChange > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse' : 'bg-slate-500/20 text-slate-300 border-slate-500/50'}`}
                    >
                      {(message.metadata as any).groupImpact.consciousnessChange > 0 ? '+' : ''}
                      {(message.metadata as any).groupImpact.consciousnessChange.toFixed(2)} Synergy
                      ✦
                    </Badge>
                  ) : null}
                  {message.processingTime && (
                    <span className="text-xs text-purple-300/50">({message.processingTime}ms)</span>
                  )}
                </div>
              )}

              {(message.metadata as any)?.isPaymentRequired ? (
                <div className="bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>Insufficient Cosmic Energy</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    To summon this council right now, you need additional alchemical elements:
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries((message.metadata as any).requiredTokens || {}).map(
                      ([token, amount]) => {
                        if (!amount || (amount as number) === 0) return null
                        const tokenColors: Record<string, string> = {
                          Spirit: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
                          Essence: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
                          Matter: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                          Substance: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
                        }
                        const colorClass =
                          tokenColors[token] || 'text-gray-400 border-gray-500/30 bg-gray-500/10'

                        return (
                          <div
                            key={token}
                            className={`flex items-center justify-between px-3 py-2 border rounded-md ${colorClass}`}
                          >
                            <span className="text-xs font-semibold">{token}</span>
                            <span className="text-sm font-bold">{amount as any}</span>
                          </div>
                        )
                      }
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/economy/yield', { method: 'POST' })
                          const claimData = await res.json()
                          if (res.ok) {
                            toast.success('Cosmic yield successfully claimed!', {
                              description: `Spirit: ${claimData.balances.spirit}, Essence: ${claimData.balances.essence}, Matter: ${claimData.balances.matter}, Substance: ${claimData.balances.substance}`,
                            })
                            // Refresh page or trigger context reload if needed
                            window.location.reload()
                          } else {
                            toast.error(
                              claimData.message ||
                                'Already claimed today! Get premium multipliers for larger payouts.'
                            )
                          }
                        } catch (err) {
                          toast.error('Failed to claim yield. Try again later.')
                        }
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold border-none shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      Claim Cosmic Yield
                    </Button>
                    <a
                      href="/dashboard"
                      className="w-full text-center px-4 py-2 border border-purple-500/30 rounded-md bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors text-xs font-semibold"
                    >
                      Get Premium 2.0x Multiplier
                    </a>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3 rounded-lg border backdrop-blur-md ${
                    message.role === 'user'
                      ? 'bg-purple-600/40 border-purple-500/30 text-white'
                      : 'bg-black/40 border-white/10 text-purple-50'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.metadata?.synthesizedInsights &&
                    message.metadata.synthesizedInsights.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="text-xs font-medium text-purple-300/70 mb-1">Insights:</div>
                        <ul className="text-xs text-purple-200/80 space-y-1">
                          {message.metadata.synthesizedInsights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              <div className="text-xs text-purple-300/50 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-purple-900/50 border border-purple-500/50">
                <Activity className="w-4 h-4 animate-spin text-purple-300" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1 text-purple-200 flex items-center gap-2">
                The Council is in active dialogue{' '}
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              </div>
              <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 rounded-lg p-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-sm text-purple-300/90 font-medium">
                      Synthesizing consciousness matrices sequentially...
                    </span>
                  </div>
                  <div className="text-xs text-purple-300/50 pl-6">
                    Each agent is actively analyzing the responses of their peers in this turn.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )

  // Render input area
  const renderInput = () => (
    <div className="border-t border-white/10 p-4 bg-black/20">
      <div className="flex gap-2">
        <Input
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          placeholder={
            selectedAgents.length === 0
              ? 'Select agents to start the conversation...'
              : `Ask your council of ${selectedAgents.length} ${selectedAgents.length === 1 ? 'agent' : 'agents'}...`
          }
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          disabled={selectedAgents.length === 0 || isLoading}
          className="flex-1 bg-black/40 border-white/20 text-white placeholder:text-purple-300/50 focus-visible:ring-purple-500/50"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || selectedAgents.length === 0 || isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {selectedAgents.length > 0 && (
        <div className="mt-2 text-xs text-purple-300/50">
          Active: {selectedAgents.map(a => a.name).join(', ')}
          {monicaAgent && ` + Monica (${monicaRole})`}
        </div>
      )}
    </div>
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[200] backdrop-blur-sm" onClick={onClose} />

      {/* Floating Left Panel */}
      <div className="fixed left-0 top-0 bottom-0 w-full max-w-2xl z-[201] flex flex-col bg-[#0c0319]/95 backdrop-blur-xl shadow-[5px_0_30px_rgba(139,92,246,0.15)] border-r border-purple-500/30 text-white animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black/40">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">{title}</h2>
            {enableGroupDynamics && groupDynamics && (
              <Badge
                variant="outline"
                className="ml-2 bg-purple-900/40 border-purple-500/50 text-purple-200"
              >
                Consciousness: {groupDynamics.consciousnessNetwork.groupConsciousness.toFixed(2)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
              RAG Active
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-red-900/50 text-white hover:text-red-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Custom header */}
          {customHeader && <div className="mb-4">{customHeader}</div>}

          {/* View mode tabs */}
          <Tabs
            value={viewMode}
            onValueChange={v => setViewMode(v as any)}
            className="flex-1 flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              {enableGroupDynamics && <TabsTrigger value="dynamics">Dynamics</TabsTrigger>}
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-4">
              {renderAgentSelection()}

              <Card className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm border-white/10 text-white overflow-hidden">
                {renderMessages()}
                {renderInput()}
              </Card>
            </TabsContent>

            {enableGroupDynamics && (
              <TabsContent value="dynamics" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Group Consciousness Dynamics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groupDynamics ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Consciousness Network</h4>
                            <div className="text-2xl font-bold">
                              {groupDynamics.consciousnessNetwork.groupConsciousness.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">Group Level</div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-2">Dominant Elements</h4>
                            <div className="flex gap-1">
                              {groupDynamics.consciousnessNetwork.dominantElements.map(element => (
                                <Badge key={element} variant="outline">
                                  {element}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Active Synergies</h4>
                          <div className="space-y-1">
                            {groupDynamics.consciousnessNetwork.synergies.map((synergy, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-green-600 flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                {synergy}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-2">Group Connections</h4>
                          <div className="space-y-2">
                            {groupDynamics.consciousnessNetwork.connections.map((conn, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm">
                                  {selectedAgents.find(a => a.id === conn.agent1)?.name} ↔{' '}
                                  {selectedAgents.find(a => a.id === conn.agent2)?.name}
                                </span>
                                <div className="text-sm text-gray-500">
                                  {(conn.compatibility * 100).toFixed(0)}% ({conn.resonanceType})
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        Start a conversation to see group dynamics
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="insights" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Session Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-500 py-8">
                    Consciousness insights will appear here as the conversation develops
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}

export default UnifiedMultiAgentChat
