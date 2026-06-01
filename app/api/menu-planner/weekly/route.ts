import { NextRequest, NextResponse } from 'next/server'
import { getAgentWeeklyMenu, postAgentWeeklyMenu } from '@/lib/wtenClient'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const agentSlug = searchParams.get('agentSlug')
    const weekStartDate = searchParams.get('weekStartDate')

    if (!agentSlug) {
      return NextResponse.json({ success: false, error: 'agentSlug is required' }, { status: 400 })
    }
    if (!weekStartDate) {
      return NextResponse.json(
        { success: false, error: 'weekStartDate is required' },
        { status: 400 }
      )
    }

    const menu = await getAgentWeeklyMenu(agentSlug, weekStartDate)

    return NextResponse.json({
      success: true,
      menu,
    })
  } catch (error: any) {
    console.error('[API Weekly Menu GET] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weekly menu' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.agentSlug) {
      return NextResponse.json({ success: false, error: 'agentSlug is required' }, { status: 400 })
    }
    if (!body.weekStartDate) {
      return NextResponse.json(
        { success: false, error: 'weekStartDate is required' },
        { status: 400 }
      )
    }
    if (!body.meals || !Array.isArray(body.meals) || body.meals.length === 0) {
      return NextResponse.json(
        { success: false, error: 'meals must be a non-empty array' },
        { status: 400 }
      )
    }

    const response = await postAgentWeeklyMenu(body)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[API Weekly Menu POST] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to persist weekly menu' },
      { status: 500 }
    )
  }
}
