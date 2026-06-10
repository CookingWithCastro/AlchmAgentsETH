# Next-Session Prompt — alchm.kitchen / WhatToEatNext: Development & Architecture Audit

> **Run this in the WhatToEatNext / alchm.kitchen repo** (the sibling culinary project — open/clone it; it is **NOT** the planetary_agents repo).
> **Deploys:** `alchm.kitchen` (Vercel — project `alchm-kitchen-pro` on **cookingwithcastro-llc**) + `whattoeatnext-production.up.railway.app` (Railway service **WhatToEatNext** in project **alchm.kitchen**, alongside its own **Postgres + PgBouncer + Redis** and crons `device-sessions-cleanup`, `daily-digest-cron`).
> **Owns:** cuisines / ingredients / recipes / user / groups / the ESMS token economy, plus an agent-sync endpoint (in FastAPI, not Next.js).

## Goal

A prioritized **architecture + code-health audit** (same shape as the PA audit): P0/P1/P2 findings with file refs, an architecture + **PA↔WTEN contract** diagram, and an integration-risk list. **First map the codebase** — you have no prior context on its internals — then audit. Read-only first; live state via Railway MCP/CLI + Vercel CLI; no prod mutations without confirmation.

## Step 1 — Map

- Identify the layers (Next.js frontend vs FastAPI/Node backend), the route inventory, and where Postgres/Redis are used.
- Map the **PA ↔ WTEN contract, both directions**: WTEN consumes PA's MCP telemetry (`/api/admin/mcp-summary` etc., gated by `INTERNAL_API_SECRET`); PA consumes WTEN's recipe catalog (`GET /api/recipes`) and culinary endpoints (PA's `lib/backend.ts` → `whattoeatnext-production.up.railway.app`).

## P0/P1 — Integration surfaces (where the two repos silently drift)

- **Transit → group-chat flow (PA side just shipped & is live):** alchm.kitchen resolves a clicked transit to `planetary-{planet}-{sign}-{degree}` IDs and `POST`s its own `/api/agents/group-chat` proxy → PA's `POST /api/internal/group-chat`. Files: `src/lib/agents/transitAgents.ts`, `src/app/api/agents/group-chat/route.ts`, `src/hooks/useTransitGroupChat.ts`, wired into `PlanetaryAspectsDisplay` + dashboard transit components. **Verify end-to-end in prod**: on `/quantities` → Active Aspects, clicking an aspect opens the PA group chat with both degree agents. Confirm the proxy sends the shared secret as `X-Sync-Secret` (== `INTERNAL_API_SECRET`, shared with PA).
- **Economy credit/debit sync:** `ALCHM_KITCHEN_SYNC_SECRET` was historically **unset**, which blocked all human credit airdrops. Verify it's set on both sides and that human transit-attunement / quest credits flow. Confirm the credit `source` whitelist includes everything PA sends (notably `group_chat_quest`).
- **Recipe catalog:** `GET /api/recipes` + `/api/recipes/[id]` is the **durable** catalog PA links to (NOT the ephemeral generate-cosmic-recipe). Confirm the recipe-500 fix and the agent-authored-recipes endpoint are deployed and healthy.
- **Cross-service URL hygiene:** `api.alchm.kitchen` does **not** resolve publicly — audit every env/config that references it; it should be the real Railway/public host. Reconcile `INTERNAL_API_SECRET` / sync-secret parity with PA.

## P1/P2 — Cross-cutting (mirror the PA audit's lenses)

- **DB topology & migrations:** WTEN's own Postgres — check schema ↔ migrations ↔ live-DB drift, pooling via its PgBouncer, and client/URL consistency. Note whether WTEN and PA share any database or are fully separate (they appear separate — confirm).
- **CI/CD & deploy:** does a merge actually ship `alchm-kitchen-pro` (auto-deploy vs manual)? Railway deploy source + watch paths. Document the deploy runbook.
- **Secrets & env hygiene:** rotation, parity of shared secrets with PA, any plaintext/embedded-token remotes, the crons (`device-sessions-cleanup`, `daily-digest-cron`) actually running + succeeding.
- **Code health:** TS/lint backlog, test coverage on the economy + recipe + agent-sync paths (these are the highest-blast-radius surfaces).

## Deliverable

Markdown report: WTEN architecture + the PA↔WTEN contract diagram, P0/P1/P2 findings (file refs), and an **integration-risk list** — every place the two repos can drift out of sync (shared secrets, the group-chat contract, the credit `source` whitelist, recipe IDs, the `api.alchm.kitchen` non-resolving host).
