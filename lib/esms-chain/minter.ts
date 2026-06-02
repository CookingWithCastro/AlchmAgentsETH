/**
 * ESMS minter — settles an off-chain claim on-chain by calling EsmsToken.claimMint.
 *
 * Custody (per decision): a **Privy server wallet** (no raw key) holds MINTER_ROLE —
 * configured via PRIVY_MINTER_WALLET_ID. A viem private-key signer (MINTER_PRIVATE_KEY)
 * is a fallback for local/testnet. The minter (backend) pays gas, so the user pays
 * nothing to claim (Phase 1 needs no paymaster).
 */

import {
  createWalletClient,
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
  esmsRpcUrl,
} from './contract'
import { getPrivyClient } from '@/lib/privy/server'

/** ESMS amounts as decimal strings (from the off-chain Decimal(12,4) ledger). */
export type EsmsAmounts = { spirit: string; essence: string; matter: string; substance: string }

/** Scale ledger decimals → 18-dp on-chain bigints, ordered [spirit, essence, matter, substance]. */
function toOnchainAmounts(a: EsmsAmounts): bigint[] {
  return [a.spirit, a.essence, a.matter, a.substance].map(v => parseUnits(v || '0', 18))
}

/**
 * Mint a settled claim. `claimId` is a bytes32 hex (also the off-chain idempotency
 * key); the contract rejects a repeat claimId, so retries never double-mint.
 * Returns the tx hash.
 */
export async function mintEsmsClaim(params: {
  to: Address
  claimId: Hex
  amounts: EsmsAmounts
}): Promise<Hex> {
  const { to, claimId, amounts } = params
  const contract = esmsContractAddress()
  const ids = [...ESMS_IDS]
  const values = toOnchainAmounts(amounts)
  const data = encodeFunctionData({
    abi: ESMS_ABI,
    functionName: 'claimMint',
    args: [to, claimId, ids, values],
  })

  // Preferred: Privy server wallet (no raw key, gas-sponsorable).
  const walletId = process.env.PRIVY_MINTER_WALLET_ID
  if (walletId) {
    const privy = getPrivyClient()
    // NOTE: verify the exact input shape against @privy-io/server-auth on first
    // testnet run (walletId/caip2/tx-field nesting); cast to satisfy types here.
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
  const pk = process.env.MINTER_PRIVATE_KEY
  if (pk) {
    const account = privateKeyToAccount(pk as Hex)
    const client = createWalletClient({
      account,
      chain: esmsChain(),
      transport: http(esmsRpcUrl()),
    })
    return client.sendTransaction({ to: contract, data })
  }

  throw new Error('ESMS minter not configured (set PRIVY_MINTER_WALLET_ID or MINTER_PRIVATE_KEY)')
}
