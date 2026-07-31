import { getAddress } from 'viem'

export const AAE_BASE_SEPOLIA_ESMS_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_ESMS_ADDRESS ?? '0x124ECa1bb1E106D3614A22A256f9A412FfeEAd8F'
)

export const BASE_SEPOLIA_ESMS_ABI = [
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
] as const

export function formatEvmEsmsAmount(raw: bigint): string {
  if (raw < 0n) throw new RangeError('ESMS token balances cannot be negative')
  const scale = 10n ** 18n
  const whole = raw / scale
  const fraction = (raw % scale).toString().padStart(18, '0').slice(0, 4)
  return `${whole}.${fraction}`
}
