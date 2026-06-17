/**
 * POST /api/staking/claim-attestation
 *
 * The "Pentacles feeder": given a staker + star, verifies the on-chain stake and the
 * star's live horizon visibility, computes the accrued ESMS (the multiplicative rate
 * over one bounded, single-use claim window), and returns an attestor-signed
 * {StarYield} the client submits to StarVault.claimYield.
 *
 * Demo-grade trust: the attestor is the rate authority. Each claim accrues at most one
 * window (STAKING_CLAIM_WINDOW_DAYS) and the on-chain single-use nonce prevents replay;
 * the star must be risen *now* to claim. Live planets/natal are supplied by the client
 * and only ever clamped — a production feeder would recompute from its own ephemeris.
 */

import { NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits, isAddress } from 'viem'
import {
  arcChain,
  STAR_VAULT_ABI,
  STAR_VAULT_ADDRESS,
  isStarVaultConfigured,
} from '@/lib/staking/arc'
import { signStarYield, attestorAddress } from '@/lib/staking/attestor'
import { toStakeableStar } from '@/lib/staking/elements'
import { starAltitude } from '@/lib/staking/visibility'
import { computeYieldRate, accruedEsms } from '@/lib/staking/yield-rate'
import { ascendantLongitude, isStarOnAscendant } from '@/lib/staking/ascendant'
import type { LivePlanet, NatalAffinity } from '@/lib/staking/types'

export const runtime = 'nodejs'

const CLAIM_WINDOW_DAYS = Number(process.env.STAKING_CLAIM_WINDOW_DAYS ?? '1')

interface ClaimRequest {
  address: string
  star: {
    hipId: number
    name?: string
    ra: number
    dec: number
    magnitude?: number
    regionHint?: number
  }
  observer: { lat: number; lon: number }
  planets?: LivePlanet[]
  natal?: NatalAffinity | null
}

/** Fraction of a sidereal day a star spends above the horizon at latitude `lat`. */
function visibleFraction(decDeg: number, latDeg: number): number {
  const dec = (decDeg * Math.PI) / 180
  const lat = (latDeg * Math.PI) / 180
  const x = -Math.tan(lat) * Math.tan(dec)
  if (x <= -1) return 1 // circumpolar (always up)
  if (x >= 1) return 0 // never rises
  return Math.acos(x) / Math.PI
}

export async function POST(req: Request) {
  let body: ClaimRequest
  try {
    body = (await req.json()) as ClaimRequest
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { address, star, observer, planets = [], natal = null } = body ?? {}
  if (!address || !isAddress(address)) {
    return NextResponse.json({ error: 'valid `address` required' }, { status: 400 })
  }
  if (!star || typeof star.ra !== 'number' || typeof star.dec !== 'number') {
    return NextResponse.json({ error: '`star` with ra/dec required' }, { status: 400 })
  }
  if (!observer || typeof observer.lat !== 'number' || typeof observer.lon !== 'number') {
    return NextResponse.json({ error: '`observer` lat/lon required' }, { status: 400 })
  }
  if (!isStarVaultConfigured()) {
    return NextResponse.json(
      { error: 'StarVault not deployed (set NEXT_PUBLIC_STAR_VAULT_ADDRESS)' },
      { status: 503 }
    )
  }
  if (!attestorAddress()) {
    return NextResponse.json(
      { error: 'attestor key not configured (set ARC_ATTESTOR_PRIVATE_KEY)' },
      { status: 503 }
    )
  }

  // Gate: the star must be above the horizon right now.
  const now = new Date()
  const alt = starAltitude(star.ra, star.dec, observer.lat, observer.lon, now)
  if (!alt.visible) {
    return NextResponse.json(
      {
        error: 'star has set — yield can only be claimed while it is risen',
        altitudeDeg: alt.altitudeDeg,
      },
      { status: 409 }
    )
  }

  const enriched = toStakeableStar({
    hipId: star.hipId,
    name: star.name ?? `HIP ${star.hipId}`,
    ra: star.ra,
    dec: star.dec,
    magnitude: star.magnitude ?? 2,
    heldBy: null,
    regionHint: star.regionHint ?? 0,
  })

  // Read on-chain principal, per-star nonce, and the on-chain yield cap.
  const client = createPublicClient({ chain: arcChain, transport: http() })
  let principalRaw: bigint
  let nonce: bigint
  let cap: bigint
  try {
    ;[principalRaw, nonce, cap] = await Promise.all([
      client.readContract({
        address: STAR_VAULT_ADDRESS,
        abi: STAR_VAULT_ABI,
        functionName: 'principalOf',
        args: [enriched.hipId, address as `0x${string}`],
      }) as Promise<bigint>,
      client.readContract({
        address: STAR_VAULT_ADDRESS,
        abi: STAR_VAULT_ABI,
        functionName: 'usedNonce',
        args: [enriched.hipId, address as `0x${string}`], // per-(star,staker) nonce
      }) as Promise<bigint>,
      client.readContract({
        address: STAR_VAULT_ADDRESS,
        abi: STAR_VAULT_ABI,
        functionName: 'yieldCap',
        args: [enriched.hipId, address as `0x${string}`],
      }) as Promise<bigint>,
    ])
  } catch (err) {
    return NextResponse.json(
      { error: `failed to read vault: ${(err as Error).message}` },
      { status: 502 }
    )
  }

  const principalUsdc = Number(formatUnits(principalRaw, 6))
  if (principalUsdc <= 0) {
    return NextResponse.json({ error: 'no stake on this star' }, { status: 409 })
  }

  // Multiplicative rate (clamped) over one bounded, visibility-weighted window.
  const rate = computeYieldRate({ star: enriched, planets, natal, observer, at: now })
  const frac = visibleFraction(star.dec, observer.lat)
  const elapsedVisibleSeconds = CLAIM_WINDOW_DAYS * 86_400 * frac
  let amount = accruedEsms(principalUsdc, rate.dailyRatePerUsdc, elapsedVisibleSeconds)

  // Shooting-star burst: a star on the ascendant right now mints an extra ~½-day of yield.
  const onAscendant = isStarOnAscendant(enriched, ascendantLongitude(observer, now))
  let burst = 0n
  if (onAscendant) {
    burst = accruedEsms(principalUsdc, rate.dailyRatePerUsdc, 0.5 * 86_400)
    amount += burst
  }

  if (amount <= 0n) {
    return NextResponse.json({ error: 'no yield accrued yet' }, { status: 409 })
  }

  // Clamp to the on-chain cap (principal × maxRate × elapsed-since-last-claim) so the
  // signed claim can never exceed what StarVault.claimYield will accept. The cap only
  // grows until the next claim resets it, so clamping at sign-time is safe.
  if (cap <= 0n) {
    return NextResponse.json(
      { error: 'no claimable yield yet — accrual window just opened, try again shortly' },
      { status: 409 }
    )
  }
  const capped = amount > cap
  if (capped) amount = cap

  const deadline = BigInt(Math.floor(now.getTime() / 1000) + 600)
  const signed = await signStarYield({
    staker: address as `0x${string}`,
    starId: enriched.hipId,
    element: enriched.esmsId,
    amount,
    nonce,
    deadline,
  })

  return NextResponse.json({
    claim: {
      staker: signed.claim.staker,
      starId: signed.claim.starId,
      element: signed.claim.element,
      amount: signed.claim.amount.toString(),
      nonce: signed.claim.nonce.toString(),
      deadline: signed.claim.deadline.toString(),
    },
    signature: signed.signature,
    attestor: signed.attestor,
    verifyingContract: signed.verifyingContract,
    rate: {
      element: rate.element,
      esmsId: rate.esmsId,
      apyPct: rate.apyPct,
      zoneDominance: rate.zoneDominance,
      chartAffinity: rate.chartAffinity,
      planetDignity: rate.planetDignity,
      visibleFraction: frac,
      altitudeDeg: rate.altitudeDeg,
      onAscendant,
      burst: burst.toString(),
      capped, // true if the on-chain yield cap clamped the accrued amount
      cap: cap.toString(),
    },
  })
}
