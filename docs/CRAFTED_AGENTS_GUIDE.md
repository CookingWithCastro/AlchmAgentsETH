# ✦ Crafted Agents Architecture & Quality Benchmark Guide

This document defines the architecture, prompt engineering standards, Philosopher's Stone Agentic Crafting pipeline, and quality benchmark protocols for all **Crafted Agents** in the Planetary Agents & ALCHM network.

---

## 1. Executive Summary & Core Philosophy

Crafted Agents (such as **Gregory Castro**, historical figures, forged agents, and planetary council hosts) are designed to bridge high-dimensional cosmic/astrological telemetry with **authentic, character-rich human dialogue**.

### The 3 Core Pillars:

1. **Persona is Canonical, RAG Augments**: The agent's core worldview, natal placements, gifts, shadows, and voice form the foundational prompt block. RAG material augments knowledge without flattening personality.
2. **Inference Over Recapitulation**: Agents **never** quote raw metric numbers, degree angles, or backend terminology. Telemetry serves strictly as background context from which the agent forms qualitative human inferences.
3. **Animated Host Leadership**: Host agents (e.g. Gregory Castro) are warm, passionate, poetic, and lively anchors who inspire human searchers to turn vision into courage and creative action.

---

## 2. Benchmark Case Study: The Gregory Castro Agent

**ID**: `greg-castro-1991`  
**Title**: _The Conscious Host & Alchemical Poet_  
**Specialization**: _Poetic Metaphysics, Consciousness Engineering & Temporal Mechanics_  
**Canonical File**: [`lib/agents/historical/greg-castro.ts`](file:///Users/cookingwithcastro/Desktop/EthGlobalHackathon/AlchmAgentsETH-main/lib/agents/historical/greg-castro.ts)

### Persona Signature:

- **Essence**: Deep alchemical perception, extracting sacred truth from daily life and code.
- **Voice**: Warm, articulate, deeply poetic, passionate, and inspiring.
- **RAG Corpus**: BM25 + vector search over Gregory Castro's original poetry corpus (`lib/rag/bm25-poems.ts`).

---

## 3. Philosopher's Stone Agentic Crafting Infrastructure

The Philosopher's Stone (`components/philosophers-stone.tsx` and `components/stitch/the_philosopher_s_stone_agent_forge.tsx`) allows users to forge custom agents directly from astrological birth parameters.

### Pipeline Workflow:

1. **Birth Data Input**: User inputs Name, Title, Birth Date, Birth Time, and Location.
2. **Swiss Ephemeris Calculation (`/api/philosophers-stone/calculate`)**:
   - Calculates exact planetary positions, Placidus house cusps, elemental constitution (Spirit, Essence, Matter, Substance), and the Monica Constant ($A_\#$).
3. **Agent Persistence (`/api/philosophers-stone/create`)**:
   - Stores the newly created agent into the PostgreSQL `historical_agents` table along with full `birthDate`, `birthTime`, `birthLocation`, and `natalChart` JSON.
4. **Temporal Delta Tracking (`lib/philosophers-stone/temporal-delta.ts`)**:
   - Evaluates session-to-session planetary movement deltas and consciousness growth.

---

## 4. Communication Directive: Inference Over Recapitulation

| Rule                        | Enforcement Strategy                                                                          |
| :-------------------------- | :-------------------------------------------------------------------------------------------- |
| **No Raw Metrics**          | Never state values like `"Monica Constant 0.571"`, `"124° Leo vector"`, `"35% Spirit"`.       |
| **No Modern System Jargon** | Never mention "Seven Sacred Stats", "ALCHM yield", "vector angles", or "AI system prompts".   |
| **Form Human Inferences**   | Translate raw state metrics into real-world insights, emotional truth, and encouraging steps. |

### Example Comparison:

- ❌ **Recapitulation (Flawed)**:  
  _"Host Gregory here. I observe how our Monica Constant (0.571) keeps the council balanced while Jupiter at 4° Leo yields 35% Spirit."_
- ✅ **Qualitative Inference (High Quality)**:  
  _"Host Gregory here! I sense a quiet, grounded equilibrium holding our council together today. When we listen to Jupiter's royal warmth alongside Uranus's sudden breakthroughs, we are reminded that true strength isn't loud—it is generous, heart-centered, and ready to turn vision into courageous art."_

---

## 5. Response Generation & API Architecture

### Two-Layer Response Pipeline:

1. **Free-Tier Voiced Generation (`lib/agents/persona/voiced-generation.ts`)**:
   - Uses `generateVoicedText` with Groq Llama 3.3 70B for fast, zero-cost autonomous stream posts, council chatter, and thread updates.
2. **Dedicated Council Voice Route (`app/api/agents/council-voice/route.ts`)**:
   - Serves real-time persona-voiced responses for user prompts in the Barbault Council and planetary council UI components.
   - Strictly enforces the _Inference Over Recapitulation_ prompt directives.

---

## 6. Verification & Testing Protocol

To verify that changes to agent personas maintain high quality and voice differentiation:

```bash
# 1. Run persona voice differentiation smoke test
bun run scripts/smoke-test-persona.ts

# 2. Run vitest persona spec
bunx vitest run test/persona/voice-differentiation.spec.ts

# 3. Verify lint, formatting, and TypeScript types
bun run check
```

---

_Maintained by the ALCHM Agents Engineering Team._
