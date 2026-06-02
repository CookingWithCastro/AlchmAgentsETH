/**
 * Single source of truth for provisioning a Planetary Agents `users` row and
 * the satellite rows every PA user needs (user_profiles, profiles,
 * monica_user_settings).
 *
 * This logic was previously inlined in `lib/auth-options.ts` `signIn`. It is
 * now shared so that BOTH entry points create users identically:
 *   1. PA's own Google sign-in (`authOptions.signIn`)
 *   2. The cross-site session bridge (`lib/auth-bridge.ts`), which JIT-creates
 *      a PA user the first time someone authenticated on alchm.kitchen lands
 *      on agents.alchm.kitchen.
 *
 * Keeping one implementation prevents the two flows from drifting (e.g. a new
 * required satellite row added to one but not the other).
 */

import type { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

export type ProvisionUserInput = {
  email: string
  /** Display name; falls back to the email local-part when absent. */
  name?: string | null
  /** Auth provider tag stored on the row, e.g. 'google' or 'alchm-kitchen-bridge'. */
  provider: string
  /** WTEN (alchm.kitchen) user id to bridge to, when known. */
  alchmKitchenUserId?: string | null
}

export type ProvisionUserResult = {
  id: string
  created: boolean
}

/**
 * Find-or-create a PA user (and its satellite rows) by email, returning the
 * canonical PA `users.id`.
 *
 * MUST be called inside a Prisma transaction (`prisma.$transaction(tx => ...)`)
 * so the four-row creation is atomic. Idempotent: an existing user is updated
 * (lastLogin, missing profile backfill, alchmKitchenUserId link) rather than
 * duplicated. A concurrent create that loses the unique-email race is recovered
 * by re-reading the row.
 */
export async function provisionPaUser(
  tx: Prisma.TransactionClient,
  input: ProvisionUserInput
): Promise<ProvisionUserResult> {
  const email = input.email.trim().toLowerCase()
  const name = input.name || email.split('@')[0]

  const existing = await tx.users.findUnique({
    where: { email },
    include: { user_profiles: true },
  })

  if (existing) {
    await tx.users.update({
      where: { id: existing.id },
      data: {
        lastLogin: new Date(),
        // Link to the WTEN account if we learned the id and don't have it yet.
        ...(input.alchmKitchenUserId && !existing.alchmKitchenUserId
          ? { alchmKitchenUserId: input.alchmKitchenUserId }
          : {}),
      },
    })

    // Backfill profile for legacy users created before user_profiles existed.
    if (!existing.user_profiles) {
      await tx.user_profiles.create({
        data: {
          userId: existing.id,
          birthDate: new Date(0),
          birthLocation: { name: 'Pending Onboarding', latitude: 0, longitude: 0 },
          natalChart: {},
          monicaConstant: 0,
          dominantElement: 'Fire',
        },
      })
    }

    return { id: existing.id, created: false }
  }

  const userId = randomUUID()
  try {
    await tx.users.create({
      data: {
        id: userId,
        email,
        name,
        provider: input.provider,
        verified: true,
        lastLogin: new Date(),
        ...(input.alchmKitchenUserId ? { alchmKitchenUserId: input.alchmKitchenUserId } : {}),
      },
    })

    await tx.user_profiles.create({
      data: {
        userId,
        birthDate: new Date(0), // Placeholder until onboarding
        birthLocation: { name: 'Pending Onboarding', latitude: 0, longitude: 0 },
        natalChart: {},
        monicaConstant: 0,
        dominantElement: 'Fire',
      },
    })

    await tx.profiles.create({
      data: {
        userId,
        name,
      },
    })

    await tx.monica_user_settings.create({
      data: {
        userId,
        interests: '[]',
      },
    })

    return { id: userId, created: true }
  } catch (err) {
    // Recover from a concurrent create that won the unique-email race.
    if ((err as { code?: string })?.code === 'P2002') {
      const raced = await tx.users.findUnique({ where: { email } })
      if (raced) return { id: raced.id, created: false }
    }
    throw err
  }
}
