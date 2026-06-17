/**
 * On-chain ESMS (soulbound ERC-1155 on Base) — addresses, ABI, reads.
 * Phase 1: read balances + (via minter.ts) mint settled claims. Off-chain WTEN
 * ledger stays authoritative; on-chain is a claim/mirror.
 */

import { createPublicClient, http, type Address } from 'viem'
import { base, baseSepolia } from 'viem/chains'

/** Token ids on the ERC-1155 (must match EsmsToken.sol). */
export const ESMS_IDS = [0n, 1n, 2n, 3n] as const // spirit, essence, matter, substance

/** ABI for the ESMS calls PA needs: claim/mint (Phase 1) + shop redeem/burn (Phase 2). */
export const ESMS_ABI = [
  {
    type: 'function',
    name: 'claimMint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'claimId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOfBatch',
    stateMutability: 'view',
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [{ name: 'claimId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    // Phase 2 — shop spend: user-signed self-burn against a unique orderId.
    type: 'function',
    name: 'redeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    // Phase 2 — shop spend: backend-sponsored burn of `from`'s balance (BURNER_ROLE),
    // now gated by the holder's EIP-712 RedeemAuthorization signature + deadline.
    type: 'function',
    name: 'redeemFor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'orderId', type: 'bytes32' },
      { name: 'ids', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'deadline', type: 'uint256' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'redeemedOrders',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'Redeemed',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'orderId', type: 'bytes32', indexed: true },
      { name: 'ids', type: 'uint256[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
    ],
    anonymous: false,
  },
] as const

export function esmsChain() {
  return (process.env.NEXT_PUBLIC_ESMS_CHAIN || 'base-sepolia') === 'base' ? base : baseSepolia
}

/** CAIP-2 chain id, e.g. "eip155:8453" (Base) or "eip155:84532" (Base Sepolia). */
export function esmsCaip2(): string {
  return `eip155:${esmsChain().id}`
}

export function esmsContractAddress(): Address {
  const a = process.env.ESMS_CONTRACT_ADDRESS
  if (!a) throw new Error('ESMS_CONTRACT_ADDRESS is not set')
  return a as Address
}

export function esmsRpcUrl(): string | undefined {
  return esmsChain().id === base.id ? process.env.BASE_RPC_URL : process.env.BASE_SEPOLIA_RPC_URL
}

export function esmsPublicClient() {
  return createPublicClient({ chain: esmsChain(), transport: http(esmsRpcUrl()) })
}

export type OnchainEsms = { spirit: bigint; essence: bigint; matter: bigint; substance: bigint }

/** Read on-chain ESMS balances [spirit, essence, matter, substance] for an address. */
export async function readEsmsBalances(address: Address): Promise<OnchainEsms> {
  const accounts = ESMS_IDS.map(() => address)
  const res = (await esmsPublicClient().readContract({
    address: esmsContractAddress(),
    abi: ESMS_ABI,
    functionName: 'balanceOfBatch',
    args: [accounts, [...ESMS_IDS]],
  })) as readonly bigint[]
  return { spirit: res[0], essence: res[1], matter: res[2], substance: res[3] }
}

export async function readEsmsClaimed(claimId: `0x${string}`): Promise<boolean> {
  return esmsPublicClient().readContract({
    address: esmsContractAddress(),
    abi: ESMS_ABI,
    functionName: 'claimed',
    args: [claimId],
  })
}

/** Whether a shop redeem order has already been burned on-chain (idempotency read). */
export async function readEsmsRedeemed(orderId: `0x${string}`): Promise<boolean> {
  return esmsPublicClient().readContract({
    address: esmsContractAddress(),
    abi: ESMS_ABI,
    functionName: 'redeemedOrders',
    args: [orderId],
  })
}

/** True when the on-chain ESMS contract is configured (deployed + address set). */
export function esmsOnchainConfigured(): boolean {
  return Boolean(process.env.ESMS_CONTRACT_ADDRESS)
}

// ── EIP-712 RedeemAuthorization (holder consent for a sponsored redeemFor) ───────

/** EIP-712 domain for the deployed EsmsToken — must match EsmsToken.initialize("EsmsToken","1"). */
export function esmsEip712Domain() {
  return {
    name: 'EsmsToken',
    version: '1',
    chainId: esmsChain().id,
    verifyingContract: esmsContractAddress(),
  } as const
}

/** Must match EsmsToken.REDEEM_AUTH_TYPEHASH exactly. */
export const REDEEM_AUTH_TYPES = {
  RedeemAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'orderId', type: 'bytes32' },
    { name: 'ids', type: 'uint256[]' },
    { name: 'amounts', type: 'uint256[]' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const

/**
 * Build the typed-data challenge a buyer signs to authorize a sponsored {redeemFor}.
 * Numeric fields are returned as strings so the payload is JSON-safe over the wire;
 * the client converts ids/amounts/deadline back to bigint before signTypedData.
 */
export function buildRedeemAuthChallenge(params: {
  from: Address
  orderId: `0x${string}`
  values: bigint[]
  deadline: bigint
}) {
  const ids = [...ESMS_IDS]
  return {
    domain: {
      ...esmsEip712Domain(),
      chainId: esmsChain().id,
    },
    types: REDEEM_AUTH_TYPES,
    primaryType: 'RedeemAuthorization' as const,
    message: {
      from: params.from,
      orderId: params.orderId,
      ids: ids.map(String),
      amounts: params.values.map(String),
      deadline: params.deadline.toString(),
    },
  }
}
