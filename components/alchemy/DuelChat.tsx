'use client'

import { useRef, useState } from 'react'

import { AlchemicalButton } from './AlchemicalButton'
import { RitualInput } from './RitualInput'
import { useOccultStore } from '@/lib/store/occult-store'
import { cn } from '@/lib/utils'

/**
 * Jing Arena — Active Duel (Stitch realization plan, Phase 5, Module 3).
 * Streams a true turn-based exchange between the two REAL agents chosen in
 * the Synastry Assembly via /api/unified-multi-agent-chat (SSE; each agent
 * sees the prior agent's words; server runs the free model chain).
 */

interface DuelMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  agentId?: string
  agentName?: string
  timestamp: string
  streaming?: boolean
}

export function DuelChat({ onAssemble }: { onAssemble: () => void }) {
  const { caster, target } = useOccultStore()
  const setBalances = useOccultStore(state => state.setBalances)
  const [topic, setTopic] = useState('')
  const [messages, setMessages] = useState<DuelMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [yieldNote, setYieldNote] = useState<string | null>(null)
  const idCounter = useRef(0)

  const nextId = () => `duel-${++idCounter.current}`

  // The earn side of the loop: a PAID completed round grants a small ESMS
  // yield (daily-capped server-side). The claim token arrives in the round's
  // `done` SSE event; without one (signed out / free rotation) we skip silently.
  const claimDuelYield = async (claimToken: string) => {
    try {
      const res = await fetch('/api/economy/duel-yield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.success) return
      if (data.balances && typeof data.balances.spirit === 'number') {
        setBalances({
          spirit: Number(data.balances.spirit),
          essence: Number(data.balances.essence),
          matter: Number(data.balances.matter),
          substance: Number(data.balances.substance),
        })
      }
      if (data.capped) {
        setYieldNote('The arena has yielded all it will today.')
      } else if (data.awarded) {
        setYieldNote(
          `The duel yields tribute: +${data.awarded.spirit} Spirit, +${data.awarded.essence} Essence, +${data.awarded.matter} Matter, +${data.awarded.substance} Substance (${data.claimsToday}/${data.dailyCap} today).`
        )
      }
    } catch {
      // Yield is a bonus — never let it disturb the duel itself.
    }
  }

  if (!caster || !target) {
    return (
      <div className="min-h-screen bg-st-background flex flex-col items-center justify-center text-center px-margin-mobile">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-3">
          The ring stands empty
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">
          Two entities must be bound in the Synastry Assembly before a Jing Duel can commence.
        </p>
        <AlchemicalButton variant="secondary" onClick={onAssemble}>
          Open Synastry Assembly
        </AlchemicalButton>
      </div>
    )
  }

  const appendOrUpdate = (msg: DuelMessage) => {
    setMessages(prev => {
      const i = prev.findIndex(m => m.id === msg.id)
      if (i === -1) return [...prev, msg]
      const copy = [...prev]
      copy[i] = msg
      return copy
    })
  }

  const runRound = async (prompt: string) => {
    setBusy(true)
    setError(null)
    const userMsg: DuelMessage = {
      id: nextId(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }
    const history = [...messages, userMsg]
    setMessages(history)

    try {
      const res = await fetch('/api/unified-multi-agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: [
            { id: caster.agentId, name: caster.name, title: caster.title, type: 'historical' },
            { id: target.agentId, name: target.name, title: target.title, type: 'historical' },
          ],
          message: prompt,
          context: {
            sessionHistory: history,
            enableMemoryPersistence: false,
            realtimeUpdates: true,
            variant: 'gallery',
            theme: 'jing-arena-duel',
          },
        }),
      })

      if (res.status === 402) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Insufficient ESMS tokens for this communion.')
      }
      if (res.status === 429) {
        throw new Error('The arena demands patience — rate limit reached. Try again shortly.')
      }
      if (!res.ok || !res.body) {
        throw new Error(`The duel channel collapsed (${res.status}).`)
      }

      // Parse the SSE stream: agent_start / text / agent_complete / done / error
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let duelClaimToken: string | null = null
      const liveIds: Record<string, string> = {}

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let sep: number
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)
          const eventMatch = raw.match(/^event: (.+)$/m)
          const dataMatch = raw.match(/^data: (.+)$/m)
          if (!eventMatch || !dataMatch) continue
          const event = eventMatch[1].trim()
          let data: any
          try {
            data = JSON.parse(dataMatch[1])
          } catch {
            continue
          }

          if (event === 'agent_start') {
            const msgId = nextId()
            liveIds[data.agentId] = msgId
            const who = data.agentId === caster.agentId ? caster : target
            appendOrUpdate({
              id: msgId,
              role: 'agent',
              content: '',
              agentId: data.agentId,
              agentName: who.name,
              timestamp: new Date().toISOString(),
              streaming: true,
            })
          } else if (event === 'text' && liveIds[data.agentId]) {
            setMessages(prev =>
              prev.map(m =>
                m.id === liveIds[data.agentId] ? { ...m, content: m.content + data.text } : m
              )
            )
          } else if (event === 'agent_complete' && liveIds[data.agentId]) {
            setMessages(prev =>
              prev.map(m =>
                m.id === liveIds[data.agentId]
                  ? { ...m, content: data.content ?? m.content, streaming: false }
                  : m
              )
            )
          } else if (event === 'done') {
            duelClaimToken = typeof data.duelClaimToken === 'string' ? data.duelClaimToken : null
          } else if (event === 'error') {
            throw new Error(data.error ?? 'Unknown arena disturbance')
          }
        }
      }

      // Round complete — claim the arena yield (awaited so the note lands
      // with the round's end). No token means the round wasn't billed.
      if (duelClaimToken) {
        await claimDuelYield(duelClaimToken)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The duel channel collapsed.')
    } finally {
      setBusy(false)
      setMessages(prev => prev.map(m => ({ ...m, streaming: false })))
    }
  }

  return (
    <div className="min-h-screen bg-st-background pb-56 md:pb-40">
      {/* Versus header */}
      <header className="px-margin-mobile md:px-margin-desktop pt-10 max-w-container-max mx-auto flex items-center justify-between gap-4">
        <div className="text-left">
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-spirit-violet">
            Caster
          </p>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{caster.name}</h2>
        </div>
        <span className="material-symbols-outlined text-st-secondary text-3xl" aria-hidden>
          swords
        </span>
        <div className="text-right">
          <p className="font-label-mono text-[11px] uppercase tracking-widest text-st-secondary">
            Target
          </p>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{target.name}</h2>
        </div>
      </header>

      {/* Transcript */}
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto mt-8 flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="font-body-md text-body-md text-outline text-center py-12">
            Pose a matter of contention. Each entity will answer in turn — and they will hear each
            other.
          </p>
        )}
        {messages.map(msg =>
          msg.role === 'user' ? (
            <div key={msg.id} className="self-center glass-float rounded-full px-6 py-2">
              <p className="font-label-mono text-label-mono text-on-surface">{msg.content}</p>
            </div>
          ) : (
            <div
              key={msg.id}
              className={cn(
                'max-w-[85%] md:max-w-[70%] rounded-xl p-5 glass-panel',
                msg.agentId === caster.agentId
                  ? 'self-start glow-violet border border-spirit-violet/30'
                  : 'self-end gold-border-glow',
                msg.streaming && 'heat-haze'
              )}
            >
              <p
                className={cn(
                  'font-label-mono text-[11px] uppercase tracking-widest mb-2',
                  msg.agentId === caster.agentId ? 'text-spirit-violet' : 'text-st-secondary'
                )}
              >
                {msg.agentName}
              </p>
              <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap">
                {msg.content || (msg.streaming ? '…' : '')}
              </p>
              {msg.streaming && <span className="dot-typing mt-3 ml-1" aria-label="responding" />}
            </div>
          )
        )}
        {yieldNote && (
          <div className="self-center glass-panel rounded-full px-6 py-2 gold-border-glow">
            <p className="font-label-mono text-[11px] uppercase tracking-widest text-st-secondary">
              {yieldNote}
            </p>
          </div>
        )}
        {error && (
          <div className="error-glow rounded-lg p-4 font-label-mono text-label-mono text-error">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 left-0 right-0 md:left-64 px-margin-mobile md:px-margin-desktop"
        onSubmit={e => {
          e.preventDefault()
          if (!topic.trim() || busy) return
          void runRound(topic.trim())
          setTopic('')
        }}
      >
        <div className="max-w-3xl mx-auto flex items-end gap-3 glass-float rounded-xl p-3">
          <div className="flex-1">
            <RitualInput
              label="MATTER OF CONTENTION"
              placeholder="e.g. Is mathematics discovered or invented?"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={busy}
            />
          </div>
          <AlchemicalButton type="submit" disabled={busy || !topic.trim()}>
            {busy ? 'Dueling…' : messages.length ? 'Next Round' : 'Begin'}
          </AlchemicalButton>
        </div>
      </form>
    </div>
  )
}
