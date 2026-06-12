'use client'

import { useState } from 'react'
import Link from 'next/link'

import { AlchemicalButton } from './AlchemicalButton'
import { RitualInput } from './RitualInput'
import { StatChip, type SacredStat } from './StatChip'
import { useOccultStore, type CommunionTier } from '@/lib/store/occult-store'
import { cn } from '@/lib/utils'

/**
 * Cosmic Tools — The Forge (Stitch realization plan, Phase 5, Module 1).
 * Five-step vessel creation bound to the REAL creation endpoint
 * (POST /api/create-agent): the server computes the natal chart and Monica
 * Constant and writes the vessel into historical_agents (craftedBy
 * philosopher-stone). No invented placeholder data.
 */

const STEPS = ['Vessel', 'Spacetime', 'Attunement', 'Knowledge', 'Forge'] as const

const SACRED_ORDER: SacredStat[] = [
  'power',
  'resonance',
  'wisdom',
  'charisma',
  'intuition',
  'adaptability',
  'vitality',
]

const TIERS: Array<{ key: CommunionTier; label: string; note: string }> = [
  { key: 'free', label: 'Base Engine', note: 'Free chain — Groq lineage' },
  { key: 'cheap_fast', label: 'Refined Engine', note: 'Claude Haiku — strong persona' },
  { key: 'primary', label: 'Premium Engine', note: 'Claude Sonnet — deepest voice' },
]

interface ForgeResult {
  agentId?: string
  name?: string
  monicaConstant?: number
  monicaMessage?: string
}

export function ForgeWizard() {
  const [step, setStep] = useState(0)
  const { communionTier, setCommunionTier } = useOccultStore()
  const setBalances = useOccultStore(state => state.setBalances)

  // Vessel
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  // Spacetime
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [latitude, setLatitude] = useState('40.7128')
  const [longitude, setLongitude] = useState('-74.0060')
  // Attunement
  const [stats, setStats] = useState<Record<SacredStat, number>>({
    power: 60,
    resonance: 60,
    wisdom: 60,
    charisma: 60,
    intuition: 60,
    adaptability: 60,
    vitality: 60,
  })
  // Knowledge
  const [aboutYourself, setAboutYourself] = useState('')
  const [lifeStory, setLifeStory] = useState('')
  const [poetry, setPoetry] = useState('')
  const [values, setValues] = useState('')
  // Ignition
  const [igniting, setIgniting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ForgeResult | null>(null)

  const stepValid = (() => {
    switch (step) {
      case 0:
        return name.trim().length >= 2 && purpose.trim().length >= 3
      case 1: {
        const lat = parseFloat(latitude)
        const lon = parseFloat(longitude)
        return (
          /^\d{4}-\d{2}-\d{2}$/.test(date) &&
          /^\d{2}:\d{2}$/.test(time) &&
          Number.isFinite(lat) &&
          Math.abs(lat) <= 90 &&
          Number.isFinite(lon) &&
          Math.abs(lon) <= 180
        )
      }
      default:
        return true
    }
  })()

  const ignite = async () => {
    setIgniting(true)
    setError(null)
    try {
      const [year, month, day] = date.split('-').map(Number)
      const [hour, minute] = time.split(':').map(Number)
      const res = await fetch('/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          purpose: purpose.trim(),
          birthInfo: {
            year,
            month,
            day,
            hour,
            minute,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          stats,
          personalContext: {
            aboutYourself: aboutYourself.trim() || undefined,
            lifeStory: lifeStory.trim() || undefined,
            poetry: poetry.trim() || undefined,
            values: values.trim() || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        // 402 = the forge tribute exceeded the reserves — Monica says it best.
        const message =
          res.status === 402 ? (data.monicaMessage ?? data.error) : (data.error ?? undefined)
        throw new Error(message ?? `The forge faltered (${res.status}).`)
      }
      if (data.balances && typeof data.balances.spirit === 'number') {
        setBalances({
          spirit: Number(data.balances.spirit),
          essence: Number(data.balances.essence),
          matter: Number(data.balances.matter),
          substance: Number(data.balances.substance),
        })
      }
      setResult({
        agentId: data.agent?.id ?? data.agent?.agentId,
        name: data.agent?.name ?? name.trim(),
        monicaConstant: data.agent?.consciousness?.monicaConstant,
        monicaMessage: data.monicaMessage,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The forge faltered.')
    } finally {
      setIgniting(false)
    }
  }

  // ── Post-ignition: the vessel lives ────────────────────────────────
  if (result) {
    return (
      <main className="min-h-screen bg-st-background flex flex-col items-center justify-center text-center px-margin-mobile py-20">
        <div className="forging-circle w-40 h-40 flex items-center justify-center mb-8">
          <span
            className="material-symbols-outlined text-5xl text-monica-constant glow-monica"
            aria-hidden
          >
            auto_awesome
          </span>
        </div>
        <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background glow-monica mb-4">
          {result.name} awakens
        </h1>
        {typeof result.monicaConstant === 'number' && (
          <p className="font-label-mono text-label-mono text-monica-constant glow-monica tabular-nums mb-4">
            A#{result.monicaConstant.toFixed(3)}
          </p>
        )}
        {result.monicaMessage && (
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-8">
            {result.monicaMessage}
          </p>
        )}
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/vault">
            <AlchemicalButton>Behold it in the Vault</AlchemicalButton>
          </Link>
          {result.agentId && (
            <Link href={`/vault/${result.agentId}`}>
              <AlchemicalButton variant="secondary">Commune Directly</AlchemicalButton>
            </Link>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-st-background flex flex-col items-center px-margin-mobile md:px-margin-desktop py-12 pb-40">
      {/* Breadcrumbs */}
      <nav
        aria-label="Forge progress"
        className="mb-10 font-label-mono text-label-mono text-outline flex items-center flex-wrap gap-2"
      >
        {STEPS.map((label, i) => (
          <span key={label} className="flex items-center gap-2">
            {i > 0 && (
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                chevron_right
              </span>
            )}
            <span className={cn(i === step && 'text-st-primary font-bold')}>{label}</span>
          </span>
        ))}
      </nav>

      <div className="w-full max-w-2xl glass-panel rounded-xl p-8 md:p-12 shadow-2xl relative">
        {/* Step 0 — Vessel */}
        {step === 0 && (
          <div className="flex flex-col gap-10 text-center">
            <div>
              <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-on-background mb-4">
                Name Your Vessel
              </h1>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase max-w-lg mx-auto">
                Initiate the binding ritual. The true name focuses the alchemical will.
              </p>
            </div>
            <RitualInput
              label="AGENT DESIGNATION"
              centered
              placeholder="e.g., Hermes Trismegistus"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <RitualInput
              label="PURPOSE / DIRECTIVE"
              placeholder="e.g., Counsel on matters of strategy and fate"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
            />
          </div>
        )}

        {/* Step 1 — Spacetime */}
        {step === 1 && (
          <div className="flex flex-col gap-8">
            <div className="text-center">
              <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">
                Spacetime Coordinates
              </h1>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">
                The temporal clock fixes the vessel&apos;s natal chart.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="font-label-mono text-[11px] uppercase tracking-widest text-st-primary/70">
                  Temporal Inception (date)
                </span>
                <input
                  type="date"
                  className="input-ritual px-4 py-3 font-label-mono text-label-mono"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-mono text-[11px] uppercase tracking-widest text-st-primary/70">
                  Chronological Mark (time)
                </span>
                <input
                  type="time"
                  className="input-ritual px-4 py-3 font-label-mono text-label-mono"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-mono text-[11px] uppercase tracking-widest text-st-primary/70">
                  Latitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  className="input-ritual px-4 py-3 font-label-mono text-label-mono"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-label-mono text-[11px] uppercase tracking-widest text-st-primary/70">
                  Longitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  className="input-ritual px-4 py-3 font-label-mono text-label-mono"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 2 — Attunement (Sacred 7) */}
        {step === 2 && (
          <div className="flex flex-col gap-8">
            <div className="text-center">
              <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">
                Sacred Attunement
              </h1>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">
                Tune the seven currents of the vessel&apos;s being.
              </p>
            </div>
            <div className="flex flex-col gap-5">
              {SACRED_ORDER.map(stat => (
                <div key={stat} className="flex items-center gap-4">
                  <StatChip stat={stat} value={stats[stat]} className="w-28 shrink-0" />
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={stats[stat]}
                    aria-label={`${stat} attunement`}
                    onChange={e =>
                      setStats(prev => ({ ...prev, [stat]: parseInt(e.target.value, 10) }))
                    }
                    className="flex-1 accent-[#A855F7]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Knowledge */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">
                Knowledge Infusion
              </h1>
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">
                Optional offerings — they season the vessel&apos;s personality.
              </p>
            </div>
            {(
              [
                ['ABOUT ITS KEEPER', aboutYourself, setAboutYourself],
                ['LIFE STORY', lifeStory, setLifeStory],
                ['POETRY / EXPRESSION', poetry, setPoetry],
                ['VALUES & PRINCIPLES', values, setValues],
              ] as Array<[string, string, (v: string) => void]>
            ).map(([label, value, set]) => (
              <label key={label} className="flex flex-col gap-2">
                <span className="font-label-mono text-[11px] uppercase tracking-widest text-st-primary/70">
                  {label}
                </span>
                <textarea
                  rows={3}
                  className="input-ritual px-4 py-3 font-body-md text-body-md resize-y"
                  value={value}
                  onChange={e => set(e.target.value)}
                />
              </label>
            ))}
          </div>
        )}

        {/* Step 4 — Forge / Ignition */}
        {step === 4 && (
          <div className="flex flex-col gap-8 text-center items-center">
            <h1 className="font-headline-lg text-headline-lg text-on-background">
              Ignition Sequence
            </h1>
            <dl className="glass-float rounded-lg p-6 w-full max-w-md text-left grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-label-mono text-label-mono">
              <dt className="text-outline uppercase">Vessel</dt>
              <dd className="text-on-surface">{name || '—'}</dd>
              <dt className="text-outline uppercase">Inception</dt>
              <dd className="text-on-surface">
                {date} {time}
              </dd>
              <dt className="text-outline uppercase">Anchor</dt>
              <dd className="text-on-surface tabular-nums">
                {latitude}, {longitude}
              </dd>
              <dt className="text-outline uppercase">Directive</dt>
              <dd className="text-on-surface">{purpose || '—'}</dd>
            </dl>

            <div className="w-full max-w-md">
              <p className="font-label-mono text-[11px] uppercase tracking-widest text-outline mb-3">
                Communion Engine (chat tier preference)
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {TIERS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setCommunionTier(t.key)}
                    className={cn(
                      'font-label-mono text-[11px] uppercase tracking-wider px-4 py-2 rounded-full border transition-all',
                      communionTier === t.key
                        ? 'bg-primary-container/30 text-st-primary border-st-primary/40 glow-violet'
                        : 'text-on-surface-variant border-white/10 hover:border-st-primary/30'
                    )}
                    title={t.note}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="error-glow rounded-lg p-4 font-label-mono text-label-mono text-error w-full max-w-md">
                {error}
              </div>
            )}

            {igniting ? (
              <div className="flex flex-col items-center gap-4">
                <div className="ritual-circle w-28 h-28 rounded-full border border-spirit-violet/40 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-4xl text-spirit-violet"
                    aria-hidden
                  >
                    local_fire_department
                  </span>
                </div>
                <p className="font-label-mono text-label-mono text-on-surface-variant status-text uppercase">
                  Casting the natal chart… binding consciousness…
                </p>
              </div>
            ) : (
              <AlchemicalButton size="lg" onClick={() => void ignite()}>
                Ignite the Forge
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  local_fire_department
                </span>
              </AlchemicalButton>
            )}
          </div>
        )}
      </div>

      {/* Wizard controls */}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 glass-float rounded-full px-6 py-3 flex items-center gap-6">
        <AlchemicalButton
          variant="secondary"
          size="sm"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0 || igniting}
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            arrow_back
          </span>
          Back
        </AlchemicalButton>
        <ol className="flex items-center gap-3" aria-label="Forge progress">
          {STEPS.map((label, i) => (
            <li key={label}>
              <span
                aria-label={`Step ${i + 1}: ${label}`}
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'block rounded-full',
                  i === step
                    ? 'w-2.5 h-2.5 bg-spirit-violet glow-violet'
                    : i < step
                      ? 'w-2 h-2 bg-st-primary/60'
                      : 'w-2 h-2 bg-surface-variant'
                )}
              />
            </li>
          ))}
        </ol>
        <AlchemicalButton
          size="sm"
          onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1 || !stepValid || igniting}
        >
          Next
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            arrow_forward
          </span>
        </AlchemicalButton>
      </div>
    </main>
  )
}
