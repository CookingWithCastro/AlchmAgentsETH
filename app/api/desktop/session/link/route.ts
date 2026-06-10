import { randomBytes, randomUUID } from 'crypto'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DESKTOP_KEY_LABEL = 'Alchm Desktop Companion'

function createDesktopToken() {
  return `alchm_desktop_${randomBytes(32).toString('hex')}`
}

export async function POST() {
  const session = await auth().catch(() => null)
  const userId = session?.user.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secret =
    process.env.DEEP_LINK_SHARED_SECRET ||
    process.env.TAURI_DEEP_LINK_SECRET ||
    (process.env.NODE_ENV === 'production' ? undefined : 'DEV_SECRET_DO_NOT_USE_IN_PROD')

  if (!secret) {
    return NextResponse.json({ error: 'Deep-link signing is not configured' }, { status: 503 })
  }

  const token = createDesktopToken()
  const dbExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  try {
    await prisma.$transaction([
      prisma.desktopApiKey.updateMany({
        where: {
          userId,
          label: DESKTOP_KEY_LABEL,
          isActive: true,
        },
        data: { isActive: false },
      }),
      prisma.desktopApiKey.create({
        data: {
          id: randomUUID(),
          token,
          userId,
          label: DESKTOP_KEY_LABEL,
          expiresAt: dbExpiresAt,
        },
      }),
    ])
  } catch (error) {
    console.error('Failed to register desktop token in database:', error)
    return NextResponse.json({ error: 'Database session registration failed' }, { status: 500 })
  }

  // Deep link parameters
  const displayName = session.user.name || 'Alchm Operator'
  const email = session.user.email || ''
  const expiresAtMs = (Date.now() + 5 * 60 * 1000).toString() // Deep link is valid for 5 minutes

  // Construct payload: userId:apiKey:displayName:email:expiresAt
  const payload = `${userId}:${token}:${displayName}:${email}:${expiresAtMs}`

  // Sign using HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const sig = hmac.digest('hex')

  // Construct deep link
  const deepLink = `alchm://link-account?userId=${encodeURIComponent(userId)}&apiKey=${encodeURIComponent(token)}&displayName=${encodeURIComponent(displayName)}&email=${encodeURIComponent(email)}&expiresAt=${encodeURIComponent(expiresAtMs)}&sig=${encodeURIComponent(sig)}`

  return NextResponse.json({
    success: true,
    deepLink,
    userId,
    displayName,
    email,
  })
}
