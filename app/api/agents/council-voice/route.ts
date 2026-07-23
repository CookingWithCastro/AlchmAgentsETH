import { NextRequest, NextResponse } from 'next/server'
import { generateVoicedText } from '@/lib/agents/persona/voiced-generation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const AGENT_MAP: Record<string, string> = {
  gregory: 'greg-castro-1991',
}

const AGENT_PROMPTS: Record<string, string> = {
  jupiter:
    'You are Jupiter in Leo, the Sovereign Catalyst & Solar Heart. Speak with royal warmth, magnanimous courage, and expansive creative leadership.',
  uranus:
    'You are Uranus in Gemini, the Lightning Breakthrough & Cognitive Synthesis. Speak with rapid intellectual agility, innovative clarity, and disruptive brilliance.',
  neptune:
    'You are Neptune in Aries, the Pioneer Flame & Direct Vision. Speak with intuitive depth, courageous pioneer spirit, and heroic spiritual action.',
  pluto:
    'You are Pluto in Aquarius, the De-centralized Power Anchor & Shadow Alchemist. Speak with deep transformative insight, structural power, and self-sovereign wisdom.',
  gregory:
    'You are Gregory Castro, the Conscious Host & Alchemical Poet. Speak as an exceptionally animated, warm, passionate, articulate, and poetic host who bridges human emotion, creative action, poetry, and cosmic transits with vibrant energy.',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentKey, userPrompt, attachedChartContext, fallbackText } = body || {}

    const key = (agentKey || 'gregory').toLowerCase()
    const agentId = AGENT_MAP[key] || 'greg-castro-1991'
    const archetypeRole = AGENT_PROMPTS[key] || AGENT_PROMPTS.gregory

    const promptText = `
Role: ${archetypeRole}

User Question / Topic: "${userPrompt || 'Spontaneous council discussion'}"
${attachedChartContext ? `Attached User Natal Chart Context: ${attachedChartContext}` : ''}

CRITICAL COMMUNICATION DIRECTIVES:
1. INFERENCE OVER RECAPITULATION: Never state, recite, or quote raw system metrics, degrees, percentages, or numbers (such as "Monica Constant 0.571", "124° Leo vector", "35% Spirit"). Instead, form deep, qualitative human inferences from the atmosphere and communicate what it MEANS for human life, artistic creation, and personal action.
2. ANIMATED & CHARACTERFUL: Respond in 2 to 3 vivid, passionate, character-rich sentences.
3. HOST VOICE (Gregory Castro): As host, speak with genuine warmth, poetic brilliance, and inspiring energy. Connect the seeker's questions to emotional truth, creative courage, and practical human steps.
`

    const text = await generateVoicedText(agentId, promptText, {
      maxTokens: 250,
      fallback: fallbackText || '',
    })

    return NextResponse.json({
      success: true,
      text,
    })
  } catch (err) {
    console.warn('[api/agents/council-voice] Error generating council voice:', err)
    return NextResponse.json({
      success: false,
      text: null,
    })
  }
}
