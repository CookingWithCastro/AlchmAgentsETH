'use client'

/**
 * Free Agents of the Week — the three FREE featured historical guides from this
 * week's best-dignity rotation (`/api/agents/weekly-feature` → `guides`).
 *
 * Surfaced at the top of the landing page (right under the hero). Chatting any
 * of these is free this week; the section links into the full weekly Attunement
 * Circle. Degrades to nothing if the rotation can't load — never a broken block.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gift, ArrowRight, Sparkles } from 'lucide-react'

interface Guide {
  id: string
  name: string
  title?: string
  element?: string
  free: boolean
}

interface TopPlanet {
  planet: string
  sign: string
  degree: number
  tier: string
}

// Matches the element palette used by Top Agents of the Moment.
const ELEMENT_COLOR: Record<string, string> = {
  Fire: '#facc15',
  Water: '#60a5fa',
  Air: '#f472b6',
  Earth: '#34d399',
}

export default function FreeAgentsOfTheWeek() {
  const [guides, setGuides] = useState<Guide[] | null>(null)
  const [topPlanets, setTopPlanets] = useState<TopPlanet[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/agents/weekly-feature')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(data => {
        if (cancelled) return
        if (!data?.ok) throw new Error(data?.error || 'failed')
        setGuides(Array.isArray(data.guides) ? data.guides.slice(0, 3) : [])
        setTopPlanets(Array.isArray(data.topPlanets) ? data.topPlanets : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Degrade gracefully: render nothing rather than a broken block on the hero.
  if (failed) return null

  const loading = guides === null
  const lead = topPlanets[0]
  const dignityHint = lead ? ` This week's strongest dignity: ${lead.planet} in ${lead.sign}.` : ''

  return (
    <section className="landing-consciousness-section" id="free-agents">
      <div className="landing-section-header">
        <div className="landing-section-label">Free This Week</div>
        <h2 className="landing-section-title">Free Agents of the Week</h2>
        <div className="landing-section-divider" />
        <p className="landing-section-subtitle">
          Three featured guides — free to chat all week, rotating with the strongest dignities in
          the live sky.{dignityHint}
        </p>
      </div>

      <div className="landing-free-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="landing-moment-skeleton" style={{ height: '11rem' }} />
            ))
          : guides!.map(g => {
              const color = ELEMENT_COLOR[g.element ?? ''] || '#a855f7'
              return (
                <Link
                  key={g.id}
                  href={`/gallery/chat/${g.id}`}
                  className="landing-glass-card landing-free-card"
                >
                  <span className="landing-free-badge">
                    <Gift size={12} /> Free this week
                  </span>
                  <span className="landing-free-name">{g.name}</span>
                  <span className="landing-free-title">{g.title || ''}</span>
                  <div className="landing-free-foot">
                    {g.element ? (
                      <span
                        className="landing-moment-chip"
                        style={{ color, borderColor: `${color}55` }}
                      >
                        {g.element}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="landing-free-chat">
                      Chat free <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              )
            })}
      </div>

      <Link href="/attunement-circle" className="landing-moment-cta">
        <Sparkles size={14} /> Enter the weekly Attunement Circle <ArrowRight size={14} />
      </Link>
    </section>
  )
}
