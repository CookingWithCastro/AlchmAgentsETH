'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createPublicClient, formatUnits, http } from 'viem'
import { STAR_VAULT_ABI, STAR_VAULT_ADDRESS, arcChain, isStarVaultConfigured } from './arc'
import type { StakeableStar, YieldRateBreakdown } from './types'

const publicClient = createPublicClient({ chain: arcChain, transport: http() })

export interface PortfolioPosition {
  star: StakeableStar
  principalUsdc: number
  shares: bigint
  apyPct: number
  visible: boolean
  /** Estimated essence minted per day at the current rate (principal × dailyRate). */
  essencePerDay: number
}

export interface Portfolio {
  positions: PortfolioPosition[]
  totalStakedUsdc: number
  totalEssencePerDay: number
}

/**
 * The connected wallet's star-stake portfolio: reads principalOf/sharesOf for each star in
 * `stars`, keeps the ones with a balance, and joins each to its live yield. Polls on an
 * interval; no-ops gracefully when the vault is undeployed or no wallet is connected.
 */
export function usePortfolio(
  stars: StakeableStar[],
  yields: Map<number, YieldRateBreakdown>,
  pollMs = 20_000
) {
  const { primaryWallet } = useDynamicContext()
  const address = (primaryWallet?.address as `0x${string}` | undefined) ?? undefined
  const configured = isStarVaultConfigured()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(false)

  // Stable key so polling doesn't reset on every live-data tick.
  const starKey = useMemo(() => stars.map(s => s.hipId).join(','), [stars])

  const refresh = useCallback(async () => {
    if (!address || !configured || stars.length === 0) {
      setPortfolio(null)
      return
    }
    setLoading(true)
    try {
      const reads = await Promise.all(
        stars.map(async star => {
          const [principal, shares] = await Promise.all([
            publicClient.readContract({
              address: STAR_VAULT_ADDRESS,
              abi: STAR_VAULT_ABI,
              functionName: 'principalOf',
              args: [star.hipId, address],
            }) as Promise<bigint>,
            publicClient.readContract({
              address: STAR_VAULT_ADDRESS,
              abi: STAR_VAULT_ABI,
              functionName: 'sharesOf',
              args: [star.hipId, address],
            }) as Promise<bigint>,
          ])
          return { star, principal, shares }
        })
      )
      const positions: PortfolioPosition[] = reads
        .filter(r => r.principal > 0n)
        .map(r => {
          const y = yields.get(r.star.hipId)
          const principalUsdc = Number(formatUnits(r.principal, 6))
          return {
            star: r.star,
            principalUsdc,
            shares: r.shares,
            apyPct: y?.apyPct ?? 0,
            visible: y?.visible ?? false,
            essencePerDay: principalUsdc * (y?.dailyRatePerUsdc ?? 0),
          }
        })
      setPortfolio({
        positions,
        totalStakedUsdc: positions.reduce((s, p) => s + p.principalUsdc, 0),
        totalEssencePerDay: positions.reduce((s, p) => s + p.essencePerDay, 0),
      })
    } catch {
      setPortfolio(null)
    } finally {
      setLoading(false)
    }
    // yields is read at call time; excluded from deps so live ticks don't refetch chain reads.
  }, [address, configured, starKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refresh()
    if (!address || !configured) return
    const id = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(id)
  }, [refresh, address, configured, pollMs])

  return { portfolio, loading, configured, connected: Boolean(primaryWallet), refresh }
}

export default usePortfolio
