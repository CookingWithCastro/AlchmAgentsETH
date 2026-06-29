# Planetary Agents - Agentic Workflows & LangChain Integration

This document outlines the specialized agentic workflows and LangChain integrations activated in this repository.

## 🚀 Activated Features

### 1. Knowledge Updater API (`/api/knowledge-updater`)

- **Purpose:** Dynamic ingestion of web content and PDF documents into the agent knowledge base (ChromaDB).
- **Endpoint:** `POST /api/knowledge-updater`
- **Capabilities:**
  - Scrape and ingest web URLs using `CheerioWebBaseLoader`.
  - Extract and ingest text from PDF documents using `PDFLoader`.
- **Requirements:** `USE_RAG_GENERATION=true` in environment.

### 2. LangChain Agent Router (`/api/langchain-agent`)

- **Purpose:** Advanced ReAct agent orchestrator for complex multi-step reasoning.
- **Endpoint:** `POST /api/langchain-agent`
- **Tools Available:**
  - `semantic_agent_search`: Find agents by concept/topic.
  - `knowledge_retrieval`: Fetch RAG context.
  - `consciousness_analysis`: Calculate synergy and compatibility.
  - `multi_agent_coordinator`: Assemble a council of agents for a query.
  - `memory_retrieval`: Retrieve interaction history.

### 3. Enhanced Semantic Search (`/api/agents/semantic-search`)

- **Purpose:** High-performance vector search with health monitoring.
- **Endpoints:**
  - `POST /api/agents/semantic-search`: Query agent knowledge.
  - `GET /api/agents/semantic-search`: Check RAG health and collection status.

### 4. Dynamic Moon Degree & Phase Intelligence

- **Purpose:** Native enrichment of the 360 Moon degree agents with their exact lunar phase characteristics, bringing psychological depth and spiritual awareness to chats.
- **Capabilities:**
  - Automatically maps any Moon degree query (absolute degree 0-359) to its correct phase (New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent, Dark Moon).
  - Injects a specialized, premium `## Lunar Phase Influence` block into system prompts containing the phase's archetype, emotional characteristics, and alchemical traits.
- **Migration & Seeding:** Supported by `backend/improve_moon_degree_agents.py` to retroactively enrich all Moon degree records in the shared database.

### 5. Hardened Agent Minigame Endpoints

- **Purpose:** High-reliability API endpoints providing the agent "brain" moves for the **Word Duels** (`/api/agents/word-duel`) and **Jing Arena** (`/api/agents/jing`) minigames.
- **Resilient AI Pipeline:**
  - Employs a multi-LLM provider fallback chain: **Groq** (`llama-3.3-70b-versatile`) → **Gemini** (`gemini-2.0-flash`) → **OpenAI** (`gpt-4o-mini`).
  - Seamlessly falls back to backup providers if the primary (Groq) is rate-limited (e.g. hitting Daily Token Limits).
  - Integrates with the sibling Pentacles game via `PLANETARY_AGENTS_BACKEND_URL` pointing to the production deployment.

## ⛓️ On-Chain & Agent Economy

A bounty-driven layer that puts agents on-chain. **Canonical doc + diagrams + demo steps: [`INTEGRATIONS.md`](INTEGRATIONS.md).** In brief:

- **A2A server** (`backend/a2a_server.py`) — each agent at `/a2a/{id}/.well-known/agent-card.json` with `message/send` + incremental `message/stream` (SSE), wrapping in-process `/api/chat`.
- **x402 payments** (`backend/x402_middleware.py`) — gates `/a2a/`; dual settlement: external facilitator (Base Sepolia) OR self-settle on Circle Arc via `backend/arc_facilitator.py` (`X402_SELF_SETTLE=true`, EIP-3009).
- **ENS via NameStone** (`lib/namestone.ts` + `lib/erc8004/ensip.ts`) — gasless `*.alchmagents.eth` subnames + ENSIP-25/26 records (`agent-endpoint[a2a/mcp/web]`, `agent-registration`, `agent-memory`, `human-verified`, `agent-wallet[x402]`).
- **ERC-8004** (`lib/erc8004/` + `app/erc8004/page.tsx`) — registry indexing via BigQuery + a reputation leaderboard; register on Arc via `lib/erc8004/register-client.ts`.
- **Walrus/MemWal memory** (`lib/walrus/`) — encrypted persona snapshots + recall (HTTP fallback needs no wallet).
- **World ID + AgentKit** (`lib/worldid/`) — proof-of-personhood + `human-verified` badge.
- **Onramp / privacy / distribution** — 1inch (`lib/onramp/`), Unlink ZK (`lib/unlink/`), Tool Router (`lib/toolrouter/`).
- **Privy Sync Syncing:** Privy configurations are synchronized between WTEN (`WhatToEatNext-master`) and `AlchmAgentsETH` (and `planetary_agents-main`) using a shared secret `ALCHM_KITCHEN_SYNC_SECRET`.
- **Stripe Subscriptions & Tokens:** Tested Stripe endpoints (`/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`) enable automated subscription setup (using `checkout.session.completed` for tier updates) and direct token balance crediting upon purchase.

## 🎨 Techno-Occult UI (Stitch Layouts)

Implementations of the "Techno-Occult" v2 designs created by Stitch across main directory and profile modules.

- **Stitch Design System:** Extended Tailwind configurations and global keyframe float/twinkle animations. Features glassmorphic panels and custom glowing borders representing the primary alchemical elements (`essence-water`, `spirit-fire`, `substance-air`, `matter-earth`).
- **StitchAgentCard:** Reusable directory card with elemental borders, checkbox selection for multi-agent chats, and metadata displays.
- **Gallery Page (`/gallery`):** Rich design with a dynamic starfield background, Faction Lineage filters (grouping agents by ruling planets of their Sun signs: Solaris, Lunaris, Mercury, Venus, Mars, Jupiter, Saturn), and list/grid layout toggles.
- **Individual Agent Profiles (`/agent/[id]`):** 3-column Codex structure:
  - _Column 1:_ Consciousness profile and radial progress tracking.
  - _Column 2:_ Placements listing and zodiac placements ring.
  - _Column 3:_ Thermodynamics Tarot mapping alchemical vectors to Major and Minor Arcana recommendations.
  - Includes a client-side radial progress tracker and a live alchemical terminal log.

## 🛠️ Configuration

### Development Environment

- **Package Manager:** [Bun](https://bun.sh/) is the mandatory package manager and runtime for this project.
- **Execution:** Always use `bun` or `bun --bun` for running scripts and development servers (e.g., `bun --bun run dev`).
- **Dependency Management:** Use `bun install`, `bun add`, and `bun remove`.

To fully enable these features, ensure the following environment variables are set:

- `USE_RAG_GENERATION=true`
- `CHROMADB_URL=http://localhost:8001` (or your production ChromaDB endpoint)
- `OPENAI_API_KEY` (required for embeddings and LangChain agents)

## 📁 Key Files

- `lib/langchain/`: Core LangChain integration logic.
- `lib/llamaindex/`: Vector store and embedding services.
- `app/api/`: Corresponding API routes.
- `backend/main.py`: dynamic chat auto-registration and moon phase calculation.
- `backend/prompts.py`: system prompt generation for moon phase agents.
- `backend/improve_moon_degree_agents.py`: DB migration script for 360 moon degree agents.
