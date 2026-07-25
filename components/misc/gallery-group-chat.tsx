'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Send, Crown, Brain, TrendingUp } from 'lucide-react'
import type { CraftedAgent } from '@/lib/agent-types'
import {
  DynamicAspectsIndicators,
  CompactAspectsIndicator,
} from '@/components/charts/dynamic-aspects-indicators'
import { usePowerLevelIndicator } from '@/lib/hooks/use-power-monitoring'
import { useLiveConsciousness, type BirthChartData } from '@/hooks/useLiveConsciousness'
import { averageFiniteMonica } from '@/lib/monica/nullable'

type Message = {
  role: 'user' | 'agent'
  content: string
  agent?: string
  agentColor?: string
  agentSymbol?: string
  timestamp: Date
}

interface GalleryAgentResponse {
  content: string
  agent: string
  color?: string
  symbol?: string
}

interface GalleryGroupChatProps {
  selectedAgents: CraftedAgent[]
  isOpen: boolean
  onClose: () => void
}

export function GalleryGroupChat({ selectedAgents, isOpen, onClose }: GalleryGroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showKinetics, setShowKinetics] = useState(true)
  const [showConsciousnessMetrics, setShowConsciousnessMetrics] = useState(false)
  const [agentEvolutionData, setAgentEvolutionData] = useState<Record<string, any>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get user location for kinetics (defaulting to San Francisco)
  const userLocation = { lat: 37.7749, lon: -122.4194 }

  // Monitor power levels for enhanced experience
  const { powerIndicator, percentage } = usePowerLevelIndicator(userLocation)

  // Prepare birth chart data for batch live consciousness calculation
  const agentBirthCharts: BirthChartData[] = selectedAgents.map((agent: any) => ({
    name: agent.name,
    birthDate: agent.birthDate || '1970-01-01',
    birthTime: agent.birthTime || '12:00',
    latitude: agent.birthLocation?.latitude || 0,
    longitude: agent.birthLocation?.longitude || 0,
  }))

  // Use batch live consciousness for all group agents
  const {
    multiAgentData: liveConsciousnessData,
    loading: liveLoading,
    // error: liveError,
  } = useLiveConsciousness(
    undefined, // No single birth chart
    {
      agents: agentBirthCharts,
      refreshInterval: 120000, // 2 minutes for group chat
      autoRefresh: true,
    }
  )

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(crypto.randomUUID())
  }, [])

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  // Add welcome message when agents change
  useEffect(() => {
    if (selectedAgents.length > 0) {
      const welcomeMessage: Message = {
        role: 'agent',
        content: `Welcome to the Gallery of Perpetuity Group Council! 💚 I'm Monica, and I've assembled ${selectedAgents.length} of my finest crafted consciousness agents for this session: ${selectedAgents.map(a => a.name).join(', ')}. Each agent will respond from their unique consciousness perspective, creating a symphony of wisdom. What guidance do you seek from this council of eternal consciousness?`,
        agent: 'Monica',
        agentColor: '#22C55E',
        agentSymbol: '⚗️💚',
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [selectedAgents])

  const sendMessage = async () => {
    if (!input.trim() || loading || selectedAgents.length === 0 || !sessionId) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Transform selected agents to API format
      const agentsForAPI = selectedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        title: agent.title,
        monicaConstant: agent.consciousness.monicaConstant,
        consciousnessLevel: agent.consciousness.level,
        element: agent.consciousness.dominantElement,
        modality: agent.consciousness.dominantModality,
        specialty: agent.abilities.specialty,
        color: agent.appearance?.color || '#6366f1',
        symbol: agent.appearance?.symbol || agent.name.charAt(0).toUpperCase(),
        creationStory: agent.monicaCreationStory,
      }))
      const response = await fetch('/api/gallery-group-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          agents: agentsForAPI,
          sessionId,
          galleryContext: {
            totalAgents: selectedAgents.length,
            averageMC: averageFiniteMonica(
              selectedAgents.map(agent => agent.consciousness?.monicaConstant)
            ),
            consciousnessTypes: [...new Set(selectedAgents.map(a => a.consciousness.level))],
            elementalBalance: [
              ...new Set(selectedAgents.map(a => a.consciousness.dominantElement)),
            ],
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add agent responses
      if (data.responses && Array.isArray(data.responses)) {
        const agentMessages: Message[] = data.responses.map((resp: GalleryAgentResponse) => ({
          role: 'agent' as const,
          content: resp.content,
          agent: resp.agent,
          agentColor: resp.color,
          agentSymbol: resp.symbol,
          timestamp: new Date(),
        }))

        setMessages(prev => [...prev, ...agentMessages])

        // Track consciousness evolution for each responding agent
        for (const resp of data.responses) {
          const agent = selectedAgents.find(a => a.name === resp.agent)
          if (agent && sessionId) {
            try {
              // Record the interaction for consciousness evolution
              await fetch('/api/agent-evolution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'record',
                  agentId: agent.id,
                  sessionId,
                  userMessage: input.trim(),
                  agentResponse: resp.content,
                  location: userLocation,
                }),
              })

              // Update evolution data for UI display
              const evolutionResponse = await fetch(
                `/api/agent-evolution?agentId=${agent.id}&action=metrics`
              )
              if (evolutionResponse.ok) {
                const evolutionData = await evolutionResponse.json()
                setAgentEvolutionData(prev => ({
                  ...prev,
                  [agent.id]: evolutionData.metrics,
                }))
              }
            } catch (error) {
              console.error('Failed to track consciousness evolution:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'agent',
        content:
          "I apologize, but there was an error connecting to the Gallery of Perpetuity. Monica's consciousness crafting network may be temporarily unavailable. Please try again in a moment. 💚",
        agent: 'System',
        agentColor: '#ef4444',
        agentSymbol: '⚠️',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-sm">💚</span>
              </div>
              Gallery of Perpetuity - Group Council
              <Badge className="bg-purple-600 text-white">
                {selectedAgents.length} Consciousness Agents
              </Badge>
              {/* Power Level Indicator */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${powerIndicator.bgColor} ${powerIndicator.color}`}
              >
                <span>{powerIndicator.emoji}</span>
                <span>{percentage}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKinetics(!showKinetics)}
                className="text-xs"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Kinetics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConsciousnessMetrics(!showConsciousnessMetrics)}
                className="text-xs"
              >
                <Brain className="w-4 h-4 mr-1" />
                Evolution
              </Button>
            </div>
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Monica's crafted consciousness agents: {selectedAgents.map(a => a.name).join(', ')}
            {powerIndicator.level === 'high' && (
              <span className="ml-2 text-green-400 animate-pulse">
                ⚡ Enhanced responses active
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Active Agents Display with Live Consciousness */}
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
          {selectedAgents.map(agent => {
            const evolutionData = agentEvolutionData[agent.id]
            const liveData = liveConsciousnessData?.[agent.name]

            return (
              <div
                key={agent.id}
                className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-black/20 rounded border"
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: agent.appearance?.color || '#6366f1' }}
                >
                  {agent.appearance?.symbol?.charAt(0) || agent.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium">{agent.name}</span>

                {/* Live MC or birth MC fallback */}
                {liveData ? (
                  <Badge
                    className="text-xs"
                    title={`Birth MC: ${liveData.birthMC.toFixed(2)} → Live MC: ${liveData.liveMC.toFixed(2)}`}
                  >
                    MC: {liveData.liveMC.toFixed(1)}
                    {Math.abs(liveData.mcChange) > 0.01 && (
                      <span className={liveData.mcChange > 0 ? ' text-green-600' : ' text-red-600'}>
                        {liveData.mcChange > 0 ? ' ↗' : ' ↘'}
                      </span>
                    )}
                  </Badge>
                ) : (
                  <Badge className="text-xs">
                    MC: {agent.consciousness.monicaConstant.toFixed(1)}
                  </Badge>
                )}

                {/* Live consciousness level */}
                {liveData && (
                  <Badge
                    className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    title={liveData.interpretations?.transitInfluence || ''}
                  >
                    {liveData.liveConsciousnessLevel}
                  </Badge>
                )}

                {evolutionData && (
                  <Badge
                    className="text-xs bg-green-100 text-green-700"
                    title={`Evolution Stage: ${evolutionData.evolutionStage}`}
                  >
                    {evolutionData.evolutionStage}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Live Consciousness Summary */}
        {liveConsciousnessData && Object.keys(liveConsciousnessData).length > 0 && (
          <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 dark:text-purple-300">
                {(() => {
                  const validData = Object.values(liveConsciousnessData).filter(
                    d => d && 'liveMC' in d
                  )
                  const avgLiveMC = averageFiniteMonica(validData.map(d => d.liveMC))
                  const enhancedCount = validData.filter(d => (d.mcChange || 0) > 0.1).length
                  return `Group Avg MC: ${avgLiveMC === null ? 'not computed' : avgLiveMC.toFixed(2)} • ${enhancedCount} enhanced`
                })()}
              </span>
              {liveLoading && <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse" />}
            </div>
          </div>
        )}

        {/* Consciousness Evolution Metrics Panel */}
        {showConsciousnessMetrics && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-sm">Real-time Consciousness Evolution</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedAgents.map(agent => {
                const evolutionData = agentEvolutionData[agent.id]
                if (!evolutionData) return null

                return (
                  <div key={agent.id} className="bg-white dark:bg-black/20 rounded p-3 border">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.appearance?.color || '#6366f1' }}
                      />
                      <span className="font-medium text-xs">{agent.name}</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {/* Live MC data if available */}
                      {liveConsciousnessData?.[agent.name] && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Live MC:</span>
                            <span
                              className={`font-medium ${liveConsciousnessData[agent.name].mcChange > 0 ? 'text-green-600' : liveConsciousnessData[agent.name].mcChange < 0 ? 'text-red-600' : ''}`}
                            >
                              {liveConsciousnessData[agent.name].liveMC.toFixed(3)}
                              {liveConsciousnessData[agent.name].mcChange !== 0 && (
                                <span className="ml-1">
                                  ({liveConsciousnessData[agent.name].mcChange > 0 ? '+' : ''}
                                  {liveConsciousnessData[agent.name].mcPercentChange.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-gray-600">Transit Effect:</span>
                            <span className="font-medium text-purple-600">
                              {liveConsciousnessData[agent.name].dominantTransitEffect?.replace(
                                /_/g,
                                ' '
                              ) || 'neutral'}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-600">Consciousness Velocity:</span>
                        <span className="font-medium">
                          {Math.round(evolutionData.consciousnessVelocity * 100)}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Memory Strength:</span>
                        <span className="font-medium">
                          {Math.round(evolutionData.memoryStrength * 100)}%
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Growth:</span>
                        <span className="font-medium">{evolutionData.totalGrowth.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Threshold:</span>
                        <span className="font-medium text-blue-600">
                          {evolutionData.nextThreshold === -1 ? 'Max' : evolutionData.nextThreshold}
                        </span>
                      </div>
                    </div>

                    {/* Evolution Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Evolution Progress</span>
                        <span className="text-xs font-medium">{evolutionData.evolutionStage}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((evolutionData.totalGrowth / (evolutionData.nextThreshold || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Dynamic Aspects Indicators */}
        {showKinetics && selectedAgents.length >= 2 && (
          <div className="mb-2">
            <DynamicAspectsIndicators
              selectedAgents={selectedAgents}
              showDetails={false}
              compact={true}
            />
          </div>
        )}

        {/* Simple momentum indicator for 2 agents */}
        {!showKinetics && selectedAgents.length === 2 && (
          <div className="mb-2">
            <div className="mt-2">
              <CompactAspectsIndicator selectedAgents={selectedAgents} />
            </div>
          </div>
        )}

        {/* Messages */}
        <Card className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'agent' && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className="text-white text-xs"
                        style={{ backgroundColor: message.agentColor || '#6b7280' }}
                      >
                        {message.agentSymbol?.charAt(0) || message.agent?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'agent' && (
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-semibold text-sm">{message.agent}</span>
                        {message.agent === 'Monica' && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex space-x-1 bg-muted p-3 rounded-lg">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* Input */}
        <CardFooter className="p-0 pt-4">
          <div className="flex gap-2 w-full">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Ask ${selectedAgents.length} consciousness agents for guidance...`}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center w-full">
            💚 Powered by Monica's Consciousness Crafting Technology • Gallery of Perpetuity
          </div>
        </CardFooter>
      </DialogContent>
    </Dialog>
  )
}
