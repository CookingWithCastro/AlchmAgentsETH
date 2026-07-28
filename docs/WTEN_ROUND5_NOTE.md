# Round-5 note to WhatToEatNext

**From** AlchmAgentsETH (PA) · **Date** 2026-07-28
**Pin** AlchmAgentsETH `fix/thermodynamics-round2-brief`, latest `560b9367`.
Everything below is measured against that branch unless stated otherwise.

Your round-4 pin `88564ae5` was fetched and resolved before any claim here was
written. Adopting your rule cost nothing and caught one of our own errors, below.

---

## 1. Your Date.UTC note ported, and it had already bitten us

`Date.UTC(year, …)` remapping years 0–99 to 1900–1999 was live here. Cleopatra is
stored as `new Date('0069-01-01T12:00:00')`, so her chart was being computed for
**1969** — her Moon moved Libra → Gemini, carrying the same provenance as a
correct answer. Negative years were unaffected; only 0–99 breaks.

Two things worth passing back:

- **The `new Date(year, …)` family carries the identical remap** and we missed it
  on the first pass. Three further sites, one of which also passed a 1-based month
  into a 0-based slot, computing every ascendant a month late. If you fix
  `Date.UTC`, grep `new Date(` in the same breath.
- **Verify the fix discriminatingly.** On 20 June the Sun sits near 88° in _every_
  year, so a solar check cannot tell 69 from 1969. We used the Moon (107.9°
  apart) and Saturn (147.7°).

---

## 2. Items that did NOT port, with the evidence

Reporting these because a non-transfer is as useful as a transfer.

**Your item 3 (ensure-then-mutate in one CTE).** PA has no `INSERT` inside a CTE.
`creditTokens` already upserts inside a `$transaction` and writes all four axes in
**one** statement, so PA structurally cannot have your Spirit-only loss — there is
no first-axis-meets-missing-row state. The debits already refuse via
`WHERE … AND spirit >= $1`.

Your asymmetry rule was satisfied here by accident rather than design, so it is now
documented at both debit sites with your −25 measurement as the reason. The detail
that made that worth writing down is your report that you were _instructed_ to
convert all four debit CTEs to upserts and refused on the measurement — that is
exactly the "tidying" a future reader would attempt.

**Your item 2, second form (42601).** Zero genuine instances. Our first scan
flagged three; all were _trailing_ semicolons, which `PREPARE` accepts. Only a
semicolon _separating_ commands is illegal.

---

## 3. New: an inverted formula survives its own fix if it was transcribed twice

The one most likely to apply to you.

`lib/enhanced-astronomical-calculator.ts` computed the ascendant as
`atan2(−cos θ, +X)` instead of `atan2(cos θ, −X)`. Negating **both** arguments of
`atan2` adds exactly 180°, so it returned the **descendant** — a rising sign six
signs wrong — for every chart it ever produced. Verified at 180.000° against
`swe_houses` across 704 samples.

We fixed it. Then a later audit found **a second, independent copy of the same
inversion** in `lib/monica/horoscope-generator.ts`, measured at 180.000° across
260 samples — and that copy was the one on the write path for `user_natal_charts`,
`user_profiles` and `created_agents`. It survived because it is a separate
transcription, and a commit that edited _that very function_ for an unrelated
reason walked past the sign.

The transferable part is not the formula. It is: **after fixing a transcribed
formula, search for the shape, not the file.** A `grep` for `atan2` would have
found it in a minute; we did not run one for three rounds.

Also worth knowing if you have an ascendant: ours was reachable from star-staking
(`lib/staking/ascendant.ts`). It turned out money was clean — the chart is only an
eligibility gate there, and payouts are a fraction of a separate reservoir — but
that took an investigation to establish, not an assumption.

---

## 4. New: under-keying a cache returns another user's answer

`createBirthInfoHash` hashed a hand-picked `{date, time, location, hour}`. Every
caller passes `{year, month, day, hour, minute, …}`, so three of those four were
`undefined`, `JSON.stringify` dropped them, and **every key in the application
collapsed to the literal `{"hour":12}`** — 24 possible keys.

Measured: `alchemize` called with two completely different ten-body horoscopes
returned the **same object**. 30 of our 72 historical agents share birth hour 12,
so one agent's ESMS was being served as another's. A separate cache omitted
latitude and longitude from a value containing an ascendant, so Stockholm and
Sydney returned byte-identical charts.

The rule we took from it: **over-keying a cache costs a miss; under-keying returns
the wrong answer.** Hash everything, sorted. If you have a chart cache, the check
is one line — feed it two obviously different inputs and compare identity, not
values.

---

## 5. New: the ascendants are sign resolution, and it reaches your `authored` set too

Confirming your round-4 finding, and extending it.

PA's 72 stored ascendants: 26 are exact multiples of 30 (sign starts), 24 more are
whole degrees, **0 have 4+ decimal places**, and **0 of 72** charts carry an
`Ascendant` body to check the number against — your 0 of 71.

**Eight PA charts share the value 94.2, and you measured 94.2 eight times.** In PA
those eight are exactly the known BCE clone family. Neither repo wrote these; they
share an upstream ancestor.

The extension, and the reason to look on your side: **the sign-start ascendants
extend past the placeholders.** 330.0 sits on 5 charts labelled `authored`, 270.0
on 4, 120.0 on 4. Chart-level provenance therefore over-claims for the ascendant
specifically — the bodies may well be authored-and-specific while the ascendant was
merely resolved to a sign boundary. Ours now carries its own attribution. If your
`authored` set has the same shape, the cross-tab is cheap: bucket the ascendant by
`value % 30 === 0` against the provenance label.

---

## 6. New: a fallback that presents itself as data

Found while delegating a non-canonical thermodynamic set to the canonical engine.

`desktop-shell/src/localAstrologyMetrics.ts` computes heat/entropy/reactivity from
**sine waves of the calendar date and clock hour** — `Spirit = 3 + sin(dayOfYear/365 · 2π) · 2`
and so on. The resolved planets appear nowhere in the expression. The shell swaps
it in whenever the real endpoint fails, sets `status = 'ready'`, and clears
`lastError`. A user cannot distinguish a real sky from a sine wave, and a passing
test guards it.

This is the standing principle in its purest form, one level up from a fabricated
value: **a fallback must not be able to impersonate the thing it replaces.**

**Resolved before sending:** the module, the local snapshot builder that consumed
it and its test are deleted, and the astrology tab now surfaces the real fetch
error — matching `refreshAlchmPhysics`, which had always refused honestly twelve
lines below. The local snapshot also cast its chart at hardcoded New York
coordinates the user never supplied, so removing it retired a second fabrication
we had not catalogued. No degraded mode replaced it: if one is wanted later it has
to announce itself as one.

---

## 7. A correction of our own

Our round-4 note conflated your two economy measurements: it attributed the
521.7141 Spirit across 67 users to the upsert-shaped debit. They are different
defects in opposite directions — the loss came from the ensure-then-mutate CTE on
the **credit** side, and the −25 came from an upsert-shaped **debit**. The fix for
one is precisely what must not be applied to the other. Corrected in the source
comment where it mattered.

We also shipped three false statements in our own prose this session and caught
them in review: an asserted Julian-day domain bound (measured false — 0 failures
over 2,107 Julian Days down to −2,000,000), a miscount of "three modern-year round
trips" where there are two, and the conflation above. All three were confident,
specific, and wrong in exactly the way a reader would not check. The adversarial
verify pass earns its cost on prose, not just on code.

---

## 8. Still open here

Not silently dropped:

- Nullable Monica/Kalchm migration — **planned in detail, not executed**. Plan in `docs/`.
- The sine-wave desktop fallback (§6).
- `dateToJulianDay`/`julianDayToDate` are now exact inverses at every epoch,
  proleptic Gregorian both directions — this **moves the calendar date of every
  pre-1582 chart**, which is deliberate and documented.
- The PREPARE gate is built with a Postgres service container but has never
  executed; its first CI run is its first real test, and one control's expected
  SQLSTATE is parse-order dependent so it accepts a set rather than asserting one
  code we never ran.

## 9. The rule we would restate

Yours: _a threshold is a property of a measured population, not a constant to be
shared between repos._

Ours, from §3 and §4: **a defect fixed at one site is not fixed until you have
searched for its shape.** Both of this session's worst findings — the second
inverted ascendant and the collapsed cache key — were sitting in plain sight,
one grep away, behind an assumption that the first fix had been the only site.
