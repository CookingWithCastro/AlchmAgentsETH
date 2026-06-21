/**
 * Arc-testnet chain params, StarVault / USDC ABIs, and the EIP-712 StarYield typed-data
 * spec. Shared by the frontend (stake/unstake/claim txs) and the server attestor.
 */

import { defineChain } from 'viem'
import { ARC_TESTNET } from '@/lib/erc8004/registry'
import { PENTACLES_ARC_TESTNET_DEPLOYMENT } from './deployment'

export const arcChain = defineChain({
  id: ARC_TESTNET.id,
  name: ARC_TESTNET.name,
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [ARC_TESTNET.rpcUrl] },
    public: { http: [ARC_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: ARC_TESTNET.explorer },
  },
  testnet: true,
})

export const ARC_CHAIN_ID = ARC_TESTNET.id
export const ARC_USDC = ARC_TESTNET.usdc as `0x${string}`

/** Deployed addresses (set after running DeployStarVault.s.sol). */
export const STAR_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_STAR_VAULT_ADDRESS ??
  PENTACLES_ARC_TESTNET_DEPLOYMENT.starVault) as `0x${string}`
export const ARC_ESMS_ADDRESS = (process.env.NEXT_PUBLIC_ARC_ESMS_ADDRESS ??
  PENTACLES_ARC_TESTNET_DEPLOYMENT.esms) as `0x${string}`

export function isStarVaultConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(STAR_VAULT_ADDRESS)
}

/** USDC (6-dp) decimals — Arc's gas token exposes a standard ERC-20 surface. */
export const USDC_DECIMALS = 6

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

/** Minimal ERC-1155 read surface for the Arc ESMS token (soulbound Spirit/Essence/Matter/Substance). */
export const ESMS_ERC1155_ABI = [
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
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export function isArcEsmsConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(ARC_ESMS_ADDRESS)
}

const STAR_YIELD_TUPLE = {
  name: 'y',
  type: 'tuple',
  components: [
    { name: 'staker', type: 'address' },
    { name: 'starId', type: 'uint32' },
    { name: 'element', type: 'uint8' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint64' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const

export const STAR_VAULT_ABI = [
  {
    type: 'function',
    name: 'stake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'usdcAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'unstake',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'shares', type: 'uint256' },
    ],
    outputs: [{ name: 'usdcAmount', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimYield',
    stateMutability: 'nonpayable',
    inputs: [STAR_YIELD_TUPLE, { name: 'sig', type: 'bytes' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'sharesOf',
    stateMutability: 'view',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'staker', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'principalOf',
    stateMutability: 'view',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'staker', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'sharePrice',
    stateMutability: 'view',
    inputs: [{ name: 'starId', type: 'uint32' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'usedNonce',
    stateMutability: 'view',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'staker', type: 'address' },
    ],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'yieldCap',
    stateMutability: 'view',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'staker', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'starActivated',
    stateMutability: 'view',
    inputs: [{ name: 'starId', type: 'uint32' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'activateStar',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'starId', type: 'uint32' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pools',
    stateMutability: 'view',
    inputs: [{ name: 'starId', type: 'uint32' }],
    outputs: [
      { name: 'totalPrincipal', type: 'uint256' },
      { name: 'totalShares', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'Staked',
    inputs: [
      { name: 'starId', type: 'uint32', indexed: true },
      { name: 'staker', type: 'address', indexed: true },
      { name: 'usdcAmount', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'YieldClaimed',
    inputs: [
      { name: 'starId', type: 'uint32', indexed: true },
      { name: 'staker', type: 'address', indexed: true },
      { name: 'element', type: 'uint8', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const

/** EIP-712 domain for a deployed StarVault on Arc. */
export function starYieldDomain(verifyingContract: `0x${string}`) {
  return {
    name: 'StarVault',
    version: '1',
    chainId: ARC_CHAIN_ID,
    verifyingContract,
  } as const
}

/** EIP-712 type spec — must match StarVault.YIELD_TYPEHASH exactly. */
export const STAR_YIELD_TYPES = {
  StarYield: [
    { name: 'staker', type: 'address' },
    { name: 'starId', type: 'uint32' },
    { name: 'element', type: 'uint8' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint64' },
    { name: 'deadline', type: 'uint64' },
  ],
} as const
