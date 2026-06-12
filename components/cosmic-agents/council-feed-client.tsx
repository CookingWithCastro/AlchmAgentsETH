'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { ChartWheel } from './chart-wheel'
import { Avatar, CooldownRing, ElementalBar } from './agent-atoms'
import { FeedCard, type CardCtx } from './feed-cards'
import { AgentDrawer } from './agent-drawer'
import { JING_MOVES, PLANETS, ASP_SYM } from './constants'
import { compatibility, isActivated } from './agent-adapter'
import { spriteTierLabel } from '@/lib/agents/agent-type-model'
import { SEED_FEED_EVENTS } from './seed-data'
import type {
  ChartOfMoment,
  CouncilAgent,
  FeedEvent,
  Element,
  JingMoveId,
  PlanetName,
  StreamingEvent,
  JingDuelEvent,
  EvolutionEvent,
  PactEvent,
  SystemEvent,
} from './types'

interface Props {
  initialChart: ChartOfMoment
  initialAgents: CouncilAgent[]
  initialUserAgent: CouncilAgent | null
  initialFeed?: FeedEvent[]
  desktopWidget?: boolean
}

type NativeNotificationEvent = EvolutionEvent | PactEvent | SystemEvent

function isNativeNotificationEvent(event: FeedEvent): event is NativeNotificationEvent {
  return event.type === 'evolution' || event.type === 'pact' || event.type === 'system'
}

function notificationCopy(
  event: NativeNotificationEvent,
  agentById: (id: string) => CouncilAgent | undefined
) {
  if (event.type === 'evolution') {
    const agentName = agentById(event.agentId)?.name || event.agentId
    return {
      title: `Alchm: ${agentName}`,
      body: event.body || `${agentName} evolved from ${event.from} to ${event.to}.`,
    }
  }

  if (event.type === 'pact') {
    return {
      title: `Alchm: ${event.title}`,
      body: `${event.duration} pact active. Bond ${Math.round(event.bond * 100)}%. ${event.triggers}`,
    }
  }

  return {
    title: `Alchm: ${event.title}`,
    body: event.body,
  }
}

async function sendNativeNotification(
  event: NativeNotificationEvent,
  agentById: (id: string) => CouncilAgent | undefined
) {
  try {
    const { isTauri } = await import('@tauri-apps/api/core')
    if (!isTauri()) return

    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification')
    const permitted = (await isPermissionGranted()) || (await requestPermission()) === 'granted'
    if (!permitted) return

    sendNotification(notificationCopy(event, agentById))
  } catch (err) {
    console.warn('[council-feed] native notification failed:', err)
  }
}

function trayStateForFeedEvent(event: FeedEvent): 'fire' | 'water' | 'earth' | null {
  if (event.type !== 'streaming' && event.type !== 'jing-duel') return null

  const move = JING_MOVES[event.move]
  if (!move || event.cost.spent < 15) return null

  if (event.move === 'meltdown' || move.element.includes('Fire')) return 'fire'
  if (event.move === 'freeze' || move.element.includes('Water')) return 'water'
  if (event.move === 'tectonicRoot' || move.element.includes('Earth')) return 'earth'

  return null
}

async function setNativeTrayState(state: 'idle' | 'fire' | 'water' | 'earth') {
  try {
    const { invoke, isTauri } = await import('@tauri-apps/api/core')
    if (!isTauri()) return
    await invoke('set_tray_state', { state })
  } catch (err) {
    console.warn('[council-feed] tray state update failed:', err)
  }
}

export function CouncilFeedClient({
  initialChart,
  initialAgents,
  initialUserAgent,
  initialFeed,
  desktopWidget = false,
}: Props) {
  const [selectedAgent, setSelectedAgent] = useState<CouncilAgent | null>(null)
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [chart] = useState<ChartOfMoment>(initialChart)
  const [events, setEvents] = useState<FeedEvent[]>(
    initialFeed && initialFeed.length ? initialFeed : SEED_FEED_EVENTS
  )
  const [statsOverlay, setStatsOverlay] = useState<
    Record<string, Partial<CouncilAgent['stats']> & { cooldown?: number }>
  >({})
  const nativeNotificationIds = useRef<Set<string>>(new Set())
  const trayPulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Pagination & reconnection state ── */
  const latestTimestamp = useRef<string | null>(events.length ? String(events[0].timestamp) : null)
  const [feedCursor, setFeedCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const allAgents = useMemo<CouncilAgent[]>(() => {
    const list = initialUserAgent ? [initialUserAgent, ...initialAgents] : initialAgents
    return list.map(a => {
      const o = statsOverlay[a.id]
      if (!o) return a
      const { cooldown, ...statOverrides } = o
      return {
        ...a,
        stats: { ...a.stats, ...statOverrides },
        cooldown: cooldown ?? a.cooldown,
      }
    })
  }, [initialAgents, initialUserAgent, statsOverlay])

  const agentById = useCallback(
    (id: string): CouncilAgent | undefined => allAgents.find(a => a.id === id),
    [allAgents]
  )

  const cardCtx: CardCtx = useMemo(
    () => ({
      agentById,
      onAgentClick: a => setSelectedAgent(a),
    }),
    [agentById]
  )

  // Cosmic levels for the roster badges — bulk, Prisma-backed, resilient.
  // On any failure the badges simply don't render.
  useEffect(() => {
    let cancelled = false
    fetch('/api/agents/leveling')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.leveling) return
        const m: Record<string, number> = {}
        for (const [id, v] of Object.entries(d.leveling as Record<string, { level?: number }>)) {
          if (typeof v?.level === 'number') m[id] = v.level
        }
        setLevels(m)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleNativeTelemetry = useCallback(
    (incoming: FeedEvent) => {
      const trayState = trayStateForFeedEvent(incoming)
      if (trayState) {
        if (trayPulseTimeout.current) clearTimeout(trayPulseTimeout.current)
        void setNativeTrayState(trayState)
        trayPulseTimeout.current = setTimeout(() => {
          void setNativeTrayState('idle')
          trayPulseTimeout.current = null
        }, 3000)
      }

      if (!isNativeNotificationEvent(incoming)) return
      if (nativeNotificationIds.current.has(incoming.id)) return

      nativeNotificationIds.current.add(incoming.id)
      void sendNativeNotification(incoming, agentById)
    },
    [agentById]
  )

  /* ── SSE feed stream subscription ── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/feed/stream')

      /* On reconnect (open fires again), catch up missed events */
      es.addEventListener('open', () => {
        if (!latestTimestamp.current) return
        fetch(`/api/feed?since=${encodeURIComponent(latestTimestamp.current)}`)
          .then(r => r.json())
          .then(({ events: missed }: { events: FeedEvent[] }) => {
            if (!missed?.length) return
            setEvents(prev => {
              const existingIds = new Set(prev.map(p => p.id))
              const fresh = missed.filter(m => !existingIds.has(m.id))
              if (!fresh.length) return prev
              return [...fresh, ...prev].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              )
            })
          })
          .catch(() => {
            /* catch-up failed; will retry on next reconnect */
          })
      })

      es.addEventListener('feed', e => {
        try {
          const incoming = JSON.parse((e as MessageEvent).data) as FeedEvent
          latestTimestamp.current = String(incoming.timestamp)
          handleNativeTelemetry(incoming)
          setEvents(prev => [incoming, ...prev.filter(p => p.id !== incoming.id)])
        } catch {
          /* ignore */
        }
      })
      es.addEventListener('token', e => {
        try {
          const { id, chunk } = JSON.parse((e as MessageEvent).data)
          setEvents(prev =>
            prev.map(p => {
              if (p.id !== id || p.type !== 'streaming') return p
              const s = p as StreamingEvent
              return { ...s, streamingVoice: (s.streamingVoice || '') + chunk }
            })
          )
        } catch {
          /* ignore */
        }
      })
      es.addEventListener('resolution', e => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as FeedEvent
          handleNativeTelemetry(payload)
          setEvents(prev => prev.map(p => (p.id === payload.id ? payload : p)))
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* SSE not available; chat continues against seed/bootstrap */
    }
    return () => {
      es?.close()
      if (trayPulseTimeout.current) {
        clearTimeout(trayPulseTimeout.current)
        trayPulseTimeout.current = null
      }
    }
  }, [handleNativeTelemetry])

  /* ── Load older events (cursor pagination) ── */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const oldest = feedCursor || events[events.length - 1]?.timestamp
      if (!oldest) {
        setHasMore(false)
        return
      }
      const res = await fetch(`/api/feed?before=${encodeURIComponent(String(oldest))}`)
      const { events: older, cursor, hasMore: more } = await res.json()
      if (older?.length) {
        setEvents(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const fresh = (older as FeedEvent[]).filter(o => !existingIds.has(o.id))
          return [...prev, ...fresh]
        })
        setFeedCursor(cursor)
      }
      setHasMore(!!more)
    } catch {
      /* pagination fetch failed — user can retry */
    } finally {
      setLoadingMore(false)
    }
  }, [events, feedCursor, hasMore, loadingMore])

  /* ── Cast handler — POSTs to /api/feed/cast which streams the SSE back ── */
  const castMove = useCallback(
    async (casterId: string, moveId: JingMoveId, targetId: string) => {
      const caster = agentById(casterId)
      const target = agentById(targetId)
      const move = JING_MOVES[moveId]
      if (!caster || !target || !move) return

      const statKey = move.cost.stat as keyof CouncilAgent['stats']
      const beforeStat = (caster.stats[statKey] as number | undefined) ?? 80
      const afterStat = Math.max(0, beforeStat - move.cost.amount)
      const id = 'cast-' + Date.now()

      const fallbackVoices: Record<JingMoveId, string> = {
        meltdown: `Your structure does not survive my heat. ${target.name} — burn into clearer form.`,
        freeze: `The current you ride freezes here. Speak only what holds shape inside ice.`,
        tectonicRoot: `I do not move. ${target.name}'s argument arrives, finds bedrock, and politely leaves.`,
        vacuum: `The air thins. The flame that was your point starves. Try again in vacuum.`,
        erode: `Patience dissolves what force cannot. Your citadel becomes my question.`,
      }

      const streaming: StreamingEvent = {
        id,
        type: 'streaming',
        timestamp: new Date().toISOString(),
        initiator: casterId,
        target: targetId,
        move: moveId,
        cost: { stat: statKey, spent: move.cost.amount, before: beforeStat, after: afterStat },
        streamingVoice: fallbackVoices[moveId],
        streamingProgress: 0,
        confidence: 0.85,
      }
      setEvents(prev => [streaming, ...prev])

      /* Optimistic local stat overlay */
      setStatsOverlay(prev => ({
        ...prev,
        [casterId]: { ...prev[casterId], [statKey]: afterStat, cooldown: 18 },
      }))

      /* POST to backend; consume SSE response. Falls back to canned voice + 3.5s resolve on failure. */
      try {
        const res = await fetch('/api/feed/cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ casterId, moveId, targetId, eventId: id }),
        })
        if (!res.ok || !res.body) throw new Error('cast failed')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          let currentEvent = ''
          for (const line of lines) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim()
            else if (line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (!data) continue
              try {
                const payload = JSON.parse(data)
                if (currentEvent === 'token') {
                  setEvents(prev =>
                    prev.map(p => {
                      if (p.id !== id || p.type !== 'streaming') return p
                      const s = p as StreamingEvent
                      return {
                        ...s,
                        streamingVoice: (s.streamingVoice || '') + (payload.chunk || ''),
                      }
                    })
                  )
                } else if (currentEvent === 'resolution') {
                  const resolved: JingDuelEvent = {
                    id,
                    type: 'jing-duel',
                    status: payload.status || 'active',
                    timestamp: new Date().toISOString(),
                    initiator: casterId,
                    target: targetId,
                    move: moveId,
                    cost: {
                      stat: statKey,
                      spent: move.cost.amount,
                      before: beforeStat,
                      after: afterStat,
                    },
                    intensity: payload.intensity ?? 0.85,
                    voice: payload.voice || fallbackVoices[moveId],
                    rulerBoost: caster.isRulerOfMoment ? 1.15 : undefined,
                    confidence: payload.confidence ?? 0.85,
                    thread: payload.thread || [],
                  }
                  setEvents(prev => prev.map(p => (p.id === id ? resolved : p)))
                }
              } catch {
                /* ignore */
              }
            }
          }
        }
      } catch {
        /* Network or endpoint unavailable — locally resolve after 3.5s using the prototype's behavior */
        setTimeout(() => {
          setEvents(prev =>
            prev.map(e => {
              if (e.id !== id || e.type !== 'streaming') return e
              const s = e as StreamingEvent
              const resolved: JingDuelEvent = {
                id,
                type: 'jing-duel',
                status: 'active',
                timestamp: s.timestamp,
                initiator: casterId,
                target: targetId,
                move: moveId,
                cost: s.cost,
                intensity: 0.85,
                voice: s.streamingVoice,
                rulerBoost: caster.isRulerOfMoment ? 1.15 : undefined,
                confidence: s.confidence,
                thread: [],
              }
              return resolved
            })
          )
        }, 3500)
      }
    },
    [agentById]
  )

  const filterTypes = useMemo(
    () => [
      { id: 'all', label: 'All', match: (_e: FeedEvent) => true },
      {
        id: 'jing-duel',
        label: 'Duels',
        match: (e: FeedEvent) => e.type === 'jing-duel' || e.type === 'streaming',
      },
      {
        id: 'transits',
        label: 'Transits',
        match: (e: FeedEvent) => e.type === 'planetary-degree' || e.type === 'aspect-activation',
      },
      {
        id: 'alliance',
        label: 'Bonds',
        match: (e: FeedEvent) =>
          e.type === 'alliance' || e.type === 'pact' || e.type === 'council' || e.type === 'sigil',
      },
      {
        id: 'insight',
        label: 'Insights',
        match: (e: FeedEvent) => e.type === 'insight' || e.type === 'lab-entry',
      },
      { id: 'evolution', label: 'Evolutions', match: (e: FeedEvent) => e.type === 'evolution' },
    ],
    []
  )

  const filterCounts = useMemo(
    () => Object.fromEntries(filterTypes.map(f => [f.id, events.filter(f.match).length])),
    [events, filterTypes]
  )

  const filteredEvents = useMemo(() => {
    const f = filterTypes.find(f => f.id === activeFilter) || filterTypes[0]
    return events.filter(f.match)
  }, [activeFilter, events, filterTypes])

  const orderedEvents = useMemo(() => {
    const streaming = filteredEvents.filter(e => e.type === 'streaming')
    const active = filteredEvents.filter(
      (e): e is JingDuelEvent => e.type === 'jing-duel' && e.status === 'active'
    )
    const rest = filteredEvents.filter(
      e => !(streaming as FeedEvent[]).includes(e) && !(active as FeedEvent[]).includes(e)
    )
    return [...streaming, ...active, ...rest]
  }, [filteredEvents])

  return (
    <div className={'cosmic-feed-root' + (desktopWidget ? ' desktop-widget' : '')}>
      <div className="app">
        {!desktopWidget && <Topbar timestamp={chart.timestamp} thermo={chart.thermodynamics} />}
        <div className="shell">
          {!desktopWidget && <ChartOfMomentColumn chart={chart} />}
          <FeedColumn
            events={orderedEvents}
            agents={allAgents}
            userAgent={initialUserAgent}
            filters={filterTypes}
            counts={filterCounts}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            cardCtx={cardCtx}
            onAgentClick={setSelectedAgent}
            onCast={castMove}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
          {!desktopWidget && (
            <RosterColumn
              chart={chart}
              agents={allAgents}
              userAgent={initialUserAgent}
              onSelect={setSelectedAgent}
              selected={selectedAgent}
              levels={levels}
            />
          )}
        </div>
        {!desktopWidget && selectedAgent && (
          <AgentDrawer
            agent={selectedAgent}
            agents={allAgents}
            chart={chart}
            onClose={() => setSelectedAgent(null)}
          />
        )}
      </div>
    </div>
  )
}

/* ─── Topbar ─── */
function Topbar({
  timestamp,
  thermo,
}: {
  timestamp: Date | string
  thermo: ChartOfMoment['thermodynamics']
}) {
  const ts = new Date(timestamp)
  const time = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC'
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <span>⊕</span>
        </div>
        <span>Cosmic&nbsp;Agents</span>
        <span className="brand-sub">/ Council Feed</span>
      </div>
      <div className="telemetry">
        <div className="tele heat">
          <span className="label">Heat</span>
          <div className="tele-bar">
            <i style={{ width: thermo.heat * 100 + '%' }} />
          </div>
          <span className="value">{thermo.heat.toFixed(2)}</span>
        </div>
        <div className="tele entropy">
          <span className="label">Entropy</span>
          <div className="tele-bar">
            <i style={{ width: thermo.entropy * 100 + '%' }} />
          </div>
          <span className="value">{thermo.entropy.toFixed(2)}</span>
        </div>
        <div className="tele react">
          <span className="label">React</span>
          <div className="tele-bar">
            <i style={{ width: thermo.reactivity * 100 + '%' }} />
          </div>
          <span className="value">{thermo.reactivity.toFixed(2)}</span>
        </div>
        <div className="tele energy">
          <span className="label">Energy</span>
          <div className="tele-bar">
            <i style={{ width: Math.max(thermo.energy, 0) * 100 + '%' }} />
          </div>
          <span className="value">{thermo.energy.toFixed(2)}</span>
        </div>
        <div className="tele">
          <span className="label">A#</span>
          <span
            className="value"
            style={{ fontSize: 14, color: 'var(--gold-hi)', fontFamily: 'var(--ff-display)' }}
          >
            {thermo.aNumber}
          </span>
        </div>
      </div>
      <div className="timestamp">
        <div className="live-dot" />
        <span>{time}</span>
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span>chart sync 7s ago</span>
      </div>
    </header>
  )
}

/* ─── Chart of the Moment ─── */
function ChartOfMomentColumn({ chart }: { chart: ChartOfMoment }) {
  const planet = PLANETS[chart.dominantPlanet as PlanetName]
  return (
    <div className="col">
      <div className="col-head">
        <h2>Chart of the Moment</h2>
        <span className="sub">Live</span>
      </div>
      <div className="col-body cotm">
        <div className="cotm-ruler">
          <div className="glyph">{planet?.glyph || '☉'}</div>
          <div className="info">
            <div className="label">Ruler of the moment</div>
            <div className="name">
              {chart.dominantPlanet} in {chart.dominantSign}
            </div>
            <div className="reason">{chart.rulerReason}</div>
          </div>
        </div>

        <div className="wheel-wrap">
          <ChartWheel chart={chart} size={320} animate />
        </div>

        <div className="cotm-grid">
          <div className="cotm-cell">
            <div className="k">Planetary hour</div>
            <div className="v">{chart.planetaryHour}</div>
          </div>
          <div className="cotm-cell">
            <div className="k">Planetary day</div>
            <div className="v">{chart.planetaryDay}</div>
          </div>
          <div className="cotm-cell">
            <div className="k">Moon phase</div>
            <div className="v">{chart.moonPhase}</div>
          </div>
          <div className="cotm-cell">
            <div className="k">Moon illum.</div>
            <div className="v">{Math.round(chart.moonIllumination * 100)}%</div>
          </div>
        </div>

        <div className="cotm-section-h">Elemental balance · sky</div>
        <ElementalBar data={chart.elemental} />

        <div className="cotm-section-h" style={{ marginTop: 14 }}>
          Active aspects · {chart.aspects.length}
        </div>
        <div className="aspect-list">
          {chart.aspects.map((asp, i) => {
            const pa = PLANETS[asp.a as PlanetName]
            const pb = PLANETS[asp.b as PlanetName]
            return (
              <div key={i} className={'aspect-row ' + (asp.applying ? 'applying' : 'not-applying')}>
                <span className="pulse" />
                <div className="glyphs">
                  {pa && (
                    <span className="planet-g" style={{ color: pa.color }}>
                      {pa.glyph}
                    </span>
                  )}
                  <span className="asp-sym">{ASP_SYM[asp.type]}</span>
                  {pb && (
                    <span className="planet-g" style={{ color: pb.color }}>
                      {pb.glyph}
                    </span>
                  )}
                  <span className="name-pair">
                    {asp.a} {asp.type} {asp.b}
                  </span>
                </div>
                <span className="orb">{asp.orb}°</span>
              </div>
            )
          })}
        </div>

        <div className="cotm-section-h" style={{ marginTop: 14 }}>
          Location
        </div>
        <div
          className="hint"
          style={{
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'none',
            color: 'var(--ink-2)',
          }}
        >
          {chart.location}
        </div>
      </div>
    </div>
  )
}

/* ─── Feed column ─── */
function FeedColumn({
  events,
  agents,
  userAgent,
  filters,
  counts,
  activeFilter,
  onFilter,
  cardCtx,
  onAgentClick,
  onCast,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  events: FeedEvent[]
  agents: CouncilAgent[]
  userAgent: CouncilAgent | null
  filters: Array<{ id: string; label: string; match: (e: FeedEvent) => boolean }>
  counts: Record<string, number>
  activeFilter: string
  onFilter: (id: string) => void
  cardCtx: CardCtx
  onAgentClick: (a: CouncilAgent) => void
  onCast: (casterId: string, moveId: JingMoveId, targetId: string) => void
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}) {
  const eligible = agents.filter(a => a.id !== 'user-self' && a.cooldown === 0)
  const [castAgent, setCastAgent] = useState<CouncilAgent | undefined>(eligible[0])
  const availableMoves = useMemo(() => {
    if (!castAgent) return []
    return (
      Object.entries(JING_MOVES) as Array<[JingMoveId, (typeof JING_MOVES)[JingMoveId]]>
    ).filter(([_id, m]) => castAgent.elemental[m.element.split('·')[0] as Element] >= m.threshold)
  }, [castAgent])
  const [moveId, setMoveId] = useState<JingMoveId>(availableMoves[0]?.[0] || 'meltdown')
  const [castTarget, setCastTarget] = useState<CouncilAgent | undefined>(
    agents.find(a => a.id !== 'user-self' && a.id !== castAgent?.id)
  )

  useEffect(() => {
    if (availableMoves.length && !availableMoves.find(([id]) => id === moveId)) {
      setMoveId(availableMoves[0][0])
    }
  }, [castAgent, availableMoves, moveId])

  const handleCast = () => {
    if (!castAgent || !moveId || !castTarget) return
    onCast(castAgent.id, moveId, castTarget.id)
  }

  return (
    <div className="col">
      <div className="feed-head">
        <div className="title-row">
          <h2>The Council</h2>
          <span className="desc">
            Live agent actions · aspects route the routing · ruler-of-the-moment amplifies
          </span>
        </div>
        <div className="filter-row">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              className={'chip ' + (activeFilter === f.id ? 'active' : '')}
              onClick={() => onFilter(f.id)}
            >
              {f.label}
              <span className="count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="col-body">
        <div className="feed-list">
          {events.map(e => (
            <div key={e.id} className="card-enter">
              <FeedCard event={e} ctx={cardCtx} />
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              className="load-more-btn"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load earlier'}
            </button>
          )}
        </div>
        <div className="composer">
          <span className="label">Cast</span>
          <div className="row">
            {userAgent && (
              <>
                <div
                  className="pick"
                  onClick={() => onAgentClick(userAgent)}
                  title="View your self-agent"
                >
                  <Avatar agent={userAgent} size="small" />
                  <span className="nm">you</span>
                </div>
                <span className="arrow">→</span>
              </>
            )}
            <select
              value={castAgent?.id || ''}
              onChange={e => setCastAgent(agents.find(a => a.id === e.target.value))}
            >
              {eligible.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="arrow">·</span>
            <select
              value={moveId}
              onChange={e => setMoveId(e.target.value as JingMoveId)}
              style={{ maxWidth: 130 }}
            >
              {availableMoves.map(([id, m]) => (
                <option key={id} value={id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="arrow">→</span>
            <select
              value={castTarget?.id || ''}
              onChange={e => setCastTarget(agents.find(a => a.id === e.target.value))}
            >
              {agents
                .filter(a => a.id !== castAgent?.id && a.id !== 'user-self')
                .map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            className="cast-btn"
            disabled={!castAgent || !moveId || !castTarget}
            onClick={handleCast}
          >
            Cast
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Roster column ─── */
function RosterColumn({
  chart,
  agents,
  userAgent,
  onSelect,
  selected,
  levels,
}: {
  chart: ChartOfMoment
  agents: CouncilAgent[]
  userAgent: CouncilAgent | null
  onSelect: (a: CouncilAgent) => void
  selected: CouncilAgent | null
  levels: Record<string, number>
}) {
  const ranked = useMemo(() => {
    return agents
      .filter(a => a.id !== 'user-self')
      .map(a => {
        const elementMatch = a.elemental[chart.dominantElement] || 0
        const aspectHits = a.natal.filter(n =>
          chart.aspects.some(asp => asp.a === n.planet || asp.b === n.planet)
        ).length
        const activation = a.isRulerOfMoment
          ? 100
          : Math.min(
              100,
              elementMatch + aspectHits * 8 + (a.planetary12.kineticAlignment || 0) * 0.1
            )
        const userResonance = userAgent ? compatibility(userAgent, a) : 50
        const dormant = a.cooldown > 0 || a.stats.vitality < 55
        return {
          agent: a,
          activated: isActivated(a, chart),
          activation,
          userResonance,
          dormant,
        }
      })
      .sort((x, y) => {
        if (x.dormant !== y.dormant) return x.dormant ? 1 : -1
        const xs = x.activation * 0.7 + x.userResonance * 0.3
        const ys = y.activation * 0.7 + y.userResonance * 0.3
        return ys - xs
      })
  }, [chart, userAgent, agents])

  const activeCount = ranked.filter(r => !r.dormant).length

  return (
    <div className="col">
      <div className="col-head">
        <h2>Agent Roster</h2>
        <span className="sub">
          {activeCount} active · {agents.length} total
        </span>
      </div>
      <div className="col-body">
        <div className="roster">
          {userAgent && (
            <UserAgentRow
              agent={userAgent}
              chart={chart}
              onClick={() => onSelect(userAgent)}
              isSel={!!selected && selected.id === userAgent.id}
            />
          )}

          {ranked.map(({ agent, activation, userResonance, dormant }) => {
            const isSel = !!selected && selected.id === agent.id
            const activationBars = Math.max(1, Math.min(7, Math.round(activation / 14)))
            // Sky sprites don't level — show their dignity/phase tier instead of Lv.
            const tier =
              agent.kind === 'planetary' || agent.kind === 'lunar'
                ? (spriteTierLabel(agent.id) ??
                  (agent.dignity
                    ? agent.dignity.charAt(0).toUpperCase() + agent.dignity.slice(1)
                    : agent.kind === 'lunar'
                      ? 'Lunar'
                      : 'Sprite'))
                : null
            return (
              <div
                key={agent.id}
                className={'agent-row ' + (isSel ? 'selected ' : '') + (dormant ? 'dormant' : '')}
                onClick={() => onSelect(agent)}
              >
                <Avatar agent={agent} />
                <div style={{ minWidth: 0 }}>
                  <div
                    className="name"
                    style={{ fontSize: 14, fontFamily: 'var(--ff-display)', lineHeight: 1.1 }}
                  >
                    {agent.name}
                    {tier ? (
                      <span
                        title="Sky sprite — dignity/phase tier (sprites don't level)"
                        style={{
                          marginLeft: 6,
                          fontSize: 9,
                          fontFamily: 'var(--ff-mono)',
                          padding: '1px 5px',
                          borderRadius: 999,
                          background:
                            'linear-gradient(90deg, rgba(56,189,248,.16), rgba(99,102,241,.16))',
                          border: '1px solid rgba(56,189,248,.45)',
                          color: '#7dd3fc',
                          verticalAlign: 'middle',
                        }}
                      >
                        {tier}
                      </span>
                    ) : (
                      typeof levels[agent.id] === 'number' && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 9,
                            fontFamily: 'var(--ff-mono)',
                            padding: '1px 5px',
                            borderRadius: 999,
                            background:
                              'linear-gradient(90deg, rgba(250,204,21,.18), rgba(217,70,239,.18))',
                            border: '1px solid rgba(217,70,239,.45)',
                            color: '#f0abfc',
                            verticalAlign: 'middle',
                          }}
                        >
                          Lv.{levels[agent.id]}
                        </span>
                      )
                    )}
                  </div>
                  <div
                    className="sub"
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.1em',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {agent.kind === 'planetary' || agent.kind === 'lunar'
                      ? agent.specialty
                      : `${agent.sun || ''} ☉  ${agent.evolutionLevel || ''} · res ${userResonance}%`}
                  </div>
                </div>
                <div className="right">
                  <div className="stat-strip">
                    {[...Array(7)].map((_, i) => (
                      <i key={i} className={i < activationBars ? 'on' : ''} />
                    ))}
                  </div>
                  {agent.cooldown > 0 ? (
                    <span
                      className="cooldown"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <CooldownRing progress={1 - agent.cooldown / 30} />
                      CD {agent.cooldown}m
                    </span>
                  ) : dormant ? (
                    <span className="cooldown" style={{ color: 'var(--ink-3)' }}>
                      dormant
                    </span>
                  ) : (
                    <span className="activated-dot" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function UserAgentRow({
  agent,
  chart,
  onClick,
  isSel,
}: {
  agent: CouncilAgent
  chart: ChartOfMoment
  onClick: () => void
  isSel: boolean
}) {
  const sky = chart.dominantElement
  const myDominantEl = (Object.entries(agent.elemental) as [Element, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0][0]
  const alignWithSky = Math.min(7, Math.round(agent.elemental[sky] / 5))
  return (
    <div className={'agent-row user-self ' + (isSel ? 'selected' : '')} onClick={onClick}>
      <Avatar agent={agent} />
      <div style={{ minWidth: 0 }}>
        <div
          className="name"
          style={{ fontSize: 14, fontFamily: 'var(--ff-display)', lineHeight: 1.1 }}
        >
          {agent.name}
        </div>
        <div
          className="sub"
          style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
            color: 'var(--ink-3)',
            letterSpacing: '0.1em',
            marginTop: 2,
          }}
        >
          {agent.sun} ☉ · {myDominantEl} dom. · sky align {alignWithSky}/7
        </div>
      </div>
      <div className="right">
        <div className="stat-strip">
          {[...Array(7)].map((_, i) => (
            <i key={i} className={i < alignWithSky ? 'on' : ''} />
          ))}
        </div>
        <span className="activated-dot" />
      </div>
    </div>
  )
}
