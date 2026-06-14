import { describe, expect, it } from 'vitest'
import {
  totalEsms,
  costToAmountStrings,
  canAffordOnchain,
  onchainShortfall,
  formatUsd,
} from '@/lib/shop/pricing'

const e18 = (n: number) => BigInt(n) * 10n ** 18n
const cost = { spirit: 4, essence: 8, matter: 2, substance: 2 }

describe('shop/pricing', () => {
  it('totalEsms sums all four axes', () => {
    expect(totalEsms(cost)).toBe(16)
    expect(totalEsms({ spirit: 0, essence: 0, matter: 0, substance: 0 })).toBe(0)
  })

  it('costToAmountStrings stringifies each axis', () => {
    expect(costToAmountStrings(cost)).toEqual({
      spirit: '4',
      essence: '8',
      matter: '2',
      substance: '2',
    })
  })

  it('canAffordOnchain compares 18-dp balances against whole-ESMS cost', () => {
    const enough = { spirit: e18(4), essence: e18(8), matter: e18(2), substance: e18(2) }
    expect(canAffordOnchain(enough, cost)).toBe(true)

    // one wei short on essence → cannot afford
    const short = { ...enough, essence: e18(8) - 1n }
    expect(canAffordOnchain(short, cost)).toBe(false)
  })

  it('onchainShortfall reports the per-axis whole-ESMS gap', () => {
    const balances = { spirit: e18(10), essence: e18(1), matter: 0n, substance: e18(2) }
    expect(onchainShortfall(balances, cost)).toEqual({
      spirit: 0, // has 10, needs 4
      essence: 7, // has 1, needs 8
      matter: 2, // has 0, needs 2
      substance: 0, // has 2, needs 2
    })
  })

  it('formatUsd renders cents as dollars', () => {
    expect(formatUsd(1100)).toBe('$11.00')
    expect(formatUsd(320)).toBe('$3.20')
    expect(formatUsd(0)).toBe('$0.00')
  })
})
