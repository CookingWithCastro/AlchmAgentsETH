/**
 * Shared Dynamic→viem wallet plumbing for the Arc staking hooks. Builds a viem
 * WalletClient from the connected Dynamic wallet's EIP-1193 provider and best-effort
 * switches it to Arc. Used by useStarStaking / useZonePool / useArcWallet so the
 * connector wiring lives in one place.
 */

import { createWalletClient, custom } from 'viem'
import { ARC_CHAIN_ID, arcChain } from './arc'

interface DynamicWalletShape {
  address: string
  connector: { getProvider: () => Promise<unknown> }
  switchNetwork?: (chainId: number) => Promise<void>
}

/** Best-effort switch the connected wallet to Arc (no-op if it can't). */
export async function switchToArc(primaryWallet: unknown): Promise<void> {
  const pw = primaryWallet as DynamicWalletShape | null
  if (!pw) return
  try {
    await pw.switchNetwork?.(ARC_CHAIN_ID)
  } catch {
    /* wallet may need Arc added manually; the next tx will surface a clear error */
  }
}

/** A viem WalletClient bound to the Dynamic wallet + Arc chain. Throws if disconnected. */
export async function getArcWalletClient(primaryWallet: unknown) {
  const pw = primaryWallet as DynamicWalletShape | null
  if (!pw) throw new Error('Connect a wallet first')
  const provider = await pw.connector.getProvider()
  await switchToArc(pw)
  return createWalletClient({
    account: pw.address as `0x${string}`,
    chain: arcChain,
    transport: custom(provider as Parameters<typeof custom>[0]),
  })
}
