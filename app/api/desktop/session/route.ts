import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'
import { buildProfileYieldStateFromBalances } from '@/lib/profile-yield'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEV_DESKTOP_API_KEY = process.env.DESKTOP_DEV_API_KEY || 'dev-desktop-token'
const DEV_DESKTOP_USER_ID = process.env.DESKTOP_DEV_USER_ID || 'desktop-local'
function localDevSession() {
  const balances = { spirit: 150, essence: 150, matter: 150, substance: 150 }
  return {
    mode: 'local-dev',
    userId: DEV_DESKTOP_USER_ID,
    apiKey: DEV_DESKTOP_API_KEY,
    balances,
    accounts: [
      {
        site: 'agents',
        label: 'Alchm Agents',
        homeUrl: 'https://agents.alchm.kitchen',
        balances,
        canClaimDaily: false,
        streak: 0,
        lastDailyClaimAt: null,
        status: 'local-dev',
        message: 'Sign in to claim daily yield.',
      },
      {
        site: 'kitchen',
        label: 'Alchm Kitchen',
        homeUrl: 'https://alchm.kitchen',
        balances,
        canClaimDaily: false,
        streak: 0,
        lastDailyClaimAt: null,
        status: 'local-dev',
        message: 'Sign in to claim daily yield.',
      },
    ],
  }
}

export async function GET(req: Request) {
  let userId: string | undefined = undefined
  let token: string | undefined = undefined

  // 1. Try to authenticate via Authorization: Bearer <apiKey> header
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
    if (token && token !== 'dev-desktop-token') {
      try {
        const apiKeyRecord = await prisma.desktopApiKey.findFirst({
          where: {
            token,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        })
        if (apiKeyRecord) {
          userId = apiKeyRecord.userId
          // Update last used timestamp asynchronously
          prisma.desktopApiKey
            .update({
              where: { id: apiKeyRecord.id },
              data: { lastUsedAt: new Date() },
            })
            .catch(err => console.error('Failed to update desktop key lastUsedAt:', err))
        }
      } catch (err) {
        console.error('Failed to authenticate bearer token from database:', err)
      }
    }
  }

  // 2. Fall back to the unified web session (native PA or kitchen bridge).
  if (!userId) {
    const session = await auth().catch(() => null)
    userId = session?.user.id
  }

  // 3. If still unauthenticated, return the local-dev session
  if (!userId) {
    return NextResponse.json(localDevSession())
  }

  // 4. Retrieve live alchemical balances from Neon PostgreSQL
  const balances = await EconomyService.getBalances(userId)

  // 5. Retrieve daily claim history to calculate dynamic streaks and cooldowns.
  // A browser session never rotates desktop credentials here. Tokens are only
  // minted by the explicit, signed /api/desktop/session/link handshake.
  const wallet = buildProfileYieldStateFromBalances(balances)

  return NextResponse.json({
    mode: 'authenticated',
    userId,
    apiKey: token ?? null,
    balances: wallet.balances,
    accounts: wallet.accounts,
  })
}
