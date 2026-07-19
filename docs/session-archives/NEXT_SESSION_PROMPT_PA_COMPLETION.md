# PA — Complete web app + desktop app, harden all backend & MCP communications

**Where to run this:** `/Users/cookingwithcastro/Desktop/planetary_agents-main`
**Why this exists:** With [`/api/admin/mcp-summary`](https://github.com/gregcastro23/alchm-agents-app/pull/4) shipped and live, the cross-server admin panel work is unblocked. This session closes the remaining substantive gaps: 4 stub API routes, MCP sidecar packaging, an unsurfaced production ops issue (broken provider API keys), and a handful of half-wired features that have been deferred across the last few PRs.

This is **bigger than one session can cleanly finish.** Read the "Recommended ordering" section and pick a slice — don't try to do everything at once.

---

## ⚠️ Section A — Production ops issues (do FIRST, surface before anything else)

These are live in prod RIGHT NOW and degrading chat quality. I found them while verifying the recent MCP deploy.

### A1. OpenAI API key is rejected by OpenAI

Railway prod logs show on every container start:

```
[startup] RAG ingest error: Error code: 401 - {'error': {'message': 'Incorrect API key provided: sk-uK4In***...-ZgA. ... 'code': 'invalid_api_key'}}
```

The current `OPENAI_API_KEY` on the `passionate-vibrancy/planetary agents` Railway service has 95 chars and starts with `sk-uK4...`. OpenAI is rejecting it as malformed/revoked.

**Impact:**

- ChromaDB RAG ingestion fails completely at startup → chat responses run **without** retrieved reference material, falling back to persona-only context. The persona is canonical and chat still works, but it's missing the augmentation we built the whole RAG pipeline for.
- The last-ditch OpenAI fallback in the provider chain (`gpt-4o-mini`) will also fail when reached.

**Fix:** rotate the key. Either generate a fresh one at https://platform.openai.com/api-keys and set it via:

```bash
railway variable set "OPENAI_API_KEY=sk-..." --service "planetary agents" --skip-deploys
# then trigger a redeploy from the dashboard or `railway up` from backend/
```

Verify by tailing logs after restart — the `[startup] RAG ingest error` should disappear and you should see `[ingest] Storing N chunks for K agents...` succeed.

### A2. Anthropic API key is rejected by Anthropic

Same logs show, on every chat request:

```
fallback_event provider=anthropic reason=error next=groq error=Error code: 401 - {'type': 'error', 'error': {'type': 'authentication_error', 'message': 'invalid x-api-key'}}
```

`ANTHROPIC_API_KEY` is 108 chars, starts `sk-ant...` — looks correctly formatted but Anthropic is rejecting it. So **every** chat that requests a tier above `free` falls through Anthropic → Groq immediately.

**Impact:** invisible because the Groq fallback is working — but you're paying nothing to Anthropic AND getting Llama 3.3 70B responses on requests you intended to be Claude. Quality degraded across all `cheap_fast` / `primary` / `reflective` tier chats.

**Fix:** rotate. Same shape as A1.

### A3. Anthropic-paid mode also emits `alert_event reason=paid_fallback`

Per `CLAUDE.md`, the fallback chain ends at paid OpenAI as a last-ditch. With Anthropic broken AND OpenAI broken, the chain is currently:

```
Anthropic (broken) → Groq → Cerebras → Gemini → OpenRouter → OpenAI (broken)
```

The free chain still works (Groq/Cerebras/Gemini/OpenRouter all valid keys), so chats succeed. But there's no safety net. Fix A1 + A2 before doing anything else with confidence.

### A4. Verify `/api/admin/mcp-summary` is actually populating

The endpoint went live 2026-05-27 at 21:48 UTC against a freshly-created `mcp_invocations` table (zero rows). It should be populating now from:

1. **Synthetic probes** — `POST /api/cron/synthetic-mcp-probe` is supposed to fire every 30min via a cron caller. Check that this cron is actually configured somewhere (Railway cron? external scheduler? grep `PA_CRON_SECRET` and `synthetic-mcp-probe` to find where it's invoked).
2. **Real MCP traffic** — the PA MCP server in `backend/planetary_agents_mcp_server.py` records every invocation via `mcp_invocation_log.record_invocation()`. Any chat through that path should write a row.

After the OpenAI/Anthropic fixes, hit `/api/admin/mcp-summary?windowMinutes=60` with the secret and confirm `verdict` flips from `UNKNOWN` to `OK` and rows appear in `byTool` / `byCaller`. If it stays `UNKNOWN` after 2 hours of expected traffic, the telemetry write path is broken silently somewhere.

---

## Section B — Web app: wire up the four 501-stub API routes

These are scattered across `app/api/` and return 501 / "not implemented" with stub comments. Each maps to a Python backend handler that either doesn't exist yet or isn't wired in.

| Route                                                  | Stub status                                                                  | Action                                                                                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/api/monica-agent/train-alchemical/route.ts:1-101` | Returns `MONICA_TRAINING_UNAVAILABLE`                                        | Implement the backend handler in `backend/main.py` (alchemical Monica training). Migrate the local logic that's already in `lib/monica/alchemical-trainer.ts` to Python, or proxy through. Decide which side owns the training loop. |
| `app/api/agents/unified/route.ts:112-125`              | Actions `update`, `delete`, `stats`, `dashboard`, `search`, `evolve` all 501 | These are the unified-agent CRUD/analytics surface. Add equivalent endpoints to `backend/main.py` using `crud.py` patterns. `evolve` likely interacts with `agent_consciousness` table — coordinate with the schema.                 |
| `app/api/planetary-sync/route.ts:212-229`              | `PUT /update-config` 501                                                     | Whatever config object this is meant to mutate, it doesn't have a Prisma model yet. Decide: do we need persisted config (add a model + migration) or is this transient runtime state (use the existing `crud.py` patterns)?          |
| `app/api/rag/cache/route.ts:76-89`                     | `POST` agent-specific cache invalidation 501                                 | Add a backend handler that calls `chromadb.delete(where={"agent_id": ...})` on the historical-agents collection. Don't make it user-callable — gate with `X-Internal-Secret` like the other admin endpoints.                         |

**For each route:**

1. Read the existing handler stub to see what params/shape it expects
2. Implement the corresponding `backend/main.py` endpoint
3. Replace the 501 with a `proxyToBackend()` call (look at how the chat endpoint at `app/api/agents/unified/route.ts:chat` does it)
4. Add a vitest case that hits the Next route with a mocked Railway fetch

---

## Section C — Web app: half-wired features (delete the "wire up later" tech debt)

Found via TODO scan. None are blockers, all are loose threads that confuse the next reader.

### C1. Elemental data threading

Three files reference "backend doesn't expose elemental decomposition yet" and use stand-ins:

- `components/temporal/temporal-client.tsx:381` — "Revisit elemental decomposition once backend exposes it"
- `components/charts/aspect-phase-indicator.tsx:116` — "Augment with elemental data when backend resumes emitting alchm samples"
- `lib/agents/router.ts:23` — "Backend doesn't yet return elemental totals; map alchemical scores as stand-in"

**Decision needed:** does the backend expose elemental decomposition or not? Check `backend/main.py` for any `elemental` endpoint or look at the alchm-kitchen sibling for the schema. Then either:

- (a) Add the endpoint on PA backend, return the data, delete the stand-in code
- (b) Decide the stand-in IS the long-term answer, delete the TODOs

Don't leave it ambiguous.

### C2. Premium tier gating

`app/api/desktop/claim-yield/route.ts:40` — `isPremium` hardcoded `false` with a comment "derive from user tier when premium gating ships".

Check what `users.role` / `user_subscriptions.tier` values currently exist in prod (you can query via the Railway DIRECT_URL). If the data exists, write the derivation now. If not, delete the comment and document that premium gating is intentionally deferred.

### C3. Feed cooldown persistence

`app/api/feed/cast/route.ts:81` — "Track permanent cooldown state via `agent_consciousness.cooldownUntil` column".

Either add the column via a new Prisma migration (you've already done this dance in this branch) and wire it up, or remove the TODO and document the in-memory approach as the chosen design.

### C4. Achievement history

`lib/personalized-ai/training-orchestration.ts:301` — returns empty array with TODO to "track and retrieve previous achievements".

Likely needs a small Prisma model — `Achievement { id, userId, kind, awardedAt }` or similar. Could also be JSON-blobbed onto an existing user row if achievements are non-critical. Make a call.

### C5. Monica batch API planetary hour

`lib/monica/alchemical-trainer.ts:304` — "Batch API doesn't include planetary hour yet".

Look at the batch shape, see what other batches do, add `planetaryHour` to the response. Should be a few lines.

---

## Section D — Desktop app: finish the MCP sidecar pass

`NEXT_SESSION_PROMPT_DESKTOP_MCP.md` defined a six-item plan. Several items landed in the 2026-05-26 commits but there are concrete remaining gaps. Don't redo what's done — pick up here:

### D1. `pa-mcp` sidecar is a bash wrapper, not a binary

`src-tauri/bin/pa-mcp-aarch64-apple-darwin` is **282 bytes** — it's a shell script that calls `python3 backend/planetary_agents_mcp_server.py`. This works on the dev machine but **breaks the moment a user installs the .dmg** because the user won't have the backend Python environment.

**Fix:** package the PA MCP server with PyInstaller (or `briefcase`, or `shiv`) into a self-contained executable. Bundle the venv requirements. Replace both `aarch64` and `x86_64` wrappers with real binaries.

Acceptance: `file src-tauri/bin/pa-mcp-aarch64-apple-darwin` reports `Mach-O 64-bit executable`, and running it spawns a working JSON-RPC stdio server with no system Python required.

### D2. Cross-platform sidecar coverage

`scripts/build-sidecar.sh` only builds for `aarch64-apple-darwin`. Two of the four sidecars (`llama-server`, `pa-mcp`) aren't even in the build script.

**Target matrix:** `aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-pc-windows-msvc`, `x86_64-unknown-linux-gnu`. That's 4 platforms × 4 sidecars = 16 binaries. Realistic scope: get the Mac universal binary working (both archs lipo'd into one) AND at minimum a Windows build. Linux can be deferred.

### D3. `useLocalMcp()` React hook

The DESKTOP_MCP plan called for `desktop-shell/src/hooks/useLocalMcp.ts`. What exists today is `desktop-shell/src/localMcpClient.ts` — a generic JSON-RPC client, but no React hook. The renderer code in `desktop-shell/src/main.ts` calls `client.call(method, params)` directly, which works for vanilla TS but is awkward to consume from any React components that get added.

Add the hook; thin wrapper around the existing client; provide `useLocalMcp()` returning `{ call, status, lastError }` with `useSyncExternalStore` semantics.

### D4. MCP Status Panel

DESKTOP_MCP item 5 — "MCP Node Health" panel. Doesn't exist. Should show:

- Per-sidecar status (`online` / `offline` / `crashed`)
- Last call timestamp and latency
- Swiss Ephemeris loading status (orchestrator sidecar)
- A "Test" button per sidecar that calls a known-cheap tool and shows the result

Build it in `desktop-shell/src/components/settings/McpStatusPanel.tsx`. Wire to the existing sidecar-status callbacks in `main.ts:4670-4691`.

### D5. Surface sidecar stderr to UI

Right now `localMcpClient.ts` logs sidecar stderr to console only. A user with a broken sidecar sees no UI signal — just "offline" with no explanation. Pipe stderr into the McpStatusPanel as a collapsible "Diagnostics" section.

### D6. Distinguish "offline mode" from "sidecar mode"

`main.ts:5101` has a `toggle-offline-mode` action but it only toggles MCP sidecar usage, not network connectivity. A user expecting "I'm on a plane, work offline" gets a different behavior than "force local MCP for speed."

Pick a model:

- (a) Two separate toggles ("Use local MCP" + "Disable network") — most explicit
- (b) One toggle that does both — simpler
- (c) Auto-detect network availability — most magical

Then implement it consistently across the chat flow, sidecar status display, and any "online action required" prompts.

### D7. Retry / backoff in `localMcpClient.ts`

A single transient failure currently surfaces as "sidecar crashed". Add 2 retries with 250ms exponential backoff before declaring the sidecar dead. Also add a 30s "reconnect attempt" cycle when status is `offline`.

### D8. Code-signing + notarization documentation

`scripts/package-tauri-macos.sh` references `$ALCHM_MACOS_SIGNING_IDENTITY` and `$ALCHM_NOTARY_PROFILE` env vars but they're undocumented. Add a `docs/desktop-release.md` (or extend `CLAUDE.md`) that documents:

- How to obtain a Developer ID Application cert
- How to set up the notary profile via `xcrun notarytool store-credentials`
- The exact env-var values
- How to run the full signing + notarization pipeline locally

Without this, only you can release new builds.

---

## Section E — MCP operations hardening

These tighten the cross-server MCP picture now that the new aggregator endpoint is live.

### E1. Synthetic probe cron isn't actually scheduled

`POST /api/cron/synthetic-mcp-probe` exists and works (you can hit it manually with `PA_CRON_SECRET`), but nothing is configured to invoke it on a schedule. The session prompt that defined it assumed a 30-min cron; check whether that's:

- A Railway cron job (look at the service config; nothing was set up when I checked)
- An external scheduler (Vercel cron from the frontend? Cloudflare Workers cron? GitHub Actions schedule?)
- Just expected to be called manually for debugging

**Recommended:** add a Railway cron job (the service's `meta` blob shows `cronSchedule` is available) firing every 30min. Then `/api/admin/mcp-summary`'s `syntheticProbe` field will start showing live verdicts instead of `UNKNOWN`.

### E2. Cross-DB reconciliation between PA and WTEN

Documented in `NEXT_SESSION_PROMPT_PA_MCP_INSTRUMENTATION.md` as deferred. The state today: WTEN's `mcp_invocations` records WTEN-side dispatches (`caller='pa-mcp'` when WTEN's UI invokes PA's MCP); PA's `mcp_invocations` records PA-side dispatches. The two never cross-fill, so the cross-server admin panel sees half-pictures.

**Fix:** a periodic batch job (cron, 5min) that pulls each side's recent rows and mirrors the relevant ones to the other. Or: a unified telemetry stream (Galileo? OTel collector?) that both sides emit to and the admin panels query.

Don't pick a heavy approach if you can avoid it — the simplest thing that works is to query both DBs from the WTEN admin proxy and union the results client-side.

### E3. Silent error suppression in `alchm_mcp.py`

`backend/alchm_mcp.py` lines 151-153, 203-205, 276-284 catch exceptions and silently return empty / `None`. That was the right call when the goal was "don't break chats if Alchm MCP is down" — but it's currently invisible at the admin panel level.

**Fix:** route those silent catches through a telemetry counter (Prometheus? Or just an in-memory ring buffer surfaced via a new `/api/admin/alchm-mcp-errors` endpoint). The admin panel's "PA MCP" status should turn yellow when these fail at >1%/min even if individual chats succeed.

### E4. Tier-gating telemetry

`backend/mcp_invocation_log.py:validate_and_gate_invocation` downgrades anonymous/standard tier requests silently. There's no metric for "how often did we downgrade" — useful for understanding whether the tier limits are well-calibrated.

Add a `tierDowngradeCount` field to the `/api/admin/mcp-summary` response (per-tier breakdown), populated from the `arguments._meta` blob in `mcp_invocations`.

---

## Section F — Hygiene (worth doing while you're here)

### F1. Gitignore `chroma_db/chroma.sqlite3`

The file is currently tracked (188KB) but it gets touched every time anyone imports `main` (RAG ingest writes to it). My session ended with it dirty multiple times. Add `chroma_db/` to `.gitignore` and `git rm --cached chroma_db/chroma.sqlite3`.

### F2. Stash stack cleanup

`git stash list` shows 6+ stashes including "codex preserve unrelated dirty files after MCP merge" and "wip desktop app before live download button". Audit and either pop+merge or drop.

### F3. Debug console.log statements in `desktop-shell/src/main.ts`

Lines 5140, 5161 are explicit debug `console.log` calls in MCP test handlers. Wrap in a `DEBUG_MCP` env-var check or delete.

### F4. Archive completed NEXT*SESSION_PROMPT*\*.md files

After Section A–E land, three of the existing prompts are fully complete:

- `NEXT_SESSION_PROMPT_ADMIN_MCP_SUMMARY.md` — already delivered
- `NEXT_SESSION_PROMPT_DESKTOP_MCP.md` — closed by Section D
- `NEXT_SESSION_PROMPT_WTEN_MCP_ADMIN_PANEL.md` — moves to the WTEN side once their session runs

Create a `docs/session-archives/` directory and move them in.

---

## Recommended ordering (pick a slice)

The full scope is 6+ session-days. If you only have a few hours, do these in order and stop where you stop:

1. **Section A (ops)** — 20 minutes, immediate prod impact, low risk. ALWAYS DO FIRST.
2. **Section E1 (cron)** — 15 minutes; makes the admin panel actually informative.
3. **Section B (4 stub routes)** — 2-3 hours; pick whichever routes are blocking the frontend most.
4. **Section D1 + D2 (pa-mcp binary + cross-platform)** — half-day; unblocks real desktop installs.
5. **Section C (loose threads)** — pick off opportunistically, 30min each.
6. **Section D3-D7 (desktop polish)** — full session.
7. **Section E2-E4 (cross-server telemetry)** — depends on WTEN-side admin panel landing first.
8. **Section F (hygiene)** — file as you go, don't batch.

---

## Verification per section

| Section | "Done" looks like                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A       | `[startup] RAG ingest error` no longer in logs; `/api/admin/mcp-summary` flips to `OK` with synthetic probe data within 30min of cron landing |
| B       | All four routes return 200 with realistic payloads against a `bun dev` + `uvicorn` local stack; vitest cases pass                             |
| C       | `grep -rn "TODO\|FIXME" components/ lib/ app/` returns substantively shorter list                                                             |
| D1      | `file src-tauri/bin/pa-mcp-*` reports `Mach-O 64-bit executable`, fresh `.dmg` install works on a machine with no Python                      |
| D2      | `scripts/build-sidecar.sh` exits 0 building all 4 sidecars × 2 platforms minimum                                                              |
| D3-D7   | `bun run dev:tauri` opens the app, MCP status panel renders with live data, manually killing the sidecar shows a stderr panel + auto-retry    |
| E1      | `/api/admin/mcp-summary` `syntheticProbe.verdict` is no longer `UNKNOWN` 1h after deploy                                                      |
| E2      | WTEN admin panel sees PA rows; PA admin sees WTEN rows; numbers agree within ±5%                                                              |
| E3      | A forced Alchm MCP outage turns the WTEN admin panel "PA MCP" row yellow within 1 minute                                                      |
| F       | `git status` is clean; `chroma_db/` is gitignored; stash stack is < 2 entries                                                                 |

---

## Cold-start context

- **Endpoint registry** (per `CLAUDE.md`):
  - `agents.alchm.kitchen` — PA Next.js frontend (Vercel)
  - `api.agents.alchm.kitchen` — PA FastAPI backend (Railway `passionate-vibrancy` / `planetary agents` service)
  - `alchm.kitchen` — WTEN Next.js frontend
  - `whattoeatnext-production.up.railway.app` — WTEN backend
- **Two MCP servers, two roles:**
  - `backend/alchm_mcp.py` is the _client_ — PA's FastAPI calls WTEN's MCP for sky transits + recipes
  - `backend/planetary_agents_mcp_server.py` is the _server_ — exposes PA's persona chat to external MCP clients (Claude Desktop, Cursor, the Tauri sidecar)
- **The `mcp_invocations` table** was JUST created on 2026-05-27 (migration was missing from the original instrumentation PR). Expect very few rows for the first few hours of any session — both because the table is fresh and because the synthetic probe cron (E1) isn't actually scheduled yet.
- **Free chain order** (when paid providers fail): Groq → Cerebras → Gemini → OpenRouter → OpenAI. With OpenAI broken (A1) the chain has no last-ditch; with Anthropic broken (A2) the chain _always_ starts at Groq.
- **The `feat/admin-mcp-summary` branch is merged.** Latest `main` HEAD is `683e9d46 chore(deps): bump next 15.2.6 → 15.2.9 (CVE patch)`. Both `github/main` and `origin/main` (GitLab) are up to date.

---

_Drafted 2026-05-27 by the session that shipped [alchm-agents-app#4](https://github.com/gregcastro23/alchm-agents-app/pull/4). The endpoint is live, prod is degraded by broken provider keys, the desktop sidecar is a bash wrapper masquerading as a binary, and four routes still 501. This prompt is the punch list._
