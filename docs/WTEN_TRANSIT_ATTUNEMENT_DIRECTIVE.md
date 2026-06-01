# WTEN directive — accept & surface `transit_attunement` sky-drop credits

> **Hand this prompt to a Claude session running in the alchm.kitchen (WTEN) repo.**
> It is self-contained; it assumes no memory of the Planetary Agents (PA) work.

## Context

You are in **alchm.kitchen (WTEN)** — a Next.js app on its own **Railway** Postgres
(raw `pg`). WTEN is the **canonical source of truth for human ESMS token wallets**
(Spirit / Essence / Matter / Substance — four per-axis numeric columns).

A sibling app, **Planetary Agents (PA)**, runs an hourly "transit attunement" engine.
When a live transiting planet conjuncts a user's natal point, a degree sprite airdrops
ESMS to that user. PA was just fixed so that **human** airdrops are no longer written to
PA's own DB — they are sent to **you** over the existing authenticated sync endpoint:

```
POST {WTEN_BASE_URL}/api/economy/sync-credit
Header: X-Sync-Secret: <shared secret>
```

PA already does this exact pattern for daily agent yield (`source: 'agents_yield'`).
This directive adds first-class support for the **new `source: 'transit_attunement'`**,
so the airdrop lands on the wallet **and** is surfaced to the user.

PA-side references (for contract only — do not edit, they live in the other repo):

- `lib/agents/transit-attunement.ts` — the HUMAN branch calls `syncCreditToAlchm(...)`.
- `lib/alchm-credit-sync.ts` — the client (request/response shape below).

## The exact request PA sends

```jsonc
// POST /api/economy/sync-credit   (header: X-Sync-Secret: <secret>)
{
  "userEmail": "someone@example.com", // resolve the wallet by THIS email
  "amounts": {
    // per-axis, decimal strings (4 dp)
    "spirit": "10.0000",
    "essence": "10.0000",
    "matter": "10.0000",
    "substance": "10.0000",
  },
  "source": "transit_attunement", // NEW source to accept
  "idempotencyKey": "attune:human:<paUserId>:<degreeAgentId>:<YYYY-MM-DD>",
  "metadata": {
    // free-form context for feed/bell copy
    "planet": "Sun",
    "sign": "Gemini",
    "degree": 8, // already rounded to an int
    "totalTokens": 40, // sum of the four axes
    "degreeAgentId": "planetary-sun-gemini-8",
  },
}
```

## Responses PA's client requires

PA calls `await response.json()` **before** checking status, so **every** response
(including 409) must have a valid JSON body.

| Status | Body PA expects                                                                                              | PA interpretation                                          |
| ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------ |
| `200`  | `{ "ok": true, "balances": { "spirit", "essence", "matter", "substance" } }` (post-credit balances, numbers) | success; balances are read                                 |
| `409`  | any JSON, e.g. `{ "ok": false, "reason": "already_applied" }`                                                | idempotency hit → treated as **success**, no double credit |
| `404`  | `{ "error": "user_not_found" }`                                                                              | non-agentic email absent (see provisioning rule)           |
| `401`  | `{ "error": "Unauthorized" }`                                                                                | bad/missing `X-Sync-Secret`                                |
| other  | `{ "message"                                                                                                 | "error": "..." }`                                          | logged as failure; PA throws → retries next hour |

> A 409 that returns **no** `balances` is exactly what PA's idempotency test asserts —
> keep 200 (with balances) and 409 (without) distinguishable.

## What you must implement / verify in WTEN

1. **Accept the new source.** If `/api/economy/sync-credit` validates `source` against
   an allowlist, add `'transit_attunement'`. If it accepts any string, just confirm it
   isn't rejected. Mirror how `'agents_yield'` already flows through.

2. **Credit the four per-axis balances atomically** from `amounts` (parse the decimal
   strings). One DB transaction; never partial.

3. **token_type CHECK constraint.** `token_transactions.token_type` is
   `CHECK (token_type IN ('Spirit','Essence','Matter','Substance'))`. Write **one ledger
   row per axis** with the matching type. PA no longer sends `'ESMS_BUNDLE'` (that value
   was the bug) — if any old code path still inserts it for this source, fix it.

4. **Idempotency on `idempotencyKey` alone** (it already encodes user+degree+day).
   First time → 200 + credit; repeat → 409 `already_applied`, **no second credit**.
   Use a unique index / upsert-guard on the key.

5. **Provisioning rule (confirm existing behavior):** auto-provision only
   `*@agentic.alchm.kitchen` emails; a real human email that doesn't exist → `404`.
   (PA surfaces 404s as errors and retries, so a missing human is loud, not silent.)

6. **Surface the airdrop to the user — this is the main new UX.** When
   `source === 'transit_attunement'` and the credit is freshly applied (not a 409),
   emit **both**:
   - a **community feed event**, and
   - a **bell / in-app notification**,
     using `metadata`. Suggested copy:
     > 🌠 **Sky Drop** — your **{planet}** transit at **{sign} {degree}°** airdropped
     > **+{totalTokens} ESMS**.

   Reuse whatever feed/notification primitives `agents_yield` or other credit sources use;
   do not invent a parallel system. Do **not** emit the feed/bell on a 409 replay.

7. **(Recommended) Expose a balance read for PA's verifier:**
   `GET /api/economy/balance?email=<email>` gated by the same `X-Sync-Secret`, returning
   `{ "balances": { "spirit", "essence", "matter", "substance" } }`. PA's dry-run
   (`scripts/test-human-attunement.ts`) will use it for a numeric before/after delta if
   present, and silently skips it if not — so it's optional but makes verification crisp.

8. **Secret parity.** The value PA puts in `X-Sync-Secret` (`ALCHM_KITCHEN_SYNC_SECRET`
   on PA) must equal the secret WTEN validates. Confirm it's set in WTEN's Railway env and
   matches PA's. (As of this writing PA's secret is unset in at least one environment —
   coordinate the shared value so both sides agree.)

## Gotchas

- **JSON body on 409.** PA parses the body before reading the status — a bare 409 with an
  empty body breaks it.
- **`degree` is already an integer** (rounded by PA); `totalTokens` is the pre-summed total.
  Use them directly for copy; don't re-derive from `amounts` unless you want exactness.
- **Atomic four-axis update.** A single combined `amount` row is wrong (that was the old
  PA bug); WTEN's model is four columns + per-axis ledger rows.
- **Feed/bell only on fresh credit**, never on the 409 replay, or users get duplicate
  "Sky Drop" notifications every hour the engine re-checks.
- **Don't broaden auto-provisioning.** Keep it to `*@agentic.alchm.kitchen`; real humans
  must pre-exist (404 otherwise) — PA relies on that to detect stranded credits.

## Verify

**On PA** (after the secret is wired on both sides):

```bash
bun --conditions react-server scripts/test-human-attunement.ts
```

Expect: `summary.attunements === 1`, `errors === 0`; the duplicate-key re-POST returns
`409` (PA prints "Duplicate key → 409 … no double credit"); run 2 is a no-op.

**On WTEN**, after that run, confirm for the probe user `transit-attune-probe@agentic.alchm.kitchen`:

1. **Balance** increased by **+40 ESMS** (10 per axis) — via your `GET /api/economy/balance`
   or a direct DB check.
2. **Ledger:** four `token_transactions` rows (Spirit/Essence/Matter/Substance), `source_type`
   `transit_attunement`, tied to the one `idempotencyKey` — and re-POSTing the same key adds
   **no** new rows (409).
3. **Feed + bell:** one community feed event and one bell notification with the "🌠 Sky Drop"
   copy; none added on the 409 replay.

(The probe user is a throwaway `@agentic` account; it accrues +40 ESMS per PA dry-run since
each run uses a fresh idempotencyKey. Safe to ignore or periodically zero.)
