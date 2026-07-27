/**
 * Guards two invariants of the ESMS debit path in `lib/services/economyService.ts`:
 *
 *  1. ATOMICITY — a balance debit and the `token_transactions` rows that record
 *     it commit together or not at all. Before this was fixed, the debit CTE ran
 *     via `prisma.$queryRawUnsafe` and committed on its own, and the ledger
 *     inserts followed as separate autocommit statements. A crash or a failing
 *     insert left tokens spent with nothing recording the spend.
 *
 *  2. DEBIT vs CREDIT ASYMMETRY — a credit for a user with no `token_balances`
 *     row CREATES it; a debit for a missing row REFUSES. Creating a row in order
 *     to debit it invents a negative balance and lets someone spend tokens they
 *     never held. The sister repo measured an upsert-shaped debit of 25 against a
 *     missing row producing spirit = -25.0000.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT.
 * There is no database here. `FakeDb` below models the two SQL statements the
 * debits issue, and the transaction boundary, in memory. So these tests prove
 * the SERVICE's control flow and statement shape — that the debit refuses on a
 * missing row, that it never issues an upsert, and that a failing ledger insert
 * unwinds the balance movement because both went through the same `tx` handle.
 * They do NOT prove PostgreSQL semantics, Prisma's real transaction behaviour,
 * or that the schema matches. `FakeDb.$queryRawUnsafe` throws on any statement
 * it does not recognise, so a rewrite of the debit into an `INSERT ... ON
 * CONFLICT` upsert fails these tests loudly rather than passing silently.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// In-memory stand-in for the two tables the debit path touches.
// ---------------------------------------------------------------------------

interface BalanceRow {
  userId: string
  spirit: number
  essence: number
  matter: number
  substance: number
  lastDailyClaimAt: Date | null
  lastDailyClaimAgentsAt: Date | null
}

interface LedgerRow {
  transactionGroupId: string
  userId: string
  tokenType: string
  amount: number
}

function toRawShape(row: BalanceRow) {
  // Raw-SQL `RETURNING *` gives snake_case columns; the service reads them as such.
  return {
    user_id: row.userId,
    spirit: row.spirit,
    essence: row.essence,
    matter: row.matter,
    substance: row.substance,
    last_daily_claim_at: row.lastDailyClaimAt,
    last_daily_claim_agents_at: row.lastDailyClaimAgentsAt,
  }
}

/** One isolation layer: either the committed state, or a transaction's staging copy. */
interface Store {
  balances: Map<string, BalanceRow>
  ledger: LedgerRow[]
}

function emptyStore(): Store {
  return { balances: new Map(), ledger: [] }
}

function cloneStore(s: Store): Store {
  return {
    balances: new Map([...s.balances].map(([k, v]) => [k, { ...v }] as const)),
    ledger: [...s.ledger],
  }
}

class FakeDb {
  /**
   * CRITICAL TO THIS TEST'S VALUE: the root client and a transaction's client
   * write to DIFFERENT layers. `committed` is what survives a rollback; a
   * `$transaction` callback gets a client over a staging copy that is only
   * merged back on success. That is what makes the rollback assertions able to
   * catch the original defect — a ledger insert issued on the ROOT `prisma`
   * handle (autocommit) lands in `committed` and is NOT unwound, exactly as it
   * would not be in Postgres.
   */
  committed: Store = emptyStore()

  /** Set on a test to make the Nth (1-indexed) ledger insert blow up. */
  failLedgerInsertOnCall: number | null = null
  private ledgerInsertCalls = 0

  /** Statements that reached $queryRawUnsafe, whitespace-normalised. */
  seenSql: string[] = []

  /**
   * Which handle issued each statement: 'tx' for the staged transaction layer,
   * 'root' for the autocommit one. Without this, a test can only see THAT a
   * statement ran, not whether it ran inside the transaction — which is the
   * entire property being asserted.
   */
  seenBy: Array<{ handle: 'tx' | 'root'; sql: string }> = []

  get balances() {
    return this.committed.balances
  }
  get ledger() {
    return this.committed.ledger
  }

  reset() {
    this.committed = emptyStore()
    this.failLedgerInsertOnCall = null
    this.ledgerInsertCalls = 0
    this.seenSql = []
    this.seenBy = []
  }

  seedBalance(userId: string, amounts: Partial<Omit<BalanceRow, 'userId'>>) {
    seedInto(this.committed, userId, amounts)
  }

  // --- Prisma client surface, bound to a given isolation layer ---------------

  private clientFor(store: Store) {
    const self = this
    const handle: 'tx' | 'root' = store === self.committed ? 'root' : 'tx'
    return {
      $transaction: (fn: any) => self.$transaction(fn),

      async $queryRawUnsafe(sql: string, ...params: any[]) {
        const s = sql.replace(/\s+/g, ' ').trim()
        self.seenSql.push(s)
        self.seenBy.push({ handle, sql: s })

        if (/UPDATE token_balances/i.test(s)) {
          // If the debit ever grows an upsert, fail here rather than model it.
          if (/ON CONFLICT/i.test(s) || /INSERT INTO token_balances/i.test(s)) {
            throw new Error(
              `DEBIT BECAME AN UPSERT — a debit for a missing balance row must refuse, ` +
                `not create one. Offending statement: ${s}`
            )
          }
          for (const axis of ['spirit', 'essence', 'matter', 'substance']) {
            if (!new RegExp(`${axis} >= \\$`, 'i').test(s)) {
              throw new Error(`DEBIT LOST ITS "${axis} >=" SUFFICIENCY GUARD. Statement: ${s}`)
            }
          }

          const [spirit, essence, matter, substance, userId] = params as [
            number,
            number,
            number,
            number,
            string,
          ]
          const row = store.balances.get(userId)
          // No row matches the WHERE clause => zero rows updated. This is the
          // missing-row case AND the insufficient-funds case, identically.
          if (!row) return []
          if (
            row.spirit < spirit ||
            row.essence < essence ||
            row.matter < matter ||
            row.substance < substance
          ) {
            return []
          }
          row.spirit -= spirit
          row.essence -= essence
          row.matter -= matter
          row.substance -= substance
          return [toRawShape(row)]
        }

        if (/INSERT INTO token_transactions/i.test(s)) {
          self.noteLedgerInsert()
          const [transactionGroupId, userId, tokenType, amount] = params as [
            string,
            string,
            string,
            number,
          ]
          store.ledger.push({ transactionGroupId, userId, tokenType, amount })
          return []
        }

        throw new Error(`Unrecognized SQL reached the fake database: ${s}`)
      },

      tokenBalance: {
        async upsert({ where, create, update }: any) {
          const existing = store.balances.get(where.userId)
          if (!existing) {
            seedInto(store, where.userId, {
              spirit: Number(create.spirit ?? 0),
              essence: Number(create.essence ?? 0),
              matter: Number(create.matter ?? 0),
              substance: Number(create.substance ?? 0),
            })
            return { ...store.balances.get(where.userId)! }
          }
          for (const axis of ['spirit', 'essence', 'matter', 'substance'] as const) {
            const op = update?.[axis]
            if (op && typeof op === 'object' && 'increment' in op) {
              existing[axis] += Number(op.increment)
            }
          }
          return { ...existing }
        },
      },

      tokenTransaction: {
        async create({ data }: any) {
          self.noteLedgerInsert()
          store.ledger.push({
            transactionGroupId: data.transactionGroupId,
            userId: data.userId,
            tokenType: data.tokenType,
            amount: Number(data.amount),
          })
          return data
        },
      },

      users: {
        // No email => creditTokens skips the fire-and-forget alchm.kitchen sync.
        findUnique: async () => null,
      },
    }
  }

  private noteLedgerInsert() {
    this.ledgerInsertCalls += 1
    if (this.failLedgerInsertOnCall === this.ledgerInsertCalls) {
      throw new Error('simulated ledger insert failure')
    }
  }

  /** The root (autocommit) handle — what `prisma.*` resolves to. */
  root() {
    return this.clientFor(this.committed)
  }

  async $transaction(fn: (tx: any) => Promise<unknown>) {
    const staged = cloneStore(this.committed)
    const result = await fn(this.clientFor(staged))
    // Reached only when the callback resolved: COMMIT. A throw propagates and
    // `staged` is dropped on the floor, which is the ROLLBACK.
    this.committed = staged
    return result
  }
}

function seedInto(store: Store, userId: string, amounts: Partial<Omit<BalanceRow, 'userId'>>) {
  store.balances.set(userId, {
    userId,
    spirit: 0,
    essence: 0,
    matter: 0,
    substance: 0,
    lastDailyClaimAt: null,
    lastDailyClaimAgentsAt: null,
    ...amounts,
  })
}

const { fakeDb } = vi.hoisted(() => {
  // Class is redeclared inside the hoisted factory scope by reference at runtime;
  // we only need a stable object identity here, populated below.
  return { fakeDb: { current: null as any } }
})

vi.mock('@/lib/db', () => ({
  // `prisma.*` is the ROOT (autocommit) handle. Anything written through it is
  // committed immediately and survives a later rollback — which is precisely
  // what made the pre-fix ledger inserts unsafe.
  prisma: new Proxy(
    {},
    {
      get(_t, prop) {
        const db = fakeDb.current
        if (!db) throw new Error('fake db not installed')
        if (prop === '$transaction') return db.$transaction.bind(db)
        const rootClient = db.root()
        const value = rootClient[prop as keyof typeof rootClient]
        return typeof value === 'function' ? (value as any).bind(rootClient) : value
      },
    }
  ),
}))

const db = new FakeDb()
fakeDb.current = db

const USER = 'user-with-a-balance'
const GHOST = 'user-with-no-balance-row'

// unified_chat costs { Spirit: 5, Essence: 2 }
const CHAT_COST = { spirit: 5, essence: 2 }

let EconomyService: typeof import('@/lib/services/economyService').EconomyService

beforeEach(async () => {
  db.reset()
  if (!EconomyService) {
    ;({ EconomyService } = await import('@/lib/services/economyService'))
  }
})

function axes(userId: string) {
  const row = db.balances.get(userId)
  return row ? [row.spirit, row.essence, row.matter, row.substance] : null
}

describe('debit refuses for a missing balance row (credit/debit asymmetry)', () => {
  it('debitOperation returns insufficient_funds and creates NO row', async () => {
    expect(db.balances.has(GHOST)).toBe(false)

    const result = await EconomyService.debitOperation(GHOST, 'unified_chat')

    expect(result.ok).toBe(false)
    expect((result as any).reason).toBe('insufficient_funds')
    // The defect this guards: an upsert-shaped debit would have created a row
    // holding spirit = -5. Nothing may exist here.
    expect(db.balances.has(GHOST)).toBe(false)
    expect(db.ledger).toHaveLength(0)
  })

  it('debitDynamic returns insufficient_funds and creates NO row', async () => {
    const result = await EconomyService.debitDynamic(GHOST, { Spirit: 25 })

    expect(result.ok).toBe(false)
    expect((result as any).reason).toBe('insufficient_funds')
    expect(db.balances.has(GHOST)).toBe(false)
    expect(db.ledger).toHaveLength(0)
  })

  it('a debit never drives any axis negative, even when only one axis is short', async () => {
    // Plenty of Spirit, not enough Essence for unified_chat (needs 5 / 2).
    db.seedBalance(USER, { spirit: 100, essence: 1, matter: 100, substance: 100 })

    const result = await EconomyService.debitOperation(USER, 'unified_chat')

    expect(result.ok).toBe(false)
    // All-or-nothing: the Spirit side must not have been taken either.
    expect(axes(USER)).toEqual([100, 1, 100, 100])
    expect(db.ledger).toHaveLength(0)
  })

  it('a sufficient debit succeeds and leaves every axis non-negative', async () => {
    db.seedBalance(USER, { spirit: 5, essence: 2, matter: 0, substance: 0 })

    const result = await EconomyService.debitOperation(USER, 'unified_chat')

    expect(result.ok).toBe(true)
    expect(axes(USER)).toEqual([0, 0, 0, 0])
    for (const v of axes(USER)!) expect(v).toBeGreaterThanOrEqual(0)
  })
})

describe('a credit for a missing balance row DOES create it', () => {
  it('creditTokens creates the row — the deliberate other half of the asymmetry', async () => {
    expect(db.balances.has(GHOST)).toBe(false)

    await EconomyService.creditTokens(
      GHOST,
      { spirit: 3, essence: 2, matter: 1, substance: 1 },
      'agents_yield',
      'test credit'
    )

    expect(db.balances.has(GHOST)).toBe(true)
    expect(axes(GHOST)).toEqual([3, 2, 1, 1])
    // A credit can only ever raise a balance from 0 — never below it.
    for (const v of axes(GHOST)!) expect(v).toBeGreaterThanOrEqual(0)
  })
})

describe('the debit and its ledger rows commit together or not at all', () => {
  it('debitOperation: a failing ledger insert unwinds the balance movement', async () => {
    db.seedBalance(USER, { spirit: 100, essence: 100, matter: 100, substance: 100 })
    // unified_chat writes 2 ledger rows (Spirit, Essence); blow up on the second
    // so the balance is already decremented and one row is already staged.
    db.failLedgerInsertOnCall = 2

    await expect(EconomyService.debitOperation(USER, 'unified_chat')).rejects.toThrow(
      'simulated ledger insert failure'
    )

    // If the debit committed on its own (the pre-fix behaviour), the balance
    // would read [95, 98, 100, 100] with an incomplete ledger behind it.
    expect(axes(USER)).toEqual([100, 100, 100, 100])
    expect(db.ledger).toHaveLength(0)
  })

  it('debitDynamic: a failing ledger insert unwinds the balance movement', async () => {
    db.seedBalance(USER, { spirit: 50, essence: 50, matter: 50, substance: 50 })
    // Fail on the SECOND of two rows, not the first: a first-row failure would
    // also pass if the inserts ran on the root autocommit handle, because
    // nothing had been written yet. Failing mid-way is what distinguishes them.
    db.failLedgerInsertOnCall = 2

    await expect(EconomyService.debitDynamic(USER, { Spirit: 7, Essence: 3 })).rejects.toThrow(
      'simulated ledger insert failure'
    )

    expect(axes(USER)).toEqual([50, 50, 50, 50])
    expect(db.ledger).toHaveLength(0)
  })

  it('on success the ledger records exactly the axes that were debited', async () => {
    db.seedBalance(USER, { spirit: 100, essence: 100, matter: 100, substance: 100 })

    const result: any = await EconomyService.debitOperation(USER, 'unified_chat')

    expect(result.ok).toBe(true)
    expect(axes(USER)).toEqual([95, 98, 100, 100])
    expect(db.ledger).toHaveLength(2)
    expect(db.ledger.map(r => [r.tokenType, r.amount])).toEqual([
      ['Spirit', -CHAT_COST.spirit],
      ['Essence', -CHAT_COST.essence],
    ])
    // Every ledger row is tagged with the group id handed back to the caller,
    // which create-agent stores for its refund path.
    for (const row of db.ledger) expect(row.transactionGroupId).toBe(result.transactionGroupId)
  })

  it('the debit statement and its ledger inserts share ONE transaction handle', async () => {
    db.seedBalance(USER, { spirit: 100, essence: 100, matter: 100, substance: 100 })
    const seen: string[] = []
    const spy = vi.spyOn(db, '$transaction')

    await EconomyService.debitOperation(USER, 'unified_chat')

    expect(spy).toHaveBeenCalledTimes(1)
    seen.push(...db.seenSql)
    expect(seen.filter(s => /UPDATE token_balances/i.test(s))).toHaveLength(1)
    expect(seen.filter(s => /INSERT INTO token_transactions/i.test(s))).toHaveLength(2)

    // The load-bearing assertion, and the one this test is NAMED for: every
    // statement went through the TRANSACTION handle. Counting statements alone
    // passes even when the ledger inserts run on the root autocommit handle,
    // which is exactly the pre-fix shape — so without this the name was a claim
    // the body did not make.
    const onRoot = db.seenBy.filter(e => e.handle === 'root')
    expect(
      onRoot.map(e => e.sql),
      'these statements escaped the transaction and would survive its rollback'
    ).toEqual([])
    expect(db.seenBy.filter(e => /INSERT INTO token_transactions/i.test(e.sql))).toHaveLength(2)
    expect(db.seenBy.every(e => e.handle === 'tx')).toBe(true)
    spy.mockRestore()
  })
})

describe('return contract relied on by callers', () => {
  // app/api/agents/unified/route.ts:105, app/api/langchain-agent/route.ts:49,
  // app/api/agents/[slug]/reset-evs/route.ts:67, app/api/create-agent/route.ts:330
  // all branch on `.ok` and then read `.balances`; create-agent also reads
  // `.transactionGroupId`. app/api/unified-multi-agent-chat/route.ts:243 branches
  // on `.ok` for debitDynamic.
  it('failure shape is exactly { ok: false, reason: "insufficient_funds" }', async () => {
    const result: any = await EconomyService.debitOperation(GHOST, 'unified_chat')
    expect(result).toEqual({ ok: false, reason: 'insufficient_funds' })
  })

  it('success shape carries ok, transactionGroupId and the six balance fields', async () => {
    db.seedBalance(USER, { spirit: 10, essence: 10, matter: 10, substance: 10 })
    const result: any = await EconomyService.debitOperation(USER, 'unified_chat')

    expect(result.ok).toBe(true)
    expect(typeof result.transactionGroupId).toBe('string')
    expect(Object.keys(result.balances).sort()).toEqual([
      'essence',
      'lastDailyClaimAgentsAt',
      'lastDailyClaimAt',
      'matter',
      'spirit',
      'substance',
    ])
    expect(result.balances.spirit).toBe(5)
    expect(result.balances.essence).toBe(8)
    expect(result.balances.lastDailyClaimAt).toBeNull()
  })

  it('an unknown operation key still throws rather than debiting zero', async () => {
    await expect(EconomyService.debitOperation(USER, 'not_a_real_operation')).rejects.toThrow(
      /Invalid operation key/
    )
  })
})

/**
 * A second, independent layer that does not depend on FakeDb's fidelity at all:
 * it reads the source. Narrower than the behavioural tests (it is text
 * matching, and can be defeated by aliasing `prisma`), but it fails on the
 * literal edit that reintroduces either defect, and it fails for a reason a
 * reviewer can read off the assertion.
 */
describe('source shape of lib/services/economyService.ts', () => {
  const src = readFileSync(resolve(process.cwd(), 'lib/services/economyService.ts'), 'utf8')

  it('no statement in this module runs on the root autocommit raw handle', () => {
    // Every raw statement belongs to a `prisma.$transaction(async tx => ...)`
    // callback and must therefore be issued as `tx.$queryRawUnsafe`.
    expect(src).not.toContain('prisma.$queryRawUnsafe')
    expect(src).not.toContain('prisma.$executeRawUnsafe')
    expect(src).toContain('tx.$queryRawUnsafe')
  })

  it('the debit statements keep their sufficiency guard and never upsert', () => {
    const debitStatements = src.match(/UPDATE token_balances[\s\S]*?SELECT \* FROM updated;/g)
    // Control: this regex must actually match the two debit CTEs. If a rename
    // makes it match nothing, this assertion fails rather than vacuously passing.
    expect(debitStatements).toHaveLength(2)

    for (const stmt of debitStatements!) {
      expect(stmt).toMatch(/WHERE user_id = \$5/)
      expect(stmt).toMatch(/spirit >= \$1/)
      expect(stmt).toMatch(/essence >= \$2/)
      expect(stmt).toMatch(/matter >= \$3/)
      expect(stmt).toMatch(/substance >= \$4/)
      // The asymmetry: a debit must never create the row it is debiting.
      expect(stmt).not.toMatch(/ON CONFLICT/i)
      expect(stmt).not.toMatch(/INSERT INTO token_balances/i)
    }
  })

  it('neither debit method reaches for a balance upsert or create', () => {
    const debitSection = src.slice(
      src.indexOf('static async debitOperation'),
      src.indexOf('static async creditTokens')
    )
    // Control: the slice must contain both debits, or the assertions below are vacuous.
    expect(debitSection).toContain('static async debitDynamic')
    expect(debitSection).not.toContain('tokenBalance.upsert')
    expect(debitSection).not.toContain('tokenBalance.create')
  })

  it('the credit still upserts — the asymmetry is a difference, not an oversight', () => {
    const creditSection = src.slice(src.indexOf('static async creditTokens'))
    expect(creditSection).toContain('tokenBalance.upsert')
  })
})
