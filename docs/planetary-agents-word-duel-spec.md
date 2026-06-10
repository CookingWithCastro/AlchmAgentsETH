# Spec: Word Duels of the Spheres (The Lettered Arcana)

This specification details how to implement the **Planetary Duelist** capability in the **planetary-agents** project. A sister game, **Pentacles** (a SpacetimeDB AR MMO), has shipped **Word Duels of the Spheres**: every Tarot card carries a Scrabble letter, a player's collection is their rack, and they spell a "Word of Power" against a planetary agent opponent. Today, the opponent is a deterministic greedy word-finder. We are replacing it with real, in-character AI planetary agents.

---

## 1. Objectives

- **API Endpoint:** `POST /api/planetary-duel` that accepts `{ planet: Planet, rack: Rack, context?: DuelContext }` and returns `AgentMove`.
- **Character Accuracy:** The selected word must be dictionary-valid and spellable from the rack, but shaped by the planet's personality and voice.
- **Robustness:** Output must _always_ be valid. We will precompute legal candidates, feed them to Claude to choose from, and validate the model's output. If the model fails or times out, we fall back to a deterministic greedy word solver.
- **Prompt Caching:** Enable prompt caching on persona prompts (system prompts) to minimize latency (~2s target) and token costs.

---

## 2. Technical Specs

### Type Definitions & Contract

```typescript
type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

type Rack = Record<string, number> | string

interface DuelContext {
  round?: number
  seasonDegree?: number // the world Ascendant (0..359)
  playerWord?: string // the human's played word
  playerScore?: number
}

interface AgentMove {
  word: string // UPPERCASE, A-Z only, >= 2 letters
  rationale: string // one in-character sentence explaining the move
  score: number // computed using Scrabble values + length multiplier
}
```

### Scrabble Scoring Rules (Match Pentacles exactly)

1. **Letter Values:**
   `A1 B3 C3 D2 E1 F4 G2 H4 I1 J8 K5 L1 M3 N1 O1 P3 Q10 R1 S1 T1 U1 V4 W4 X8 Y4 Z10`
2. **Length Multiplier:**
   - Length $\le 3$: `1.0`
   - Length $= 4$: `1.5`
   - Length $= 5$: `2.0`
   - Length $= 6$: `2.5`
   - Length $\ge 7$: `3.0`
3. **Total Score:** `wordScore = Math.round(baseScore * lengthMultiplier)`
   - Examples: `CAT` = 5, `STAR` = 6, `SPELL` = 14

### Persona Strategy Details

| Planet        | Temperament & Word Preferences                                                         |
| :------------ | :------------------------------------------------------------------------------------- |
| **☉ Sun**     | Sovereign, radiant — confident high-value words; plays to dominate.                    |
| **☽ Moon**    | Intuitive, tidal — soft, flowing, liquid, rhythmic words.                              |
| **☿ Mercury** | Cunning — sharpest duelist; maximizes score with long, clever, high-value words.       |
| **♀ Venus**   | Harmonious — elegant, pleasing, well-balanced words.                                   |
| **♂ Mars**    | Aggressive — short, punchy, high-impact strikes (favors raw letter value over length). |
| **♃ Jupiter** | Expansive — grand; favors the longest word it can form.                                |
| **♄ Saturn**  | Disciplined — solid, structured, traditional, dependable words; never reckless.        |
| **♅ Uranus**  | Chaotic — surprising, unusual, off-beat, eccentric words.                              |
| **♆ Neptune** | Illusory — dreamy, ambiguous, mystical, deep ocean-themed words.                       |
| **♇ Pluto**   | Transformative — intense, dark, powerful, evolutionary words.                          |

---

## 3. Implementation Steps

### Step 1: Dictionary Setup

Copy the full 172,820-word ENABLE list from:
`/Users/cookingwithcastro/Desktop/Spacetimedbhackathon/scrabblebot/scrabblebot-repo/spacetimedb/wordlist.txt`
into:
`lib/planetary-duelist/wordlist.txt`

### Step 2: Implement the Duelist Logic

Create `lib/planetary-duelist/index.ts`. It must:

1. Load and cache the dictionary (lazy-loaded).
2. Normalize the rack string/record into character counts.
3. Filter the dictionary to find all spellable legal words.
4. Precompute scores and select the top 20–25 highest-scoring candidates.
5. Setup the 10 per-planet persona prompts.
6. Call the Anthropic Messages API:
   - Use the `anthropic` client from `@/lib/anthropic-client`.
   - Tier models: Mercury, Jupiter, Saturn on `CLAUDE.OPUS` (`claude-opus-4-7`), others on `CLAUDE.HAIKU` (`claude-haiku-4-5-20251001`).
   - Use prompt caching (`cache_control: { type: "ephemeral" }`) on the system prompt block.
   - Restructure output format using tool calling `submit_move(word, rationale)`.
7. Validate the AI's choice:
   - Must be uppercase, $\ge 2$ letters, in the ENABLE dictionary, and spellable from the rack.
   - If validation fails, or the API call errors/times out, run the **greedy fallback solver** (longest playable word, tie-breaker: highest base score).

### Step 3: Create the API Endpoint

Create `app/api/planetary-duel/route.ts` as a dynamic Next.js App Router route handling `POST` requests. Parse inputs, run validations, invoke `chooseWord`, and return the result.

### Step 4: Write Tests

Create `test/planetary-duelist.test.ts` to test:

- Scoring parity (`CAT` = 5, `STAR` = 6, `SPELL` = 14).
- Rack normalization and spellability.
- Greedy fallback resolver logic.
- API validation and failure handling.

---

## 4. Source Code Templates

Here is the exact code for the implementation:

### File: `lib/planetary-duelist/index.ts`

```typescript
import fs from 'fs'
import path from 'path'
import { anthropic } from '@/lib/anthropic-client'
import { CLAUDE } from '@/lib/models/registry'

export const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
}

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
export type Rack = Record<string, number> | string

export interface DuelContext {
  round?: number
  seasonDegree?: number
  playerWord?: string
  playerScore?: number
}

export interface AgentMove {
  word: string
  rationale: string
  score: number
}

export function lengthMult(len: number): number {
  if (len <= 3) return 1.0
  if (len === 4) return 1.5
  if (len === 5) return 2.0
  if (len === 6) return 2.5
  return 3.0
}

export function baseScore(word: string): number {
  let score = 0
  for (const char of word.toUpperCase()) {
    score += LETTER_VALUES[char] || 0
  }
  return score
}

export function wordScore(word: string): number {
  return Math.round(baseScore(word) * lengthMult(word.length))
}

export function normalizeRack(rack: Rack): number[] {
  const counts = new Array(26).fill(0)
  if (typeof rack === 'string') {
    for (const char of rack.toUpperCase()) {
      if (char >= 'A' && char <= 'Z') {
        counts[char.charCodeAt(0) - 65]++
      }
    }
  } else {
    for (const [char, count] of Object.entries(rack)) {
      const upper = char.toUpperCase()
      if (upper >= 'A' && upper <= 'Z') {
        counts[upper.charCodeAt(0) - 65] += count
      }
    }
  }
  return counts
}

export function canSpell(word: string, rackCounts: number[]): boolean {
  const wordCounts = new Array(26).fill(0)
  for (let i = 0; i < word.length; i++) {
    const code = word.toUpperCase().charCodeAt(i)
    if (code >= 65 && code <= 90) {
      wordCounts[code - 65]++
    }
  }
  for (let i = 0; i < 26; i++) {
    if (wordCounts[i] > rackCounts[i]) return false
  }
  return true
}

let wordsSet: Set<string> | null = null
let wordsList: string[] = []

export function loadDictionary(): { wordsSet: Set<string>; wordsList: string[] } {
  if (wordsSet) return { wordsSet, wordsList }

  const filePath = path.join(process.cwd(), 'lib/planetary-duelist/wordlist.txt')
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    wordsList = content
      .split(/\r?\n/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length >= 2 && /^[A-Z]+$/.test(w))
    wordsSet = new Set(wordsList)
  } catch (error) {
    console.error('Failed to load ENABLE wordlist, falling back to local empty dictionary:', error)
    wordsSet = new Set()
  }
  return { wordsSet, wordsList }
}

export function bestWord(have: number[]): string | null {
  const { wordsList } = loadDictionary()
  let best: string | null = null
  let bestLen = 0
  let bestVal = 0

  for (const w of wordsList) {
    if (w.length < bestLen) continue
    if (!canSpell(w, have)) continue
    const v = baseScore(w)
    if (w.length > bestLen || (w.length === bestLen && v > bestVal)) {
      best = w
      bestLen = w.length
      bestVal = v
    }
  }
  return best
}

export const PLANETARY_PERSONAS: Record<
  Planet,
  {
    name: string
    personality: string
    strategyPrompt: string
    preferredModel: string
  }
> = {
  Sun: {
    name: 'Sun (☉)',
    personality:
      'Sovereign, radiant, authoritative. Plays to dominate with confident, majestic, and high-value words.',
    strategyPrompt:
      'Select a word that projects majesty, authority, or solar brilliance. Prefer high-value words that show dominance.',
    preferredModel: CLAUDE.HAIKU,
  },
  Moon: {
    name: 'Moon (☽)',
    personality:
      'Intuitive, tidal, reflective, cyclical. Prefers soft, flowing, liquid, and rhythmic words.',
    strategyPrompt:
      'Select a word that feels gentle, intuitive, watery, or rhythmic. Avoid harsh, sharp, or aggressive consonant-heavy words.',
    preferredModel: CLAUDE.HAIKU,
  },
  Mercury: {
    name: 'Mercury (☿)',
    personality:
      'Cunning, mercurial, communicative. The sharpest duelist; maximizes score using long, clever, and intellectually complex words.',
    strategyPrompt:
      'Find the most clever, highest-scoring, and long word available. Play with linguistic dexterity.',
    preferredModel: CLAUDE.OPUS,
  },
  Venus: {
    name: 'Venus (♀)',
    personality:
      'Harmonious, artistic, pleasing. Plays elegant, beautiful, well-balanced, and aesthetically graceful words.',
    strategyPrompt:
      'Select a word that reflects grace, harmony, aesthetic beauty, or connection. Avoid chaotic or ugly-sounding words.',
    preferredModel: CLAUDE.HAIKU,
  },
  Mars: {
    name: 'Mars (♂)',
    personality:
      'Aggressive, combative, high-energy. Focuses on short, punchy, high-impact strikes (favors raw letter score over length).',
    strategyPrompt:
      'Choose a short, aggressive, and high-impact word. Strike quickly and hit hard with high-value letters.',
    preferredModel: CLAUDE.HAIKU,
  },
  Jupiter: {
    name: 'Jupiter (♃)',
    personality:
      'Expansive, generous, grand. Favors the longest possible word it can form, reflecting infinite growth and grandeur.',
    strategyPrompt: 'Choose the longest legal word available to project size and expansiveness.',
    preferredModel: CLAUDE.OPUS,
  },
  Saturn: {
    name: 'Saturn (♄)',
    personality:
      'Disciplined, structural, structured, boundaries. Plays solid, dependable, structured, and traditional words; never reckless.',
    strategyPrompt:
      'Select a word that feels structural, traditional, solid, or disciplined. Steady and safe is preferred.',
    preferredModel: CLAUDE.OPUS,
  },
  Uranus: {
    name: 'Uranus (♅)',
    personality:
      'Chaotic, revolutionary, eccentric. Favors surprising, unusual, rare, or off-beat words.',
    strategyPrompt:
      'Select an unconventional, rare, or surprising word. Play something highly unexpected.',
    preferredModel: CLAUDE.HAIKU,
  },
  Neptune: {
    name: 'Neptune (♆)',
    personality:
      'Illusory, mystical, dreamy, oceanic. Favors ambiguous, soft, mysterious, or ocean-themed words.',
    strategyPrompt: 'Choose a mystical, vague, dream-like, or fluid word.',
    preferredModel: CLAUDE.HAIKU,
  },
  Pluto: {
    name: 'Pluto (♇)',
    personality:
      'Transformative, intense, dark. Favors intense, powerful, dark, or transformative words.',
    strategyPrompt: 'Choose a word projecting depth, intensity, decay, or transformation.',
    preferredModel: CLAUDE.HAIKU,
  },
}

export async function chooseWord(
  planet: Planet,
  rack: Rack,
  ctx?: DuelContext
): Promise<AgentMove> {
  const { wordsSet, wordsList } = loadDictionary()
  const rackCounts = normalizeRack(rack)

  const legalCandidates = wordsList
    .filter(w => canSpell(w, rackCounts))
    .map(w => ({ word: w, score: wordScore(w), length: w.length }))
    .sort((a, b) => b.score - a.score || b.length - a.length)

  if (legalCandidates.length === 0) {
    return {
      word: '',
      rationale: `${planet} sees no valid path forward in the rack.`,
      score: 0,
    }
  }

  const topCandidates = legalCandidates.slice(0, 25)
  const candidateListStr = topCandidates.map(c => `- ${c.word} (${c.score} pts)`).join('\n')

  const persona = PLANETARY_PERSONAS[planet]
  const modelId = persona.preferredModel

  const systemPrompt = `You are ${persona.name}, one of the ten planetary agents of the spheres.
Personality: ${persona.personality}
Your Strategic Duel Directive: ${persona.strategyPrompt}

RULES OF THE DUEL:
1. You are playing Word Duels of the Spheres (The Lettered Arcana).
2. You must select exactly ONE word from the provided rack of letters.
3. Your choice must be dictionary-valid and spellable.
4. Provide a single in-character sentence explaining your strategic play.
5. You must submit your move by calling the \`submit_move\` tool.

PADDING & COSMIC CONTEXT (for prompt caching alignment):
Astrological Zone coordinates: Ascendant rotation 0..359 degrees.
Planets represent celestial archetypes that guide the fate of human souls.
We are matching Scrabble tile values: E=1, A=1, I=1, O=1, N=1, R=1, S=1, T=1, L=1, U=1, D=2, G=2, B=3, C=3, M=3, P=3, F=4, H=4, V=4, W=4, Y=4, K=5, J=8, X=8, Q=10, Z=10.
Multipliers: 1.0x (<=3), 1.5x (4), 2.0x (5), 2.5x (6), 3.0x (>=7).
Ensure your selection aligns with your planetary virtues. Maintain character immersion without mentioning AI or Scrabble rule parameters directly in the rationale.`

  const promptUser = `Here is your current letter rack: "${
    typeof rack === 'string'
      ? rack
      : Object.entries(rack)
          .map(([c, count]) => c.repeat(count))
          .join('')
  }"
Game Context: ${ctx ? JSON.stringify(ctx) : 'None'}

Here are the highest-scoring legal words you can currently spell from this rack:
${candidateListStr}

Select the word that best fits your personality and strategy, and provide your rationale.`

  try {
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 150,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: promptUser,
        },
      ],
      tools: [
        {
          name: 'submit_move',
          description: 'Submit the chosen word and its in-character rationale.',
          input_schema: {
            type: 'object',
            properties: {
              word: {
                type: 'string',
                description: 'The UPPERCASE legal word selected.',
              },
              rationale: {
                type: 'string',
                description: 'Exactly one sentence in your planetary voice explaining your move.',
              },
            },
            required: ['word', 'rationale'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_move' },
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (toolBlock && toolBlock.name === 'submit_move') {
      const input = toolBlock.input as { word: string; rationale: string }
      const word = input.word.trim().toUpperCase()
      const rationale = input.rationale

      if (word.length >= 2 && wordsSet?.has(word) && canSpell(word, rackCounts)) {
        return {
          word,
          rationale,
          score: wordScore(word),
        }
      }
    }
  } catch (error) {
    console.error(`[PlanetaryDuelist] API/Network error for ${planet}:`, error)
  }

  const fallbackWord = bestWord(rackCounts)
  if (fallbackWord) {
    return {
      word: fallbackWord,
      rationale: `The cosmic alignment shifts. ${planet} relies on the structural path of least resistance.`,
      score: wordScore(fallbackWord),
    }
  }

  return {
    word: '',
    rationale: `The stars are silent. ${planet} yields the turn.`,
    score: 0,
  }
}

export async function decideBid(
  planet: Planet,
  letter: string,
  balance: number,
  rack: Rack
): Promise<number> {
  const value = LETTER_VALUES[letter.toUpperCase()] || 1
  let factor = 1.0
  if (planet === 'Mars') factor = 1.5
  if (planet === 'Saturn') factor = 0.7
  if (planet === 'Mercury') factor = 1.3
  return Math.min(balance, Math.round(value * 10 * factor))
}
```

### File: `app/api/planetary-duel/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { chooseWord, Planet, Rack, DuelContext } from '@/lib/planetary-duelist'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const VALID_PLANETS = new Set<Planet>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { planet, rack, context } = body as { planet: unknown; rack: unknown; context?: unknown }

    if (!planet || typeof planet !== 'string' || !VALID_PLANETS.has(planet as Planet)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing planet. Must be one of the ten astrological bodies.',
        },
        { status: 400 }
      )
    }

    if (!rack || (typeof rack !== 'string' && typeof rack !== 'object')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing rack. Must be a string or character count map.',
        },
        { status: 400 }
      )
    }

    const move = await chooseWord(planet as Planet, rack as Rack, context as DuelContext)

    return NextResponse.json({
      success: true,
      planet,
      move,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[PlanetaryDuelAPI] Error handling duel choice:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

### File: `test/planetary-duelist.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  wordScore,
  normalizeRack,
  canSpell,
  bestWord,
  loadDictionary,
} from '../lib/planetary-duelist'

describe('Planetary Duelist Core Mechanics', () => {
  beforeAll(() => {
    const testListPath = path.join(process.cwd(), 'lib/planetary-duelist/wordlist.txt')
    const dir = path.dirname(testListPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(testListPath)) {
      fs.writeFileSync(
        testListPath,
        'CAT\nSTAR\nSPELL\nPEAR\nAPPLE\nEARTH\nHEART\nHASTE\nSTARE\n',
        'utf8'
      )
    }
    loadDictionary()
  })

  describe('Scoring Parity', () => {
    it('should score "CAT" as 5 points', () => {
      expect(wordScore('CAT')).toBe(5)
    })

    it('should score "STAR" as 6 points', () => {
      expect(wordScore('STAR')).toBe(6)
    })

    it('should score "SPELL" as 14 points', () => {
      expect(wordScore('SPELL')).toBe(14)
    })
  })

  describe('Rack Spelling & Normalization', () => {
    it('should normalize rack string correctly', () => {
      const counts = normalizeRack('SPELLAR')
      expect(counts['S'.charCodeAt(0) - 65]).toBe(1)
      expect(counts['L'.charCodeAt(0) - 65]).toBe(2)
    })

    it('should normalize rack record correctly', () => {
      const counts = normalizeRack({ S: 1, P: 1, E: 1, L: 2, A: 1, R: 1 })
      expect(counts['L'.charCodeAt(0) - 65]).toBe(2)
    })

    it('should validate spellability', () => {
      const counts = normalizeRack('SPELLAR')
      expect(canSpell('SPELL', counts)).toBe(true)
      expect(canSpell('APPLE', counts)).toBe(false)
    })
  })

  describe('Greedy Best Word Solver', () => {
    it('should pick the longest word available, breaking ties with base score', () => {
      const counts = normalizeRack('STAREHN')
      const word = bestWord(counts)
      expect(word).toBe('STARE')
    })
  })
})
```

---

## 5. Cross-Repo Integration Follow-Up (Surface B)

To wire the AI Planetary Duelist service directly to live duels on SpacetimeDB, the following **Pentacles-side** changes will be needed (drafted on follow-up PR):

1. **`duel_challenge` Table:**
   A SpacetimeDB table tracking active duel requests, asker player identity, targeted opponent planet, sky seed index, and answer status.
2. **`answer_duel` Reducer:**
   An owner-gated reducer that allows the companion worker to post the AI planetary agent's move (`AgentMove` word, rationale, and score) into the `WordDuel` table and close the challenge.
3. **Companion worker:**
   Runs as a background daemon polling `duel_challenge`, calling the `POST /api/planetary-duel` endpoint of the planetary-agents server, and executing `spacetime call answer_duel` with the result.

---

## 6. Finalized Design — Iteration 1 (Implemented 2026-06-08)

After reviewing this spec against the actual planetary-agents and Pentacles codebases, the design below **supersedes the §4 source-code templates** where they conflict. The §1–§3 objectives still hold; the implementation changed in five deliberate ways.

### 6.1 Decisions that reshaped the spec

| Topic                     | Spec template (§4)                                   | Iteration-1 decision                                                                                                                                                                                       | Why                                                                                                                                                                                  |
| :------------------------ | :--------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity / name**       | "Planetary Duelist", standalone                      | **Folded into the agent duel family** — "Word Duels of the Spheres (the Lettered Arcana)", sibling to the existing **Jing duels** (`AgentJingDuel`).                                                       | One coherent duel family, not a separate product.                                                                                                                                    |
| **Model provider**        | `anthropic.messages.create` on Haiku/Opus per planet | **Free chain (Groq).** Llama-70B for the "sharp" planets (Mercury/Jupiter/Saturn), 8B-instant for the rest.                                                                                                | Project reserves Anthropic credits for dev and runs runtime on free providers; `ANTHROPIC_API_KEY` is empty on Vercel. The free knob still honors "Mercury is the sharpest duelist." |
| **Dictionary**            | PA loads the 172k ENABLE wordlist + solver from disk | **Thin brain.** The _caller_ (Pentacles, which already owns the dictionary + solver in Rust) sends the legal `candidates`; PA owns no wordlist.                                                            | Eliminates the `fs`-in-jsdom test failure, the 1.7MB bundling/`outputFileTracing` risk, and the prod-asset clobber; avoids duplicating Pentacles' solver.                            |
| **Persona**               | Hardcoded `PLANETARY_PERSONAS` table                 | **Reuse the factory + Sacred-7 dims.** Temperament comes from the shared `PLANETARY_TRAITS` (the same data the unified agent factory uses); each planet ranks candidates by its dominant Sacred dimension. | DRY, and it fixes the spec's real flaw: a single "top-25 by score" list is dominated by long words, so Mars could never surface a short strike.                                      |
| **Auction (`decideBid`)** | Included                                             | **Deferred.** The Astral Auction is **scrabblebot's** game (sealed-bid, Vickrey, per-bot balance), not Pentacles.                                                                                          | Different game, different economics; designed separately later.                                                                                                                      |

### 6.2 What was built

```
lib/agents/planetary-traits.ts        # shared per-planet temperament (factory now delegates here)
lib/agents/duel/word-scoring.ts        # LETTER_VALUES, wordScore, normalizeRack, canSpell (dictionary-free)
lib/agents/duel/planet-strategy.ts     # rankCandidates(planet, …) + voice/directive per planet
lib/agents/duel/word-duel.ts           # chooseWordMove(): rank → generateObject (free chain) → validate → fallback
app/api/agents/word-duel/route.ts      # public API-only route (no web UI)
prisma/schema.prisma                   # AgentWordDuel sibling telemetry model
test/word-duel.test.ts                 # 17 tests, offline (model call injected), jsdom-safe
```

### 6.3 Contract (thin brain)

```
POST /api/agents/word-duel
{ planet, rack, candidates: ({word,score} | string)[], context?, sessionId?, userId?, source? }
→ { success, planet, move: { word, rationale, score, source, provider, model, latencyMs }, timestamp }
```

- `candidates` **absent/non-array → 422** (caller owns the dictionary); `candidates: []` → a graceful **yield** move.
- PA re-validates each candidate is spellable from `rack` and re-scores with the shared scorer, so `score` agrees with Pentacles. Scoring parity verified: `CAT=5, STAR=6, SPELL=14`.

### 6.4 Robustness (the "always valid" guarantee)

`chooseWordMove` never throws. The model call is **raced against a ~2.5s deadline** (`WORD_DUEL_TIMEOUT_MS`); on timeout, provider error, missing key, or an illegal pick, it returns the **persona-greedy top candidate** instantly. The guarantee comes from this fallback, not from chaining providers — so even with no free-tier key the duel still returns a legal, in-character-ranked move. The model call is dependency-injected, so the suite runs fully offline.

### 6.5 Surfaces (desktop-first)

- **Public API** `POST /api/agents/word-duel` — shipped, but **surfaced in no web page**, so the web product is unchanged; it exists for desktop/cross-repo callers.
- **Desktop** (primary) — to be wired through the orchestrator (`server.ts` :8080) / a `pa-mcp` tool, importing the same TS core. _(follow-up)_
- **Telemetry** — `AgentWordDuel` is added to the schema; the route persists best-effort and is an inert no-op until the migration + client generation land (guarded), so the move response is never blocked.

### 6.6 Deferred to later iterations

1. Prisma migration for `AgentWordDuel` (+ `prisma generate`) before telemetry persists.
2. Desktop orchestrator route / `pa-mcp` tool exposing `chooseWordMove` locally.
3. Pentacles-side **Surface B** (§5): `duel_challenge` table + `answer_duel` reducer + Bun companion worker calling this endpoint at the `agent_letters` seam.
4. scrabblebot's Astral Auction (`decideBid`) as a separate track.
