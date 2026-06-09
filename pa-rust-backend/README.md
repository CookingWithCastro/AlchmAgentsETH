# pa-rust-backend

A clean, high-performance **Rust + Axum** port of the compute surface of the
Planetary Agents **Python/FastAPI** backend (`../backend/`).

The port is **faithful**: the alchemical math is validated cell-by-cell against
the authoritative Python implementation via golden-value tests (see
`tests/fixtures/golden_gen.py`, which imports the real `backend/utils.py`).

## Status

| Metric                     | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| `cargo build`              | ✅ 0 errors, 0 warnings                                  |
| `cargo clippy -D warnings` | ✅ clean                                                 |
| `cargo fmt --check`        | ✅ clean                                                 |
| `cargo test`               | ✅ 18 passing (8 golden-math, 6 HTTP, 4 recipe)          |
| Release binary             | 3.8 MB (stripped, LTO)                                   |
| Runtime RSS                | ~10 MB with a live DB pool (well under the 20 MB budget) |

## What was ported

### Astrological / alchemical math (`src/astro/`) — fully ported & golden-tested

There is **no Swiss Ephemeris or VSOP87** in the source backend: `utils.py`
imports only `math` and `datetime`. The real math is the _alchemical engine_
plus a deterministic mean-motion ephemeris. All of it is ported natively:

- `constants.rs` — every lookup table transcribed verbatim (dignities, sect
  elements, planetary alchemy `[Spirit,Essence,Matter,Substance]`, orbital
  periods/offsets, aspect orbs, modality).
- `positions.rs` — `_planetary_positions_for` (J2000 mean-motion), `_elemental_scores`,
  `_request_datetime`.
- `alchemy.rs` — `alchemize`, `alchemize_detailed`, `aggregate_alchemical_properties`,
  `get_planetary_modifiers` (heat/entropy/reactivity/Greg's-energy/kalchm/monica).
- `aspects.rs` — `calculate_aspects`, `calculate_aspect_efficiency`.
- `kinetics.rs` — `calculate_kinetics`, `determine_aspect_phase`.
- `consciousness.rs` — `calculate_monica_constant`, `get_consciousness_level`.

### HTTP endpoints (`src/routes/`)

| Method & path                                 | Source                 | Notes                                                                                                                                                                                                                         |
| --------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                 | `main.py`              | static health (verbatim contract)                                                                                                                                                                                             |
| `GET /api/health`                             | task spec              | health **+ live DB probe + agent count**                                                                                                                                                                                      |
| `GET /`                                       | `main.py`              | banner                                                                                                                                                                                                                        |
| `POST /api/astrologize`                       | **synthesized**        | positions, **houses**, aspects, elemental **& modality** balances + full alchemy. The Python backend has no astrologize route; this is built from the existing math. Houses are whole-sign (the Python engine computes none). |
| `POST /api/planetary/positions`               | `main.py`              |                                                                                                                                                                                                                               |
| `GET /planetary/current`                      | `main.py`              |                                                                                                                                                                                                                               |
| `POST /api/planetary/positions/bulk`          | `main.py`              |                                                                                                                                                                                                                               |
| `POST /api/alchemical/quantities`             | `main.py`              |                                                                                                                                                                                                                               |
| `GET\|POST /api/philosophers-stone/positions` | `main.py`              | `alchemize_detailed`                                                                                                                                                                                                          |
| `POST /api/generate-recipe`                   | `recipe_generation.py` | LLM orchestration + validate-or-retry                                                                                                                                                                                         |
| `GET /api/providers/health`                   | `main.py`              | pings every provider                                                                                                                                                                                                          |
| `POST /mcp`                                   | `*_mcp_server.py`      | JSON-RPC 2.0 MCP tool server                                                                                                                                                                                                  |

### LLM provider chain (`src/llm/`) — fully ported

`providers.py` → native Anthropic transport (prompt caching via
`cache_control: ephemeral`, tool-forced structured output) + an OpenAI-compatible
transport for Groq / Cerebras / Gemini / OpenRouter / OpenAI. Reads
`ANTHROPIC_API_KEY` (or `AI_GATEWAY_API_KEY`) and the free-chain keys, with the
same quota-fallback walk and tier resolution.

### MCP tool server (`src/mcp/`)

A lightweight JSON-RPC 2.0 handler (`initialize` / `tools/list` / `tools/call`).
Tools that are pure functions of the math are **natively implemented**:
`get_live_sky_transits`, `compute_synastry_overlay`, `get_chart_alchemy`.
Tools that depend on the external Alchm _data_ MCP (the sibling Bun server's
ingredient/recipe catalog) or the not-yet-ported RAG/persona chat pipeline are
advertised but return a clearly-labeled degraded result rather than fabricating
data (`alchemize_ingredients`, `generate_cosmic_recipe`, `chat_with_planetary_agent`,
`get_agent_feed_discussion`, `synthesize_culinary_debate`, `plan_weekly_menu`).

### Database (`src/db.rs`) — sqlx / Postgres (Neon)

Runtime queries (no compile-time macros, so the crate builds without a live DB):
`SELECT 1` health probe, `count(*) FROM historical_agents`, an agent EV-balance
fetch, and best-effort `AgentConversation` logging. The pool connects lazily; if
no DSN is configured the service still serves all compute endpoints and health
reports `disconnected`.

## Run

```bash
cargo run --release          # listens on $HOST:$PORT (default 0.0.0.0:8000)
```

`.env` is loaded via `dotenvy`. Key env vars: `PORT`, `HOST`,
`DIRECT_URL`/`DATABASE_URL` (DSN, DIRECT_URL preferred), `ANTHROPIC_API_KEY` /
`AI_GATEWAY_API_KEY`, `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `GEMINI_API_KEY` /
`OPENROUTER_API_KEY` / `OPENAI_API_KEY`, `COSMIC_RECIPE_MODEL_TIER`,
`HISTORICAL_AGENT_MAX_TIER`, `INTERNAL_API_SECRET`.

### As a Tauri sidecar

The desktop app (`src-tauri/`) ships this binary as the `pa-rust-backend`
sidecar. To avoid colliding with a local Python backend (uvicorn `:8000`) or the
Next.js dev server, the host spawns it bound to **`127.0.0.1:8771`** by default
(override with `PA_RUST_BACKEND_PORT`); the host sets `HOST`/`PORT` explicitly
rather than forwarding the ambiguous host `PORT`. The spawned process is tracked
in `AppState` and terminated on app exit so it is never orphaned.

## Test

```bash
cargo test
# Regenerate golden values from the authoritative Python first if utils.py changes:
../backend/venv/bin/python tests/fixtures/golden_gen.py
```

## Fidelity note

`calculate_kinetics` in Python takes no datetime and reads `datetime.utcnow()`
internally for the diurnal/sect determination (non-deterministic). The Rust port
threads an explicit `dt` through — an intentional, documented improvement — and
the golden generator freezes the sect to the target moment so the value is
reproducible.
