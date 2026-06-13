/**
 * POST /api/agents/register-subname — assign an agent its gasless ENS subname
 * (and ENSIP-25/26 text records) via NameStone.
 *
 * Body: { agentId, subname, address, textRecords?, domain? }
 *   - subname: the label (e.g. "plato"); resolves to <subname>.<NAMESTONE_DOMAIN>
 *   - address: the agent's wallet (Privy server wallet or Dynamic wallet)
 *
 * `set-name` is an upsert, so this both creates and updates — an existing
 * subname is simply re-pointed. NameStone client/auth errors surface as 4xx.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { setSubname, NameStoneError } from '@/lib/namestone'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: {
    agentId?: string
    subname?: string
    address?: string
    textRecords?: Record<string, string>
    domain?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId, subname, address, textRecords, domain } = body ?? {}
  if (!subname) {
    return NextResponse.json({ success: false, error: 'subname is required' }, { status: 400 })
  }

  const parent = domain ?? process.env.NAMESTONE_DOMAIN
  try {
    await setSubname({ name: subname, address, textRecords, domain })
    return NextResponse.json({
      success: true,
      agentId,
      subname,
      address,
      ensName: parent ? `${subname}.${parent}` : subname,
    })
  } catch (err) {
    if (err instanceof NameStoneError) {
      // Pass through client errors (4xx) as-is; treat 5xx from NameStone as a gateway error.
      const status = err.status >= 400 && err.status < 500 ? err.status : 502
      return NextResponse.json(
        { success: false, error: err.message, namestoneStatus: err.status, body: err.body },
        { status }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to register subname'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
