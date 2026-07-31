import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { PublicKey } from '@solana/web3.js'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifySolanaWalletBindingSignature } from '@/lib/web3/multi-chain-wallet'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SOLANA_NONCE = /^[A-Za-z0-9_-]{16,64}$/
const MAX_CHALLENGE_SECONDS = 15 * 60
const DEFAULT_CHALLENGE_SECONDS = 10 * 60

export async function GET() {
  const session = await auth()
  if (!session?.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const binding = await prisma.verifiedSolanaWallet.findUnique({
    where: { userId: session.user.id },
    select: { solanaPubKey: true, verifiedAt: true },
  })
  return NextResponse.json({ binding })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as Record<string, unknown>
    if (body.chain !== 'solana') {
      return NextResponse.json(
        { error: 'Only Solana wallet binding is supported' },
        { status: 400 }
      )
    }
    const wallet = new PublicKey(String(body.wallet ?? '')).toBase58()
    if (body.action === 'challenge') {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const deadline = BigInt(nowSeconds + DEFAULT_CHALLENGE_SECONDS)
      const nonce = randomBytes(24).toString('base64url')
      await prisma.solanaWalletChallenge.create({
        data: {
          nonce,
          userId: session.user.id,
          wallet,
          expiresAt: new Date(Number(deadline) * 1000),
        },
      })
      return NextResponse.json({
        challenge: {
          userId: session.user.id,
          wallet,
          nonce,
          deadline: deadline.toString(),
        },
      })
    }
    const userId = String(body.userId ?? '')
    const nonce = String(body.nonce ?? '')
    const signature = String(body.signature ?? '')
    const deadline = BigInt(String(body.deadline ?? ''))
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Wallet challenge user does not match session' },
        { status: 403 }
      )
    }
    if (!SOLANA_NONCE.test(nonce)) {
      return NextResponse.json({ error: 'Invalid Solana wallet challenge nonce' }, { status: 400 })
    }
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (deadline < now || deadline > now + BigInt(MAX_CHALLENGE_SECONDS)) {
      return NextResponse.json(
        { error: 'Wallet challenge expired or too far in the future' },
        { status: 400 }
      )
    }
    if (!verifySolanaWalletBindingSignature({ userId, wallet, nonce, deadline, signature })) {
      return NextResponse.json({ error: 'Invalid Ed25519 wallet signature' }, { status: 401 })
    }

    const challenge = await prisma.solanaWalletChallenge.findUnique({ where: { nonce } })
    if (
      !challenge ||
      challenge.userId !== userId ||
      challenge.wallet !== wallet ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() !== Number(deadline) * 1000
    ) {
      return NextResponse.json(
        { error: 'Wallet challenge is invalid or already used' },
        { status: 409 }
      )
    }

    const existingOwner = await prisma.verifiedSolanaWallet.findUnique({
      where: { solanaPubKey: wallet },
      select: { userId: true },
    })
    if (existingOwner && existingOwner.userId !== userId) {
      return NextResponse.json(
        { error: 'Solana wallet is already linked to another account' },
        { status: 409 }
      )
    }
    const binding = await prisma.$transaction(async transaction => {
      const consumed = await transaction.solanaWalletChallenge.updateMany({
        where: { nonce, consumedAt: null, expiresAt: { gte: new Date() } },
        data: { consumedAt: new Date() },
      })
      if (consumed.count !== 1) throw new Error('Wallet challenge was already consumed')
      return transaction.verifiedSolanaWallet.upsert({
        where: { userId },
        create: { userId, solanaPubKey: wallet, signature },
        update: { solanaPubKey: wallet, signature, verifiedAt: new Date() },
        select: { solanaPubKey: true, verifiedAt: true },
      })
    })
    return NextResponse.json({ verified: true, binding })
  } catch (error) {
    console.error('[verify-wallet] Solana binding failed', error)
    return NextResponse.json({ error: 'Invalid wallet binding request' }, { status: 400 })
  }
}
