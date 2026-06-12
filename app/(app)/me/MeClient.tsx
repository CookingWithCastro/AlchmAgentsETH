'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import type { ZodiacTheme } from '@/lib/zodiac-utils'
import type { ProfileYieldState } from '@/lib/profile-yield'
import { ProfileYieldPanel } from '@/components/profile/ProfileYieldPanel'
import {
  Compass,
  Users,
  Sparkles,
  FlaskConical,
  BrainCircuit,
  TrendingUp,
  ArrowRight,
  LogOut,
  Crown,
  ChefHat,
  Layers,
  Copy,
  Check,
} from 'lucide-react'

const CircularNatalHoroscope = dynamic(
  () => import('@/components/charts/circular-natal-horoscope'),
  {
    loading: () => (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    ),
  }
)

const LiveConsciousnessDisplay = dynamic(
  () =>
    import('@/components/profile/live-consciousness-display').then(mod => ({
      default: mod.LiveConsciousnessDisplay,
    })),
  {
    loading: () => (
      <div className="h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    ),
  }
)

interface MeClientProps {
  user: {
    name?: string | null
    image?: string | null
  }
  sunSign: string
  zodiacTheme: ZodiacTheme
  monicaConstant: number
  dominantElement: string
  modality: string
  spirit: number
  essence: number
  matter: number
  substance: number
  fire: number
  water: number
  air: number
  earth: number
  Heat: number
  Entropy: number
  Reactivity: number
  EnergyValue: number
  computationError: string | null
  birthInfo: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    latitude?: number
    longitude?: number
  }
  profileName: string | null
  renderAstrologize?: any
  renderAlchemize?: any
  renderImaginizer?: any
  wallet: ProfileYieldState | null
}

const tourCards = [
  {
    icon: Compass,
    title: 'Cosmic Tools',
    description:
      'Track planetary movements, chart the current moment, and explore cosmic timing through the Time Laboratory.',
    href: 'https://alchm.kitchen/quantities',
    cta: 'Open Time Lab',
  },
  {
    icon: Users,
    title: 'Planetary Council',
    description:
      'Engage in multi-agent conversations with the planetary governing body. Each agent embodies a celestial archetype.',
    href: '/planetary-council',
    cta: 'Enter the Council',
  },
  {
    icon: Sparkles,
    title: 'Agent Gallery',
    description:
      'Explore 50+ historical and astrological AI agents — from Leonardo da Vinci to Carl Jung — each shaped by real birthcharts.',
    href: '/gallery',
    cta: 'Browse Agents',
  },
  {
    icon: FlaskConical,
    title: 'Mystic Arts',
    description:
      'Cast runes, draw tarot spreads, and perform alchemical synthesis in the Rune Forge and Synthesis Chamber.',
    href: '/rune-forge',
    cta: 'Begin Crafting',
  },
  {
    icon: BrainCircuit,
    title: 'Alchemical Labs',
    description:
      'Live telemetry — the consciousness trajectory across all communions and the agent league record.',
    href: '/labs',
    cta: 'Read the Record',
  },
  {
    icon: TrendingUp,
    title: 'Your Chart',
    description:
      'Interpret your natal chart, track transits and planetary aspects, and discover how celestial events shape your path.',
    href: '/chart-interpreter',
    cta: 'Interpret Chart',
  },
  {
    icon: Crown,
    title: 'Account & Premium',
    description:
      'Manage your subscription, unlock premium models (Claude Sonnet/Opus, GPT-5.x), and connect your own OpenAI or Anthropic key.',
    href: '/account',
    cta: 'Manage Account',
  },
  {
    icon: ChefHat,
    title: 'Your Kitchen Profile',
    description:
      'Your alchm.kitchen account and shared token wallet — same login, culinary side of the Alchm ecosystem.',
    href: 'https://alchm.kitchen/profile',
    cta: 'Open Kitchen Profile',
  },
]

function getConsciousnessLevel(mc: number): string {
  if (mc < 1) return 'Foundational'
  if (mc < 2) return 'Developing'
  if (mc < 3) return 'Advanced'
  return 'Transcendent'
}

export function MeClient({
  user,
  sunSign,
  zodiacTheme,
  monicaConstant,
  dominantElement,
  modality,
  spirit,
  essence,
  matter,
  substance,
  fire,
  water,
  air,
  earth,
  Heat,
  Entropy,
  Reactivity,
  EnergyValue,
  computationError,
  birthInfo,
  profileName,
  renderAstrologize,
  renderAlchemize,
  renderImaginizer,
  wallet,
}: MeClientProps) {
  const maxAlchm = Math.max(spirit, essence, matter, substance, 1)

  const [activeZodiacTab, setActiveZodiacTab] = useState<'tropical' | 'sidereal'>('tropical')
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = () => {
    if (!renderImaginizer?.prompt || !navigator.clipboard?.writeText) return
    navigator.clipboard
      .writeText(renderImaginizer.prompt)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        /* clipboard blocked (insecure context / permission denied) — no-op */
      })
  }

  // Inject zodiac CSS custom properties via inline style on the root element
  const zodiacCssVars = {
    '--zodiac-gradient': zodiacTheme.gradient,
    '--zodiac-card-gradient': zodiacTheme.cardGradient,
    '--zodiac-accent': zodiacTheme.accentHsl,
    '--zodiac-glow': zodiacTheme.glowColor,
    '--zodiac-border': zodiacTheme.borderColor,
  } as React.CSSProperties

  return (
    <div className="me-page" style={zodiacCssVars}>
      {/* Starfield Layer */}
      <div className="me-starfield" />

      {/* Sign Out */}
      <form action="/api/logout" method="POST">
        <button type="submit" className="me-sign-out">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <LogOut size={14} />
            Sign Out
          </span>
        </button>
      </form>

      {/* Computation Warning */}
      {computationError && (
        <div className="me-warning">
          ⚠️ Using fallback data due to computation issue: {computationError}
        </div>
      )}

      {/* Hero Section */}
      <section className="me-hero">
        <div className="me-hero-avatar-ring">
          <div className="me-hero-avatar-inner">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name || 'You'}
                width={96}
                height={96}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>👤</span>
            )}
          </div>
        </div>

        <h1>Welcome, {user.name || 'Explorer'}</h1>
        <p className="me-hero-tagline">{zodiacTheme.tagline}</p>

        <div className="me-zodiac-badge">
          <span className="constellation">{zodiacTheme.constellation}</span>
          {sunSign} · {zodiacTheme.element} · {zodiacTheme.rulingPlanet}
        </div>

        <div className="me-mc-display">
          <div className="me-mc-value">
            <div className="number">{monicaConstant.toFixed(3)}</div>
            <div className="label">Monica Constant</div>
          </div>
          <div className="me-mc-level">{getConsciousnessLevel(monicaConstant)} Level</div>
          <div className="me-mc-value">
            <div className="number" style={{ fontSize: '1.5rem' }}>
              {dominantElement}
            </div>
            <div className="label">Dominant Element</div>
          </div>
        </div>
      </section>

      {/* Alchemical Strip */}
      <section className="me-alchemy-strip">
        <div className="me-alchemy-tile tile-spirit">
          <div className="tile-icon">🔥</div>
          <div className="tile-value">{spirit.toFixed(1)}</div>
          <div className="tile-label">Spirit</div>
          <div className="tile-bar">
            <div
              className="tile-bar-fill"
              style={{ width: `${Math.min(100, (spirit / maxAlchm) * 100)}%` }}
            />
          </div>
        </div>
        <div className="me-alchemy-tile tile-essence">
          <div className="tile-icon">💨</div>
          <div className="tile-value">{essence.toFixed(1)}</div>
          <div className="tile-label">Essence</div>
          <div className="tile-bar">
            <div
              className="tile-bar-fill"
              style={{ width: `${Math.min(100, (essence / maxAlchm) * 100)}%` }}
            />
          </div>
        </div>
        <div className="me-alchemy-tile tile-matter">
          <div className="tile-icon">🌿</div>
          <div className="tile-value">{matter.toFixed(1)}</div>
          <div className="tile-label">Matter</div>
          <div className="tile-bar">
            <div
              className="tile-bar-fill"
              style={{ width: `${Math.min(100, (matter / maxAlchm) * 100)}%` }}
            />
          </div>
        </div>
        <div className="me-alchemy-tile tile-substance">
          <div className="tile-icon">💧</div>
          <div className="tile-value">{substance.toFixed(1)}</div>
          <div className="tile-label">Substance</div>
          <div className="tile-bar">
            <div
              className="tile-bar-fill"
              style={{ width: `${Math.min(100, (substance / maxAlchm) * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <ProfileYieldPanel initialWallet={wallet} />

      {/* Explore the Cosmos — Site Tour */}
      <div className="me-section-title">
        <h2>Explore the Cosmos</h2>
        <p>Your gateway to the Planetary Agents platform</p>
        <div className="divider" />
      </div>

      <section className="me-tour-grid">
        {tourCards.map(card => (
          <Link key={card.href} href={card.href} className="me-tour-card">
            <div className="tour-icon">
              <card.icon size={22} />
            </div>
            <div className="tour-title">{card.title}</div>
            <div className="tour-desc">{card.description}</div>
            <div className="tour-cta">
              {card.cta}
              <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </section>

      {/* Charts & Consciousness Section */}
      <div className="me-section-title">
        <h2>Your Cosmic Blueprint</h2>
        <p>Natal chart, live consciousness, and alchemical insights</p>
        <div className="divider" />
      </div>

      <section className="me-charts-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* Natal Chart */}
          <div className="me-glass-card">
            <CircularNatalHoroscope
              className="w-full"
              showKinetics={true}
              birthInfo={{
                name: profileName || user.name || 'You',
                year: birthInfo.year,
                month: birthInfo.month,
                day: birthInfo.day,
                hour: birthInfo.hour,
                minute: birthInfo.minute,
                latitude: birthInfo.latitude ?? 0,
                longitude: birthInfo.longitude ?? 0,
              }}
            />
          </div>

          {/* Live Consciousness */}
          <LiveConsciousnessDisplay
            birthInfo={birthInfo}
            userName={user.name || 'You'}
            birthAlchm={{
              spirit,
              essence,
              matter,
              substance,
              Heat,
              Energy: EnergyValue,
              Entropy,
              Reactivity,
            }}
            birthMC={monicaConstant}
          />

          {/* Insights */}
          <div className="me-glass-card">
            <h3>Chart Insights</h3>
            <p style={{ marginBottom: '1rem' }}>Key patterns and recommendations</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="me-insight-card">
                <h4>Dominant Patterns</h4>
                <p>
                  Your {dominantElement.toLowerCase()} dominance suggests a natural affinity for{' '}
                  {dominantElement === 'Fire'
                    ? 'creativity and leadership'
                    : dominantElement === 'Water'
                      ? 'intuition and emotional depth'
                      : dominantElement === 'Air'
                        ? 'communication and ideas'
                        : 'stability and practical manifestation'}
                  .
                </p>
              </div>

              <div className="me-insight-card">
                <h4>Monica Constant Analysis</h4>
                <p>
                  At {monicaConstant.toFixed(3)}, your consciousness operates at a{' '}
                  {getConsciousnessLevel(monicaConstant).toLowerCase()} level with strong potential
                  for growth.
                </p>
              </div>

              <div className="me-insight-card">
                <h4>Alchemical Balance</h4>
                <p>
                  Your Spirit/Essence ratio of {(spirit / Math.max(essence, 0.1)).toFixed(2)}{' '}
                  indicates{' '}
                  {spirit > essence ? 'active initiation energy' : 'receptive integration capacity'}
                  , while your Matter/Substance foundation provides{' '}
                  {matter > substance ? 'structural stability' : 'connective flexibility'}.
                </p>
              </div>

              {/* Thermodynamic Properties */}
              <div className="me-insight-card">
                <h4>Thermodynamic Properties</h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Heat:</span>
                    <span style={{ fontFamily: 'monospace' }}>{Heat.toFixed(3)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Entropy:</span>
                    <span style={{ fontFamily: 'monospace' }}>{Entropy.toFixed(3)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Reactivity:</span>
                    <span style={{ fontFamily: 'monospace' }}>{Reactivity.toFixed(3)}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Energy:</span>
                    <span style={{ fontFamily: 'monospace' }}>{EnergyValue.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supplemental Cosmic Alignment Nodes */}
      {renderAlchemize && (
        <>
          <div className="me-section-title">
            <h2>Supplemental Cosmic Alignments</h2>
            <p>Tarot, Sidereal placements, and Alchemical synergy mapping</p>
            <div className="divider" />
          </div>

          <section className="me-supplemental-nodes-grid">
            {/* Node 1: Dual-Zodiac Placements */}
            <div className="me-cosmic-card me-zodiac-toggle-pane">
              <h3>Dual-Zodiac Toggle</h3>
              <p>
                Compare your Tropical (seasonal Western) and Sidereal (astronomical Vedic) planetary
                coordinates.
              </p>

              <div className="me-zodiac-tabs">
                <button
                  className={`me-zodiac-tab-btn ${activeZodiacTab === 'tropical' ? 'active' : ''}`}
                  onClick={() => setActiveZodiacTab('tropical')}
                >
                  Tropical
                </button>
                <button
                  className={`me-zodiac-tab-btn ${activeZodiacTab === 'sidereal' ? 'active' : ''}`}
                  onClick={() => setActiveZodiacTab('sidereal')}
                >
                  Sidereal
                </button>
              </div>

              <div className="me-zodiac-positions-grid">
                {Object.entries(
                  activeZodiacTab === 'tropical'
                    ? renderAstrologize?.totals?.planets || {}
                    : renderAstrologize?.sidereal?.CelestialBodies?.all?.reduce(
                        (acc: any, p: any) => {
                          acc[p.label] = {
                            sign: p.Sign?.label || 'Aries',
                            degree: p.ChartPosition?.Ecliptic?.DecimalDegrees % 30 || 0,
                            house: p.House?.id || '1',
                          }
                          return acc
                        },
                        {}
                      ) || {}
                ).map(([planet, details]: [string, any]) => (
                  <div key={planet} className="me-zodiac-planet-item">
                    <span className="me-zodiac-planet-name">{planet}</span>
                    <span className="me-zodiac-planet-placement">{details.sign}</span>
                    <span className="me-zodiac-planet-degree">
                      {Number(details.degree || 0).toFixed(1)}°
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Node 2: Tarot Oracle */}
            <div className="me-cosmic-card me-tarot-oracle-pane">
              <div style={{ gridColumn: 'span 2' }}>
                <h3>Tarot & Decan Oracle</h3>
                <p>Sacred minor and major tarot archetypes mapped directly to your placements.</p>
              </div>

              {renderAlchemize.totals?.['Sun Major Arcana'] && (
                <div className="me-tarot-card-item">
                  <div className="me-tarot-card-header">
                    <span className="me-tarot-card-type">Sun Sign</span>
                    <span className="me-tarot-card-badge">☀️</span>
                  </div>
                  <div className="me-tarot-card-name">
                    {renderAlchemize.totals['Sun Major Arcana']}
                  </div>
                  <div className="me-tarot-card-desc">
                    Your core soul purpose card, expressing solar energy.
                  </div>
                </div>
              )}

              {renderAlchemize.totals?.['Ascendant Major Arcana'] && (
                <div className="me-tarot-card-item">
                  <div className="me-tarot-card-header">
                    <span className="me-tarot-card-type">Ascendant</span>
                    <span className="me-tarot-card-badge">🌅</span>
                  </div>
                  <div className="me-tarot-card-name">
                    {renderAlchemize.totals['Ascendant Major Arcana']}
                  </div>
                  <div className="me-tarot-card-desc">
                    Your outward persona and life path manifestation card.
                  </div>
                </div>
              )}

              {renderAlchemize.totals?.['Decan Minor Arcana'] && (
                <div className="me-tarot-card-item">
                  <div className="me-tarot-card-header">
                    <span className="me-tarot-card-type">Decan Ruler</span>
                    <span className="me-tarot-card-badge">✨</span>
                  </div>
                  <div className="me-tarot-card-name">
                    {renderAlchemize.totals['Decan Minor Arcana']}
                  </div>
                  <div className="me-tarot-card-desc">
                    Your decan card representing the sub-ruler qualities.
                  </div>
                </div>
              )}

              {renderAlchemize.totals?.['Cusp Minor Arcana'] &&
                renderAlchemize.totals['Cusp Minor Arcana'] !== 'None' && (
                  <div
                    className="me-tarot-card-item"
                    style={{
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      background: 'rgba(234, 179, 8, 0.05)',
                    }}
                  >
                    <div className="me-tarot-card-header">
                      <span className="me-tarot-card-type" style={{ color: '#eab308' }}>
                        Cusp Influence
                      </span>
                      <span className="me-tarot-card-badge">🔮</span>
                    </div>
                    <div className="me-tarot-card-name">
                      {renderAlchemize.totals['Cusp Minor Arcana']}
                    </div>
                    <div className="me-tarot-card-desc">
                      A cusp card showing mixed gifts from sign borders.
                    </div>
                  </div>
                )}
            </div>

            {/* Node 3: Stellium & Aspect Synergy Map */}
            <div className="me-cosmic-card me-synergy-pane">
              <h3>Consciousness Synergy Map</h3>
              <p>Planetary groupings (Stelliums) and dynamic harmonic connections in your chart.</p>

              {renderAlchemize['All Stelliums'] && renderAlchemize['All Stelliums'].length > 0 ? (
                <div className="me-stellium-section">
                  <div className="me-stellium-header">
                    <span>🌟</span>
                    <span>Active Stellium: {renderAlchemize['All Stelliums'].join(', ')}</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.7)',
                      marginTop: '0.25rem',
                    }}
                  >
                    An exceptionally strong concentration of celestial bodies in this sign focuses
                    your power intensely here.
                  </p>
                </div>
              ) : (
                <div
                  className="me-stellium-section"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="me-stellium-header" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    <span>✨</span>
                    <span>No Major Stelliums</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: '0.25rem',
                    }}
                  >
                    Your planetary energies are harmoniously distributed across multiple zodiac
                    signs.
                  </p>
                </div>
              )}

              <div className="me-aspects-section">
                <h4>Dynamic Harmonizer Links</h4>
                <div className="me-aspects-subgrid">
                  {renderAlchemize['All Conjunctions'] &&
                    renderAlchemize['All Conjunctions'].length > 0 && (
                      <div className="me-aspect-group-item">
                        <div className="me-aspect-group-title">
                          <span>Conjunctions</span>
                          <span>{renderAlchemize['All Conjunctions'].length}</span>
                        </div>
                        <div className="me-aspect-list">
                          {renderAlchemize['All Conjunctions']
                            .slice(0, 3)
                            .map((a: any, i: number) => (
                              <div key={i} className="me-aspect-row">
                                <span>{a.Planets.join(' ☌ ')}</span>
                                <span>{a.Sign}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                  {renderAlchemize['All Trines'] && renderAlchemize['All Trines'].length > 0 && (
                    <div className="me-aspect-group-item">
                      <div className="me-aspect-group-title">
                        <span>Trines</span>
                        <span>{renderAlchemize['All Trines'].length}</span>
                      </div>
                      <div className="me-aspect-list">
                        {renderAlchemize['All Trines'].slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="me-aspect-row">
                            <span>{a.Planets.join(' ▵ ')}</span>
                            <span>{a.Sign}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderAlchemize['All Squares'] && renderAlchemize['All Squares'].length > 0 && (
                    <div className="me-aspect-group-item">
                      <div className="me-aspect-group-title">
                        <span>Squares</span>
                        <span>{renderAlchemize['All Squares'].length}</span>
                      </div>
                      <div className="me-aspect-list">
                        {renderAlchemize['All Squares'].slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className="me-aspect-row">
                            <span>{a.Planets.join(' □ ')}</span>
                            <span>{a.Sign}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Node 4: Imaginizer Prompt Engine */}
            <div className="me-cosmic-card me-imaginizer-pane">
              <h3>Imaginizer Prompt Engine</h3>
              <p>The prompt that shapes the visual sigil representing your alchemical blueprint.</p>

              {renderImaginizer?.prompt ? (
                <>
                  <div className="me-prompt-box">{renderImaginizer.prompt}</div>
                  <button className="me-copy-prompt-btn" onClick={handleCopyPrompt}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Sigil Prompt'}
                  </button>
                </>
              ) : (
                <div className="me-prompt-box" style={{ opacity: 0.6, fontSize: '0.8rem' }}>
                  No prompt generated. Configure the Render Imaginizer to unlock prompt engine.
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="me-footer">
        Planetary Agents · Consciousness Evolution Platform · v2.0
      </footer>
    </div>
  )
}
