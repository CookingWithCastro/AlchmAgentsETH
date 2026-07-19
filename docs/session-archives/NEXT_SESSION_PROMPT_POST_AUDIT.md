# PA — Post-audit continuation (after merging the Antigravity session)

**Where to run this:** `/Users/cookingwithcastro/Desktop/planetary_agents-main`

**Why this exists:** A full-scale audit session (2026-05-29) shipped a focused set of fixes as a PR (branch `fix/full-stack-audit-hardening` → `main`). **Simultaneously, a separate "Antigravity" session was editing the same repo** on a _disjoint_ set of files. Those Antigravity changes were left **uncommitted in the working tree** for you to merge separately. This prompt picks up **after** both are merged: it tells you what each side changed, how to verify they compose cleanly, and what audit items remain.

Read "Recommended ordering" and pick a slice — this is more than one session.

---

## 0. What landed in the audit PR (`fix/full-stack-audit-hardening`)

20 files, all verified (production build green, backend `pytest` 60 passed/1 skipped, `ruff` clean):

| Area                           | Change                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Gallery persona (critical)** | `app/api/unified-multi-agent-chat/route.ts` now `hydrateHistoricalAgents()` — rebuilds historical agents from `HISTORICAL_AGENTS` when a client sends only `{id,name,type}` (the gallery did). Without it, `generateHistoricalAgentPrompt` fell to a 5-line generic prompt sent verbatim to the backend → flat personas. |
| **Security**                   | `backend/main.py` `INTERNAL_API_SECRET` no longer has a committed literal default; **fails closed** with a per-boot random token when the env var is unset.                                                                                                                                                              |
| **Two-backend comms**          | `app/api/proxy/wten/[...path]/route.ts` no longer falls back to the PA `BACKEND_URL` (mis-routed culinary traffic); `app/api/metrics/route.ts` pings `/health` not `/api/health`; `components/temporal/temporal-client.tsx` + `components/dashboards/character-vector-dashboard.tsx` use the canonical WTEN var.         |
| **MCP**                        | `backend/alchm_mcp.py` `call_tool_json` is now the single telemetry chokepoint (covers chat-hydration **and** the MCP-server path); removed redundant manual `record_*` in `main.py`. `synthetic-mcp-probe` now prunes `mcp_invocations` each run (`MCP_INVOCATIONS_RETAIN_DAYS`, default 30).                           |
| **Docs/hygiene**               | README/AGENTS `yarn`→`bun`; dead `api.alchm.kitchen` URL fixed; broken README links fixed; agent count 50→70; two-backend env split documented in `CLAUDE.md`; false greg-castro "disabled" comment removed; `ruff --fix` (13 lint fixes).                                                                               |

---

## ⚠️ 1. Deploy-time actions that the audit PR REQUIRES (do FIRST)

### 1A. Set + rotate `INTERNAL_API_SECRET` on the PA Railway backend — NOW REQUIRED

The fail-closed change means: **if `INTERNAL_API_SECRET` (or `PA_INTERNAL_API_SECRET`) is not set on Railway, every internal/admin endpoint will reject all requests** (`/api/admin/mcp-summary`, `/api/admin/alchm-mcp-errors`, `/api/rag/agents/{id}` cache-bust, `/api/internal/agent-sync`). The old committed literal `882133EA-…` is in git history — **rotate it**:

```bash
railway variables --set "INTERNAL_API_SECRET=<fresh-uuid>" --service "planetary agents"
# match it on the WTEN side if WTEN's admin proxy ships PA_INTERNAL_API_SECRET
```

Verify after restart: `GET /api/admin/mcp-summary` with the new secret returns 200 (not 401), and the startup log does NOT print `WARNING: INTERNAL_API_SECRET is not set`.

### 1B. Confirm `NEXT_PUBLIC_WTEN_BACKEND_URL` on Vercel (optional but recommended)

The code defaults correctly to `https://whattoeatnext-production.up.railway.app` when unset, so prod works — but set it explicitly on Vercel to make WTEN routing overridable and avoid relying on a code default (recall the prior "Vercel had zero env vars" incident).

### 1C. Rotate the GitLab PAT embedded in the `origin` remote URL

`git remote -v` shows the GitLab `origin` URL with a plaintext `glpat-…` token. That token is in `.git/config` (local, not committed) and was printed to a session log. **Rotate it** in GitLab → Settings → Access Tokens, then re-set the remote with the new token (or use a credential helper).

---

## 2. Merge & verify the Antigravity session changes

The Antigravity session edited ~40 files + added 2 untracked scripts, on a **disjoint** set from the audit PR (which is why the combined tree built green). What it changed:

- **18 historical agents' natal charts filled** — `lib/agents/historical/{alexander-the-great, archimedes, aristotle, cicero, donatello, emily-dickinson, fyodor-dostoevsky, herodotus, homer, jane-austen, julius-caesar, lewis-carroll, machiavelli, michelangelo, oscar-wilde, petrarch, plato, raphael}.ts` — empty `planets: {}` replaced with real positions (addresses the audit's "stub agents → identical Sacred-7 / flat voice" finding). Driven by new untracked **`scripts/fill-historical-natal-charts.ts`**.
- **Test-harness rot fixed** — `preact` added to `package.json`/`bun.lock` (fixes the missing `next-auth/node_modules/preact/dist` that killed 4 chat-system suites at import); ~14 `test/*` files + `test/setup.ts` rewritten; new untracked **`test/chat-system/stream-helper.ts`**.
- **`app/api/consciousness/{batch,live}/route.ts`** — GET handlers added.

### Verification after merging Antigravity

1. **Re-run the full frontend suite** (it was 53/281 red at audit time purely from harness rot):
   ```bash
   bunx vitest run test/ --config vitest.unit.config.ts 2>&1 | tail -40
   ```
   Expectation: dramatically fewer failures now that `preact` is installed and tests were rewritten. **Triage whatever still fails** — distinguish remaining harness issues from real assertion drift (`admin-api-auth`, `monica-agent-route` expected old response shapes).
2. **Build + backend tests:** `bun run build` (must stay green) and `backend/venv/bin/python -m pytest -q` (was 60 passed/1 skipped).
3. **Confirm no collision with the audit PR** — `git status` should show a clean tree; the two change-sets touched different files, so there should be no merge conflict, but verify `lib/agents/historical/index.ts` (audit touched the greg-castro comment) wasn't clobbered.
4. **Persona differentiation** — now that natal charts are filled, run the smoke test and confirm the previously-identical stub agents diverge:
   ```bash
   bun run scripts/smoke-test-persona.ts
   ```
5. Decide whether `scripts/fill-historical-natal-charts.ts` should be **committed and rerunnable** (a documented data tool) or was a one-shot — and whether the remaining ~50 agents need the same treatment.

---

## 3. Live validation of the audit fixes (needs prod or a full local stack)

- **Gallery persona** — open `/gallery/chat/<historical-id>` against the deployed PA backend; the agent should speak in-voice, not generically. To confirm the hydration path server-side, temporarily log `systemPromptOverride.length` in `unified-multi-agent-chat/route.ts` — it should be hundreds of lines, not ~5.
- **Metrics** — `GET /api/metrics` `backend.status` should now read `healthy` (was permanently `offline` from the `/api/health` 404).
- **WTEN proxy** — hit a culinary path through `/api/proxy/wten/...` in dev (with `BACKEND_URL=localhost:8000` set) and confirm it reaches WTEN, not the local PA backend.
- **MCP telemetry** — after a synthetic probe fires, `GET /api/admin/mcp-summary` should show a `pruned` count in results and (if Antigravity/desktop drives alchm tools) alchm errors now appear in `/api/admin/alchm-mcp-errors` from the MCP-server path too.

---

## 4. Remaining audit findings (deliberately deferred — pick up here)

| Item                                              | Where                                                                                                                             | Decision needed                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Empty/silent catch blocks (~11)**               | `lib/monica/fetch-current-positions.ts` (×2), `lib/alchemizer.ts`, `lib/auth.ts`, `components/admin/FloatingAdminPanel.tsx`, etc. | Add `console.warn` for observability or confirm each is intentional. Low risk, improves debuggability.                                                                       |
| **Silent mock data**                              | `lib/personalized-ai/dual-chart.ts:84` (`generateMockHoroscopeData`), `lib/rag/rag-generator.ts` fallback                         | Either wire the real source or surface "mock/degraded" to the user instead of silently substituting.                                                                         |
| **Desktop React panel is scaffolding**            | `desktop-shell/src/components/settings/McpStatusPanel.tsx`, `hooks/useLocalMcp.ts`                                                | They typecheck but aren't mounted (shell is vanilla TS). Either finish the React migration (`@vitejs/plugin-react` + mount) or mark clearly as future-work.                  |
| **Sidecar binaries: macOS-arm64 only**            | `scripts/build-sidecar.sh`, `src-tauri/bin/`                                                                                      | Only `pa-mcp` has an x86_64 build; orchestrator/alchm-mcp/llama-server are arm64-only; no Windows/Linux. Add CI runners per platform or document Apple-Silicon-only support. |
| **MCP telemetry has no in-repo UI consumer**      | `/api/admin/mcp-summary                                                                                                           | mcp-status                                                                                                                                                                   | alchm-mcp-errors` | Fully built on the backend, consumed only by WTEN's external panel. Add a small admin tile or document the cross-repo dependency. |
| **`getHistoricalAgent` matches by exact id only** | `lib/agents/historical/index.ts:239`                                                                                              | greg-castro's id is `greg-castro-1991`; a `/gallery/chat/greg-castro` link would miss. Consider a slug-tolerant lookup (with care to avoid false matches).                   |

---

## 5. Older still-open items (from `NEXT_SESSION_PROMPT_PA_COMPLETION.md`)

That prompt's Sections A–F mostly landed (see git log), but **Section A (prod ops) may still bite**:

- **A1/A2 — Anthropic + OpenAI API keys rejected (401) on the PA Railway backend.** Per memory, only the free chain (Groq→Cerebras→Gemini→OpenRouter) works. Fine while default tier is `free`, but `cheap_fast`/`primary`/`reflective` silently degrade to Llama, and RAG ingest fails at startup (no embeddings). **Rotate both keys** if you want paid tiers / RAG augmentation back. Verify: startup log loses `[startup] RAG ingest error`, and a `cheap_fast` chat returns `provider: anthropic`.
- Archive completed `NEXT_SESSION_PROMPT_*.md` (this file + the PA_COMPLETION one once its Section A is closed) into `docs/session-archives/`.

---

## Recommended ordering

1. **§1 deploy actions** (secret rotation — required by the merged PR) — 15 min, do first.
2. **§2 merge + verify Antigravity** — confirm the combined tree is green and personas differentiate.
3. **§3 live validation** of the audit fixes — confirm gallery voice, metrics, WTEN proxy.
4. **§5 A1/A2 key rotation** — restores paid tiers + RAG.
5. **§4 deferred items** — pick off opportunistically.

## Cold-start context (endpoint registry)

- `agents.alchm.kitchen` — PA Next.js frontend (Vercel)
- `api.agents.alchm.kitchen` — PA FastAPI backend (Railway). Serves `/api/chat`, `/api/agents*`, `/api/moment-recommendations`, RAG, MCP, `/health`.
- `whattoeatnext-production.up.railway.app` — WTEN backend (culinary/user/groups). **No `/api/chat`.**
- ⚠️ `api.alchm.kitchen` does **not** resolve — never use it as a backend URL.
- `lib/backend.ts` splits: `agentRequest`→`NEXT_PUBLIC_BACKEND_URL` (PA); `request`→`NEXT_PUBLIC_WTEN_BACKEND_URL` (WTEN).

_Drafted 2026-05-29 by the full-scale-audit session. The audit fixes are in PR `fix/full-stack-audit-hardening`; the Antigravity session's data/test work is uncommitted in the working tree for separate merge._
