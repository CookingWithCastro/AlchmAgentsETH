import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { claimProfileYield } from '@/lib/profile-yield'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  if (!token || token === 'dev-desktop-token') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let site: 'agents' | 'kitchen' = 'agents'

  try {
    const apiKeyRecord = await prisma.desktopApiKey.findFirst({
      where: {
        token,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    })

    if (!apiKeyRecord) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }

    const userId = apiKeyRecord.userId
    const body = await req.json().catch(() => ({}))
    site = body.site === 'kitchen' ? 'kitchen' : 'agents'

    prisma.desktopApiKey
      .update({ where: { id: apiKeyRecord.id }, data: { lastUsedAt: new Date() } })
      .catch(err => console.error('Failed to update desktop key lastUsedAt:', err))

    const result = await claimProfileYield(userId, site)

    return NextResponse.json({
      success: true,
      distribution: {
        spirit: result.distribution.spirit,
        essence: result.distribution.essence,
        matter: result.distribution.matter,
        substance: result.distribution.substance,
      },
      balances: {
        spirit: Number(result.balances.spirit),
        essence: Number(result.balances.essence),
        matter: Number(result.balances.matter),
        substance: Number(result.balances.substance),
      },
    })
  } catch (error: any) {
    if (error?.message === 'Already claimed today') {
      const label = site === 'kitchen' ? 'Alchm Kitchen' : 'Alchm Agents'
      return NextResponse.json(
        {
          error: 'Cooldown active',
          message: `Your daily yield from ${label} has already been claimed today.`,
        },
        { status: 409 }
      )
    }
    console.error('Failed to claim daily yield in desktop web endpoint:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
