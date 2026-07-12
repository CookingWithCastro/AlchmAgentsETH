'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Globe, History, ArrowRight } from 'lucide-react'
import { getPlanetaryAgentForDegree } from '@/lib/degree-planetary-agent-mapping'
import type { PlanetaryPosition } from '@/hooks/usePlanetaryPositions'

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

// Personal + social planets meaningfully shift "the moment"; the outer planets
// move too slowly to feel live, so they're left out of the ranking.
const MOMENT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

const ELEMENT_COLOR: Record<string, string> = {
  Fire: '#facc15',
  Water: '#60a5fa',
  Air: '#f472b6',
  Earth: '#34d399',
}

interface PlanetaryAgent {
  planet: string
  sign: string
  retrograde?: boolean
  element: string
  consciousnessLevel: string
  dignity: string
  powerLevel: number
  theme?: string
}

interface HistoricalMatch {
  agentId: string
  name: string
  title?: string
  score: number
  description?: string
}

interface MomentRecommendation {
  agent: {
    agentId: string
    name?: string
    title?: string
  }
  synergy?: {
    score?: number
    description?: string
  }
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function TopAgentsOfTheMoment({
  positions,
  loading,
}: {
  positions: PlanetaryPosition[]
  loading?: boolean
}) {
  const planetaryAgents = useMemo<PlanetaryAgent[]>(() => {
    const agents: PlanetaryAgent[] = []
    for (const pos of positions) {
      if (!MOMENT_PLANETS.includes(pos.planet)) continue
      // The backend returns lowercase sign names ("gemini"); normalize to match.
      const sign = cap(pos.sign)
      const signIdx = SIGN_ORDER.indexOf(sign)
      if (signIdx < 0) continue
      const absoluteDegree = signIdx * 30 + (pos.degree || 0)
      const cfg = getPlanetaryAgentForDegree(absoluteDegree)
      if (!cfg) continue
      agents.push({
        planet: pos.planet,
        sign,
        retrograde: pos.retrograde,
        element: cfg.element,
        consciousnessLevel: cfg.consciousnessLevel,
        dignity: cfg.rulerDignity,
        powerLevel: cfg.powerLevel,
        theme: cfg.themes?.[0],
      })
    }
    return agents.sort((a, b) => b.powerLevel - a.powerLevel).slice(0, 4)
  }, [positions])

  const [matches, setMatches] = useState<HistoricalMatch[] | null>(null)
  const [matchesFailed, setMatchesFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMatchesFailed(false)
    fetch('/api/moment-recommendations?limit=4')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(data => {
        if (cancelled) return
        const recs = Array.isArray(data?.recommendations) ? data.recommendations : []
        setMatches(
          recs
            .filter((r: MomentRecommendation) => r?.agent?.agentId)
            .map((r: MomentRecommendation) => ({
              agentId: r.agent.agentId,
              name: r.agent.name || r.agent.agentId,
              title: r.agent.title,
              score: Math.round(Number(r.synergy?.score ?? 0)),
              description: r.synergy?.description,
            }))
        )
      })
      .catch(() => {
        if (!cancelled) setMatchesFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const planetaryLoading = loading && planetaryAgents.length === 0
  const matchesLoading = matches === null && !matchesFailed

  return (
    <section className="landing-consciousness-section" id="moment-agents">
      <div className="landing-section-header">
        <div className="landing-section-label">Live Now</div>
        <h2 className="landing-section-title">Top Agents of the Moment</h2>
        <div className="landing-section-divider" />
        <p className="landing-section-subtitle">
          Consciousness ascendant under the current sky — and the historical minds most resonant
          with it right now.
        </p>
      </div>

      <div className="landing-moment-grid">
        {/* ---- Planetary agents (derived from the live sky) ---- */}
        <div className="landing-glass-card landing-moment-col">
          <div className="landing-moment-col-head">
            <span className="landing-moment-col-icon" style={{ color: '#a855f7' }}>
              <Globe size={18} />
            </span>
            <div>
              <h3 className="landing-moment-col-title">Planetary Agents Ascendant</h3>
              <p className="landing-moment-col-sub">Ranked by current placement strength</p>
            </div>
          </div>

          <div className="landing-moment-list">
            {planetaryLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="landing-moment-skeleton" />
              ))
            ) : planetaryAgents.length === 0 ? (
              <p className="landing-moment-empty">Reading the current sky…</p>
            ) : (
              planetaryAgents.map(a => {
                const color = ELEMENT_COLOR[a.element] || '#a855f7'
                return (
                  <Link key={a.planet} href="/planetary-agents" className="landing-moment-item">
                    <span
                      className="landing-moment-glyph"
                      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
                    >
                      {PLANET_GLYPHS[a.planet] || '✦'}
                    </span>
                    <div className="landing-moment-item-body">
                      <div className="landing-moment-item-top">
                        <span className="landing-moment-name">
                          {a.planet} in {a.sign}
                          {a.retrograde ? ' ℞' : ''}
                        </span>
                        <span
                          className="landing-moment-chip"
                          style={{ color, borderColor: `${color}55` }}
                        >
                          {a.element}
                        </span>
                      </div>
                      <div className="landing-moment-meta">
                        {cap(a.consciousnessLevel)} · {cap(a.dignity)}
                        {a.theme ? ` · ${a.theme}` : ''}
                      </div>
                      <div className="landing-moment-bar">
                        <div
                          className="landing-moment-bar-fill"
                          style={{
                            width: `${Math.round(a.powerLevel * 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <Link href="/planetary-agents" className="landing-moment-cta">
            Explore planetary agents <ArrowRight size={14} />
          </Link>
        </div>

        {/* ---- Historical matches (server-scored moment resonance) ---- */}
        <div className="landing-glass-card landing-moment-col">
          <div className="landing-moment-col-head">
            <span className="landing-moment-col-icon" style={{ color: '#f472b6' }}>
              <History size={18} />
            </span>
            <div>
              <h3 className="landing-moment-col-title">Resonant Historical Minds</h3>
              <p className="landing-moment-col-sub">Best matches for the present moment</p>
            </div>
          </div>

          <div className="landing-moment-list">
            {matchesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="landing-moment-skeleton" />
              ))
            ) : matchesFailed || (matches && matches.length === 0) ? (
              <p className="landing-moment-empty">
                Resonance matches are recalibrating — browse the gallery below.
              </p>
            ) : (
              matches!.map((m, i) => (
                <Link
                  key={m.agentId}
                  href={`/gallery/chat/${m.agentId}`}
                  className="landing-moment-item"
                >
                  <span className="landing-moment-rank">{i + 1}</span>
                  <div className="landing-moment-item-body">
                    <div className="landing-moment-item-top">
                      <span className="landing-moment-name">{m.name}</span>
                      <span className="landing-moment-score">
                        {m.score}
                        <span className="landing-moment-score-unit">%</span>
                      </span>
                    </div>
                    <div className="landing-moment-meta">
                      {m.title || 'Historical agent'}
                      {m.description ? ` · ${m.description}` : ''}
                    </div>
                    <div className="landing-moment-bar">
                      <div
                        className="landing-moment-bar-fill landing-moment-bar-pink"
                        style={{ width: `${Math.min(100, Math.max(4, m.score))}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link href="/gallery" className="landing-moment-cta">
            Browse all historical agents <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
