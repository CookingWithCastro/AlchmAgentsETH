/**
 * POST /api/world-id/verify — verify a World ID (IDKit) proof of personhood.
 *
 * Body: { proof: {merkle_root, nullifier_hash, proof, verification_level}, action,
 *         signalHash?, agentId? }
 *
 * On success returns the `nullifier` (unique per human+action). If `agentId` is
 * given and NameStone is configured, also stamps the agent's ENS `human-verified`
 * record (fire-and-forget) so the "operated by a verified unique human" badge
 * shows on-chain.
 *
 * TODO (persistence): store `nullifier` against the user/agent (add a
 * `world_id_nullifier` column) to enforce one-verified-human-per-action across
 * sessions — the verify endpoint only checks proof validity, not uniqueness.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { verifyWorldIdProof, type WorldIdProof } from '@/lib/worldid/verify'

export const dynamic = 'force-dynamic'

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

  // Optional: stamp the agent's ENS `human-verified` record (best-effort, non-blocking).
  const nullifier = result.nullifier
  if (agentId && nullifier && process.env.NAMESTONE_API_KEY && process.env.NAMESTONE_DOMAIN) {
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
    agentId,
  })
}
