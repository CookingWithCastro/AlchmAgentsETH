'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { createPublicClient, formatUnits, http, parseUnits } from 'viem'
import {
  ARC_USDC,
  ERC20_ABI,
  STAR_VAULT_ABI,
  STAR_VAULT_ADDRESS,
  USDC_DECIMALS,
  arcChain,
  isStarVaultConfigured,
} from './arc'
import { getArcWalletClient } from './wallet'
import type { LivePlanet, NatalAffinity, ObserverLocation, StakeableStar } from './types'

export interface StarPosition {
  principalUsdc: number
  shares: bigint
}

export interface StakingContext {
  observer?: ObserverLocation | null
  planets?: LivePlanet[]
  natal?: NatalAffinity | null
}

const publicClient = createPublicClient({ chain: arcChain, transport: http() })

/**
 * Wallet + Arc StarVault interactions for one selected star: read the connected
 * wallet's position and run stake / unstake / claim. Gated gracefully when the vault
 * is undeployed (NEXT_PUBLIC_STAR_VAULT_ADDRESS unset) or no wallet is connected.
 */
export function useStarStaking(star: StakeableStar | null, ctx: StakingContext = {}) {
  const { primaryWallet } = useDynamicContext()
  const address = (primaryWallet?.address as `0x${string}` | undefined) ?? undefined

  const [position, setPosition] = useState<StarPosition | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<`0x${string}` | null>(null)

  const configured = isStarVaultConfigured()
  const ctxRef = useRef<StakingContext>(ctx)
  ctxRef.current = ctx

  const refresh = useCallback(async () => {
    if (!star || !address || !configured) {
      setPosition(null)
      return
    }
    try {
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
      setPosition({ principalUsdc: Number(formatUnits(principal, 6)), shares })
    } catch {
      setPosition(null)
    }
  }, [star?.hipId, address, configured]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refresh()
  }, [refresh])

  const getWalletClient = useCallback(() => getArcWalletClient(primaryWallet), [primaryWallet])

  const stake = useCallback(
    async (usdcAmount: string) => {
      if (!star) return
      if (!configured) {
        setMessage('Vault not deployed yet')
        return
      }
      setBusy(true)
      setLastTx(null)
      setMessage('Preparing stake…')
      try {
        const amount = parseUnits(usdcAmount || '0', USDC_DECIMALS)
        if (amount <= 0n) throw new Error('Enter a USDC amount')
        const wallet = await getWalletClient()
        const owner = wallet.account.address

        // Awaken the star on its first stake: if not yet activated, submit a Merkle proof.
        const activated = (await publicClient.readContract({
          address: STAR_VAULT_ADDRESS,
          abi: STAR_VAULT_ABI,
          functionName: 'starActivated',
          args: [star.hipId],
        })) as boolean
        if (!activated) {
          setMessage(`Awakening ${star.name}…`)
          const pres = await fetch(`/api/staking/star-proof?hipId=${star.hipId}`)
          const pdata = await pres.json()
          if (!pres.ok) throw new Error(pdata.error || 'This star cannot be staked yet')
          const actTx = await wallet.writeContract({
            address: STAR_VAULT_ADDRESS,
            abi: STAR_VAULT_ABI,
            functionName: 'activateStar',
            args: [star.hipId, pdata.proof as `0x${string}`[]],
          })
          await publicClient.waitForTransactionReceipt({ hash: actTx })
        }

        const allowance = (await publicClient.readContract({
          address: ARC_USDC,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [owner, STAR_VAULT_ADDRESS],
        })) as bigint
        if (allowance < amount) {
          setMessage('Approving USDC…')
          const approveTx = await wallet.writeContract({
            address: ARC_USDC,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [STAR_VAULT_ADDRESS, amount],
          })
          await publicClient.waitForTransactionReceipt({ hash: approveTx })
        }

        setMessage(`Staking ${usdcAmount} USDC on ${star.name}…`)
        const tx = await wallet.writeContract({
          address: STAR_VAULT_ADDRESS,
          abi: STAR_VAULT_ABI,
          functionName: 'stake',
          args: [star.hipId, amount],
        })
        await publicClient.waitForTransactionReceipt({ hash: tx })
        setLastTx(tx)
        setMessage('Staked ✓')
        await refresh()
      } catch (e) {
        setMessage((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [star, configured, getWalletClient, refresh]
  )

  const unstake = useCallback(
    async (shares: bigint) => {
      if (!star || shares <= 0n) return
      setBusy(true)
      setLastTx(null)
      setMessage('Unstaking…')
      try {
        const wallet = await getWalletClient()
        const tx = await wallet.writeContract({
          address: STAR_VAULT_ADDRESS,
          abi: STAR_VAULT_ABI,
          functionName: 'unstake',
          args: [star.hipId, shares],
        })
        await publicClient.waitForTransactionReceipt({ hash: tx })
        setLastTx(tx)
        setMessage('Unstaked ✓')
        await refresh()
      } catch (e) {
        setMessage((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [star, getWalletClient, refresh]
  )

  const claim = useCallback(async () => {
    if (!star || !address) {
      setMessage('Connect a wallet first')
      return
    }
    const { observer, planets = [], natal = null } = ctxRef.current
    if (!observer) {
      setMessage('Allow location to claim (yield is gated on horizon visibility)')
      return
    }
    setBusy(true)
    setLastTx(null)
    setMessage('Requesting visibility attestation…')
    try {
      const res = await fetch('/api/staking/claim-attestation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          address,
          star: {
            hipId: star.hipId,
            name: star.name,
            ra: star.ra,
            dec: star.dec,
            magnitude: star.magnitude,
            regionHint: star.regionHint,
          },
          observer,
          planets,
          natal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Attestation failed')

      const wallet = await getWalletClient()
      const c = data.claim as {
        staker: `0x${string}`
        starId: string
        element: string
        amount: string
        nonce: string
        deadline: string
      }
      const yieldStruct = {
        staker: c.staker,
        starId: Number(c.starId),
        element: Number(c.element),
        amount: BigInt(c.amount),
        nonce: BigInt(c.nonce),
        deadline: BigInt(c.deadline),
      }
      setMessage('Claiming ESMS essence…')
      const tx = await wallet.writeContract({
        address: STAR_VAULT_ADDRESS,
        abi: STAR_VAULT_ABI,
        functionName: 'claimYield',
        args: [yieldStruct, data.signature as `0x${string}`],
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
      setLastTx(tx)
      setMessage(`Claimed ${data.rate?.element ?? ''} essence ✓`)
      await refresh()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [star, address, getWalletClient, refresh])

  return {
    address: address ?? null,
    connected: Boolean(primaryWallet),
    configured,
    position,
    busy,
    message,
    lastTx,
    stake,
    unstake,
    claim,
    refresh,
  }
}

export default useStarStaking
