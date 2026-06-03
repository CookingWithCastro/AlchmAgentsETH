import { prisma } from '@/lib/db'
import { EconomyService, type TokenBalances } from '@/lib/services/economyService'

export type YieldSite = 'agents' | 'kitchen'

export type YieldBalanceSnapshot = {
  spirit: number
  essence: number
  matter: number
  substance: number
}

export type YieldAccount = {
  site: YieldSite
  label: string
  homeUrl: string
  profileUrl: string
  balances: YieldBalanceSnapshot
  canClaimDaily: boolean
  streak: number
  lastDailyClaimAt: string | null
  status: 'linked' | 'local-dev'
  message?: string
}

export type ProfileYieldState = {
  balances: YieldBalanceSnapshot
  accounts: YieldAccount[]
}

const PREMIUM_TIERS = new Set(['alchemist', 'premium', 'pro', 'unlimited', 'paid'])
const PREMIUM_ROLES = new Set(['admin', 'alchemist'])

function isSameUtcDay(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()

  return (
    date.getUTCFullYear() === today.getUTCFullYear() &&
    date.getUTCMonth() === today.getUTCMonth() &&
    date.getUTCDate() === today.getUTCDate()
  )
}

export function normalizeYieldBalances(
  balances: Pick<TokenBalances, 'spirit' | 'essence' | 'matter' | 'substance'>
): YieldBalanceSnapshot {
  return {
    spirit: Number(balances.spirit || 0),
    essence: Number(balances.essence || 0),
    matter: Number(balances.matter || 0),
    substance: Number(balances.substance || 0),
  }
}

export function buildProfileYieldStateFromBalances(
  balances: TokenBalances,
  status: YieldAccount['status'] = 'linked'
): ProfileYieldState {
  const normalized = normalizeYieldBalances(balances)

  return {
    balances: normalized,
    accounts: [
      {
        site: 'agents',
        label: 'Alchm Agents',
        homeUrl: 'https://agents.alchm.kitchen',
        profileUrl: 'https://agents.alchm.kitchen/profile',
        balances: normalized,
        canClaimDaily: status === 'linked' && !isSameUtcDay(balances.lastDailyClaimAgentsAt),
        streak: 0,
        lastDailyClaimAt: balances.lastDailyClaimAgentsAt,
        status,
      },
      {
        site: 'kitchen',
        label: 'Alchm Kitchen',
        homeUrl: 'https://alchm.kitchen',
        profileUrl: 'https://alchm.kitchen/profile',
        balances: normalized,
        canClaimDaily: status === 'linked' && !isSameUtcDay(balances.lastDailyClaimAt),
        streak: 0,
        lastDailyClaimAt: balances.lastDailyClaimAt,
        status,
      },
    ],
  }
}

export async function getProfileYieldState(userId: string): Promise<ProfileYieldState> {
  const balances = await EconomyService.getBalances(userId)
  return buildProfileYieldStateFromBalances(balances)
}

export async function deriveYieldPremium(
  userId: string,
  opts: { kitchenPremium?: boolean } = {}
): Promise<boolean> {
  try {
    const [user, subscription] = await Promise.all([
      prisma.users.findUnique({ where: { id: userId }, select: { role: true } }),
      prisma.userSubscription.findUnique({
        where: { userId },
        select: { tier: true, status: true },
      }),
    ])

    const roleIsPremium = user?.role ? PREMIUM_ROLES.has(user.role.toLowerCase()) : false
    const subActive = subscription?.status
      ? ['active', 'trialing'].includes(subscription.status.toLowerCase())
      : false
    const tierIsPremium =
      subActive && subscription?.tier ? PREMIUM_TIERS.has(subscription.tier.toLowerCase()) : false

    return roleIsPremium || tierIsPremium || !!opts.kitchenPremium
  } catch (err) {
    console.error('[profile-yield] deriveYieldPremium failed; defaulting to non-premium:', err)
    return false
  }
}

export async function claimProfileYield(
  userId: string,
  site: YieldSite,
  opts: { kitchenPremium?: boolean } = {}
) {
  await EconomyService.getBalances(userId)
  const isPremium = await deriveYieldPremium(userId, opts)
  const result =
    site === 'kitchen'
      ? await EconomyService.claimKitchenYield(userId, isPremium)
      : await EconomyService.claimAgentsYield(userId, isPremium)

  return {
    site,
    isPremium,
    distribution: result.distribution,
    balances: normalizeYieldBalances(result.balances),
    wallet: buildProfileYieldStateFromBalances(result.balances),
  }
}
