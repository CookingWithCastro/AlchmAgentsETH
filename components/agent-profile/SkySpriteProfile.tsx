import Link from 'next/link'
import type { SpriteView } from '@/lib/agents/sprite-view'

const PLANET_GLYPH: Record<string, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  chiron: '⚷',
}
const TOKENS: Array<{
  key: keyof SpriteView['affinity']
  glyph: string
  label: string
  grad: string
}> = [
  { key: 'spirit', glyph: '🝇', label: 'Spirit', grad: 'grad-spirit-fire' },
  { key: 'essence', glyph: '🝑', label: 'Essence', grad: 'grad-essence-water' },
  { key: 'matter', glyph: '🝙', label: 'Matter', grad: 'grad-matter-earth' },
  { key: 'substance', glyph: '🝉', label: 'Substance', grad: 'grad-substance-air' },
]
const DIGNITY_LABEL: Record<string, string> = {
  exaltation: 'Exalted',
  domicile: 'Domicile',
  peregrine: 'Peregrine',
  detriment: 'Detriment',
  fall: 'Fall',
}
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const round1 = (n: number) => Math.round(n * 10) / 10

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
      {children}
    </div>
  )
}

export function SkySpriteProfile({ view }: { view: SpriteView }) {
  const title =
    view.kind === 'lunar' ? 'The Moon' : `${cap(view.planet)} at ${cap(view.sign)} ${view.degree}°`
  const reservoir = view.currentReservoir ?? view.idealReservoir
  const reservoirTotal =
    reservoir.spirit + reservoir.essence + reservoir.matter + reservoir.substance

  return (
    <main className="min-h-screen bg-[#08080e] text-white">
      {/* gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <header className="glass-card-premium rounded-3xl border-white/8 p-8">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 text-5xl">
              {PLANET_GLYPH[view.planet] ?? '✦'}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                Sky Sprite · {view.kind === 'lunar' ? 'Lunar reservoir' : 'Planetary degree'}
              </div>
              <h1 className="mt-1 font-[var(--ff-display)] text-3xl">{title}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                {view.dignity && (
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/70">
                    {DIGNITY_LABEL[view.dignity] ?? view.dignity}
                  </span>
                )}
                {typeof view.illumination === 'number' && (
                  <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/70">
                    {Math.round(view.illumination * 100)}% illuminated
                  </span>
                )}
                {view.bestowsStat && (
                  <span className="rounded-full border border-fuchsia-400/30 px-2.5 py-0.5 text-xs text-fuchsia-200/80">
                    empowers {view.bestowsStat}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            A celestial point, not a chronicler — it doesn&apos;t earn or level. It radiates a
            dignity-tuned reservoir of ESMS and, when it transits an agent&apos;s natal point,
            bestows a share of that reservoir and raises the agent&apos;s{' '}
            <span className="text-white/80">{view.bestowsStat ?? 'planetary'}</span> stat.
          </p>
        </header>

        {/* Reservoir */}
        <section className="glass-card-premium mt-6 rounded-3xl border-white/8 p-6 md:p-8">
          <SectionLabel>Reservoir {view.currentReservoir ? '(live)' : '(ideal)'}</SectionLabel>
          <div className="mb-4 text-2xl font-black tabular-nums text-white">
            {round1(reservoirTotal)}{' '}
            <span className="text-sm font-normal text-white/40">ESMS radiating</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {TOKENS.map(t => (
              <div
                key={t.key}
                className="glass-base rounded-2xl border border-white/8 p-4 text-center"
              >
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-lg ${t.grad}`}
                >
                  {t.glyph}
                </div>
                <div className="text-xl font-black tabular-nums text-white">
                  {round1(reservoir[t.key])}
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transit */}
        {view.transit && (
          <section className="glass-card-premium mt-6 rounded-3xl border-white/8 p-6 md:p-8">
            <SectionLabel>Live transit</SectionLabel>
            <div className="text-sm text-white/70">
              {cap(view.planet)} is currently at{' '}
              <span className="text-white/90">
                {cap(view.transit.sign)} {round1(view.transit.degree)}°
              </span>
              .{' '}
              {view.transit.active ? (
                <span className="text-emerald-300/80">
                  This degree is charged — the planet is here now.
                </span>
              ) : (
                <span className="text-white/40">
                  This degree is dormant until the planet returns.
                </span>
              )}
            </div>
          </section>
        )}

        {/* Recent bestowals */}
        <section className="glass-card-premium mt-6 rounded-3xl border-white/8 p-6 md:p-8">
          <SectionLabel>Recent bestowals</SectionLabel>
          {view.recentBestowals.length === 0 ? (
            <p className="text-sm text-white/40">
              No bestowals yet — appears here when this degree transits an agent&apos;s natal point.
            </p>
          ) : (
            <div className="space-y-2">
              {view.recentBestowals.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-white/5 py-2 text-sm"
                >
                  <Link
                    href={`/agent/${b.agentId}`}
                    className="font-medium text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    {b.agentId}
                  </Link>
                  <span className="text-white/55 tabular-nums">
                    +{round1(b.total)} ESMS · +{round1(b.statBuff)} {b.statBuffed}
                  </span>
                  <span className="text-xs text-white/30">{fmtDate(b.at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
