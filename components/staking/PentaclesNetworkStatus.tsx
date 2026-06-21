'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import {
  ARC_CHAIN_ID,
  ARC_ESMS_ADDRESS,
  STAR_VAULT_ADDRESS,
  arcChain,
  isArcEsmsConfigured,
  isStarVaultConfigured,
} from '@/lib/staking/arc'
import {
  CONSTELLATION_AMM_ADDRESS,
  CONSTELLATION_DEED_ADDRESS,
  isAmmConfigured,
} from '@/lib/staking/amm'

type NetworkState = 'checking' | 'live' | 'unavailable' | 'unconfigured'

const addressPattern = /^0x[0-9a-fA-F]{40}$/

/** Live, read-only proof that the UI is connected to the deployed Arc testnet stack. */
export default function PentaclesNetworkStatus() {
  const configured =
    isStarVaultConfigured() &&
    isArcEsmsConfigured() &&
    isAmmConfigured() &&
    addressPattern.test(CONSTELLATION_DEED_ADDRESS)
  const [state, setState] = useState<NetworkState>(configured ? 'checking' : 'unconfigured')

  const client = useMemo(() => createPublicClient({ chain: arcChain, transport: http() }), [])

  useEffect(() => {
    if (!configured) return
    let cancelled = false

    void (async () => {
      try {
        const [chainId, ...codes] = await Promise.all([
          client.getChainId(),
          client.getBytecode({ address: ARC_ESMS_ADDRESS }),
          client.getBytecode({ address: STAR_VAULT_ADDRESS }),
          client.getBytecode({ address: CONSTELLATION_DEED_ADDRESS }),
          client.getBytecode({ address: CONSTELLATION_AMM_ADDRESS }),
        ])
        const contractsLive = codes.every(code => Boolean(code && code !== '0x'))
        if (!cancelled) setState(chainId === ARC_CHAIN_ID && contractsLive ? 'live' : 'unavailable')
      } catch {
        if (!cancelled) setState('unavailable')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [client, configured])

  const detail =
    state === 'live'
      ? '4/4 contracts live'
      : state === 'checking'
        ? 'checking contracts…'
        : state === 'unconfigured'
          ? 'deployment not configured'
          : 'RPC check unavailable'
  const color = state === 'live' ? '#75e6a4' : state === 'unavailable' ? '#ffb86b' : '#9aa0d8'

  return (
    <a
      href={`${ARC_TESTNET.explorer}/address/${STAR_VAULT_ADDRESS}`}
      target="_blank"
      rel="noreferrer"
      aria-live="polite"
      title="Open the StarVault deployment in Arcscan"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        marginTop: 12,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(117,230,164,0.22)',
        background: 'rgba(10,18,16,0.62)',
        color,
        fontSize: 12,
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: '50%', background: color }}
      />
      Arc Testnet · EVM {ARC_CHAIN_ID} · {detail} ↗
    </a>
  )
}
