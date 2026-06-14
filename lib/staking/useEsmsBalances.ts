'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createPublicClient, formatUnits, http } from 'viem'
import {
  ARC_ESMS_ADDRESS,
  ARC_USDC,
  ERC20_ABI,
  ESMS_ERC1155_ABI,
  arcChain,
  isArcEsmsConfigured,
} from './arc'
import type { EsmsId } from './types'

const publicClient = createPublicClient({ chain: arcChain, transport: http() })

export interface EsmsBalances {
  spirit: number
  essence: number
  matter: number
  substance: number
  /** Sum of the four ESMS balances (18-dp tokens). */
  total: number
  /** USDC wallet balance (6-dp). */
  usdc: number
}

const EMPTY: EsmsBalances = { spirit: 0, essence: 0, matter: 0, substance: 0, total: 0, usdc: 0 }

/**
 * The connected wallet's four soulbound ESMS balances (ERC-1155 balanceOfBatch of ids
 * [0,1,2,3]) + USDC, from the Arc ESMS token. Polls on an interval; degrades gracefully
 * when the token is undeployed or no wallet is connected. Drives the "Cosmic Wallet" UI.
 */
export function useEsmsBalances(pollMs = 15_000) {
  const { primaryWallet } = useDynamicContext()
  const address = (primaryWallet?.address as `0x${string}` | undefined) ?? undefined

  const [balances, setBalances] = useState<EsmsBalances | null>(null)
  const [loading, setLoading] = useState(false)
  const configured = isArcEsmsConfigured()

  const refresh = useCallback(async () => {
    if (!address || !configured) {
      setBalances(null)
      return
    }
    setLoading(true)
    try {
      const ids = [0n, 1n, 2n, 3n]
      const accounts = ids.map(() => address)
      const [raw, usdcRaw] = await Promise.all([
        publicClient.readContract({
          address: ARC_ESMS_ADDRESS,
          abi: ESMS_ERC1155_ABI,
          functionName: 'balanceOfBatch',
          args: [accounts, ids],
        }) as Promise<readonly bigint[]>,
        publicClient.readContract({
          address: ARC_USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        }) as Promise<bigint>,
      ])
      const f = (b: bigint) => Number(formatUnits(b, 18))
      const spirit = f(raw[0] ?? 0n)
      const essence = f(raw[1] ?? 0n)
      const matter = f(raw[2] ?? 0n)
      const substance = f(raw[3] ?? 0n)
      setBalances({
        spirit,
        essence,
        matter,
        substance,
        total: spirit + essence + matter + substance,
        usdc: Number(formatUnits(usdcRaw, 6)),
      })
    } catch {
      setBalances(null)
    } finally {
      setLoading(false)
    }
  }, [address, configured])

  useEffect(() => {
    void refresh()
    if (!address || !configured) return
    const id = setInterval(() => void refresh(), pollMs)
    return () => clearInterval(id)
  }, [refresh, address, configured, pollMs])

  /** Balance for a single ESMS id (0=Spirit … 3=Substance). */
  const byId = useCallback(
    (id: EsmsId): number => {
      const b = balances ?? EMPTY
      return [b.spirit, b.essence, b.matter, b.substance][id] ?? 0
    },
    [balances]
  )

  return {
    balances,
    byId,
    loading,
    configured,
    connected: Boolean(primaryWallet),
    address: address ?? null,
    refresh,
  }
}

export default useEsmsBalances
