import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { loadAlchmSyncConfig } from '@/lib/alchmSyncConfig'

export async function GET(request: Request) {
  try {
    // Bridge-aware: recognizes both PA-native sessions and alchm.kitchen sessions.
    const session = await auth()
    const userId = session?.user?.id
    const email = session?.user?.email
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = process.env.ALCHM_KITCHEN_SYNC_URL || 'https://alchm.kitchen'

    // Primary path: forward the (shared) cookies so alchm.kitchen resolves the
    // user from its own session. Works for both PA-native and bridged users.
    const cookieHeader = request.headers.get('cookie') || ''
    let response = await fetch(`${baseUrl}/api/economy/balance?site=agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    })

    // Fallback: if cookie-forwarding didn't authenticate (401) but we know the
    // user's email, resolve server-to-server with the shared sync secret.
    if (response.status === 401 && email) {
      try {
        const { baseUrl: syncUrl, secret } = loadAlchmSyncConfig()
        response = await fetch(
          `${syncUrl}/api/economy/balance?site=agents&email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Secret': secret,
            },
          }
        )
      } catch (cfgErr) {
        console.warn('[economy/balances] sync-secret fallback unavailable:', cfgErr)
      }
    }

    if (!response.ok) {
      throw new Error(`alchm.kitchen returned status ${response.status}`)
    }

    const data = await response.json()

    // Match the expected response structure for planetary_agents frontend
    return NextResponse.json({
      ...data.balances,
      canClaimAgentsYield: data.canClaimDaily ?? false,
      streak: data.streak ?? 0,
    })
  } catch (error) {
    console.error('Error fetching balances from alchm.kitchen proxy:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
