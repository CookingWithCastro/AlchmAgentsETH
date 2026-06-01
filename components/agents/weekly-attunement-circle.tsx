'use client'

/**
 * Weekly Attunement Circle — the best-dignity rotation as ONE mixed room.
 *
 * Human + the week's 3 FREE featured guides + the active-aspect degree sprites
 * all converse in a single streamed thread (via /api/unified-multi-agent-chat,
 * fee waived for the free rotation). The reward scales with engagement: more
 * exchanges → more ESMS (up to a weekly cap), claimed alongside live transit
 * attunement Sky-Drops.
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Gift, Send, Stars, Orbit, Loader2 } from 'lucide-react'

const MIN_EXCHANGES = 4 // mirrors CHAT_QUEST_REWARD.minExchanges

interface TopPlanet {
  planet: string
  sign: string
  degree: number
  tier: string
  factor: number
  retrograde: boolean
  spriteId: string
}
interface ActiveAspect {
  a: string
  b: string
  aspect: string
  orb: number
  exact: boolean
}
interface Guide {
  id: string
  name: string
  free: boolean
}
interface CouncilAgent {
  planet: string
  sign: string
  degree: string
  spriteId: string
  tier: string
}
interface RosterAgent {
  id: string
  name: string
  type: string
}
interface WeeklyFeature {
  ok: boolean
  weekStart: string
  weekEnd: string
  topPlanets: TopPlanet[]
  activeAspects: ActiveAspect[]
  guides: Guide[]
  council: CouncilAgent[]
  roster: RosterAgent[]
}
interface ChatMsg {
  key: string
  role: 'user' | 'agent'
  who: string
  agentId?: string
  content: string
  streaming?: boolean
}

const tierClass: Record<string, string> = {
  exaltation: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  domicile: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  peregrine: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  detriment: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  fall: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
}

export default function WeeklyAttunementCircle() {
  const [feature, setFeature] = useState<WeeklyFeature | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [exchanges, setExchanges] = useState(0)

  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState<string | null>(null)

  const sessionId = useRef(`circle-${Math.random().toString(36).slice(2)}`)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/agents/weekly-feature')
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) throw new Error(data.error || 'Failed to load weekly feature')
        setFeature(data)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function nameFor(agentId: string): string {
    return feature?.roster.find(r => r.id === agentId)?.name ?? agentId
  }

  async function send() {
    const msg = input.trim()
    if (!msg || busy || !feature?.roster?.length) return
    setInput('')
    const userMsg: ChatMsg = { key: `u-${Date.now()}`, role: 'user', who: 'You', content: msg }
    // Build the history the agents will see BEFORE we add streaming placeholders.
    const history = [...messages, userMsg].map(m => ({
      id: m.key,
      role: m.role,
      content: m.content,
      agentId: m.agentId,
      agentName: m.who,
      timestamp: new Date(),
    }))
    setMessages(m => [...m, userMsg])
    setBusy(true)

    try {
      const res = await fetch('/api/unified-multi-agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: feature.roster,
          message: msg,
          context: {
            sessionId: sessionId.current,
            sessionHistory: history,
            variant: 'planetary',
            enableMemoryPersistence: false,
            realtimeUpdates: true,
          },
        }),
      })
      if (!res.ok || !res.body) {
        const t = await res.text().catch(() => res.statusText)
        throw new Error(`circle unavailable (${res.status}): ${t.slice(0, 120)}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          let event = 'message'
          let dataStr = ''
          for (const line of raw.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
          }
          if (!dataStr) continue
          let data: any
          try {
            data = JSON.parse(dataStr)
          } catch {
            continue
          }
          handleEvent(event, data)
        }
      }
      setExchanges(n => n + 1)
    } catch (err: any) {
      toast.error(err?.message ?? String(err))
    } finally {
      setBusy(false)
      setMessages(m => m.map(x => (x.streaming ? { ...x, streaming: false } : x)))
    }
  }

  function handleEvent(event: string, data: any) {
    if (event === 'agent_start' && data?.agentId) {
      setMessages(m => [
        ...m,
        {
          key: `a-${data.agentId}-${Date.now()}-${m.length}`,
          role: 'agent',
          who: nameFor(data.agentId),
          agentId: data.agentId,
          content: '',
          streaming: true,
        },
      ])
    } else if (event === 'text' && data?.agentId) {
      setMessages(m => {
        const i = lastStreamingIndex(m, data.agentId)
        if (i < 0) return m
        const copy = m.slice()
        copy[i] = { ...copy[i]!, content: copy[i]!.content + (data.text ?? '') }
        return copy
      })
    } else if (event === 'agent_complete' && data?.agentId) {
      setMessages(m => {
        const i = lastStreamingIndex(m, data.agentId)
        if (i < 0) return m
        const copy = m.slice()
        copy[i] = { ...copy[i]!, content: data.content ?? copy[i]!.content, streaming: false }
        return copy
      })
    } else if (event === 'error') {
      toast.error(data?.error || 'Circle error')
    }
  }

  function lastStreamingIndex(m: ChatMsg[], agentId: string): number {
    for (let i = m.length - 1; i >= 0; i--)
      if (m[i]!.agentId === agentId && m[i]!.streaming) return i
    return -1
  }

  async function claim() {
    if (claiming) return
    setClaiming(true)
    try {
      const res = await fetch('/api/agents/weekly-attunement/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageCount: exchanges }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(
          data.error === 'circle_incomplete'
            ? `Exchange at least ${data.need} times first (${data.have}/${data.need}).`
            : data.error || 'Claim failed'
        )
        return
      }
      const q = data.quest
      const parts: string[] = []
      if (q?.alreadyClaimed) parts.push('weekly reward already claimed')
      else if (q?.ok) parts.push(`+${q.total} ESMS quest reward`)
      else if (q?.error) parts.push('quest reward pending (alchm.kitchen)')
      if (data.attunement?.attunements) parts.push(`${data.attunement.attunements} sky-drop(s)`)
      setClaimed(parts.join(' · ') || 'Circle complete')
      toast.success('🌠 Attunement circle complete!')
    } catch (err: any) {
      toast.error(`Claim failed: ${err?.message ?? err}`)
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Reading the week&apos;s sky…
      </div>
    )
  }
  if (error || !feature) {
    return <div className="py-16 text-center text-rose-400">Failed to load: {error}</div>
  }

  const canClaim = exchanges >= MIN_EXCHANGES

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <header className="space-y-1 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold text-slate-100">
          <Stars className="h-6 w-6 text-amber-300" /> Attunement Circle
        </h1>
        <p className="text-sm text-slate-400">
          Best dignity of the week · {feature.weekStart} → {feature.weekEnd}
        </p>
      </header>

      <Card className="border-slate-700/60 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Sparkles className="h-4 w-4 text-amber-300" /> Strongest sky this week
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {feature.topPlanets.map(p => (
            <span
              key={p.spriteId}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${tierClass[p.tier] ?? tierClass.peregrine}`}
              title={`dignity ×${p.factor}`}
            >
              {p.planet} {p.sign} {p.degree}° · {p.tier}
              {p.retrograde ? ' ℞' : ''}
            </span>
          ))}
        </CardContent>
      </Card>

      {/* The circle (one mixed room) */}
      <Card className="border-violet-700/40 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Orbit className="h-4 w-4 text-violet-300" /> The circle
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {feature.roster.map(r => (
              <span
                key={r.id}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  r.type === 'historical'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-violet-500/30 bg-violet-500/10 text-violet-200'
                }`}
              >
                {r.name}
                {r.type === 'historical' ? ' · guide · free' : ''}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            ref={scrollRef}
            className="max-h-96 space-y-2 overflow-y-auto rounded-md bg-slate-800/40 p-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Greet the circle — your guides and the degree agents of this week&apos;s aspects are
                listening. The more you attune, the more ESMS you earn.
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.key} className="text-sm">
                <span
                  className={
                    msg.role === 'user'
                      ? 'font-semibold text-sky-300'
                      : 'font-semibold text-amber-200'
                  }
                >
                  {msg.who}:
                </span>{' '}
                <span className="text-slate-200">
                  {msg.content}
                  {msg.streaming && <span className="animate-pulse text-slate-500"> ▋</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Speak to the circle…"
              disabled={busy || !feature.roster.length}
            />
            <Button
              onClick={send}
              disabled={busy || !input.trim() || !feature.roster.length}
              size="icon"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active aspects context */}
      <Card className="border-slate-700/60 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-200">
            <Orbit className="h-4 w-4 text-sky-300" /> Active aspects of the week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-300">
          {feature.activeAspects.length === 0 && (
            <p className="text-slate-500">No major aspects in orb right now.</p>
          )}
          {feature.activeAspects.slice(0, 8).map((a, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="capitalize">
                {a.a} {a.aspect} {a.b}
              </span>
              <span className={`text-xs ${a.exact ? 'text-amber-300' : 'text-slate-500'}`}>
                orb {a.orb}°{a.exact ? ' · exact' : ''}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Earn */}
      <Card className="border-amber-700/40 bg-amber-950/20">
        <CardContent className="flex flex-col items-center gap-3 py-5 text-center">
          <p className="text-sm text-slate-300">
            The more you attune, the more you earn ({Math.min(exchanges, MIN_EXCHANGES)}/
            {MIN_EXCHANGES} to unlock; reward scales with engagement) — live sky-drops + this
            week&apos;s circle reward.
          </p>
          {claimed ? (
            <p className="font-medium text-emerald-300">🌠 {claimed}</p>
          ) : (
            <Button onClick={claim} disabled={!canClaim || claiming} className="gap-2">
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {canClaim
                ? 'Complete circle & claim ESMS'
                : `Keep attuning (${exchanges}/${MIN_EXCHANGES})`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
