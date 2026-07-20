# alchm-fbd — vendored planetary free-body-diagram engine

Vendored from **WhatToEatNext** (`alchm.kitchen`), which is the authoritative
source for ESMS (Spirit / Essence / Matter / Substance).

## Why vendored rather than bridged to this repo's own engine

This repo already has `lib/astrological-dignities-engine.ts`, which computes
ESMS by **multiplying each axis by the sign's elemental quality**:

```ts
spirit_amplification: planetaryCorrespondence.spirit * dignity_multiplier * signQuality.fire
```

WTEN's engine states the opposite axiom, in capitals:

> ESMS values CANNOT be derived from elemental properties (Fire/Water/Earth/Air).
> They MUST be calculated from planetary alchemy values.

The free-body diagram's entire premise is that the **element compass** and the
**ESMS compass** are two independent readings of one sky. Derive one from the
other and the roses collapse: the resultant vector silently becomes a re-plot
of the element vector. The card still renders. It still looks plausible. It
means nothing.

So the engine is vendored whole and the local dignities engine is **not** used
for anything the FBD reads. If you need to reconcile them, that is its own
project — see the port brief, not this file.

## Rules

- **Do not edit these files to fix a local type error.** Fix `adapter.ts`
  instead, or the vendored copy drifts from upstream and the drift is invisible.
- Re-syncing upstream: re-copy, then rewrite `@/` imports to relative. The only
  hand-written files here are `types.ts`, `astrologyUtils.ts` (one extracted
  function), `logger.ts`, `adapter.ts`, and this README.
- `test/alchm-fbd/` is the conformance suite. The reconciliation identity
  (`Σ cards[].esms + totals.unattributed === totals.esms`, day **and** night)
  is the guard that a decomposition actually adds up. Never delete it because
  "the UI doesn't show `unattributed`".
- `sharedAncestry.test.ts` is a drift tripwire against this repo's own
  `lib/planets/*.ts`. If it goes red, decide which side is authoritative before
  editing either — don't patch whichever is convenient.
