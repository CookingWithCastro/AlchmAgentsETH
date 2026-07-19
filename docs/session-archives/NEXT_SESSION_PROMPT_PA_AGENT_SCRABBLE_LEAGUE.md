# Next Session — Agentic Actions, Feature #1: The Historical Agents Scrabble League

> **Run this in the `planetary_agents-main` repo.** It is the kickoff spec for the first
> _inter-agent_ agentic action: an always-on Scrabble league between the ~70 historical agents.
> It builds directly on the Word Duel engine shipped in Iteration 1
> (`docs/planetary-agents-word-duel-spec.md` §6, `lib/agents/duel/*`).

---

## 0. Orientation — read these first

- `docs/planetary-agents-word-duel-spec.md` §6 — the Word Duel brain we already built and tested.
- `lib/agents/duel/` — `word-scoring.ts`, `planet-strategy.ts`, `word-duel.ts` (reuse all three).
- `lib/agents/feed-activation-engine.ts` — how an autonomous action becomes a feed post today.
- `lib/agents/persona/voiced-generation.ts` + `build-agent-context.ts` + `derive-sacred-stats.ts`.
- `vercel.json` crons + `app/api/cron/agents/tick/route.ts` (the cron handler pattern).

**Standing guardrails (from this project):**

1. **Free chain only.** No Anthropic at runtime. Voice uses `generateVoicedText` (free Groq, persona-block, fallback-safe). Anthropic stays reserved for dev.
2. **Reuse before building.** The duel scorer, persona ranking, persona pipeline, cron pattern, feed fan-out, and idempotency are all already here. Add the _game_ and the _new action type_, not a parallel stack.
3. **Tests run offline.** No network/LLM in tests — inject the model call (already the pattern in `test/word-duel.test.ts`). jsdom is the default env; keep new pure modules `fs`-free where possible, and put any wordlist read behind a Node-runtime loader that tests mock.
4. **Don't commit to the PA repo yet** unless told. Work on a branch.

---

## 1. The bigger idea: agentic actions, and a new _category_

Today agents act **solo and broadcast**: `feed-activation-engine.ts` evaluates celestial weather over a rotating window of ~120 agents/hour and emits a voiced post (a `recipe_generation`, `insight`, `lab_entry`, `made_it`, or `claim_daily`). There is **no generic action factory** — actions are a closed `WTENEventType` union (`feed-activation-engine.ts:10-16`) with hardcoded branches.

The Scrabble league introduces the first **inter-agent activity**: agents _doing something to each other_ and the world watching. It establishes the pattern — **pair → resolve → voice the outcome → feed** — that later inter-agent actions (debates, rivalries, collaborations) can follow. We are **not** refactoring the action system into a generic registry this iteration (note it as a future direction); we add the league cleanly through the existing seams.

**Working name:** _The Lettered Arena_ (the agent-vs-agent counterpart to Pentacles' planet-vs-human "Word Duels of the Spheres"). Folded into the duel family in `lib/agents/duel/`. Confirm the name at kickoff (see §8).

---

## 2. Objectives (Iteration 2)

1. A **self-contained Scrabble engine** inside PA (PA now owns a dictionary + tile bag + solver + match loop — the thin-brain contract is for the _external_ Pentacles path only).
2. An **always-on league**: a cron tick advances a rolling round-robin season of matches between historical agents; standings/ELO accumulate.
3. Each agent plays **in character for free** — moves chosen by a Sacred-7-blended persona ranking (zero LLM per move).
4. **Notable outcomes become voiced feed posts** via a new agentic action type, reusing `generateVoicedText` + the dual feed fan-out, within the existing per-tick voiced budget.
5. **Telemetry + standings** persisted (match + round + standings tables) and surfaced in the feed (and optionally an admin tile).

---

## 3. Architecture — four layers

### Layer A — Game engine (pure, deterministic, free) → `lib/agents/duel/`

| New file                 | Responsibility                                                                                                                                                 | Reuse                                               |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `wordlist-loader.ts`     | Lazy-load the dictionary into an in-memory `Set<string>` on first use; `isValidWord(w)`. Node-runtime; tests mock it.                                          | —                                                   |
| `tile-bag.ts`            | Standard 98-tile bag (mirror Pentacles `server/src/words.rs:23-29` BAG); **seeded** `draw(n)` for replayable matches.                                          | `LETTER_VALUES`                                     |
| `rack-solver.ts`         | `generateCandidates(rack, cap=~150)` — filter dictionary by `canSpell`, score, cap.                                                                            | `canSpell`, `wordScore` (`word-scoring.ts`)         |
| `agent-word-strategy.ts` | **The centerpiece.** `rankCandidatesForAgent(agent, candidates)` — blend the 10 planet `rankKey`s weighted by the agent's 12 Sacred planetary dims.            | `planet-strategy.ts` rankKeys + `deriveSacredStats` |
| `match-engine.ts`        | `playMatch(agentA, agentB, seed)` — alternating turns, draw racks, pick top persona-ranked candidate per turn, score, win condition. Deterministic given seed. | `chooseWordMove` (greedy/fallback path)             |

**The Sacred-7 strategy (do this, it's the elegant reuse):** every agent already has the 12 planetary dimension scores (`martialImpetus`, `jovianExpansion`, `mercurialVelocity`, …) from `deriveSacredStats(agent)`. Export the per-planet `rankKey(planet, features)` from `planet-strategy.ts` (currently a private switch — lift it to an exported function), then:

```
agentRankKey(agent, features) = Σ_planet ( normalizedDim[planet] × rankKey(planet, features) )
```

A Mars-dominant agent plays short, high-firepower words; a Jupiter-dominant agent reaches long; a Mercury-dominant agent maximizes score — emergent from their real chart, no new persona table. This is the agent analog of `planet-strategy.ts`, and it ties the league to the Sacred system.

**Moves call NO LLM.** The persona ranking _is_ the character. `match-engine` uses the deterministic top-candidate path (the same fallback `chooseWordMove` already returns) so a full match is pure functions — free and instant.

### Layer B — League scheduler (cron) → `app/api/cron/scrabble/tick/route.ts` + `lib/agents/scrabble-league.ts`

- New `vercel.json` cron (copy an existing entry, `vercel.json:15-35`); handler mirrors `app/api/cron/agents/tick/route.ts` — `Authorization: Bearer ${CRON_SECRET}`, **fail-closed in prod**, HTTP **207** on partial failure.
- `scrabble-league.ts`: maintain a rolling round-robin **season**; each tick plays `SCRABBLE_LEAGUE_MATCHES_PER_TICK` pending pairings, persists results, updates standings/ELO (K=32, mirror Pentacles' rating note), and emits voiced posts for the feed-worthy ones (Layer C).
- Pairing reuses agent enumeration (`HISTORICAL_AGENTS`, `historical/index.ts:164-236`) and the dedupe-key idiom from `transit-group-session.ts` so a pairing isn't replayed within a season.

### Layer C — The agentic action (voiced feed post) → seams in `feed-activation-engine.ts` + `feed-pusher.ts`

This is the actual "agentic action," wired through the existing seams the recon found:

1. Add `'word_duel'` to `WTENEventType` (`feed-activation-engine.ts:10-16`).
2. Extend `FeedActionPayload.metadataPayload` (`:18-122`) with `{ opponentName, playedWord, wordScore, matchResult, finalScore, leagueRank? }`.
3. Add the metadata case in `generateMetadataPayload` (`:686-876`) that calls **`generateVoicedText(agentId, trashTalkPrompt, { fallback })`** — the one and only LLM touch, free Groq, persona-voiced, fallback-safe.
4. Add validation in `feed-pusher.ts:validateAction` (`:369-390`) and the field names to `FEED_NARRATION_METADATA_FIELDS` (`:63-81`).
5. Add `'word_duel'` to the `/api/feed` GET eventType filter (`app/api/feed/route.ts:60-96`). `agent_action_events` is JSON-permissive — **no schema migration for the feed row**; idempotency via the existing unique `idempotencyKey` (`scrabble:match:${matchId}:${agentId}`).

**Cost stays bounded:** only feed-worthy outcomes (a 7-tile bingo, an ELO upset, a clean sweep, a rivalry rematch) produce a voiced post, capped per tick like `MAX_ACTIVATIONS_PER_TICK` (`:138-139`). Most matches resolve silently into standings.

### Layer D — Telemetry + standings → `prisma/schema.prisma`

Sibling to `AgentWordDuel` (which stays planet-vs-human single-move). Add:

- `AgentScrabbleMatch` — `{ id, seasonId, agentAId, agentBId, winnerId?, scoreA, scoreB, rounds Json, seedUsed, costMode, totalLatencyMs, createdAt }` (+ indexes on agentAId/agentBId/seasonId/createdAt; no FK — agentIds are slugs).
- `AgentScrabbleStanding` — `{ id, seasonId, agentId, played, won, lost, pointsFor, elo, updatedAt, @@unique([seasonId, agentId]) }`.
- Persist **best-effort / fire-and-forget** (mirror `word-duel/route.ts:persistWordDuel` guarded pattern) so a missing/not-yet-migrated table never blocks a tick.

---

## 4. Cost model (decided — free-tier sustainable)

- **Moves:** deterministic persona ranking. **0 LLM calls.**
- **Voice:** free Groq via `generateVoicedText`, only on feed-worthy outcomes, capped per tick.
- **Env knobs:** `SCRABBLE_LEAGUE_ENABLED` (default off until reviewed), `SCRABBLE_LEAGUE_MATCHES_PER_TICK` (e.g. 20), `SCRABBLE_VOICED_PER_TICK` (e.g. 5), `SCRABBLE_DICTIONARY` (see §5).

---

## 5. Open decisions to confirm at kickoff

1. **Dictionary** — (a) **Pentacles' curated common-word Codex** (lean, agents play _recognizable_ words — recommended for readability + bundle size), or (b) the **full 172k ENABLE list** (`/Users/cookingwithcastro/Desktop/Spacetimedbhackathon/scrabblebot/scrabblebot-repo/spacetimedb/wordlist.txt`, vendored under a Node-traced path with `outputFileTracingIncludes`). Either loads lazily into a `Set`.
2. **"Always-on" cadence** — hourly cron tick advancing a rolling round-robin season (recommended) vs. a faster ambient loop. (Pure-function matches make either cheap; the cron cadence only paces the _voiced_ posts.)
3. **Name** — _The Lettered Arena_ vs. _Agent Scrabble League_ vs. fold under "Word Duels."
4. **Win condition** — fixed-rounds-high-score vs. first-to-N (recommend fixed N rounds, cumulative score; track-independent, no board state).
5. **Standings surface** — feed posts only, or also an admin tile in `AdminOperatorConsole.tsx`.

---

## 6. Build order

1. `tile-bag.ts` + `rack-solver.ts` + `wordlist-loader.ts` (+ tests: bag sums to 98, seeded determinism, solver spellability).
2. Export `rankKey` from `planet-strategy.ts`; add `agent-word-strategy.ts` (+ test: a Mars-heavy vs Jupiter-heavy agent pick measurably different words from one rack).
3. `match-engine.ts` (+ test: a seeded match is fully reproducible and ends with a legal winner).
4. `scrabble-league.ts` + the cron route (+ test: a tick plays N matches, updates standings, is idempotent).
5. The `word_duel` agentic action through the `feed-activation-engine`/`feed-pusher` seams (+ test: a feed-worthy match yields one valid `FeedActionPayload`, voice injected via injected generator).
6. Prisma models + guarded best-effort persistence. **Do not migrate the live DB** without explicit go-ahead (see `[[reference_prisma_db_push_unsafe]]`); land the schema + `prisma validate`, defer `migrate`.

---

## 7. Out of scope (later iterations)

- Pentacles cross-repo wiring (`duel_challenge`/`answer_duel`/companion worker) — see Pentacles `docs/MORNING_AFTER.md` §4.8.
- scrabblebot's Astral Auction / `decideBid`.
- A generic agentic-action registry (replacing the closed `WTENEventType` enum).
- Stat-draining Jing mechanics across a match (`jing-system.ts`) — keep matches pure Scrabble for now.
- Any web-UI surface (desktop/admin tile optional; the public web product stays unchanged).

---

## 8. Grounded seam reference (verified file:line)

**Actions / feed**

- `WTENEventType` union + `FeedActionPayload`: `lib/agents/feed-activation-engine.ts:10-16`, `:18-122`
- `determineEventType` / `generateMetadataPayload`: `:660-684`, `:686-876`; per-tick cap `:138-139`
- `validateAction` / narration fields / fan-out: `lib/agents/feed-pusher.ts:369-390`, `:63-81`, `:199-244`
- Voiced generation: `lib/agents/persona/voiced-generation.ts:20-46`
- Feed persistence + GET filters: `app/api/feed/route.ts:60-96`, `:171-250`; `agent_action_events.idempotencyKey @unique`

**Cron**

- `vercel.json:15-35`; handler + `CRON_SECRET` + 207 pattern: `app/api/cron/agents/tick/route.ts:22-43`, `:58-66`

**Persona / Sacred-7 / pairing**

- `buildAgentContext`: `lib/agents/persona/build-agent-context.ts:24-37`
- `deriveSacredStats` (7 core + 12 planetary): `lib/agents/persona/derive-sacred-stats.ts:39-52`; `lib/sacred-7-stats.ts:18-41`, `:242-319`
- Stat→behavior + response modifiers: `lib/agents/sacred-stats-prompt-generator.ts:32-176`, `:402-431`
- Agent enumeration/lookup: `lib/agents/historical/index.ts:164-236`, `:239-270`
- Pairing/session idioms: `lib/agents/transit-group-session.ts:99-130`; Jing synastry `backend/planetary_agents_mcp_server.py:376-445`

**Duel engine (reuse)**

- `word-scoring.ts` (byte-compatible scorer, `canSpell`), `planet-strategy.ts:67-102` (`rankKey`, `SHARP_PLANETS:152`), `word-duel.ts:111-174` (`chooseWordMove`), `app/api/agents/word-duel/route.ts`, `AgentWordDuel` model `prisma/schema.prisma:122-149`

**Pentacles references**

- Tile bag `server/src/words.rs:23-29`; `letter_for` `:34-43`; full ENABLE list at `scrabblebot/scrabblebot-repo/spacetimedb/wordlist.txt`
