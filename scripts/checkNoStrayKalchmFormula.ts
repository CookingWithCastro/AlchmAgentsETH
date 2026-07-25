/**
 * Inventory/gate for Kalchm's self-exponentiation signature.
 *
 * AST comparison distinguishes Math.pow(x, x) from Math.pow(x, y), detects
 * x ** x, and scans trees excluded by tsconfig. `--list` inventories without
 * enforcing the allowlist.
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
const SOURCE_ROOTS = ['app', 'backend', 'components', 'lib', 'scripts', 'test'] as const

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

if (LIST_ONLY) {
  console.log(`canonical control ${CANONICAL}: ${canonicalHits.length} sites`)
  for (const [file, fileHits] of [...byFile].sort()) {
    console.log(`\n${file} (${fileHits.length})`)
    for (const hit of fileHits) console.log(`  :${hit.line} ${hit.text}`)
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

const problems: string[] = []
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

const pythonGate = spawnSync('python3', ['scripts/check_no_stray_kalchm_formula.py'], {
  cwd: ROOT,
  encoding: 'utf8',
})
process.stdout.write(pythonGate.stdout)
process.stderr.write(pythonGate.stderr)
if (pythonGate.status !== 0) process.exit(pythonGate.status ?? 1)
