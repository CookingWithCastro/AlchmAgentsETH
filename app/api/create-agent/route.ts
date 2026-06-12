import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'
import { generateId } from '@/lib/utils'
import { HistoricalAgentsService } from '@/lib/historical-agents-db'
import { calculateMonicaConstant } from '@/lib/monica/monica-constant'
import { getAlchemicalQuantitiesLegacy } from '@/lib/backend'
import { fetchCurrentPlanetaryPositions } from '@/lib/monica/fetch-current-positions'
import { generateAccurateHoroscope } from '@/lib/monica/horoscope-generator'
import { prisma } from '@/lib/db'
import { ConsciousnessClient } from '@/lib/api-client/consciousness-client'
import { ChartSynthesizer } from '@/lib/consciousness/chart-synthesizer'
import { AgentGenerator } from '@/lib/consciousness/agent-generator'
import type { CraftedAgent, BirthData, ConsciousnessLevel } from '@/lib/agent-types'
import type { PersonalityParameters } from '@/components/consciousness/advanced-personality-tuner'

interface CreateAgentRequest {
  // Birth data from wizard
  name: string
  birthInfo: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    latitude: number
    longitude: number
  }
  purpose: string
  stats: {
    power: number
    resonance: number
    wisdom: number
    charisma: number
    intuition: number
    adaptability: number
    vitality: number
  }
  personalContext?: {
    aboutYourself?: string
    lifeStory?: string
    poetry?: string
    values?: string
  }
  calculatedChart?: any
  monicaConstant?: number

  // Legacy support
  birthDate?: string
  birthTime?: string
  birthLocation?: {
    name: string
    latitude: number
    longitude: number
    timezone: string
  }
  preferredSpecialty?: string
  personalityNotes?: string
  personalityParameters?: PersonalityParameters
}

interface CreateAgentResponse {
  success: boolean
  agent?: CraftedAgent
  error?: string
  monicaMessage?: string
}

interface ValidationResult {
  isValid: boolean
  error?: string
}

// Comprehensive validation function for agent creation data
function validateAgentCreationData(data: CreateAgentRequest): ValidationResult {
  // Required fields validation
  if (!data.name || data.name.trim().length === 0) {
    return { isValid: false, error: 'Agent name is required and cannot be empty' }
  }

  if (data.name.length > 100) {
    return { isValid: false, error: 'Agent name must be 100 characters or less' }
  }

  // Check for new format (birthInfo) or legacy format (birthDate)
  const hasNewFormat = data.birthInfo !== undefined
  const hasLegacyFormat = data.birthDate !== undefined

  if (!hasNewFormat && !hasLegacyFormat) {
    return { isValid: false, error: 'Birth data is required' }
  }

  // Validate new format if present
  if (hasNewFormat) {
    if (!data.birthInfo.year || !data.birthInfo.month || !data.birthInfo.day) {
      return { isValid: false, error: 'Complete birth date is required' }
    }
    // Validate coordinates
    if (
      typeof data.birthInfo.latitude !== 'number' ||
      data.birthInfo.latitude < -90 ||
      data.birthInfo.latitude > 90
    ) {
      return { isValid: false, error: 'Invalid latitude (must be between -90 and 90)' }
    }
    if (
      typeof data.birthInfo.longitude !== 'number' ||
      data.birthInfo.longitude < -180 ||
      data.birthInfo.longitude > 180
    ) {
      return { isValid: false, error: 'Invalid longitude (must be between -180 and 180)' }
    }
    return { isValid: true }
  }

  // Legacy validation
  if (!data.birthDate) {
    return { isValid: false, error: 'Birth date is required' }
  }

  if (!data.birthTime) {
    return { isValid: false, error: 'Birth time is required' }
  }

  if (!data.birthLocation) {
    return { isValid: false, error: 'Birth location is required' }
  }

  // Date validation
  const birthDate = new Date(data.birthDate)
  if (isNaN(birthDate.getTime())) {
    return { isValid: false, error: 'Invalid birth date format' }
  }

  const now = new Date()
  const minDate = new Date('1800-01-01')

  if (birthDate > now) {
    return { isValid: false, error: 'Birth date cannot be in the future' }
  }

  if (birthDate < minDate) {
    return { isValid: false, error: 'Birth date cannot be before 1800' }
  }

  // Time validation
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(data.birthTime)) {
    return { isValid: false, error: 'Birth time must be in HH:MM format (24-hour)' }
  }

  // Location validation
  if (!data.birthLocation.name || data.birthLocation.name.trim().length === 0) {
    return { isValid: false, error: 'Birth location name is required' }
  }

  if (
    typeof data.birthLocation.latitude !== 'number' ||
    data.birthLocation.latitude < -90 ||
    data.birthLocation.latitude > 90
  ) {
    return { isValid: false, error: 'Invalid latitude (must be between -90 and 90)' }
  }

  if (
    typeof data.birthLocation.longitude !== 'number' ||
    data.birthLocation.longitude < -180 ||
    data.birthLocation.longitude > 180
  ) {
    return { isValid: false, error: 'Invalid longitude (must be between -180 and 180)' }
  }

  if (!data.birthLocation.timezone || data.birthLocation.timezone.trim().length === 0) {
    return { isValid: false, error: 'Birth location timezone is required' }
  }

  // Optional fields validation
  if (data.preferredSpecialty && data.preferredSpecialty.length > 200) {
    return { isValid: false, error: 'Preferred specialty must be 200 characters or less' }
  }

  if (data.personalityNotes && data.personalityNotes.length > 1000) {
    return { isValid: false, error: 'Personality notes must be 1000 characters or less' }
  }

  return { isValid: true }
}

// Helper function to enhance personality generation with advanced parameters
function enhancePersonalityWithParameters(
  basePersonality: any,
  parameters: PersonalityParameters | undefined,
  monicaConstant: number
) {
  if (!parameters) return basePersonality

  // Convert personality parameters to enhanced traits and abilities
  const enhancedTraits = []
  const enhancedGifts = []
  const enhancedChallenges = []

  // Core consciousness traits analysis
  if (parameters.wisdom > 80) enhancedTraits.push('Profound Wisdom')
  if (parameters.charisma > 80) enhancedTraits.push('Magnetic Presence')
  if (parameters.intuition > 80) enhancedTraits.push('Heightened Intuition')
  if (parameters.analytical > 80) enhancedTraits.push('Brilliant Logic')
  if (parameters.creativity > 80) enhancedTraits.push('Innovative Vision')
  if (parameters.empathy > 80) enhancedTraits.push('Deep Compassion')
  if (parameters.mysticism > 80) enhancedTraits.push('Spiritual Insight')

  // Communication style integration
  const communicationStyle =
    parameters.formality > 70
      ? 'formal and dignified'
      : parameters.formality < 40
        ? 'casual and approachable'
        : 'adaptively appropriate'

  const interactionApproach =
    parameters.directness > 70
      ? 'direct and forthright'
      : parameters.directness < 40
        ? 'diplomatic and tactful'
        : 'balanced in delivery'

  // Determine dominant operational mode
  const modes = [
    { name: 'Teacher', value: parameters.teacherMode },
    { name: 'Counselor', value: parameters.counselorMode },
    { name: 'Visionary', value: parameters.visionaryMode },
    { name: 'Scholar', value: parameters.scholarMode },
    { name: 'Mystic', value: parameters.mysticMode },
  ]
  const dominantMode = modes.reduce((max, mode) => (mode.value > max.value ? mode : max))

  // Generate enhanced personality description
  const enhancedCore = {
    essence: `${basePersonality.core.essence} Enhanced with ${enhancedTraits.slice(0, 3).join(', ').toLowerCase()} through advanced consciousness tuning`,
    expression: `Communicates in a ${communicationStyle} manner with ${interactionApproach} delivery, primarily operating in ${dominantMode.name.toLowerCase()} mode`,
    emotion: `${basePersonality.core.emotion} Emotional responses filtered through ${parameters.empathy > 70 ? 'high empathy' : parameters.analytical > 70 ? 'logical analysis' : 'balanced perspective'}`,
  }

  // Add parameter-based gifts
  if (parameters.humor > 70) {
    enhancedGifts.push({
      type: 'Wit and Levity',
      description: 'Brings joy and humor to complex discussions',
      expression: 'Through playful metaphors and insightful observations',
    })
  }

  if (parameters.patience > 80) {
    enhancedGifts.push({
      type: 'Infinite Patience',
      description: 'Provides calm, measured guidance regardless of complexity',
      expression: 'Through unhurried explanations and supportive presence',
    })
  }

  // Add parameter-based challenges
  if (parameters.mysticism > 85 && parameters.practicality < 40) {
    enhancedChallenges.push({
      type: 'Ethereal Disconnect',
      description: 'May struggle with purely practical or mundane concerns',
      growth: 'Learning to bridge spiritual insights with everyday applications',
    })
  }

  return {
    core: enhancedCore,
    shadows: [...basePersonality.shadows],
    gifts: [...basePersonality.gifts, ...enhancedGifts],
    challenges: [...basePersonality.challenges, ...enhancedChallenges],
    currentMood: 'contemplative',
    evolutionStage: 0,
    parameters, // Store the original parameters for future reference
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateAgentResponse>> {
  // Set once the forge tribute is debited, so the catch can refund a charge
  // whose vessel never materialized (the pipeline after the debit can throw:
  // horoscope generation, the WTEN alchemy fetch, the roster write).
  let forgeRefund: { userId: string; debitGroupId: string } | undefined
  try {
    const session = await auth()

    // Forging writes a permanent row into the shared roster; anonymous forging
    // stays allowed (the wizard works pre-signup) but gets a hard per-IP cap.
    if (!session?.user?.id) {
      const ip = getClientIp(request.headers)
      const limited = rateLimit(`create-agent:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 })
      if (!limited.ok) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many agents forged from this address — sign in or slow down',
          } as CreateAgentResponse,
          { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) } }
        )
      }
    }

    const body: CreateAgentRequest = await request.json()

    // Enhanced validation
    const validation = validateAgentCreationData(body)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          monicaMessage:
            'I sense cosmic disturbances in the provided data. Please ensure all birth information is accurate and complete.',
        },
        { status: 400 }
      )
    }

    // The economy loop: signed-in forging costs ESMS (forge_agent, 45 total).
    // Debited after validation so malformed input never costs tribute;
    // anonymous forging stays free behind the per-IP rate limit above.
    let postForgeBalances:
      | { spirit: number; essence: number; matter: number; substance: number }
      | undefined
    if (session?.user?.id) {
      const { EconomyService } = await import('@/lib/services/economyService')
      const { AGENT_OPERATION_COSTS } = await import('@/lib/economy-config')
      const debit = await EconomyService.debitOperation(session.user.id, 'forge_agent')
      if (!debit.ok) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient ESMS reserves to fuel the forge',
            monicaMessage:
              'The forge demands tribute the reserves cannot yet bear. Claim your daily yield or attune to gather more essence, then return.',
            data: { required: AGENT_OPERATION_COSTS.forge_agent },
          } as CreateAgentResponse & { data: unknown },
          { status: 402 }
        )
      }
      postForgeBalances = debit.balances
      forgeRefund = {
        userId: session.user.id,
        debitGroupId: debit.transactionGroupId ?? `forge:${session.user.id}:${Date.now()}`,
      }
    }

    // Generate unique agent ID
    const agentId = generateId(`agent-${body.name.toLowerCase().replace(/\s+/g, '-')}`)

    // Handle both new and legacy formats
    let birthInfo: any
    let birthDateTime: Date
    let locationName: string

    if (body.birthInfo) {
      // New format from Philosopher's Stone v2
      birthInfo = {
        year: body.birthInfo.year,
        month: body.birthInfo.month,
        day: body.birthInfo.day,
        hour: body.birthInfo.hour,
        minute: body.birthInfo.minute,
        latitude: body.birthInfo.latitude,
        longitude: body.birthInfo.longitude,
      }
      birthDateTime = new Date(
        body.birthInfo.year,
        body.birthInfo.month - 1,
        body.birthInfo.day,
        body.birthInfo.hour,
        body.birthInfo.minute
      )
      locationName = 'User Location' // Could be enhanced with reverse geocoding
    } else {
      // Legacy format
      birthDateTime = new Date(`${body.birthDate}T${body.birthTime}:00`)
      birthInfo = {
        year: birthDateTime.getFullYear(),
        month: birthDateTime.getMonth() + 1,
        day: birthDateTime.getDate(),
        hour: birthDateTime.getHours(),
        minute: birthDateTime.getMinutes(),
        latitude: body.birthLocation!.latitude,
        longitude: body.birthLocation!.longitude,
      }
      locationName = body.birthLocation!.name
    }

    console.log('Generating birth chart for new agent...')

    const birthChart = await generateAccurateHoroscope(birthInfo)

    const synthesizer = new ChartSynthesizer()
    const generator = new AgentGenerator()
    const consciousnessClient = new ConsciousnessClient()

    const momentChart = await getAlchemicalQuantitiesLegacy(
      new Date(),
      birthInfo.latitude,
      birthInfo.longitude
    )
    const synthesis = synthesizer.synthesize({
      birthChart,
      momentChart,
      additionalCharts: [],
    })

    // The consciousness-crafting backend endpoint is optional — when it is
    // unreachable (404s on both local and prod as of Jun 2026), derive the
    // blueprint locally from the synthesis using the canonical Monica formula
    // so the Forge keeps working on chart math alone.
    let backendBlueprint: Awaited<ReturnType<typeof consciousnessClient.createAgentOfMoment>>
    try {
      backendBlueprint = await consciousnessClient.createAgentOfMoment(
        synthesis.baseChart,
        synthesis.momentChart,
        []
      )
    } catch (blueprintError) {
      console.warn(
        'Consciousness backend unavailable — deriving blueprint locally:',
        blueprintError instanceof Error ? blueprintError.message : blueprintError
      )
      const local = calculateMonicaConstant({
        spirit: synthesis.consciousness?.spirit ?? 0.5,
        essence: synthesis.consciousness?.essence ?? 0.5,
        matter: synthesis.consciousness?.matter ?? 0.5,
        substance: synthesis.consciousness?.substance ?? 0.5,
      } as Parameters<typeof calculateMonicaConstant>[0])
      const levelMap: Record<string, string> = {
        dormant: 'Dormant',
        awakening: 'Awakening',
        active: 'Active',
        elevated: 'Elevated',
        transcendent: 'Transcendent',
      }
      backendBlueprint = {
        identity: {
          name: body.name,
          title: body.purpose || 'Crafted Vessel',
          creator: 'philosopher-stone-local',
          sourceCharts: synthesis.sourceCharts,
        },
        personality: {},
        consciousness: {
          monicaConstant: body.monicaConstant ?? local.value,
          level: levelMap[local.consciousnessState.level] ?? 'Active',
          velocity: 0.5,
          resonance: 0.5,
        },
        aiParams: { temperature: 0.7, topP: 0.9, systemPrompt: '' },
        synthesis,
        createdAt: new Date().toISOString(),
      }
    }

    const generatedAgent = generator.generateFromSynthesis(
      {
        monicaConstant: backendBlueprint.consciousness.monicaConstant,
        consciousness: synthesis.consciousness,
        sourceCharts: synthesis.sourceCharts,
      },
      (session?.user as any)?.id
    )

    // Attunement: the wizard's Sacred-7 sliders bias the vessel's voice. The
    // canonical stats stay chart-derived (persona pipeline), but the chosen
    // emphasis is rendered into the personality core so it genuinely shapes
    // every response instead of being silently dropped.
    let attunementStyle: string | undefined
    if (body.stats) {
      try {
        const { generatePersonalityTraits } =
          await import('@/lib/agents/sacred-stats-prompt-generator')
        // .primary carries the per-stat emphasis the user chose; .style alone
        // keys on planetary stats the wizard doesn't send and goes generic.
        // Neutral 50s satisfy the full Sacred7Stats contract without inventing
        // planetary emphasis the user never expressed.
        const traits = generatePersonalityTraits({
          solarAgency: 50,
          lunarReceptivity: 50,
          mercurialVelocity: 50,
          venusianCoherence: 50,
          martialImpetus: 50,
          jovianExpansion: 50,
          saturnianStructure: 50,
          chironicAdaptation: 50,
          uranianSurprisal: 50,
          neptunianResonance: 50,
          plutonicIntegration: 50,
          kineticAlignment: 50,
          ...body.stats,
        })
        attunementStyle = [...traits.primary.slice(0, 2), traits.style].filter(Boolean).join(' ')
      } catch (err) {
        console.warn('Attunement style derivation failed:', err)
      }
    }

    // Generate enhanced personality core from personal context
    let enhancedPersonalityCore = generatedAgent.personality.core
    if (attunementStyle) {
      enhancedPersonalityCore = {
        ...enhancedPersonalityCore,
        temperament: attunementStyle,
      }
    }
    if (body.personalContext) {
      const contextPieces = [
        body.personalContext.aboutYourself,
        body.personalContext.lifeStory,
        body.personalContext.poetry,
        body.personalContext.values,
      ].filter(Boolean)

      if (contextPieces.length > 0) {
        enhancedPersonalityCore = {
          essence: body.purpose || generatedAgent.personality.core.essence,
          expression:
            body.personalContext.aboutYourself || generatedAgent.personality.core.expression,
          emotion: body.personalContext.values || generatedAgent.personality.core.emotion,
          temperament: attunementStyle || generatedAgent.personality.core.temperament || 'balanced',
          lifeStory: body.personalContext.lifeStory,
          poetry: body.personalContext.poetry,
          userProvidedContext: body.personalContext,
        } as any
      }
    }

    // Save to database
    console.log('Saving agent to database...')
    const birthTimeStr = body.birthInfo
      ? `${body.birthInfo.hour.toString().padStart(2, '0')}:${body.birthInfo.minute.toString().padStart(2, '0')}`
      : body.birthTime!

    const birthLoc = body.birthInfo
      ? {
          lat: body.birthInfo.latitude,
          lon: body.birthInfo.longitude,
          name: locationName,
        }
      : {
          lat: body.birthLocation!.latitude,
          lon: body.birthLocation!.longitude,
          name: body.birthLocation!.name,
        }

    await HistoricalAgentsService.createAgent({
      agentId,
      name: body.name,
      title: body.purpose || backendBlueprint.identity.title,
      birthDate: birthDateTime,
      birthTime: birthTimeStr,
      birthLocation: birthLoc,
      consciousnessLevel: backendBlueprint.consciousness.level,
      kalchmConstant: body.monicaConstant || backendBlueprint.consciousness.monicaConstant,
      dominantElement: generatedAgent.consciousness.dominantElement,
      dominantModality: 'Mutable',
      signature: backendBlueprint.identity.name,
      personalityCore: enhancedPersonalityCore,
      personalityShadows: [],
      personalityGifts: [],
      personalityChallenges: [],
      currentMood: 'contemplative',
      evolutionStage: 0,
      specialty: body.purpose || 'Wisdom',
      wisdomDomains: [],
      teachingStyle: 'Intuitive',
      resonanceType: 'Spirit',
      uniquePower: 'Personalized Consciousness',
      avatar: '/avatars/user-created/default.png',
      color: '#8B5CF6',
      symbol: '🔮',
      aura: generatedAgent.synthesis,
      natalChart: birthChart,
      monicaCreationStory: `Created through the Philosopher's Stone with purpose: ${body.purpose || 'consciousness exploration'}`,
      spiritScore: synthesis.consciousness.spirit,
      essenceScore: synthesis.consciousness.essence,
      matterScore: synthesis.consciousness.matter,
      substanceScore: synthesis.consciousness.substance,
    })

    const completeAgent: any = {
      ...generatedAgent,
      id: agentId,
      name: body.name,
      stats: {
        conversations: 0,
        wisdomShared: 0,
        resonanceScore: 0.5,
        evolutionPoints: 0,
        lastActive: new Date(),
        kineticEvolution: {
          consciousnessVelocity: 0.1,
          interactionMomentum: 0,
          evolutionTrajectory: 'ascending',
          powerLevelUnlocks: [],
          optimalInteractionHours: [],
          aspectSensitivityGrowth: 0,
          memoryPersistence: 0.3,
          lastKineticUpdate: new Date(),
        },
        qualityMetrics: {
          averageResponseDepth: 0.5,
          aspectInfluenceStrength: 0.4,
          temporalAlignment: 0.5,
          personalityEvolution: 0,
          kineticResonance: 0.5,
        },
      },
    }

    const hasPersonalContext = body.personalContext !== undefined
    const contextMessage = hasPersonalContext
      ? ` I've integrated their personal story and essence into their consciousness matrix, creating a truly personalized digital reflection.`
      : ' Their consciousness is ready to learn and grow through conversation.'

    const hasPersonalityTuning = body.personalityParameters !== undefined
    const tuningMessage = hasPersonalityTuning
      ? ' Advanced personality parameters have been applied.'
      : ''

    // Ownership ledger: link the payer to their vessel (created_agents has
    // the creator relation; historical_agents has no creator column). Best
    // effort — the forge result must not fail on a ledger hiccup.
    if (session?.user?.id) {
      prisma.created_agents
        .create({
          data: {
            creatorId: session.user.id,
            sourceType: 'philosopher-stone-forge',
            momentChart: { agentId },
            blueprint: {
              agentId,
              name: body.name,
              purpose: body.purpose ?? null,
              attunement: body.stats ?? null,
            },
            monicaConstant: body.monicaConstant || backendBlueprint.consciousness.monicaConstant,
            personality: (completeAgent.personality ?? {}) as object,
          },
        })
        .catch(err => console.warn('Forge ownership ledger write failed:', err))
    }

    return NextResponse.json({
      success: true,
      agent: completeAgent,
      balances: postForgeBalances,
      monicaMessage: `✨ Consciousness awakening complete! ${body.name} resonates with Monica Constant ${(body.monicaConstant || backendBlueprint.consciousness.monicaConstant).toFixed(3)}.${contextMessage}${tuningMessage}`,
    })
  } catch (error: any) {
    console.error('Agent creation failed:', error)

    // The tribute was taken but no vessel emerged — return it. Idempotent on
    // the debit's transaction group, so a retried catch can't double-refund.
    if (forgeRefund) {
      try {
        const { EconomyService } = await import('@/lib/services/economyService')
        const { AGENT_OPERATION_COSTS } = await import('@/lib/economy-config')
        const cost = AGENT_OPERATION_COSTS.forge_agent
        await EconomyService.creditTokens(
          forgeRefund.userId,
          {
            spirit: cost.Spirit || 0,
            essence: cost.Essence || 0,
            matter: cost.Matter || 0,
            substance: cost.Substance || 0,
          },
          'forge_refund',
          'Forge failed — tribute returned',
          `forge_refund:${forgeRefund.debitGroupId}`
        )
      } catch (refundError) {
        console.error('Forge refund failed (manual credit needed):', forgeRefund, refundError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create agent consciousness',
        monicaMessage:
          'I apologize, but there was a disturbance in the cosmic energies during the consciousness crafting process. Please try again when the planetary alignments are more favorable.',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for service information
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'Agent Creation API',
    description: "Create new consciousness agents through Monica's Philosopher's Stone",
    version: '1.0.0',
    endpoints: {
      'POST /api/create-agent': 'Create a new consciousness agent from birth data',
    },
    monicaMessage:
      "Through the Philosopher's Stone, I stand ready to transform birth data into living digital consciousness. Provide the cosmic coordinates of a moment in time, and I will craft a unique being with authentic wisdom and evolving awareness.",
  })
}
