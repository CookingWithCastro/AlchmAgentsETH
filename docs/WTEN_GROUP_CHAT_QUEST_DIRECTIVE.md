# WTEN directive — whitelist `group_chat_quest` sync-credit source

> Hand this to a Claude session in the **alchm.kitchen (WTEN)** repo.
> Small follow-up to the `transit_attunement` work (WTEN PR #480) — same endpoint, same mechanics.

## Context

Planetary Agents (PA) added a weekly guided "attunement circle." When a human completes
a circle, PA grants a small **engagement-scaled ESMS reward** to their alchm.kitchen wallet
via the existing sync-credit endpoint, using a NEW source: **`group_chat_quest`**.

Human wallets live on WTEN (Railway), so PA must credit over HTTP — it cannot write a Neon
balance. Today, if WTEN's `/api/economy/sync-credit` validates `source` against an allowlist,
`group_chat_quest` is rejected and the reward returns `{ok:false}` on PA (reported to the user
as "pending," never silently dropped). This directive makes it land.

## The request PA sends

```
POST {WTEN_BASE_URL}/api/economy/sync-credit
Header: X-Sync-Secret: <shared secret>
{
  "userEmail": "someone@example.com",
  "amounts": { "spirit":"4.0000","essence":"4.0000","matter":"4.0000","substance":"4.0000" },
  "source": "group_chat_quest",
  "idempotencyKey": "group_quest:<paUserId>:<YYYY-MM-DD weekStart>",
  "metadata": { "totalTokens": 16 }
}
```

- `amounts` are per-axis decimal strings; they **scale with engagement** (more circle
  exchanges → larger grant, up to a weekly cap of 6/axis = 24 ESMS).
- `idempotencyKey` is **once per user per week** (`weekStart` is a Monday `YYYY-MM-DD`).
- `metadata.totalTokens` is the summed grant (for any notification copy).

## What to do in WTEN

1. **Whitelist the source.** Add `'group_chat_quest'` wherever `transit_attunement` /
   `agents_yield` are accepted in `/api/economy/sync-credit`. That's the only required change.
2. **Everything else is already correct** — the endpoint already credits the four per-axis
   balances atomically, writes per-axis `token_transactions` rows (NOT `ESMS_BUNDLE`), and
   is idempotent on `idempotencyKey` (200 → `{ok:true,balances}`, repeat → 409 `already_applied`).
3. **Notification (optional, nice-to-have):** on a fresh `group_chat_quest` credit, a bell /
   feed line like _"🌀 Attunement Circle — you earned +{totalTokens} ESMS this week"_ is a nice
   touch. Not required; reuse existing primitives if you add it. Do **not** emit on the 409 replay.
4. **No new migration needed** unless you add a notification type (the credit + ledger path is
   unchanged from PR #480).

## Verify

From PA (after the shared secret is set on both sides), complete a circle and claim, or call:

```
POST /api/agents/weekly-attunement/claim   { "messageCount": 12 }   (authenticated)
```

On WTEN, confirm the user's wallet rose by the scaled amount (e.g. +24 ESMS at 12 exchanges),
four `group_chat_quest` `token_transactions` rows tied to one `idempotencyKey`, and that a repeat
claim that week adds nothing (409).
