/**
 * Token-economy shop catalog.
 *
 * Three sections wire the ESMS economy to spendable goods:
 *  - apothecary  digital alchemical items / agent boosts (AlchmAgentsETH-native
 *                entitlements, settled by an on-chain ESMS burn)
 *  - recipe      premium cosmic recipes (same on-chain ESMS settlement)
 *  - food        real food orders that bridge to the alchm.kitchen restaurant
 *                payment route (ESMS off-chain ledger / USDC / Card)
 *
 * Digital items (apothecary, recipe) are priced in whole ESMS units split across
 * the four axes; the buyer burns that basket on-chain via EsmsToken.redeem(For).
 * Food items carry a USD price and hand off to the kitchen, which owns restaurant
 * settlement and payout.
 *
 * Icons are Material Symbols names that the app already preloads (see
 * app/layout.tsx) — do not introduce un-loaded glyphs.
 */

import type { EsmsCost } from './pricing'

export type ShopItemKind = 'apothecary' | 'recipe' | 'food'
export type ElementKey = 'spirit' | 'essence' | 'matter' | 'substance'

export interface ShopItem {
  /** Stable slug — also the on-chain order seed and entitlement key. */
  id: string
  kind: ShopItemKind
  title: string
  blurb: string
  /** Material Symbols Outlined icon (must be preloaded in app/layout.tsx). */
  icon: string
  /** Dominant ESMS axis, used for accent theming. */
  accent: ElementKey
  /** Whole-ESMS basket the buyer burns on-chain (digital items only). */
  esms: EsmsCost
  /** USD reference / fiat price in cents (drives the USDC & Card rails). */
  usdCents: number
  /** Consumable (repeatable) vs one-time unlock. Unlocks show an "Owned" state. */
  repeatable: boolean
  /** Food only: kitchen path to hand off to (joined onto the kitchen base URL). */
  kitchenPath?: string
  /** Food only: human label for the partner/cuisine. */
  partner?: string
}

const basket = (spirit: number, essence: number, matter: number, substance: number): EsmsCost => ({
  spirit,
  essence,
  matter,
  substance,
})

export const SHOP_CATALOG: ShopItem[] = [
  // ── Apothecary — digital alchemical items & agent boosts ──────────────────
  {
    id: 'elixir-mercury-retrograde',
    kind: 'apothecary',
    title: 'Mercury Retrograde Elixir',
    blurb:
      'A stabilizing tincture — re-rolls one agent action that fizzled during a retrograde window.',
    icon: 'science',
    accent: 'essence',
    esms: basket(4, 8, 2, 2),
    usdCents: 320,
    repeatable: true,
  },
  {
    id: 'boost-solar-ascendant',
    kind: 'apothecary',
    title: 'Solar Ascendant Boost',
    blurb: '+50% yield on your next daily ESMS claim. Burns brightest at your rising sign.',
    icon: 'flare',
    accent: 'spirit',
    esms: basket(10, 3, 2, 2),
    usdCents: 340,
    repeatable: true,
  },
  {
    id: 'unlock-philosophers-stone',
    kind: 'apothecary',
    title: "Philosopher's Stone Sigil",
    blurb: 'Permanent cosmetic sigil for your agent vessel — the mark of a completed Magnum Opus.',
    icon: 'diamond',
    accent: 'matter',
    esms: basket(12, 12, 18, 12),
    usdCents: 1100,
    repeatable: false,
  },

  // ── Recipes — premium cosmic recipes ──────────────────────────────────────
  {
    id: 'recipe-saturn-slow-braise',
    kind: 'recipe',
    title: 'Saturn Slow-Braise',
    blurb:
      'An Earth-dominant recipe tuned to Saturn hours — grounding, patient, deeply nourishing.',
    icon: 'menu_book',
    accent: 'matter',
    esms: basket(2, 3, 9, 4),
    usdCents: 360,
    repeatable: false,
  },
  {
    id: 'recipe-venus-honey-cordial',
    kind: 'recipe',
    title: 'Venus Honey Cordial',
    blurb: 'A Water-dominant cordial for Venus hours — harmonizing, sweet, made for sharing.',
    icon: 'water_drop',
    accent: 'essence',
    esms: basket(3, 10, 2, 3),
    usdCents: 360,
    repeatable: false,
  },
  {
    id: 'recipe-codex-monthly',
    kind: 'recipe',
    title: 'Lunar Codex (this moon)',
    blurb:
      'The full premium recipe codex aligned to the current lunar month. Regenerates each cycle.',
    icon: 'auto_stories',
    accent: 'spirit',
    esms: basket(8, 8, 8, 8),
    usdCents: 900,
    repeatable: true,
  },

  // ── Food — real orders, bridged to the alchm.kitchen restaurant route ─────
  {
    id: 'food-elemental-tasting',
    kind: 'food',
    title: 'Elemental Tasting Menu',
    blurb:
      'A four-course menu mapped to Fire/Water/Earth/Air. Pay with ESMS, USDC, or card in the kitchen.',
    icon: 'local_fire_department',
    accent: 'spirit',
    esms: basket(0, 0, 0, 0),
    usdCents: 4200,
    repeatable: true,
    partner: 'Alchm Kitchen partners',
    kitchenPath: '/restaurants?cuisine=Tasting%20Menu&from=agents-shop',
  },
  {
    id: 'food-planetary-bowl',
    kind: 'food',
    title: 'Planetary Hour Bowl',
    blurb:
      'A grounding grain bowl tuned to your current planetary hour, from a connected partner kitchen.',
    icon: 'landscape',
    accent: 'matter',
    esms: basket(0, 0, 0, 0),
    usdCents: 1800,
    repeatable: true,
    partner: 'Alchm Kitchen partners',
    kitchenPath: '/restaurants?cuisine=Bowls&from=agents-shop',
  },
]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find(item => item.id === id)
}

export function catalogByKind(): Record<ShopItemKind, ShopItem[]> {
  return {
    apothecary: SHOP_CATALOG.filter(i => i.kind === 'apothecary'),
    recipe: SHOP_CATALOG.filter(i => i.kind === 'recipe'),
    food: SHOP_CATALOG.filter(i => i.kind === 'food'),
  }
}

/** Base URL of the alchm.kitchen deployment food orders hand off to. */
export function kitchenBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ALCHM_KITCHEN_URL ||
    process.env.ALCHM_KITCHEN_SYNC_URL ||
    'https://alchm.kitchen'
  )
}

/** Absolute kitchen URL for a food item's hand-off. */
export function foodHandoffUrl(item: ShopItem): string {
  const path = item.kitchenPath || '/restaurants'
  return `${kitchenBaseUrl().replace(/\/$/, '')}${path}`
}
