'use client'

import { useState } from 'react'
import Link from 'next/link'

// Shapes mirror lib/agents/activity-surfaces.ts (kept local so this client
// component never imports the server-only module).
export interface AgentBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
}
export interface ActivityInteraction {
  id: string
  kind: 'agent_to_agent' | 'agent_to_user'
  counterparty: { slug?: string; name: string; userId?: string }
  topic: string
  messagePreview: string
  messageCount: number
  lastTurnAt: string
  chatThread: string
}
export interface ActivityArtifact {
  id: string
  kind: 'recipe' | 'lab_entry' | 'insight'
  title: string
  createdAt: string
  summary: string
  alchmKitchenPath?: string
  /** True for an agent-authored recipe; render `recipe` inline (no catalog proxy). */
  authored?: boolean
  recipe?: Record<string, unknown>
}
export interface ActivityAction {
  id: string
  type: string
  createdAt: string
  metadata: Record<string, unknown>
  links: { chatThread?: string; recipe?: string }
}

interface Props {
  agentName: string
  balances: AgentBalances | null
  interactions: ActivityInteraction[]
  artifacts: ActivityArtifact[]
  actions: ActivityAction[]
}

const BALANCE_TILES: Array<{
  key: keyof AgentBalances
  glyph: string
  label: string
  grad: string
}> = [
  { key: 'spirit', glyph: '🝇', label: 'Spirit', grad: 'grad-spirit-fire' },
  { key: 'essence', glyph: '🝑', label: 'Essence', grad: 'grad-essence-water' },
  { key: 'matter', glyph: '🝙', label: 'Matter', grad: 'grad-matter-earth' },
  { key: 'substance', glyph: '🝉', label: 'Substance', grad: 'grad-substance-air' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
      {children}
    </div>
  )
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function recipeIdFromPath(path?: string): string | null {
  if (!path) return null
  const seg = path.replace(/\/+$/, '').split('/').pop()
  return seg || null
}

function RecipeCard({ artifact, agentName }: { artifact: ActivityArtifact; agentName: string }) {
  const [open, setOpen] = useState(false)
  // Authored recipes ship their payload inline; featured ones lazy-load from the catalog proxy.
  const inlineRecipe = artifact.authored ? ((artifact.recipe as any) ?? null) : null
  const [recipe, setRecipe] = useState<any>(inlineRecipe)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recipeId = recipeIdFromPath(artifact.alchmKitchenPath)
  const expandable = artifact.authored ? !!inlineRecipe : !!recipeId

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (artifact.authored) return // inline payload already loaded
    if (recipe || !recipeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(recipeId)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRecipe(data.recipe ?? data)
    } catch (e) {
      setError('Recipe details are unavailable right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-base rounded-2xl border border-white/8 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/90">{artifact.title}</div>
          <div className="mt-1 text-xs text-white/40">{fmtDate(artifact.createdAt)}</div>
        </div>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
          {artifact.kind === 'recipe'
            ? artifact.authored
              ? 'Created'
              : 'Featured'
            : artifact.kind}
        </span>
      </div>
      {artifact.authored && (
        <div className="mt-1 text-[11px] font-medium text-fuchsia-300/80">
          Created by {agentName}
        </div>
      )}
      {artifact.summary && <p className="mt-2 text-sm text-white/60">{artifact.summary}</p>}
      {expandable && (
        <button
          onClick={toggle}
          className="mt-3 text-xs font-medium text-fuchsia-300 transition hover:text-fuchsia-200"
        >
          {open ? 'Hide recipe ↑' : 'View recipe →'}
        </button>
      )}
      {open && (
        <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/70">
          {loading && <div className="text-white/40">Loading recipe…</div>}
          {error && <div className="text-amber-300/80">{error}</div>}
          {recipe && (
            <div className="space-y-2">
              {recipe.name && <div className="font-semibold text-white/90">{recipe.name}</div>}
              {recipe.description && <p className="text-white/60">{recipe.description}</p>}
              {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Ingredients
                  </div>
                  <ul className="mt-1 list-inside list-disc text-white/70">
                    {recipe.ingredients.slice(0, 12).map((ing: any, i: number) => (
                      <li key={i}>{typeof ing === 'string' ? ing : ing.name || ing.ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* External "open on alchm.kitchen" link intentionally omitted:
                  the inline expand above already shows the full recipe via the
                  /api/recipes/[id] proxy, and alchm.kitchen's /recipes/[id] page
                  currently 500s. Re-add once that page is fixed. */}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AgentActivity({ agentName, balances, interactions, artifacts, actions }: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Token balances */}
      <section className="glass-card-premium rounded-3xl border-white/8 p-6 md:p-8">
        <SectionLabel>Alchemical balances</SectionLabel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {BALANCE_TILES.map(t => (
            <div
              key={t.key}
              className="glass-base rounded-2xl border border-white/8 p-4 text-center"
            >
              <div
                className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-lg ${t.grad}`}
              >
                {t.glyph}
              </div>
              <div className="text-2xl font-black tabular-nums text-white">
                {balances ? Math.round((balances[t.key] ?? 0) * 100) / 100 : 0}
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Creations by this agent — authored recipes ("Created") + featured catalog dishes + lab entries */}
      <section className="glass-card-premium rounded-3xl border-white/8 p-6 md:p-8">
        <SectionLabel>Creations by {agentName}</SectionLabel>
        {artifacts.length === 0 ? (
          <p className="text-sm text-white/40">
            No recipes or lab entries yet — they appear here as {agentName} acts on their transits.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {artifacts.map(a => (
              <RecipeCard key={a.id} artifact={a} agentName={agentName} />
            ))}
          </div>
        )}
      </section>

      {/* Recent discourses */}
      <section className="glass-card-premium rounded-3xl border-white/8 p-6 md:p-8">
        <SectionLabel>Recent discourses</SectionLabel>
        {interactions.length === 0 ? (
          <p className="text-sm text-white/40">No recorded conversations yet.</p>
        ) : (
          <div className="space-y-3">
            {interactions.map(i => (
              <div key={i.id} className="glass-base rounded-2xl border border-white/8 p-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/60">
                    {i.kind === 'agent_to_agent' ? 'with agent' : 'with user'}
                  </span>
                  <span className="font-medium text-white/80">{i.counterparty.name}</span>
                  <span className="text-white/30">· {fmtDate(i.lastTurnAt)}</span>
                </div>
                {i.topic && (
                  <div className="mt-1 text-sm font-semibold text-white/85">{i.topic}</div>
                )}
                {i.messagePreview && (
                  <p className="mt-1 text-sm text-white/55">{i.messagePreview}</p>
                )}
                {i.chatThread && (
                  <Link
                    href={i.chatThread}
                    className="mt-2 inline-block text-xs font-medium text-fuchsia-300 hover:text-fuchsia-200"
                  >
                    View discourse →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Action history */}
      <section className="glass-card-premium rounded-3xl border-white/8 p-6 md:p-8">
        <SectionLabel>Action history</SectionLabel>
        {actions.length === 0 ? (
          <p className="text-sm text-white/40">No actions recorded yet.</p>
        ) : (
          <div className="space-y-1.5 font-mono text-xs">
            {actions.map(a => (
              <div key={a.id} className="flex items-center gap-3 border-b border-white/5 py-1.5">
                <span className="text-white/30">{fmtDate(a.createdAt)}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/70">{a.type}</span>
                {a.links.recipe && (
                  <Link
                    href={a.links.recipe}
                    className="text-fuchsia-300/80 hover:text-fuchsia-200"
                  >
                    recipe
                  </Link>
                )}
                {a.links.chatThread && (
                  <Link href={a.links.chatThread} className="text-sky-300/80 hover:text-sky-200">
                    thread
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
