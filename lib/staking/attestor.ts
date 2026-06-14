/**
 * Server-side "Pentacles feeder" — signs EIP-712 {StarYield} attestations that let a
 * staker mint their accrued ESMS on Arc. The signer holds ATTESTOR_ROLE on the
 * deployed StarVault. SERVER ONLY: never import into a client component.
 *
 * Key resolution: ARC_ATTESTOR_PRIVATE_KEY (a raw key for the feeder). Kept distinct
 * from the deployer/minter key so the attestor can be rotated independently.
 */

import { privateKeyToAccount } from 'viem/accounts'
import { STAR_YIELD_TYPES, starYieldDomain, STAR_VAULT_ADDRESS } from './arc'
import { CONSTELLATION_AMM_ADDRESS, VISIBILITY_TYPES, visibilityDomain } from './amm'
import type { EsmsId } from './types'

export interface StarYieldClaim {
  staker: `0x${string}`
  starId: number
  element: EsmsId
  /** ESMS to mint, 18-dp. */
  amount: bigint
  nonce: bigint
  deadline: bigint
}

export interface SignedStarYield {
  claim: StarYieldClaim
  signature: `0x${string}`
  attestor: `0x${string}`
  verifyingContract: `0x${string}`
}

function attestorAccount() {
  const pk = process.env.ARC_ATTESTOR_PRIVATE_KEY
  if (!pk) throw new Error('ARC_ATTESTOR_PRIVATE_KEY not set — cannot sign StarYield attestations')
  return privateKeyToAccount((pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`)
}

/** The attestor's address, or null if no key is configured. */
export function attestorAddress(): `0x${string}` | null {
  try {
    return attestorAccount().address
  } catch {
    return null
  }
}

/**
 * Sign a StarYield claim for `verifyingContract` (defaults to NEXT_PUBLIC_STAR_VAULT_ADDRESS).
 * Returns the signature + the exact claim tuple to pass to StarVault.claimYield.
 */
export async function signStarYield(
  claim: StarYieldClaim,
  verifyingContract: `0x${string}` = STAR_VAULT_ADDRESS
): Promise<SignedStarYield> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(verifyingContract)) {
    throw new Error('StarVault address not configured (set NEXT_PUBLIC_STAR_VAULT_ADDRESS)')
  }
  const account = attestorAccount()
  const signature = await account.signTypedData({
    domain: starYieldDomain(verifyingContract),
    types: STAR_YIELD_TYPES,
    primaryType: 'StarYield',
    message: {
      staker: claim.staker,
      starId: claim.starId,
      element: claim.element,
      amount: claim.amount,
      nonce: claim.nonce,
      deadline: claim.deadline,
    },
  })
  return { claim, signature, attestor: account.address, verifyingContract }
}

export interface VisibilityClaim {
  trader: `0x${string}`
  constellationId: number
  regionCommit: `0x${string}`
  visibleStars: number
  nonce: bigint
  deadline: bigint
}

export interface SignedVisibility {
  claim: VisibilityClaim
  signature: `0x${string}`
  attestor: `0x${string}`
  verifyingContract: `0x${string}`
}

/**
 * Sign a ConstellationAMM VisibilityAttestation — opens an ESMS element-pair pool for the
 * trader. The route only calls this when the pair's planetary aspect is active and its
 * zone is risen, so the signature *is* the "pool is open right now" gate.
 */
export async function signVisibilityAttestation(
  claim: VisibilityClaim,
  verifyingContract: `0x${string}` = CONSTELLATION_AMM_ADDRESS
): Promise<SignedVisibility> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(verifyingContract)) {
    throw new Error(
      'ConstellationAMM address not configured (set NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS)'
    )
  }
  const account = attestorAccount()
  const signature = await account.signTypedData({
    domain: visibilityDomain(verifyingContract),
    types: VISIBILITY_TYPES,
    primaryType: 'VisibilityAttestation',
    message: {
      trader: claim.trader,
      constellationId: claim.constellationId,
      regionCommit: claim.regionCommit,
      visibleStars: claim.visibleStars,
      nonce: claim.nonce,
      deadline: claim.deadline,
    },
  })
  return { claim, signature, attestor: account.address, verifyingContract }
}
