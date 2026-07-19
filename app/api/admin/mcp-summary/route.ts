import { NextRequest, NextResponse } from 'next/server'
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth'

const AGENTS_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://api.agents.alchm.kitchen'

// No fallback: unset means the proxy fails closed instead of authenticating
// with a secret that lives in git history. Set it in Vercel + Railway env.
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || ''

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) {
      return adminErrorResponse(admin)
    }

    if (!INTERNAL_API_SECRET) {
      return NextResponse.json(
        { success: false, error: 'INTERNAL_API_SECRET is not configured' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(req.url)
    const windowMinutes = searchParams.get('windowMinutes') || '60'

    const backendUrl = `${AGENTS_BACKEND_URL.replace(/\/$/, '')}/api/admin/mcp-summary?windowMinutes=${windowMinutes}`

    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_API_SECRET,
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown backend error')
      return NextResponse.json(
        { success: false, error: `Backend returned ${res.status}: ${errorText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Proxy mcp-summary error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal proxy error' },
      { status: 500 }
    )
  }
}
