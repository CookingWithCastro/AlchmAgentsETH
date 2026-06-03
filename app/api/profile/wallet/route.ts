import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { claimProfileYield, getProfileYieldState, type YieldSite } from '@/lib/profile-yield'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await getProfileYieldState(userId))
  } catch (error: any) {
    console.error('[profile/wallet] failed to load wallet state:', error)
    return NextResponse.json(
      { error: 'Failed to load profile wallet', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let site: YieldSite = 'agents'

  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    site = body?.site === 'kitchen' ? 'kitchen' : 'agents'

    const result = await claimProfileYield(userId, site, {
      kitchenPremium: session.user.kitchenPremium,
    })

    return NextResponse.json({ success: true, ...result })
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

    console.error('[profile/wallet] failed to claim yield:', error)
    return NextResponse.json(
      { error: 'Failed to claim profile yield', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
