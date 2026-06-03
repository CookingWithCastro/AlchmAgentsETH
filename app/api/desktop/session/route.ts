import { randomBytes, randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'
import { buildProfileYieldStateFromBalances } from '@/lib/profile-yield'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEV_DESKTOP_API_KEY = process.env.DESKTOP_DEV_API_KEY || 'dev-desktop-token'
const DEV_DESKTOP_USER_ID = process.env.DESKTOP_DEV_USER_ID || 'desktop-local'
const DESKTOP_KEY_LABEL = 'Alchm Desktop Companion'

function createDesktopToken() {
  return `alchm_desktop_${randomBytes(32).toString('hex')}`
}

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

  // 2. Fall back to standard session cookie authentication if no token was verified
  if (!userId) {
    const session = await getServerSession(authOptions).catch(() => null)
    userId = (session?.user as { id?: string } | undefined)?.id
  }

  // 3. If still unauthenticated, return the local-dev session
  if (!userId) {
    return NextResponse.json(localDevSession())
  }

  // 4. Retrieve live alchemical balances from Neon PostgreSQL
  const balances = await EconomyService.getBalances(userId)

  // 5. If no token was provided (i.e. web browser session link call), generate a new 30-day token
  if (!token) {
    token = createDesktopToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const desktopApiKey = (prisma as any).desktopApiKey

    try {
      if (desktopApiKey?.updateMany && desktopApiKey?.create) {
        await desktopApiKey.updateMany({
          where: {
            userId,
            label: DESKTOP_KEY_LABEL,
            isActive: true,
          },
          data: { isActive: false },
        })

        await desktopApiKey.create({
          data: {
            token,
            userId,
            label: DESKTOP_KEY_LABEL,
            expiresAt,
          },
        })
      } else {
        await prisma.$transaction([
          prisma.$executeRaw`
            UPDATE desktop_api_keys
            SET is_active = false
            WHERE user_id = ${userId}
              AND label = ${DESKTOP_KEY_LABEL}
              AND is_active = true
          `,
          prisma.$executeRaw`
            INSERT INTO desktop_api_keys (id, token, user_id, label, expires_at)
            VALUES (${randomUUID()}, ${token}, ${userId}, ${DESKTOP_KEY_LABEL}, ${expiresAt})
          `,
        ])
      }
    } catch (error) {
      console.warn('Unable to register new desktop API key in database:', error)
    }
  }

  // 6. Retrieve daily claim history to calculate dynamic streaks and cooldowns.
  const wallet = buildProfileYieldStateFromBalances(balances)

  return NextResponse.json({
    mode: 'authenticated',
    userId,
    apiKey: token,
    balances: wallet.balances,
    accounts: wallet.accounts,
  })
}
