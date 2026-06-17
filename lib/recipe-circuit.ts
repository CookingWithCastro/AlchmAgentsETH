// Recipe-as-a-Circuit engine
// ---------------------------------------------------------------------------
// Treats a cooking reaction (a stage in a batch plan) as an electrical circuit element.
// This SURFACES AND COMPLETES the latent electromagnetic model already deployed in
// backend/utils.py:calculate_kinetics(), which maps:
//     charge Q          = Matter + Substance
//     potentialDiff V   = gregsEnergy / charge
//     currentFlow I     = reactivity × d(charge)/dt          (time-series form)
//     power P           = I × V
// The kinetics version needs a *previous frame* to get d(charge)/dt. A single cooking stage is
// static (no prior frame), so here we derive current from Ohm's law instead — consistent with the
// existing "current ∝ reactivity" relationship: conductance G = reactivity ⇒ R = 1/G ⇒ I = V/R.
// We then add the quantities the kinetics model never computed: resistance, capacitance,
// reactance, impedance, and a series-circuit aggregation for the whole plan.
//
// All math reuses the canonical, guarded formulas in lib/core-energy-rules.ts. This module is
// pure and runs both client-side (instant preview) and server-side (LLM grounding).

import {
  GregsEnergyCalculator,
  AdvancedConstantsCalculator,
  type AlchemicalProperties,
  type ElementalProperties,
} from './core-energy-rules'
import { lookupIngredient, toBaseVolume, type Unit } from './ingredient-catalog'

const EPS = 1e-9
// Open-circuit resistance sentinel (a large finite value — keeps results JSON-safe, unlike Infinity).
const OPEN_CIRCUIT_R = 1e9

function finite(x: number, fallback = 0): number {
  return Number.isFinite(x) ? x : fallback
}

export interface ReactionInput {
  alchemical: AlchemicalProperties
  elemental: ElementalProperties
}

export type CircuitRole = 'source' | 'resistor' | 'capacitor' | 'load'

export interface CircuitReading {
  // Thermodynamic substrate (reused from Greg's Energy system)
  heat: number
  entropy: number
  reactivity: number
  gregsEnergy: number
  kalchm: number
  monica: number
  // Circuit quantities
  charge: number // Q = matter + substance
  emf: number // ℰ = gregsEnergy (the energy source driving the reaction)
  voltage: number // V = gregsEnergy / Q
  conductance: number // G = reactivity
  resistance: number // R = 1 / reactivity (1/G)
  current: number // I = V / R = V × reactivity (Ohm's law)
  capacitance: number // C = Q / V
  inductance: number // L = max(1, matter + earth + substance/2) (the kinetics "inertia")
  reactance: number // X = entropy × reactivity (the dissipative term subtracted in gregsEnergy)
  impedance: number // Z = √(R² + X²)
  phaseDeg: number // φ = atan2(X, R)
  power: number // P = I × V (Joule's law)
  dissipationFactor: number // entropy (energy lost to disorder)
  role: CircuitRole
}

/** Classify a single reaction by its reactive vs resistive character (context-free). */
function classifyReactionRole(phaseDeg: number): CircuitRole {
  // φ ≥ 45° means reactance dominates resistance → energy-storing / reactive (capacitor-like).
  return phaseDeg >= 45 ? 'capacitor' : 'resistor'
}

/**
 * Compute the full circuit reading for one reaction from its alchemical + elemental profile.
 * Every division is guarded exactly as the Greg's Energy / kinetics code does.
 */
export function computeReactionCircuit(input: ReactionInput): CircuitReading {
  const { matter, substance } = input.alchemical
  const { earth } = input.elemental

  const thermo = GregsEnergyCalculator.analyzeThermodynamics(input.alchemical, input.elemental)
  const heat = finite(thermo.heat)
  const entropy = finite(thermo.entropy)
  const reactivity = finite(thermo.reactivity)
  const gregsEnergy = finite(thermo.energy)

  const constants = AdvancedConstantsCalculator.calculateAdvancedConstants(input.alchemical, thermo)
  const kalchm = finite(constants.kalchmConstant)
  // Monica is NaN when ln(kalchm) is undefined; fall back to 0 (neutral coupling) for the circuit.
  const monica = finite(constants.monicaConstant)

  const charge = finite(matter + substance)
  const emf = gregsEnergy
  const voltage = charge > EPS ? gregsEnergy / charge : 0

  const conductance = reactivity
  const resistance = reactivity > EPS ? 1 / reactivity : OPEN_CIRCUIT_R
  const current = resistance > EPS ? voltage / resistance : 0

  const capacitance = Math.abs(voltage) > EPS ? charge / voltage : 0
  const inductance = Math.max(1, matter + earth + substance / 2)
  const reactance = entropy * reactivity
  const impedance = Math.sqrt(resistance * resistance + reactance * reactance)
  const phaseDeg = (Math.atan2(reactance, resistance) * 180) / Math.PI
  const power = current * voltage
  const dissipationFactor = entropy

  return {
    heat,
    entropy,
    reactivity,
    gregsEnergy,
    kalchm,
    monica,
    charge,
    emf,
    voltage,
    conductance,
    resistance,
    current,
    capacitance,
    inductance,
    reactance,
    impedance,
    phaseDeg,
    power,
    dissipationFactor,
    role: classifyReactionRole(phaseDeg),
  }
}

export interface IngredientAmount {
  ingredient: string
  quantity: number
  unit: Unit
}

/**
 * Quantity-weighted aggregation of a stage's ingredients into a single reaction profile.
 * This is the volume-weighting the original engine never had: each ingredient's per-cup
 * alchemical + elemental vectors are scaled by how much is actually added, then summed.
 */
export function aggregateIngredientsToReaction(items: IngredientAmount[]): ReactionInput {
  const alchemical: AlchemicalProperties = { spirit: 0, essence: 0, matter: 0, substance: 0 }
  const elemental: ElementalProperties = { fire: 0, water: 0, air: 0, earth: 0 }

  for (const item of items ?? []) {
    const ing = lookupIngredient(item.ingredient)
    const w = toBaseVolume(item.quantity, item.unit)
    if (w <= 0) continue
    alchemical.spirit += ing.alchemical.spirit * w
    alchemical.essence += ing.alchemical.essence * w
    alchemical.matter += ing.alchemical.matter * w
    alchemical.substance += ing.alchemical.substance * w
    elemental.fire += ing.elemental.fire * w
    elemental.water += ing.elemental.water * w
    elemental.air += ing.elemental.air * w
    elemental.earth += ing.elemental.earth * w
  }

  return { alchemical, elemental }
}

export interface StageInput {
  name?: string
  ingredients: IngredientAmount[]
}

export interface StageCircuit extends CircuitReading {
  name: string
  reaction: ReactionInput
}

export interface SeriesCircuit {
  stageCount: number
  totalCharge: number
  totalVoltage: number
  totalResistance: number
  seriesCurrent: number // V_total / R_total — shared by all series elements
  totalPower: number // I_series × V_total
  totalReactance: number
  totalImpedance: number // √(R_total² + X_total²)
  phaseDeg: number
  equivalentCapacitance: number // series caps: 1 / Σ(1/Cᵢ)
  netKalchm: number // gain chain — product of per-stage kalchm
  netMonica: number // mean coupling factor
}

/**
 * Wire a batch plan's stages into a series circuit (current flows through the cook, stage to
 * stage). Returns per-stage readings plus the aggregate series circuit, and assigns the
 * plan-level roles: the highest-EMF stage is the source; the final stage is the load.
 */
export function planToCircuit(stages: StageInput[]): {
  perStage: StageCircuit[]
  series: SeriesCircuit
} {
  const list = stages ?? []
  const perStage: StageCircuit[] = list.map((stage, i) => {
    const reaction = aggregateIngredientsToReaction(stage.ingredients)
    const reading = computeReactionCircuit(reaction)
    return {
      ...reading,
      name: stage.name?.trim() || `Stage ${i + 1}`,
      reaction,
    }
  })

  // Plan-level role assignment: the highest-EMF stage drives the circuit (source); the heaviest
  // non-source stage (largest charge) is the mass sink the energy flows into (load). Remaining
  // stages keep their reactive/resistive character from computeReactionCircuit.
  if (perStage.length > 0) {
    let sourceIdx = 0
    for (let i = 1; i < perStage.length; i++) {
      if (Math.abs(perStage[i].emf) > Math.abs(perStage[sourceIdx].emf)) sourceIdx = i
    }
    perStage[sourceIdx].role = 'source'

    let loadIdx = -1
    for (let i = 0; i < perStage.length; i++) {
      if (i === sourceIdx) continue
      if (loadIdx === -1 || perStage[i].charge > perStage[loadIdx].charge) loadIdx = i
    }
    if (loadIdx !== -1) perStage[loadIdx].role = 'load'
  }

  const totalCharge = perStage.reduce((s, r) => s + r.charge, 0)
  const totalVoltage = perStage.reduce((s, r) => s + r.voltage, 0)
  const totalResistance = perStage.reduce((s, r) => s + r.resistance, 0)
  const totalReactance = perStage.reduce((s, r) => s + r.reactance, 0)
  const seriesCurrent = totalResistance > EPS ? totalVoltage / totalResistance : 0
  const totalPower = seriesCurrent * totalVoltage
  const totalImpedance = Math.sqrt(
    totalResistance * totalResistance + totalReactance * totalReactance
  )
  const phaseDeg = (Math.atan2(totalReactance, totalResistance) * 180) / Math.PI

  const inverseCapSum = perStage.reduce(
    (s, r) => s + (Math.abs(r.capacitance) > EPS ? 1 / r.capacitance : 0),
    0
  )
  const equivalentCapacitance = inverseCapSum > EPS ? 1 / inverseCapSum : 0

  const netKalchm = finite(
    perStage.reduce((p, r) => p * (Number.isFinite(r.kalchm) && r.kalchm !== 0 ? r.kalchm : 1), 1)
  )
  const netMonica = perStage.length
    ? perStage.reduce((s, r) => s + r.monica, 0) / perStage.length
    : 0

  return {
    perStage,
    series: {
      stageCount: perStage.length,
      totalCharge: finite(totalCharge),
      totalVoltage: finite(totalVoltage),
      totalResistance: finite(totalResistance),
      seriesCurrent: finite(seriesCurrent),
      totalPower: finite(totalPower),
      totalReactance: finite(totalReactance),
      totalImpedance: finite(totalImpedance),
      phaseDeg: finite(phaseDeg),
      equivalentCapacitance: finite(equivalentCapacitance),
      netKalchm,
      netMonica: finite(netMonica),
    },
  }
}

/** Positional helper for tests and demos (no object construction needed). */
export function getDeterministicCircuitReading(
  spirit: number,
  essence: number,
  matter: number,
  substance: number,
  fire: number,
  water: number,
  air: number,
  earth: number
): CircuitReading {
  return computeReactionCircuit({
    alchemical: { spirit, essence, matter, substance },
    elemental: { fire, water, air, earth },
  })
}
