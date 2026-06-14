import { describe, expect, it } from 'vitest'
import {
  SHOP_CATALOG,
  getShopItem,
  catalogByKind,
  foodHandoffUrl,
  kitchenBaseUrl,
} from '@/lib/shop/catalog'
import { totalEsms } from '@/lib/shop/pricing'

describe('shop/catalog', () => {
  it('has unique item ids', () => {
    const ids = SHOP_CATALOG.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every item carries a title, blurb, icon and accent', () => {
    for (const item of SHOP_CATALOG) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.blurb.length).toBeGreaterThan(0)
      expect(item.icon.length).toBeGreaterThan(0)
      expect(['spirit', 'essence', 'matter', 'substance']).toContain(item.accent)
      expect(item.usdCents).toBeGreaterThan(0)
    }
  })

  it('digital items are priced in ESMS; food items are not', () => {
    for (const item of SHOP_CATALOG) {
      if (item.kind === 'food') {
        expect(totalEsms(item.esms)).toBe(0)
        expect(item.kitchenPath).toBeTruthy()
      } else {
        expect(totalEsms(item.esms)).toBeGreaterThan(0)
      }
    }
  })

  it('getShopItem resolves by id and returns undefined for unknown', () => {
    expect(getShopItem('unlock-philosophers-stone')?.kind).toBe('apothecary')
    expect(getShopItem('does-not-exist')).toBeUndefined()
  })

  it('catalogByKind groups every item exactly once', () => {
    const grouped = catalogByKind()
    const count = grouped.apothecary.length + grouped.recipe.length + grouped.food.length
    expect(count).toBe(SHOP_CATALOG.length)
    expect(grouped.apothecary.every(i => i.kind === 'apothecary')).toBe(true)
    expect(grouped.food.every(i => i.kind === 'food')).toBe(true)
  })

  it('foodHandoffUrl joins the kitchen base with the item path (no double slash)', () => {
    const food = SHOP_CATALOG.find(i => i.kind === 'food')!
    const url = foodHandoffUrl(food)
    expect(url.startsWith(kitchenBaseUrl().replace(/\/$/, ''))).toBe(true)
    expect(url).toContain(food.kitchenPath!)
    expect(url).not.toMatch(/[^:]\/\//) // no accidental `//` outside the scheme
  })
})
