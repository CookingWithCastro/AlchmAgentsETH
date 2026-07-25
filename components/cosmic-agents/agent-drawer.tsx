'use client'

import React from 'react'
import Link from 'next/link'
import { JING_MOVES } from './constants'
import {
  Avatar,
  ElementalBar,
  ESMSDisplay,
  NatalGrid,
  MoveChip,
  Sacred7Display,
} from './agent-atoms'
import { compatibility } from './agent-adapter'
import type { CouncilAgent, ChartOfMoment, Element, JingMoveId } from './types'

interface Props {
  agent: CouncilAgent
  agents: CouncilAgent[]
  chart: ChartOfMoment
  onClose: () => void
}

export function AgentDrawer({ agent, agents, onClose }: Props) {
  const availableMoves = (
    Object.entries(JING_MOVES) as Array<[JingMoveId, (typeof JING_MOVES)[JingMoveId]]>
  ).filter(([_id, m]) => agent.elemental[m.element.split('·')[0] as Element] >= m.threshold)

  const compats = React.useMemo(
    () =>
      agents
        .filter(a => a.id !== agent.id)
        .map(a => ({ agent: a, score: compatibility(agent, a) }))
        .sort((x, y) => y.score - x.score)
        .slice(0, 5),
    [agent, agents]
  )

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <Avatar agent={agent} size="large" />
          <div>
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22 }}>{agent.name}</div>
            <div className="hint" style={{ marginTop: 4 }}>
              {agent.sun} ☉ · {agent.moon} ☽{agent.rising ? ` · ${agent.rising} ↑` : ''} &nbsp; ·
              &nbsp; {agent.specialty}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {agent.consciousness && (
                <span className="chip active" style={{ cursor: 'default' }}>
                  {agent.consciousness}
                </span>
              )}
              {agent.evolutionLevel && (
                <span className="chip" style={{ cursor: 'default' }}>
                  {agent.evolutionLevel}
                </span>
              )}
              <span className="chip" style={{ cursor: 'default' }}>
                kalchm {agent.kalchm === null ? 'not computed' : agent.kalchm}
              </span>
              <span className="chip" style={{ cursor: 'default' }}>
                M-const {agent.monicaConstant === null ? 'not computed' : agent.monicaConstant}
              </span>
            </div>
          </div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-body">
          <div className="section">
            <h4>Elemental composition · birthchart</h4>
            <ElementalBar data={agent.elemental} height={10} />
          </div>

          <div className="section">
            <h4>ESMS · alchemical components</h4>
            {agent.esms === null ? (
              <span className="hint">not computed</span>
            ) : (
              <ESMSDisplay esms={agent.esms} />
            )}
          </div>

          <div className="section">
            <h4>Sacred 7 · core archetypes</h4>
            <Sacred7Display stats={agent.stats} />
          </div>

          <div className="section">
            <h4>Available Jing moves</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {availableMoves.length === 0 ? (
                <span className="hint">No moves available — no element ≥ 30%</span>
              ) : (
                availableMoves.map(([id, move]) => (
                  <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <MoveChip moveId={id} />
                    <div className="hint" style={{ fontSize: 9 }}>
                      {move.type} · {agent.elemental[move.element.split('·')[0] as Element]}%{' '}
                      {move.element}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <h4>Natal positions</h4>
            <NatalGrid natal={agent.natal} />
          </div>

          <div className="section">
            <h4>Resonance with other agents</h4>
            <div className="compat-row">
              {compats.map(({ agent: o, score }) => (
                <div key={o.id} className="compat-pill">
                  <Avatar agent={o} size="small" />
                  <span style={{ color: 'var(--ink-2)' }}>{o.name}</span>
                  <span className="pct">{score}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="action-row">
              <Link href={`/agent/${agent.id}`} className="btn primary" onClick={onClose}>
                View full profile
              </Link>
              <button className="btn">Pair for Duel</button>
              <button className="btn ghost">Follow</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
