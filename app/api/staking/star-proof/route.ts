/**
 * GET /api/staking/star-proof?hipId=NNNN
 *
 * Returns the Merkle proof a first staker submits to StarVault.activateStar to "awaken"
 * a star (the long-tail registry path). Bright-catalogue stars are already admin-activated
 * and don't need this. 404 if the id is not in the committed registry.
 */

import { NextResponse } from 'next/server'
import { isRegisteredStar, starMerkleProof } from '@/lib/staking/star-registry'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const hipId = Number(new URL(req.url).searchParams.get('hipId'))
  if (!Number.isInteger(hipId) || hipId <= 0) {
    return NextResponse.json({ error: 'valid `hipId` query param required' }, { status: 400 })
  }
  if (!isRegisteredStar(hipId)) {
    return NextResponse.json(
      { error: 'star is not in the registry and cannot be activated' },
      { status: 404 }
    )
  }
  return NextResponse.json({ hipId, proof: starMerkleProof(hipId) })
}
