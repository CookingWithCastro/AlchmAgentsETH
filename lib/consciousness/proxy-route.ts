import { NextResponse } from 'next/server'
import { backend, BackendError } from '@/lib/backend'

export async function proxyConsciousnessRoute(
  kind: 'live' | 'batch',
  body: unknown
): Promise<NextResponse> {
  try {
    const payload = await backend.consciousness[kind](body)
    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return NextResponse.json(
        {
          error: 'Backend consciousness calculation is not available',
          code: 'CONSCIOUSNESS_NOT_COMPUTED',
        },
        { status: 503 }
      )
    }

    if (error instanceof BackendError) {
      return NextResponse.json(
        {
          error: 'Backend consciousness calculation failed',
          code: 'BACKEND_ERROR',
          message: error.message,
        },
        { status: error.status }
      )
    }

    return NextResponse.json(
      {
        error: 'Backend consciousness service unavailable',
        code: 'BACKEND_DISABLED',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    )
  }
}
