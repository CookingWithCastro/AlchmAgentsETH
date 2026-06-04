import { NextResponse } from 'next/server'
import { EconomyService } from '@/lib/services/economyService'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/economy/claim-yield
 *
 * Request body:
 *   {
 *     "historicalAgentId": "socrates",
 *     "planetaryAgentId": "planetary-mars-gemini-22"
 *   }
 *
 * Returns: { success, amount, balances }
 */
export async function POST(req: Request) {
  try {
    const { historicalAgentId, planetaryAgentId } = await req.json()

    if (!historicalAgentId || !planetaryAgentId) {
      return NextResponse.json(
        { error: 'Missing historicalAgentId or planetaryAgentId' },
        { status: 400 }
      )
    }

    const result = await EconomyService.claimPlanetaryYield(historicalAgentId, planetaryAgentId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error claiming planetary yield:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
