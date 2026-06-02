# alchm.kitchen (WTEN) ↔ Planetary Agents — cross-site integration spec

How **alchm.kitchen / WhatToEatNext (WTEN)** must behave so it's fully unified
with **Planetary Agents (PA, `agents.alchm.kitchen`)**. PA is already implemented
against these contracts (PRs #32 + #33); this document is the **WTEN-side
checklist**, derived from PA's actual code.

**Roles**

- **WTEN = Identity Provider + authoritative token wallet.** It owns login
  (Auth.js v5, Google/email), the ESMS balance ledger, and the canonical user row.
- **PA = relying party.** It reads WTEN's session (cookie shared on `.alchm.kitchen`),
  proxies the wallet, and mirrors premium. PA never owns the wallet.

**Three unification layers** (each maps to a contract below):

1. **Session bridge** — PA reads WTEN's `/api/auth/session` (§1).
2. **Shared wallet** — PA proxies WTEN's economy endpoints (§2).
3. **Unified premium role** — WTEN's session `tier` drives PA premium (§3).
4. **Privy shared identity** — same Privy app → same DID on both sites (§4).

Repos: WTEN at `~/Desktop/WhatToEatNext-master`; PA at `~/Desktop/planetary_agents-main`.
Each section cites the **PA file** that consumes the contract so you can match shapes exactly.

---

## §1 — `/api/auth/session` must expose `email`, `id`, `tier`, `role` (REQUIRED · hard dependency)

**PA consumer:** [`lib/auth-bridge.ts`](lib/auth-bridge.ts) → `resolveBridgeUser()`. On any PA request without a native PA session, PA calls:

```
GET ${ALCHM_KITCHEN_SYNC_URL || https://alchm.kitchen}/api/auth/session
Headers: cookie: <the incoming request's full cookie header, forwarded verbatim>
(2.5s timeout; any failure → PA falls back silently, never blocks)
```

PA expects the standard Auth.js shape and uses **each** field:

```jsonc
{
  "user": {
    "email": "user@example.com", // REQUIRED — PA JIT-provisions/looks up its local user by this
    "id":    "<wten-user-uuid>",  // stored on PA users.alchmKitchenUserId (cross-site link + /profile/{id})
    "tier":  "free" | "premium",  // drives unified premium (see §3)
    "role":  "user" | "admin",    // admin ⇒ treated as premium on PA too
    "name":  "…", "image": "…"      // optional, used for display
  },
  "expires": "…"
}
```

- **Action:** in `src/lib/auth/auth.config.ts` `session` callback, keep
  `session.user.email`, `session.user.id`, `session.user.tier`, `session.user.role`
  populated. (Verified present today around `auth.config.ts:243` — do **not** strip
  them in a future refactor.)
- **Why it matters:** strip `email` → PA can't link the account at all; strip
  `tier` → kitchen-premium users won't get premium on PA.
- **Latency note:** PA trusts the JWT `tier`, so a new subscription propagates to
  PA on the user's next WTEN token refresh (≈ next request/sign-in).
- **CORS:** none needed — PA calls this **server-to-server**, not from the browser.
- **Verify:**
  ```bash
  curl -s https://alchm.kitchen/api/auth/session -H "cookie: <copy from a signed-in browser>" | jq
  # → must include user.email, user.id, user.tier, user.role
  ```

---

## §2 — `GET /api/economy/balance` server-to-server fallback (REQUIRED)

**PA consumer:** [`app/api/economy/balances/route.ts`](app/api/economy/balances/route.ts). PA first forwards the user's cookies to `…/api/economy/balance?site=agents`; if that returns **401**, it retries server-to-server using the shared secret + email:

```
GET ${ALCHM_KITCHEN_SYNC_URL}/api/economy/balance?site=agents&email=<urlencoded-email>
Headers: X-Sync-Secret: <ALCHM_KITCHEN_SYNC_SECRET>
```

Expected response (both cookie and sync paths):

```jsonc
{
  "balances": { "spirit": 0, "essence": 0, "matter": 0, "substance": 0 },
  "canClaimDaily": true, // optional; PA maps → canClaimAgentsYield
  "streak": 0, // optional
}
```

- **Action:** `src/app/api/economy/balance/route.ts` must accept the
  `X-Sync-Secret` header + `email` query param (resolve the user by email when the
  secret matches) and the `site=agents` param. (`scripts/test-human-attunement.ts`
  already assumes this — confirm it's live.)
- **`site` semantics:** `site=agents` vs `main` tracks **separate daily-claim
  timestamps** (`last_daily_claim_agents_at` vs `last_daily_claim_at`) so a user can
  claim once per day on _each_ site.
- **Yield/claim:** PA's [`app/api/economy/yield/route.ts`](app/api/economy/yield/route.ts)
  POSTs cookies to `…/api/economy/claim-daily?site=agents` — **cookie-forward only**,
  no server-to-server fallback needed. No WTEN change required there.

---

## §3 — Unified premium role (REQUIRED if WTEN sells premium)

**PA consumer:** [`lib/premium/entitlements.ts`](lib/premium/entitlements.ts) `getPaTier()` + the bridge's `kitchenPremium` flag (set in `lib/auth-bridge.ts` from the session `tier`/`role`).

A WTEN subscription must surface as `session.user.tier === 'premium'` (§1). PA then treats that user as **premium** (`alchemist`) — unlocking Claude Sonnet/Opus + GPT-5.x in agent chat — **without** requiring a separate PA purchase. Rule PA applies: premium = PA-side Stripe sub **OR** `kitchenPremium` (tier `premium` / role `admin`) **OR** PA admin role.

- **Action:** ensure active WTEN subscribers resolve to `tier: 'premium'` in the
  session callback; expired/canceled → `'free'`.
- **(Optional) no-cookie path:** for background/no-cookie contexts, expose
  `GET /api/subscription/status?email=<email>` behind `X-Sync-Secret` →
  `{ tier: 'free'|'premium', active: boolean }`. Not required for the cookie flow.

---

## §4 — Privy shared cross-site identity (REQUIRED for the Privy unification)

**PA implementation to mirror:** [`lib/privy/server.ts`](lib/privy/server.ts),
[`app/api/account/privy/route.ts`](app/api/account/privy/route.ts),
[`components/account/PrivyConnect.tsx`](components/account/PrivyConnect.tsx),
migration `prisma/migrations/20260602120000_add_privy_did`.

Privy is an **identity layer on top of** Auth.js (not the login). A logged-in user
"connects" Privy; the server stores the Privy **DID** on their user row. One Privy
app shared by both domains ⇒ the **same person → same DID** on both sites ⇒ a
stable cross-site join key.

**4a. Privy app config (dashboard)** — app id `cmi9t84qs00acl80dam2j8195`:

- **Allowed origins:** `https://agents.alchm.kitchen`, `https://alchm.kitchen`,
  `http://localhost:3000`. _(Added ✓ — confirm `alchm.kitchen` is included.)_
- Login methods: **email, Google, wallet**. Embedded wallets: **on (Base)** — see §4d
  (`embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, solana: { createOnLogin: 'off' } }`).

**4b. WTEN code (mirror PA):**

- `bun add @privy-io/react-auth @privy-io/server-auth` (v3 client / v1 server).
- DB: add `privy_did TEXT UNIQUE` to WTEN's `users` (idempotent migration:
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "privy_did" TEXT;` +
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_privy_did_key" ON "users"("privy_did");`).
- Server verify (mirror `lib/privy/server.ts`):
  ```ts
  import { PrivyClient } from '@privy-io/server-auth'
  const privy = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!
  )
  const { userId } = await privy.verifyAuthToken(accessToken) // userId = did:privy:…
  ```
- Connect route (mirror `app/api/account/privy/route.ts`): `POST {accessToken}` →
  verify → store DID on the current (Auth.js) user's `privy_did`; **409** if the DID
  is already linked to a different user; `GET` returns `{ connected, did: masked }`;
  `DELETE` unlinks. Auth-gate with WTEN's own session resolver.
- Client connect UI (mirror `components/account/PrivyConnect.tsx`): scope
  `PrivyProvider` to the connect component (don't bundle the web3 SDK app-wide);
  `usePrivy().getAccessToken()` → POST to the connect route. Surface on WTEN's
  `/profile` (or account) page.

**4c. Result:** both `users` rows carry the same `privy_did` → join on it for a
robust, provider-agnostic cross-site identity (cleaner than email / `alchmKitchenUserId`).

**4d. Embedded wallets (Base) + fiat funding** — PA now provisions a per-user
embedded EVM wallet on **Base** and funds it via Privy's built-in on-ramp:

- Provider config (mirror PA): `embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, solana: { createOnLogin: 'off' } }`, `defaultChain: base`, `supportedChains: [base]` (`import { base } from 'viem/chains'`). Funding via `useFundWallet().fundWallet({ address, options: { chain: base } })`.
- Enable **embedded wallets** for the app in the Privy dashboard (the in-code
  `createOnLogin` is honored only if wallets are enabled).
- DB: add `wallet_address TEXT` to WTEN's `users` (non-unique). On connect,
  resolve the wallet **server-side** from the verified DID via
  `PrivyClient.getUser(did)` → the embedded ethereum wallet's `address` (don't
  trust a client-sent address). Mirror PA's `getPrivyWallet()`.
- Same Privy app ⇒ the user's wallet is the same address on both sites.
- **Note:** stablecoin subscriptions are intentionally deferred (Stripe's
  recurring-USDC is private-preview/access-gated) — this is wallet infrastructure;
  the funded balance has no in-app spend yet.

---

## §5 — `/profile` ↔ PA cross-link (UX)

PA's `/me` and `/account` link to `https://alchm.kitchen/profile`. Add the reverse
on `src/app/(alchm)/profile/page.tsx`: **"Your Planetary Agents →
https://agents.alchm.kitchen/me"**.

---

## §6 — Sign-out / cookie domain (INFO · usually no change)

PA's [`app/api/logout/route.ts`](app/api/logout/route.ts) signs the user out of
**both** sites by expiring, on domain `.alchm.kitchen`, the cookies:
`authjs.session-token`, `__Secure-authjs.session-token` (WTEN's) **and**
`next-auth.session-token`, `__Secure-next-auth.session-token` (PA's). Both stacks
use stateless JWT sessions, so clearing the cookie is a complete logout.

- **Only if** WTEN turns on server-side session revocation
  (`AUTH_REVOCATION_CHECK=on` in `src/lib/auth/auth.config.ts`): coordinate so PA's
  logout bounces through `https://alchm.kitchen/api/auth/signout` to write the
  revocation record. Confirm WTEN's session cookie is set on the **`.alchm.kitchen`**
  domain (not host-only) so the shared-cookie bridge works at all.

---

## §7 — On-chain ESMS claim (INFO · no new WTEN endpoint)

PA Phase 1 lets a user **claim** ESMS (Spirit/Essence/Matter/Substance) from the
off-chain ledger to a soulbound ERC-1155 on **Base** (testnet first). The WTEN
off-chain ledger stays **authoritative**; claiming mirrors a balance on-chain
(debit off-chain → mint on-chain). **No new WTEN endpoint** — PA reuses the existing
economy **sync-debit** path.

- **PA flow** ([`app/api/esms/claim/route.ts`](app/api/esms/claim/route.ts)):
  generate a `claimId` (bytes32), persist an `esms_claims` row, **debit off-chain
  FIRST** via `syncDebitToAlchm({ … })`, then mint on-chain. A mint failure never
  grants free tokens (debit-before-mint); the on-chain `claimId` guard +
  sync-debit idempotency make retries safe (no double-debit, no double-mint).
- **WTEN action — confirm only (no code if already true):** the economy debit
  endpoint must (a) accept **`source: 'onchain_claim'`** (or any free-form source
  string — do not reject it) and (b) be **idempotent on `idempotencyKey`** (the
  `claimId`), so a retried claim debits **once**. If sync-debit already ignores
  unknown sources and dedupes on the idempotency key, **no WTEN change is needed**.
- **Authoritative ledger unchanged.** ESMS is still spent/earned off-chain on
  alchm.kitchen; on-chain is a mirror for wallet display. **Phase 2** (redeem back
  to off-chain) will use the existing **credit** path (`sync-credit`) with the same
  `claimId` idempotency — flagged here so it isn't a surprise later.

---

## Environment variables (must match across both deployments)

| Var                         | Where              | Value / note                                                                  |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------- |
| `ALCHM_KITCHEN_SYNC_SECRET` | PA + WTEN (server) | **Identical** value both sides — gates §2 + economy sync.                     |
| `ALCHM_KITCHEN_SYNC_URL`    | PA (server)        | `https://alchm.kitchen` (PA→WTEN base).                                       |
| `NEXT_PUBLIC_PRIVY_APP_ID`  | PA + WTEN (public) | `cmi9t84qs00acl80dam2j8195`. _(Set on PA Vercel Prod+Dev ✓.)_                 |
| `PRIVY_APP_SECRET`          | PA + WTEN (server) | From Privy dashboard. **Secret** — never client-exposed.                      |
| `NEXT_PUBLIC_ESMS_CHAIN`    | PA (public)        | `base-sepolia` (then `base`). ESMS on-chain network (§7).                     |
| `ESMS_CONTRACT_ADDRESS`     | PA (server)        | Deployed `EsmsToken` proxy address (§7).                                      |
| `PRIVY_MINTER_WALLET_ID`    | PA (server)        | Privy server wallet holding `MINTER_ROLE` (or `MINTER_PRIVATE_KEY` fallback). |

WTEN session cookie must remain domain `.alchm.kitchen`; `ALCHM_KITCHEN_SYNC_SECRET`
must match PA's. ESMS env (§7) is **PA-only** — WTEN needs none of it.

---

## Verification checklist

- [ ] `curl …/api/auth/session` (signed-in cookie) returns `user.{email,id,tier,role}`.
- [ ] `GET /api/economy/balance?site=agents&email=…` with `X-Sync-Secret` returns `{ balances:{…} }`.
- [ ] Active WTEN subscriber ⇒ session `tier:'premium'` ⇒ PA shows premium (no PA purchase).
- [ ] `/profile` links to `agents.alchm.kitchen/me`.
- [ ] `ALCHM_KITCHEN_SYNC_SECRET` identical on PA + WTEN.
- [ ] WTEN session cookie domain is `.alchm.kitchen` (shared-cookie bridge prerequisite).
- [ ] Privy: dashboard Allowed origins include both domains + localhost.
- [ ] Privy: WTEN mounts the SAME app id; `users.privy_did` column + connect route live.
- [ ] Privy env on both repos: `NEXT_PUBLIC_PRIVY_APP_ID` + `PRIVY_APP_SECRET`.
- [ ] (If WTEN revocation on) PA logout bounces through kitchen signout.
- [ ] ESMS (§7): economy debit accepts `source:'onchain_claim'` + is idempotent on `idempotencyKey` (claimId). No new WTEN endpoint.
