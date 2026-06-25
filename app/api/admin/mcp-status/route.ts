import { NextRequest, NextResponse } from 'next/server'
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth'

const AGENTS_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://api.agents.alchm.kitchen'

const INTERNAL_API_SECRET =
  process.env.INTERNAL_API_SECRET || '882133EA-3D06-4DF2-A63C-F4114AB4EFBC'

export async function GET(_req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin.ok) {
      return adminErrorResponse(admin)
    }

    const backendUrl = `${AGENTS_BACKEND_URL.replace(/\/$/, '')}/api/admin/mcp-status`

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
    console.error('Proxy mcp-status error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal proxy error' },
      { status: 500 }
    )
  }
}
