/**
 * ESMS redeemer — settles a token-economy shop purchase on-chain by burning the
 * buyer's ESMS via EsmsToken.redeemFor.
 *
 * Custody mirrors the minter (per the same decision): a **Privy server wallet**
 * (no raw key) holds BURNER_ROLE — configured via PRIVY_REDEEMER_WALLET_ID
 * (falls back to PRIVY_MINTER_WALLET_ID when one key holds both roles). A viem
 * private-key signer (REDEEMER_PRIVATE_KEY / MINTER_PRIVATE_KEY) is the
 * local/testnet fallback. The settlement wallet (backend) pays gas, so the user
 * burns their ESMS without holding any native balance.
 *
 * Soulbound ESMS cannot be transferred, so a burn IS the spend: the user's
 * claimed on-chain balance (already debited off-chain at claim time) is the
 * authoritative pool for shop purchases — no second off-chain debit is needed.
 */

import {
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  http,
  parseUnits,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  ESMS_ABI,
  ESMS_IDS,
  esmsCaip2,
  esmsChain,
  esmsContractAddress,
  esmsPublicClient,
  esmsRpcUrl,
} from './contract'
import { getPrivyClient } from '@/lib/privy/server'

/** ESMS amounts as decimal strings (from the off-chain Decimal(12,4) ledger). */
export type EsmsAmounts = { spirit: string; essence: string; matter: string; substance: string }

/** Scale ledger decimals → 18-dp on-chain bigints, ordered [spirit, essence, matter, substance]. */
export function toOnchainAmounts(a: EsmsAmounts): bigint[] {
  return [a.spirit, a.essence, a.matter, a.substance].map(v => parseUnits(v || '0', 18))
}

/** True when a backend settlement (BURNER) wallet is configured for sponsored burns. */
export function redeemerConfigured(): boolean {
  return Boolean(
    process.env.PRIVY_REDEEMER_WALLET_ID ||
    process.env.PRIVY_MINTER_WALLET_ID ||
    process.env.REDEEMER_PRIVATE_KEY ||
    process.env.MINTER_PRIVATE_KEY
  )
}

/**
 * Burn a buyer's ESMS for a settled shop order (backend-sponsored, gas paid by
 * the settlement wallet). `orderId` is a bytes32 hex that the contract rejects on
 * repeat, so retries never double-burn. Returns the tx hash.
 */
export async function redeemEsmsFor(params: {
  from: Address
  orderId: Hex
  amounts: EsmsAmounts
  deadline: bigint
  sig: Hex
}): Promise<Hex> {
  const { from, orderId, amounts, deadline, sig } = params
  const contract = esmsContractAddress()
  const ids = [...ESMS_IDS]
  const values = toOnchainAmounts(amounts)
  const data = encodeFunctionData({
    abi: ESMS_ABI,
    functionName: 'redeemFor',
    args: [from, orderId, ids, values, deadline, sig],
  })

  // Preferred: Privy server wallet (no raw key, gas-sponsorable). Reuse the
  // minter wallet id when a single backend wallet holds both MINTER and BURNER.
  const walletId = process.env.PRIVY_REDEEMER_WALLET_ID || process.env.PRIVY_MINTER_WALLET_ID
  if (walletId) {
    const privy = getPrivyClient()
    const res = (await (privy as any).walletApi.ethereum.sendTransaction({
      walletId,
      caip2: esmsCaip2(),
      transaction: { to: contract, data },
    })) as { hash?: Hex; transactionHash?: Hex }
    const hash = res.hash ?? res.transactionHash
    if (!hash) throw new Error('Privy sendTransaction returned no hash')
    return hash
  }

  // Fallback: viem private-key signer (local/testnet).
  const pk = process.env.REDEEMER_PRIVATE_KEY || process.env.MINTER_PRIVATE_KEY
  if (pk) {
    const account = privateKeyToAccount(pk as Hex)
    const client = createWalletClient({
      account,
      chain: esmsChain(),
      transport: http(esmsRpcUrl()),
    })
    return client.sendTransaction({ to: contract, data })
  }

  throw new Error(
    'ESMS redeemer not configured (set PRIVY_REDEEMER_WALLET_ID/PRIVY_MINTER_WALLET_ID or REDEEMER_PRIVATE_KEY/MINTER_PRIVATE_KEY)'
  )
}

/**
 * Confirm a user-signed (or sponsored) redeem actually burned ESMS for `orderId`.
 * Waits for the receipt and verifies a {Redeemed} event with the expected
 * orderId (and optional buyer) was emitted by the ESMS contract. Returns false
 * on any mismatch, revert, or timeout — the caller must NOT fulfill without it.
 */
export async function verifyRedeem(params: {
  txHash: Hex
  orderId: Hex
  from?: Address
}): Promise<boolean> {
  const { txHash, orderId, from } = params
  const contract = esmsContractAddress().toLowerCase()
  try {
    const receipt = await esmsPublicClient().waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    })
    if (receipt.status !== 'success') return false
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contract) continue
      try {
        const ev = decodeEventLog({ abi: ESMS_ABI, data: log.data, topics: log.topics })
        if (ev.eventName !== 'Redeemed') continue
        const args = ev.args as { from: Address; orderId: Hex }
        if (args.orderId.toLowerCase() !== orderId.toLowerCase()) continue
        if (from && args.from.toLowerCase() !== from.toLowerCase()) continue
        return true
      } catch {
        // not the Redeemed event — keep scanning
      }
    }
    return false
  } catch (err) {
    console.error('[esms/redeemer] verifyRedeem failed:', err)
    return false
  }
}
