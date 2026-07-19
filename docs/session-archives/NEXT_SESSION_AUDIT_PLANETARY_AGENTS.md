# Next-Session Prompt — Planetary Agents: Development & Architecture Audit

> Run in the **planetary_agents** repo (`/Users/cookingwithcastro/Desktop/planetary_agents-main`).
> **Deploys:** `agents.alchm.kitchen` (Vercel — project `planetary_agents-main` on the **cookingwithcastro-llc** team) + `api.agents.alchm.kitchen` (Railway Python/FastAPI — service **"planetary agents"** in project **passionate-vibrancy**, env `production`).
> **Git:** GitHub `gregcastro23/alchm-agents-app` is primary (Railway auto-deploys the backend from `main`); a GitLab `origin` is a lagging mirror. **Vercel does NOT auto-deploy on merge — the frontend ships via manual `vercel --prod`.**

## Goal

Produce a prioritized **architecture + code-health audit**: P0/P1/P2 findings (with `file:line` refs), a data/deploy **topology diagram**, and a remediation order (quick wins vs. refactors). Investigate **read-only first**; use the Railway MCP/CLI + Vercel CLI for live state; do **not** mutate prod without explicit confirmation. (I won't set secrets — surface them for the operator.)

## P0 — Database topology & Prisma (the area that bit us in June 2026)

The frontend's Prisma layer was silently broken (engineless client + a `postgresql://` URL → `P6001` on every query), and the runtime DB had diverged from the migration DB. Confirm it's fully coherent now:

- **Map every DB consumer** and the exact DB each resolves to: Vercel frontend (`DATABASE_URL`, now Neon pooled), Railway Python backend (`backend/database.py` prefers `DIRECT_URL`), Vercel crons, and whatever Prisma **Accelerate** proxies to. They should ALL be the canonical **Neon `ep-mute-thunder`** DB. Flag anything still pointed at the old Prisma-Postgres / Accelerate DB.
- `lib/db.ts` attaches `withAccelerate` only for `prisma+postgres://`; the build now runs `prisma generate` (with engine, was `--no-engine`). Verify client↔URL consistency across frontend/local.
- **Migration drift:** diff `prisma/schema.prisma` ↔ `prisma/migrations/` ↔ the live Neon schema (`group_chat_sessions` was applied via `db execute` + `migrate resolve`; token_balances drifted historically). List anything in one but not the others.
- Pooled `DATABASE_URL` lacks `&pgbouncer=true` — assess prepared-statement risk under serverless load.
- **Error-swallowing audit:** grep API routes for `catch` blocks that return `[]`/`null`/empty on Prisma errors — these masked the outage. Inventory them (silent failure is worse than a 500 here).

## P1 — CI/CD, deploy & secrets

- Vercel/git is disconnected (manual `vercel --prod`); Railway auto-deploys backend from `main`. Decide if intentional; document the deploy runbook either way.
- Local `.vercel` link points at _gregcastro23s-projects_ while prod is _cookingwithcastro-llc_ (team mismatch footgun).
- The GitLab `origin` remote URL embeds a `glpat-` token — **rotate it** and move to a credential helper.
- Reconcile env across Railway / Vercel / `.env*`. Known smells: `WHATTOEATNEXT_BASE_URL=https://api.alchm.kitchen` (host does **not** resolve), `\n`-suffixed `NEXT_PUBLIC_WEBSOCKET_URL`, keys recently pasted in plaintext (recommend rotation), `INTERNAL_API_SECRET` parity with alchm.kitchen.

## P1/P2 — AI providers, chat, crons

- **Providers:** 6-provider fallback (`backend/providers.py`, `lib/models/registry.ts`). Run `GET /api/providers/health`. Anthropic key is currently **invalid**. The OpenRouter free model id is **hardcoded** (now `moonshotai/kimi-k2.6:free`) and not env-overridable — make the free chain configurable. Stale `CLAUDE_DEFAULT_MODEL=claude-3-5-sonnet-20241022`.
- **Crons:** `/api/cron/agents/claim-yield`, `/tick`, `/api/cron/push-feed`. `CRON_SECRET` + `INTERNAL_API_SECRET` are now set — confirm the crons actually run AND return 200 (Vercel cron logs) and produce yield/tick/feed rows. Check the economy provisioning scripts (`fix-economy-uuid-to-text.ts`, `provision-agentic-users.ts`).
- **Chat / RAG:** persona-first pipeline (`lib/agents/persona/*`); the ChromaDB ingest was 401-failing on the bad OpenAI key (now fixed) — confirm RAG actually populates and augments. Galileo observability config.
- **Newly shipped:** review the transit group chat (`app/api/internal/group-chat`, `app/(app)/gallery/group/[id]`, `lib/agents/degree-agent.ts`, `lib/agents/transit-group-session.ts`) — auth, idempotency, and the once-only auto-seed (token-cost) behavior.

## P2 — Tech debt

`next.config.mjs` sets `typescript.ignoreBuildErrors: true` — quantify the TS-error backlog + linting-campaign status. Test coverage for chat/economy/transit. MCP telemetry (`mcp_invocations`) has no in-repo admin UI consumer (by design — note it).

## Deliverable

Markdown report: topology diagram + P0/P1/P2 findings (`file:line`) + ordered remediation plan.
