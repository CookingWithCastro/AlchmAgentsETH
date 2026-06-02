/**
 * Resolve a user's premium entitlements (DB-backed). Reuses the canonical
 * premium rules from app/api/desktop/claim-yield/route.ts:deriveIsPremium and
 * lib/services/subscriptionService.ts.
 *
 * Rollout safety: while `PREMIUM_ENFORCEMENT_ENABLED` is off (the default),
 * every authenticated user resolves to 'master' — exactly today's behavior —
 * so nothing regresses until the flag is flipped. A `PREMIUM_GRANDFATHER_UNTIL`
 * date keeps pre-existing users on full access through a migration window even
 * after enforcement turns on.
 */

import { prisma } from '@/lib/db'
import type { PaTier, ByokProvider } from './tiers'
import { listByokProviders } from '@/lib/byok/store'

const PREMIUM_TIERS = new Set(['alchemist', 'premium', 'pro', 'unlimited', 'paid'])
const PREMIUM_ROLES = new Set(['admin', 'alchemist'])
const ACTIVE_SUB_STATUSES = ['active', 'trialing']

export function isPremiumEnforcementEnabled(): boolean {
  return process.env.PREMIUM_ENFORCEMENT_ENABLED === 'true'
}

function grandfatherUntil(): Date | null {
  const v = process.env.PREMIUM_GRANDFATHER_UNTIL
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Options for entitlement resolution.
 * @property kitchenPremium  Pass-through of the alchm.kitchen premium signal
 *   (from the session bridge). When true, the user is premium on PA too — this
 *   is what unifies the premium role across both sites.
 */
export type EntitlementOpts = { kitchenPremium?: boolean }

export async function getPaTier(userId: string, opts: EntitlementOpts = {}): Promise<PaTier> {
  try {
    const [user, sub] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId }, select: { role: true, createdAt: true } }),
      prisma.userSubscription.findUnique({
        where: { userId },
        select: { tier: true, status: true },
      }),
    ])
    if (!user) return 'free'

    const role = (user.role || '').toLowerCase()
    if (role === 'admin') return 'master'

    // Enforcement off → preserve current behavior (everyone authenticated is
    // full-access). Flipping the flag is the only thing that activates real tiers.
    if (!isPremiumEnforcementEnabled()) return 'master'

    // Grandfather window: existing users keep full access until the cutoff.
    const gUntil = grandfatherUntil()
    if (gUntil && gUntil > new Date() && user.createdAt && user.createdAt < gUntil) {
      return 'master'
    }

    const subActive = sub?.status ? ACTIVE_SUB_STATUSES.includes(sub.status.toLowerCase()) : false
    const tierIsPremium = subActive && sub?.tier ? PREMIUM_TIERS.has(sub.tier.toLowerCase()) : false
    // Premium if: PA-side role/sub OR an alchm.kitchen premium subscription
    // (unified role — a kitchen sub grants premium here too).
    if (PREMIUM_ROLES.has(role) || tierIsPremium || opts.kitchenPremium) return 'alchemist'
    return 'free'
  } catch (err) {
    console.error('[entitlements] getPaTier failed', err)
    return 'free'
  }
}

export type Entitlements = {
  tier: PaTier
  /** An active PA-side (Stripe-on-PA) subscription. */
  hasActiveSub: boolean
  /** Premium granted by an alchm.kitchen subscription (manage billing on the kitchen). */
  premiumViaKitchen: boolean
  byokProviders: ByokProvider[]
}

export async function getEntitlements(
  userId: string,
  opts: EntitlementOpts = {}
): Promise<Entitlements> {
  const [tier, byokProviders, sub] = await Promise.all([
    getPaTier(userId, opts),
    listByokProviders(userId),
    prisma.userSubscription.findUnique({ where: { userId }, select: { status: true } }),
  ])
  const hasActiveSub = sub?.status ? ACTIVE_SUB_STATUSES.includes(sub.status.toLowerCase()) : false
  return { tier, hasActiveSub, premiumViaKitchen: !!opts.kitchenPremium, byokProviders }
}
