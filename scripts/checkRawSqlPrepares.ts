/**
 * Gate: every raw SQL statement this repo ships must be one PostgreSQL can PREPARE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `lib/security/security-audit.ts` shipped a statement that passed an
 * IDENTIFIER as a bind parameter (`WHERE ${field} IS NOT NULL` inside a
 * `$queryRaw` tagged template, which Prisma turns into `WHERE $1 IS NOT NULL`).
 * PostgreSQL cannot infer a type for that parameter, so it refuses to PREPARE
 * the statement — 42P18, for every input, forever. Nothing caught it, because
 * nothing in this repo executes raw SQL against a real PostgreSQL.
 *
 * The sibling repo hit the same class twice: 42P08 (one bind parameter inferred
 * as two different types) shipped past thirteen mocked-DB tests while every real
 * request threw, and 42601 (two commands in one parameterised string) hid behind
 * a catch-fallback so the declared primary path had never once executed. Mocks
 * cannot detect any of this. Only the real planner can.
 *
 * WHAT IT PROVES, AND WHAT IT DOES NOT
 * ------------------------------------
 * PREPARE proves LEGALITY: the statement parses, its objects resolve, and every
 * `$n` has an inferable type. PREPARE does NOT prove SEMANTICS. It plans, it
 * does not execute. A statement that reads the wrong column, filters on the
 * wrong row, or means the opposite of its comment prepares perfectly. Treat a
 * green run as "this can run", never as "this is correct".
 *
 * The full list of what this gate cannot see is printed on every run under
 * NOT COVERED. Read it — a gate that hides its blind spots reads as full
 * coverage and is worse than no gate at all.
 *
 * Usage:
 *   bun run scripts/checkRawSqlPrepares.ts                 # gate
 *   bun run scripts/checkRawSqlPrepares.ts --list          # inventory; never connects
 *   bun run scripts/checkRawSqlPrepares.ts --strict-drift  # schema drift also fails
 */
import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const ROOT = process.cwd()
const LIST_ONLY = process.argv.includes('--list')
const STRICT_DRIFT = process.argv.includes('--strict-drift')

/**
 * The gate reads its database from a DEDICATED variable and never from
 * `DATABASE_URL`.
 *
 * A developer's `DATABASE_URL` routinely points at a shared or production
 * database. `bun run check` must not silently open a connection to it. Absent
 * this variable the gate skips the PREPARE phase and says so — local runs and
 * developer machines are unaffected by design, not by accident. Do not "helpfully"
 * add a `DATABASE_URL` fallback.
 */
const DB_URL_ENV = 'SQL_PREPARE_GATE_DATABASE_URL'

/** First-party trees that can ship raw SQL to a server runtime. */
const SOURCE_ROOTS = [
  'app',
  'components',
  'desktop-shell',
  'hooks',
  'lib',
  'scripts',
  'src',
  'types',
  'utils',
] as const

/**
 * Trees deliberately outside this gate, printed on every run so the exclusion is
 * never mistaken for coverage.
 */
const DECLARED_EXCLUSIONS: Array<{ what: string; why: string }> = [
  {
    what: 'backend/**/*.py',
    why: 'Python raw SQL (e.g. backend/database.py builds DDL with an f-string) — this extractor parses TypeScript only',
  },
  {
    what: 'test/**',
    why: 'Tests construct deliberately broken SQL against fakes; preparing it would fail by design',
  },
  {
    what: 'prisma/**, notebooks/**, pa-rust-backend/**',
    why: 'Migrations, notebooks and the Rust runtime are not scanned by this gate',
  },
  {
    what: 'Prisma model calls (prisma.users.findMany, etc.)',
    why: 'Prisma generates that SQL; only hand-written raw SQL is in scope',
  },
]

/** Prisma raw-SQL APIs. Tagged templates parameterise; `*Unsafe` takes a string. */
const TAGGED_APIS = new Set(['$queryRaw', '$executeRaw'])
const CALL_APIS = new Set(['$queryRawUnsafe', '$executeRawUnsafe'])

/** Statement kinds PostgreSQL's PREPARE accepts. Everything else is utility/DDL. */
const PREPARABLE_STARTS = new Set([
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'MERGE',
  'VALUES',
  'WITH',
  'TABLE',
])

/**
 * SQLSTATEs that mean "this environment lacks the object", not "this statement is
 * illegal". They are reported as DRIFT: loudly, with file:line, and counted as
 * NOT PROVEN — but they do not fail the gate unless --strict-drift is passed,
 * because a bare CI PostgreSQL legitimately lacks extensions, and this repo has
 * known statements against tables absent from prisma/schema.prisma
 * (lib/staking/wal-staking.ts targets `wal_staking`; lib/performance/
 * optimization-engine.ts targets `pg_stat_statements` and PascalCase tables).
 * Fixing those is a schema question, not a SQL-legality question.
 */
const DRIFT_CODES: Record<string, string> = {
  '42P01': 'undefined_table',
  '42703': 'undefined_column',
  '42704': 'undefined_object',
  '42883': 'undefined_function',
  '3F000': 'invalid_schema_name',
  '42P07': 'duplicate_table',
}

type Coverage =
  | { kind: 'static'; sql: string }
  | { kind: 'dynamic'; reason: string }
  | { kind: 'not-preparable'; reason: string; sql: string }

interface Site {
  file: string
  line: number
  api: string
  coverage: Coverage
}

// ---------------------------------------------------------------------------
// SQL text scanning
// ---------------------------------------------------------------------------

/**
 * Blank out comments and quoted regions, preserving offsets, so structural scans
 * (statement separators, leading keyword) never trip over content that only
 * looks like SQL. `'$2a$%'` is a bcrypt pattern, not a dollar-quote; `-- DROP`
 * is a comment, not a command.
 */
function blankLiteralsAndComments(sql: string): string {
  const out = sql.split('')
  const n = sql.length
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' '
  }
  let i = 0
  while (i < n) {
    const two = sql.slice(i, i + 2)
    if (two === '--') {
      const nl = sql.indexOf('\n', i)
      const j = nl === -1 ? n : nl
      blank(i, j)
      i = j
      continue
    }
    if (two === '/*') {
      let depth = 1
      let j = i + 2
      while (j < n && depth > 0) {
        if (sql.slice(j, j + 2) === '/*') {
          depth++
          j += 2
        } else if (sql.slice(j, j + 2) === '*/') {
          depth--
          j += 2
        } else {
          j++
        }
      }
      blank(i, j)
      i = j
      continue
    }
    const ch = sql[i]
    if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < n) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      blank(i, j)
      i = j
      continue
    }
    if (ch === '$') {
      const m = /^\$([A-Za-z_]\w*)?\$/.exec(sql.slice(i))
      if (m) {
        const tag = m[0]
        const end = sql.indexOf(tag, i + tag.length)
        const j = end === -1 ? n : end + tag.length
        blank(i, j)
        i = j
        continue
      }
    }
    i++
  }
  return out.join('')
}

/**
 * How many commands the string contains.
 *
 * This is the 42601 detector, and it runs WITHOUT a database. PostgreSQL rejects
 * multiple commands in one parameterised statement, which is exactly how the
 * sibling repo's second defect reached production. Detecting it structurally
 * means the check survives a run with no DB URL.
 */
function commandCount(sql: string): number {
  const code = blankLiteralsAndComments(sql)
  let count = 0
  let sawContent = false
  for (const ch of code) {
    if (ch === ';') {
      if (sawContent) count++
      sawContent = false
    } else if (!/\s/.test(ch)) {
      sawContent = true
    }
  }
  return sawContent ? count + 1 : count
}

/**
 * Bind parameters PostgreSQL provably cannot type, found WITHOUT a database.
 *
 * `$n IS [NOT] NULL` gives the planner no context at all, so it fails 42P18
 * (indeterminate_datatype) for every input — this is exactly the shape that
 * shipped in lib/security/security-audit.ts when an identifier was interpolated
 * into a `$queryRaw` tagged template. A cast supplies the missing context, so
 * `$n::text IS NOT NULL` is legal and is deliberately not matched.
 *
 * This duplicates part of what PREPARE does, on purpose: PREPARE is the
 * authoritative detector but needs a server, and the single defect that
 * motivated this gate must not depend on CI being reachable to be caught.
 * Narrow by design — `$n LIKE 'x'` and `$n = col` DO infer a type and are fine.
 */
const INDETERMINATE_PARAM = /\$\d+(?!::)\s+IS\s+(?:NOT\s+)?NULL\b/gi

function indeterminateParams(sql: string): string[] {
  return [...blankLiteralsAndComments(sql).matchAll(INDETERMINATE_PARAM)].map(m =>
    m[0].replace(/\s+/g, ' ')
  )
}

function leadingKeyword(sql: string): string {
  const m = /[A-Za-z_]\w*/.exec(blankLiteralsAndComments(sql))
  return m ? m[0].toUpperCase() : ''
}

/** Strip one trailing statement terminator so the text can be wrapped in PREPARE. */
function stripTrailingSemicolon(sql: string): string {
  const code = blankLiteralsAndComments(sql)
  const last = code.replace(/\s+$/, '').length - 1
  return last >= 0 && code[last] === ';' ? sql.slice(0, last) + ' ' + sql.slice(last + 1) : sql
}

// ---------------------------------------------------------------------------
// Extraction (syntactic — no type checker, so it also runs on fixtures)
// ---------------------------------------------------------------------------

/** `Prisma.raw()`/`Prisma.sql`/`Prisma.join()` splice SQL TEXT, not a parameter. */
const PRISMA_SQL_SPLICE = /\bPrisma\s*\.\s*(raw|sql|join|empty)\b/

function extractFromSourceFile(source: ts.SourceFile, file: string): Site[] {
  const sites: Site[] = []
  const lineOf = (node: ts.Node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

  const visit = (node: ts.Node) => {
    // prisma.$queryRaw`...`  /  tx.$executeRaw`...`
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isPropertyAccessExpression(node.tag) &&
      TAGGED_APIS.has(node.tag.name.text)
    ) {
      const api = node.tag.name.text
      const line = lineOf(node)
      const tpl = node.template
      if (ts.isNoSubstitutionTemplateLiteral(tpl)) {
        sites.push({ file, line, api, coverage: classify(tpl.text) })
      } else {
        const spliced = tpl.templateSpans.find(span =>
          PRISMA_SQL_SPLICE.test(span.expression.getText(source))
        )
        if (spliced) {
          sites.push({
            file,
            line,
            api,
            coverage: {
              kind: 'dynamic',
              reason: `splices SQL text via ${spliced.expression.getText(source).slice(0, 60)} — the statement varies at runtime`,
            },
          })
        } else {
          // Prisma replaces each `${}` with a positional bind parameter, in
          // order. Reconstruct exactly what the server receives.
          let sql = tpl.head.text
          tpl.templateSpans.forEach((span, index) => {
            sql += `$${index + 1}` + span.literal.text
          })
          sites.push({ file, line, api, coverage: classify(sql) })
        }
      }
    }

    // prisma.$queryRawUnsafe(sql, ...params)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      CALL_APIS.has(node.expression.name.text)
    ) {
      const api = node.expression.name.text
      const line = lineOf(node)
      const first = node.arguments[0]
      if (!first) {
        sites.push({ file, line, api, coverage: { kind: 'dynamic', reason: 'no SQL argument' } })
      } else if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) {
        sites.push({ file, line, api, coverage: classify(first.text) })
      } else if (ts.isTemplateExpression(first)) {
        const varying = first.templateSpans
          .map(span => span.expression.getText(source))
          .join(', ')
          .slice(0, 80)
        sites.push({
          file,
          line,
          api,
          coverage: {
            kind: 'dynamic',
            reason: `SQL is assembled from template substitutions (${varying}) — the text is not fixed in source`,
          },
        })
      } else {
        sites.push({
          file,
          line,
          api,
          coverage: {
            kind: 'dynamic',
            reason: `SQL comes from an expression (${first.getText(source).slice(0, 60)}) rather than a literal`,
          },
        })
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(source)
  return sites
}

function classify(sql: string): Coverage {
  const keyword = leadingKeyword(sql)
  if (!PREPARABLE_STARTS.has(keyword)) {
    return {
      kind: 'not-preparable',
      sql,
      reason: `${keyword || '(empty)'} is a utility/DDL command; PostgreSQL's PREPARE accepts only ${[...PREPARABLE_STARTS].join('/')}`,
    }
  }
  return { kind: 'static', sql }
}

// ---------------------------------------------------------------------------
// CONTROL 1 — the extractor. Runs always, needs no database.
// ---------------------------------------------------------------------------

/**
 * A zero result is a claim. If the extractor silently stops finding SQL, every
 * run reports a clean repo, which is precisely the failure this gate exists to
 * prevent. So feed it a fixture containing one of each shape — including the
 * exact historical defect — and require the expected classification.
 */
const CONTROL_FIXTURE = `
  declare const prisma: any, tx: any, Prisma: any, field: string, days: number, table: string
  async function f() {
    await prisma.$queryRaw\`SELECT COUNT(*) FROM "users" WHERE \${field} IS NOT NULL\`
    await prisma.$queryRaw\`SELECT 1 FROM t WHERE d > NOW() - make_interval(days => \${days}::int)\`
    await prisma.$queryRawUnsafe('SELECT bytes FROM wal WHERE agent_id = $1', 'a')
    await prisma.$executeRawUnsafe(\`UPDATE t SET "\${table}" = 1\`)
    await prisma.$queryRaw\`SELECT * FROM \${Prisma.raw(table)}\`
    await prisma.$executeRaw\`CREATE INDEX CONCURRENTLY IF NOT EXISTS i ON t (a)\`
    await tx.$queryRawUnsafe('SELECT 1; SELECT 2')
  }
`

function runExtractionControl(): void {
  const fixture = ts.createSourceFile(
    'control.fixture.ts',
    CONTROL_FIXTURE,
    ts.ScriptTarget.ES2022,
    true
  )
  const sites = extractFromSourceFile(fixture, 'control.fixture.ts')
  const fail = (why: string): never => {
    console.error(`✗ CONTROL FAILED (extractor): ${why}`)
    console.error('  The gate cannot report on statements it can no longer find.')
    process.exit(1)
  }

  if (sites.length !== 7) fail(`expected 7 raw-SQL sites in the fixture, found ${sites.length}`)

  // 1. The historical defect: an identifier interpolated into a tagged template
  //    becomes a bind parameter. Reconstruction must show `$1`, because that is
  //    what PostgreSQL is asked to prepare.
  const defect = sites[0].coverage
  if (defect.kind !== 'static' || !/WHERE \$1 IS NOT NULL/.test(defect.sql)) {
    fail('the identifier-as-bind-parameter shape did not reconstruct to `WHERE $1 IS NOT NULL`')
  }
  //    …and the no-database detector must call it out, so the defect that
  //    motivated this gate is caught even when the PREPARE phase is skipped.
  if (defect.kind === 'static' && indeterminateParams(defect.sql).length !== 1) {
    fail('`$1 IS NOT NULL` was not reported as an untypeable bind parameter')
  }
  // 2. A legitimate value parameter reconstructs the same way, and must NOT be
  //    reported — a detector that flags valid SQL gets switched off.
  if (sites[1].coverage.kind !== 'static') fail('a valid parameterised SELECT was not extracted')
  if (indeterminateParams((sites[1].coverage as { sql: string }).sql).length !== 0) {
    fail('a legitimately cast parameter was flagged as untypeable (false positive)')
  }
  if (indeterminateParams('SELECT 1 WHERE $1::text IS NOT NULL').length !== 0) {
    fail('a cast parameter (`$1::text IS NOT NULL`) was flagged as untypeable (false positive)')
  }
  // 3. `*Unsafe` with a literal is static and already carries its own $n.
  const unsafeLiteral = sites[2].coverage
  if (unsafeLiteral.kind !== 'static' || !unsafeLiteral.sql.includes('agent_id = $1')) {
    fail('$queryRawUnsafe with a string literal was not extracted verbatim')
  }
  // 4/5. Runtime-assembled SQL must be reported, never silently dropped.
  if (sites[3].coverage.kind !== 'dynamic') fail('template-substituted SQL was not flagged dynamic')
  if (sites[4].coverage.kind !== 'dynamic') fail('Prisma.raw() splice was not flagged dynamic')
  // 6. DDL cannot be PREPAREd at all and must say so rather than pass quietly.
  if (sites[5].coverage.kind !== 'not-preparable') fail('CREATE INDEX was not flagged as DDL')
  // 7. Two commands in one string — the sibling repo's 42601.
  const multi = sites[6].coverage
  if (multi.kind !== 'static' || commandCount(multi.sql) !== 2) {
    fail('two commands in one string were not counted as two commands')
  }
  // Negative control for the same detector: the bcrypt pattern `'$2a$%'` and a
  // trailing terminator must NOT read as extra commands or as a dollar-quote.
  const oneCommand = `SELECT 1 FROM t WHERE c NOT LIKE '$2a$%' -- ; not a command\n;`
  if (commandCount(oneCommand) !== 1) {
    fail('the command counter miscounted a quoted `$2a$` pattern or a trailing semicolon')
  }
  console.log('✓ CONTROL (extractor): 7/7 fixture shapes classified as expected')
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (
      /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(spec|test|stories)\.[cm]?[jt]sx?$/.test(entry.name)
    )
      files.push(full)
  }
  return files
}

function collectSites(): { sites: Site[]; scannedRoots: Set<string> } {
  const sites: Site[] = []
  const scannedRoots = new Set<string>()
  const targets = [
    ...SOURCE_ROOTS.flatMap(root => walk(path.join(ROOT, root))),
    ...(fs.existsSync(path.join(ROOT, 'server.ts')) ? [path.join(ROOT, 'server.ts')] : []),
  ]
  for (const absolute of targets) {
    const file = path.relative(ROOT, absolute).split(path.sep).join('/')
    const text = fs.readFileSync(absolute, 'utf8')
    // Cheap pre-filter; the AST does the real work.
    if (!text.includes('$queryRaw') && !text.includes('$executeRaw')) continue
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true)
    const found = extractFromSourceFile(source, file)
    if (found.length > 0) scannedRoots.add(file.split('/')[0])
    sites.push(...found)
  }
  return { sites, scannedRoots }
}

// ---------------------------------------------------------------------------
// PREPARE phase
// ---------------------------------------------------------------------------

interface PrepareOutcome {
  site: Site
  sql: string
  ok: boolean
  code?: string
  message?: string
}

/**
 * CONTROL 2 — the PREPARE mechanism itself, before any repo statement is judged.
 *
 * Every probe is schema-independent, so the control validates the gate even when
 * `prisma db push` produced nothing. A gate that reports "all clear" because its
 * detector is broken is worse than no gate.
 */
const PREPARE_CONTROLS: Array<{ sql: string; expect: 'reject'; code: string; why: string }> = [
  {
    sql: 'SELECT $1 IS NOT NULL',
    expect: 'reject',
    code: '42P18',
    why: "PA's own defect: an identifier passed as a bind parameter has no inferable type",
  },
  {
    sql: 'SELECT $1::int + $1::text',
    expect: 'reject',
    // Two acceptable codes, and the reason is worth knowing. Parse analysis runs
    // left to right: `$1::int` pins the parameter to int4 while its type is still
    // unknown, so `$1::text` is then an ordinary int4->text cast rather than a
    // second inference. What is actually left is `integer + text`, which raises
    // 42883 (operator does not exist), not 42P08 (ambiguous_parameter).
    // Which one PostgreSQL returns depends on how it resolved the parameter, so
    // asserting a single code here would be a claim we never executed. The
    // control's real job is "PostgreSQL must refuse this", and both codes are a
    // refusal for a parameter/type reason. The observed code is printed below,
    // so the first real CI run records which one this server gives.
    code: ['42P08', '42883'],
    why: "the sibling repo's first defect: one bind parameter used at two types",
  },
  {
    sql: 'SELECT FROM WHERE',
    expect: 'reject',
    code: '42601',
    why: 'plain syntax error — the coarsest thing PREPARE must still catch',
  },
]

async function runPreparePhase(
  connectionString: string,
  statements: Site[]
): Promise<{ outcomes: PrepareOutcome[]; controlFailed: string | null }> {
  const { Client } = await import('pg')
  const client = new Client({ connectionString })
  await client.connect()
  let counter = 0

  const prepare = async (
    sql: string
  ): Promise<{ ok: boolean; code?: string; message?: string }> => {
    const name = `sql_prepare_gate_${counter++}`
    try {
      // Simple protocol: the inner statement's own `$n` placeholders belong to
      // the PREPARE, not to an outer bind, so they must not be re-interpreted.
      await client.query(`PREPARE ${name} AS ${stripTrailingSemicolon(sql)}`)
      await client.query(`DEALLOCATE ${name}`)
      return { ok: true }
    } catch (error) {
      const e = error as { code?: string; message?: string }
      return { ok: false, code: e.code, message: (e.message ?? String(error)).split('\n')[0] }
    }
  }

  try {
    // Positive control: if a trivially legal statement cannot be prepared, the
    // connection or its permissions are broken and every later failure is noise.
    const alive = await prepare('SELECT 1')
    if (!alive.ok) {
      return {
        outcomes: [],
        controlFailed: `PREPARE of \`SELECT 1\` failed (${alive.code}: ${alive.message}) — the connection, not the repo, is the problem`,
      }
    }
    console.log('✓ CONTROL (prepare): `SELECT 1` prepares — connection and permissions are usable')

    // Negative controls: known-unpreparable statements must be REJECTED, with
    // the expected SQLSTATE. "Some error" is not enough; the wrong error would
    // mean the gate is detecting something other than what it claims.
    for (const probe of PREPARE_CONTROLS) {
      const result = await prepare(probe.sql)
      if (result.ok) {
        return {
          outcomes: [],
          controlFailed: `\`${probe.sql}\` was accepted by PREPARE but must be rejected (expected ${Array.isArray(probe.code) ? probe.code.join('/') : probe.code}) — ${probe.why}`,
        }
      }
      const acceptable = Array.isArray(probe.code) ? probe.code : [probe.code]
      if (!acceptable.includes(result.code ?? '')) {
        return {
          outcomes: [],
          controlFailed: `\`${probe.sql}\` was rejected with ${result.code}, expected one of ${acceptable.join('/')} — ${probe.why}`,
        }
      }
      console.log(`✓ CONTROL (prepare): \`${probe.sql}\` correctly rejected ${result.code}`)
    }

    const outcomes: PrepareOutcome[] = []
    for (const site of statements) {
      const sql = (site.coverage as { sql: string }).sql
      outcomes.push({ site, sql, ...(await prepare(sql)) })
    }
    return { outcomes, controlFailed: null }
  } finally {
    await client.end()
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const oneLine = (sql: string, max = 110) => {
  const flat = sql.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

function printNotCovered(sites: Site[], preparedCount: number, drift: PrepareOutcome[]): void {
  console.log('\n── NOT COVERED ────────────────────────────────────────────────')
  console.log('Everything below was NOT proven legal. Read it as a coverage hole,')
  console.log('not as a pass.\n')

  const dynamic = sites.filter(s => s.coverage.kind === 'dynamic')
  console.log(`Dynamically built SQL — text not fixed in source (${dynamic.length}):`)
  if (dynamic.length === 0) console.log('  (none)')
  for (const site of dynamic) {
    console.log(`  ${site.file}:${site.line} [${site.api}] ${(site.coverage as any).reason}`)
  }

  const ddl = sites.filter(s => s.coverage.kind === 'not-preparable')
  console.log(`\nUtility/DDL statements PostgreSQL's PREPARE cannot accept (${ddl.length}):`)
  if (ddl.length === 0) console.log('  (none)')
  for (const site of ddl) {
    console.log(
      `  ${site.file}:${site.line} [${site.api}] ${oneLine((site.coverage as any).sql, 80)}`
    )
  }

  if (drift.length > 0) {
    console.log(`\nStatements whose objects do not exist in this database (${drift.length}):`)
    for (const outcome of drift) {
      const label = DRIFT_CODES[outcome.code ?? ''] ?? outcome.code
      console.log(
        `  ${outcome.site.file}:${outcome.site.line} [${outcome.code} ${label}] ${outcome.message}`
      )
    }
    console.log('  → These statements were NOT proven legal: PREPARE stopped at the missing')
    console.log('    object and never reached the parameter checks. Pass --strict-drift to')
    console.log('    make them fail the gate once prisma/schema.prisma covers them.')
  }

  console.log('\nOut of scope by construction:')
  for (const exclusion of DECLARED_EXCLUSIONS) {
    console.log(`  ${exclusion.what}\n    ${exclusion.why}`)
  }

  console.log('\nWhat PREPARE cannot tell you, for the statements it DID accept')
  console.log(`(${preparedCount}): PREPARE plans, it does not execute. Wrong column, wrong`)
  console.log('join, wrong sign, empty result — all prepare cleanly. This gate proves')
  console.log('LEGALITY only. Semantics still need a test that runs the query.')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  runExtractionControl()

  const { sites, scannedRoots } = collectSites()
  const statics = sites.filter(s => s.coverage.kind === 'static')

  console.log(
    `\nFound ${sites.length} raw-SQL site(s) across ${scannedRoots.size} tree(s): ${[...scannedRoots].sort().join(', ') || '(none)'}`
  )
  console.log(
    `  ${statics.length} statically extractable · ` +
      `${sites.filter(s => s.coverage.kind === 'dynamic').length} runtime-assembled · ` +
      `${sites.filter(s => s.coverage.kind === 'not-preparable').length} utility/DDL`
  )

  // Coverage guard: this repo is known to contain raw SQL. Zero extracted
  // statements means the walker or the AST match broke, not that the repo is clean.
  if (statics.length === 0) {
    console.error(
      '\n✗ COVERAGE FAILED: zero statically extractable statements found. This repo has raw SQL; the collector is broken.'
    )
    process.exit(1)
  }

  // 42601 detector — structural, so it runs with or without a database.
  const multiCommand = statics.filter(s => commandCount((s.coverage as any).sql) > 1)

  if (LIST_ONLY) {
    console.log('\n── INVENTORY (--list; no database contacted) ───────────────────')
    for (const site of statics) {
      console.log(
        `  ${site.file}:${site.line} [${site.api}] ${oneLine((site.coverage as any).sql)}`
      )
    }
    printNotCovered(sites, 0, [])
    process.exit(0)
  }

  const failures: string[] = []
  for (const site of multiCommand) {
    failures.push(
      `${site.file}:${site.line} [${site.api}] contains ${commandCount((site.coverage as any).sql)} commands in one string. ` +
        'PostgreSQL rejects multiple commands in a parameterised statement (42601).'
    )
  }
  for (const site of statics) {
    const untypeable = indeterminateParams((site.coverage as any).sql)
    if (untypeable.length > 0) {
      failures.push(
        `${site.file}:${site.line} [${site.api}] has bind parameter(s) with no inferable type: ` +
          `${untypeable.join(', ')}. PostgreSQL fails 42P18 on PREPARE. An identifier is the ` +
          'usual cause — `$n` is planned as a VALUE and can never name a column or table.'
      )
    }
  }

  const connectionString = process.env[DB_URL_ENV]
  let driftOutcomes: PrepareOutcome[] = []
  let preparedOk = 0

  if (!connectionString) {
    console.log(`\n⊘ PREPARE phase SKIPPED: ${DB_URL_ENV} is not set.`)
    console.log('  No database was contacted. Still enforced above, without a server:')
    console.log('  the extractor control, multiple commands in one statement (42601), and')
    console.log('  the `$n IS [NOT] NULL` untypeable-parameter shape (42P18).')
    console.log('  NOT enforced: every other parameter-type inference (notably 42P08, one')
    console.log('  parameter inferred as two types), object resolution, and function')
    console.log(`  signatures. Set ${DB_URL_ENV} to a throwaway PostgreSQL to enable`)
    console.log('  them. CI does this; local runs deliberately do not.')
  } else {
    // SAFETY: never hand a multi-command statement to the PREPARE phase. It is
    // sent over the SIMPLE query protocol (the inner `$n` belong to the PREPARE,
    // so they must not be re-bound by an outer Parse), and the simple protocol
    // runs every command in the string — `PREPARE p AS SELECT 1; DELETE FROM t`
    // would execute the DELETE. These statements are already reported as
    // failures by the structural 42601 check above, so nothing is lost.
    const preparable = statics.filter(s => !multiCommand.includes(s))
    const { outcomes, controlFailed } = await runPreparePhase(connectionString, preparable)
    if (controlFailed) {
      console.error(`\n✗ CONTROL FAILED (prepare): ${controlFailed}`)
      console.error('  Refusing to report on repo statements with an unverified detector.')
      process.exit(1)
    }
    for (const outcome of outcomes) {
      if (outcome.ok) {
        preparedOk++
      } else if (DRIFT_CODES[outcome.code ?? '']) {
        driftOutcomes.push(outcome)
      } else {
        failures.push(
          `${outcome.site.file}:${outcome.site.line} [${outcome.site.api}] PREPARE failed ` +
            `${outcome.code}: ${outcome.message}\n      ${oneLine(outcome.sql)}`
        )
      }
    }
    console.log(
      `\n✓ PREPARE: ${preparedOk}/${preparable.length} statement(s) accepted by PostgreSQL` +
        (multiCommand.length > 0
          ? ` (${multiCommand.length} withheld — multi-command, already failed above)`
          : '')
    )
  }

  if (STRICT_DRIFT && driftOutcomes.length > 0) {
    for (const outcome of driftOutcomes) {
      failures.push(
        `${outcome.site.file}:${outcome.site.line} [${outcome.site.api}] ${outcome.code}: ${outcome.message} (--strict-drift)`
      )
    }
    driftOutcomes = []
  }

  printNotCovered(sites, preparedOk, driftOutcomes)

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} raw SQL statement(s) PostgreSQL cannot prepare:\n`)
    for (const failure of failures) console.error(`  • ${failure}`)
    console.error(
      '\nAn identifier can never be a bind parameter, and a parameterised statement can hold' +
        '\nexactly one command. Restructure the statement, or validate the identifier against a' +
        '\nfixed allowlist and interpolate the allowlisted literal — never the caller’s string.'
    )
    process.exit(1)
  }

  console.log('\n✓ No unpreparable raw SQL found.')
}

main().catch(error => {
  console.error('✗ sql-prepare gate crashed:', error)
  process.exit(1)
})
