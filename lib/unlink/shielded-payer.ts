/**
 * Unlink ZK-shielded payer — private x402 payments on Arc.
 *
 * Flow: deposit (shield) Arc USDC into Unlink's private pool → ZK-withdraw the
 * message fee to a FRESH, browser-generated payer EOA → that throwaway EOA signs the
 * x402 EIP-3009 authorization. On-chain, only an unlinkable throwaway address pays —
 * no link to the operator's Dynamic/World identity.
 *
 * Install: bun add @unlink-xyz/sdk@canary
 *   ⚠️ plain `@unlink-xyz/sdk` resolves to a dead 0.0.2 STUB — you MUST use @canary
 *      (0.3.x). The method is `deposit` (a.k.a. "shield"), NOT `shield`. Pre-1.0
 *      canary (churns) — pin an exact version + confirm the API shape on install.
 *
 * Env: UNLINK_NETWORK (default "arc-testnet"). SDK lazy-loaded so the repo compiles.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

async function loadUnlink(): Promise<any | null> {
  const pkg = '@unlink-xyz/sdk'
  try {
    return await import(pkg)
  } catch {
    return null
  }
}

export interface ThrowawayPayer {
  address: `0x${string}`
  /** Browser-memory only — NEVER persist or send anywhere. */
  privateKey: `0x${string}`
}

/** Generate a throwaway payer EOA (the unlinkable address that signs the x402 payment). */
export function newThrowawayPayer(): ThrowawayPayer {
  const privateKey = generatePrivateKey()
  return { address: privateKeyToAccount(privateKey).address, privateKey }
}

export interface ShieldedWithdrawResult {
  payer: ThrowawayPayer
  withdrawn: boolean
  detail?: string
}

/**
 * Deposit (shield) USDC into Unlink, then ZK-withdraw `amount` to a fresh payer EOA.
 * Returns the throwaway payer that will sign the x402 EIP-3009 authorization.
 * Best-effort against the canary SDK — returns withdrawn:false (with the payer still
 * generated) if the SDK isn't installed or the method shapes differ.
 */
export async function shieldAndWithdrawToPayer(opts: {
  amount: string
  /** A pre-built Unlink client (from @unlink-xyz/sdk/client or /react), if you have one. */
  client?: any
}): Promise<ShieldedWithdrawResult> {
  const payer = newThrowawayPayer()
  const mod = await loadUnlink()
  if (!mod) return { payer, withdrawn: false, detail: '@unlink-xyz/sdk@canary not installed' }
  try {
    const client =
      opts.client ?? mod.createClient?.({ network: process.env.UNLINK_NETWORK ?? 'arc-testnet' })
    // deposit (a.k.a. "shield") — move USDC into the private pool.
    await (client.deposit ?? client.depositWithApproval)?.({ amount: opts.amount })
    // ZK-withdraw the fee to the throwaway payer.
    await client.withdraw?.({ amount: opts.amount, to: payer.address })
    return { payer, withdrawn: true }
  } catch (e) {
    return {
      payer,
      withdrawn: false,
      detail: e instanceof Error ? e.message : 'unlink flow failed',
    }
  }
}
