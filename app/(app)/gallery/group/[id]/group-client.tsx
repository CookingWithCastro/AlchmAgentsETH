'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Sparkles, Users, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { buildTransitUnifiedAgents, type TransitAgentDetail } from '@/lib/agents/degree-agent'

interface TransitInfo {
  aspect?: string | null
  key?: string | null
  label?: string | null
}

interface Props {
  sessionId: string
  agents: TransitAgentDetail[]
  transit: TransitInfo | null
}

type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId?: string
  agentName?: string
  agentColor?: string
  agentSymbol?: string
  timestamp: Date
  isPaymentRequired?: boolean
  requiredTokens?: Record<string, number>
}

let messageSeq = 0
function nextId(prefix: string): string {
  messageSeq += 1
  return `${prefix}-${Date.now()}-${messageSeq}`
}

export default function TransitGroupChatClient({ sessionId, agents, transit }: Props) {
  // Rebuild full UnifiedAgents (with planetaryData) so the chat API renders the rich
  // planetary prompt rather than the generic fallback.
  const unifiedAgents = useMemo(() => buildTransitUnifiedAgents(agents), [agents])

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const seededRef = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading || unifiedAgents.length === 0) return

      const userMessage: ChatMessage = {
        id: nextId('user'),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      // Snapshot prior history (excluding the just-added user turn) for the API.
      const priorMessages = messages
      setMessages(prev => [...prev, userMessage])
      setLoading(true)

      try {
        const response = await fetch('/api/unified-multi-agent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agents: unifiedAgents,
            message: trimmed,
            context: {
              sessionHistory: priorMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'agent',
                content: m.content,
                agentId: m.agentId,
                agentName: m.agentName,
                timestamp: m.timestamp.toISOString(),
              })),
              enableMemoryPersistence: true,
              realtimeUpdates: false,
              variant: 'planetary',
            },
          }),
        })

        // Insufficient-token (402) and other non-OK responses return JSON, not a stream.
        if (response.status === 402) {
          const data = await response.json().catch(() => ({}) as any)
          setMessages(prev => [
            ...prev,
            {
              id: nextId('agent'),
              role: 'agent',
              content:
                data.error || 'Insufficient cosmic energy to convene this council right now.',
              agentName: 'The Council',
              timestamp: new Date(),
              isPaymentRequired: true,
              requiredTokens: data.requiredTokens,
            },
          ])
          return
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}) as any)
          throw new Error(data.error || data.details || 'Failed to get response')
        }
        if (!response.body) throw new Error('ReadableStream not supported')

        // SSE: agent_start / text / agent_complete / done / error — one streaming
        // message per agentId.
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamError: string | null = null

        const appendToAgent = (agentId: string, chunk: string) => {
          setMessages(prev => {
            const next = [...prev]
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i].agentId === agentId) {
                next[i] = { ...next[i], content: next[i].content + chunk }
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
          buffer = blocks.pop() || ''

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

            if (event === 'agent_start') {
              const agent = unifiedAgents.find(a => a.id === parsed.agentId)
              setMessages(prev => [
                ...prev,
                {
                  id: nextId('agent'),
                  role: 'agent',
                  content: '',
                  agentId: parsed.agentId,
                  agentName: agent?.name || 'Planetary Agent',
                  agentColor: agent?.appearance?.color,
                  agentSymbol: agent?.appearance?.symbol,
                  timestamp: new Date(),
                },
              ])
            } else if (event === 'text') {
              appendToAgent(parsed.agentId, parsed.text || '')
            } else if (event === 'agent_complete') {
              if (parsed.content) {
                setMessages(prev => {
                  const next = [...prev]
                  for (let i = next.length - 1; i >= 0; i--) {
                    if (next[i].agentId === parsed.agentId) {
                      next[i] = { ...next[i], content: parsed.content }
                      break
                    }
                  }
                  return next
                })
              }
            } else if (event === 'error') {
              streamError = parsed.error || 'Unknown error'
            }
          }
        }

        if (streamError) throw new Error(streamError)
      } catch (error) {
        console.error('Transit group chat error:', error)
        setMessages(prev => [
          ...prev,
          {
            id: nextId('agent'),
            role: 'agent',
            content:
              'The council was interrupted while channeling this transit. Please try sending your message again.',
            agentName: 'The Council',
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [loading, unifiedAgents, messages]
  )

  // Auto-seed the conversation once with a transit-framed opener so the council
  // immediately speaks to the aspect that summoned it. The gate is server-side: we POST
  // the sessionId to /api/group-chat/seed, which atomically claims the seed
  // (seeded_at NULL → now()) and reports whether THIS arrival won the claim. Only the
  // winner streams the opener, so the unauthenticated, unmetered council opener fires
  // exactly once per session — fresh browsers, incognito, and cleared storage can no
  // longer re-trigger N LLM calls. seededRef only suppresses a duplicate claim within
  // this same mount (e.g. React StrictMode's double-invoke); the server claim is the
  // real, durable guard.
  useEffect(() => {
    if (seededRef.current || unifiedAgents.length === 0) return
    seededRef.current = true
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/group-chat/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
        const data = (await res.json().catch(() => ({}))) as { claimed?: boolean }
        if (cancelled || !data.claimed) return
        const opener = transit?.label
          ? `The ${transit.label} aspect is active in the sky right now. Speak to one another about what this transit stirs between you — and offer one piece of guidance for working with this energy today.`
          : 'Introduce yourselves to one another and share what each of you brings to this moment in the sky.'
        void sendMessage(opener)
      } catch {
        /* network/claim error — skip the auto-opener; the user can still send a message */
      }
    })()
    return () => {
      cancelled = true
    }
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input
    setInput('')
    void sendMessage(text)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0319] via-[#1a0838] to-[#0c0319] text-white relative">
      {/* Starfield */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 15% 25%, rgba(255, 255, 255, 0.7), transparent), radial-gradient(1.5px 1.5px at 78% 12%, rgba(167, 139, 250, 0.8), transparent), radial-gradient(1px 1px at 35% 68%, rgba(255, 255, 255, 0.6), transparent)',
          backgroundSize: '500px 500px, 400px 400px, 300px 300px',
        }}
      />

      <div className="container relative z-10 mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/gallery">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Gallery
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6 text-purple-400" />
              {transit?.label || 'Transit Council'}
            </h1>
            <p className="text-sm text-purple-200/70">
              A council of {unifiedAgents.length} planetary{' '}
              {unifiedAgents.length === 1 ? 'agent' : 'agents'}
              {transit?.aspect ? ` · ${transit.aspect} aspect` : ''}
            </p>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-4 flex flex-wrap gap-2">
          {agents.map(a => (
            <span
              key={a.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-sm backdrop-blur-md"
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                {a.planet?.[0] ?? '✦'}
              </span>
              <span className="font-medium">{a.name || `${a.planet} in ${a.sign}`}</span>
              <span className="text-xs text-purple-300/60">{a.degree}°</span>
            </span>
          ))}
        </div>

        {/* Conversation */}
        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md">
          <div className="h-[60vh] space-y-4 overflow-y-auto p-4">
            {transit?.label && (
              <div className="mx-auto max-w-2xl rounded-xl border border-purple-500/30 bg-purple-900/20 p-3 text-center text-sm text-purple-100 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                <Sparkles className="mr-1 inline h-4 w-4 text-amber-400" />
                These agents were summoned by the active transit{' '}
                <strong className="text-white">{transit.label}</strong>.
              </div>
            )}

            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {message.role === 'agent' && (
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: message.agentColor || '#6b7280' }}
                  >
                    {message.agentSymbol || message.agentName?.[0] || '✦'}
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  {message.role === 'agent' && message.agentName && (
                    <div className="mb-1 text-sm font-medium text-purple-200">
                      {message.agentName}
                    </div>
                  )}

                  {message.isPaymentRequired ? (
                    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-black/60 p-4 text-left backdrop-blur-md">
                      <div className="flex items-center gap-2 font-semibold text-amber-400">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                        <span>Insufficient Cosmic Energy</span>
                      </div>
                      <p className="text-sm text-gray-300">{message.content}</p>
                      {message.requiredTokens && (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(message.requiredTokens).map(([token, amount]) =>
                            amount ? (
                              <div
                                key={token}
                                className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2"
                              >
                                <span className="text-xs font-semibold">{token}</span>
                                <span className="text-sm font-bold">{amount}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                      <Button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/economy/yield', { method: 'POST' })
                            const claimData = await res.json()
                            if (res.ok) {
                              toast.success('Cosmic yield claimed!')
                              window.location.reload()
                            } else {
                              toast.error(claimData.message || 'Already claimed today.')
                            }
                          } catch {
                            toast.error('Failed to claim yield. Try again later.')
                          }
                        }}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-black hover:from-amber-600 hover:to-amber-700"
                      >
                        Claim Cosmic Yield
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`rounded-lg border p-3 backdrop-blur-md ${
                        message.role === 'user'
                          ? 'border-purple-500/30 bg-purple-600/40 text-white'
                          : 'border-white/10 bg-black/40 text-purple-50'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content || <span className="text-purple-300/50">…</span>}
                      </p>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-purple-300/40">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-purple-300/80">
                <Activity className="h-4 w-4 animate-spin text-purple-400" />
                The council is in dialogue…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-white/10 bg-black/20 p-4"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the council about this transit…"
              disabled={loading}
              className="flex-1 border-white/20 bg-black/40 text-white placeholder:text-purple-300/50 focus-visible:ring-purple-500/50"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
