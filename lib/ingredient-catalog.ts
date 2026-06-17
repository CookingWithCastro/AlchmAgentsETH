// Quantity-aware ingredient catalog
// The engine elsewhere only ever summed elemental vectors *unweighted* — there was no
// quantity/volume model anywhere in the repo. This catalog makes volume first-class so the
// recipe-as-a-circuit engine can weight each ingredient by how much goes into the skillet.
//
// Each ingredient carries per-base-unit (≈ one cup) alchemical (Spirit/Essence/Matter/Substance)
// and elemental (Fire/Water/Air/Earth) contributions. Values are 0-1-ish affinities aligned with
// the app's existing FoodProfile semantics (see lib/food-recommendation-rules.ts), which is folded
// in as additional entries. The WTEN MCP `alchemize_ingredients` tool can enrich the LLM grounding
// at the backend layer (see backend/main.py /api/tilt-skillet-plan); this local catalog stays
// authoritative for the deterministic, quantity-weighted circuit math.

import type { AlchemicalProperties, ElementalProperties } from './core-energy-rules'
import { FOOD_PROFILES, type FoodProfile } from './food-recommendation-rules'

export type Unit = 'cup' | 'tbsp' | 'tsp' | 'ml' | 'l' | 'g' | 'kg' | 'piece'

export const UNITS: Unit[] = ['cup', 'tbsp', 'tsp', 'ml', 'l', 'g', 'kg', 'piece']

// Volume (ml) of one of each unit. Mass units are approximated to volume at ~1 g/ml (water
// density) — a reasonable default for the relative weighting the circuit math needs. 'piece' is
// a nominal single-item portion.
const UNIT_TO_ML: Record<Unit, number> = {
  tsp: 4.929,
  tbsp: 14.787,
  cup: 236.588,
  ml: 1,
  l: 1000,
  g: 1,
  kg: 1000,
  piece: 100,
}

/**
 * Normalize a quantity+unit to the catalog's base unit (cups), so an ingredient's per-cup
 * vectors can be scaled by how much is actually used. 3 cups → 3.0; 2 tbsp → ~0.125.
 */
export function toBaseVolume(quantity: number, unit: Unit): number {
  const ml = UNIT_TO_ML[unit] ?? UNIT_TO_ML.cup
  const q = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
  return (q * ml) / UNIT_TO_ML.cup
}

export interface CatalogIngredient {
  id: string
  name: string
  aliases?: string[]
  /** Per-base-unit (≈ one cup) alchemical contribution. */
  alchemical: AlchemicalProperties
  /** Per-base-unit (≈ one cup) elemental contribution. */
  elemental: ElementalProperties
  category?: string
}

const A = (
  spirit: number,
  essence: number,
  matter: number,
  substance: number
): AlchemicalProperties => ({ spirit, essence, matter, substance })

const E = (fire: number, water: number, air: number, earth: number): ElementalProperties => ({
  fire,
  water,
  air,
  earth,
})

// Curated common skillet ingredients (take priority over FoodProfile-derived entries).
const SKILLET_INGREDIENTS: CatalogIngredient[] = [
  {
    id: 'olive-oil',
    name: 'Olive oil',
    aliases: ['oil', 'cooking oil', 'fat'],
    alchemical: A(0.5, 0.2, 0.2, 0.4),
    elemental: E(0.9, 0.1, 0.1, 0.1),
    category: 'Fat',
  },
  {
    id: 'butter',
    name: 'Butter',
    aliases: ['ghee'],
    alchemical: A(0.3, 0.2, 0.3, 0.5),
    elemental: E(0.6, 0.2, 0.1, 0.2),
    category: 'Fat',
  },
  {
    id: 'onion',
    name: 'Onion',
    aliases: ['onions', 'shallot'],
    alchemical: A(0.2, 0.5, 0.3, 0.2),
    elemental: E(0.4, 0.4, 0.1, 0.3),
    category: 'Aromatic',
  },
  {
    id: 'garlic',
    name: 'Garlic',
    aliases: ['garlic clove', 'cloves'],
    alchemical: A(0.6, 0.4, 0.1, 0.1),
    elemental: E(0.7, 0.1, 0.2, 0.1),
    category: 'Aromatic',
  },
  {
    id: 'ginger',
    name: 'Ginger',
    aliases: ['fresh ginger'],
    alchemical: A(0.6, 0.3, 0.1, 0.1),
    elemental: E(0.7, 0.1, 0.3, 0.1),
    category: 'Aromatic',
  },
  {
    id: 'chili',
    name: 'Chili / cayenne',
    aliases: ['chili', 'cayenne', 'hot pepper', 'chilli', 'pepper flakes'],
    alchemical: A(0.8, 0.2, 0.1, 0.1),
    elemental: E(1.0, 0.05, 0.3, 0.05),
    category: 'Spice',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    aliases: ['tomatoes', 'crushed tomato', 'tomato sauce'],
    alchemical: A(0.2, 0.6, 0.2, 0.2),
    elemental: E(0.2, 0.7, 0.1, 0.2),
    category: 'Vegetable',
  },
  {
    id: 'bell-pepper',
    name: 'Bell pepper',
    aliases: ['peppers', 'capsicum'],
    alchemical: A(0.3, 0.5, 0.2, 0.1),
    elemental: E(0.3, 0.4, 0.2, 0.2),
    category: 'Vegetable',
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    aliases: ['mushrooms'],
    alchemical: A(0.2, 0.3, 0.5, 0.4),
    elemental: E(0.1, 0.4, 0.1, 0.6),
    category: 'Vegetable',
  },
  {
    id: 'carrot',
    name: 'Carrot',
    aliases: ['carrots'],
    alchemical: A(0.2, 0.3, 0.5, 0.4),
    elemental: E(0.2, 0.2, 0.1, 0.7),
    category: 'Vegetable',
  },
  {
    id: 'potato',
    name: 'Potato',
    aliases: ['potatoes'],
    alchemical: A(0.1, 0.2, 0.8, 0.5),
    elemental: E(0.1, 0.2, 0.05, 0.9),
    category: 'Starch',
  },
  {
    id: 'spinach',
    name: 'Leafy greens',
    aliases: ['spinach', 'kale', 'greens', 'chard'],
    alchemical: A(0.3, 0.7, 0.2, 0.1),
    elemental: E(0.1, 0.6, 0.8, 0.2),
    category: 'Vegetable',
  },
  {
    id: 'rice',
    name: 'Rice',
    aliases: ['white rice', 'brown rice', 'grain'],
    alchemical: A(0.1, 0.2, 0.8, 0.6),
    elemental: E(0.1, 0.3, 0.1, 0.7),
    category: 'Grain',
  },
  {
    id: 'beans',
    name: 'Beans / legumes',
    aliases: ['beans', 'lentils', 'chickpeas', 'legumes'],
    alchemical: A(0.2, 0.3, 0.8, 0.6),
    elemental: E(0.1, 0.3, 0.1, 0.8),
    category: 'Protein',
  },
  {
    id: 'chicken',
    name: 'Chicken',
    aliases: ['poultry', 'chicken thigh', 'chicken breast'],
    alchemical: A(0.3, 0.4, 0.7, 0.5),
    elemental: E(0.2, 0.3, 0.1, 0.5),
    category: 'Protein',
  },
  {
    id: 'beef',
    name: 'Beef',
    aliases: ['steak', 'red meat', 'ground beef'],
    alchemical: A(0.3, 0.3, 0.9, 0.7),
    elemental: E(0.3, 0.2, 0.05, 0.6),
    category: 'Protein',
  },
  {
    id: 'fish',
    name: 'Fish',
    aliases: ['salmon', 'white fish', 'seafood'],
    alchemical: A(0.4, 0.5, 0.5, 0.4),
    elemental: E(0.1, 0.6, 0.2, 0.3),
    category: 'Protein',
  },
  {
    id: 'tofu',
    name: 'Tofu',
    aliases: ['bean curd'],
    alchemical: A(0.2, 0.3, 0.6, 0.6),
    elemental: E(0.1, 0.5, 0.1, 0.5),
    category: 'Protein',
  },
  {
    id: 'stock',
    name: 'Stock / broth',
    aliases: ['broth', 'stock', 'bouillon'],
    alchemical: A(0.2, 0.7, 0.2, 0.2),
    elemental: E(0.1, 0.9, 0.1, 0.1),
    category: 'Liquid',
  },
  {
    id: 'water',
    name: 'Water',
    aliases: ['water'],
    alchemical: A(0.0, 0.4, 0.1, 0.1),
    elemental: E(0.0, 1.0, 0.0, 0.0),
    category: 'Liquid',
  },
  {
    id: 'wine',
    name: 'White wine',
    aliases: ['wine', 'red wine', 'cooking wine'],
    alchemical: A(0.6, 0.4, 0.1, 0.2),
    elemental: E(0.3, 0.6, 0.3, 0.1),
    category: 'Liquid',
  },
  {
    id: 'coconut-milk',
    name: 'Coconut milk',
    aliases: ['coconut cream'],
    alchemical: A(0.2, 0.4, 0.4, 0.5),
    elemental: E(0.1, 0.7, 0.1, 0.3),
    category: 'Liquid',
  },
  {
    id: 'cream',
    name: 'Cream',
    aliases: ['heavy cream', 'milk', 'dairy'],
    alchemical: A(0.2, 0.3, 0.4, 0.6),
    elemental: E(0.1, 0.6, 0.1, 0.3),
    category: 'Dairy',
  },
  {
    id: 'soy-sauce',
    name: 'Soy sauce',
    aliases: ['tamari', 'soy'],
    alchemical: A(0.3, 0.6, 0.3, 0.5),
    elemental: E(0.2, 0.5, 0.1, 0.4),
    category: 'Seasoning',
  },
  {
    id: 'lemon',
    name: 'Lemon / citrus juice',
    aliases: ['lemon', 'lime', 'citrus', 'lemon juice'],
    alchemical: A(0.7, 0.4, 0.1, 0.1),
    elemental: E(0.3, 0.4, 0.7, 0.05),
    category: 'Acid',
  },
  {
    id: 'herbs',
    name: 'Fresh herbs',
    aliases: ['herbs', 'basil', 'thyme', 'parsley', 'cilantro'],
    alchemical: A(0.5, 0.4, 0.1, 0.1),
    elemental: E(0.2, 0.2, 0.8, 0.1),
    category: 'Aromatic',
  },
  {
    id: 'salt',
    name: 'Salt',
    aliases: ['sea salt', 'kosher salt'],
    alchemical: A(0.1, 0.2, 0.3, 0.9),
    elemental: E(0.1, 0.1, 0.05, 0.6),
    category: 'Seasoning',
  },
]

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fromFoodProfile(key: string, p: FoodProfile): CatalogIngredient {
  return {
    id: slug(key),
    name: p.name,
    aliases: [key.toLowerCase()],
    elemental: {
      fire: p.elementalAffinity.Fire ?? 0,
      water: p.elementalAffinity.Water ?? 0,
      air: p.elementalAffinity.Air ?? 0,
      earth: p.elementalAffinity.Earth ?? 0,
    },
    alchemical: {
      spirit: p.alchemicalEffect.Spirit ?? 0,
      essence: p.alchemicalEffect.Essence ?? 0,
      matter: p.alchemicalEffect.Matter ?? 0,
      substance: p.alchemicalEffect.Substance ?? 0,
    },
    category: p.category,
  }
}

// Curated ingredients first; FoodProfile-derived entries fill in anything not already covered.
export const CATALOG: CatalogIngredient[] = (() => {
  const byId = new Map<string, CatalogIngredient>()
  for (const ing of SKILLET_INGREDIENTS) byId.set(ing.id, ing)
  for (const [key, profile] of Object.entries(FOOD_PROFILES)) {
    const derived = fromFoodProfile(key, profile)
    if (!byId.has(derived.id)) byId.set(derived.id, derived)
  }
  return Array.from(byId.values())
})()

/** A neutral, mildly-everything ingredient used when a name isn't recognized. */
export function genericIngredient(name: string): CatalogIngredient {
  return {
    id: slug(name) || 'unknown',
    name: name || 'Unknown ingredient',
    alchemical: A(0.2, 0.2, 0.3, 0.3),
    elemental: E(0.25, 0.25, 0.25, 0.25),
    category: 'Other',
  }
}

/**
 * Resolve a free-text ingredient name to a catalog entry, by exact id/name/alias, then substring,
 * then a neutral generic fallback so unknown names never break the math.
 */
export function lookupIngredient(name: string): CatalogIngredient {
  const norm = (name ?? '').trim().toLowerCase()
  if (!norm) return genericIngredient(name)

  for (const ing of CATALOG) {
    if (ing.id === norm || ing.name.toLowerCase() === norm) return ing
    if (ing.aliases?.some(a => a.toLowerCase() === norm)) return ing
  }
  for (const ing of CATALOG) {
    if (
      norm.includes(ing.id) ||
      ing.name.toLowerCase().includes(norm) ||
      ing.aliases?.some(a => norm.includes(a.toLowerCase()) || a.toLowerCase().includes(norm))
    ) {
      return ing
    }
  }
  return genericIngredient(name)
}
