'use client'

import { useCallback, useRef, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem'
import { ARC_CHAIN_ID, arcChain } from './arc'
import { CONSTELLATION_AMM_ABI, CONSTELLATION_AMM_ADDRESS, isAmmConfigured, pairLabel } from './amm'
import type { LivePlanet, ObserverLocation } from './types'

const publicClient = createPublicClient({ chain: arcChain, transport: http() })

export interface ZonePoolContext {
  observer?: ObserverLocation | null
  planets?: LivePlanet[]
}

/**
 * Seed / swap a ConstellationAMM ESMS element-pair pool (the zones' on-chain pools). Each
 * action fetches a fresh visibility attestation from /api/staking/pool-attestation, which
 * only signs while the pair's aspect is active and the sky is risen.
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

  const getWalletClient = useCallback(async () => {
    if (!primaryWallet) throw new Error('Connect a wallet first')
    const provider = await (
      primaryWallet.connector as unknown as { getProvider: () => Promise<unknown> }
    ).getProvider()
    try {
      await (
        primaryWallet as unknown as { switchNetwork?: (id: number) => Promise<void> }
      ).switchNetwork?.(ARC_CHAIN_ID)
    } catch {
      /* wallet may need Arc added manually */
    }
    return createWalletClient({
      account: primaryWallet.address as `0x${string}`,
      chain: arcChain,
      transport: custom(provider as Parameters<typeof custom>[0]),
    })
  }, [primaryWallet])

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
    async (constId: number, amtA: string, amtB: string) => {
      if (!configured) {
        setMessage('AMM not deployed yet')
        return
      }
      setBusy(true)
      setLastTx(null)
      setMessage(`Opening ${pairLabel(constId)} pool…`)
      try {
        const { att, signature } = await fetchAttestation(constId)
        const wallet = await getWalletClient()
        setMessage('Providing essence…')
        const tx = await wallet.writeContract({
          address: CONSTELLATION_AMM_ADDRESS,
          abi: CONSTELLATION_AMM_ABI,
          functionName: 'seedLiquidity',
          args: [constId, parseUnits(amtA || '0', 18), parseUnits(amtB || '0', 18), att, signature],
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
    [configured, fetchAttestation, getWalletClient]
  )

  return { configured, connected, busy, message, lastTx, seed }
}

export default useZonePool
