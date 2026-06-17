import { NextResponse } from 'next/server'
import type { Address, Hex } from 'viem'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getShopItem, foodHandoffUrl } from '@/lib/shop/catalog'
import { shopOrderId, isValidNonce } from '@/lib/shop/orders'
import { grantPurchase, hasUnlock } from '@/lib/shop/entitlement'
import { canAffordOnchain, costToAmountStrings, onchainShortfall } from '@/lib/shop/pricing'
import {
  buildRedeemAuthChallenge,
  esmsOnchainConfigured,
  readEsmsBalances,
  readEsmsRedeemed,
} from '@/lib/esms-chain/contract'
import {
  redeemEsmsFor,
  redeemerConfigured,
  toOnchainAmounts,
  verifyRedeem,
} from '@/lib/esms-chain/redeemer'

export const dynamic = 'force-dynamic'

const TX_PATTERN = /^0x[0-9a-f]{64}$/i

/**
 * POST /api/shop/purchase  { itemId, payWith?, nonce?, txHash? }
 *
 * Digital items (apothecary, recipe) settle with a real on-chain ESMS burn:
 *  - the soulbound ESMS the buyer claimed to chain IS the spendable pool, so a
 *    burn is the spend — no second off-chain debit.
 *  - a client-supplied `txHash` (the buyer's own wallet signed redeem) is
 *    verified against the {Redeemed} event; otherwise the backend BURNER wallet
 *    sponsors the burn via redeemFor (gas-paid, user needs no native balance).
 *  - the bytes32 orderId guards both the on-chain burn and the entitlement, so a
 *    retry never double-burns or double-grants.
 *
 * Food items hand off to the alchm.kitchen restaurant route (which owns ESMS
 * off-chain / USDC / Card settlement and restaurant payout).
 */
export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    itemId?: unknown
    payWith?: unknown
    nonce?: unknown
    txHash?: unknown
    signature?: unknown
    deadline?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const item = typeof body.itemId === 'string' ? getShopItem(body.itemId) : undefined
  if (!item) return NextResponse.json({ error: 'Unknown item' }, { status: 404 })

  // ── Food → bridge to the kitchen restaurant payment flow ──────────────────
  if (item.kind === 'food') {
    return NextResponse.json({ mode: 'bridge', url: foodHandoffUrl(item), itemId: item.id })
  }

  // ── Digital items: ESMS is the native rail; USDC/Card top up first ────────
  const payWith = body.payWith === 'usdc' || body.payWith === 'card' ? body.payWith : 'esms'
  if (payWith !== 'esms') {
    // Digital goods are priced in ESMS — route fiat buyers to the token store.
    return NextResponse.json({
      mode: 'topup',
      url: `/upgrade?reason=shop&item=${encodeURIComponent(item.id)}`,
      itemId: item.id,
    })
  }

  // One-time unlock already owned → idempotent success.
  if (!item.repeatable && (await hasUnlock(userId, item.id))) {
    return NextResponse.json({ ok: true, alreadyOwned: true, itemId: item.id })
  }

  // Repeatable items need a stable per-purchase nonce so retries reuse the order.
  if (item.repeatable && !isValidNonce(body.nonce)) {
    return NextResponse.json(
      { error: 'A stable `nonce` is required for repeatable items.' },
      { status: 400 }
    )
  }

  if (!esmsOnchainConfigured()) {
    return NextResponse.json(
      {
        error: 'On-chain ESMS is not deployed in this environment yet.',
        code: 'onchain_unconfigured',
      },
      { status: 503 }
    )
  }

  const user = await prisma.users
    .findUnique({ where: { id: userId }, select: { walletAddress: true } })
    .catch(() => null)
  const wallet = user?.walletAddress as Address | undefined
  if (!wallet) {
    return NextResponse.json(
      {
        error: 'Connect your wallet (Privy) and claim ESMS to chain before spending.',
        code: 'no_wallet',
      },
      { status: 400 }
    )
  }

  const orderId = shopOrderId(userId, item.id, item.repeatable ? (body.nonce as string) : undefined)
  const amounts = costToAmountStrings(item.esms)

  // Reconcile: if this order already burned on-chain, just (re)grant the entitlement.
  try {
    if (await readEsmsRedeemed(orderId)) {
      await grantPurchase({ userId, item, orderId })
      return NextResponse.json({ ok: true, itemId: item.id, orderId, reconciled: true })
    }
  } catch (err) {
    console.warn('[api/shop/purchase] redeemedOrders read failed (continuing):', err)
  }

  // ── Path A: buyer's wallet already signed the redeem; verify and grant ────
  const txHash =
    typeof body.txHash === 'string' && TX_PATTERN.test(body.txHash) ? (body.txHash as Hex) : null
  if (txHash) {
    const ok = await verifyRedeem({ txHash, orderId, from: wallet })
    if (!ok) {
      return NextResponse.json(
        { error: 'Could not verify the on-chain ESMS burn for this order.', code: 'verify_failed' },
        { status: 502 }
      )
    }
    await grantPurchase({ userId, item, orderId, txHash })
    return NextResponse.json({ ok: true, itemId: item.id, orderId, txHash })
  }

  // ── Path B: backend-sponsored burn (BURNER wallet pays gas) ───────────────
  let balances
  try {
    balances = await readEsmsBalances(wallet)
  } catch (err) {
    console.error('[api/shop/purchase] balance read failed:', err)
    return NextResponse.json(
      { error: 'Could not read your on-chain ESMS balance.', code: 'balance_unavailable' },
      { status: 502 }
    )
  }

  if (!canAffordOnchain(balances, item.esms)) {
    return NextResponse.json(
      {
        error: 'Insufficient on-chain ESMS. Claim more to chain, then try again.',
        code: 'insufficient_esms',
        shortfall: onchainShortfall(balances, item.esms),
      },
      { status: 402 }
    )
  }

  if (!redeemerConfigured()) {
    return NextResponse.json(
      {
        error: 'ESMS settlement wallet is not configured for this deployment.',
        code: 'redeemer_unconfigured',
      },
      { status: 503 }
    )
  }

  // The buyer must authorize the sponsored burn with an EIP-712 RedeemAuthorization
  // (gasless — a signature, not a tx). Without one, hand the client a signing challenge.
  const sig =
    typeof body.signature === 'string' && /^0x[0-9a-fA-F]+$/.test(body.signature)
      ? (body.signature as Hex)
      : null
  if (!sig || body.deadline === undefined) {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
    return NextResponse.json({
      mode: 'sign',
      itemId: item.id,
      orderId,
      deadline: deadline.toString(),
      challenge: buildRedeemAuthChallenge({
        from: wallet,
        orderId,
        values: toOnchainAmounts(amounts),
        deadline,
      }),
    })
  }

  let deadline: bigint
  try {
    deadline = BigInt(String(body.deadline))
  } catch {
    return NextResponse.json({ error: 'Invalid deadline.', code: 'bad_deadline' }, { status: 400 })
  }
  if (deadline < BigInt(Math.floor(Date.now() / 1000))) {
    return NextResponse.json(
      { error: 'Signing window expired — try again.', code: 'sig_expired' },
      { status: 400 }
    )
  }

  try {
    const burnTx = await redeemEsmsFor({ from: wallet, orderId, amounts, deadline, sig })
    await grantPurchase({ userId, item, orderId, txHash: burnTx })
    return NextResponse.json({ ok: true, itemId: item.id, orderId, txHash: burnTx })
  } catch (err) {
    // No grant on failure. The on-chain redeemedOrders guard + the reconcile
    // branch above make a retry safe even if the burn actually landed.
    console.error('[api/shop/purchase] sponsored burn failed (retryable):', err)
    return NextResponse.json(
      { error: 'On-chain ESMS burn failed — retry shortly.', code: 'burn_failed', retryable: true },
      { status: 502 }
    )
  }
}
