import { NextRequest, NextResponse } from 'next/server'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { POST as generatePOST } from '@/app/api/menu-planner/generate/route'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handleCron(request)
}

export async function GET(request: Request) {
  return handleCron(request)
}

async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (process.env.NODE_ENV === 'production') {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        console.error(
          '[cron/agents/weekly-menu] Unauthorized attempt or missing CRON_SECRET in production'
        )
        return new NextResponse('Unauthorized', { status: 401 })
      }
    } else {
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[cron/agents/weekly-menu] Invalid CRON_SECRET provided')
      }
    }

    console.log(
      `[cron/agents/weekly-menu] Starting weekly menu generation for ${HISTORICAL_AGENTS.length} agents...`
    )

    // Helper to chunk the agents
    const batchSize = 5
    const results: any[] = []

    const chunk = <T>(arr: T[], size: number): T[][] =>
      Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
      )

    const batches = chunk(HISTORICAL_AGENTS, batchSize)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`[cron/agents/weekly-menu] Processing batch ${i + 1}/${batches.length}...`)

      const batchPromises = batch.map(async agent => {
        try {
          const req = new NextRequest(new URL('http://localhost/api/menu-planner/generate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId: agent.id,
              regenerate: false, // Don't replace existing unless requested
              status: 'completed',
              shareToFeed: true,
            }),
          })
          const res = await generatePOST(req)
          const data = await res.json()
          return {
            agentId: agent.id,
            success: data.success === true,
            menuId: data.menu?.id || null,
            reused: data.reused === true,
            error: data.error || null,
          }
        } catch (err: any) {
          console.error(`[cron/agents/weekly-menu] Failed for agent ${agent.id}:`, err)
          return {
            agentId: agent.id,
            success: false,
            error: err.message || String(err),
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add a small delay between batches to reduce pressure on API rates / DB pools
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const total = results.length
    const successful = results.filter(r => r.success).length
    const failed = total - successful

    console.log(
      `[cron/agents/weekly-menu] Finished. Successful: ${successful}, Failed: ${failed}, Total: ${total}`
    )

    return NextResponse.json(
      {
        success: failed === 0,
        total,
        successful,
        failed,
        results,
        timestamp: new Date().toISOString(),
      },
      { status: failed === 0 ? 200 : 207 }
    )
  } catch (error: any) {
    console.error('[cron/agents/weekly-menu] Fatal error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
