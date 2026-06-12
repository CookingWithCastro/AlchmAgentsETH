# Comprehensive Site Audit — June 11, 2026

Multi-agent audit (12 dimensions, adversarially cross-validated) plus inline verification.
Each finding below was confirmed against the actual code; refuted or speculative findings were dropped.

## The site's true intent

Planetary Agents is an **astrology-as-game-mechanics AI agent platform**: birth charts become
living AI personalities, current sky positions become live gameplay modifiers. The core loop —
written verbatim into `app/(occult)/layout.tsx` metadata — is:

> claim daily ESMS yield → **forge** an agent → **commune** in the vault → **duel** in the Jing Arena → read the record in the **Labs**

It is a consciousness-collection-and-competition game wrapped around a genuinely engineered
persona chat system (`lib/agents/persona/`), not an astrology content site. The audience is
the alchm.kitchen ecosystem: astrology-literate users who want AI play.

The four-pillar v2 IA (forge/vault/arena/labs) is the cleanest expression of that intent the
product has had — each pillar has exactly one live data binding. Three structural gaps remain:

1. **Commune is exiled from the v2 shell** — the vault links out to v1 `/agent/[id]` at the
   loop's emotional peak. A `vault/[agentId]` chat surface wrapping the persona pipeline is the
   single highest-leverage build.
2. **The ESMS economy is display-only inside v2** — forging debits nothing, duels award nothing.
   All primitives exist (TokenBalance, esms_claims, AgentJingDuel); wiring spend/earn into the
   two live flows would make the sidebar balances the engine the landing copy already claims.
3. **Showcase dilution** — every pillar ships 1–3 static Stitch mockup tabs beside the live one,
   and ~23 raw prototypes are routable under `(sandbox)/stitch/`.

---

## Fixed in this session (all verified: build ✓, tsc 0 errors ✓, tests ✓, browser ✓)

### Build & correctness

- **Stale compiled artifacts shadowing live code** — 20 files (`.js`/`.js.map`/`.d.ts`/`.ts.backup`
  from May 3) deleted from `lib/`. One actively broke `/api/consciousness-survey`: webpack resolved
  the stale `enhanced-astronomical-calculator.js` which lacks `dateToJulianDay`.
- **Secret-less builds failed** — `lib/auth-options.ts` threw at module scope during `next build`
  page-data collection (why CI needed a secret-injection workaround). Now build-phase aware;
  still refuses to _serve_ production without a real secret.
- **`/api/admin/system-stats` always 500'd** — every query used non-existent Prisma model names
  (`prisma.user`, `consciousnessInteraction`, `agentEvolutionState`, `monicaInteraction`,
  `subscription`). All corrected to the real models; the admin console Chat Status board's
  system tab works again.
- **Labs analytics crash** — `/api/labs/trajectory` returned `{avgOverall: null}` for an empty
  snapshot window (SQL `AVG()` of zero rows) and the client called `.toFixed()` on it. The API
  now returns `totals: null`, the client's handled empty state.
- **Gallery search crash + NaN tile** — unguarded `agent.title.toLowerCase()` /
  `agent.abilities.specialty` / `a.stats.conversations` over DB-sourced rows. All guarded.
- **Gallery era filter** — Medieval (8 agents) and Industrial (9 agents) eras existed in the
  roster but not in the dropdown; both unfilterable. Added.
- **Transits page** — the 5-minute refresh re-opened the council modal the user had closed and
  flashed the full-page loading state. Refreshes are silent now; auto-open happens once.
- **Dashboard fake tier** — every signed-in user defaulted to `master`, hiding the upgrade path.
  Defaults to `free`.
- **`admin-api-auth` test suite** — 5 pre-existing failures: tests never mocked `next/headers`,
  so `auth()`'s kitchen-bridge `cookies()` call threw outside request scope and every route 500'd
  instead of 401. Fixed; all 16 pass.

### Security (high-severity, confirmed exploitable before fix)

- **`/api/economy/claim-yield`** — moved real token balances with **zero auth** and a
  non-idempotent key (loopable to drain any planetary reservoir / inflate any agent's balance).
  Now requires session or CRON/INTERNAL secret in production (mirrors the cron route's pattern).
- **`/api/deep-link/sign`** — minted HMAC-signed premium desktop unlock links with
  caller-controlled tier and _arbitrary expiry_, unauthenticated. Now requires a session,
  clamps expiry to ≤15 min, and only grants `premium` to subscribers (web call sites all
  request `base`, so nothing broke).
- **`/api/proxy/wten/[...path]` — deleted.** An unauthenticated open proxy that stamped
  `INTERNAL_API_SECRET` onto any anonymous request and forwarded it to the WTEN backend.
  Zero callers existed anywhere in the repo.
- **`/api/user-natal-charts` family — IDOR.** All five handlers (list/create/get/update/delete/
  set-primary) trusted a caller-supplied `userId` with no session, exposing birth-data PII.
  New shared guard (`lib/api/natal-chart-guard.ts`) pins the acting user to the session in
  production (admins exempt); dev/test keep the explicit-userId contract for integration tests.
- **`/api/feed` POST** — was open-write when `INTERNAL_API_SECRET` unset; now fail-closed in production.
- **Rate limiting added** to the deliberately-anonymous endpoints (desktop companion has no
  NextAuth session, so they can't be session-gated): `agents/train` (30/10min/IP),
  `feed/cast` (10/min, LLM-generation amplification), `knowledge-updater/ingest`
  (10/10min/IP — stored-prompt-injection vector into the persona pipeline),
  `create-agent` (5/hr/IP for anonymous forging).

### Performance

- **Material Symbols icon font: 3,951KB → 121KB (−97%)** on every page. The full variable font
  was render-blocking globally; now subset to the 102 icons actually used (note in
  `app/layout.tsx`: new icons must be appended to the `icon_names` URL).
- **Nav logo: 1.68MB → 126KB** (1024px PNG rendered at 24px; resized to 256px).
- **Favicon: 370KB → 32KB** (regenerated 64/48/32/16 ICO from the same art).
- **Dead global stylesheets deleted** — `app/cosmic-theme.css`, `app/cosmic-time-laboratory.css`
  (imported nowhere, verified).

### IA / navigation

- **The v2 pillar shell had zero inbound links** — unreachable except by typed URL. Now linked
  from: the authenticated landing card (4 primary pillar buttons) and the v1 nav dropdowns
  (lead item of each matching group — the group names already mirrored the pillars).
- **Mobile v2 users had no path to auth/profile/wallet** — `MobileBottomNav` gained a fifth
  Profile/Sign-in tab.
- **Dead "Attune" button** in the v2 top bar now links to `/attunement-circle`.
- **Fake "Rank: Adept III"** in the v2 sidebar replaced with the user's real subscription tier
  rendered in lore voice (Initiate/Alchemist/Master).

### Modernization

- **Type & lint gates enforced**: `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`
  flipped to `false` — both were masking zero errors. `next build` now runs
  "Linting and checking validity of types" and passes.
- **Node 20 (EOL April 2026) → 22.x LTS** in `vercel.json` NODE_VERSION and `engines`.
- **Repo hygiene**: removed 5 stale "xxx 2.\*" conflict-copy files (4 untracked June-3 leftovers
  superseded by June-9 refactors + 1 tracked stale Monica redirect stub).
- CLAUDE.md's stale "many existing TS errors" claim corrected.

---

## Confirmed findings — not yet fixed (prioritized roadmap)

### Completed in the follow-up integration session (same day)

**Commune-in-v2 — BUILT.** `app/(occult)/vault/[agentId]/page.tsx` + `components/alchemy/CommuneChat.tsx`:
any resolvable agent (canonical, planetary sprite, DB-crafted) now chats inside the v2 shell via the
persona-first `/api/agents/unified` pipeline (ESMS debit, free-rotation waiver, tier capping, balance
push into the shell sidebar). `LiveVaultGallery` cards and the ForgeWizard's "Commune Directly" CTA
both route in-shell. Adversarially reviewed (3 lenses) and all findings fixed: sign-in link carries
`callbackUrl`, 402 recovery CTA is state-driven, composer clears the mobile bottom nav and safe-area
insets, transcript is `aria-live`, ids minted outside React updaters, agent resolution deduped with
React `cache()`.

**Economy loop — WIRED.** Signed-in forging debits `forge_agent` (45 ESMS, refunded idempotently if
the pipeline fails after the debit; anonymous forging stays free behind its rate limit), and forge
ownership is recorded in `created_agents.creatorId`. Paid duel rounds mint a signed, single-spend,
10-minute claim token in the `done` SSE event; `/api/economy/duel-yield` requires it, pays
`DUEL_YIELD_REWARD` (7 total — strictly below the cheapest billed round at 8, so even verified
rounds are a net sink), capped 3/UTC-day with race-safe idempotency.

### Completed in the roadmap-finishing session (June 12)

All items below were implemented, adversarially reviewed (3 lenses, several findings live-tested
against Neon), and verified with the strict build + the test suite at its pre-existing baseline:

- **Avatars: 29MB → 6.2MB** (pngquant in place, paths unchanged, no visible quality loss).
- **`claimPlanetaryYield` idempotency**: keyed on agent-pair + UTC day; same-day re-claims return
  `{alreadyClaimed: true}` (409 from the route) with full transactional rollback — live-verified.
- **Gallery roster fixed**: `/api/agents` now returns the canonical 71 in-memory agents + user-forged
  vessels from Neon (old arbitrary Railway window preserved under `?source=backend`); payload slimmed
  ~60% by stripping prose fields nothing reads; 8 BCE agents' invalid 5-digit ISO years fixed
  (their birth dates serialized as null); greg-castro got his missing `era` (was invisible to filters).
- **Forge sliders live**: the wizard's Sacred-7 attunement now genuinely shapes the personality core
  (top primary traits + style via `generatePersonalityTraits`), and is persisted in the ledger blueprint.
- **Arena transcripts survive tab switches** (panels stay mounted; also stops SSE writes into
  unmounted components).
- **`/planetary-agents` un-froze**: `revalidate = 900` (was prerendered once at build, potentially
  permanently empty).
- **Privy's ~1.4MB chunk** lazy-loads on `/account` and `/upgrade` (`next/dynamic`, ssr:false).
- **Sandbox gated**: all ~28 `(sandbox)` prototype routes 404 in production
  (`SANDBOX_ROUTES_ENABLED=true` to override); the `/me` card that pointed into it now goes to `/labs`.
- **6 dead API routes deleted** (langchain-agent, migrate-agents, kinetic-evolution,
  celestial-energy-timeline, onboarding, observability) — zero callers, triple-verified.
  `generate-ingredient-image` kept (live WTEN mission).
- **Demo-ware pruned from nav** (universe-learning, character-vectors, consciousness-demo).
- **Stitch CDN images vendored** (11 of 12 — one URL already dead upstream, proving the rot)
  into `public/stitch/`, quantized 4.1MB → 1.3MB.
- **TypeScript 5.2.2 → 5.9.3** (4 new strictness errors fixed) and **Next 15.2.9 → 15.5.19**;
  `experimental.turbo` migrated to top-level `turbopack` (the shim dies in Next 16); inert
  `@radix-ui/react-*` glob removed from optimizePackageImports.

4. **Gallery window bug**: renders an arbitrary 100-row slice of the 3,738-row table labeled as
   the full roster, and `/gallery` (via `/api/agents`) vs `/vault` (via `/api/agents/gallery`)
   are duplicate browse surfaces on different data sources. Pick `/vault`'s endpoint as canonical.
5. **Forge wizard dead controls**: the Sacred-7 attunement sliders are never persisted and the
   "Communion Engine" tier selector sets state nothing reads. Either wire them into
   `/api/create-agent` or remove the steps.
6. **Arena**: switching tabs destroys the duel transcript while the SSE round keeps running.
   Lift transcript state above the tab switch (`PillarTabs` currently discards tab state).
7. **`/planetary-agents` page can serve stale/permanently-empty positions** — statically
   prerendered with no client refetch.

### Medium value, small/medium effort

- **middleware.ts is fully disabled** (`matcher: []`) — re-enable for sensitive prefixes
  (`/api/admin`, `/api/economy`, `/api/esms`) as defense-in-depth; forgotten per-route checks
  were the root cause of this audit's security findings.
- **Wildcard CORS** (`lib/cors.ts`) on mutating endpoints: restrict to known origins
  (include the Tauri webview origins, e.g. `tauri://localhost`).
- **Three parallel yield/wallet surfaces** (`/economy`, `/yield`, profile) with divergent
  endpoints and no shared hook; same for **three account surfaces** (`/settings`, `/account`,
  `/profile`) and **two billing funnels** (`/pricing`, `/upgrade` — the latter ships a 1.45MB
  Privy chunk statically; dynamic-import `PrivyConnect`).
- **Global providers fetch backend data on every page mount** including the landing; gate the
  fetching providers by route group or defer until after first paint.
- **Demo-ware v1 pages dilute the product**: `/universe-learning` (hardcoded "Alex"),
  `/character-vectors` ("Maya Rodriguez"), `/tarot-dashboard`, `/rune-forge`,
  `/synthesis-chamber` — prune from nav, noindex, or fold what's real into the pillars.
- **Sandbox/stitch prototypes are publicly routable** (~28 routes compiled into prod) — gate the
  `(sandbox)` group behind `NODE_ENV !== 'production'` or move to Storybook.
- **Orphaned routes** with no inbound links: `/yield`, `/train/[id]`, `/synastry` index,
  `/planets/*`, `/consciousness-survey` island, `/galileo-setup`, `/planetary-agents/{galileo,model-training}`.
  Link, redirect, or delete.
- **Zero-caller API routes** (verified): `langchain-agent`, `migrate-agents`,
  `generate-ingredient-image`, `kinetic-evolution`, `celestial-energy-timeline`, `onboarding`,
  `observability` — delete after a final grep.
- **v2 pillar pages hot-link ephemeral Google Stitch CDN images** — vendor them into `public/`.
- **Dependency cleanup**: `openai` pinned at 4.11.0 (Oct 2023, single importer), two parallel
  Anthropic stacks, dead langchain/llamaindex meta-packages, `@types/react` 19 vs React 18
  runtime mismatch, TypeScript exact-pinned at 5.2.2 (bump is free — typecheck is green).
- **Next.js 15.2.9 → 15.5.x** is the safe near-term hop. **React 19**: Next's vendored runtime
  already runs it in the App Router; only recharts 2.9.0 hard-blocks the package bump.
  **next-auth v4 → v5 is blocked by design** (cross-site cookie bridge with alchm.kitchen) — do
  not attempt until the kitchen migrates in lockstep. **Tailwind 3.3.3 → 3.4.x** now; defer v4
  until the st-\* design system settles.

### Pre-existing test debt (baseline: 38 failures, none from this session)

`test/chat-system/integration/*` (22), `system-integration` user-journey ×2, perf benchmarks (7,
inherently flaky thresholds), avatar-generator (3), render-supplemental (2 — Render isn't even
the deploy target). Worth a dedicated triage pass: most appear to assert against live-backend
behavior that drifted.

### Lore/product note

The landing publicly teaches the Sacred 7 and Monica Constant while agents are forbidden from
naming them in chat. Defensible ("mechanics are marketing, taboo in-fiction") but undocumented —
a single line of lore copy on the landing would keep the in-chat silence from reading as a bug.
