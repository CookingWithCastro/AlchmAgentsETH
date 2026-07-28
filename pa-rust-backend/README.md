# pa-rust-backend

A clean, high-performance **Rust + Axum** port of the compute surface of the
Planetary Agents **Python/FastAPI** backend (`../backend/`).

The port is **faithful**: the alchemical math is validated cell-by-cell against
the authoritative Python implementation via golden-value tests (see
`tests/fixtures/golden_gen.py`, which imports this repo's real `backend/utils.py`
and `backend/thermodynamics.py`).

> ⚠️ **That last sentence only became true on this branch.** `golden_gen.py` used
> to `sys.path.insert` a hardcoded path to a **different checkout**
> (`~/Desktop/planetary_agents-main/backend`) and write `golden.json` back into
> that other repo's tree — so `tests/golden.rs` was green while pinning another
> codebase's values, including its buggy reactivity. The generator now derives
> every path from its own location (`FIXTURES_DIR.parents[2]` → repo root), imports
> **this** repo's `backend/`, writes `golden.json` next to itself, and refuses to
> emit a fixture whose heat/entropy/reactivity/Greg's-energy/monica did not come
> out of `backend/thermodynamics.py` (`_assert_canonical_thermodynamics`).
> `golden.json` has been regenerated from this repo's corrected engine. Never
> reintroduce an absolute home path there.

## Three runtimes, one formula set

`src/astro/alchemy.rs` is **one of three** implementations of the canonical
thermodynamic block. They are not layered — none calls another — so they must be
kept in lockstep by hand:

| Runtime    | File                           | Entry points                                                       |
| ---------- | ------------------------------ | ------------------------------------------------------------------ |
| TypeScript | `lib/thermodynamics/kalchm.ts` | `calculateThermodynamics`, `calculateKalchm`, `calculateMonica`    |
| Python     | `backend/thermodynamics.py`    | `calculate_thermodynamics`, `calculate_kalchm`, `calculate_monica` |
| Rust       | `src/astro/alchemy.rs`         | inline in `alchemize` / `alchemize_detailed`                       |

Canonical definitions — **every denominator is a parenthesised sum, THEN squared**:

```text
Heat        = (S^2 + Fire^2)                             / (Su + E + M + W + A + Ea)^2
Entropy     = (S^2 + Su^2 + Fire^2 + Air^2)              / (E + M + Ea + W)^2
Reactivity  = (S^2 + Su^2 + E^2 + Fire^2 + Air^2 + W^2)  / (M + Ea)^2
GregsEnergy = Heat - Entropy * Reactivity
```

Shared conventions that must never be changed in one runtime alone:

- **A zero denominator falls back to `1`** — `or1` here, `denominatorOr1` in TS,
  `_denominator_or_1` in Python. This is **AAE's** convention and is deliberately
  **NOT WTEN's `0.01` floor**; the two differ by 100x for a non-zero numerator
  over a zero denominator.
- **`MONICA_EQUILIBRIUM = 1.618`** is returned at exact Kalchm equilibrium
  (`ln K == 0`), in all three runtimes.
- **No near-equilibrium band.** `ln K == 0` is tested exactly; every other
  degenerate case is ABSENT, never a sentinel.

The repo's stray-formula gate **now covers this crate** — it did not before.
`scripts/checkNoStrayKalchmFormula.ts` text-scans `pa-rust-backend/**/*.rs` for
self-exponentiation (`x.powf(x)`) and fails if the formula is defined anywhere
other than `src/astro/alchemy.rs`, with a CONTROL assertion that fails if the
scanner stops finding the known site in `alchemy.rs`.
`scripts/check_no_stray_kalchm_formula.py` also lists `pa-rust-backend` among its
`SOURCE_ROOTS`, with per-root coverage assertions.

## Status

| Metric                     | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| `cargo build`              | ✅ 0 errors, 0 warnings                                  |
| `cargo clippy -D warnings` | ✅ clean                                                 |
| `cargo fmt --check`        | ✅ clean                                                 |
| `cargo test`               | ✅ 18 passing (8 golden-math, 6 HTTP, 4 recipe)          |
| stray-formula gate         | ✅ `alchemy.rs` is the sole Rust definition site         |
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
  `get_planetary_modifiers`, plus the canonical
  heat/entropy/reactivity/Greg's-energy/kalchm/monica block (see
  [Three runtimes, one formula set](#three-runtimes-one-formula-set)). Two things
  here changed on this branch and are worth reading before you trust an older
  memory of the file:
  - **Reactivity's denominator is `(Matter + Earth)^2`.** It previously read
    `reactivity_num / or1(matter) + earth.powi(2)` — a lost paren pair that moved
    Earth out of the divisor, dropped Matter's square, and re-added Earth as an
    additive term. The two forms coincide only when `Earth == 0 && Matter == 1`,
    which is exactly why the defect stayed green for as long as it did.
  - **`monica` is `Option<f64>`, not `f64`.** `None` means **ABSENT** and
    serialises as JSON `null` (deliberately no `skip_serializing_if`), so absence
    stays distinguishable from a real value. It used to be a `1.0` sentinel, which
    disagreed with TS/Python in two ways at once: at exact Kalchm equilibrium they
    return `MONICA_EQUILIBRIUM` (`1.618`, now a shared constant here too), and in
    the degenerate cases — non-finite inputs, non-positive Kalchm, zero reactivity
    — they return ABSENT. `tests/golden.rs` asserts both branches: a numeric
    fixture value must be matched, and a `null` fixture value must be `None`.
- `aspects.rs` — `calculate_aspects`, `calculate_aspect_efficiency`.
- `kinetics.rs` — `calculate_kinetics`, `determine_aspect_phase`.
- `consciousness.rs` — `calculate_monica_constant`, `get_consciousness_level`.
  ⚠️ **`calculate_monica_constant` is NOT the thermodynamic Monica.** It is an
  unrelated quantity that merely shares the name:
  `(Spirit × φ + Essence) / (Matter + Substance + 1)` with `φ = 1.618033988749`,
  ported verbatim from `utils.py:calculate_monica_constant` (its TypeScript twins
  are `lib/monica/monica-constant.ts` and `lib/monica/monica-constant-validator.ts`).
  The thermodynamic Monica — `-GregsEnergy / (Reactivity × ln K)` — is the
  `monica` field of `AlchemizeResult` in `alchemy.rs`. Confusing the two is a live
  hazard in this repo; do not cross-wire them.

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
# Regenerate golden values from the authoritative Python first if the engine changes.
# Needs Python 3.10+ — ../backend/thermodynamics.py uses PEP 604 unions, so the
# macOS system 3.9 cannot import it. All paths are derived from the script's location.
python3 tests/fixtures/golden_gen.py
```

The regeneration step now targets **this** repo: it resolves the repo root from
the script's own location, imports `../backend/utils.py` and
`../backend/thermodynamics.py`, and writes `tests/fixtures/golden.json` next to
itself. It exits non-zero rather than writing if `utils.py:alchemize` and
`thermodynamics.py` disagree on any of heat/entropy/reactivity/Greg's-energy/monica,
so a call-site transcription of the formula can never be pinned as golden. The
element totals it feeds to that check are summed from the engine's own per-planet
breakdown, so the check re-derives nothing.

Whenever the formula set moves, run the other two runtimes in the same pass —
`bunx vitest run test/thermodynamics/`, `cd ../backend && pytest test_thermodynamics.py`
— plus `bun run scripts/checkNoStrayKalchmFormula.ts`. Regenerating `golden.json`
alone would make this crate agree with Python while silently drifting from
TypeScript.

## Fidelity notes

**Kinetics datetime — intentional divergence.** `calculate_kinetics` in Python
takes no datetime and reads `datetime.utcnow()` internally for the diurnal/sect
determination (non-deterministic). The Rust port threads an explicit `dt`
through — an intentional, documented improvement — and the golden generator
freezes the sect to the target moment so the value is reproducible.

**Partial charts — closed, and it must stay closed in both runtimes.** A partial
chart drives Kalchm toward 1, and Monica is `-energy / (reactivity · ln K)`, so a
short payload yields a large finite value that looks like a reading. Complete
charts never come near equilibrium, so both runtimes reject incomplete input at
the request boundary rather than clamping the math with a band.

`ensure_complete_from_value` (`src/astro/alchemy.rs`) checks the NORMALISED view
against `PLANETARY_PERIODS_DAYS` (`src/astro/constants.rs`) — so a body supplied
with a garbage value counts as missing, exactly as in Python — and returns
`IncompleteChart`, which `src/error.rs` maps to `AppError::Unprocessable` and a
**422** carrying the same `{"detail": ...}` string Python produces, missing
bodies named in the same order, with the same singular/plural wording. It is
wired into `POST /api/philosophers-stone/positions`, `POST /api/astrologize` and
the `get_chart_alchemy` MCP tool (which returns the tool's own `isError` shape
rather than an HTTP status). It never fills in a default. The Python twin is
`backend/main.py:_require_complete_chart`; `tests/chart_completeness.rs` pins
this side, `backend/test_main.py` the other.

An absent or `null` `customPlanets` still means "generate one for me" in both
runtimes. An explicitly-supplied `{}` is a chart missing every body and is
rejected by both — swapping in the server's chart there would be the
fill-in-a-default behaviour the guard exists to prevent.

`compute_synastry_overlay` is deliberately NOT guarded: its charts feed only
pairwise angular separations and never reach `alchemize`, so the singularity
this guard protects against cannot arise. That reasoning is recorded at
`src/mcp/mod.rs`.
