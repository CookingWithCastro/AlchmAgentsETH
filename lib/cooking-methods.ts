// Cooking Method Registry
// The canonical, typed home for cooking methods. Previously methods lived as loose
// strings scattered across lib/planets/*.ts and lib/services/enhanced-recommendation-service.ts.
// Each method carries an elemental affinity (reused by the recipe-as-a-circuit engine) plus
// heat-transfer + planetary metadata. Elemental/thermo types are reused from core-energy-rules.

import type { ElementalProperties, ThermodynamicMetrics } from './core-energy-rules'

export type HeatTransfer = 'conduction' | 'convection' | 'radiation' | 'mixed'
export type EnergyType = 'Heating' | 'Cooling' | 'Neutral' | 'Drying' | 'Moistening'

export interface CookingMethod {
  id: string
  name: string
  /** Elemental affinity of the method itself (0-1 per element). */
  elementalAffinity: ElementalProperties
  /** Optional bias the method imparts to a dish's thermodynamics (0-1 hints). */
  thermodynamics?: Partial<ThermodynamicMetrics>
  heatTransfer: HeatTransfer
  energyType: EnergyType
  /** Traditional planetary rulers — used for affinity scoring elsewhere in the app. */
  planetaryRulers: string[]
  description: string
}

export const COOKING_METHODS: Record<string, CookingMethod> = {
  'tilt-skillet': {
    id: 'tilt-skillet',
    name: 'Tilt Skillet',
    // Dual-phase: conduction sear (Fire) + convection/liquid braise (Water), with earthy bulk
    // from the volume of batch ingredients and a little air from the open pan.
    elementalAffinity: { fire: 0.7, water: 0.5, air: 0.15, earth: 0.3 },
    thermodynamics: { heat: 0.7, reactivity: 0.6 },
    heatTransfer: 'mixed',
    energyType: 'Heating',
    planetaryRulers: ['Mars', 'Saturn'],
    description:
      'A large flat braising pan that sears at high heat and then braises in liquid — the ideal vessel for large-batch cooking. High-heat conduction sear (Fire) followed by convection/liquid braise (Water), at scale (Earth). Ruled by Mars (searing drive) with a Saturn nod (slow, structured braising).',
  },
  grilling: {
    id: 'grilling',
    name: 'Grilling',
    elementalAffinity: { fire: 0.9, water: 0.05, air: 0.3, earth: 0.1 },
    thermodynamics: { heat: 0.9, reactivity: 0.5 },
    heatTransfer: 'radiation',
    energyType: 'Heating',
    planetaryRulers: ['Mars', 'Sun'],
    description: 'Direct radiant high heat. Maximally Fire-aligned; drying and intense.',
  },
  roasting: {
    id: 'roasting',
    name: 'Roasting',
    elementalAffinity: { fire: 0.7, water: 0.1, air: 0.3, earth: 0.3 },
    thermodynamics: { heat: 0.7 },
    heatTransfer: 'convection',
    energyType: 'Heating',
    planetaryRulers: ['Sun', 'Mars'],
    description: 'Dry convection heat in an enclosed oven. Caramelizing, concentrating.',
  },
  sauteing: {
    id: 'sauteing',
    name: 'Sautéing',
    elementalAffinity: { fire: 0.7, water: 0.2, air: 0.3, earth: 0.1 },
    thermodynamics: { heat: 0.6, reactivity: 0.6 },
    heatTransfer: 'conduction',
    energyType: 'Heating',
    planetaryRulers: ['Mars', 'Mercury'],
    description: 'Quick, high-heat conduction in a little fat. Lively and reactive.',
  },
  braising: {
    id: 'braising',
    name: 'Braising',
    elementalAffinity: { fire: 0.3, water: 0.8, air: 0.1, earth: 0.4 },
    thermodynamics: { heat: 0.4, entropy: 0.3 },
    heatTransfer: 'convection',
    energyType: 'Moistening',
    planetaryRulers: ['Saturn', 'Moon'],
    description: 'Low, slow, moist heat in liquid. Tenderizing and structural (Water + Earth).',
  },
  steaming: {
    id: 'steaming',
    name: 'Steaming',
    elementalAffinity: { fire: 0.2, water: 0.9, air: 0.4, earth: 0.1 },
    thermodynamics: { heat: 0.3 },
    heatTransfer: 'convection',
    energyType: 'Moistening',
    planetaryRulers: ['Moon', 'Neptune'],
    description: 'Gentle moist vapor heat. Preserving, cooling, Water-dominant.',
  },
}

export function getCookingMethod(id: string): CookingMethod | undefined {
  return COOKING_METHODS[id] ?? COOKING_METHODS[id.trim().toLowerCase().replace(/\s+/g, '-')]
}

export function listCookingMethods(): CookingMethod[] {
  return Object.values(COOKING_METHODS)
}

export const TILT_SKILLET = COOKING_METHODS['tilt-skillet']
