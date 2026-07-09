# Making `AlchmAgentsETH` canonical (move `agents.alchm.kitchen` here)

## Why this is needed

The live domain **`agents.alchm.kitchen`** is served by a _different_ Vercel project
(`planetary_agents-main`, from the repo `gregcastro23/alchm-agents-app`), NOT by this
repo's project (`alchm-agents-eth`). The two repos share **no git history**. Decision:
make **this repo** (`AlchmAgentsETH` → `alchm-agents-eth`) canonical and move the domain
here. See the `repo-and-vercel-topology` memory.

## The good news: it's ~2 required vars, not 41

`alchm-agents-eth` is missing 41 env vars the live project has, but most are optional:

### REQUIRED (app is broken without these) — only you can supply (write-only on Vercel)

- `DATABASE_URL` — Prisma/Neon connection (the PRODUCTION db, so data is shared)
- `DIRECT_URL` — direct Postgres connection (migrations / non-pooled queries)

### RECOMMENDED (turn on features/security you want live)

- `INTERNAL_API_SECRET` — backend auth + admin + **agent wallet transfers**
- `CRON_SECRET` — if Vercel cron is configured (scrabble/agents ticks, weekly feature, yield)
- `ANTHROPIC_API_KEY` — Anthropic chat tiers (free tier already works via Groq without it)
- `WHATTOEATNEXT_API_KEY`, `WHATTOEATNEXT_BASE_URL` — cross-app WTEN economy
- `GALILEO_API_KEY`, `GALILEO_PROJECT`, `GALILEO_LOG_STREAM` — observability

### OPTIONAL (code defaults / flags / not used in this repo)

Backend URLs (`BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_*_BACKEND`) default to
`api.agents.alchm.kitchen`. Model config (`*_DEFAULT_MODEL`, `MONICA_*`, `DEFAULT_AI_PROVIDER`)
falls back to `lib/models/registry.ts`. Flags (`MOCK_LLM`, `LOG_LEVEL`, `*_ENABLED`, …) are
off-safe. Not used here: `AUTH_URL`/`AUTH_TRUST_HOST` (Auth.js v5 — this repo is NextAuth v4),
`NEXT_PUBLIC_PRIVY_APP_ID`/`NEXT_PUBLIC_BASE_URL` (Privy — this repo uses Dynamic), `JWT_SECRET`
(no consumers), `AI_GATEWAY_*`, `CLOUDFLARE_*`.

Already present on `alchm-agents-eth`: `AUTH_SECRET` (so `NEXTAUTH_SECRET` isn't needed —
the code reads `AUTH_SECRET || NEXTAUTH_SECRET`), all the Arc/NameStone/Circle/Dynamic/Stripe/
provider keys, and the new Google auth + CDP scaffolding.

## Execution order (verify BEFORE cutover)

1. **You supply** the production `DATABASE_URL` + `DIRECT_URL` (from Neon or the live Vercel
   project) + any RECOMMENDED secrets — either paste them to me or set them in the Vercel
   dashboard for `alchm-agents-eth` (Production).
2. **Set + redeploy** `alchm-agents-eth`, then verify the app actually works with data at
   `https://alchm-agents-eth.vercel.app` (chat, balances, agent list hit the DB).
3. **Run the `agent_wallets` migration** against that DB (`bunx prisma migrate deploy`).
4. **Move the domain**: reassign `agents.alchm.kitchen` from `planetary_agents-main` →
   `alchm-agents-eth` (Vercel dashboard → project Domains, or CLI). It auto-points at the
   latest production deployment.
5. **Verify** `agents.alchm.kitchen` serves the new homepage + login + data. Rollback =
   reassign the domain back to `planetary_agents-main`.

## Feature port (separate, after the domain move)

The live repo has features this one lacks (Tauri desktop shell, SpacetimeDB, Privy wallet
flow, extra backend). Port them selectively, module by module, after the domain cutover is
stable. Not a git merge (no common ancestor).

## The one thing blocking step 1

The production `DATABASE_URL`/`DIRECT_URL` are **write-only on Vercel** (can't be read via
`vercel env pull`) and the local `.env` files diverge (two different DB URLs) — so only you
can confirm the correct production values. Provide them and I'll run steps 2–5.
