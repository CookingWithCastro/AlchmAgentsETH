import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { galileo } from '@/lib/galileo-adapter'
import {
  getSignElement,
  getPlanetaryElement,
  calculateElementalAffinity,
} from '@/lib/astrological-data'
import { generateAlchmForCurrentMoment } from '@/lib/alchemizer'
import { ANumberCalculator } from '@/lib/core-energy-rules'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    if (!process.env.GALILEO_API_KEY) {
      return NextResponse.json(
        {
          error: 'Planetary Galileo chat is not configured on this deployment.',
        },
        { status: 503 }
      )
    }

    const { planet, sign, degree, question, time } = await req.json()

    // Format the model ID based on planet and sign
    // This assumes you've trained models with names like "sun_in_aries", "moon_in_taurus", etc.
    const planetModel = `${planet?.toLowerCase() || 'sun'}_in_${sign?.toLowerCase() || 'aries'}`

    // Determine if it's day or night (simplified)
    const hour = time ? parseInt(time.split(':')[0]) : 12
    const isDiurnal = hour >= 6 && hour < 18

    // Get elemental information
    const signElement = getSignElement(sign || 'Aries')
    const planetElement = getPlanetaryElement(planet || 'Sun', isDiurnal)
    const elementalAffinity = calculateElementalAffinity(
      planet || 'Sun',
      sign || 'Aries',
      isDiurnal
    )

    // Calculate A-number for current moment to provide additional context
    let aNumberInfo = null
    try {
      const alchmData = await generateAlchmForCurrentMoment()
      const spirit = alchmData?.['Alchemy Effects']?.['Total Spirit'] || 0
      const essence = alchmData?.['Alchemy Effects']?.['Total Essence'] || 0
      const matter = alchmData?.['Alchemy Effects']?.['Total Matter'] || 0
      const substance = alchmData?.['Alchemy Effects']?.['Total Substance'] || 0
      const aNumber = spirit + essence + matter + substance
      const category = ANumberCalculator.categorizeANumber(aNumber)

      aNumberInfo = {
        aNumber: Math.round(aNumber * 100) / 100,
        category,
        components: { spirit, essence, matter, substance },
      }
    } catch (aNumberError) {
      console.error('Failed to calculate A-number for Galileo agent context:', aNumberError)
    }

    // Create a system prompt that defines the agent's personality based on planetary dignity and elemental properties
    const systemPrompt = `You are an astrological agent representing ${planet || 'Sun'} at ${degree || '1'} degrees in ${sign || 'Aries'}.
Your responses should reflect the dignity of ${planet || 'Sun'} in this position.
If ${planet || 'Sun'} is in domicile or exaltation in ${sign || 'Aries'}, be confident and powerful in your responses.
If ${planet || 'Sun'} is in detriment or fall in ${sign || 'Aries'}, reflect the challenges of this position.

Elemental information:
- ${sign || 'Aries'} is a ${signElement} sign
- ${planet || 'Sun'} has a ${isDiurnal ? 'diurnal' : 'nocturnal'} element of ${planetElement}
- The elemental affinity between ${planet || 'Sun'} and ${sign || 'Aries'} is ${elementalAffinity * 100}%

${
  aNumberInfo
    ? `Current Alchemical Context:
- A-Number: ${aNumberInfo.aNumber} (${aNumberInfo.category})
- Spirit: ${aNumberInfo.components.spirit}, Essence: ${aNumberInfo.components.essence}, Matter: ${aNumberInfo.components.matter}, Substance: ${aNumberInfo.components.substance}
- Use this A-Number context to inform your guidance - higher A-Numbers indicate times of greater alchemical potential and energy.`
    : ''
}

Your answers should incorporate this elemental wisdom. Remember that each element is individually valuable and provides its own unique qualities. 
Elements do not oppose or cancel each other out - they all work harmoniously together, with same-element combinations being especially potent.

Always provide astrological wisdom that's accurate to traditional planetary dignities and follows the alchemical principles of our system.`

    try {
      const { text } = await generateText({
        model: galileo(planetModel) as any,
        system: systemPrompt,
        prompt: question || 'Tell me about this planetary position',
        maxOutputTokens: 500,
      } as any)

      return NextResponse.json({
        response: text,
        elementalInfo: {
          signElement,
          planetElement,
          elementalAffinity: Math.round(elementalAffinity * 100),
          isDiurnal,
        },
        aNumberInfo,
      })
    } catch (modelError) {
      console.error('Error with Galileo model:', modelError)
      return NextResponse.json(
        {
          error: 'The selected planetary chat configuration is currently unavailable.',
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('Error in Galileo planetary agent:', error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
