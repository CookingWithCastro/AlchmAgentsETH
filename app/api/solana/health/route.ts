import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'
import { collectSolanaOperationalHealth } from '@/lib/solana/health'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!hasInternalApiSecret(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const health = await collectSolanaOperationalHealth(prisma)
    return NextResponse.json(health, { status: health.status === 'healthy' ? 200 : 503 })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        cluster: 'devnet',
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Solana health check failed',
      },
      { status: 503 }
    )
  }
}
