/**
 * Shop pricing helpers — convert a whole-ESMS basket into the shapes the
 * on-chain burn and affordability checks need.
 *
 * Digital items are priced in whole ESMS units per axis (like AGENT_OPERATION_COSTS
 * and the 12-ESMS context-card unlock). The on-chain token is 18-dp, so a cost of
 * `5 Spirit` becomes `5 * 1e18` when burned.
 */

import { parseUnits } from 'viem'
import type { EsmsAmounts } from '@/lib/esms-chain/redeemer'
import type { OnchainEsms } from '@/lib/esms-chain/contract'

export interface EsmsCost {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export const ESMS_AXES = ['spirit', 'essence', 'matter', 'substance'] as const
export type EsmsAxis = (typeof ESMS_AXES)[number]

/** Total ESMS across all four axes. */
export function totalEsms(cost: EsmsCost): number {
  return cost.spirit + cost.essence + cost.matter + cost.substance
}

/** Cost as decimal strings for the redeemer (which scales to 18-dp). */
export function costToAmountStrings(cost: EsmsCost): EsmsAmounts {
  return {
    spirit: String(cost.spirit),
    essence: String(cost.essence),
    matter: String(cost.matter),
    substance: String(cost.substance),
  }
}

/** Whether on-chain balances (18-dp bigints) cover a whole-ESMS cost on every axis. */
export function canAffordOnchain(balances: OnchainEsms, cost: EsmsCost): boolean {
  return ESMS_AXES.every(axis => balances[axis] >= parseUnits(String(cost[axis]), 18))
}

/** The per-axis on-chain shortfall (18-dp), for "claim more to chain" messaging. */
export function onchainShortfall(balances: OnchainEsms, cost: EsmsCost): EsmsCost {
  const short = (axis: EsmsAxis): number => {
    const need = parseUnits(String(cost[axis]), 18)
    const have = balances[axis]
    if (have >= need) return 0
    // whole-ESMS shortfall, rounded up
    return Math.ceil(Number(need - have) / 1e18)
  }
  return {
    spirit: short('spirit'),
    essence: short('essence'),
    matter: short('matter'),
    substance: short('substance'),
  }
}

/** USD price formatted from cents, e.g. 1100 → "$11.00". */
export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
