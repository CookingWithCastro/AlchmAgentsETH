'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, MessageCircle, Sparkles, TrendingUp } from 'lucide-react'
import { RAGToggle, SourceCitations, RAGFeedbackWidget, type RAGSource } from '@/components/rag'
import { ragAnalytics } from '@/lib/rag/rag-analytics'
import { detectAmbiguousQuery } from '@/lib/rag/rag-quality'
import WeeklyMenuPlanner from '@/components/misc/weekly-menu-planner'

type Message = {
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  ragSources?: RAGSource[]
  queryId?: string // For linking feedback to specific query
  isPaymentRequired?: boolean
  requiredTokens?: any
}

type Agent = {
  id: string
  name: string
  title: string
  appearance?: {
    symbol?: string
  }
}

type MomentSynergy = {
  score: number
  description: string
  harmonicCount: number
  challengingCount: number
}

export default function HistoricalAgentChatPage() {
  const params = useParams()
  const agentId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentLoading, setAgentLoading] = useState(true)
  const [momentSynergy, setMomentSynergy] = useState<MomentSynergy | null>(null)
  const [ragEnabled, setRagEnabled] = useState(true) // RAG enabled by default
  const [level, setLevel] = useState<number | null>(null)
  const [showMenuPlanner, setShowMenuPlanner] = useState(false)

  // Static agent mapping to avoid server-side imports
  useEffect(() => {
    const agentMap: Record<string, { name: string; title: string; symbol: string }> = {
      'leonardo-da-vinci': {
        name: 'Leonardo da Vinci',
        title: 'The Renaissance Genius',
        symbol: '🎨',
      },
      'carl-jung': { name: 'Carl Jung', title: 'The Shadow Explorer', symbol: '🔮' },
      'marie-curie': { name: 'Marie Curie', title: 'The Radiant Pioneer', symbol: '⚗️' },
      'albert-einstein': { name: 'Albert Einstein', title: 'The Cosmic Thinker', symbol: '🌌' },
      'nikola-tesla': { name: 'Nikola Tesla', title: 'The Electric Visionary', symbol: '⚡' },
      'william-shakespeare': {
        name: 'William Shakespeare',
        title: 'The Bard of Avon',
        symbol: '🎭',
      },
      cleopatra: { name: 'Cleopatra VII', title: 'The Last Pharaoh', symbol: '👑' },
      aristotle: { name: 'Aristotle', title: 'The First Scientist', symbol: '📚' },
      'sigmund-freud': { name: 'Sigmund Freud', title: 'The Unconscious Explorer', symbol: '🧠' },
      'mark-twain': { name: 'Mark Twain', title: 'The American Humorist', symbol: '📝' },
      'vincent-van-gogh': { name: 'Vincent van Gogh', title: 'The Starry Visionary', symbol: '🌟' },
      'charles-darwin': { name: 'Charles Darwin', title: 'The Evolution Pioneer', symbol: '🦎' },
      'edgar-allan-poe': { name: 'Edgar Allan Poe', title: 'The Dark Romantic', symbol: '🦅' },
    }

    const info = agentMap[agentId]
    if (info) {
      setAgent({
        id: agentId,
        name: info.name,
        title: info.title,
        appearance: { symbol: info.symbol },
      })
    } else {
      // Fallback for unknown agents
      setAgent({
        id: agentId,
        name: agentId
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        title: 'Historical Consciousness Agent',
        appearance: { symbol: '👤' },
      })
    }
    setAgentLoading(false)
  }, [agentId])

  // Cosmic level for the header badge — Prisma-backed, independent of the
  // static agent map above. Resilient: on any failure the badge just hides.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/agents/${agentId}/leveling`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d && typeof d.level === 'number') setLevel(d.level)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [agentId])

  useEffect(() => {
    // Use crypto.randomUUID() if available, fallback to manual UUID generation
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
      }
      // Fallback UUID v4 generation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    }
    setSessionId(generateUUID())

    // Load RAG preference from localStorage
    const storedRagPref = localStorage.getItem('rag-enabled')
    if (storedRagPref !== null) {
      setRagEnabled(JSON.parse(storedRagPref))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !sessionId || !agent) return

    // Check for ambiguous queries (for analytics and potential user feedback)
    const ambiguityCheck = detectAmbiguousQuery(input.trim())
    if (ambiguityCheck.isAmbiguous && ragEnabled) {
      console.log(
        `[Chat] ⚠️ Ambiguous query detected: ${ambiguityCheck.reason}`,
        ambiguityCheck.suggestions
      )
      // In the future, could show a toast or suggestion box here
      // For now, just log and proceed
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    const queryStartTime = Date.now()

    try {
      // Use unified multi-agent chat API with RAG support
      const response = await fetch('/api/unified-multi-agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: [
            {
              id: agent.id,
              name: agent.name,
              type: 'historical',
            },
          ],
          message: userMessage.content,
          context: {
            sessionHistory: messages.map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
              timestamp: m.timestamp.toISOString(),
            })),
            enableMemoryPersistence: true,
            realtimeUpdates: false,
            enableRAG: ragEnabled, // Pass RAG preference
          },
        }),
      })

      // Insufficient-token (402) and other non-OK responses return JSON, not a stream.
      if (response.status === 402) {
        const data = await response.json()
        const errorMsg: Message = {
          role: 'agent',
          content: data.error || 'Insufficient tokens to consult this agent.',
          timestamp: new Date(),
          isPaymentRequired: true,
          requiredTokens: data.requiredTokens,
        }
        setMessages(prev => [...prev, errorMsg])
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}) as any)
        throw new Error(data.error || data.details || 'Failed to get response')
      }

      if (!response.body) throw new Error('ReadableStream not supported')

      // The endpoint streams Server-Sent Events: agent_start / text / agent_complete / done / error.
      // (This page chats with a single agent, so we track one streaming message.)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''
      let finalContent = ''
      let ragSources: RAGSource[] | undefined
      let retrievalTime = 0
      let generationTime: number | undefined
      let placeholderAdded = false
      let streamError: string | null = null

      const ensureAgentMessage = () => {
        if (placeholderAdded) return
        placeholderAdded = true
        setMessages(prev => [...prev, { role: 'agent', content: '', timestamp: new Date() }])
      }

      const setAgentContent = (content: string) => {
        setMessages(prev => {
          const next = [...prev]
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === 'agent') {
              next[i] = { ...next[i], content }
              break
            }
          }
          return next
        })
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || '' // keep the incomplete trailing chunk

        for (const block of blocks) {
          const lines = block.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!eventLine || !dataLine) continue

          const event = eventLine.slice(7).trim()
          let parsed: any
          try {
            parsed = JSON.parse(dataLine.slice(6).trim())
          } catch {
            continue
          }

          // Ignore stray events addressed to a different agent.
          if (parsed.agentId && parsed.agentId !== agent.id) continue

          if (event === 'agent_start') {
            ensureAgentMessage()
          } else if (event === 'text') {
            ensureAgentMessage()
            streamedContent += parsed.text || ''
            setAgentContent(streamedContent)
          } else if (event === 'agent_complete') {
            finalContent = parsed.content || streamedContent
            generationTime = parsed.processingTime
            const sources = parsed.ragMetadata?.sources
            if (Array.isArray(sources) && sources.length > 0) {
              retrievalTime = parsed.ragMetadata?.retrievalTime || 0
              ragSources = sources.map((source: any) => ({
                id: source.id || `source-${Math.random()}`,
                agentId: agent.id,
                agentName: agent.name,
                title: source.title || 'Historical Knowledge',
                content: source.content || '',
                relevanceScore: source.score || 0,
                metadata: source.metadata,
              }))
            }
            ensureAgentMessage()
            setAgentContent(finalContent)
          } else if (event === 'error') {
            streamError = parsed.error || 'Unknown error'
          }
        }
      }

      if (streamError) throw new Error(streamError)

      const responseContent = finalContent || streamedContent
      if (!responseContent.trim()) throw new Error('No response received from agent')

      // Log analytics and get query ID for feedback
      const totalTime = Date.now() - queryStartTime
      const queryId = ragAnalytics.logQuery(
        {
          agentId: agent.id,
          agentName: agent.name,
          query: userMessage.content,
          queryLength: userMessage.content.length,
          ragUsed: ragEnabled && (ragSources?.length || 0) > 0,
          sourcesRetrieved: ragSources?.length || 0,
          retrievalTime,
          generationTime,
          totalTime,
          success: true,
          relevanceScores: ragSources?.map(s => s.relevanceScore) || [],
          averageRelevance:
            ragSources && ragSources.length > 0
              ? ragSources.reduce((sum, s) => sum + s.relevanceScore, 0) / ragSources.length
              : 0,
          sessionId,
        },
        // Pass sources for database persistence
        ragSources?.map(source => ({
          documentId: (source.metadata as any)?.documentId || source.id,
          agentId: source.agentId,
          agentName: source.agentName,
          title: source.title,
          content: source.content,
          relevanceScore: source.relevanceScore,
          metadata: source.metadata,
        }))
      )

      // Attach RAG sources + queryId to the streamed message for citations/feedback linking.
      setMessages(prev => {
        const next = [...prev]
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === 'agent') {
            next[i] = { ...next[i], content: responseContent, ragSources, queryId }
            break
          }
        }
        return next
      })
    } catch (error) {
      const errorMessage: Message = {
        role: 'agent',
        content:
          'I apologize, but I encountered an error while channeling the consciousness. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])

      // Log failed query
      ragAnalytics.logQuery(
        {
          agentId: agent.id,
          agentName: agent.name,
          query: userMessage.content,
          queryLength: userMessage.content.length,
          ragUsed: false,
          sourcesRetrieved: 0,
          retrievalTime: 0,
          totalTime: Date.now() - queryStartTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          relevanceScores: [],
          averageRelevance: 0,
          sessionId,
        },
        [] // No sources for failed queries
      )
    } finally {
      setLoading(false)
    }
  }

  if (agentLoading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="mt-4 text-muted-foreground">Loading agent consciousness...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Agent Not Found</h1>
            <p className="mb-4">The requested historical agent could not be found.</p>
            <Link href="/gallery">
              <Button>Back to Gallery</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/gallery">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gallery
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {agent.name}
            {typeof level === 'number' && (
              <span className="rounded-full border border-fuchsia-400/40 bg-gradient-to-r from-amber-400/20 to-fuchsia-500/20 px-2 py-0.5 text-xs font-bold text-fuchsia-200">
                Lv. {level}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">{agent.title}</p>
        </div>

        {/* RAG Toggle */}
        <RAGToggle enabled={ragEnabled} onToggle={setRagEnabled} size="sm" showStatus />

        {/* Weekly Menu Planner Trigger */}
        <Button
          onClick={() => setShowMenuPlanner(true)}
          variant="outline"
          size="sm"
          className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20"
        >
          <Sparkles className="h-4 w-4 mr-2 text-fuchsia-400" />
          Weekly Menu
        </Button>

        {/* Moment Synergy Display */}
        {momentSynergy && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Moment Synergy:</span>
              <span
                className={`text-lg font-bold ${momentSynergy.score >= 75 ? 'text-green-600' : momentSynergy.score >= 50 ? 'text-blue-600' : 'text-orange-600'}`}
              >
                {momentSynergy.score}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground text-right max-w-xs">
              {momentSynergy.description}
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">✓ {momentSynergy.harmonicCount} harmonic</span>
              <span className="text-orange-600">
                ⚠ {momentSynergy.challengingCount} challenging
              </span>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversation with {agent.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] overflow-y-auto border rounded-lg p-4 mb-4 bg-muted/20">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">{agent.appearance?.symbol || '👤'}</div>
                <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
                <p className="text-sm">{agent.title}</p>
                <p className="text-xs mt-2 max-w-md">
                  Ask this consciousness agent for wisdom and guidance
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`p-4 rounded-lg ${
                        message.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/10 mr-8'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-sm text-muted-foreground min-w-0">
                          {message.role === 'user' ? 'You' : agent.name}
                        </div>
                        <div className="flex-1">
                          {message.isPaymentRequired ? (
                            <div className="bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                                <Sparkles className="h-5 w-5 animate-pulse" />
                                <span>Insufficient Cosmic Energy</span>
                              </div>
                              <p className="text-sm text-gray-300">
                                To summon this agent right now, you need additional alchemical
                                elements:
                              </p>

                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {Object.entries(message.requiredTokens || {}).map(
                                  ([token, amount]) => {
                                    if (!amount || (amount as number) === 0) return null
                                    const tokenColors: Record<string, string> = {
                                      Spirit:
                                        'text-purple-400 border-purple-500/30 bg-purple-500/10',
                                      Essence: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
                                      Matter: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
                                      Substance: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
                                    }
                                    const colorClass =
                                      tokenColors[token] ||
                                      'text-gray-400 border-gray-500/30 bg-gray-500/10'

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
                                      const res = await fetch('/api/economy/yield', {
                                        method: 'POST',
                                      })
                                      const claimData = await res.json()
                                      if (res.ok) {
                                        toast.success('Cosmic yield successfully claimed!', {
                                          description: `Spirit: ${claimData.balances.spirit}, Essence: ${claimData.balances.essence}, Matter: ${claimData.balances.matter}, Substance: ${claimData.balances.substance}`,
                                        })
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
                            <>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Show source citations for agent messages with RAG sources */}
                    {message.role === 'agent' &&
                      message.ragSources &&
                      message.ragSources.length > 0 && (
                        <div className="mt-2 mr-8">
                          <SourceCitations sources={message.ragSources} variant="detailed" />
                        </div>
                      )}

                    {/* Show feedback widget for agent messages with queryId */}
                    {message.role === 'agent' && message.queryId && (
                      <div className="mt-3 mr-8">
                        <RAGFeedbackWidget
                          queryId={message.queryId}
                          agentId={agent.id}
                          agentName={agent.name}
                          sessionId={sessionId ?? ''}
                          sourcesCount={message.ragSources?.length || 0}
                          compact
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Ask ${agent.name} for guidance...`}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Thinking...' : 'Send'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Weekly Menu Planner Modal Overlay */}
      {showMenuPlanner && agent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#08080c] shadow-2xl border border-white/10">
            <button
              onClick={() => setShowMenuPlanner(false)}
              className="absolute top-4 right-6 text-white/50 hover:text-white/80 text-3xl font-normal z-10 transition-colors"
            >
              ×
            </button>
            <WeeklyMenuPlanner
              agentId={agent.id}
              agentName={agent.name}
              onClose={() => setShowMenuPlanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
