// Shared request/response types for the Tilt Skillet batch planner.
// Mirrors backend/schemas.py (TiltSkilletRequest / TiltSkilletPlanResponse) and is reused by the
// Next.js proxy route (app/api/tilt-skillet/route.ts), the backend client (lib/backend.ts), and
// the client UI.

import type { Unit } from './ingredient-catalog'
import type { StageCircuit, SeriesCircuit } from './recipe-circuit'

export type DominantElement = 'Air' | 'Fire' | 'Water' | 'Earth'
export type CircuitRole = 'source' | 'resistor' | 'capacitor' | 'load'

export interface TiltSkilletIngredientInput {
  ingredient: string
  quantity: number
  unit: Unit
}

export interface TiltSkilletStageInput {
  name?: string
  ingredients: TiltSkilletIngredientInput[]
}

/** Body the client POSTs to /api/tilt-skillet. */
export interface TiltSkilletPlanRequest {
  prompt: string
  batchServings?: number
  cuisine?: string
  dietPreference?: string
  dietary?: string[]
  disallowedIngredients?: string[]
  dominantElement?: DominantElement
  stages: TiltSkilletStageInput[]
  modelTier?: string
}

/** Body the Next.js route forwards to the FastAPI backend (adds computed circuit grounding). */
export interface TiltSkilletBackendRequest extends Omit<TiltSkilletPlanRequest, 'stages'> {
  stages: { name?: string; ingredients: { name: string; quantity: number; unit: string }[] }[]
  circuitContext: { perStage: StageCircuit[]; series: SeriesCircuit }
  userId?: string
}

export interface PlanStageIngredient {
  ingredient: string
  quantity: string
  unit: string
}

export interface PlanStage {
  step_number: number
  name: string
  instruction: string
  add_to_skillet: PlanStageIngredient[]
  skillet_position: string
  tilt_angle_degrees: number
  temperature_f: number
  time_minutes: number
  technique: string
  circuit_role: CircuitRole
  reaction_note: string
  sensory_cues: string[]
}

export interface PlanCircuitSummary {
  total_voltage: number
  total_current: number
  total_resistance: number
  total_power: number
  impedance: number
  kalchm: number
  monica: number
  narrative: string
}

export interface TiltSkilletPlan {
  id: string
  title: string
  summary: string
  cuisine: string
  batch_yield: string
  total_time: number
  equipment_notes: string
  stages: PlanStage[]
  elementalBalance: { fire: number; earth: number; water: number; air: number }
  circuit_summary: PlanCircuitSummary
  alignment_notes: string[]
  finishing_and_serving: {
    garnish_and_plating: string
    doneness_cues: string
    serving_suggestions: string
  }
  leftovers_and_storage: {
    can_store: boolean
    storage_instructions: string
    storage_lifespan_days: number
  }
}

/** What the Next.js route returns to the client on success. */
export interface TiltSkilletApiResponse {
  plan: TiltSkilletPlan
  circuit: { perStage: StageCircuit[]; series: SeriesCircuit }
  tier: string
}
