/**
 * POST /api/agents/:agentId/reset-evs
 *
 * Wipes an agent's Evolution Values (EVs) back to zero so the user can re-spec,
 * charging an ESMS-token fee via the economy. XP and level are preserved — only
 * the trained EVs are reset (Pokémon-style EV reset).
 *
 * Auth: requires a session; the fee is debited from the authenticated user so a
 * spoofed body `userId` can never spend someone else's tokens.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EconomyService } from '@/lib/services/economyService'
import { AGENT_OPERATION_COSTS } from '@/lib/economy-config'

const EV_RESET_OPERATION = 'ev_reset'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: agentId } = await params
  const timestamp = new Date().toISOString()

  try {
    const session = await auth()
    const userId = session?.user.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to reset Evolution Values.', timestamp },
        { status: 401 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Missing agentId.', timestamp },
        { status: 400 }
      )
    }

    // Confirm the agent exists before charging anything.
    const agent = await (prisma.historical_agents as any).findUnique({
      where: { agentId },
      select: { agentId: true, evTotal: true },
    })
    if (!agent) {
      return NextResponse.json(
        { success: false, error: `Agent not found: ${agentId}`, timestamp },
        { status: 404 }
      )
    }

    // Nothing to reset — short-circuit so the user isn't charged for a no-op.
    if (!agent.evTotal || agent.evTotal <= 0) {
      return NextResponse.json({
        success: true,
        agentId,
        message: 'No Evolution Values to reset — agent is already at 0 EVs.',
        charged: false,
        timestamp,
      })
    }

    // Charge the ESMS fee from the authenticated user (atomic; fails if short).
    const debit = await EconomyService.debitOperation(userId, EV_RESET_OPERATION)
    if (!debit.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient ESMS tokens to reset Evolution Values.',
          required: AGENT_OPERATION_COSTS[EV_RESET_OPERATION],
          timestamp,
        },
        { status: 402 }
      )
    }

    const updated = await (prisma.historical_agents as any).update({
      where: { agentId },
      data: {
        evolutionValues: {},
        evTotal: 0,
        lastTrainingPartner: null,
      },
      select: { agentId: true, level: true, xp: true, evTotal: true },
    })

    return NextResponse.json({
      success: true,
      agentId,
      message: 'Evolution Values reset. ESMS tokens spent.',
      charged: true,
      cost: AGENT_OPERATION_COSTS[EV_RESET_OPERATION],
      level: updated.level,
      xp: updated.xp,
      evTotal: updated.evTotal,
      balances: debit.balances,
      timestamp,
    })
  } catch (error) {
    console.error('reset-evs error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp,
      },
      { status: 500 }
    )
  }
}
