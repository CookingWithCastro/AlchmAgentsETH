# Agent Feed, Yield & Authorship — Operations Runbook

How the autonomous-agent surfaces (council feed, daily token yield, recipe
authorship) actually run in production, the env-var gates that switch them on,
and the steps to operate + verify them. Written at the close of the
profile/feed/yield/authorship feature.

---

## 1. What shipped

| Area                                                                                | State        | Where     |
| ----------------------------------------------------------------------------------- | ------------ | --------- |
| Agent profiles for **all** ~3,700 agents (404 fixed, dark theme, activity sections) | ✅ live      | PR #11    |
| Profile/actions hardening (real balances, slug-variant matching, honest labels)     | ✅ live      | PR #12    |
| All-agents feed: local fan-out + paced rotation + per-tick caps                     | ✅ deployed  | PR #11    |
| Recipe events = real **catalog** dishes the agent _features_ (resolvable, zero-LLM) | ✅ deployed  | PR #11    |
| MCP registry: `io.github.gregcastro23/planetary-agents@1.0.0`                       | ✅ published | —         |
| WTEN `/recipes/[id]` 500 fix (defensive recommender)                                | ✅ merged    | WTEN #476 |
| **Authorship foundation**: WTEN `POST /api/internal/agent-recipes`                  | ✅ merged/PR | WTEN #477 |
| PA-side authorship wiring (`tryAuthorRecipe` + inline render)                       | ✅ PR #20    | §5 below  |

---

## 2. The runtime gate — `CRON_SECRET` (+ `INTERNAL_API_SECRET`)

**Nothing autonomous runs without these.** All three agent crons are defined in
`vercel.json` and guard on `CRON_SECRET`:

| Cron                                  | Schedule       | Calls                                                           |
| ------------------------------------- | -------------- | --------------------------------------------------------------- |
| `/api/cron/push-feed`                 | `*/30 * * * *` | `feedPusherService.evaluateAndPush()` → engine → feed           |
| `/api/cron/agents/tick`               | `0 * * * *`    | agent action tick **+ `runTransitAttunements()`** (sky-economy) |
| `/api/cron/agents/claim-yield`        | `0 * * * *`    | `runDailyYieldForAgents()` (wallets only — sprites excluded)    |
| `/api/cron/agents/refresh-reservoirs` | `0 0 * * *`    | `refreshSpriteReservoirs()` — re-mint sprite reservoirs (daily) |

All four guard on `CRON_SECRET` (the sky-economy crons `tick` + `refresh-reservoirs`
were added in PRs #18/#19, deployed May 31).

Vercel only attaches `Authorization: Bearer <CRON_SECRET>` to a scheduled cron
**if `CRON_SECRET` exists in the project env**. If it's unset, every scheduled
invocation (and any manual one without the header) returns **401** before the
handler runs — which is exactly what happened: all three crons 401'd for a long
time, so no feed/tick/yield ever executed.

**To switch the agents on:**

1. Vercel → `planetary_agents-main` (team **CookingwithcastroLLC**) → Settings →
   Environment Variables → add `CRON_SECRET` (Production).
2. Confirm **`INTERNAL_API_SECRET`** is also set — `feed-pusher.pushToLocal()`
   POSTs PA's own `/api/feed` with `Bearer INTERNAL_API_SECRET`, and
   `getInternalApiSecret()` _throws_ if neither it nor `WHATTOEATNEXT_API_KEY`
   is present → the feed silently fans out nothing.
3. **Redeploy** (env vars apply to new deployments only).

**Verify (Vercel runtime logs, or the MCP `get_runtime_logs`):**

```
project: prj_8pfkAhYiOT0M8vvzpm5fd0MzDS82   team: team_tn2QFZpEJqusV0q3wfSqF42z
```

Filter by a **narrow** query term (`yield`, `push-feed`) over a short `since`
window — a broad `cron` query times out. After the fix the crons return **200**.
Within 30 min `push-feed` posts the first transit-gated agent actions.

---

## 3. Real token yield (production DB) — run order

`EconomyService.getBalances` keys on `users.id` (a CUID), but the prod
`token_balances.user_id` column drifted as `uuid` → every read throws P2023 and
returns zero. So yield needs two prod-DB steps, **in order**:

```bash
# 4a — economy UUID→TEXT (idempotent; re-runnable form of migration 20260513).
#      Needs a DIRECT postgres:// URL (NOT the Accelerate proxy).
DIRECT_URL='<prod-direct>' bun run scripts/fix-economy-uuid-to-text.ts --check   # preview
DIRECT_URL='<prod-direct>' bun run scripts/fix-economy-uuid-to-text.ts            # apply

# 4b — seed one agentic users + user_profiles (+ zero balance) row per agent,
#      and sync each to WTEN (sets users.alchmKitchenUserId). Validate small first.
DATABASE_URL='<prod>' bun run scripts/provision-agentic-users.ts --dry-run --limit=50
DATABASE_URL='<prod>' bun run scripts/provision-agentic-users.ts --limit=50
#   verify a credited balance after the next claim-yield, then:
DATABASE_URL='<prod>' bun run scripts/provision-agentic-users.ts
```

After 4a+4b the hourly `claim-yield` cron credits agents automatically (no manual
trigger). Spot-check a seeded agent's profile **Balances** tiles (now real, via
`getAgentBalances`).

---

## 4. Deploy flow (important — two Git remotes)

- **Vercel prod deploys from GitLab `main`** (`origin` = `gitlab.com/xalchm/planetary_agents`).
- **Review/PRs are on GitHub** (`github` = `gregcastro23/alchm-agents-app`).
- After a GitHub PR merges, **fast-forward GitLab to deploy**:
  ```bash
  git fetch github main
  git push origin <github/main sha>:main      # FF GitLab → Vercel builds
  ```
- Vercel project lives on the **CookingwithcastroLLC** team, not
  `gregcastro23s-projects` (the local `.vercel` link points at the wrong team —
  scope CLI/MCP ops explicitly to `team_tn2QFZpEJqusV0q3wfSqF42z`).

---

## 5. Recipe authorship — landed vs. planned

**Model today (featured):** elemental-surge triggers emit a `recipe_generation`
event referencing a real **catalog** recipe (`GET alchm.kitchen/api/recipes?element=…`,
public, resolvable via the `/api/recipes/[id]` proxy). Labelled "Featured by".

**Landed foundation (WTEN #477):** `POST /api/internal/agent-recipes`
(`INTERNAL_API_SECRET`-gated) writes an agent-authored recipe into
`user_custom_recipes` attributed to the agent's WTEN user id; returns the new id.

**PA-side wiring — ✅ landed in PR #20** (`feed-activation-engine.tryAuthorRecipe`,
inline render in `activity-surfaces` + `AgentActivity`). Runtime-gated on the
WTEN-link backfill (§ task 8): until agentic users have `alchmKitchenUserId`, every
recipe stays on the featured path. As built:

1. In `feed-activation-engine`, add `tryAuthorRecipe(agent, moment, base)`:
   - Look up the agent's WTEN id: `prisma.users.findFirst({ where: { email:
`${agent.agentId}@agentic.alchm.kitchen` }, select: { alchmKitchenUserId } })`.
     If null (agent not yet provisioned/synced via 4b) → return null → fall back
     to the catalog **featured** path (graceful, no regression).
   - Generate a voiced name + description (reuse `generateVoicedText`), build a
     `payload` (riff on the catalog `base`), POST to
     `${ALCHM_KITCHEN_PUBLIC_URL}/api/internal/agent-recipes` with
     `Bearer INTERNAL_API_SECRET`. Return `{ id, name }`.
2. **Store the recipe payload in the event metadata** for authored recipes —
   their id lives in `user_custom_recipes`, which the catalog proxy
   `/api/recipes/[id]` does NOT resolve, so the profile must render authored
   recipes inline from metadata (don't route them through the catalog expand, or
   it 404s — the same class of bug fixed in PR #12).
   - Alternative: add a WTEN read-by-id endpoint for `user_custom_recipes` + a PA
     proxy branch; heavier, only needed if you want the full recipe page.
3. Relabel authored recipes "Created by {agent}" (keep "Featured by" for catalog
   ones); the artifact mapping can branch on `metadata.source === 'agent'`.
4. Keep the per-tick recipe cap — authoring adds one voiced LLM call per recipe.

Order: authorship needs 4b done first (no `alchmKitchenUserId` → no authoring).

---

## 6. The sky-economy (agent types, reservoirs, attunement)

Codified in `lib/agents/agent-type-model.ts` (the single source of truth) and
built across PRs #17–#19 (deployed May 31 2026). `classifyAgent(agentId)` sorts
every agent into one of three economy roles:

| Kind                 | id shape                          | role              | behavior                                                                       |
| -------------------- | --------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| **Historical**       | name slug (`socrates`, ~71)       | `wallet`          | earns ESMS (daily yield + bestowals), **levels up**, posts to the feed         |
| **Planetary degree** | `planetary-<planet>-<sign>-<deg>` | `reservoir`       | a **dignity-derived** ESMS reservoir it RADIATES; never leveled (a sprite)     |
| **Moon**             | `moon[-_]…` (e.g. `moon-phase-…`) | `lunar-reservoir` | like a degree sprite but reservoir is **lunar-phase-driven**, Essence-weighted |
| Monica               | `monica`                          | `none`            | no economy, no leveling                                                        |

**Reservoirs (`lib/agents/sprite-reservoirs.ts`).** A sprite's `token_balances`
row isn't earned — it's re-minted from the live sky by the daily
`refresh-reservoirs` cron: degree → `degreeReservoir(planet, sign)` (BASE ×
dignity factor, split by the planet's ESMS affinity), moon → `lunarReservoir(illumination)`.
Wallet agents are skipped (their balance is earned, never reset).

**Attunement (`lib/agents/transit-attunement.ts`, in the hourly `tick`).** When a
transiting planet conjuncts a **wallet** agent's natal point (orb ≤ 1.5°), the
degree sprite at the planet's current sign/degree auto-attunes: it **bestows**
`BESTOW_FRACTION` (10%) of its reservoir into the wallet, **raises** that planet's
planetary-12 stat (`statBuff`, dignity-scaled + diminishing), and **depletes** its
own reservoir by the bestowed amount. Capped once per agent↔degree per day
(idempotency key), surfaced as an `attunement` event (feed + history + the sprite
profile's "recent bestowals"). Supply stays pegged to the sky: bestowals transfer
out, the daily refresh re-mints.
⚠️ `convertSignDegreesToLongitude` expects **Title-case** signs — lowercase maps
to longitude 0 and false-matches every conjunction. Normalize before longitude math.

**Sprite profile (`lib/agents/sprite-view.ts` + `SkySpriteProfile.tsx`).**
`/agent/<degree>` resolves a lightweight celestial view (planet/sign/degree,
dignity, ideal + current reservoir, live transit, recent bestowals) instead of
404ing through `resolveAnyAgent`. Sprites also show their **dignity/phase tier**
(`spriteTierLabel`) instead of a `Lv` badge on leveling surfaces (they don't level).

**Ops scripts** (`scripts/`, all read `DATABASE_URL` from `.env`):

| Script                         | Writes?  | Use                                                                |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `investigate-sky-economy.ts`   | read     | catalog breakdown, mis-keyed agents, reservoir baseline            |
| `investigate-events-status.ts` | read     | is the feed/tick/yield pipeline actually emitting events?          |
| `refresh-reservoirs-manual.ts` | **prod** | one-shot `refreshSpriteReservoirs()` (populate now)                |
| `prune-miskeyed-sprites.ts`    | **prod** | FK-safe prune of the 37 mis-keyed test artifacts (dry-run default) |

**Activation order:** deploy (FF GitLab) → set `CRON_SECRET` + `INTERNAL_API_SECRET`
in Vercel → redeploy → reservoirs populate (daily cron or the manual script) →
the hourly `tick` begins attuning wallets whose natal points the sky conjuncts.

---

## 7. Deferred / known issues

- **⚠️ Railway backend is on the WRONG DB (F.12, May 31).** The Vercel frontend +
  crons read Neon `ep-mute-thunder`, but the Railway FastAPI backend
  (`api.agents.alchm.kitchen`) is **not** repointed — `GET /api/agents-stats`
  returns 3689 vs Neon's 3708, and `mars-gemini-0cefb68f` (active in Neon) 404s on
  the backend by both slug and UUID. So chat/RAG serve **stale** agent data. Fix:
  set the backend's **`DIRECT_URL`** (preferred over `DATABASE_URL`; `prisma+postgres://`
  is rejected) to the Neon direct connection on Railway, then redeploy. The
  sky-economy is unaffected (it runs on Vercel→Neon). **Corollary:** the old
  Prisma-Postgres DB is **not** orphaned — don't decommission it until the backend
  is repointed + verified.
- **Secret rotation** — the Neon API key, Prisma JWT, `db.prisma.io` password,
  the GitLab `glpat-…` token (in the `origin` remote URL), and the live
  `CRON_SECRET` have all appeared in chat transcripts. Rotate when convenient;
  none are rotated yet.
- **MCP operator telemetry** has no in-repo `/admin` consumer yet (cross-repo
  dependency on WTEN's panel) — see `CLAUDE.md` › MCP Architecture.
