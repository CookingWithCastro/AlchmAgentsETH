import { NextRequest, NextResponse } from 'next/server'
import { claimGroupChatSeed } from '@/lib/agents/transit-group-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Client-called gate for the one-time transit-council opener.
//
// The browser POSTs { sessionId } on first arrival at /gallery/group/<id>. We
// atomically claim the seed server-side (seeded_at NULL → now()) and return whether
// THIS caller won the claim. Only the winner then streams the opener via
// /api/unified-multi-agent-chat, so the council auto-convenes exactly once per session
// regardless of how many fresh browsers / incognito tabs open the same stable URL.
// This replaces the old localStorage-only guard, which re-fired the full opener (N
// sequential LLM calls) on every cleared-storage / incognito revisit.
//
// Low-risk surface: it only flips a boolean on an existing session row. A claim for an
// unknown id simply updates zero rows → { claimed: false }. The /gallery/group/<id>
// page already 404s for missing sessions before this is ever called.
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionId =
    body && typeof (body as { sessionId?: unknown }).sessionId === 'string'
      ? (body as { sessionId: string }).sessionId.trim()
      : ''
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  const claimed = await claimGroupChatSeed(sessionId)
  return NextResponse.json({ claimed })
}
