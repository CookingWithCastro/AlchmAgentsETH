import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPrivyToken, getPrivyWallet, maskDid } from '@/lib/privy/server'

export const dynamic = 'force-dynamic'

/** GET — is the current user's Privy identity linked? Returns a masked DID. */
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { privyDid: true, walletAddress: true },
  })
  return NextResponse.json({
    connected: !!user?.privyDid,
    did: user?.privyDid ? maskDid(user.privyDid) : null,
    walletAddress: user?.walletAddress ?? null,
  })
}

/** POST { accessToken } — verify a Privy token and link its DID to the current user. */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { accessToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof body.accessToken !== 'string' || !body.accessToken) {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  let verified
  try {
    verified = await verifyPrivyToken(body.accessToken)
  } catch (err) {
    // Missing app id/secret → not configured.
    console.error('[account/privy] verification unavailable:', err)
    return NextResponse.json({ error: 'Privy verification is not configured' }, { status: 500 })
  }
  if (!verified) return NextResponse.json({ error: 'Invalid Privy token' }, { status: 401 })

  const { did } = verified
  // The DID is @unique — if it's already linked to a different account, reject.
  const existing = await prisma.users.findUnique({
    where: { privyDid: did },
    select: { id: true },
  })
  if (existing && existing.id !== userId) {
    return NextResponse.json(
      { error: 'This Privy identity is already linked to another account.' },
      { status: 409 }
    )
  }

  // Resolve the embedded wallet server-side from the verified DID (authoritative).
  const walletAddress = await getPrivyWallet(did)

  await prisma.users.update({
    where: { id: userId },
    data: { privyDid: did, ...(walletAddress ? { walletAddress } : {}) },
  })
  return NextResponse.json({ connected: true, did: maskDid(did), walletAddress })
}

/** DELETE — unlink the current user's Privy identity. */
export async function DELETE() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.users.update({
    where: { id: userId },
    data: { privyDid: null, walletAddress: null },
  })
  return NextResponse.json({ ok: true })
}
