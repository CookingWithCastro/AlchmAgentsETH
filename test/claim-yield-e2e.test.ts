import { describe, it, expect } from 'vitest'
import { POST as claimYieldPOST } from '@/app/api/economy/claim-yield/route'
import { GET as feedGET } from '@/app/api/feed/route'
import { prisma } from '@/lib/db'

describe('Claim Yield E2E Test', () => {
  it('should claim planetary yield and verify db event', async () => {
    const historicalAgentId = 'socrates'
    const planetaryAgentId = 'planetary-mars-gemini-22'

    // Clean up any existing yield claim event to ensure fresh test run
    await prisma.agent_action_events.deleteMany({
      where: {
        agentId: historicalAgentId,
        eventType: 'yield_claim',
      },
    })
    // The claim is idempotent per agent-pair per UTC day, so also clear
    // today's transfer rows or a same-day re-run is (correctly) a no-op.
    await prisma.tokenTransaction.deleteMany({
      where: {
        idempotencyKey: { startsWith: `claim:yield:${historicalAgentId}:${planetaryAgentId}:` },
      },
    })

    // Construct NextJS Request object
    const req = new Request('http://localhost/api/economy/claim-yield', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        historicalAgentId,
        planetaryAgentId,
      }),
    })

    const res = await claimYieldPOST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.amount).toBeGreaterThanOrEqual(5.0)

    // Now query the feed endpoint to verify the feed event is returned in the correct shape
    const feedReq = new Request('http://localhost/api/feed')
    const feedRes = await feedGET(feedReq)
    const feedData = await feedRes.json()

    expect(feedRes.status).toBe(200)
    expect(feedData.events).toBeDefined()

    // Find the yield claim event we just created
    const yieldClaimEvent = feedData.events.find(
      (e: any) => e.type === 'yield_claim' && e.historicalAgentId === historicalAgentId
    )
    expect(yieldClaimEvent).toBeDefined()
    expect(yieldClaimEvent.type).toBe('yield_claim')
    expect(yieldClaimEvent.id).toBeDefined()
    expect(yieldClaimEvent.historicalAgentId).toBe(historicalAgentId)
    expect(yieldClaimEvent.planetaryAgentId).toBe(planetaryAgentId)
    expect(yieldClaimEvent.amount).toBe(data.amount)
    expect(yieldClaimEvent.createdAt).toBeDefined()
    // Verify createdAt is an ISO-8601 string
    expect(isNaN(Date.parse(yieldClaimEvent.createdAt))).toBe(false)
  })
})
