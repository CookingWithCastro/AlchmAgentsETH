# Fix Prompt — Make the PA local MCP (desktop) fully operational

**Goal:** In the Tauri desktop app (`Alchm`), the "Use Local MCP" path must route agent chat (and astrology/recipes) through the bundled **`pa-mcp`** + **`alchm-mcp`** sidecars and return real model responses. Today the `pa-mcp` chat tool call fails and the app **silently hides the failure** behind a local canned reply. Find the real cause, fix it, **remove the band-aid**, and verify end-to-end.

---

## Architecture (already verified — start here, don't re-discover)

Desktop app is **Tauri** at repo root **`src-tauri/`**; the renderer/front-end is **`desktop-shell/src/`** (TypeScript, not React-router). Two local MCP sidecars are spawned over **stdio JSON-RPC**:

- **`bin/pa-mcp`** — a **PyInstaller** build of `backend/planetary_agents_mcp_server.py` (hand-rolled stdio JSON-RPC; tools incl. `chat_with_planetary_agent`, `synthesize_culinary_debate`, `trigger_chart_specific_jing_duel`, `plan_weekly_menu`, `get_agent_feed_discussion`).
- **`bin/alchm-mcp`** — a Bun-compiled WTEN data server (`get_live_sky_transits`, `alchemize_ingredients`, `generate_cosmic_recipe`, …). The PA server also calls it internally via `backend/alchm_mcp.py`.

Plumbing that is **already correct** (do NOT chase these):

- `src-tauri/tauri.conf.json` `bundle.externalBin` lists `bin/alchm-mcp` + `bin/pa-mcp`.
- `src-tauri/capabilities/default.json` grants `shell:allow-spawn` **and** `shell:allow-execute` for `bin/pa-mcp` / `pa-mcp` (+ alchm) with `sidecar:true,args:true`.
- The aarch64 binary `src-tauri/bin/pa-mcp-aarch64-apple-darwin` exists and is fresh (Jun 4). Binaries are **gitignored** (`src-tauri/bin/README.md`) and built by `scripts/build-sidecar.sh` → `backend/pa-mcp.spec` → moved to `src-tauri/bin/<name>-<triple>`. Build is wired into root `package.json` `beforeBuildCommand`.
- Client `desktop-shell/src/localMcpClient.ts` spawns the sidecar, does the MCP `initialize` handshake, retries/reconnects. Commit `ae6f658a` already fixed an event-listener spawn race + corrected the sidecar name to `bin/pa-mcp`, so **spawn + initialize now work** (status reaches `online`).

The MCP path is taken **only when the "Use Local MCP" toggle (`state.localOfflineMode`) is ON** (`desktop-shell/src/main.ts:1070`); with it off, chat hits cloud `agents.alchm.kitchen` (keep that path working, untouched).

---

## ✅ Root cause — CONFIRMED by direct sidecar diagnostic (2026-06-05)

Driving the built `pa-mcp` binary directly (commands below) proved it:

- **Default env** → `chat_with_planetary_agent` returns `isError:true`:
  `{"error":"chat_with_planetary_agent failed","message":"All connection attempts failed","backendUrl":"http://localhost:8000"}`
- **With `PLANETARY_AGENTS_BACKEND_URL=https://api.agents.alchm.kitchen`** → a **real reply** (Socrates; Groq `llama-3.3-70b-versatile`; `tier:free`; `rag_used:true`; no `isError`). The `dev-desktop-token` apiKey was **accepted** → desktop free-tier **auth is fine (ruled out)**. `initialize` succeeded both runs → the `2024-11-05` vs `2025-06-18` protocol-version difference is **benign (ruled out)**.

**So the one fix that makes chat work: give the sidecar a reachable backend URL.** A second, independent issue remains (live-sky transits) — see "Secondary issue" below.

## The mechanism (why the URL is wrong)

The `pa-mcp` sidecar is spawned from the **front-end** via `Command.sidecar('bin/pa-mcp')` in `localMcpClient.ts` with **no env and no args**. The **Rust side injects env vars only into the `orchestrator` sidecar** (`src-tauri/src/main.rs:475–501` sets `IPC_NONCE`, `APP_DATA_DIR`, `DATABASE_URL`, `TAURI_DEEP_LINK_SECRET`) — **`pa-mcp` / `alchm-mcp` get nothing**.

So the bundled `pa-mcp` uses its **baked default** backend URL:

```python
# backend/planetary_agents_mcp_server.py:18-21
BACKEND_URL = os.getenv("PLANETARY_AGENTS_BACKEND_URL") or os.getenv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("PLANETARY_AGENTS_FRONTEND_URL", "http://localhost:3000")
```

`chat_with_planetary_agent` **POSTs to `BACKEND_URL/api/chat`** (45s timeout). On an end-user machine there is **no backend on `localhost:8000`** → connection refused → the tool returns an error → `requestAgentText`'s catch (band-aid below) hides it.

### Confirm it in ~5 seconds (no app build needed)

Drive the built sidecar binary directly and read what it returns:

```bash
cd /Users/cookingwithcastro/Desktop/planetary_agents-main
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"diag","version":"1"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"chat_with_planetary_agent","arguments":{"agentName":"Socrates","message":"hello","_meta":{"apiKey":"dev-desktop-token","caller":"diag"}}}}' \
 | ./src-tauri/bin/pa-mcp-aarch64-apple-darwin
# stderr shows the server log; stdout shows JSON-RPC. Expect id:2 result to be isError with a localhost:8000 connection error.
```

Confirm the fix by injecting the prod URLs. ⚠️ **Gotcha:** in a pipeline `VAR=x cmd1 | cmd2`, `VAR=x` binds to **`cmd1`** (the `printf`), not the binary — wrap the **binary** with `env`:

```bash
printf '%s\n' '{...same three lines...}' \
 | env PLANETARY_AGENTS_BACKEND_URL=https://api.agents.alchm.kitchen \
       PLANETARY_AGENTS_FRONTEND_URL=https://agents.alchm.kitchen \
       ./src-tauri/bin/pa-mcp-aarch64-apple-darwin
# Verified 2026-06-05: id:2 returns a real Socrates reply (Groq llama-3.3-70b, tier:free, rag_used:true).
```

Also read the in-app diagnostics that `ae6f658a` added — `renderDiagnosticsView()` in `main.ts` shows **Alchm/PA MCP last error + pa-mcp stderr (last 5 lines)** — and the `McpStatusPanel.tsx` / `useLocalMcp.ts` status.

### Suspects — status after the 2026-06-05 diagnostic

1. **Auth** — ✅ RULED OUT: `dev-desktop-token` was accepted on the free tier. Only revisit if you wire non-free tiers / per-user keys.
2. **Protocol version** — ✅ RULED OUT: `initialize` succeeded despite the `2024-11-05` (`localMcpClient.ts:209`) vs `2025-06-18` (`planetary_agents_mcp_server.py:17`) difference.
3. **Response shape** — verify in-app: the success payload is `{agentName, agentId, text, sessionId, metadata}` wrapped via `_text_result` as `content[0].text` (JSON string). Confirm `main.ts` parses it and reads `.text` correctly end-to-end.
4. **x86_64 staleness**: `pa-mcp-x86_64-apple-darwin` is stale (May 29) — only relevant for Intel builds; ignore on Apple Silicon.

## Secondary issue — live-sky transits also broken (CONFIRMED, independent of the chat fix)

Even with the backend URL fixed, the diagnostic still showed (stderr):

```
_live_sky_context: alchm transits failed: … "message": "Failed to calculate natal chart … ← fetch failed ←"
```

and the chat metadata reported `mcp.errors: ["get_live_sky_transits: 2"]`. This is the **`alchm-mcp`** path: `backend/alchm_mcp.py` shells out to `bunx @alchm/mcp-server` (needs Bun + network) which then fetches a backend to compute charts — and that fetch failed. Chat **degrades gracefully** (still returns a reply, minus live-sky enrichment), so it doesn't block chat, but **transits/recipes won't work until `alchm-mcp` is reachable**. For "fully operational" also: confirm the bundled `bin/alchm-mcp` sidecar is what runs at runtime (vs `bunx`-on-demand), give `alchm_mcp.py` the right backend URL, and verify Bun availability. Start at `backend/alchm_mcp.py:_resolve_launch()` and the `ALCHM_MCP_*` env vars.

---

## The band-aid to remove (`7bb165f0` "hide local MCP chat failures")

In `desktop-shell/src/main.ts`:

- `requestAgentText(...)` catch now does: `state.runtime.lastError = …; return { content: buildProfileGuidedAgentReply(...), channel: 'Desktop agent', metered: false }` — i.e. a **canned local reply presented as a normal "Desktop agent" message**, with the real error swallowed (downgraded `console.error` → `console.warn`).
- `sanitizeChats(...)` strips the `'Local MCP chat failed:'` prefix from saved messages and rewrites `'Desktop agent (Fallback)'` → `'Desktop agent'`.

Once the real chat works, **stop masking failures**: a genuine sidecar/tool failure must surface as a clear status/error (Diagnostics panel + `McpStatusPanel` + a visible channel like "Desktop agent (Fallback)"), not a silent fake reply. Keep a graceful fallback for true offline, but make it honest and diagnosable.

---

## Plan

**Phase 0 — branch + reproduce.** Branch off `main`. Run the direct-sidecar diagnostic above; capture the exact `id:2` error and stderr. Confirm whether the prod-URL prefix fixes it. Record findings before editing.

**Phase 1 — fix the chat path (additive).** Make the sidecar reach a real backend. Options, in order of preference:

- **(a) Inject env at spawn.** Pass `PLANETARY_AGENTS_BACKEND_URL=https://api.agents.alchm.kitchen` + `PLANETARY_AGENTS_FRONTEND_URL=https://agents.alchm.kitchen` to the `pa-mcp` (and `alchm-mcp`) sidecars. JS `Command.sidecar` env support is limited, so the reliable place is the **Rust side** — spawn these sidecars in `src-tauri/src/main.rs` with explicit `.env(...)` like `orchestrator` (and have the front-end attach to them), or add a Tauri command that the front-end calls to spawn with env. Keep the URLs overridable.
- **(b) Frozen-aware default (belt-and-suspenders).** In `planetary_agents_mcp_server.py`, when `sys.frozen` and no explicit env, default `BACKEND_URL`/`FRONTEND_URL` to the prod hosts instead of `localhost`. Smallest change; do this **and** ideally (a) so it's both safe and configurable.
- Resolve the **auth** decision from Phase 0 (free tier vs real key) and the protocol-version/response-shape items if they showed up.

**Phase 2 — remove the band-aid.** Revert the `7bb165f0` masking in `requestAgentText` + `sanitizeChats` so real failures are visible; keep an honest, labelled offline fallback.

**Phase 3 — rebuild + verify.**

- Rebuild the sidecar after any Python change: `bun run build:sidecar` (or `scripts/build-sidecar.sh`). Re-run the direct-sidecar diagnostic — `id:2` returns a real reply.
- Run the app (`bun run tauri dev` or the desktop-shell dev flow), toggle **Use Local MCP** on, chat with an agent → **real MCP-routed response**, `channel: 'Desktop agent'`, `metered: true`, `paMcpStatus: 'online'`, no `lastError`, Diagnostics stderr clean.
- Confirm a tool invocation lands in telemetry: `MCPInvocation` table / `GET /api/admin/mcp-status` / `/api/admin/mcp-summary` (gated by `INTERNAL_API_SECRET`). Confirm `alchm-mcp` online (transits/recipes) or document its degradation.
- Negative check: kill the backend/sidecar and confirm the failure now shows a **clear** status, not a silent canned reply.

---

## Hard constraints

- **Additive.** Do **not** modify any alchemical / elemental / planetary / ESMS / Monica / proprietary-formula logic. This is transport/config/UX wiring only.
- **Keep the cloud path** (`localOfflineMode` off → `agents.alchm.kitchen`) working unchanged.
- **Do not commit** `src-tauri/bin/*` (gitignored build artifacts) or `desktop-shell/dist/*` build output unless the repo already tracks them.
- **Gates green, state the commands:** `bun run lint`; `bunx tsc --noEmit` (no _new_ errors); the desktop tests `bunx vitest run test/desktop-shell/` (esp. `local-mcp-client.spec.ts`); backend `cd backend && ruff check . && pytest`. One change at a time; checkpoint commits between phases.
- Secrets: the GitLab `origin` remote has a `glpat-` token committed in `.git/config` — don't touch/echo it; flag for rotation if relevant.

## Definition of done ("fully operational")

1. `pa-mcp` **and** `alchm-mcp` reach `online` in the desktop app.
2. With **Use Local MCP** on, agent chat returns a **real model response routed through `pa-mcp` → /api/chat** (not `buildProfileGuidedAgentReply`), `metered: true`, channel `Desktop agent`.
3. Astrology/recipe tools and at least one of Jing duel / weekly menu work via MCP (or documented degradation when `alchm-mcp`/network is absent).
4. Tool calls appear in MCP telemetry.
5. **No hidden failures**: a genuine failure shows a clear UI status/error, never a silent fake reply.

## Key files

| File                                                                               | Role                                                                                                                                                              |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `desktop-shell/src/localMcpClient.ts`                                              | stdio JSON-RPC client; spawns sidecar (no env today)                                                                                                              |
| `desktop-shell/src/main.ts`                                                        | `requestAgentText` (chat call + band-aid catch ~4549–4587), `sanitizeChats`, `localOfflineMode` toggle (~1070), client `.start()` (~5926/6051), Diagnostics panel |
| `desktop-shell/src/hooks/useLocalMcp.ts`, `components/settings/McpStatusPanel.tsx` | status UI                                                                                                                                                         |
| `src-tauri/src/main.rs`                                                            | Rust sidecar spawn + **env injection** (orchestrator only today, ~475–501)                                                                                        |
| `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`                 | externalBin + shell permissions (correct)                                                                                                                         |
| `backend/planetary_agents_mcp_server.py`                                           | PA MCP server; `BACKEND_URL` default localhost:8000 (~18); `chat_with_planetary_agent` → POST `/api/chat`                                                         |
| `backend/alchm_mcp.py`                                                             | PA→alchm-mcp client (bunx `@alchm/mcp-server`, circuit-breaker)                                                                                                   |
| `scripts/build-sidecar.sh`, `backend/pa-mcp.spec`                                  | PyInstaller sidecar build → `src-tauri/bin/<name>-<triple>`                                                                                                       |
| `test/desktop-shell/local-mcp-client.spec.ts`                                      | client tests to keep green                                                                                                                                        |
