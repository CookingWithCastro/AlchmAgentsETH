/**
 * Inventory/gate for Kalchm's self-exponentiation signature.
 *
 * AST comparison distinguishes Math.pow(x, x) from Math.pow(x, y), detects
 * x ** x, and scans trees excluded by tsconfig. `--list` inventories without
 * enforcing the allowlist.
 *
 * Covers FOUR runtimes, because a TypeScript gate proves "one engine" only for
 * TypeScript: TS/JS by AST here, Rust and notebooks by controlled text scan
 * here, and Python by delegation to check_no_stray_kalchm_formula.py. CI also
 * runs the Python gate as its own step, so a failure here cannot stop it from
 * reporting.
 *
 * Usage:
 *   bun run scripts/checkNoStrayKalchmFormula.ts [--list]
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import * as ts from 'typescript'

const ROOT = process.cwd()
const LIST_ONLY = process.argv.includes('--list')
/**
 * Every first-party tree that can ship TypeScript.
 *
 * `desktop-shell`, `hooks`, `src`, `types` and `utils` were added after an audit
 * found 57 first-party files invisible to this gate — including `hooks/`, which
 * the Kalchm alignment commit itself had to edit. A gate's scope is not the
 * project's scope unless the trees are enumerated, so add new top-level trees
 * here when they appear. `examples`, `scratch` and `stories` are deliberately
 * excluded: they cannot reach a build output.
 */
const SOURCE_ROOTS = [
  'app',
  'backend',
  'components',
  'desktop-shell',
  'hooks',
  'lib',
  'scripts',
  'src',
  'test',
  'types',
  'utils',
] as const

/** The only module permitted to define the self-exponentiation formula. */
const CANONICAL = 'lib/thermodynamics/kalchm.ts'
/** This allowlist starts empty and therefore cannot mask future copies. */
const ALLOWLIST: Record<string, { count: number; why: string }> = {}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(full)
  }
  return files
}

const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.json')
if (!configPath) throw new Error('no tsconfig.json found')
const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
if (configFile.error) {
  throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'))
}
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath))
const explicitFiles = SOURCE_ROOTS.flatMap(root => walk(path.join(ROOT, root)))
const serverFile = path.join(ROOT, 'server.ts')
const rootNames = [
  ...new Set([
    ...parsed.fileNames,
    ...explicitFiles,
    ...(fs.existsSync(serverFile) ? [serverFile] : []),
  ]),
]
const program = ts.createProgram({ rootNames, options: parsed.options })
const relative = (file: string) => path.relative(ROOT, file).split(path.sep).join('/')
const inScope = (file: string) =>
  SOURCE_ROOTS.some(root => file.startsWith(`${root}/`)) || file === 'server.ts'
const normalize = (node: ts.Node, source: ts.SourceFile) => node.getText(source).replace(/\s+/g, '')

interface Hit {
  file: string
  line: number
  text: string
}

const hits: Hit[] = []
for (const source of program.getSourceFiles()) {
  const file = relative(source.fileName)
  if (source.isDeclarationFile || !inScope(file)) continue
  const visit = (node: ts.Node) => {
    let selfExponentiation: ts.Node | null = null
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      normalize(node.expression.expression, source) === 'Math' &&
      node.expression.name.text === 'pow' &&
      node.arguments.length === 2 &&
      normalize(node.arguments[0], source) === normalize(node.arguments[1], source)
    ) {
      selfExponentiation = node
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.AsteriskAsteriskToken &&
      normalize(node.left, source) === normalize(node.right, source)
    ) {
      selfExponentiation = node
    }
    if (selfExponentiation) {
      const { line } = source.getLineAndCharacterOfPosition(selfExponentiation.getStart(source))
      hits.push({ file, line: line + 1, text: normalize(selfExponentiation, source) })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

const scanned = program
  .getSourceFiles()
  .map(source => relative(source.fileName))
  .filter(inScope)
const coverageProblems = SOURCE_ROOTS.filter(
  root => !scanned.some(file => file.startsWith(`${root}/`))
)
if (coverageProblems.length > 0) {
  console.error(`✗ COVERAGE FAILED: zero files scanned under ${coverageProblems.join(', ')}`)
  process.exit(1)
}

const canonicalHits = hits.filter(hit => hit.file === CANONICAL)
if (canonicalHits.length !== 4) {
  console.error(
    `✗ CONTROL FAILED: expected 4 self-exponentiations in ${CANONICAL}, found ${canonicalHits.length}`
  )
  process.exit(1)
}

const byFile = new Map<string, Hit[]>()
for (const hit of hits) {
  if (hit.file === CANONICAL) continue
  const fileHits = byFile.get(hit.file) ?? []
  fileHits.push(hit)
  byFile.set(hit.file, fileHits)
}

/**
 * The runtimes a TypeScript AST cannot see.
 *
 * A TypeScript gate proves "one engine" only for TypeScript. This repo also
 * runs the formula in Rust and in notebooks, and both were invisible until an
 * audit enumerated the runtimes explicitly rather than assuming the gate's
 * scope equalled the project's. Text matching is weaker than an AST, so each
 * scanner carries a CONTROL: if it stops finding the site we know exists, the
 * detector is broken and the gate fails rather than reporting a clean zero.
 */
const RUST_CANONICAL = 'pa-rust-backend/src/astro/alchemy.rs'

/**
 * Non-TypeScript sites permitted to restate the formula, each with its reason.
 *
 * Keep this as short as it is today. A file belongs here only when it is not
 * shipped code AND correcting it would falsify a record; anything reachable at
 * runtime must delegate to a canonical engine instead.
 */
const NON_TS_ALLOWLIST: Record<string, { count: number; why: string }> = {
  'notebooks/current-moment-chart.ipynb': {
    count: 5,
    why:
      'Teaching notebook that shows the algebra inline, which is the point of it. Its engine ' +
      'was brought to canonical form: it previously used abs() with a sign_factor (so it ' +
      'could return a NEGATIVE Kalchm) and floored zero axes to 1e-10 instead of relying on ' +
      '0**0 === 1. It now clamps negatives to zero and floors nothing, matching ' +
      'lib/thermodynamics/kalchm.ts. Shipped code must still DELEGATE rather than restate.',
  },
}
const RUST_SELF_POW = /\b([A-Za-z_][\w.]*)\s*\.powf\(\s*([A-Za-z_][\w.]*)\s*\)/g
const NOTEBOOK_SELF_POW = /\b([A-Za-z_]\w*)\s*\*\*\s*([A-Za-z_]\w*)\b/g

function walkExt(dir: string, test: RegExp): string[] {
  if (!fs.existsSync(dir)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'target' || entry.name === '.next') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkExt(full, test))
    else if (test.test(entry.name)) files.push(full)
  }
  return files
}

function scanSelfPow(text: string, pattern: RegExp): string[] {
  const found: string[] = []
  for (const match of text.matchAll(pattern)) {
    if (match[1] === match[2]) found.push(match[0])
  }
  return found
}

const otherRuntimeHits = new Map<string, string[]>()

for (const file of walkExt(path.join(ROOT, 'pa-rust-backend'), /\.rs$/)) {
  const found = scanSelfPow(fs.readFileSync(file, 'utf8'), RUST_SELF_POW)
  if (found.length > 0) otherRuntimeHits.set(relative(file), found)
}

const degradedNotebooks: string[] = []
for (const file of walkExt(path.join(ROOT, 'notebooks'), /\.ipynb$/)) {
  const text = fs.readFileSync(file, 'utf8')
  // Prefer cell sources, but a notebook that is not valid JSON must still be
  // scanned rather than skipped — silently dropping it would turn a broken
  // parse into a clean zero, which is the failure mode this gate exists to
  // prevent. notebooks/personalized-ai-research.ipynb contains a raw control
  // character and only the raw-text path can read it.
  let source: string
  try {
    source = (JSON.parse(text).cells ?? [])
      .map((cell: { source?: string[] | string }) =>
        Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '')
      )
      .join('\n')
  } catch {
    source = text
    degradedNotebooks.push(relative(file))
  }
  const found = scanSelfPow(source, NOTEBOOK_SELF_POW)
  if (found.length > 0) otherRuntimeHits.set(relative(file), found)
}

// CONTROL: the Rust engine legitimately defines the formula, so it must be found.
// A zero here means the scanner broke, not that the repo got clean.
if (!otherRuntimeHits.has(RUST_CANONICAL)) {
  console.error(
    `✗ CONTROL FAILED: no self-exponentiation found in ${RUST_CANONICAL}; the Rust scanner is broken`
  )
  process.exit(1)
}

const otherRuntimeProblems: string[] = []
for (const [file, found] of [...otherRuntimeHits].sort()) {
  if (file === RUST_CANONICAL) continue
  const allowed = NON_TS_ALLOWLIST[file]
  if (!allowed) {
    otherRuntimeProblems.push(
      `NON-TYPESCRIPT runtime defines the formula outside ${RUST_CANONICAL}:\n  ${file} (${found.length}) ${found.join(', ')}`
    )
  } else if (found.length !== allowed.count) {
    otherRuntimeProblems.push(
      `${file} has ${found.length} sites, allowlisted for ${allowed.count}; lower the count after delegation or remove the new copy`
    )
  }
}
for (const [file, allowed] of Object.entries(NON_TS_ALLOWLIST)) {
  if (!otherRuntimeHits.has(file)) {
    otherRuntimeProblems.push(
      `STALE non-TypeScript allowlist entry: ${file} allows ${allowed.count} sites but the detector found none`
    )
  }
}

if (LIST_ONLY) {
  console.log(`canonical control ${CANONICAL}: ${canonicalHits.length} sites`)
  for (const [file, fileHits] of [...byFile].sort()) {
    console.log(`\n${file} (${fileHits.length})`)
    for (const hit of fileHits) console.log(`  :${hit.line} ${hit.text}`)
  }
  for (const [file, found] of [...otherRuntimeHits].sort()) {
    console.log(`\n${file} (${found.length}) [non-TypeScript runtime]`)
    for (const text of found) console.log(`  ${text}`)
  }
  console.log(`\n✓ scanned ${scanned.length} files with non-zero coverage in every source tree`)
  const pythonList = spawnSync('python3', ['scripts/check_no_stray_kalchm_formula.py', '--list'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  process.stdout.write(pythonList.stdout)
  process.stderr.write(pythonList.stderr)
  if (pythonList.status !== 0) process.exit(pythonList.status ?? 1)
  process.exit(0)
}

const problems: string[] = [...otherRuntimeProblems]
for (const [file, fileHits] of [...byFile].sort()) {
  const allowed = ALLOWLIST[file]
  if (!allowed) {
    problems.push(
      `NEW self-exponentiation outside ${CANONICAL}:\n${fileHits
        .map(hit => `  ${file}:${hit.line} ${hit.text}`)
        .join('\n')}`
    )
  } else if (fileHits.length !== allowed.count) {
    problems.push(
      `${file} has ${fileHits.length} sites, allowlisted for ${allowed.count}; lower the count after delegation or remove the new copy`
    )
  }
}
for (const [file, allowed] of Object.entries(ALLOWLIST)) {
  if (!byFile.has(file)) {
    problems.push(
      `STALE allowlist entry: ${file} allows ${allowed.count} sites but the detector found none`
    )
  }
}

if (problems.length > 0) {
  console.error(`✗ ${problems.length} Kalchm formula gate problem(s)\n`)
  for (const problem of problems) console.error(`${problem}\n`)
  process.exit(1)
}

console.log(`✓ canonical engine: ${canonicalHits.length} sites in ${CANONICAL}`)
console.log('✓ no self-exponentiation outside the canonical engine')
console.log(
  `✓ non-TypeScript runtimes: ${otherRuntimeHits.size} file(s) define the formula, all expected`
)
if (degradedNotebooks.length > 0) {
  console.log(
    `! ${degradedNotebooks.length} notebook(s) are not valid JSON and were scanned as raw text: ${degradedNotebooks.join(', ')}`
  )
}

const pythonGate = spawnSync('python3', ['scripts/check_no_stray_kalchm_formula.py'], {
  cwd: ROOT,
  encoding: 'utf8',
})
process.stdout.write(pythonGate.stdout)
process.stderr.write(pythonGate.stderr)
if (pythonGate.status !== 0) process.exit(pythonGate.status ?? 1)
