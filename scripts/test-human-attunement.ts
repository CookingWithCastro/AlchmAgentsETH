/**
 * LIVE dry-run for the HUMAN transit-attunement → alchm.kitchen credit path.
 * (No mocks — this hits the real `${ALCHM_KITCHEN_SYNC_URL}/api/economy/sync-credit`.)
 *
 * Human ESMS wallets live on alchm.kitchen's Railway DB, NOT this repo's Neon DB.
 * `runTransitAttunements()` credits humans over the authenticated sync endpoint
 * (per-axis) and keeps only the degree-sprite reservoir decrement + a daily-cap
 * marker on Neon.
 *
 * To exercise the real endpoint without pre-provisioning a human, the throwaway
 * user is given a `@agentic.alchm.kitchen` email (which alchm.kitchen auto-
 * provisions on first contact) while staying `isAgentic: false` on the Neon side
 * so the HUMAN branch of attune() is taken (the branch is decided by Neon
 * `isAgentic`, the Railway lookup by email).
 *
 * Run:  bun --conditions react-server scripts/test-human-attunement.ts
 *   (the `--conditions react-server` flag neutralises `server-only` in lib/db.ts)
 *
 * Requires ALCHM_KITCHEN_SYNC_URL + ALCHM_KITCHEN_SYNC_SECRET. If the secret is
 * unset (or WTEN's sync-credit doesn't yet accept source:transit_attunement),
 * the script skips with an actionable message instead of failing cryptically.
 */

import { prisma } from '@/lib/db'
import { runTransitAttunements } from '@/lib/agents/transit-attunement'
import { syncCreditToAlchm } from '@/lib/alchm-credit-sync'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { BESTOW_FRACTION } from '@/lib/agents/agent-type-model'

// Agentic-domain email → auto-provisions on alchm.kitchen. Neon row stays human.
const TEST_EMAIL = 'transit-attune-probe@agentic.alchm.kitchen'
const HUMAN_START = 10.0 // seed the human's Neon balance to PROVE it stays untouched
const RESERVOIR = 100.0

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`)
}

const approx = (a: number, b: number, eps = 0.0001): boolean => Math.abs(a - b) <= eps

/**
 * Best-effort live balance read (informational, non-fatal). alchm.kitchen MAY
 * expose `GET /api/economy/balance?email=` behind the same X-Sync-Secret; if it
 * doesn't, we just skip the numeric delta and rely on the 409 idempotency proof.
 */
async function readAlchmBalance(
  baseUrl: string,
  secret: string,
  email: string
): Promise<{ spirit: number; essence: number; matter: number; substance: number } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)
  try {
    const res = await fetch(`${baseUrl}/api/economy/balance?email=${encodeURIComponent(email)}`, {
      headers: { 'X-Sync-Secret': secret },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const b = data?.balances ?? data
    if (!b || typeof b.spirit === 'undefined') return null
    return {
      spirit: Number(b.spirit),
      essence: Number(b.essence),
      matter: Number(b.matter),
      substance: Number(b.substance),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const baseUrl = (
    process.env.ALCHM_KITCHEN_SYNC_URL ||
    process.env.ALCHM_KITCHEN_API_BASE_URL ||
    ''
  ).replace(/\/$/, '')
  const secret = process.env.ALCHM_KITCHEN_SYNC_SECRET || ''

  if (!baseUrl || !secret) {
    console.log('⏭️  SKIP — live alchm.kitchen sync is not configured.')
    console.log(
      '    Need ALCHM_KITCHEN_SYNC_URL + ALCHM_KITCHEN_SYNC_SECRET (the latter is unset here).'
    )
    console.log(
      '    Set both (and ensure WTEN /api/economy/sync-credit handles source:transit_attunement)'
    )
    console.log('    then re-run:  bun --conditions react-server scripts/test-human-attunement.ts')
    return
  }

  console.log(`🚀 LIVE dry-run (no mocks) → ${baseUrl}/api/economy/sync-credit`)

  let testUserId = ''
  let degreeUserId = ''
  let spritePrevBalance: Awaited<ReturnType<typeof prisma.tokenBalance.findUnique>> = null
  let spriteBalanceExistedBefore = false
  let spriteUserExistedBefore = false

  try {
    // 1. Pick a live transiting planet to build a guaranteed conjunction against.
    const transits = getCurrentPlanetaryPositions()
    const activePlanets = Object.keys(transits)
    assert(activePlanets.length > 0, 'no active transiting planets found')
    const targetPlanet = activePlanets[0]!
    const targetPos = transits[targetPlanet]!
    const targetSign = targetPos.sign
    const targetDegree = targetPos.degree
    console.log(`📡 Selected transit: ${targetPlanet} at ${targetSign} ${targetDegree}°`)

    // 2. Create a throwaway "human" (isAgentic:false) whose natal point sits on it.
    const existing = await prisma.users.findUnique({
      where: { email: TEST_EMAIL },
      select: { id: true },
    })
    if (existing) {
      await prisma.tokenTransaction.deleteMany({ where: { userId: existing.id } })
      await prisma.tokenBalance.deleteMany({ where: { userId: existing.id } })
      await prisma.user_profiles.deleteMany({ where: { userId: existing.id } })
      await prisma.users.delete({ where: { id: existing.id } })
    }
    const testUser = await prisma.users.create({
      data: { email: TEST_EMAIL, isAgentic: false, role: 'user', name: 'Transit Attune Probe' },
    })
    testUserId = testUser.id
    await prisma.user_profiles.create({
      data: {
        userId: testUser.id,
        birthDate: new Date(),
        birthLocation: {},
        natalChart: {},
        monicaConstant: 1.0,
        dominantElement: 'Fire',
        natalPositions: [{ planet: targetPlanet, sign: targetSign, degree: targetDegree }],
      },
    })
    await prisma.tokenBalance.create({
      data: {
        userId: testUser.id,
        spirit: HUMAN_START,
        essence: HUMAN_START,
        matter: HUMAN_START,
        substance: HUMAN_START,
        updatedAt: new Date(),
      },
    })

    // 3. Degree sprite reservoir. Snapshot prior state (user + balance independently)
    //    so we restore a real sky sprite exactly and never delete a real user.
    const degreeAgentId = `planetary-${targetPlanet.toLowerCase()}-${targetSign.toLowerCase()}-${Math.round(targetDegree)}`
    const degreeEmail = `${degreeAgentId}@agentic.alchm.kitchen`
    console.log(`🧚 Borrowing degree sprite: ${degreeAgentId} (${degreeEmail})`)
    const existingSprite = await prisma.users.findUnique({
      where: { email: degreeEmail },
      select: { id: true },
    })
    spriteUserExistedBefore = Boolean(existingSprite)
    const degreeUser = await prisma.users.upsert({
      where: { email: degreeEmail },
      create: {
        email: degreeEmail,
        isAgentic: true,
        role: 'user',
        name: `Planetary Degree ${targetPlanet} ${targetSign}`,
      },
      update: { isAgentic: true },
    })
    degreeUserId = degreeUser.id
    spritePrevBalance = await prisma.tokenBalance.findUnique({ where: { userId: degreeUser.id } })
    spriteBalanceExistedBefore = Boolean(spritePrevBalance)
    await prisma.tokenBalance.upsert({
      where: { userId: degreeUser.id },
      create: {
        userId: degreeUser.id,
        spirit: RESERVOIR,
        essence: RESERVOIR,
        matter: RESERVOIR,
        substance: RESERVOIR,
        updatedAt: new Date(),
      },
      update: {
        spirit: RESERVOIR,
        essence: RESERVOIR,
        matter: RESERVOIR,
        substance: RESERVOIR,
        updatedAt: new Date(),
      },
    })

    const todayKey = new Date().toISOString().split('T')[0]
    const idempotencyKey = `attune:human:${testUser.id}:${degreeAgentId}:${todayKey}`
    await prisma.tokenTransaction.deleteMany({ where: { idempotencyKey } })

    const expectedAxis = RESERVOIR * BESTOW_FRACTION // 100 * 0.1 = 10.0 per axis
    const balBefore = await readAlchmBalance(baseUrl, secret, TEST_EMAIL)

    // ── RUN 1 ── real credit POSTed to alchm.kitchen ─────────────────────────
    console.log('\n⚡ Run 1: runTransitAttunements({ onlyWalletEmail })')
    const summary = await runTransitAttunements({ onlyWalletEmail: TEST_EMAIL })
    console.log('📊 Summary:', summary)

    // (a)/(b) — the live endpoint ACCEPTED the per-axis transit_attunement credit.
    // attune() throws (→ summary.errors) if syncCreditToAlchm returns !ok, so
    // errors:0 + attunements:1 means the real POST returned 2xx.
    assert(
      summary.errors === 0,
      `live sync errored (${summary.errors}). Check the secret + WTEN sync-credit handles source:transit_attunement`
    )
    assert(summary.attunements === 1, `expected 1 attunement, got ${summary.attunements}`)
    console.log('✅ (a)/(b) alchm.kitchen accepted the per-axis transit_attunement credit')

    // Neon human balance must be UNTOUCHED — the credit lives on Railway now.
    const humanBal = await prisma.tokenBalance.findUnique({ where: { userId: testUser.id } })
    assert(humanBal, 'human balance row missing')
    for (const axis of ['spirit', 'essence', 'matter', 'substance'] as const) {
      assert(
        approx(Number(humanBal[axis]), HUMAN_START),
        `human Neon ${axis} changed to ${humanBal[axis]} (must stay ${HUMAN_START})`
      )
    }
    console.log('✅ Human Neon balance untouched (credit routed to Railway, not Neon)')

    // Degree sprite reservoir depleted on Neon by exactly one bestow.
    const spriteBal = await prisma.tokenBalance.findUnique({ where: { userId: degreeUser.id } })
    assert(spriteBal, 'degree sprite balance missing')
    assert(
      approx(Number(spriteBal.spirit), RESERVOIR - expectedAxis),
      `sprite spirit ${spriteBal.spirit} != ${RESERVOIR - expectedAxis}`
    )
    console.log(
      `✅ Degree sprite reservoir depleted on Neon (${RESERVOIR} → ${Number(spriteBal.spirit)})`
    )

    // Neon cap marker: non-ESMS_BUNDLE, amount 0, doubles as the daily cap.
    const marker = await prisma.tokenTransaction.findUnique({ where: { idempotencyKey } })
    assert(marker, 'Neon cap marker row missing')
    assert(
      marker.tokenType !== 'ESMS_BUNDLE',
      `marker tokenType must not be ESMS_BUNDLE (got ${marker.tokenType})`
    )
    assert(approx(Number(marker.amount), 0), `marker amount should be 0, got ${marker.amount}`)
    console.log('✅ Neon cap marker written:', {
      tokenType: marker.tokenType,
      amount: Number(marker.amount),
    })

    // (a) numeric balance increment on Railway — informational unless GET exists.
    const balAfter = await readAlchmBalance(baseUrl, secret, TEST_EMAIL)
    if (balBefore && balAfter) {
      const dSpirit = balAfter.spirit - balBefore.spirit
      console.log(
        `✅ Railway balance via GET /api/economy/balance — spirit ${balBefore.spirit} → ${balAfter.spirit} (Δ${dSpirit})`
      )
      assert(
        approx(dSpirit, expectedAxis),
        `Railway spirit delta ${dSpirit} != expected ${expectedAxis}`
      )
    } else {
      console.log(
        'ℹ️  GET /api/economy/balance unavailable — numeric balance check deferred to WTEN (see directive).'
      )
    }

    // (c) idempotency: re-POST the SAME key attune used. A 409 returns ok:true with
    // NO balances (200 returns balances) — so balances===undefined proves both that
    // the run-1 credit landed AND that a repeat does not double-credit.
    console.log('\n🔄 Re-POST the same idempotencyKey → expect HTTP 409 (already applied)')
    const dup = await syncCreditToAlchm({
      userEmail: TEST_EMAIL,
      amounts: {
        spirit: expectedAxis.toFixed(4),
        essence: expectedAxis.toFixed(4),
        matter: expectedAxis.toFixed(4),
        substance: expectedAxis.toFixed(4),
      },
      source: 'transit_attunement',
      idempotencyKey,
    })
    assert(dup.ok === true, `idempotent re-POST should be ok:true, got ${JSON.stringify(dup)}`)
    assert(
      dup.balances === undefined,
      'expected a 409 (no balances) — got a fresh 200, meaning run-1 credit did NOT land on alchm.kitchen'
    )
    console.log(
      '✅ (c) Duplicate key → 409 → ok:true, no balances (run-1 credit confirmed landed, no double credit)'
    )

    // ── RUN 2 ── Neon cap short-circuits: no new credit POST, no new side effects.
    console.log('\n🔁 Run 2: expect an idempotent no-op (Neon cap short-circuits before sync)')
    const summary2 = await runTransitAttunements({ onlyWalletEmail: TEST_EMAIL })
    console.log('📊 Summary:', summary2)
    assert(summary2.attunements === 0, `run 2 should attune 0, got ${summary2.attunements}`)
    assert(
      summary2.skippedCappedOrEmpty === 1,
      `run 2 should skip 1 (capped), got ${summary2.skippedCappedOrEmpty}`
    )
    const markers = await prisma.tokenTransaction.findMany({ where: { idempotencyKey } })
    assert(markers.length === 1, `expected exactly 1 cap marker after run 2, got ${markers.length}`)
    const spriteBal2 = await prisma.tokenBalance.findUnique({ where: { userId: degreeUser.id } })
    assert(
      approx(Number(spriteBal2!.spirit), RESERVOIR - expectedAxis),
      'run 2 must NOT deplete the reservoir again'
    )
    console.log('✅ Idempotent no-op confirmed (cap short-circuited, no double credit / depletion)')

    console.log(
      '\n🎉 ALL ASSERTIONS PASSED — live alchm.kitchen credited the human (Railway); Neon holds only the reservoir + cap.'
    )
    console.log(
      `   Note: the Railway probe user ${TEST_EMAIL} persists (no delete endpoint); it accrues +${expectedAxis * 4} ESMS per run.`
    )
  } finally {
    // Remove the throwaway Neon human (even on failure).
    if (testUserId) {
      await prisma.tokenTransaction.deleteMany({ where: { userId: testUserId } }).catch(() => {})
      await prisma.tokenBalance.deleteMany({ where: { userId: testUserId } }).catch(() => {})
      await prisma.user_profiles.deleteMany({ where: { userId: testUserId } }).catch(() => {})
      await prisma.users.delete({ where: { id: testUserId } }).catch(() => {})
    }
    // Restore the borrowed degree sprite (balance + user tracked independently).
    if (degreeUserId) {
      if (spriteBalanceExistedBefore && spritePrevBalance) {
        await prisma.tokenBalance
          .update({
            where: { userId: degreeUserId },
            data: {
              spirit: spritePrevBalance.spirit,
              essence: spritePrevBalance.essence,
              matter: spritePrevBalance.matter,
              substance: spritePrevBalance.substance,
              updatedAt: new Date(),
            },
          })
          .catch(() => {})
      } else {
        await prisma.tokenBalance.deleteMany({ where: { userId: degreeUserId } }).catch(() => {})
      }
      if (!spriteUserExistedBefore) {
        await prisma.users.delete({ where: { id: degreeUserId } }).catch(() => {})
      }
    }
  }
}

main()
  .catch(err => {
    console.error('❌ Test failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
