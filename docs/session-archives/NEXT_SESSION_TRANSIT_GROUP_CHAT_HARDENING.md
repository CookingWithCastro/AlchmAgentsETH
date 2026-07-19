# Next-Session Prompt — Planetary Agents: Transit Group Chat Cost/Auth Hardening (P1)

> Repo: `/Users/cookingwithcastro/Desktop/planetary_agents-main`. Use **bun** (yarn/npm fail here).
> Deploys: `agents.alchm.kitchen` (Vercel, team **cookingwithcastro-llc**, **manual `vercel --prod`** — not git-connected) + `api.agents.alchm.kitchen` (Railway, auto-deploys backend from GitHub `main`). Primary git remote = GitHub `gregcastro23/alchm-agents-app`.
> Background: `ARCHITECTURE_AUDIT_2026-06-01.md` (§5 "Transit group chat") + memories `project_transit_group_chat`, `reference_architecture_audit_2026_06`, `reference_prisma_db_push_unsafe`, `project_pa_vercel_team`.

## Goal

Close the **P1 abuse vector** in the newly-shipped transit group chat. Today an anonymous user can trigger **repeated, unauthenticated, unmetered LLM work**, and concurrent requests can double-create sessions. Make seeding **server-side idempotent**, gate/limit the spend path, fix the concurrency race, and add the missing tests. Everything stays on the **free tier** (Groq) — this is about preventing runaway/duplicate spend, not adding paid cost.

## The problems (verified this audit, with file:line)

1. **[P1] Auto-seed guarded only client-side.** `app/(app)/gallery/group/[id]/group-client.tsx:225-244` gates the once-only council opener with `localStorage` + an in-memory `seededRef`. There is **no server record** that a session was seeded — `group_chat_sessions` has no `seeded_at`/`status` column (`prisma/schema.prisma:1483-1497`). Opening the same stable `sessionId` URL in a fresh browser / incognito / after clearing storage re-fires the full opener (N sequential LLM calls). The 6-hour session-reuse window _amplifies_ this (one stable URL handed to many visitors, each re-seeds).
2. **[P1] Spend path is anonymous + unmetered.** The client posts to `app/api/unified-multi-agent-chat/route.ts`; the ESMS debit only runs when a logged-in `userId` is present (`:162-225`), so an anonymous POST (or a script) triggers real backend LLM calls with **no auth, no debit, no rate limit**. Mitigant: every agent is forced to `modelTier:'free'` (Groq) so cost is quota not billing — but it is still unauthenticated unmetered work, and the auto-seed fires it unconditionally on first arrival.
3. **[P1] Concurrent double-seed.** Session creation is a non-atomic check-then-insert: `app/api/internal/group-chat/route.ts:117-140` calls `findRecentTransitSession` then `createTransitGroupSession` (`lib/agents/transit-group-session.ts:58-94`) with **no transaction and only a non-unique `@@index([transitKey, userId])`** (`prisma/schema.prisma:1494`). Two near-simultaneous POSTs for the same transit both miss the SELECT and both INSERT → two sessions, each seeded independently.
4. **[P2] Cost shape.** Each turn loops `regularAgents` **sequentially**, one backend chat call per agent (`route.ts:241-280`), capped at 6 (`route.ts:152`; `app/api/internal/group-chat/route.ts:19,95` `MAX_AGENTS=6`). The auto-seed means the first arrival spends up to 6 calls before anyone types.

**Already correct — do NOT change:** the internal route's own auth (`app/api/internal/group-chat/route.ts:34-49,76-78` — `timingSafeEqual` on `INTERNAL_API_SECRET`/`PA_INTERNAL_API_SECRET`, fail-closed in prod); the 6h reuse window keys by exact `userId` (`lib/agents/transit-group-session.ts:42,58-77`); the group page (`page.tsx`) is a pure read. Also review `lib/agents/degree-agent.ts` for the seed/opener content (it shapes the per-agent calls).

## Fix plan (ordered)

1. **Server-side seed idempotency (kills #1).** Add `seededAt DateTime?` (or a `status` enum) to `group_chat_sessions`. Add a server endpoint/action that performs an **atomic claim** — `UPDATE group_chat_sessions SET "seededAt" = now() WHERE id = $1 AND "seededAt" IS NULL` — and only fires the council opener when exactly one row was updated. Move the seed trigger out of `group-client.tsx` localStorage into this server-gated path.
2. **Unique index (kills #3).** Add a partial unique index on `(transitKey, userId)` scoped to live/recent sessions, OR make `createTransitGroupSession` an `upsert` on a deterministic key; treat a unique-violation as "reuse existing."
3. **Gate/limit the spend path (kills #2).** On `/api/unified-multi-agent-chat`: require a session, OR an internal secret for the seed path, OR per-IP / per-session rate limiting. At minimum the anonymous auto-seed must be unrepeatable (covered by #1) and rate-limited. Keep `modelTier:'free'`.
4. **Tests (the area has ZERO — `test/chat-system/integration/gallery-group-chat-route.test.ts` targets the unrelated legacy route).** Add integration tests: internal group-chat auth (valid secret → ok; wrong → 401/403; prod-no-secret → reject); seed idempotency (2nd seed no-ops); concurrency (2 parallel creates → 1 session). Consider un-excluding `app/api/**` from coverage (`vitest.config.ts:28`).

## Constraints / gotchas

- **Migrations:** `prisma db push` is **UNSAFE** here — prod Neon carries materialized views (`synastry_aspects`/`synastry_scores`) Prisma mis-diffs into destructive `DROP`s. Hand-author idempotent `ALTER TABLE "group_chat_sessions" ADD COLUMN IF NOT EXISTS "seededAt" TIMESTAMP` + `CREATE UNIQUE INDEX IF NOT EXISTS …`, apply to Neon via `prisma db execute` (or a raw `pg` script on `DIRECT_URL`), then `prisma migrate resolve`. The `20260601000000_add_group_chat_sessions` migration was applied this exact way.
- **DB:** canonical = Neon `ep-mute-thunder` (`DIRECT_URL`). Pooled `DATABASE_URL` lacks `pgbouncer=true` (separate open audit item).
- **Deploy:** frontend ships via **manual `vercel --prod`** (Vercel not git-connected). `vercel redeploy`/`inspect` default to the WRONG team — always pass `--scope cookingwithcastro-llc`. Railway auto-deploys the backend from `main` only (these are frontend + DB changes; no backend deploy needed unless you touch `backend/`).
- **Tooling:** `bunx tsc` is broken in this env — use `./node_modules/.bin/tsc --noEmit`. Run DB-backed scripts with `bun --conditions react-server scripts/foo.ts` (plain `bun run` throws `server-only` at import).

## Verify before done

- `./node_modules/.bin/tsc --noEmit` stays at 0 errors on the typed surface.
- New tests pass (`bunx vitest run test/...`).
- Idempotency proven: hitting the seed path twice, and two concurrent creates, yields exactly one seeded session / one set of opener calls.
- Migration verified against Neon (column + unique index exist; `prisma migrate status` shows no destructive drift).

## Deliverable

A PR `→ main` with: the idempotent migration SQL, the server-side seed gate, the unique index, the chat-route guard/limit, and the tests — plus a short note on what was verified (and how, against Neon).
