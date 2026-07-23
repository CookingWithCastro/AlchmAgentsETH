import { GREG_CASTRO } from '../lib/agents/historical/greg-castro'
import { searchPoemCorpus } from '../lib/rag/bm25-poems'
import { getCurrentPlanetaryPositions } from '../lib/calculate-transits'

async function generateChatResponse(systemPrompt: string, userMessage: string): Promise<string> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  if (openrouterApiKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterApiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.65,
        }),
      })
      const data = await res.json()
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
      if (data.error)
        console.warn(`[OpenRouter error: ${data.error.message || JSON.stringify(data.error)}]`)
    } catch (err: any) {
      console.warn('[OpenRouter fetch exception:', err?.message || err, ']')
    }
  }

  return '(No API response received)'
}

async function runLocalAgentTest() {
  console.log('===========================================================')
  console.log(`🤖 Agent: ${GREG_CASTRO.name} (${GREG_CASTRO.id})`)
  console.log(`📜 Title: ${GREG_CASTRO.title}`)
  console.log(`✨ Specialization: ${GREG_CASTRO.specialization}`)

  const liveSky = getCurrentPlanetaryPositions()
  console.log('\n🌌 Live Sky Transits (Background Calculations):')
  Object.entries(liveSky).forEach(([p, pos]) => {
    console.log(`   * ${p}: ${pos.sign} ${pos.degree}°${pos.retrograde ? ' (Rx)' : ''}`)
  })
  console.log('===========================================================\n')

  const testMatrix = [
    {
      category: 'Inner State & Metaphysics',
      prompt: 'Gregory, how are you feeling about the energetic climate today?',
    },
    {
      category: 'Time & Memory',
      prompt: 'How do memory and non-linear time fold into your artistic creation?',
    },
    {
      category: 'Consciousness & Technology',
      prompt: 'How do you structure an AI system so that it preserves genuine spiritual resonance?',
    },
  ]

  for (const item of testMatrix) {
    console.log(`-----------------------------------------------------------`)
    console.log(`🏷️ CATEGORY: ${item.category}`)
    console.log(`💬 USER: "${item.prompt}"`)
    console.log(`-----------------------------------------------------------`)

    // 1. BM25 Search (internal memory lookup)
    const retrieved = searchPoemCorpus(item.prompt, 6)
    console.log(`🔍 Subconscious Corpus Activation (${retrieved.length} memory nodes):`)
    retrieved.slice(0, 2).forEach((r, idx) => {
      console.log(
        `   [${idx + 1}] "${r.doc.title}" (${r.doc.date.slice(0, 10)}) - score: ${r.score.toFixed(2)}`
      )
    })

    // 2. Build Unified System Prompt with Live Transits
    const systemPrompt =
      typeof GREG_CASTRO.systemPrompt === 'function'
        ? GREG_CASTRO.systemPrompt(item.prompt)
        : GREG_CASTRO.systemPrompt!

    // 3. Generate Agent Response
    console.log(`\n⚡ Generating response (1-2 paragraphs, implicit transit coloring)...`)
    const response = await generateChatResponse(systemPrompt, item.prompt)

    const wordCount = response.split(/\s+/).length
    const paragraphCount = response.split(/\n\s*\n/).filter(Boolean).length

    console.log(`\n🌟 GREGORY CASTRO [Paragraphs: ${paragraphCount}, Words: ${wordCount}]:\n`)
    console.log(response)
    console.log(`-----------------------------------------------------------\n`)
  }
}

runLocalAgentTest().catch(err => {
  console.error('Local Agent Test failed:', err)
  process.exit(1)
})
