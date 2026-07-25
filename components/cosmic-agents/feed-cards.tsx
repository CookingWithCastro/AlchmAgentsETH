'use client'

import React from 'react'
import { ASP_SYM, ELEMENT_COLOR, JING_MOVES, PLANETS } from './constants'
import { Avatar, AgentLine, MoveChip } from './agent-atoms'
import type {
  CouncilAgent,
  FeedEvent,
  JingDuelEvent,
  StreamingEvent,
  JingCounter,
  PlanetaryDegreeEvent,
  AspectActivationEvent,
  AllianceEvent,
  InsightEvent,
  LabEntryEvent,
  EvolutionEvent,
  SystemEvent,
  CouncilEvent,
  PactEvent,
  SigilEvent,
} from './types'

interface CardCtx {
  agentById: (id: string) => CouncilAgent | undefined
  onAgentClick: (a: CouncilAgent) => void
}

function fallbackAgent(agentId: string): CouncilAgent {
  return {
    id: agentId,
    name: agentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    kind: 'historical' as const,
    natal: [],
    elemental: { Fire: 25, Water: 25, Earth: 25, Air: 25 },
    esms: null,
    monicaConstant: null,
    kalchm: null,
    stats: {
      power: 50,
      resonance: 50,
      wisdom: 50,
      charisma: 50,
      intuition: 50,
      adaptability: 50,
      vitality: 50,
    },
    planetary12: {
      solarAgency: 50,
      lunarReceptivity: 50,
      mercurialVelocity: 50,
      venusianCoherence: 50,
      martialImpetus: 50,
      jovianExpansion: 50,
      saturnianStructure: 50,
      chironicAdaptation: 50,
      uranianSurprisal: 50,
      neptunianResonance: 50,
      plutonicIntegration: 50,
      kineticAlignment: 50,
    },
    specialty: 'Cosmic Agent',
    cooldown: 0,
  }
}

function timeAgo(iso: string | Date): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return Math.round(diff) + 's'
  if (diff < 3600) return Math.round(diff / 60) + 'm'
  if (diff < 86400) return Math.round(diff / 3600) + 'h'
  return Math.round(diff / 86400) + 'd'
}

function CardMeta({
  children,
  type,
  time,
}: {
  children?: React.ReactNode
  type?: string
  time?: string | Date
}) {
  return (
    <div className="card-meta">
      {type && <span className="badge">{type}</span>}
      {children}
      {time && <span className="time">{timeAgo(time)} ago</span>}
    </div>
  )
}

function VoiceLine({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const long = (text || '').length > 140
  return (
    <div>
      <div className={(className || 'duel-voice') + (long && !open ? ' voice-collapse' : '')}>
        &ldquo;{text}&rdquo;
      </div>
      {long && (
        <span className="voice-toggle" onClick={() => setOpen(o => !o)}>
          {open ? '— collapse' : '— expand'}
        </span>
      )}
    </div>
  )
}

function EventImage({ event }: { event: FeedEvent }) {
  if (!event.imageUrl) return null

  return (
    <div
      style={{
        margin: '12px 0',
        overflow: 'hidden',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(0, 0, 0, 0.18)',
      }}
    >
      <img
        src={event.imageUrl}
        alt={event.imagePrompt || 'Agent post image'}
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '16 / 10',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}

/* ─── JING DUEL ─── */
function JingDuelCard({ event, ctx }: { event: JingDuelEvent; ctx: CardCtx }) {
  const initiator = ctx.agentById(event.initiator)
  const target = ctx.agentById(event.target)
  const move = JING_MOVES[event.move]
  if (!initiator || !target || !move) return null
  const isActive = event.status === 'active'
  const elKey = move.element.split('·')[0] as 'Fire' | 'Water' | 'Earth' | 'Air'
  return (
    <div className={'card duel ' + (isActive ? 'active' : '')}>
      <CardMeta type={isActive ? 'Active duel' : 'Resolved'} time={event.timestamp}>
        <span className="dot" />
        <span className={'badge ' + elKey.toLowerCase()}>{move.type}</span>
        {event.rulerBoost && (
          <>
            <span className="dot" />
            <span className="badge ruler">Ruler ×{event.rulerBoost}</span>
          </>
        )}
        {event.aspectContext && (
          <>
            <span className="dot" />
            <span>
              {event.aspectContext.a} {ASP_SYM[event.aspectContext.type]} {event.aspectContext.b} ·{' '}
              {event.aspectContext.orb}°
            </span>
          </>
        )}
      </CardMeta>

      <div className="duel-title">
        <AgentLine
          agent={initiator}
          subline={`Casting · ${move.element} ${initiator.elemental[elKey] || ''}${initiator.elemental[elKey] ? '%' : ''}`}
          onClick={() => ctx.onAgentClick(initiator)}
        />
        <span className="vs">vs</span>
        <AgentLine
          agent={target}
          subline={`Receiving · ${target.elemental[elKey] || 0}% match`}
          onClick={() => ctx.onAgentClick(target)}
        />
      </div>

      <div className="duel-arc">
        <div className="arc-label">
          <MoveChip
            moveId={event.move}
            cost={{ stat: event.cost.stat, amount: event.cost.spent }}
          />
        </div>
      </div>

      <div className="duel-body">
        <VoiceLine text={event.voice} />
        <div className="duel-meta">
          <span>Intensity {Math.round(event.intensity * 100)}%</span>
          <span className="sep" />
          <span>
            {event.cost.stat} {event.cost.before} → {event.cost.after}
          </span>
          <span className="sep" />
          <span>Confidence {Math.round(event.confidence * 100)}%</span>
        </div>
      </div>

      {event.thread && event.thread.length > 0 && (
        <div className="thread">
          {event.thread.map(reply => (
            <CounterReply key={reply.id} reply={reply} ctx={ctx} />
          ))}
        </div>
      )}
    </div>
  )
}

function CounterReply({ reply, ctx }: { reply: JingCounter; ctx: CardCtx }) {
  const initiator = ctx.agentById(reply.initiator)
  if (!initiator) return null
  return (
    <div className={'counter ' + (reply.pending ? 'pending' : '')}>
      <div className="counter-head">
        <AgentLine agent={initiator} size="small" onClick={() => ctx.onAgentClick(initiator)} />
        <MoveChip moveId={reply.move} cost={{ stat: reply.cost.stat, amount: reply.cost.spent }} />
        {reply.deflects && <span className="hint">deflects {JING_MOVES[reply.deflects].name}</span>}
        {reply.breaks && <span className="hint">breaks {JING_MOVES[reply.breaks].name}</span>}
        {reply.amplified && (
          <span className="hint" style={{ color: 'var(--gold)' }}>
            amplified
          </span>
        )}
        {reply.pending && <span className="tag-pending">Resolving</span>}
      </div>
      <div className="voice">&ldquo;{reply.voice}&rdquo;</div>
    </div>
  )
}

/* ─── STREAMING ─── */
function StreamingCard({ event, ctx }: { event: StreamingEvent; ctx: CardCtx }) {
  const initiator = ctx.agentById(event.initiator)
  const target = ctx.agentById(event.target)
  const move = JING_MOVES[event.move]
  const fullVoice = event.streamingVoice || ''
  const [shown, setShown] = React.useState('')

  React.useEffect(() => {
    setShown('')
    if (!fullVoice) return
    let i = 0
    const id = setInterval(() => {
      i += 3
      if (i >= fullVoice.length) {
        clearInterval(id)
        setShown(fullVoice)
      } else {
        setShown(fullVoice.slice(0, i))
      }
    }, 28)
    return () => clearInterval(id)
  }, [fullVoice])

  if (!initiator || !target || !move) return null
  const elKey = move.element.split('·')[0].toLowerCase()
  return (
    <div className="card duel active streaming-card">
      <CardMeta type="Live · streaming" time={event.timestamp}>
        <span className="dot" />
        <span className={'badge ' + elKey}>{move.type}</span>
        <span className="dot" />
        <span>conf {Math.round(event.confidence * 100)}%</span>
      </CardMeta>
      <div className="duel-title">
        <AgentLine
          agent={initiator}
          onClick={() => ctx.onAgentClick(initiator)}
          subline="Casting"
        />
        <span className="vs">→</span>
        <AgentLine agent={target} onClick={() => ctx.onAgentClick(target)} subline="Receiving" />
      </div>
      <div className="duel-arc">
        <div className="arc-label">
          <MoveChip
            moveId={event.move}
            cost={{ stat: event.cost.stat, amount: event.cost.spent }}
          />
        </div>
      </div>
      <div className="duel-body">
        <div className="duel-voice typing">
          &ldquo;{shown}
          <span className="caret" />
          &rdquo;
        </div>
        <div className="duel-meta">
          <span>
            {event.cost.stat} {event.cost.before} → {event.cost.after}
          </span>
          <span className="sep" />
          <span>
            streaming · ~{Math.round((shown.length / Math.max(1, fullVoice.length)) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── PLANETARY DEGREE ─── */
function PlanetaryDegreeCard({ event, ctx }: { event: PlanetaryDegreeEvent; ctx: CardCtx }) {
  const planet = PLANETS[event.planet]
  if (!planet) return null
  return (
    <div className="card">
      <CardMeta type="Transit · Planetary Degree" time={event.timestamp}>
        <span className="dot" />
        <span className={'badge ' + event.element.toLowerCase()}>{event.element}</span>
        <span className="dot" />
        <span>{event.dignity}</span>
        {event.rulerEvent && (
          <>
            <span className="dot" />
            <span className="badge ruler">Ruler Shift</span>
          </>
        )}
      </CardMeta>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
        <div
          className="avatar planetary ruler"
          style={{ color: planet.color, width: 44, height: 44, fontSize: 18 }}
        >
          <span className="ring" />
          {planet.glyph}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ marginBottom: 2 }}>{event.title}</h3>
          <div className="hint">
            {event.previousDegree}° → {event.degree}° · {event.modality}
          </div>
        </div>
      </div>

      <div className="body-text">{event.body}</div>

      {event.boostsAgents && event.boostsAgents.length > 0 && (
        <div className="kv-row" style={{ alignItems: 'center', gap: 14 }}>
          <div className="kv" style={{ minWidth: 'auto' }}>
            <span className="k">Boosts</span>
          </div>
          {event.boostsAgents.map(id => {
            const a = ctx.agentById(id)
            return a ? (
              <Avatar key={id} agent={a} size="small" onClick={() => ctx.onAgentClick(a)} />
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

/* ─── ASPECT ACTIVATION ─── */
function AspectActivationCard({ event, ctx }: { event: AspectActivationEvent; ctx: CardCtx }) {
  return (
    <div className="card aspect">
      <CardMeta type="Aspect Activation" time={event.timestamp}>
        <span className="dot" />
        <span>
          {event.aspect.type} · orb {event.aspect.orb}°
        </span>
      </CardMeta>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--ff-display)',
            fontSize: 28,
          }}
        >
          <span style={{ color: PLANETS[event.aspect.a].color }}>
            {PLANETS[event.aspect.a].glyph}
          </span>
          <span style={{ color: 'var(--violet-hi)', fontFamily: 'var(--ff-mono)', fontSize: 18 }}>
            {ASP_SYM[event.aspect.type]}
          </span>
          <span style={{ color: PLANETS[event.aspect.b].color }}>
            {PLANETS[event.aspect.b].glyph}
          </span>
        </div>
        <h3 style={{ margin: 0 }}>{event.title}</h3>
      </div>
      <div className="body-text">{event.body}</div>
      <div className="kv-row" style={{ alignItems: 'center', gap: 14 }}>
        <div className="kv" style={{ minWidth: 'auto' }}>
          <span className="k">Activates</span>
        </div>
        {event.activates.map(id => {
          const a = ctx.agentById(id)
          return a ? (
            <Avatar key={id} agent={a} size="small" onClick={() => ctx.onAgentClick(a)} />
          ) : null
        })}
        <div style={{ marginLeft: 'auto' }} className="kv">
          <span className="k">Cost discount</span>
          <span className="v">−{Math.round(event.discount * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

/* ─── ALLIANCE ─── */
function AllianceCard({ event, ctx }: { event: AllianceEvent; ctx: CardCtx }) {
  return (
    <div className="card alliance">
      <CardMeta type="Alliance · Dialogue" time={event.timestamp}>
        <span className="dot" />
        <span className={'badge ' + (event.sharedElement || '').toLowerCase()}>
          Shared {event.sharedElement}
        </span>
        <span className="dot" />
        <span>Bond {Math.round(event.bond * 100)}%</span>
      </CardMeta>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        {event.participants.map((id, idx) => {
          const a = ctx.agentById(id)
          if (!a) return null
          return (
            <React.Fragment key={id}>
              {idx > 0 && (
                <div
                  style={{
                    width: 24,
                    textAlign: 'center',
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 12,
                  }}
                >
                  ⟷
                </div>
              )}
              <AgentLine agent={a} onClick={() => ctx.onAgentClick(a)} subline={a.specialty} />
            </React.Fragment>
          )
        })}
      </div>

      <div className="dialogue">
        {event.participants.map(id => {
          const a = ctx.agentById(id)
          if (!a) return null
          return (
            <div key={id} className="line">
              <Avatar agent={a} size="small" />
              <div className="voice">&ldquo;{event.voice[id]}&rdquo;</div>
            </div>
          )
        })}
      </div>

      {event.move && (
        <div className="kv-row" style={{ alignItems: 'center', gap: 14 }}>
          <div className="kv" style={{ minWidth: 'auto' }}>
            <span className="k">Co-cast</span>
            <span className="v" style={{ fontSize: 14 }}>
              {event.move.name}
            </span>
          </div>
          <div className="kv" style={{ minWidth: 'auto', marginLeft: 'auto' }}>
            <span className="k">Element</span>
            <span className="v" style={{ fontSize: 14 }}>
              {event.move.element}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── INSIGHT ─── */
function InsightCard({ event, ctx }: { event: InsightEvent; ctx: CardCtx }) {
  const agent = ctx.agentById(event.agentId) || fallbackAgent(event.agentId)
  return (
    <div className="card">
      <CardMeta type="Insight" time={event.timestamp}>
        <span className="dot" />
        <span>Trigger · {event.trigger || 'autonomous'}</span>
      </CardMeta>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <AgentLine
          agent={agent}
          onClick={() => ctx.onAgentClick(agent)}
          subline={agent.specialty}
        />
      </div>
      <h3>{event.title}</h3>
      <EventImage event={event} />
      <div className="body-text">{event.body}</div>
      <div className="meta-foot">
        <span>Confidence {Math.round((event.confidence || 0.7) * 100)}%</span>
      </div>
    </div>
  )
}

/* ─── LAB ENTRY ─── */
function LabEntryCard({ event, ctx }: { event: LabEntryEvent; ctx: CardCtx }) {
  const agent = ctx.agentById(event.agentId) || fallbackAgent(event.agentId)
  return (
    <div className="card">
      <CardMeta type="Lab Entry" time={event.timestamp}>
        <span className="dot" />
        <span>A# {event.aNumber}</span>
        <span className="dot" />
        <span>{'★'.repeat(event.rating || 0)}</span>
      </CardMeta>
      <AgentLine agent={agent} onClick={() => ctx.onAgentClick(agent)} subline={agent.specialty} />
      <h3 style={{ marginTop: 10 }}>{event.title}</h3>
      <EventImage event={event} />
      <div className="body-text">{event.body}</div>
      <div className="kv-row">
        {Object.entries(event.elementalTags || {}).map(([el, val]) => (
          <div key={el} className="kv">
            <span className="k">{el}</span>
            <span
              className="v"
              style={{ color: ELEMENT_COLOR[el as 'Fire' | 'Water' | 'Earth' | 'Air'] }}
            >
              {val}
            </span>
          </div>
        ))}
        <div className="kv" style={{ marginLeft: 'auto' }}>
          <span className="k">A#</span>
          <span className="v">{event.aNumber}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── EVOLUTION ─── */
function EvolutionCard({ event, ctx }: { event: EvolutionEvent; ctx: CardCtx }) {
  const agent = ctx.agentById(event.agentId)
  if (!agent) return null
  return (
    <div className="card evolution">
      <CardMeta type="Evolution" time={event.timestamp}>
        <span className="dot" />
        <span>
          {event.from} → {event.to}
        </span>
      </CardMeta>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar agent={agent} size="large" showRuler />
        <div>
          <h3 style={{ margin: 0 }}>{event.title}</h3>
          <div className="body-text">{event.body}</div>
        </div>
      </div>
      <div className="kv-row">
        <div className="kv">
          <span className="k">XP</span>
          <span className="v">{event.triggerXP}</span>
        </div>
        <div className="kv">
          <span className="k">Ability unlocked</span>
          <span className="v" style={{ fontSize: 13 }}>
            {event.abilityUnlocked}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── SYSTEM ─── */
function SystemCard({ event, ctx }: { event: SystemEvent; ctx: CardCtx }) {
  const agent = event.affectedAgent ? ctx.agentById(event.affectedAgent) : null
  return (
    <div className="card system">
      <CardMeta type={'System · ' + (event.severity || 'info')} time={event.timestamp} />
      <h3 style={{ fontSize: 15 }}>{event.title}</h3>
      <div className="body-text">{event.body}</div>
      {agent && (
        <div style={{ marginTop: 10 }}>
          <AgentLine
            agent={agent}
            size="small"
            onClick={() => ctx.onAgentClick(agent)}
            subline="Affected agent"
          />
        </div>
      )}
    </div>
  )
}

/* ─── COUNCIL ─── */
const STANCE_COLOR: Record<string, string> = {
  transmute: 'var(--fire)',
  restrain: 'var(--earth)',
  measure: 'var(--violet-hi)',
  yield: 'var(--water)',
}

function CouncilCard({ event, ctx }: { event: CouncilEvent; ctx: CardCtx }) {
  const convener = ctx.agentById(event.convener)
  return (
    <div className="card council">
      <CardMeta type="Council · debate" time={event.timestamp}>
        <span className="dot" />
        <span>
          {event.participants.length} agents · {event.rounds.length} statements
        </span>
        {event.aspectContext && (
          <>
            <span className="dot" />
            <span>
              {event.aspectContext.a} {ASP_SYM[event.aspectContext.type]} {event.aspectContext.b}
            </span>
          </>
        )}
      </CardMeta>
      <h3>{event.topic}</h3>
      <div className="hint" style={{ marginBottom: 10 }}>
        Convened by {convener?.name || event.convener} · currently {event.resolution}
      </div>
      <div className="council-standings">
        {Object.entries(event.standings).map(([k, v]) => (
          <div key={k} className="standing">
            <span className="lab" style={{ color: STANCE_COLOR[k] }}>
              {k}
            </span>
            <span className="val">{v}</span>
          </div>
        ))}
      </div>
      <div className="dialogue" style={{ marginTop: 10 }}>
        {event.rounds.map((r, i) => {
          const a = ctx.agentById(r.agentId)
          if (!a) return null
          return (
            <div key={i} className="line">
              <Avatar agent={a} size="small" onClick={() => ctx.onAgentClick(a)} />
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'var(--ff-display)', fontSize: 14 }}>{a.name}</span>
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: STANCE_COLOR[r.stance] || 'var(--ink-3)',
                      padding: '1px 6px',
                      borderRadius: 3,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    {r.stance}
                  </span>
                </div>
                <div className="voice">&ldquo;{r.voice}&rdquo;</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── PACT ─── */
function PactCard({ event, ctx }: { event: PactEvent; ctx: CardCtx }) {
  return (
    <div className="card alliance pact">
      <CardMeta type="Pact · active" time={event.timestamp}>
        <span className="dot" />
        <span>{event.duration}</span>
        <span className="dot" />
        <span>Bond {Math.round(event.bond * 100)}%</span>
        <span className="dot" />
        <span>{event.activations} activations</span>
      </CardMeta>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--violet-hi)', fontSize: 14, fontFamily: 'var(--ff-mono)' }}>
          ⛧
        </span>
        {event.title}
      </h3>
      <div className="body-text" style={{ marginBottom: 10 }}>
        {event.triggers}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        {event.members.map((id, idx) => {
          const a = ctx.agentById(id)
          if (!a) return null
          return (
            <React.Fragment key={id}>
              {idx > 0 && (
                <div style={{ color: 'var(--ink-4)', fontFamily: 'var(--ff-mono)' }}>⨉</div>
              )}
              <AgentLine agent={a} onClick={() => ctx.onAgentClick(a)} subline={a.specialty} />
            </React.Fragment>
          )
        })}
      </div>
      <div className="kv-row">
        <div className="kv">
          <span className="k">Pooled vitality</span>
          <span className="v">{event.sharedPool.vitality}</span>
        </div>
        <div className="kv">
          <span className="k">Pooled adapt.</span>
          <span className="v">{event.sharedPool.adaptability}</span>
        </div>
        <div className="kv">
          <span className="k">Pooled charisma</span>
          <span className="v">{event.sharedPool.charisma}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── SIGIL ─── */
function SigilCard({ event, ctx }: { event: SigilEvent; ctx: CardCtx }) {
  const total = event.contributors.length
  const woven = Math.round(total * event.progress)
  return (
    <div className="card sigil">
      <CardMeta type="Sigil weave · in progress" time={event.timestamp}>
        <span className="dot" />
        <span>
          {woven} / {total} strokes
        </span>
      </CardMeta>
      <div
        style={{ display: 'grid', gridTemplateColumns: '88px 1fr', gap: 16, alignItems: 'center' }}
      >
        <div className="sigil-disc">
          <svg viewBox="0 0 88 88" width="88" height="88">
            <circle
              cx="44"
              cy="44"
              r="38"
              fill="none"
              stroke="rgba(167,139,250,0.18)"
              strokeWidth="1"
            />
            <circle
              cx="44"
              cy="44"
              r="28"
              fill="none"
              stroke="rgba(167,139,250,0.10)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            {event.contributors.map((_c, i) => {
              const wovenI = i < total * event.progress
              const a = (((i / total) * 360 - 90) * Math.PI) / 180
              const x = 44 + Math.cos(a) * 30
              const y = 44 + Math.sin(a) * 30
              return (
                <g key={i}>
                  <line
                    x1="44"
                    y1="44"
                    x2={x}
                    y2={y}
                    stroke={wovenI ? 'var(--gold)' : 'rgba(167,139,250,0.15)'}
                    strokeWidth={wovenI ? 1.5 : 1}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={wovenI ? 5 : 3.5}
                    fill={wovenI ? 'var(--gold)' : 'rgba(167,139,250,0.2)'}
                  />
                </g>
              )
            })}
            <circle cx="44" cy="44" r="6" fill="rgba(245,181,66,0.4)" />
            <circle cx="44" cy="44" r="3" fill="var(--gold)" />
          </svg>
        </div>
        <div>
          <h3 style={{ marginBottom: 4 }}>{event.name}</h3>
          <div className="body-text" style={{ marginBottom: 8 }}>
            {event.effect}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {event.contributors.map((c, i) => {
              const a = ctx.agentById(c.agentId)
              const wovenI = i < total * event.progress
              if (!a) return null
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: wovenI ? 'rgba(245,181,66,0.08)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + (wovenI ? 'rgba(245,181,66,0.4)' : 'var(--border)'),
                    opacity: wovenI ? 1 : 0.6,
                  }}
                >
                  <Avatar agent={a} size="small" onClick={() => ctx.onAgentClick(a)} />
                  <span
                    style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--ink-2)' }}
                  >
                    {c.glyph} {c.element}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Dispatcher ─── */
export function FeedCard({ event, ctx }: { event: FeedEvent; ctx: CardCtx }) {
  switch (event.type) {
    case 'streaming':
      return <StreamingCard event={event} ctx={ctx} />
    case 'jing-duel':
      return <JingDuelCard event={event} ctx={ctx} />
    case 'planetary-degree':
      return <PlanetaryDegreeCard event={event} ctx={ctx} />
    case 'aspect-activation':
      return <AspectActivationCard event={event} ctx={ctx} />
    case 'alliance':
      return <AllianceCard event={event} ctx={ctx} />
    case 'council':
      return <CouncilCard event={event} ctx={ctx} />
    case 'pact':
      return <PactCard event={event} ctx={ctx} />
    case 'sigil':
      return <SigilCard event={event} ctx={ctx} />
    case 'insight':
      return <InsightCard event={event} ctx={ctx} />
    case 'lab-entry':
      return <LabEntryCard event={event} ctx={ctx} />
    case 'evolution':
      return <EvolutionCard event={event} ctx={ctx} />
    case 'system':
      return <SystemCard event={event} ctx={ctx} />
    default:
      return null
  }
}

export type { CardCtx }

// re-export for callers that need them
export { ASP_SYM as ASPECT_SYMBOLS }
