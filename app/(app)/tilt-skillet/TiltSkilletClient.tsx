'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2, Zap, Lock, FlaskConical, Sparkles, Flame } from 'lucide-react'
import { planToCircuit } from '@/lib/recipe-circuit'
import { UNITS, type Unit } from '@/lib/ingredient-catalog'
import type { PaTier } from '@/lib/premium/tiers'
import type {
  TiltSkilletPlan,
  TiltSkilletPlanRequest,
  TiltSkilletApiResponse,
  CircuitRole,
} from '@/lib/tilt-skillet-types'
import { CircuitSchematic } from '@/components/tilt-skillet/CircuitSchematic'

interface IngredientRow {
  ingredient: string
  quantity: number
  unit: Unit
}
interface StageRow {
  name: string
  ingredients: IngredientRow[]
}

const ROLE_BADGE: Record<CircuitRole, string> = {
  source: 'bg-amber-100 text-amber-800 border-amber-300',
  resistor: 'bg-violet-100 text-violet-800 border-violet-300',
  capacitor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  load: 'bg-rose-100 text-rose-800 border-rose-300',
}

const DEFAULT_STAGES: StageRow[] = [
  {
    name: 'Sear the base',
    ingredients: [
      { ingredient: 'olive oil', quantity: 0.25, unit: 'cup' },
      { ingredient: 'beef', quantity: 4, unit: 'cup' },
      { ingredient: 'onion', quantity: 2, unit: 'cup' },
      { ingredient: 'garlic', quantity: 0.25, unit: 'cup' },
    ],
  },
  {
    name: 'Braise the bulk',
    ingredients: [
      { ingredient: 'stock', quantity: 6, unit: 'cup' },
      { ingredient: 'tomato', quantity: 3, unit: 'cup' },
      { ingredient: 'carrot', quantity: 2, unit: 'cup' },
    ],
  },
]

function fmt(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const a = Math.abs(x)
  if (a !== 0 && (a >= 100000 || a < 0.001)) return x.toExponential(2)
  if (a >= 100) return x.toFixed(1)
  return x.toFixed(3)
}

export default function TiltSkilletClient({
  isPremium,
  tier,
}: {
  isPremium: boolean
  tier: PaTier
}) {
  const [prompt, setPrompt] = useState(
    'A hearty large-batch braise for the week ahead — deeply savory, freezer-friendly.'
  )
  const [batchServings, setBatchServings] = useState(16)
  const [cuisine, setCuisine] = useState('')
  const [dietPreference, setDietPreference] = useState('omnivore')
  const [stages, setStages] = useState<StageRow[]>(DEFAULT_STAGES)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [plan, setPlan] = useState<TiltSkilletPlan | null>(null)

  // Deterministic, instant circuit preview (free for everyone, no LLM).
  const circuit = useMemo(() => planToCircuit(stages), [stages])

  // --- stage/ingredient editing ---
  const updateStage = (si: number, patch: Partial<StageRow>) =>
    setStages(prev => prev.map((s, i) => (i === si ? { ...s, ...patch } : s)))

  const updateIngredient = (si: number, ii: number, patch: Partial<IngredientRow>) =>
    setStages(prev =>
      prev.map((s, i) =>
        i === si
          ? { ...s, ingredients: s.ingredients.map((g, j) => (j === ii ? { ...g, ...patch } : g)) }
          : s
      )
    )

  const addIngredient = (si: number) =>
    updateStage(si, {
      ingredients: [...stages[si].ingredients, { ingredient: '', quantity: 1, unit: 'cup' }],
    })

  const removeIngredient = (si: number, ii: number) =>
    updateStage(si, { ingredients: stages[si].ingredients.filter((_, j) => j !== ii) })

  const addStage = () =>
    setStages(prev => [
      ...prev,
      {
        name: `Stage ${prev.length + 1}`,
        ingredients: [{ ingredient: '', quantity: 1, unit: 'cup' }],
      },
    ])

  const removeStage = (si: number) => setStages(prev => prev.filter((_, i) => i !== si))

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setLocked(false)
    setPlan(null)
    try {
      const body: TiltSkilletPlanRequest = {
        prompt,
        batchServings,
        cuisine: cuisine || undefined,
        dietPreference: dietPreference || undefined,
        stages: stages.map(s => ({
          name: s.name,
          ingredients: s.ingredients.filter(g => g.ingredient.trim()),
        })),
        modelTier: 'primary',
      }
      const res = await fetch('/api/tilt-skillet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.status === 402 || data?.locked) {
        setLocked(true)
        return
      }
      if (!res.ok) {
        setError(data?.error || 'Failed to generate the batch plan.')
        return
      }
      setPlan((data as TiltSkilletApiResponse).plan)
    } catch {
      setError('Failed to connect to the planner. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalIngredients = stages.reduce(
    (n, s) => n + s.ingredients.filter(g => g.ingredient.trim()).length,
    0
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/20 via-background to-indigo-50/20 dark:from-orange-950/10 dark:via-background dark:to-indigo-950/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 bg-gradient-to-r from-orange-600 to-violet-600 bg-clip-text text-transparent">
              <Flame className="w-7 h-7 text-orange-500" />
              Tilt Skillet
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Plan large-batch cooking as an electrical circuit. Each stage is a reaction with its
              own charge, voltage, current, resistance and power — wired in series from the searing
              source to the braising load.
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            {isPremium ? (
              <>
                <Sparkles className="w-3 h-3 text-amber-500" /> Premium · {tier}
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" /> Free · circuit preview
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="container py-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: builder */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch setup</CardTitle>
              <CardDescription>Volumes are best for big batches — plan by the cup.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">What are you making?</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    min={1}
                    value={batchServings}
                    onChange={e => setBatchServings(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input
                    id="cuisine"
                    value={cuisine}
                    onChange={e => setCuisine(e.target.value)}
                    placeholder="e.g. French"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diet">Diet</Label>
                  <Input
                    id="diet"
                    value={dietPreference}
                    onChange={e => setDietPreference(e.target.value)}
                    placeholder="omnivore"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stages */}
          {stages.map((stage, si) => (
            <Card key={si}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={stage.name}
                    onChange={e => updateStage(si, { name: e.target.value })}
                    className="font-semibold"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStage(si)}
                    disabled={stages.length <= 1}
                    aria-label="Remove stage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {stage.ingredients.map((g, ii) => (
                  <div key={ii} className="flex items-center gap-2">
                    <Input
                      value={g.ingredient}
                      onChange={e => updateIngredient(si, ii, { ingredient: e.target.value })}
                      placeholder="ingredient"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.25"
                      value={g.quantity}
                      onChange={e =>
                        updateIngredient(si, ii, { quantity: Number(e.target.value) || 0 })
                      }
                      className="w-20"
                    />
                    <select
                      value={g.unit}
                      onChange={e => updateIngredient(si, ii, { unit: e.target.value as Unit })}
                      className="p-2 border rounded text-sm bg-background"
                      aria-label="unit"
                    >
                      {UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(si, ii)}
                      aria-label="Remove ingredient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addIngredient(si)}>
                  <Plus className="w-4 h-4 mr-1" /> Add ingredient
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addStage} className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Add stage
          </Button>
        </div>

        {/* RIGHT: circuit + plan */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Live circuit
              </CardTitle>
              <CardDescription>
                {stages.length} stage{stages.length === 1 ? '' : 's'} · {totalIngredients}{' '}
                ingredients · recomputed instantly as you edit volumes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CircuitSchematic perStage={circuit.perStage} series={circuit.series} />

              {/* per-stage readouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {circuit.perStage.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className={ROLE_BADGE[s.role]}>
                        {s.role}
                      </Badge>
                      <span className="truncate font-medium">{s.name}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      P {fmt(s.power)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generate (premium) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-violet-500" /> Batch plan
                <Badge variant="secondary" className="ml-1">
                  Premium
                </Badge>
              </CardTitle>
              <CardDescription>
                The circuit grounds a large-language model that writes the full staged tilt-skillet
                plan — what goes in, by volume, and when.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isPremium || locked ? (
                <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                  <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Large-batch plan generation is a premium feature. The circuit preview above is
                    free — upgrade to generate the full cooking plan.
                  </p>
                  <Button asChild>
                    <Link href="/upgrade">Upgrade</Link>
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Designing the circuit…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Generate batch plan
                    </>
                  )}
                </Button>
              )}

              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded p-2">
                  {error}
                </p>
              )}

              {plan && <PlanView plan={plan} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PlanView({ plan }: { plan: TiltSkilletPlan }) {
  const cs = plan.circuit_summary
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">{plan.title}</h3>
        <p className="text-sm text-muted-foreground">{plan.summary}</p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          <Badge variant="outline">{plan.cuisine}</Badge>
          <Badge variant="outline">{plan.batch_yield}</Badge>
          <Badge variant="outline">{plan.total_time} min</Badge>
        </div>
      </div>

      <div className="rounded-lg bg-gradient-to-r from-violet-50 to-amber-50 dark:from-violet-950/30 dark:to-amber-950/20 p-3">
        <p className="text-sm">{cs.narrative}</p>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <span>V {fmt(cs.total_voltage)}</span>
          <span>I {fmt(cs.total_current)}</span>
          <span>R {fmt(cs.total_resistance)}</span>
          <span>P {fmt(cs.total_power)}</span>
          <span>Z {fmt(cs.impedance)}</span>
          <span>Kalchm {fmt(cs.kalchm)}</span>
          <span>Monica {fmt(cs.monica)}</span>
        </div>
      </div>

      <Separator />

      <ol className="space-y-3">
        {plan.stages.map(stage => (
          <li key={stage.step_number} className="rounded-lg border p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                {stage.step_number}. {stage.name}
              </span>
              <Badge variant="outline" className={ROLE_BADGE[stage.circuit_role]}>
                {stage.circuit_role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {stage.temperature_f}°F · {stage.time_minutes} min · tilt {stage.tilt_angle_degrees}
                °
              </span>
            </div>
            {stage.add_to_skillet.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add:{' '}
                {stage.add_to_skillet
                  .map(g => `${g.quantity} ${g.unit} ${g.ingredient}`)
                  .join(', ')}
              </p>
            )}
            <p className="text-sm mt-1">{stage.instruction}</p>
            <p className="text-xs italic text-violet-700 dark:text-violet-300 mt-1">
              ⚡ {stage.reaction_note}
            </p>
          </li>
        ))}
      </ol>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Finishing:</strong> {plan.finishing_and_serving.serving_suggestions}
        </p>
        <p>
          <strong>Storage:</strong> {plan.leftovers_and_storage.storage_instructions} (
          {plan.leftovers_and_storage.storage_lifespan_days} days)
        </p>
      </div>
    </div>
  )
}
