'use client'

import { useCallback, useRef, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createPublicClient, formatUnits, http, parseUnits } from 'viem'
import { arcChain } from './arc'
import { CONSTELLATION_AMM_ABI, CONSTELLATION_AMM_ADDRESS, isAmmConfigured, pairLabel } from './amm'
import { getArcWalletClient } from './wallet'
import type { EsmsId, LivePlanet, ObserverLocation } from './types'

const publicClient = createPublicClient({ chain: arcChain, transport: http() })

export interface ZonePoolContext {
  observer?: ObserverLocation | null
  planets?: LivePlanet[]
}

export interface PoolReserves {
  reserveA: number
  reserveB: number
}

/**
 * Seed / swap a ConstellationAMM ESMS element-pair pool (the zones' on-chain pools). Each
 * write fetches a fresh visibility attestation from /api/staking/pool-attestation, which
 * only signs while the pair's aspect is active and the sky is risen. Also exposes pure-read
 * `quote` / `reserves` for the swap UI.
 */
export function useZonePool(ctx: ZonePoolContext) {
  const { primaryWallet } = useDynamicContext()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<`0x${string}` | null>(null)

  const ctxRef = useRef<ZonePoolContext>(ctx)
  ctxRef.current = ctx

  const configured = isAmmConfigured()
  const connected = Boolean(primaryWallet)
  const address = (primaryWallet?.address as `0x${string}` | undefined) ?? undefined

  const fetchAttestation = useCallback(
    async (constId: number) => {
      const { observer, planets = [] } = ctxRef.current
      const res = await fetch('/api/staking/pool-attestation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, constId, observer, planets }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'pool is closed')
      const a = data.attestation as {
        trader: `0x${string}`
        constellationId: string
        regionCommit: `0x${string}`
        visibleStars: string
        nonce: string
        deadline: string
      }
      return {
        att: {
          trader: a.trader,
          constellationId: Number(a.constellationId),
          regionCommit: a.regionCommit,
          visibleStars: Number(a.visibleStars),
          nonce: BigInt(a.nonce),
          deadline: BigInt(a.deadline),
        },
        signature: data.signature as `0x${string}`,
      }
    },
    [address]
  )

  const seed = useCallback(
    async (constId: number, amtA: string, amtB: string, minShares: bigint = 0n) => {
      if (!configured) {
        setMessage('AMM not deployed yet')
        return
      }
      setBusy(true)
      setLastTx(null)
      setMessage(`Opening ${pairLabel(constId)} pool…`)
      try {
        const { att, signature } = await fetchAttestation(constId)
        const wallet = await getArcWalletClient(primaryWallet)
        setMessage('Providing essence…')
        // minShares is the LP's slippage floor; the on-chain on-ratio guard + admin-seeded
        // baseline are the primary defenses, so 0n (no floor) is a safe default here.
        const tx = await wallet.writeContract({
          address: CONSTELLATION_AMM_ADDRESS,
          abi: CONSTELLATION_AMM_ABI,
          functionName: 'seedLiquidity',
          args: [
            constId,
            parseUnits(amtA || '0', 18),
            parseUnits(amtB || '0', 18),
            minShares,
            att,
            signature,
          ],
        })
        await publicClient.waitForTransactionReceipt({ hash: tx })
        setLastTx(tx)
        setMessage(`Provided liquidity to ${pairLabel(constId)} ✓`)
      } catch (e) {
        setMessage((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [configured, fetchAttestation, primaryWallet]
  )

  const swap = useCallback(
    async (constId: number, inId: EsmsId, inAmt: string, minOut = '0') => {
      if (!configured) {
        setMessage('AMM not deployed yet')
        return
      }
      setBusy(true)
      setLastTx(null)
      setMessage(`Opening ${pairLabel(constId)} pool…`)
      try {
        const { att, signature } = await fetchAttestation(constId)
        const wallet = await getArcWalletClient(primaryWallet)
        setMessage('Swapping essence…')
        const tx = await wallet.writeContract({
          address: CONSTELLATION_AMM_ADDRESS,
          abi: CONSTELLATION_AMM_ABI,
          functionName: 'swap',
          args: [
            constId,
            inId,
            parseUnits(inAmt || '0', 18),
            parseUnits(minOut || '0', 18),
            att,
            signature,
          ],
        })
        await publicClient.waitForTransactionReceipt({ hash: tx })
        setLastTx(tx)
        setMessage('Swapped ✓')
      } catch (e) {
        setMessage((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [configured, fetchAttestation, primaryWallet]
  )

  /** Read the expected output for a swap (18-dp human number), 0 if the pool is empty/undeployed. */
  const quote = useCallback(
    async (constId: number, inId: EsmsId, inAmt: string): Promise<number> => {
      if (!configured) return 0
      try {
        const out = (await publicClient.readContract({
          address: CONSTELLATION_AMM_ADDRESS,
          abi: CONSTELLATION_AMM_ABI,
          functionName: 'quote',
          args: [constId, inId, parseUnits(inAmt || '0', 18)],
        })) as bigint
        return Number(formatUnits(out, 18))
      } catch {
        return 0
      }
    },
    [configured]
  )

  /** Read a pool's current reserves (18-dp human numbers). */
  const reserves = useCallback(
    async (constId: number): Promise<PoolReserves> => {
      if (!configured) return { reserveA: 0, reserveB: 0 }
      try {
        const [rA, rB] = (await publicClient.readContract({
          address: CONSTELLATION_AMM_ADDRESS,
          abi: CONSTELLATION_AMM_ABI,
          functionName: 'getReserves',
          args: [constId],
        })) as readonly [bigint, bigint]
        return { reserveA: Number(formatUnits(rA, 18)), reserveB: Number(formatUnits(rB, 18)) }
      } catch {
        return { reserveA: 0, reserveB: 0 }
      }
    },
    [configured]
  )

  return { configured, connected, busy, message, lastTx, seed, swap, quote, reserves }
}

export default useZonePool
