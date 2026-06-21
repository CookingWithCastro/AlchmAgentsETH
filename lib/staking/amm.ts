/**
 * ConstellationAMM (on Arc) — the 6 ESMS element-pair pools the zones' aspect-driven
 * pools route into. constId is the canonical pair index 0..5 (must match DeployStarVault).
 */

import { ARC_CHAIN_ID } from './arc'
import { PENTACLES_ARC_TESTNET_DEPLOYMENT } from './deployment'
import { ESMS_NAME } from './elements'
import type { EsmsId } from './types'

export const CONSTELLATION_AMM_ADDRESS = (process.env.NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS ??
  PENTACLES_ARC_TESTNET_DEPLOYMENT.constellationAmm) as `0x${string}`
export const CONSTELLATION_DEED_ADDRESS = (process.env.NEXT_PUBLIC_CONSTELLATION_DEED_ADDRESS ??
  PENTACLES_ARC_TESTNET_DEPLOYMENT.constellationDeed) as `0x${string}`

export function isAmmConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(CONSTELLATION_AMM_ADDRESS)
}

/** The 6 cross-element ESMS pairs, indexed by constId (must match DeployStarVault). */
export const PAIRS: ReadonlyArray<readonly [EsmsId, EsmsId]> = [
  [0, 1], // Spirit-Essence
  [0, 2], // Spirit-Matter
  [0, 3], // Spirit-Substance
  [1, 2], // Essence-Matter
  [1, 3], // Essence-Substance
  [2, 3], // Matter-Substance
]

/** constId (0..5) for an unordered ESMS pair, or -1 if same element. */
export function constIdForPair(a: EsmsId, b: EsmsId): number {
  const lo = Math.min(a, b) as EsmsId
  const hi = Math.max(a, b) as EsmsId
  if (lo === hi) return -1
  return PAIRS.findIndex(p => p[0] === lo && p[1] === hi)
}

export function pairLabel(constId: number): string {
  const p = PAIRS[constId]
  return p ? `${ESMS_NAME[p[0]]}–${ESMS_NAME[p[1]]}` : `pool ${constId}`
}

export const CONSTELLATION_AMM_ABI = [
  {
    type: 'function',
    name: 'seedLiquidity',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'constId', type: 'uint16' },
      { name: 'amtA', type: 'uint256' },
      { name: 'amtB', type: 'uint256' },
      { name: 'minShares', type: 'uint256' },
      {
        name: 'att',
        type: 'tuple',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'constellationId', type: 'uint16' },
          { name: 'regionCommit', type: 'bytes32' },
          { name: 'visibleStars', type: 'uint8' },
          { name: 'nonce', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
        ],
      },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [{ name: 'deedId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'constId', type: 'uint16' },
      { name: 'inId', type: 'uint8' },
      { name: 'inAmt', type: 'uint256' },
      { name: 'minOut', type: 'uint256' },
      {
        name: 'att',
        type: 'tuple',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'constellationId', type: 'uint16' },
          { name: 'regionCommit', type: 'bytes32' },
          { name: 'visibleStars', type: 'uint8' },
          { name: 'nonce', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
        ],
      },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [{ name: 'outAmt', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'deedId', type: 'uint256' },
      { name: 'shareBps', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'quote',
    stateMutability: 'view',
    inputs: [
      { name: 'constId', type: 'uint16' },
      { name: 'inId', type: 'uint8' },
      { name: 'inAmt', type: 'uint256' },
    ],
    outputs: [{ name: 'outAmt', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [{ name: 'constId', type: 'uint16' }],
    outputs: [
      { name: 'rA', type: 'uint256' },
      { name: 'rB', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'usedNonce',
    stateMutability: 'view',
    inputs: [
      { name: 'constId', type: 'uint16' },
      { name: 'trader', type: 'address' },
    ],
    outputs: [{ type: 'uint64' }],
  },
] as const

/** EIP-712 domain for the deployed ConstellationAMM on Arc. */
export function visibilityDomain(verifyingContract: `0x${string}`) {
  return {
    name: 'ConstellationAMM',
    version: '1',
    chainId: ARC_CHAIN_ID,
    verifyingContract,
  } as const
}

/** Must match ConstellationAMM.ATTESTATION_TYPEHASH exactly. */
export const VISIBILITY_TYPES = {
  VisibilityAttestation: [
    { name: 'trader', type: 'address' },
    { name: 'constellationId', type: 'uint16' },
    { name: 'regionCommit', type: 'bytes32' },
    { name: 'visibleStars', type: 'uint8' },
    { name: 'nonce', type: 'uint64' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const
