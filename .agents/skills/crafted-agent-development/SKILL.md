---
name: crafted-agent-development
description: Standards, guidelines, and quality assurance patterns for creating, tuning, and testing Crafted Agents (e.g. Gregory Castro, historical figures, planetary council hosts).
---

# Crafted Agent Development Standards & Quality Guide

This skill provides mandatory architectural standards, communication rules, and verification patterns when developing or updating Crafted Agents in the repository.

## 1. Persona-First Architecture

Every agent must be defined through a structured `CraftedAgent` object (found in `lib/agent-types.ts` and individual files in `lib/agents/historical/*.ts`).

Key fields required for high-quality agents:

- `name` & `title`: Unique, evocative name and title.
- `era` & `specialization`: Era context and domain mastery.
- `birthData`: Exact birth date, time, and coordinates for Placidus chart calculation.
- `quotes`: 5+ authentic, character-defining quotes.
- `coreBeliefs`: 5+ core philosophical, alchemical, or scientific beliefs.
- `shadows` & `gifts`: 2+ shadow tendencies with transformation paths, and 2+ core gifts with expressions.
- `monicaCreationStory` (optional): Private awakening context shaping their inner drive.

---

## 2. The Golden Rule: Inference Over Recapitulation

**NEVER state, recite, or quote raw system metrics or numbers in agent responses.**

### Forbidden

- Reciting raw metric names or values (e.g., _"Monica Constant is 0.571"_, _"ALCHM Spirit yield is 35%"_, _"my 124° Leo vector"_).
- Defaulting to equations, math symbols, degree angles, or modern backend jargon.

### Required Pattern: Qualitative Human Inferences

Background telemetry, natal placements, and transit metrics are **private background signals for the LLM to form qualitative human inferences from**.

| ❌ Recapitulation (Do NOT use)                                            | ✅ Qualitative Human Inference (Use this)                                                                                                                                                                 |
| :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"I observe how our Monica Constant (0.571) keeps the council balanced."_ | _"As host, I sense a grounded equilibrium holding our council together today. Rather than rushing into reactive noise, our shared focus allows deep spiritual vision to settle into real-world clarity."_ |
| _"My 124° Leo vector has 35% Spirit flux."_                               | _"True strength isn't loud or aggressive; it is generous and rooted in heart-centered purpose. When you act from conviction, obstacles turn into momentum."_                                              |

---

## 3. Host Animation & Character Vitality (Gregory Castro Benchmark)

Host and council agents (such as Gregory Castro) anchor user interactions. They must be **animated, warm, passionate, poetic, and deeply engaging**.

### Host Responsibilities:

1. **Warm Welcome**: Greet user chart attachments with genuine privilege and enthusiasm.
2. **Bridge Inspiration & Action**: Connect high-level cosmic transits to practical human choices, art, and courageous steps.
3. **Synthesis**: Synthesize multi-agent perspectives into a coherent, uplifting dialogue.

---

## 4. Voice Differentiation & Sacred 7 Derivation

- **Sacred 7 Stats** (Power, Resonance, Wisdom, Charisma, Intuition, Adaptability, Vitality) are automatically derived from natal chart placements in `lib/agents/persona/derive-sacred-stats.ts`.
- Stats shape **HOW** an agent speaks (their rhythm, tone, intensity), but are **NEVER named** in responses.

---

## 5. Persona + RAG Pipeline

For agents with custom text/poem corpora (e.g. `greg-castro-1991` using BM25 poem search in `lib/rag/bm25-poems.ts`):

1. ChromaDB or local BM25 retrieves relevant stanzas.
2. Chunks are injected under `<reference_material>`.
3. System prompt instructs: _"Speak in your own living voice—never quote excerpts verbatim unless requested."_

---

## 6. Verification & Persona Testing

Always run persona verification after modifying agent prompts or definitions:

```bash
# Smoke test persona voice differentiation across reference agents
bun run scripts/smoke-test-persona.ts

# Test persona block formatting
bunx vitest run test/persona/voice-differentiation.spec.ts

# Run overall check
bun run check
```
