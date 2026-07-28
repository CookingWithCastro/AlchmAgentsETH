/**
 * scripts/repair-natal-longitudes.ts
 * ==================================
 *
 * Repair the fabricated `longitude: 0` left in already-stored
 * `user_profiles.natalPositions` rows by commit 28711c06.
 *
 *
 * WHY THIS EXISTS
 * ---------------
 * Every writer of `natalPositions` used to build each body as:
 *
 *     longitude: data?.longitude ?? data?.degrees ?? 0
 *
 * `degrees` (plural) is not a key that exists — stored natal charts carry
 * `degree` (singular) — so the chain always fell through to the literal 0.
 * Measured across all 73 files in `lib/agents/historical/`: 720 planet entries,
 * of which 0 carry `longitude`, 0 carry `degrees`, 0 carry `signDegree`, and 720
 * carry `degree`. Every longitude produced from a stored chart was invented.
 *
 * 0 is not a harmless placeholder. It is a real ecliptic longitude (0°00′ Aries),
 * so it asserts a placement nobody measured; and because 0 is not nullish, any
 * downstream `x ?? longitude ?? y` or `longitude || fallback` stops at it and
 * never reaches the fallback it was written for.
 *
 * Commit 28711c06 fixed the nine WRITE sites (they now delegate to
 * `signDegreeToLongitude` and carry `null` when nothing can be derived). It did
 * not, and could not, touch rows already in Postgres. This script does that.
 *
 *
 * WHAT IT DOES
 * ------------
 * Scans every `user_profiles` row (`natalPositions` is a `Json?` column and is
 * the ONLY column in `prisma/schema.prisma` that holds these arrays — see
 * schema.prisma:1310). For each body in the array it DERIVES the ecliptic
 * longitude from the sign and degree that body already holds, delegating to the
 * canonical `signDegreeToLongitude` in `lib/enhanced-astronomical-calculator.ts`.
 * The sign→longitude arithmetic is deliberately NOT restated here; this repo has
 * been bitten by duplicate implementations in every round of this work.
 *
 * Deriving from data the row already holds is arithmetic. Defaulting is invention.
 * This script only ever does the former: the repaired `longitude` is nothing more
 * than the row's own `sign` + `degree` restated in absolute terms. It adds no
 * information and it never writes a sentinel.
 *
 *
 * WHAT IT WILL NOT DO
 * -------------------
 *   - It will not write anything without `--apply`. The default is a dry run.
 *   - It will not touch a body whose `longitude` is absent (`null`/`undefined`/
 *     missing). That is honest absence, which is the post-fix contract, not a
 *     defect to repair.
 *   - It will not touch a body whose `longitude` is a finite non-zero number.
 *     That is real stored data.
 *   - It will not touch a body whose own sign+degree derive 0 anyway (a genuine
 *     0°00′ Aries placement). Nothing there is distinguishable from a fabrication
 *     and nothing would change, so it is left exactly alone. This is also what
 *     makes the script idempotent by construction.
 *   - It will not invent a value for a body it cannot derive — see the next
 *     section.
 *   - It will not run DDL, create/delete rows, or touch any column other than
 *     `user_profiles.natalPositions`.
 *   - It will not push anything to alchm.kitchen (WTEN) — see CROSS-REPO below.
 *
 *
 * UNDERIVABLE BODIES: LEFT AS-IS, NOT NULLED (and why)
 * ----------------------------------------------------
 * A body can carry the fabricated 0 and still be underivable: no numeric degree,
 * an empty/unrecognised sign, or a degree outside [0, 30). `NatalPosition.longitude`
 * is typed `number | null` (lib/services/agent-action-service.ts:46-58,
 * scripts/run-agent-tick.ts:46-47), so `null` IS representable and would be the
 * honest value. This script still leaves those bodies untouched. Three reasons:
 *
 *  1. Its mandate is DERIVE, not DELETE. Nulling is a second mutation class with
 *     a different risk profile, and it would make the script's change set no
 *     longer equal to "0 → derived" — which is exactly the set the sanity bounds
 *     and the idempotence guarantee below are stated over.
 *  2. An underivable body is a defect at the WRITER, not at this row: it means a
 *     natal record was stored naming a sign the zodiac table does not recognise,
 *     or with no degree at all. Nulling here papers over that; the script instead
 *     reports each one (with `--verbose`) so it can be fixed at the source, where
 *     the sign actually lives. Nulling would also destroy the only evidence that
 *     the population of broken rows exists, so the next run could not measure it.
 *  3. Leaving them costs nothing downstream. `signDegreeToLongitude` is already
 *     case-insensitive (calculator.ts:1228), so "unrecognised sign" means the sign
 *     is genuinely not a zodiac name — and every consumer that recomputes from
 *     sign+degree (e.g. lib/agents/transit-attunement.ts:106-110) is equally stuck
 *     on that row whether the stored longitude is 0 or null.
 *
 * If a later decision is to null them, that is a separate script with its own
 * bound. Do not bolt it onto this one.
 *
 *
 * THE ONE JUDGMENT CALL
 * ---------------------
 * The script treats a stored `longitude === 0` in `natalPositions` as the
 * fabricated sentinel. That is sound because the writer which produced these rows
 * had no other way to emit 0 (both `longitude` and `degrees` were absent from
 * every source chart, so the `?? 0` was the only reachable branch), and because
 * the script declines to change anything when the row's own sign+degree derive 0.
 * The only case where it would overwrite a genuine measurement is an internally
 * INCONSISTENT record — an explicit `longitude: 0` sitting next to a non-Aries
 * sign. No such record is known: 0 of 720 historical bodies carry `longitude` at
 * all, and user-created charts derive it from sign+degree by construction
 * (lib/services/natal-chart-storage.ts:386). `--verbose` prints every such change
 * body-by-body so an operator can eyeball them before `--apply`.
 *
 *
 * SAFETY: WHAT MAKES IT REFUSE
 * ----------------------------
 * All guards are evaluated after the full scan and BEFORE any write.
 *   - No `DATABASE_URL`/`DIRECT_URL` in the environment.
 *   - An unrecognised command-line argument (catches `--max-rows 500`, the space
 *     form, which would otherwise silently fall back to the default).
 *   - `--apply` without `--expect-rows=N`, or `--expect-rows` not matching the
 *     planned row count exactly. This is the "changed population" refusal: you
 *     dry-run, read the number, and pass it back. If the table moved underneath
 *     you between the two runs, the numbers disagree and nothing is written.
 *   - More planned rows than `--max-rows` (default 5000) — a blast-radius ceiling.
 *   - Too many rows whose `natalPositions` is not an array at all
 *     (`MAX_UNPARSEABLE_FRACTION`) — the column does not look like what this
 *     script expects, so it stops rather than guessing.
 *   - Too many repairs derived from a `degree` of exactly 0
 *     (`--max-zero-degree-frac`, default 0.10). The old writers defaulted an
 *     absent degree to 0, so a large share of zero-degree derivations means the
 *     `degree` field is itself unreliable and the repair would launder one
 *     fabrication into another. Investigate the writer first.
 *   - `signDegreeToLongitude` returning something outside [0, 360) — its contract
 *     broken, which invalidates every derivation in the run.
 *   - A planned row that fails the structural invariant: the repaired array must
 *     have the same length and the same keys and the same non-`longitude` values
 *     as the original, differing ONLY in `longitude` fields that were exactly 0.
 *   - A planned row that is not idempotent: re-planning the repaired array must
 *     produce zero further changes. Checked in-process, per row, no DB needed.
 *   - At write time, a row whose stored JSON changed since the scan is skipped
 *     (not overwritten) and counted.
 *
 * Idempotence: after a successful apply, every repaired body carries a non-zero
 * derived longitude, so it no longer matches the `longitude === 0` predicate.
 * Running the script twice is identical to running it once; the second run plans
 * 0 rows. Each row is written as one single-column update, so an aborted run
 * leaves a well-defined partial state that a re-run simply completes.
 *
 *
 * HOW TO RUN IT
 * -------------
 *   # 1. Dry run (default). Writes nothing. Prints what it WOULD change.
 *   bun run scripts/repair-natal-longitudes.ts
 *
 *   # 2. Same, with a body-by-body listing of every proposed change and skip.
 *   bun run scripts/repair-natal-longitudes.ts --verbose
 *
 *   # 3. Apply. N must equal the "rows repairable" count the dry run printed.
 *   bun run scripts/repair-natal-longitudes.ts --apply --expect-rows=N
 *
 *   # Optional: write only the first K planned rows this pass (a cautious first
 *   # apply). Safe because the script is idempotent — re-run to finish the rest.
 *   bun run scripts/repair-natal-longitudes.ts --apply --expect-rows=N --limit=K
 *
 * Reads `DATABASE_URL` (Prisma Accelerate in this repo) or `DIRECT_URL` from the
 * environment, exactly like every other script here. It runs no migrations, so
 * the `--shadow-database-url` hazard in CLAUDE.md does not apply — but do not
 * invent a way to make it apply.
 *
 *
 * CROSS-REPO: WTEN'S COPY NEEDS THE SAME REPAIR
 * ---------------------------------------------
 * `natalPositions` is pushed to alchm.kitchen/WTEN verbatim through
 * `syncAgentToWten` → `POST /api/internal/agent-sync` (lib/wtenClient.ts:72-83),
 * called by scripts/provision-agentic-users.ts:199, scripts/backfill-agent-sync.ts:55
 * and lib/agents/agentic-user-sync.ts:159. So WTEN holds its own copy of the same
 * fabricated zeroes, and THIS SCRIPT DOES NOT FIX THEM.
 *
 * Re-running the existing sync scripts will not fix them either:
 *   - backfill-agent-sync.ts:77 filters `alchmKitchenUserId: null`, so every
 *     already-linked user is skipped and never re-pushed.
 *   - provision-agentic-users.ts:110-112 re-syncs an existing user only when its
 *     `alchmKitchenUserId` is missing.
 * Only `ensureAgenticUserAndSync` (lib/agents/agentic-user-sync.ts:164) pushes
 * unconditionally, and it runs on agent creation, not as a sweep.
 *
 * WTEN therefore needs its own repair — either the equivalent script against its
 * own table, or a deliberate re-push sweep from this side after this script has
 * applied. Neither is in scope here. Do not add a WTEN write to this script
 * without a separate bound and a separate dry run.
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { signDegreeToLongitude } from '../lib/enhanced-astronomical-calculator'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The value this script treats as fabricated. Named, not spelled inline, so it
 * is impossible to read the predicate as "falsy longitude" — it is strictly the
 * number 0, and nothing else (not `null`, not `''`, not the string `'0'`).
 */
const FABRICATED_LONGITUDE = 0

/** Degrees per sign. Used only for range-VALIDATING a stored degree, never to convert one. */
const DEGREES_PER_SIGN = 30

/**
 * Blast-radius ceiling, not an expectation. This script has never been connected
 * to a database, so this number is a guardrail chosen from the shape of the
 * repo (one `user_profiles` row per provisioned agentic user plus real humans —
 * O(10^3)), NOT a measurement of the live table. The dry run prints the true
 * count; raise this with `--max-rows=` only after reading it.
 */
const MAX_ROWS_DEFAULT = 5000

/** Refuse when more than this share of repairs derive from a `degree` of exactly 0. */
const MAX_ZERO_DEGREE_FRACTION_DEFAULT = 0.1

/** Refuse when more than this share of non-empty rows hold a non-array in the column. */
const MAX_UNPARSEABLE_FRACTION = 0.25

/** Rows fetched per page, so a large table does not have to fit in memory at once. */
const PAGE_SIZE = 500

// ---------------------------------------------------------------------------
// Refusal
// ---------------------------------------------------------------------------

/** Thrown by every guard. Always fatal, always before any write. */
class RefusalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RefusalError'
  }
}

function refuse(message: string): never {
  throw new RefusalError(message)
}

// ---------------------------------------------------------------------------
// Pure planning core (no database, no I/O — exported so it can be exercised
// directly against fixtures)
// ---------------------------------------------------------------------------

export type EntryStatus =
  /** Fabricated 0 replaced with the longitude derived from this body's own sign+degree. */
  | 'repaired'
  /** Stored 0 and the body's own sign+degree derive 0 too — genuine 0°00′ Aries, untouched. */
  | 'stored-zero-agrees'
  /** Finite non-zero longitude already present — real data, untouched. */
  | 'stored-longitude-kept'
  /** `null`/`undefined`/missing — honest absence, which is the post-fix contract. Untouched. */
  | 'longitude-absent'
  /** Present but not a finite number (e.g. a string). Not our sentinel. Untouched. */
  | 'longitude-not-a-number'
  /** Carries the fabricated 0 but nothing can be derived from it. Left as-is. */
  | 'underivable'
  /** Array element is not an object at all. Untouched. */
  | 'entry-not-an-object'

export type UnderivableReason =
  | 'no-sign'
  | 'unrecognised-sign'
  | 'no-numeric-degree'
  | 'degree-out-of-range'

export interface EntryOutcome {
  index: number
  planet: string
  status: EntryStatus
  reason?: UnderivableReason
  sign?: string
  degree?: number
  from?: number
  to?: number
  /**
   * True when the repair was derived from a `degree` of exactly 0. The old
   * writers defaulted an absent degree to 0, so these are the repairs most
   * likely to be laundering one fabrication into another.
   */
  fromZeroDegree?: boolean
}

export interface RowPlan {
  changed: boolean
  /** The array to store. Structurally identical to the input except for repaired longitudes. */
  positions: unknown[]
  outcomes: EntryOutcome[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * First value that coerces to a finite number; `null` when there is none.
 *
 * Mirrors the identical private helper at scripts/provision-agentic-users.ts:214,
 * lib/agents/agentic-user-sync.ts:20 and app/api/agents/generate-avatar/route.ts —
 * none of which export it. This is generic numeric coercion, not domain
 * arithmetic; the one thing this file deliberately does NOT restate is the
 * sign→longitude conversion, which is delegated to `signDegreeToLongitude`.
 */
function firstFiniteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Decide, without touching anything, what a single stored `natalPositions` array
 * should become. Pure: the input is never mutated, repaired bodies are shallow
 * copies with `longitude` replaced (spread preserves key order, and `longitude`
 * already exists on the body, so its position in the object is retained).
 */
export function planRow(positions: readonly unknown[]): RowPlan {
  const out: unknown[] = []
  const outcomes: EntryOutcome[] = []
  let changed = false

  positions.forEach((raw, index) => {
    out.push(raw)

    if (!isPlainObject(raw)) {
      outcomes.push({ index, planet: '', status: 'entry-not-an-object' })
      return
    }

    const planet = typeof raw.planet === 'string' ? raw.planet : ''
    const stored = raw.longitude

    if (stored === null || stored === undefined) {
      outcomes.push({ index, planet, status: 'longitude-absent' })
      return
    }
    if (typeof stored !== 'number' || !Number.isFinite(stored)) {
      outcomes.push({ index, planet, status: 'longitude-not-a-number' })
      return
    }
    if (stored !== FABRICATED_LONGITUDE) {
      outcomes.push({ index, planet, status: 'stored-longitude-kept', from: stored })
      return
    }

    // From here on the body carries the fabricated 0. Try to derive a real value.
    const sign = typeof raw.sign === 'string' ? raw.sign.trim() : ''
    const degree = firstFiniteNumber(raw.signDegree, raw.degree)

    if (!sign) {
      outcomes.push({ index, planet, status: 'underivable', reason: 'no-sign' })
      return
    }
    if (degree === null) {
      outcomes.push({ index, planet, status: 'underivable', reason: 'no-numeric-degree', sign })
      return
    }
    // A degree outside [0, 30) is not a within-sign degree. Converting one anyway
    // wraps the body into a NEIGHBOURING sign — i.e. asserts a placement the record
    // does not name. Refuse to derive rather than move the planet.
    if (degree < 0 || degree >= DEGREES_PER_SIGN) {
      outcomes.push({
        index,
        planet,
        status: 'underivable',
        reason: 'degree-out-of-range',
        sign,
        degree,
      })
      return
    }

    const derived = signDegreeToLongitude(sign, degree)
    if (derived === null) {
      outcomes.push({
        index,
        planet,
        status: 'underivable',
        reason: 'unrecognised-sign',
        sign,
        degree,
      })
      return
    }
    if (!Number.isFinite(derived) || derived < 0 || derived >= 360) {
      refuse(
        `signDegreeToLongitude("${sign}", ${degree}) returned ${derived}, which is outside [0, 360). ` +
          `Its contract is broken, so every derivation in this run is suspect. Nothing was written.`
      )
    }
    if (derived === FABRICATED_LONGITUDE) {
      // The record's own sign+degree derive 0 as well (0°00′ Aries). Nothing to
      // repair, nothing distinguishable from a fabrication. Leave it exactly alone.
      outcomes.push({ index, planet, status: 'stored-zero-agrees', sign, degree, from: stored })
      return
    }

    out[index] = { ...raw, longitude: derived }
    changed = true
    outcomes.push({
      index,
      planet,
      status: 'repaired',
      sign,
      degree,
      from: stored,
      to: derived,
      // Plain 0, not FABRICATED_LONGITUDE: this is a within-sign degree, a
      // different quantity that happens to share the value.
      fromZeroDegree: degree === 0,
    })
  })

  return { changed, positions: out, outcomes }
}

/**
 * Structural invariant: the repaired array may differ from the original in
 * `longitude` fields that were exactly 0, and in nothing else. Same length, same
 * bodies, same keys, same sign/degree/house/retrograde. Refuses on any drift.
 */
export function assertOnlyLongitudeChanged(
  before: readonly unknown[],
  after: readonly unknown[],
  rowLabel: string
): void {
  if (before.length !== after.length) {
    refuse(`${rowLabel}: repair changed the body count (${before.length} → ${after.length}).`)
  }
  for (let i = 0; i < before.length; i++) {
    const a = before[i]
    const b = after[i]
    if (!isPlainObject(a) || !isPlainObject(b)) {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        refuse(`${rowLabel}: body ${i} is not an object and was altered.`)
      }
      continue
    }
    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()
    if (keysA.join(' ') !== keysB.join(' ')) {
      refuse(`${rowLabel}: body ${i} gained or lost keys ([${keysA}] → [${keysB}]).`)
    }
    for (const key of keysA) {
      if (key === 'longitude') continue
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        refuse(
          `${rowLabel}: body ${i} field "${key}" changed (${JSON.stringify(a[key])} → ${JSON.stringify(b[key])}).`
        )
      }
    }
    const lonA = a.longitude
    const lonB = b.longitude
    if (JSON.stringify(lonA) === JSON.stringify(lonB)) continue
    if (lonA !== FABRICATED_LONGITUDE) {
      refuse(
        `${rowLabel}: body ${i} longitude changed from a non-zero value (${JSON.stringify(lonA)} → ${JSON.stringify(lonB)}).`
      )
    }
    if (typeof lonB !== 'number' || !Number.isFinite(lonB) || lonB <= 0 || lonB >= 360) {
      refuse(
        `${rowLabel}: body ${i} would be written a longitude of ${JSON.stringify(lonB)}, which is not a real longitude in (0, 360).`
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

interface Options {
  apply: boolean
  verbose: boolean
  expectRows: number | null
  maxRows: number
  maxZeroDegreeFraction: number
  limit: number | null
}

const BOOLEAN_FLAGS = ['--apply', '--verbose', '--help', '-h'] as const
const VALUE_OPTIONS = ['--expect-rows', '--max-rows', '--max-zero-degree-frac', '--limit'] as const

const USAGE = `
Usage:
  bun run scripts/repair-natal-longitudes.ts [options]

  (no options)               Dry run. Writes nothing. Prints what it would change.
  --verbose                  Also list every proposed change and every skip, body by body.
  --apply                    Write. Requires --expect-rows.
  --expect-rows=N            Refuse unless exactly N rows are planned. Take N from the dry run.
  --max-rows=N               Blast-radius ceiling (default ${MAX_ROWS_DEFAULT}).
  --max-zero-degree-frac=F   Refuse above this share of repairs derived from degree 0
                             (default ${MAX_ZERO_DEGREE_FRACTION_DEFAULT}).
  --limit=K                  Write at most K of the planned rows this pass. Safe: idempotent.
  --help, -h                 This text.
`

function parseOptions(argv: readonly string[]): Options | 'help' {
  const opts: Options = {
    apply: false,
    verbose: false,
    expectRows: null,
    maxRows: MAX_ROWS_DEFAULT,
    maxZeroDegreeFraction: MAX_ZERO_DEGREE_FRACTION_DEFAULT,
    limit: null,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return 'help'
    if (arg === '--apply') {
      opts.apply = true
      continue
    }
    if (arg === '--verbose') {
      opts.verbose = true
      continue
    }

    const eq = arg.indexOf('=')
    const name = eq === -1 ? arg : arg.slice(0, eq)
    if (!(VALUE_OPTIONS as readonly string[]).includes(name)) {
      refuse(
        `Unrecognised argument "${arg}".\n` +
          `Known: ${[...BOOLEAN_FLAGS, ...VALUE_OPTIONS.map(o => `${o}=N`)].join(' ')}`
      )
    }
    if (eq === -1) {
      // The space form ("--max-rows 500") would leave the option at its default
      // and silently discard the number. That is exactly the kind of quiet
      // mis-read this script exists to stop, so it is fatal.
      refuse(`"${name}" needs its value attached with "=", e.g. ${name}=100 (got "${arg}").`)
    }
    const raw = arg.slice(eq + 1)
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0) {
      refuse(`"${name}" expects a non-negative number, got "${raw}".`)
    }

    switch (name) {
      case '--expect-rows':
        opts.expectRows = Math.trunc(value)
        break
      case '--max-rows':
        opts.maxRows = Math.trunc(value)
        break
      case '--limit':
        opts.limit = Math.trunc(value)
        break
      case '--max-zero-degree-frac':
        if (value > 1) refuse(`"--max-zero-degree-frac" is a fraction in [0, 1], got "${raw}".`)
        opts.maxZeroDegreeFraction = value
        break
      default:
        refuse(`Unhandled option "${name}".`)
    }
  }

  return opts
}

// ---------------------------------------------------------------------------
// Scan + apply
// ---------------------------------------------------------------------------

interface PlannedRow {
  profileId: string
  userId: string
  email: string | null
  /** Serialisation of the value as read, so a concurrent write can be detected before overwriting. */
  beforeJson: string
  positions: unknown[]
  outcomes: EntryOutcome[]
}

interface ScanTotals {
  rowsExamined: number
  rowsWithNullColumn: number
  rowsWithEmptyArray: number
  rowsWithNonArray: number
  rowsUnchanged: number
  rowsPlanned: number
  bodiesExamined: number
  byStatus: Record<EntryStatus, number>
  byUnderivableReason: Record<UnderivableReason, number>
  repairsFromZeroDegree: number
}

function emptyTotals(): ScanTotals {
  return {
    rowsExamined: 0,
    rowsWithNullColumn: 0,
    rowsWithEmptyArray: 0,
    rowsWithNonArray: 0,
    rowsUnchanged: 0,
    rowsPlanned: 0,
    bodiesExamined: 0,
    byStatus: {
      repaired: 0,
      'stored-zero-agrees': 0,
      'stored-longitude-kept': 0,
      'longitude-absent': 0,
      'longitude-not-a-number': 0,
      underivable: 0,
      'entry-not-an-object': 0,
    },
    byUnderivableReason: {
      'no-sign': 0,
      'unrecognised-sign': 0,
      'no-numeric-degree': 0,
      'degree-out-of-range': 0,
    },
    repairsFromZeroDegree: 0,
  }
}

async function scan(
  prisma: PrismaClient,
  verbose: boolean
): Promise<{ totals: ScanTotals; planned: PlannedRow[] }> {
  const totals = emptyTotals()
  const planned: PlannedRow[] = []

  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await prisma.user_profiles.findMany({
      skip,
      take: PAGE_SIZE,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        userId: true,
        natalPositions: true,
        users: { select: { email: true } },
      },
    })
    if (page.length === 0) break

    for (const row of page) {
      totals.rowsExamined++
      const label = `user_profiles ${row.id}`
      const stored: unknown = row.natalPositions

      if (stored === null || stored === undefined) {
        totals.rowsWithNullColumn++
        continue
      }
      if (!Array.isArray(stored)) {
        totals.rowsWithNonArray++
        if (verbose)
          console.log(`  ? ${label}: natalPositions is ${typeof stored}, not an array — skipped`)
        continue
      }
      if (stored.length === 0) {
        totals.rowsWithEmptyArray++
        continue
      }

      const plan = planRow(stored)
      totals.bodiesExamined += plan.outcomes.length
      for (const outcome of plan.outcomes) {
        totals.byStatus[outcome.status]++
        if (outcome.status === 'underivable' && outcome.reason) {
          totals.byUnderivableReason[outcome.reason]++
        }
        if (outcome.status === 'repaired' && outcome.fromZeroDegree) {
          totals.repairsFromZeroDegree++
        }
      }

      if (!plan.changed) {
        totals.rowsUnchanged++
        continue
      }

      // Guard before this row can ever be queued for a write.
      assertOnlyLongitudeChanged(stored, plan.positions, label)
      const second = planRow(plan.positions)
      if (second.changed) {
        refuse(
          `${label}: the repair is not idempotent — re-planning the repaired array still proposes changes. ` +
            `Nothing was written.`
        )
      }

      totals.rowsPlanned++
      planned.push({
        profileId: row.id,
        userId: row.userId,
        email: row.users?.email ?? null,
        beforeJson: JSON.stringify(stored),
        positions: plan.positions,
        outcomes: plan.outcomes,
      })
    }

    if (page.length < PAGE_SIZE) break
  }

  return { totals, planned }
}

function printScan(totals: ScanTotals, planned: readonly PlannedRow[], verbose: boolean): void {
  console.log('\n--- Scan ---')
  console.log(`  rows examined ............ ${totals.rowsExamined}`)
  console.log(`  rows repairable .......... ${totals.rowsPlanned}`)
  console.log(`  rows skipped ............. ${totals.rowsExamined - totals.rowsPlanned}`)
  console.log(`      natalPositions null .. ${totals.rowsWithNullColumn}`)
  console.log(`      empty array .......... ${totals.rowsWithEmptyArray}`)
  console.log(`      not an array ......... ${totals.rowsWithNonArray}`)
  console.log(`      nothing to repair .... ${totals.rowsUnchanged}`)

  console.log(`\n  bodies examined .......... ${totals.bodiesExamined}`)
  console.log(`      repaired (0 → derived) ... ${totals.byStatus.repaired}`)
  console.log(`          of which from degree 0 ... ${totals.repairsFromZeroDegree}`)
  console.log(`      kept, real longitude ..... ${totals.byStatus['stored-longitude-kept']}`)
  console.log(`      kept, absent (null) ...... ${totals.byStatus['longitude-absent']}`)
  console.log(`      kept, 0 is consistent .... ${totals.byStatus['stored-zero-agrees']}`)
  console.log(`      kept, not a number ....... ${totals.byStatus['longitude-not-a-number']}`)
  console.log(`      kept, not an object ...... ${totals.byStatus['entry-not-an-object']}`)
  console.log(`      left as-is, underivable .. ${totals.byStatus.underivable}`)
  console.log(`          no sign .................. ${totals.byUnderivableReason['no-sign']}`)
  console.log(
    `          unrecognised sign ........ ${totals.byUnderivableReason['unrecognised-sign']}`
  )
  console.log(
    `          no numeric degree ........ ${totals.byUnderivableReason['no-numeric-degree']}`
  )
  console.log(
    `          degree outside [0,30) .... ${totals.byUnderivableReason['degree-out-of-range']}`
  )

  if (!verbose) {
    if (totals.byStatus.underivable > 0 || totals.rowsWithNonArray > 0) {
      console.log('\n  Re-run with --verbose to list the underivable bodies and unparseable rows.')
    }
    return
  }

  console.log('\n--- Proposed changes (body by body) ---')
  for (const row of planned) {
    console.log(`\n  ${row.email ?? row.userId}  (user_profiles ${row.profileId})`)
    for (const o of row.outcomes) {
      if (o.status === 'repaired') {
        console.log(
          `      ✎ ${o.planet || `[${o.index}]`}: ${o.sign} ${o.degree}° → longitude ${o.to}` +
            (o.fromZeroDegree ? '   (derived from degree 0 — check the writer)' : '')
        )
      } else if (o.status === 'underivable') {
        console.log(
          `      · ${o.planet || `[${o.index}]`}: left as-is (${o.reason}${o.sign ? `, sign="${o.sign}"` : ''}${o.degree === undefined ? '' : `, degree=${o.degree}`})`
        )
      }
    }
  }
}

function runGuards(totals: ScanTotals, opts: Options): void {
  const rowsWithContent =
    totals.rowsExamined - totals.rowsWithNullColumn - totals.rowsWithEmptyArray
  if (rowsWithContent > 0) {
    const unparseable = totals.rowsWithNonArray / rowsWithContent
    if (unparseable > MAX_UNPARSEABLE_FRACTION) {
      refuse(
        `${totals.rowsWithNonArray} of ${rowsWithContent} non-empty rows hold a non-array in natalPositions ` +
          `(${(unparseable * 100).toFixed(1)}% > ${(MAX_UNPARSEABLE_FRACTION * 100).toFixed(0)}%). ` +
          `The column does not look like what this script expects. Nothing was written.`
      )
    }
  }

  if (totals.byStatus.repaired > 0) {
    const zeroDegreeShare = totals.repairsFromZeroDegree / totals.byStatus.repaired
    if (zeroDegreeShare > opts.maxZeroDegreeFraction) {
      refuse(
        `${totals.repairsFromZeroDegree} of ${totals.byStatus.repaired} repairs would be derived from a degree of ` +
          `exactly 0 (${(zeroDegreeShare * 100).toFixed(1)}% > ${(opts.maxZeroDegreeFraction * 100).toFixed(0)}%). ` +
          `The old writers defaulted an absent degree to 0, so this repair would launder one fabrication into ` +
          `another. Fix the writer first, or re-run with --max-zero-degree-frac= once you have established the ` +
          `degrees are real. Nothing was written.`
      )
    }
  }

  if (totals.rowsPlanned > opts.maxRows) {
    refuse(
      `${totals.rowsPlanned} rows would change, over the --max-rows ceiling of ${opts.maxRows}. ` +
        `Read the scan above, satisfy yourself that the number is right, then re-run with ` +
        `--max-rows=${totals.rowsPlanned}. Nothing was written.`
    )
  }
}

async function apply(
  prisma: PrismaClient,
  planned: readonly PlannedRow[],
  opts: Options
): Promise<void> {
  const target = opts.limit === null ? planned : planned.slice(0, opts.limit)
  console.log(
    `\n--- Apply --- writing ${target.length} of ${planned.length} planned rows` +
      (opts.limit === null ? '' : ` (--limit=${opts.limit})`)
  )

  let written = 0
  let racedSkips = 0
  const failures: Array<{ profileId: string; message: string }> = []

  for (const row of target) {
    try {
      // Optimistic concurrency: never overwrite a row that moved since the scan.
      const current = await prisma.user_profiles.findUnique({
        where: { id: row.profileId },
        select: { natalPositions: true },
      })
      if (!current) {
        racedSkips++
        console.log(`  ⊘ ${row.profileId}: row disappeared since the scan — skipped`)
        continue
      }
      if (JSON.stringify(current.natalPositions) !== row.beforeJson) {
        racedSkips++
        console.log(`  ⊘ ${row.profileId}: natalPositions changed since the scan — skipped`)
        continue
      }

      await prisma.user_profiles.update({
        where: { id: row.profileId },
        data: { natalPositions: row.positions as Prisma.InputJsonValue },
      })
      written++
    } catch (err) {
      failures.push({
        profileId: row.profileId,
        message: (err instanceof Error ? err.message : String(err)).split('\n')[0],
      })
    }
  }

  console.log(`\n  written .................. ${written}`)
  console.log(`  skipped (changed/gone) ... ${racedSkips}`)
  console.log(`  failed ................... ${failures.length}`)
  for (const f of failures) console.log(`      ✗ ${f.profileId}: ${f.message}`)
  if (planned.length > target.length) {
    console.log(
      `\n  ${planned.length - target.length} planned rows were not attempted (--limit). ` +
        `Re-run the dry run and apply again — the script is idempotent.`
    )
  }
  if (failures.length > 0) process.exitCode = 1
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const parsed = parseOptions(process.argv.slice(2))
  if (parsed === 'help') {
    console.log(USAGE)
    return
  }
  const opts = parsed

  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    refuse('Neither DATABASE_URL nor DIRECT_URL is set. Refusing to guess a database.')
  }
  if (opts.apply && opts.expectRows === null) {
    refuse(
      '--apply requires --expect-rows=N. Run the dry run first, read "rows repairable", and pass that number back.'
    )
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Repair fabricated natal longitudes  —  ${opts.apply ? 'APPLY' : 'DRY RUN'}`)
  console.log('  user_profiles.natalPositions[].longitude: 0 → derived')
  console.log('═══════════════════════════════════════════════════════════')

  const prisma = new PrismaClient()
  try {
    const { totals, planned } = await scan(prisma, opts.verbose)
    printScan(totals, planned, opts.verbose)
    runGuards(totals, opts)

    if (opts.expectRows !== null && opts.expectRows !== totals.rowsPlanned) {
      refuse(
        `--expect-rows=${opts.expectRows} but ${totals.rowsPlanned} rows are planned. The population changed ` +
          `since your dry run (or the number was mistyped). Nothing was written. Re-run the dry run.`
      )
    }

    if (totals.rowsPlanned === 0) {
      console.log('\nNothing to repair. Exiting.\n')
      return
    }

    if (!opts.apply) {
      console.log(
        `\nDry run — nothing written. To apply:\n` +
          `  bun run scripts/repair-natal-longitudes.ts --apply --expect-rows=${totals.rowsPlanned}\n`
      )
      return
    }

    await apply(prisma, planned, opts)
    console.log()
  } finally {
    await prisma.$disconnect()
  }
}

if (import.meta.main) {
  main().catch(err => {
    if (err instanceof RefusalError) {
      console.error(`\nREFUSED: ${err.message}\n`)
    } else {
      console.error('\nFatal:', err)
    }
    process.exit(1)
  })
}
