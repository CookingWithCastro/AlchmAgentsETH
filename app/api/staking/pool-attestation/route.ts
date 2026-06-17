/**
 * POST /api/staking/pool-attestation
 *
 * Opens a ConstellationAMM ESMS element-pair pool for a trader — but only while the pair's
 * planetary aspect is favorable AND the sky is risen. The attestor's signature IS the
 * "pool is open right now" gate (the AMM verifies it on seedLiquidity / swap).
 */

import { NextResponse } from 'next/server'
import { createPublicClient, http, isAddress, keccak256, toBytes } from 'viem'
import { arcChain } from '@/lib/staking/arc'
import {
  CONSTELLATION_AMM_ABI,
  CONSTELLATION_AMM_ADDRESS,
  constIdForPair,
  isAmmConfigured,
  pairLabel,
} from '@/lib/staking/amm'
import { aspectPools } from '@/lib/staking/aspects'
import { attestorAddress, signVisibilityAttestation } from '@/lib/staking/attestor'
import { eclipticToHorizontal } from '@/lib/staking/astro'
import { planetLongitudes } from '@/lib/staking/aspects'
import type { LivePlanet } from '@/lib/staking/types'

export const runtime = 'nodejs'

interface PoolReq {
  address: string
  constId: number
  observer: { lat: number; lon: number }
  planets: LivePlanet[]
}

export async function POST(req: Request) {
  let body: PoolReq
  try {
    body = (await req.json()) as PoolReq
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { address, constId, observer, planets = [] } = body ?? {}
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'valid `address` required' }, { status: 400 })
  }
  if (typeof constId !== 'number' || constId < 0 || constId > 5) {
    return NextResponse.json({ error: '`constId` 0..5 required' }, { status: 400 })
  }
  if (!observer || typeof observer.lat !== 'number') {
    return NextResponse.json({ error: '`observer` required' }, { status: 400 })
  }
  if (!isAmmConfigured()) {
    return NextResponse.json(
      { error: 'ConstellationAMM not deployed (set NEXT_PUBLIC_CONSTELLATION_AMM_ADDRESS)' },
      { status: 503 }
    )
  }
  if (!attestorAddress()) {
    return NextResponse.json({ error: 'attestor key not configured' }, { status: 503 })
  }

  // Gate 1: a favorable aspect must currently produce this pair.
  const active = aspectPools(planets).some(p => constIdForPair(p.ids[0], p.ids[1]) === constId)
  if (!active) {
    return NextResponse.json(
      {
        error: `${pairLabel(constId)} pool is closed — no favorable aspect forms this pair right now`,
      },
      { status: 409 }
    )
  }

  // Gate 2: the sky must be risen — count planets above the horizon.
  const now = new Date()
  const visibleStars = planetLongitudes(planets).filter(
    l => eclipticToHorizontal(l.longitude, observer, now).visible
  ).length
  if (visibleStars === 0) {
    return NextResponse.json({ error: 'no bodies risen — sky is set' }, { status: 409 })
  }

  // Read the trader's next attestation nonce from the AMM.
  const client = createPublicClient({ chain: arcChain, transport: http() })
  let nonce: bigint
  try {
    nonce = (await client.readContract({
      address: CONSTELLATION_AMM_ADDRESS,
      abi: CONSTELLATION_AMM_ABI,
      functionName: 'usedNonce',
      args: [constId, address as `0x${string}`], // per-(constellation,trader) nonce
    })) as bigint
  } catch (err) {
    return NextResponse.json(
      { error: `failed to read AMM: ${(err as Error).message}` },
      { status: 502 }
    )
  }

  const deadline = BigInt(Math.floor(now.getTime() / 1000) + 600)
  const regionCommit = keccak256(toBytes(`pentacle-pair:${constId}`))

  const signed = await signVisibilityAttestation({
    trader: address as `0x${string}`,
    constellationId: constId,
    regionCommit,
    visibleStars: Math.min(255, visibleStars),
    nonce,
    deadline,
  })

  return NextResponse.json({
    pair: pairLabel(constId),
    attestation: {
      trader: signed.claim.trader,
      constellationId: signed.claim.constellationId,
      regionCommit: signed.claim.regionCommit,
      visibleStars: signed.claim.visibleStars,
      nonce: signed.claim.nonce.toString(),
      deadline: signed.claim.deadline.toString(),
    },
    signature: signed.signature,
    attestor: signed.attestor,
    verifyingContract: signed.verifyingContract,
  })
}
