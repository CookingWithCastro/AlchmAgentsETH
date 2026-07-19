/**
 * POST /api/world-id/verify — verify a World ID (IDKit) proof of personhood.
 *
 * Body: { proof: {merkle_root, nullifier_hash, proof, verification_level}, action,
 *         signalHash?, agentId? }
 *
 * On success persists the `nullifier` (unique per human+action) to
 * world_id_verifications, binding it to the signed-in user when a session
 * exists. A nullifier already bound to a DIFFERENT account is rejected (409) —
 * that is the sybil-resistance the badge claims. If `agentId` is given and
 * NameStone is configured, also stamps the agent's ENS `human-verified` record
 * (fire-and-forget). Mock/bypass verifications are never persisted or stamped.
 *
 * GET /api/world-id/verify — verification status for the signed-in user.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { verifyWorldIdProof, type WorldIdProof } from '@/lib/worldid/verify'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth().catch(() => null)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ verified: false, reason: 'not signed in' })
  }
  const row = await prisma.world_id_verifications
    .findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
    .catch(() => null)
  return NextResponse.json({
    verified: Boolean(row),
    nullifier: row?.nullifier,
    verificationLevel: row?.verificationLevel,
    action: row?.action,
  })
}

export async function POST(req: NextRequest) {
  let body: {
    proof?: WorldIdProof
    action?: string
    signalHash?: string
    agentId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { proof, action, signalHash, agentId } = body ?? {}
  if (!proof?.nullifier_hash || !proof?.proof) {
    return NextResponse.json({ success: false, error: 'proof is required' }, { status: 400 })
  }
  const resolvedAction = action ?? process.env.NEXT_PUBLIC_WORLD_ACTION
  if (!resolvedAction) {
    return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 })
  }

  const result = await verifyWorldIdProof(proof, { action: resolvedAction, signalHash })
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.detail ?? 'verification failed' },
      { status: 400 }
    )
  }

  const nullifier = result.nullifier
  const session = await auth().catch(() => null)
  const userId = session?.user?.id ?? null

  // Persist + enforce uniqueness (skip entirely for mock/bypass results).
  if (nullifier && !result.mock) {
    try {
      const existing = await prisma.world_id_verifications.findUnique({ where: { nullifier } })
      if (existing?.userId && userId && existing.userId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'This World ID is already bound to another account.',
            code: 'nullifier_bound',
          },
          { status: 409 }
        )
      }
      await prisma.world_id_verifications.upsert({
        where: { nullifier },
        create: {
          nullifier,
          action: resolvedAction,
          userId,
          agentId: agentId ?? null,
          verificationLevel: result.verificationLevel ?? null,
        },
        update: {
          // Bind to the user on first authenticated verify; never rebind.
          ...(existing?.userId ? {} : { userId }),
          ...(agentId ? { agentId } : {}),
          verificationLevel: result.verificationLevel ?? undefined,
        },
      })
    } catch (err) {
      // Persistence failure must not un-verify a valid proof, but say so.
      console.error('[world-id] nullifier persistence failed:', err)
    }
  }

  // Optional: stamp the agent's ENS `human-verified` record (best-effort,
  // non-blocking, and NEVER from a mock verification).
  if (
    agentId &&
    nullifier &&
    !result.mock &&
    process.env.NAMESTONE_API_KEY &&
    process.env.NAMESTONE_DOMAIN
  ) {
    import('@/lib/namestone')
      .then(async ({ mergeSetSubname }) => {
        const { ensLabel, AGENT_HUMAN_VERIFIED_KEY } = await import('@/lib/erc8004/ensip')
        // merge-write ONLY the human-verified key — a full-record write here
        // would clobber agent-endpoint/agent-wallet records from other flows.
        await mergeSetSubname({
          name: ensLabel(agentId),
          textRecords: { [AGENT_HUMAN_VERIFIED_KEY]: nullifier },
        })
      })
      .catch(err => console.warn('[world-id] ENS human-verified stamp skipped:', err))
  }

  return NextResponse.json({
    success: true,
    nullifier: result.nullifier,
    verificationLevel: result.verificationLevel,
    mock: result.mock ?? false,
    agentId,
  })
}
