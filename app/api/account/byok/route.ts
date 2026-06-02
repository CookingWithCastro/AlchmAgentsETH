import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listKeys, saveKey, deleteKey } from '@/lib/byok/store'
import type { ByokProvider } from '@/lib/premium/tiers'

export const dynamic = 'force-dynamic'

const VALID_PROVIDERS: ByokProvider[] = ['openai', 'anthropic']

function isProvider(v: unknown): v is ByokProvider {
  return typeof v === 'string' && (VALID_PROVIDERS as string[]).includes(v)
}

/** GET — list the user's connected keys as masked summaries (never the key). */
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const keys = await listKeys(userId)
  return NextResponse.json({ keys })
}

/** POST { provider, apiKey } — validate against the provider, then store encrypted. */
export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { provider?: unknown; apiKey?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isProvider(body.provider)) {
    return NextResponse.json({ error: 'provider must be "openai" or "anthropic"' }, { status: 400 })
  }
  if (typeof body.apiKey !== 'string' || !body.apiKey.trim()) {
    return NextResponse.json({ error: 'apiKey is required' }, { status: 400 })
  }

  const result = await saveKey(userId, body.provider, body.apiKey)
  if (!result.ok) {
    // Surface only the validation error — never echo the submitted key.
    return NextResponse.json({ error: result.error }, { status: 422 })
  }
  return NextResponse.json({ key: result.summary })
}

/** DELETE ?provider=openai|anthropic — disconnect a key. */
export async function DELETE(request: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = new URL(request.url).searchParams.get('provider')
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'provider query param required' }, { status: 400 })
  }
  await deleteKey(userId, provider)
  return NextResponse.json({ ok: true })
}
