# Planetary Agents — Architecture & Code-Health Audit

**Date:** 2026-06-01 · **Branch:** `fix/frontend-prisma-with-engine` · **Mode:** read-only (no prod mutated)
**Method:** 6 parallel code-investigation passes (file:line verified) + live state via Railway MCP, Vercel CLI/MCP, `GET /api/providers/health`, and a live `GET /api/feed` probe.

> Secrets are redacted throughout (var names, schemes, hosts, and state only). Values were read for verification but never reproduced here.

---

## 0. Live-state snapshot (verified this session)

| Surface                                    | State                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vercel** project `planetary_agents-main` | team **CookingwithcastroLLC** (`team_tn2QFZpEJqusV0q3wfSqF42z`), domain `agents.alchm.kitchen`, latest prod deploy 2026-06-01. Local `.vercel` link → **correct team** (mismatch resolved). |
| **Railway** service `planetary agents`     | project `passionate-vibrancy`/`production`, domain `api.agents.alchm.kitchen`, last deploy SUCCESS 2026-06-01 16:46 UTC. Boot clean; RAG ingest **3865 chunks** OK.                         |
| **Frontend Prisma → DB**                   | **Healthy** — `GET /api/feed` returns 31 real `agent_action_events`, newest `2026-06-01T17:00:36Z`.                                                                                         |
| **Crons**                                  | **Running** — feed shows hourly tick output on the hour (17:00:36Z). `CRON_SECRET` set on Vercel 2d ago.                                                                                    |
| **TS errors (typed surface)**              | **0** (app/lib/components/hooks; scripts/backend/test excluded by tsconfig).                                                                                                                |
| **`mcp-summary`**                          | ⚠️ `GET /api/admin/mcp-summary` returns **500** in prod (boot logs).                                                                                                                        |

### Live provider health (`api.agents.alchm.kitchen/api/providers/health`)

| Provider       | OK  | Note                                                                  |
| -------------- | --- | --------------------------------------------------------------------- |
| **Anthropic**  | ❌  | `401 invalid x-api-key` — key invalid                                 |
| **Groq**       | ✅  | `llama-3.3-70b-versatile` — **default free tier, runtime chat works** |
| Cerebras       | ❌  | `429` high traffic (transient)                                        |
| Gemini         | ❌  | timeout (transient)                                                   |
| **OpenRouter** | ✅  | `moonshotai/kimi-k2.6:free` (hardcoded id)                            |
| **OpenAI**     | ✅  | `gpt-4o-mini` — valid (RAG embeddings + last-ditch work)              |

---

## 1. Topology diagram

```
                         ┌──────────────────────── GIT ────────────────────────┐
                         │  GitHub  gregcastro23/alchm-agents-app  (PRIMARY)    │
                         │     │ push                                            │
                         │     └─► Railway auto-deploy (backend, main)           │
                         │  GitLab xalchm/planetary_agents (LAGGING MIRROR)      │
                         │     remote URL embeds glpat-… token  ⚠️ P1            │
                         └──────────────────────────────────────────────────────┘
   manual `vercel --prod`  (NO git auto-deploy ⚠️ P1)
        │
        ▼
┌─────────────────────────────┐         NEXT_PUBLIC_BACKEND_URL        ┌──────────────────────────────┐
│  VERCEL  (frontend)         │  ───────────────────────────────────► │  RAILWAY  (FastAPI backend)  │
│  team cookingwithcastro-llc │   passionate-vibrancy-…up.railway.app │  passionate-vibrancy /       │
│  agents.alchm.kitchen       │                                       │  "planetary agents" (prod)   │
│  Next.js API routes + crons │                                       │  api.agents.alchm.kitchen    │
│                             │                                       │  chat orchestration + RAG    │
│  lib/db.ts → PrismaClient   │                                       │  backend/database.py         │
│  DATABASE_URL (pooled) ─────┼───────────────┐         ┌─────────────┼─ DIRECT_URL ─────────┐        │
│  DIRECT_URL (migrations)    │               │         │             │  (prefers DIRECT_URL) │        │
└─────────────────────────────┘               ▼         ▼             └───────────────────────┼────────┘
                                       ┌─────────────────────────────┐                        │
   ⚠️ DATABASE_URL lacks pgbouncer=true │  NEON  ep-mute-thunder-…    │ ◄──────────────────────┘
                                       │  neondb  (CANONICAL DB)     │   backend DATABASE_URL is
                                       │  -pooler host = frontend    │   STILL prisma+postgres://
                                       │  direct host  = backend     │   accelerate…  ⚠️ landmine (P0/P1)
                                       └─────────────────────────────┘            │
                                                                                  ▼
                                                              ┌───────────────────────────────────┐
                                                              │  OLD Prisma-Postgres / Accelerate │
                                                              │  accelerate.prisma-data.net       │
                                                              │  (divergent, stale — should die)  │
                                                              └───────────────────────────────────┘

  Providers (backend free chain): Groq✅ → Cerebras429 → Gemini⏱ → OpenRouter✅ → OpenAI✅ ;  Anthropic❌401 (tiers only)
  RAG: ChromaDB in-process on backend (OpenAI embeddings, 3865 chunks). WTEN backend: WHATTOEATNEXT_BASE_URL=api.alchm.kitchen ⚠️ (does not resolve)
```

### DB consumer → resolved DB

| Consumer                       | Mechanism                                                        | Env var                                                        | Lands on                             |
| ------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| Vercel frontend routes         | `@/lib/db` lazy Prisma (Accelerate only if `prisma+postgres://`) | `DATABASE_URL`                                                 | Neon pooler ✅ (functionally proven) |
| 7 runtime modules              | ad-hoc `new PrismaClient()`                                      | `DATABASE_URL`                                                 | Neon pooler (P2: sprawl)             |
| `lib/database/economy.ts`      | raw `pg` Pool                                                    | `RAILWAY_DATABASE_URL` ‖ `DATABASE_URL`                        | Neon (RAILWAY_DATABASE_URL unset)    |
| Railway Python backend         | SQLAlchemy                                                       | `DIRECT_URL` → `DATABASE_URL` (skips prisma+postgres) → SQLite | **Neon direct** ✅                   |
| Railway `DATABASE_URL` (inert) | —                                                                | `DATABASE_URL`                                                 | **OLD Accelerate DB** ⚠️             |
| `prisma migrate`               | Prisma                                                           | `DIRECT_URL`                                                   | Neon direct ✅                       |

---

## 2. Environment matrix (redacted; ⚠ = finding)

| Var                                              | Railway (backend)                                        | Vercel (frontend)                                          | Notes                                                  |
| ------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| `DIRECT_URL`                                     | Neon `ep-mute-thunder` direct ✅                         | set (18d)                                                  | canonical                                              |
| `DATABASE_URL`                                   | ⚠ `prisma+postgres://accelerate…` (OLD DB)               | set (19d), Neon pooled intended; **no `pgbouncer=true`** ⚠ | see P0-2/P0-3                                          |
| `ANTHROPIC_API_KEY`                              | set but **invalid (401)** ⚠                              | set                                                        | rotate                                                 |
| `OPENAI_API_KEY`                                 | set, **valid** ✅                                        | set                                                        | RAG + last-ditch OK                                    |
| `GROQ`/`CEREBRAS`/`GEMINI`/`OPENROUTER` keys     | set (backend free chain)                                 | **absent** (correct — backend-only)                        | —                                                      |
| `CLAUDE_DEFAULT_MODEL`                           | ⚠ `claude-3-5-sonnet-20241022` (stale)                   | set (likely stale)                                         | update/remove                                          |
| `JWT_SECRET`                                     | ⚠ `your-production-jwt-secret-change-this` (placeholder) | custom (OK)                                                | rotate Railway                                         |
| `INTERNAL_API_SECRET` / `PA_INTERNAL_API_SECRET` | set (equal)                                              | set (7d)                                                   | parity w/ alchm.kitchen                                |
| `CRON_SECRET`                                    | set                                                      | set (2d) ✅                                                | crons authorized                                       |
| `ALCHM_KITCHEN_SYNC_SECRET` + `…SYNC_URL`        | set                                                      | **ABSENT** ⚠                                               | consumed in `lib/` (Vercel) → human credit sync broken |
| `WHATTOEATNEXT_BASE_URL`                         | ⚠ `https://api.alchm.kitchen` (does not resolve)         | same ⚠                                                     | point at resolving WTEN host                           |
| `NEXT_PUBLIC_WEBSOCKET_URL`                      | ⚠ `wss://…ngrok-free.dev\n` (trailing `\n`, ephemeral)   | **ABSENT**                                                 | strip `\n`; ngrok ≠ prod                               |
| `MOCK_LLM`                                       | —                                                        | present (verify = false)                                   | confirm not mocking prod                               |
| next-auth                                        | —                                                        | `NEXTAUTH_*` **and** `AUTH_*` both set (P2 cruft)          | v4/v5 duplication                                      |

**Secret hygiene:** no `.env` is git-tracked or in history (`.gitignore` covers `.env*`). Live plaintext secrets exist in local `.env*` and both dashboards — rotate anything pasted/shared in chats or PRs (Neon password, OpenAI/Groq/Gemini/Cerebras/OpenRouter, Galileo, Cloudflare). The **GitLab `glpat-` token in `.git/config`** is the one credential sitting in a config file (below).

---

## 3. P0 — Database topology & Prisma

**P0-1 — Frontend Prisma engine/URL now consistent (RESOLVED, verify value).**
`vercel.json:3` `buildCommand: "bun run prisma:generate && bun run build"`; `package.json:58` `prisma generate` (the `--no-engine` was dropped in `a4c60d60`); `prisma/schema.prisma:1-3` generator has no `engineType="none"` → default query engine. `lib/db.ts:60` applies Accelerate only for `prisma+postgres://`, else plain engine-ful client. Local `.env:3` `DATABASE_URL=postgresql://…neon…` (plain) → engine path → P6001 is now structurally impossible. **Functionally proven** by the live feed. _Action:_ eyeball Vercel prod `DATABASE_URL` in dashboard to confirm scheme (sensitive vars can't be read back via CLI).

**P0-2 — Pooled `DATABASE_URL` lacks `pgbouncer=true` (prepared-statement risk).**
`.env:3` host is `ep-mute-thunder-ahui2n87-pooler` (PgBouncer txn mode) but the query string has no `pgbouncer=true` / `connection_limit` (grep across `.env*`, `schema.prisma`, `vercel.json` = none). Prisma's binary engine uses server-side prepared statements → intermittent `prepared statement "s0" already exists` (26000/42P05) under concurrent serverless route handlers, amplified by P2-1 sprawl. `directUrl` is correctly set for migrations (`schema.prisma:8`). _Fix:_ append `&pgbouncer=true` (±`connection_limit=1`) to Vercel prod `DATABASE_URL` + local `.env`.

**P0-3 — Railway backend `DATABASE_URL` still points at the OLD Accelerate/Prisma-Postgres DB.**
Live value = `prisma+postgres://accelerate.prisma-data.net/?api_key=…` (a different, stale DB than Neon). `backend/database.py:84-87` prefers `DIRECT_URL` and explicitly skips the `prisma+postgres://` scheme, so it is **inert today** — but it is a live divergence landmine that embeds an API key to a stale DB, and is exactly the "old Accelerate DB" the audit asked to flag. _Fix:_ delete or repoint Railway `DATABASE_URL` to the Neon pooled URL.

**P0-4 — Migration drift: Sacred-7 score columns have no migration.** `[P1-grade]`
`schema.prisma:665-671` declares `powerScore, resonanceScore7, wisdomScore, charismaScore, intuitionScore, adaptabilityScore, vitalityScore` (`Float? @default(0)`), but no `migration.sql` references them (init migration creates `historical_agents` without them). Identical pattern to the bug `20260530000000_add_planetary_12_stats` was written to fix. Full-model `findMany` on `historical_agents` selects every scalar → 500 `column … does not exist` if prod lacks them. **REQUIRES LIVE CHECK** of Neon; if absent, add an idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` migration (do **not** `db push` — materialized views cause destructive mis-diffs).

**P0-5 — Economy tables have models but no `CREATE TABLE` migration.** `[P1-grade]`
`token_balances`/`token_transactions`/`user_subscriptions` (`schema.prisma:1390-1448`) appear only in the `fix_economy_uuid_to_text` ALTER, never a CREATE. They are WTEN-owned/out-of-band, so `prisma migrate dev`/shadow-DB is not self-bootstrapping and `migrate status` will always show drift. _Fix:_ add guarded `CREATE TABLE IF NOT EXISTS` ahead of the ALTER, or document the external-ownership boundary explicitly.

**P0-6 — Error-swallowing: 3 routes mask a DB outage as empty/200 (the June failure mode).**

- `app/api/feed/route.ts:45-47` — public feed; DB throw → `{events:[],cursor:null,hasMore:false}` **200**. Closest match to the incident.
- `app/api/jing-duels/route.ts:166-172` — GET; DB throw → `{ok:false,duels:[]}` **200**.
- `app/api/admin/conversation-metrics/route.ts:98-109` — DB throw → `{success:true, …zeros}` **200** (most deceptive — claims success).
  _Fix:_ return 5xx + structured error on DB failure; add alerting. (Vast majority of routes already 5xx correctly; Redis/RAG/Galileo empty-fallbacks are acceptable.)

**P0-7 (P2-grade) — 7 runtime modules use ad-hoc `new PrismaClient()`** (`lib/consciousness-persistence.ts:9`, `lib/services/transit-notification-service.ts:11`, `app/api/personalized-transits/route.ts:17`, `app/api/personalized-planetary-transits/route.ts:20`, `app/api/rag/feedback/route.ts:9`, `app/api/rag/analytics/route.ts:9`, `lib/performance/optimization-engine.ts:8`) — bypass `@/lib/db` pooling + alias map; consolidate.

---

## 4. P1 — CI/CD, deploy & secrets

**P1-1 — GitLab `origin` remote URL embeds a `glpat-` token** (`.git/config`, fetch+push). Active push credential in plaintext. _Fix:_ **rotate the token now**, switch the remote to SSH or a credential helper (`git remote set-url origin git@gitlab.com:…`). Not in tracked files/history (good).

**P1-2 — Vercel↔git disconnected; Railway auto-deploys.** Frontend ships only via manual `vercel --prod`; backend auto-deploys from GitHub `main`. This lets the frontend silently lag the backend. _Fix:_ document the runbook (it's currently tribal knowledge) and/or enable Vercel's git integration or a `deploy` script in CI. **Team mismatch is RESOLVED** — local `.vercel` orgId = cookingwithcastro-llc (a stale duplicate project may linger under `gregcastro23s-projects`; optional cleanup).

**P1-3 — `JWT_SECRET` is the literal placeholder on Railway** (`your-production-jwt-secret-change-this`). If the backend signs/verifies any token with it, those tokens are forgeable. _Fix:_ set a strong secret on Railway + rotate. (Vercel's `JWT_SECRET` is custom.)

**P1-4 — `ALCHM_KITCHEN_SYNC_SECRET` (+ `…SYNC_URL`) missing on Vercel.** Consumed by `lib/alchm-credit-sync.ts:48`, `lib/wtenClient.ts:27`, `lib/alchm-debit-sync.ts` — all Vercel-side. Absent on Vercel ⇒ **human credit sync to alchm.kitchen is blocked** (matches the standing "weekly attunement" blocker). _Fix:_ set both on Vercel. (Agent debit can fall back to `INTERNAL_API_SECRET`, which is set; human credit cannot.)

**P1-5 — Anthropic key invalid (live 401).** Anthropic tiers (`cheap_fast`/`primary`/`reflective`) and the cached-persona Anthropic path are dead. Runtime default is `free` (Groq ✅) so user chat works; **dev tiers are broken**. _Fix:_ rotate `ANTHROPIC_API_KEY` on Railway + Vercel.

**P1-6 — Confirmed env smells (live):** `WHATTOEATNEXT_BASE_URL=https://api.alchm.kitchen` (host does not resolve, Railway+Vercel); `NEXT_PUBLIC_WEBSOCKET_URL=…ngrok-free.dev\n` (literal `\n`, ephemeral ngrok, only on Railway where it's inert, absent on Vercel); `CLAUDE_DEFAULT_MODEL` stale 3.5. _Fix:_ point WTEN base at a resolving host (`whattoeatnext-production.up.railway.app`), strip `\n` / remove the ngrok URL, update or delete `CLAUDE_DEFAULT_MODEL`.

---

## 5. P1/P2 — AI providers, chat, crons, transit group chat

**P1 — Free chain fully hardcoded, no env override.** `backend/providers.py:62-98`; OpenRouter free id `moonshotai/kimi-k2.6:free` (`:95`); also Groq `:64`, Cerebras `:73`, Gemini `:82`. A retired free model requires a code change + redeploy (already happened once: deepseek→kimi). _Fix:_ `model=os.getenv("OPENROUTER_FREE_MODEL", …)` etc. Chain order & missing-key-skip logic are otherwise correct/robust (verified Anthropic→Groq→Cerebras→Gemini→OpenRouter→OpenAI).

**P1 — Stale model literals bypassing the registry.** `lib/anthropic-client.ts:67-69` (`getClaudeModel()` returns `claude-3-5-sonnet-20241022` / `-haiku-` / `-opus-`); `app/api/moon-phase-agent/route.ts:104` (`claude-3-5-haiku-20241022`). Both are live runtime paths violating the "never hardcode model strings" rule. _Fix:_ source from `lib/models/registry.ts`.

**P1 — Invalid embedding key fails silently in chat.** `backend/main.py:1211-1212` catches RAG errors with a `print` only; `rag_used:false` (`:1299`) is indistinguishable from "RAG errored." A zero-vector-poisoned ChromaDB collection persists until manual `--force` (`ingest.py:84-94`). (OpenAI key currently valid → 3865 chunks ingested ✅.) _Fix:_ emit a structured `rag_error` signal/metric.

**P2 — `/api/rag/ingest` unauthenticated** (`backend/main.py:1360`) — any caller can inject documents into the `historical-agents` collection; gate with `INTERNAL_API_SECRET`. **P2 — `personaCacheKey`** is observability-only (never sent to Anthropic; caching keys off prompt-prefix content) — naming implies a control role it lacks.

**Crons — working, two hygiene items.** All 3 (`claim-yield`, `tick`, `push-feed`) auth via `CRON_SECRET` Bearer → hard-401 in prod if missing; paths reconcile 1:1 with `vercel.json`; yield/tick idempotency is solid (idempotency keys + in-tx daily check + hour-bucketed upserts); economy scripts (`fix-economy-uuid-to-text.ts`, `provision-agentic-users.ts`) are idempotent, correctly ordered, genuine prerequisites. _Hygiene:_ `claim-yield/route.ts:11` doc-comment says `0 6 * * *` but `vercel.json:18` runs hourly; all 3 crons return **HTTP 200 on partial failure** (green-in-dashboard even when agents fail) — return 207/500 when `errors.length>0`.

**Transit group chat (newly shipped) — auth/cost/idempotency.**

- **P1** `app/(app)/gallery/group/[id]/group-client.tsx:225-244` — once-only auto-seed guarded only by `localStorage` + an in-memory ref; no server `seeded_at`. Re-charges the full council opener on every fresh browser/incognito/cleared-storage. _Fix:_ persist `seeded_at`/`status` on `group_chat_sessions`, gate via atomic `UPDATE … WHERE seeded_at IS NULL`.
- **P1** `app/api/unified-multi-agent-chat/route.ts:162-225` — token-costing LLM work reachable with **no auth + no debit** for anonymous users (debit only runs when `userId` present). Mitigant: forced `modelTier:'free'` (Groq), so it's quota not per-token billing. _Fix:_ require session/secret or per-IP rate limit.
- **P1** `app/api/internal/group-chat/route.ts:117-140` + `lib/agents/transit-group-session.ts:58-94` — check-then-insert with no transaction and only a non-unique `@@index` (`schema.prisma:1494`) → concurrent requests double-seed. _Fix:_ partial unique index on `(transitKey,userId)` or `upsert`; treat conflict as reuse.
- **OK** the internal route's own auth is correct (`timingSafeEqual` on `INTERNAL_API_SECRET`, fail-closed in prod).

---

## 6. P2 — Tech debt

- **`next.config.mjs`** — `typescript.ignoreBuildErrors:true` (`:15`) + `eslint.ignoreDuringBuilds:true` (`:12`): build is not a safety net. Also `images.unoptimized:true` (`:18`), no `headers()` (no CSP/HSTS), and a `if (process.env.TURBOPACK) return config` early-return (`:77`) that silently skips the webpack `externals` for `chromadb`/`onnxruntime-node`/etc.
- **TS backlog** — `tsc --noEmit` = **0 errors**, but `tsconfig.json:35-64` excludes `scripts/`, `backend/`, `test/`, `lib/_archive`, and all specs; the 1065 campaign baseline predates these exclusions. `scripts/linting-campaign.js:24` hardcodes `yarn tsc` (broken on this machine) and `:84` hardcodes baseline `1065` (duplicated in `package.json:35`); no current count is ever persisted. _Fix:_ persist a timestamped count; run a CI `tsc` gate (separate from build) so net-new errors can't land.
- **Test coverage** — backend pytest is strong (providers/fallback rotation, MCP telemetry, tier-gating, recipe gen). Next.js gaps: **transit group chat = 0 tests** (incl. security-sensitive auth), **economy crons (yield/tick/push-feed) = 0 tests**; `app/api/**` is **excluded from coverage** (`vitest.config.ts:28`) so the gaps are invisible. Persona pipeline is covered (`test/persona/voice-differentiation.spec.ts`).
- **MCP telemetry** — confirmed no in-repo UI consumer (by design); backend endpoints (`main.py:448/1855/2231`) are secret-gated and WTEN-consumed. ⚠ **Live: `GET /api/admin/mcp-summary` returns 500 in prod** — investigate (the external WTEN panel sees errors).

---

## 7. Remediation order

### A. Immediate — ops only, no code (minutes)

1. **Rotate the GitLab `glpat-` token** + move `origin` to SSH/credential helper. _(P1-1, security)_
2. **Set `ALCHM_KITCHEN_SYNC_SECRET` + `ALCHM_KITCHEN_SYNC_URL` on Vercel** → unblocks human credits. _(P1-4)_
3. **Add `&pgbouncer=true`** to Vercel prod `DATABASE_URL` (+ local `.env`). _(P0-2)_
4. **Rotate `ANTHROPIC_API_KEY`** (Railway+Vercel); **replace placeholder `JWT_SECRET`** on Railway. _(P1-5, P1-3)_
5. **Remove/repoint Railway `DATABASE_URL`** off the Accelerate landmine. _(P0-3)_
6. **Fix env strings:** `WHATTOEATNEXT_BASE_URL` → resolving host; strip `\n` from `NEXT_PUBLIC_WEBSOCKET_URL`; update/remove `CLAUDE_DEFAULT_MODEL`. _(P1-6)_
7. Eyeball Vercel prod `DATABASE_URL` scheme; verify `MOCK_LLM` is false. _(P0-1)_

### B. Short — small code (hours)

8. Fix the 3 BAD error-swallowing routes → 5xx + alert. _(P0-6)_
9. Stale model literals → registry (`anthropic-client.ts`, `moon-phase-agent`). Make free chain env-overridable (`*_FREE_MODEL`). _(P1 providers)_
10. Transit group chat: server-side `seeded_at` gate; require auth/rate-limit on `unified-multi-agent-chat`; unique index on `(transitKey,userId)`. _(P1 transit)_
11. Cron hygiene: fix `claim-yield` comment; return 207/500 on partial failure. _(P2)_
12. Investigate the `mcp-summary` 500. _(P2)_

### C. Medium — migrations / refactor / tests (days)

13. Idempotent `ADD COLUMN IF NOT EXISTS` migration for the 7 Sacred-7 columns (verify prod first); decide economy-table CREATE/ownership story. _(P0-4, P0-5)_
14. Consolidate ad-hoc `new PrismaClient()` onto `@/lib/db`. _(P0-7)_
15. Tests for transit-group-chat auth + economy crons; stop excluding `app/api/**` from coverage. _(P2)_
16. Structured `rag_error` signal; gate `/api/rag/ingest`. _(P1/P2 RAG)_
17. Document the deploy runbook (manual Vercel + auto Railway); consider Vercel git integration; CI `tsc` gate. _(P1-2, P2)_

---

## 8. Verified GOOD / RESOLVED (don't re-litigate)

- Frontend Prisma engine + Neon plain URL consistent; live feed proves the DB path works (P6001 resolved).
- Backend correctly uses `DIRECT_URL` → Neon; boots clean; RAG ingest 3865 chunks.
- Recent migrations (`group_chat_sessions`, `mcp_invocations`, `cosmic_leveling`, `planetary_12_stats`, `fix_economy_uuid_to_text`, `add_feedback_model`) match `schema.prisma`.
- Vercel team mismatch resolved (local link → cookingwithcastro-llc).
- Crons authorized + executing (CRON_SECRET set; feed shows hourly output).
- Provider fallback chain order + missing-key-skip correct and robust; persona-first pipeline correct (override verbatim, RAG appended after); Galileo cannot break the chat path; internal group-chat route auth correct.
- No `.env` is git-tracked or in history.
