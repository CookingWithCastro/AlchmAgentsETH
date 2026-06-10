import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toHex, type Address, type Hex } from 'viem'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncDebitToAlchm } from '@/lib/alchm-debit-sync'
import { mintEsmsClaim } from '@/lib/esms-chain/minter'
import { readEsmsClaimed } from '@/lib/esms-chain/contract'

export const dynamic = 'force-dynamic'

const CLAIM_ID_PATTERN = /^0x[0-9a-f]{64}$/i

/**
 * Claim off-chain ESMS to the user's Base wallet. Debit-first (authoritative
 * off-chain ledger), then mint on-chain. Both keyed by the same `claimId` →
 * idempotent end to end; a mint failure never grants free tokens (retryable).
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  const email = session?.user?.email
  if (!userId || !email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  })
  if (!user?.walletAddress) {
    return NextResponse.json(
      { error: 'Connect your wallet (Privy) before claiming.' },
      { status: 400 }
    )
  }

  let body: { amounts?: Record<string, unknown>; claimId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestedClaimId =
    typeof body.claimId === 'string' && CLAIM_ID_PATTERN.test(body.claimId) ? body.claimId : null
  if (body.claimId && !requestedClaimId) {
    return NextResponse.json({ error: 'Invalid claimId' }, { status: 400 })
  }

  const existingClaim = requestedClaimId
    ? await prisma.esms_claims.findUnique({ where: { id: requestedClaimId } })
    : null
  if (requestedClaimId && (!existingClaim || existingClaim.userId !== userId)) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
  }
  if (existingClaim?.status === 'minted' && existingClaim.txHash) {
    return NextResponse.json({ ok: true, claimId: existingClaim.id, txHash: existingClaim.txHash })
  }

  const clamp = (value: unknown) => {
    const v = Number(value ?? 0)
    return Number.isFinite(v) && v > 0 ? v : 0
  }
  const fromClaim = (value: unknown) => clamp(String(value ?? 0))
  const amounts = existingClaim
    ? {
        spirit: fromClaim(existingClaim.spirit),
        essence: fromClaim(existingClaim.essence),
        matter: fromClaim(existingClaim.matter),
        substance: fromClaim(existingClaim.substance),
      }
    : {
        spirit: clamp(body.amounts?.spirit),
        essence: clamp(body.amounts?.essence),
        matter: clamp(body.amounts?.matter),
        substance: clamp(body.amounts?.substance),
      }
  if (amounts.spirit + amounts.essence + amounts.matter + amounts.substance <= 0) {
    return NextResponse.json({ error: 'Nothing to claim' }, { status: 400 })
  }

  const claimId = (existingClaim?.id || keccak256(toHex(`${userId}:${randomUUID()}`))) as Hex
  const walletAddress = (existingClaim?.walletAddress || user.walletAddress) as Address
  const network = existingClaim?.network || process.env.NEXT_PUBLIC_ESMS_CHAIN || 'base-sepolia'
  const amountStrings = {
    spirit: String(amounts.spirit),
    essence: String(amounts.essence),
    matter: String(amounts.matter),
    substance: String(amounts.substance),
  }

  if (!existingClaim) {
    await prisma.esms_claims.create({
      data: { id: claimId, userId, walletAddress, ...amounts, status: 'pending', network },
    })
  }

  // 1) Debit off-chain FIRST (authoritative; idempotent by claimId; never throws).
  if (existingClaim?.status !== 'debited') {
    const debit = await syncDebitToAlchm({
      userEmail: email,
      amounts: amountStrings,
      operationType: 'onchain_claim',
      source: 'onchain_claim',
      idempotencyKey: claimId,
      metadata: {
        agentName: 'onchain_claim',
        actionType: 'esms_onchain_claim',
        activationScore: 0,
        triggers: [],
      },
    })
    if (!debit.ok) {
      const code = debit.reason === 'insufficient_funds' ? 402 : debit.skipped ? 503 : 502
      await prisma.esms_claims.update({
        where: { id: claimId },
        data: { status: 'failed', error: debit.error || debit.reason || 'debit failed' },
      })
      return NextResponse.json(
        {
          error:
            debit.reason === 'insufficient_funds'
              ? 'Insufficient off-chain balance'
              : debit.error || 'Off-chain debit failed',
        },
        { status: code }
      )
    }
    await prisma.esms_claims.update({
      where: { id: claimId },
      data: { status: 'debited', error: null },
    })
  }

  // 2) Mint on-chain (idempotent by claimId; the backend minter pays gas).
  try {
    const txHash = await mintEsmsClaim({ to: walletAddress, claimId, amounts: amountStrings })
    await prisma.esms_claims.update({
      where: { id: claimId },
      data: { status: 'minted', txHash, error: null },
    })
    return NextResponse.json({ ok: true, claimId, txHash })
  } catch (err) {
    // Off-chain debit already applied — leave status 'debited' for retry; the on-chain
    // claimId guard prevents a double-mint on retry.
    console.error('[esms/claim] mint failed after debit (retryable):', err)
    try {
      if (await readEsmsClaimed(claimId)) {
        await prisma.esms_claims.update({
          where: { id: claimId },
          data: { status: 'minted', error: null },
        })
        return NextResponse.json({ ok: true, claimId, txHash: existingClaim?.txHash ?? null })
      }
    } catch (reconciliationError) {
      console.warn('[esms/claim] could not reconcile claim state:', reconciliationError)
    }
    await prisma.esms_claims.update({
      where: { id: claimId },
      data: { error: 'mint failed (retryable)' },
    })
    return NextResponse.json(
      {
        error: 'Off-chain balance debited; on-chain mint pending — retry shortly.',
        claimId,
        retryable: true,
      },
      { status: 502 }
    )
  }
}
