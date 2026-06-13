'use client'

/**
 * World ID verification button — proves the operator is a unique human (IDKit),
 * then POSTs the proof to /api/world-id/verify (cloud verify + nullifier).
 *
 * Requires: bun add @worldcoin/idkit  + NEXT_PUBLIC_WORLD_APP_ID / NEXT_PUBLIC_WORLD_ACTION.
 *
 * API NOTE: this uses the widely-documented v3 `IDKitWidget` (render-prop) API.
 * If your installed @worldcoin/idkit is v4, swap to `IDKitRequestWidget`
 * (`open`/`onOpenChange` props, `preset`); the backend verify route is unchanged.
 */

import { IDKitWidget, VerificationLevel, type ISuccessResult } from '@worldcoin/idkit'

interface WorldIdButtonProps {
  /** Optional agent to stamp with a `human-verified` ENS record on success. */
  agentId?: string
  /** Bind the proof to a payload (e.g. the operator's wallet) to prevent replay. */
  signal?: string
  onVerified?: (nullifier: string) => void
  className?: string
}

export function WorldIdButton({ agentId, signal, onVerified, className }: WorldIdButtonProps) {
  const appId = (process.env.NEXT_PUBLIC_WORLD_APP_ID ||
    'app_staging_85012356c3905086d5e7a969f688e1ba') as `app_${string}`
  const action = process.env.NEXT_PUBLIC_WORLD_ACTION ?? 'verify-operator'

  async function handleVerify(proof: ISuccessResult) {
    const res = await fetch('/api/world-id/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ proof, action, agentId }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'World ID verification failed')
    onVerified?.(json.nullifier)
  }

  return (
    <IDKitWidget
      app_id={appId}
      action={action}
      signal={signal}
      verification_level={VerificationLevel.Device}
      handleVerify={handleVerify}
      onSuccess={() => {}}
    >
      {({ open }: { open: () => void }) => (
        <button
          type="button"
          onClick={open}
          className={
            className ??
            'inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800'
          }
        >
          Verify you&apos;re human · World ID
        </button>
      )}
    </IDKitWidget>
  )
}
