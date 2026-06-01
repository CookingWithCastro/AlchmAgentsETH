# Sky Economy Go-Live Deploy Guide

This guide compiles the operational, database, and secret configurations required to successfully deploy the **Sky Economy** (Transit Attunement, Weekly Feature Rotation, and Attunement Circles) across the Planetary Agents (PA) and WhatToEatNext (WTEN) environments.

---

## 🔒 1. Secret Parity Gates

For human transit attunements and attunement circle rewards to work correctly, both apps must share matching secret values.

### `ALCHM_KITCHEN_SYNC_SECRET`

- **Location:** Set in both **PA (Vercel)** and **WTEN (Railway)** environment configurations.
- **Description:** Shared sync secret that gates `POST /api/economy/sync-credit` in WTEN.
- **Critical Failure Condition:** If this secret is unset or mismatched, all human attunement sky-drops and the weekly `group_chat_quest` reward payouts will fail with a `401 Unauthorized` error.

### `INTERNAL_API_SECRET`

- **Location:** Set in **PA (Vercel & Railway)** and **WTEN (Vercel & Railway)**.
- **Description:** Shared authorization secret that gates the agent weekly menu planning API proxies.
- **Usage:** Validates Bearer authorization (`Authorization: Bearer <INTERNAL_API_SECRET>`) when posting or getting weekly menus across the app-boundary proxies.

### `CRON_SECRET`

- **Location:** Set in **PA (Vercel)** environment configurations.
- **Description:** Verifies hourly and weekly cron triggers (e.g. `/api/cron/agents/announce-weekly-feature`).
- **Critical Failure Condition:** Without `CRON_SECRET` configured in Vercel, all automated agent cron routines will 401.

---

## 🛢️ 2. Database Connection Gates (`DIRECT_URL`)

The FastAPI Python backend on Railway requires direct database connections to Postgres (Neon) to serve RAG and live conversations correctly.

### The `DIRECT_URL` Fix

- **Location:** Set in **PA Python Backend (Railway)**.
- **Description:** Raw PostgreSQL connection string (e.g., `postgresql://...`) bypassing Prisma Accelerate.
- **Usage:** SQLAlchemy does not understand Prisma's `prisma+postgres://` scheme. The backend parses `DIRECT_URL` natively to locate the DB.
- **Critical Failure Condition:** If `DIRECT_URL` is missing or invalid on Railway:
  - If `ALLOW_SQLITE_FALLBACK=false` (default): The FastAPI server will throw a `RuntimeError` and fail to boot.
  - If `ALLOW_SQLITE_FALLBACK=true`: The server falls back to an ephemeral, local SQLite file (`planetary_agents.db`) inside the container. **Conversation history and RAG updates will be wiped on every redeploy.**

### How to Configure DIRECT_URL:

1. Retrieve the **Direct Connection URL** from your Neon Database Console or the Next.js `.env.production` under `DIRECT_URL`.
2. Add the environment variable `DIRECT_URL` in the Railway service settings for the `planetary-agents-backend` service.

---

## 📋 3. Go-Live Gates Checklist

### In WTEN (alchm.kitchen):

- [ ] Set `ALCHM_KITCHEN_SYNC_SECRET` in Railway configuration.
- [ ] Set `INTERNAL_API_SECRET` in Railway configuration.
- [ ] Merge WTEN PR whitelisting the `'group_chat_quest'` credit source (see `docs/WTEN_GROUP_CHAT_QUEST_DIRECTIVE.md`).

### In PA (planetary_agents):

- [ ] Set `ALCHM_KITCHEN_SYNC_SECRET` in Vercel and Railway environment settings.
- [ ] Set `INTERNAL_API_SECRET` in Vercel and Railway settings.
- [ ] Set `CRON_SECRET` in Vercel project environment settings.
- [ ] Set `DIRECT_URL` in the Railway backend service to repoint FastAPI from container-SQLite to Neon DB.
