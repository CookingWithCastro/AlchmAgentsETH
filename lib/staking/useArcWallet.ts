'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import { ARC_CHAIN_ID } from './arc'
import { getArcWalletClient, switchToArc } from './wallet'

/** Circle's multi-chain testnet faucet (Arc USDC). */
export const ARC_FAUCET_URL = 'https://faucet.circle.com'

/**
 * Shared wallet/chain helper for onboarding and any Arc tx flow: connection state, a
 * non-intrusive "are we on Arc?" check (reads eth_chainId, never prompts), a switch action,
 * the bound viem WalletClient getter, and the faucet/explorer links.
 */
export function useArcWallet() {
  const { primaryWallet } = useDynamicContext()
  const address = (primaryWallet?.address as `0x${string}` | undefined) ?? undefined
  const [onArc, setOnArc] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const pw = primaryWallet as { connector?: { getProvider: () => Promise<unknown> } } | null
    if (!pw?.connector) {
      setOnArc(null)
      return
    }
    void (async () => {
      try {
        const provider = (await pw.connector!.getProvider()) as {
          request: (args: { method: string }) => Promise<string>
        }
        const hex = await provider.request({ method: 'eth_chainId' })
        if (!cancelled) setOnArc(parseInt(hex, 16) === ARC_CHAIN_ID)
      } catch {
        if (!cancelled) setOnArc(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [primaryWallet])

  const ensureArc = useCallback(() => switchToArc(primaryWallet), [primaryWallet])
  const getWalletClient = useCallback(() => getArcWalletClient(primaryWallet), [primaryWallet])

  return {
    address: address ?? null,
    connected: Boolean(primaryWallet),
    onArc,
    ensureArc,
    getWalletClient,
    chainId: ARC_CHAIN_ID,
    explorer: ARC_TESTNET.explorer,
    faucetUrl: ARC_FAUCET_URL,
  }
}

export default useArcWallet
