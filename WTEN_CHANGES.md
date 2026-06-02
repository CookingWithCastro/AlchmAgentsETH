# WTEN (alchm.kitchen) changes required for unified login + shared balance

These are the **alchm.kitchen / WhatToEatNext** side changes that pair with the
Planetary Agents (PA) cross-site session bridge. PA was implemented to be the
relying party; alchm.kitchen remains the **identity provider + authoritative
token wallet**. Most of this is _verification_ — the contract PA depends on is
mostly already present.

Repo: `~/Desktop/WhatToEatNext-master`. Each item notes the file to check.

---

## 1. `/api/auth/session` must return `user.email` + `user.tier` (REQUIRED — hard dependency)

PA's bridge calls `GET https://alchm.kitchen/api/auth/session` server-to-server,
forwarding the shared `.alchm.kitchen` cookies, and JIT-provisions a PA user
from the returned **email**. It also reads **`user.tier`** (and `user.role`) to
unify the premium role: a `tier === 'premium'` kitchen subscription grants
premium on the agents site too. If a custom `session` callback strips `email`,
the bridge can't link accounts; if it strips `tier`, kitchen premium won't carry
over to PA.

- **Check:** `src/lib/auth/auth.config.ts` `session` callback — confirmed today
  it sets `session.user.email`, `session.user.tier` (`'free' | 'premium'`),
  `session.user.role`, and `session.user.id`. Keep these exposed. (Verified at
  `src/lib/auth/auth.config.ts:243`.)
- **Note:** PA trusts the kitchen JWT's `tier`, which refreshes on the kitchen's
  token cycle — a brand-new kitchen subscription propagates to PA on the user's
  next kitchen token refresh (effectively immediately on next sign-in / refresh).
- **Verify:** `curl -s https://alchm.kitchen/api/auth/session -H "cookie: <signed-in cookie>"` returns `{ "user": { "email": "...", "id": "...", "tier": "premium", "role": "...", ... }, "expires": "..." }`.

### 1a. (OPTIONAL) server-to-server premium-by-email endpoint

The bridge covers the normal flow (user signed in via the shared kitchen cookie).
For full robustness in no-cookie contexts (e.g. a rare PA-native session, or
background jobs), expose `GET /api/subscription/status?email=<email>` behind
`X-Sync-Secret` returning `{ tier: 'free' | 'premium', active: boolean }`. PA can
then resolve premium without a cookie. Not required for the core feature.

## 2. `GET /api/economy/balance?email=<email>&site=agents` behind `X-Sync-Secret` (REQUIRED for fallback)

PA's `/api/economy/balances` first forwards cookies; if that returns 401 it
retries server-to-server with the shared secret and `?email=`. This path is
already referenced by `scripts/test-human-attunement.ts` — confirm it is live.

- **Check:** `src/app/api/economy/balance/route.ts` accepts the `X-Sync-Secret`
  header + `email` query param and returns `{ balances: { spirit, essence, matter, substance } }` (the exploration confirmed this branch exists).
- **Note:** PA does **not** require a server-to-server path for `claim-daily`
  (yield) — it relies on cookie forwarding for that, which works once the bridge
  is live. No change needed there.

## 3. Add a `/profile` → PA cross-link (UX: "different but connected")

So the two account pages reference each other.

- **Add** on `src/app/(alchm)/profile/page.tsx` a link/card: **"Your Planetary
  Agents → https://agents.alchm.kitchen/me"**. PA's `/me` and `/account` already
  link back to `https://alchm.kitchen/profile`.

## 4. `ALCHM_KITCHEN_SYNC_SECRET` value parity (REQUIRED)

The X-Sync-Secret header (item 2) and all economy sync (credit/debit/agent-sync)
use this shared secret. It must be the **identical value** on both deployments
(PA Vercel and WTEN). Per PA repo memory it is set on PA's Vercel as of Jun 1.

- **Verify:** the value configured on WTEN matches PA's `ALCHM_KITCHEN_SYNC_SECRET`.

## 5. Sign-out / cookie clearing (INFO — usually no change)

PA's `/api/logout` signs the user out of **both** sites by expiring the session
cookies on `.alchm.kitchen` directly (`authjs.session-token` /
`__Secure-authjs.session-token` plus PA's own). Because both stacks use
stateless JWT sessions, clearing the cookie is a complete logout — no kitchen
round-trip needed.

- **Only if** WTEN enables server-side session revocation
  (`AUTH_REVOCATION_CHECK=on`, see `src/lib/auth/auth.config.ts`): PA should
  instead redirect through `https://alchm.kitchen/api/auth/signout` so the
  revocation record is written. Coordinate before turning revocation on.

---

## Quick verification checklist

- [ ] `/api/auth/session` returns `user.email` (and ideally `user.id`).
- [ ] `GET /api/economy/balance?email=&site=agents` works with `X-Sync-Secret`.
- [ ] `/profile` links to `agents.alchm.kitchen/me`.
- [ ] `ALCHM_KITCHEN_SYNC_SECRET` matches PA.
- [ ] (If revocation is on) coordinate PA logout to bounce through kitchen signout.
