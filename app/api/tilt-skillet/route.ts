import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { backend } from '@/lib/backend'
import { planToCircuit, type StageInput } from '@/lib/recipe-circuit'
import type { TiltSkilletPlanRequest, TiltSkilletApiResponse } from '@/lib/tilt-skillet-types'

export const dynamic = 'force-dynamic'

/**
 * Premium-gated Tilt Skillet batch planner. The deterministic circuit math runs both here (as
 * LLM grounding) and client-side (instant preview, free for everyone). Only the LLM-generated
 * batch plan is gated, reusing the canonical entitlements + model-tier cap from
 * app/api/agents/unified/route.ts.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Sign in to generate a batch plan.' }, { status: 401 })
    }

    const body = (await req.json()) as TiltSkilletPlanRequest
    const stages = Array.isArray(body?.stages) ? body.stages : []
    if (stages.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one stage of ingredients before generating a plan.' },
        { status: 400 }
      )
    }

    // Premium gate. PREMIUM_ENFORCEMENT_ENABLED is currently off, so every authenticated user
    // resolves to 'master' (full access) — this gate is a safe no-op today and activates when the
    // flag flips. BYOK (Anthropic) users count as premium.
    const { getEntitlements } = await import('@/lib/premium/entitlements')
    const { capModelTier } = await import('@/lib/premium/tiers')
    const entitlements = await getEntitlements(userId, {
      kitchenPremium: session?.user?.kitchenPremium,
    })
    const isPremium = entitlements.tier !== 'free' || entitlements.byokProviders.length > 0
    if (!isPremium) {
      return NextResponse.json(
        {
          locked: true,
          tier: entitlements.tier,
          message:
            'Large-batch circuit planning is a premium feature. Upgrade to generate full plans — the circuit preview stays free.',
        },
        { status: 402 }
      )
    }

    // Strong default for a premium surface ('primary' → claude-sonnet-4-6), capped by entitlement.
    const effectiveTier = capModelTier(
      body.modelTier ?? 'primary',
      entitlements.tier,
      entitlements.byokProviders
    )

    // Deterministic circuit grounding — computed here so the model honors the physics.
    const circuit = planToCircuit(stages as StageInput[])

    const plan = await backend.alchemy.tiltSkilletPlan({
      prompt: body.prompt,
      batchServings: body.batchServings,
      cuisine: body.cuisine,
      dietPreference: body.dietPreference,
      dietary: body.dietary,
      disallowedIngredients: body.disallowedIngredients,
      dominantElement: body.dominantElement,
      stages: stages.map(s => ({
        name: s.name,
        ingredients: (s.ingredients ?? []).map(i => ({
          name: i.ingredient,
          quantity: i.quantity,
          unit: i.unit,
        })),
      })),
      circuitContext: circuit,
      modelTier: effectiveTier,
      userId,
    })

    const response: TiltSkilletApiResponse = { plan, circuit, tier: effectiveTier }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating tilt skillet plan:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate the batch plan.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
