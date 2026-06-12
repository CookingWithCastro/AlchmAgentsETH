# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package manager

**Use `bun` for everything — installs, scripts, dev server.** Yarn fails with a Corepack mismatch on this machine; npm triggers strict-peer warnings. The repo's `packageManager` field pins `bun@1.3.13`. `bunx tsx` is currently broken in this env — use `bun run scripts/foo.ts` instead.

## Commands

### Frontend (Next.js)

```bash
bun dev          # Start dev server (NODE_OPTIONS max-old-space-size=4096)
bun run build    # Production build
bun run lint     # ESLint across .js/.jsx/.ts/.tsx
bun run lint:fix # ESLint with autofix
bun run format   # Prettier write
bunx tsc --noEmit  # tsc --noEmit (0 errors on the typed surface; the build enforces it)
bun run check    # lint + format:check + typecheck combined
```

### Testing

```bash
# Integration & unit tests (vitest, jsdom)
bunx vitest run test/                                # All tests in test/
bunx vitest run test/monica.spec.ts                  # Single spec file
bunx vitest run --config vitest.unit.config.ts       # Unit config (no storybook project)

# Chat system test aliases
bun run test:chat              # All chat-system tests
bun run test:chat:unit         # Unit only
bun run test:chat:integration  # Integration only

# Persona smoke test (verify voice differentiation across 5 reference agents)
bun run scripts/smoke-test-persona.ts

# Backend (Python)
cd backend && pytest                   # All backend tests
cd backend && ruff check .             # Lint
```

### Database & Data Sync

```bash
bunx prisma studio                        # Prisma DB browser
bun run prisma:generate                   # Generate Prisma client (with query engine — frontend talks to Neon directly)
bunx prisma migrate dev                   # Run migrations locally
bun run scripts/seed-historical-agents.ts # Seed agent data
bun run sync:all                          # Sync DB + ChromaDB
bun run sync:chromadb                     # Ingest agents into ChromaDB
bun run verify-db                         # Verify Prisma connection
```

### Backend (Python FastAPI)

```bash
cd backend && uvicorn main:app --reload --port 8000
cd backend && pip install -r requirements.txt
```

### Storybook

```bash
bun run storybook        # Dev on port 6006
bun run build-storybook  # Static build
```

## Architecture Overview

### Two-Layer Backend

The app has two distinct backends that must stay in sync:

1. **Next.js API routes** (`app/api/`) — the frontend's server layer. Most routes are thin proxies to the Railway backend, but some contain local logic (auth, Galileo logging, consciousness calculations). Chat and streaming endpoints live here.

2. **FastAPI Python backend** (`backend/`) — deployed on Railway. Owns chat orchestration with RAG and planetary position calculations. The `lib/backend.ts` client is the single point of contact from Next.js server code.

`lib/backend.ts` splits traffic across the **two** backends by env var:

- `agentRequest` → **`NEXT_PUBLIC_BACKEND_URL`** (falls back to `BACKEND_URL`), the PA agents backend — default `https://api.agents.alchm.kitchen`. Serves agents / chat / moment-recommendations / RAG / MCP.
- plain `request` → **`NEXT_PUBLIC_WTEN_BACKEND_URL`**, the WTEN culinary backend — default `https://whattoeatnext-production.up.railway.app`. Serves cuisines / ingredients / recipes / user / groups.

⚠️ `api.alchm.kitchen` does **not** resolve publicly — never use it as a backend URL. Both vars default correctly when unset, so prod works without them set; set them only to override per environment.

When touching agent data or chat logic, check both layers to understand which one is authoritative.

### Agent System

Three agent types are unified through `lib/unified-agent-types.ts` and `lib/unified-agent-factory.ts`:

- **Historical agents** — real historical figures. Canonical source is **the in-memory `HISTORICAL_AGENTS` array** built from individual per-agent files at `lib/agents/historical/*.ts` (~70 agents, ~12K lines). Mirrored into the `historical_agents` Prisma table via `scripts/seed-historical-agents.ts`, and into ChromaDB for RAG.
- **Planetary agents** — synthetic agents tied to current planetary positions (Sun, Moon, Mercury, etc.). Configs in `lib/demo-agents.ts`.
- **Monica** — the onboarding/guide agent. Streaming endpoint at `app/api/monica-agent/stream/route.ts`; non-streaming at `app/api/monica-agent/route.ts`. Has its own hardcoded prompt in `backend/prompts.py` (not yet unified under the persona builder).

Conversations, evolution states, attachments, and consciousness snapshots all relate to `historical_agents.agentId` as the foreign key.

### Historical Agent Chat — Persona-First Pipeline

The chat flow for historical agents was rectified in commit `0608fc0a` to fix October-era voice quality after RAG made personas feel flat. **Persona is canonical, RAG augments, models are tiered for cost.**

**Flow:**

1. `app/api/agents/unified/route.ts` receives `{action: 'chat', agentId, message}`.
2. Calls `buildAgentContext(agentId)` from `lib/agents/persona/build-agent-context.ts`, which returns:
   - `personaBlock` — rich Markdown-structured prompt rendering every field of the agent's `CraftedAgent` (essence/expression/emotion, beliefs, traits, gifts, shadows, challenges, abilities, consciousness signature, top quotes, Sacred 7 Stats-derived communication style, creation story).
   - `cacheKey` — stable SHA-256 hash for Anthropic prompt-cache breakpoints.
3. Forwards to Railway `/api/chat` with `systemPromptOverride: personaBlock` + `personaCacheKey` + `modelTier`.
4. **Backend** (`backend/main.py`):
   - Uses the override verbatim when present; falls back to enriched `backend/prompts.py:get_agent_system_prompt` otherwise.
   - Queries ChromaDB for top-3 RAG chunks, wraps them in `<reference_material>` with voice-preserving instructions.
   - Resolves model from tier (default `free` → Groq Llama 3.3 70b — Anthropic credits are reserved for development).
   - When tier is Anthropic-based, calls with `cache_control: ephemeral` on the persona block (~85–95% cach - Walks the provider chain on quota/billing errors: Anthropic → Groq → Cerebras → Gemini → OpenRouter → OpenAI (paid last-ditch). Each transition emits a `fallback_event` log line; OpenAI catches emit `alert_event reason=paid_fallback`. This fallback chain has been verified robust against real-world 401/429 errors.
   - Returns metadata: `{tier, provider, model, cache, persona_source, rag_used}`.

**Key files:**

| File                                          | Purpose                                                     |
| --------------------------------------------- | ----------------------------------------------------------- |
| `lib/agents/persona/build-agent-context.ts`   | Lookup + cache, returns `{personaBlock, cacheKey, agent}`   |
| `lib/agents/persona/format-persona-block.ts`  | Pure formatter — `CraftedAgent` → structured prompt         |
| `lib/agents/persona/derive-sacred-stats.ts`   | Sync Sacred 7 derivation from natal chart                   |
| `lib/agents/persona/voiced-generation.ts`     | Free-tier (Groq) helper for autonomous voice-aware text     |
| `lib/agents/sacred-stats-prompt-generator.ts` | Maps Sacred 7 values → communication-style trait phrases    |
| `backend/prompts.py:get_agent_system_prompt`  | Python-side fallback prompt (mirrors the TS shape)          |
| `backend/main.py:/api/chat`                   | Tiered chat orchestration with caching + fallbacks          |
| `backend/improve_moon_degree_agents.py`       | Seeding script to enrich 360 moon degree agents with phases |

**Sacred 7 Stats** (power, resonance, wisdom, charisma, intuition, adaptability, vitality) inform **how** an agent speaks. They are NEVER named in responses — the closing rule in the persona block forbids referencing them, the Monica Constant, or any modern system terminology.

The actions system (`lib/agents/feed-activation-engine.ts`) also calls `buildAgentContext` via `generateVoicedText` so autonomous feed posts carry agent-specific voice.

### Planetary Calculations

Planetary positions flow through a fallback hierarchy:

1. Railway backend API (`/api/planetary/rectify`)
2. `lib/enhanced-astronomical-calculator.ts` (VSOP87, ±0.1° accuracy)
3. Basic transit calculations
4. Static fallback positions

The central Next.js API endpoint is `app/api/planetary-positions/route.ts`. The React hook `hooks/useUnifiedPlanetaryPositions.ts` is the preferred frontend interface.

### Database

PostgreSQL via **Prisma Accelerate** (connection pooling). Schema at `prisma/schema.prisma`. Key tables: `historical_agents`, `created_agents`, `user_natal_charts`, `consciousness_snapshots`, `agent_consciousness`, `collaborative_time_sessions`.

There is also a legacy SQLite schema at `prisma/sqlite-schema.prisma` (dev only).

### AI Model Configuration

All model IDs are centralized in `lib/models/registry.ts`. Use `CLAUDE`, `OPENAI`, `MODEL_TIERS`, and `HISTORICAL_AGENT_TIERS` exports from there — **never hardcode model strings elsewhere**.

```ts
import {
  CLAUDE,
  MODEL_TIERS,
  HISTORICAL_AGENT_TIERS,
  resolveClaudeModel,
} from '@/lib/models/registry'
```

**Current default models (May 2026, Claude 4.x family):**

- `CLAUDE.OPUS` → `claude-opus-4-7` (rare, reflective/extended-thinking turns)
- `CLAUDE.SONNET` → `claude-sonnet-4-6` (substantive chat, opt-in)
- `CLAUDE.HAIKU` → `claude-haiku-4-5-20251001` (**default for historical agent chat**)
- OpenAI default: `gpt-4o-mini` (Monica + last-ditch fallback)
- Free tier: `llama-3.3-70b-versatile` via Groq (quota fallback + bulk actions)

**Cost tiers for historical agent chat** (resolved server-side by `backend/main.py`):

| Tier         | First-choice model             | When                                                                |
| ------------ | ------------------------------ | ------------------------------------------------------------------- |
| `free`       | `groq/llama-3.3-70b-versatile` | **Default** — skips Anthropic and starts the free chain             |
| `cheap_fast` | `claude-haiku-4-5`             | Opt-in; cheap Anthropic with strong persona-following + cache reuse |
| `primary`    | `claude-sonnet-4-6`            | Opt-in via `modelTier` request param                                |
| `reflective` | `claude-opus-4-7`              | Rare; explicit only                                                 |

Tier is selectable per request and capped by env var `HISTORICAL_AGENT_MAX_TIER`. **Free chain order:** Groq → Cerebras (`gpt-oss-120b`) → Gemini (`gemini-flash-latest`) → OpenRouter (`deepseek/deepseek-v4-flash:free`) → OpenAI `gpt-4o-mini` (paid last-ditch). Skip happens automatically per missing env var. `GET /api/providers/health` pings every configured provider with a 1-token "hi" for debug visibility.

### Observability (Galileo & Admin Telemetry)

All AI interactions are logged through `lib/galileo-unified.ts` (`UnifiedGalileoService`). Configure with env vars `GALILEO_API_KEY`, `GALILEO_PROJECT`, `GALILEO_LOG_STREAM`. Set `GALILEO_FAIL_SILENTLY=true` to suppress errors when not configured.

The chat endpoint returns `metadata.cache.{read, write}` token counts so prompt-cache hit rate can be measured.

**Admin Chats Telemetry Board:** Recent conversations are logged to the shared `"AgentConversation"` PostgreSQL table. The Admin Dashboard `/admin` (rendered via `AdminOperatorConsole.tsx`) retrieves these logs in real-time under the **Chat Status** tab, displaying the agent name, user prompt preview, agent response preview, model/provider, latency, and success/failure indicators. Clicking on any row displays a premium glassmorphic modal with full, scrollable prompt/response data, relative and exact timestamps, and DB keys.

### RAG (Retrieval-Augmented Generation)

Agent knowledge is stored in ChromaDB (optional, Docker: `docker run -p 8000:8000 chromadb/chroma`). Ingestion pipeline at `lib/llamaindex/ingestion-pipeline.ts`. The semantic search endpoint is `app/api/agents/semantic-search/route.ts`. RAG analytics are tracked in `RAGQuery`/`RAGSource`/`RAGFeedback` Prisma tables.

**RAG augments persona, never replaces it.** In `backend/main.py:/api/chat`, retrieved chunks are wrapped as `<reference_material>` blocks placed after the persona, with explicit instructions that the agent should speak in their own voice and not quote excerpts verbatim. A minimum-similarity threshold (`RAG_MIN_SIMILARITY`) drops weak matches silently. ChromaDB outage degrades gracefully — chat works on persona alone.

### Feature Flags (env vars)

| Variable                                                                | Effect                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_KINETICS_BACKEND`                                          | Use Railway for kinetics calculations (vs. local)                               |
| `NEXT_PUBLIC_PLANETARY_HOURS_BACKEND`                                   | Use Railway for planetary hour calculations                                     |
| `NEXT_PUBLIC_THERMODYNAMICS_BACKEND`                                    | Use Railway for thermodynamics engine                                           |
| `CROSS_BACKEND_SYNC_ENABLED`                                            | Sync planetary positions across backends                                        |
| `AI_GATEWAY_ENABLED`                                                    | Route Anthropic calls through an AI Gateway                                     |
| `HISTORICAL_AGENT_DEFAULT_TIER`                                         | Default tier for historical chat (`free` if unset)                              |
| `HISTORICAL_AGENT_MAX_TIER`                                             | Ceiling tier (`primary` if unset) — caps requested tier                         |
| `RAG_MIN_SIMILARITY`                                                    | 0.0–1.0 threshold below which RAG chunks are dropped (0.0 default)              |
| `GROQ_API_KEY` `CEREBRAS_API_KEY` `GEMINI_API_KEY` `OPENROUTER_API_KEY` | Free-chain providers — each is independently optional; missing keys are skipped |
| `ALLOW_SQLITE_FALLBACK`                                                 | One-time bridge: tolerate SQLite when DIRECT_URL is unset (Railway)             |
| `ALCHM_MCP_ENABLED`                                                     | Enable the FastAPI bridge to the Alchm data MCP server (`true` by default)      |
| `ALCHM_MCP_SERVER_PATH`                                                 | Path to the sibling `mcp-server/src/index.ts` data server                       |
| `ALCHM_MCP_DATABASE_URL`                                                | Optional DB URL passed only to the Alchm MCP subprocess                         |
| `ALCHM_MCP_HYDRATE_CHAT`                                                | Add live sky / ingredient / recipe MCP context to `/api/chat` (`true` default)  |
| `COSMIC_RECIPE_USE_MCP_CATALOG`                                         | Seed `/api/generate-recipe` with deterministic catalog candidates               |
| `PLANETARY_AGENTS_BACKEND_URL`                                          | Backend URL used by `backend/planetary_agents_mcp_server.py`                    |
| `PLANETARY_AGENTS_FRONTEND_URL`                                         | Frontend URL used by the Planetary Agents MCP feed tool                         |

### MCP Architecture

Planetary Agents now participates in a two-layer MCP network:

- **Alchm data MCP server** — sibling WTEN Bun server exposing `get_live_sky_transits`, `alchemize_ingredients`, and `generate_cosmic_recipe`.
- **Planetary Agents MCP server** — `cd backend && python3 planetary_agents_mcp_server.py`, exposing `chat_with_planetary_agent`, `get_agent_feed_discussion`, and `synthesize_culinary_debate`.

FastAPI consumes the Alchm server through `backend/alchm_mcp.py`, appending deterministic tool output to the chat reference block after RAG. External MCP clients can launch the Planetary Agents server directly for persona/cognitive tools.

**MCP telemetry — cross-repo dependency, no in-repo UI consumer (by design, for now).** The backend exposes operator telemetry at `/api/admin/mcp-summary`, `/api/admin/mcp-status`, and `/api/admin/alchm-mcp-errors` (all gated by `INTERNAL_API_SECRET`). These are consumed by **WTEN's external admin panel**, not by this repo's `/admin` console — there is **no Next.js proxy route** for them today. To add an in-repo tile: create a secret-gated proxy route under `app/api/admin/` and a tab/panel in `AdminOperatorConsole.tsx` (which already has the tab + `MetricPanel`/`Panel` pattern). It depends on `INTERNAL_API_SECRET` being set and matched on the backend (see deploy ops), so build it after that secret is in place.

### TypeScript Errors

`next.config.mjs` sets `typescript: { ignoreBuildErrors: true }` — production builds succeed despite TS errors. The repo has a tracked linting campaign (`bun run linting-campaign:*` scripts) for gradual resolution. Do not let this become an excuse to introduce new type errors.

### Path Aliases

`@` resolves to the project root. Use `@/lib/...`, `@/components/...`, `@/app/...`, `@/hooks/...`.

### Husky / Pre-commit

Pre-commit runs `lint-staged` (ESLint + Prettier) on staged `.js/.jsx/.ts/.tsx` and `.json/.md` files. Prettier will reformat your changes — don't fight it.
