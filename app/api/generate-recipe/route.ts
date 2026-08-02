import { NextRequest, NextResponse } from 'next/server'
import { backend } from '@/lib/backend'

const DEFAULT_AI_DISCLAIMER =
  'Planetary Agent responses and cosmic recipes are synthesized using Large Language Models (LLMs) and real-time astrological transit algorithms. They are provided for culinary inspiration and entertainment only, and do not constitute human medical, nutritional, or professional advice.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const recipeData = await backend.request('/api/generate-recipe', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    return NextResponse.json({
      success: true,
      recipe: recipeData,
      ai_generated: true,
      disclaimer: DEFAULT_AI_DISCLAIMER,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error generating cosmic recipe:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate cosmic recipe',
        ai_generated: true,
        disclaimer: DEFAULT_AI_DISCLAIMER,
      },
      { status: 500 }
    )
  }
}
