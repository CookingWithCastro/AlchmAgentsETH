/**
 * Resolve Kalchm/Monica call sites to their real TypeScript declarations.
 *
 * Text search cannot attribute duplicate names through import aliases, and a
 * call-only analysis mistakes functions passed as values for dead code. This
 * script uses the TypeScript checker for both call expressions and non-type
 * value references.
 *
 * Usage:
 *   bun run scripts/resolveThermoCallers.ts [nameRegex] [--json <path>]
 */
import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const jsonFlag = args.indexOf('--json')
const jsonPath = jsonFlag >= 0 ? args[jsonFlag + 1] : undefined
const patternArg = args.find((arg, index) => !arg.startsWith('--') && index !== jsonFlag + 1)
const NAME_RE = new RegExp(patternArg ?? 'kalchm|monica', 'i')
const SOURCE_ROOTS = ['app', 'backend', 'components', 'lib', 'scripts', 'test'] as const

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
const checker = program.getTypeChecker()
const relative = (file: string) => path.relative(ROOT, file).split(path.sep).join('/')
const inScope = (file: string) =>
  SOURCE_ROOTS.some(root => file === root || file.startsWith(`${root}/`)) || file === 'server.ts'

function location(node: ts.Node): string {
  const source = node.getSourceFile()
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
  return `${relative(source.fileName)}:${line + 1}`
}

interface DeclarationRecord {
  node: ts.Declaration
  name: string
  where: string
  exported: boolean
  callerFiles: Set<string>
  callSites: string[]
  valueRefs: string[]
}

const declarations = new Map<ts.Declaration, DeclarationRecord>()

function declarationOfInterest(node: ts.Node): ts.Declaration | null {
  if (ts.isFunctionDeclaration(node) && node.name && NAME_RE.test(node.name.text)) return node
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    NAME_RE.test(node.name.text) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    return node
  }
  if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && NAME_RE.test(node.name.text)) {
    return node
  }
  return null
}

function declarationName(node: ts.Declaration): string {
  const named = node as ts.Declaration & { name?: ts.DeclarationName }
  return named.name && ts.isIdentifier(named.name) ? named.name.text : '<anonymous>'
}

function isExported(node: ts.Declaration): boolean {
  if (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) return true
  let parent: ts.Node | undefined = node.parent
  while (parent) {
    if (
      (ts.isVariableStatement(parent) || ts.isFunctionDeclaration(parent)) &&
      ts.getCombinedModifierFlags(parent as ts.Declaration) & ts.ModifierFlags.Export
    ) {
      return true
    }
    parent = parent.parent
  }
  return false
}

for (const source of program.getSourceFiles()) {
  if (source.isDeclarationFile || !inScope(relative(source.fileName))) continue
  const visit = (node: ts.Node) => {
    const declaration = declarationOfInterest(node)
    if (declaration) {
      declarations.set(declaration, {
        node: declaration,
        name: declarationName(declaration),
        where: location(declaration),
        exported: isExported(declaration),
        callerFiles: new Set(),
        callSites: [],
        valueRefs: [],
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

function resolveIdentifier(identifier: ts.Identifier): DeclarationRecord[] {
  let symbol =
    ts.isShorthandPropertyAssignment(identifier.parent) && identifier.parent.name === identifier
      ? checker.getShorthandAssignmentValueSymbol(identifier.parent)
      : checker.getSymbolAtLocation(identifier)
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    try {
      symbol = checker.getAliasedSymbol(symbol)
    } catch {
      // An unresolved alias is reported as unresolved below.
    }
  }
  return (symbol?.declarations ?? [])
    .map(declaration => declarations.get(declaration))
    .filter((record): record is DeclarationRecord => Boolean(record))
}

function isOwnDeclarationName(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  return (
    (ts.isFunctionDeclaration(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent)) &&
    parent.name === identifier
  )
}

function isTypePosition(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent
  while (current) {
    if (ts.isTypeNode(current)) return true
    if (ts.isExpression(current) || ts.isStatement(current) || ts.isSourceFile(current))
      return false
    current = current.parent
  }
  return false
}

function isImportName(identifier: ts.Identifier): boolean {
  let current: ts.Node | undefined = identifier.parent
  while (current && !ts.isSourceFile(current)) {
    if (
      ts.isImportSpecifier(current) ||
      ts.isImportClause(current) ||
      ts.isNamespaceImport(current) ||
      ts.isImportEqualsDeclaration(current)
    ) {
      return true
    }
    if (ts.isStatement(current)) return false
    current = current.parent
  }
  return false
}

function isDirectCallee(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  return (
    (ts.isCallExpression(parent) && parent.expression === identifier) ||
    (ts.isPropertyAccessExpression(parent) &&
      parent.name === identifier &&
      ts.isCallExpression(parent.parent) &&
      parent.parent.expression === parent)
  )
}

let matchingCalls = 0
let unresolvedCalls = 0
const unresolvedNames = new Map<string, number>()

for (const source of program.getSourceFiles()) {
  const file = relative(source.fileName)
  if (source.isDeclarationFile || !inScope(file)) continue
  const visit = (node: ts.Node) => {
    if (
      ts.isIdentifier(node) &&
      NAME_RE.test(node.text) &&
      !isOwnDeclarationName(node) &&
      !isDirectCallee(node) &&
      !isTypePosition(node) &&
      !isImportName(node)
    ) {
      for (const record of resolveIdentifier(node)) record.valueRefs.push(location(node))
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const identifier = ts.isPropertyAccessExpression(callee)
        ? callee.name
        : ts.isIdentifier(callee)
          ? callee
          : null
      if (identifier && NAME_RE.test(identifier.text)) {
        matchingCalls++
        const targets = resolveIdentifier(identifier)
        if (targets.length === 0) {
          unresolvedCalls++
          unresolvedNames.set(identifier.text, (unresolvedNames.get(identifier.text) ?? 0) + 1)
        } else {
          for (const target of targets) {
            target.callerFiles.add(file)
            target.callSites.push(location(node))
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

const rows = [...declarations.values()].sort(
  (a, b) =>
    b.callerFiles.size - a.callerFiles.size ||
    b.callSites.length - a.callSites.length ||
    a.where.localeCompare(b.where)
)

const scanned = program
  .getSourceFiles()
  .map(source => relative(source.fileName))
  .filter(inScope)
const counts = Object.fromEntries(
  SOURCE_ROOTS.map(root => [root, scanned.filter(file => file.startsWith(`${root}/`)).length])
)

console.log(`program: ${scanned.length} in-scope files (${JSON.stringify(counts)})`)
console.log(`declarations matching /${NAME_RE.source}/i: ${rows.length}`)
console.log('\nDECLARATIONS')
for (const row of rows) {
  console.log(
    `${String(row.callerFiles.size).padStart(3)} files ${String(row.callSites.length).padStart(4)} calls ${String(row.valueRefs.length).padStart(4)} value refs  ${row.exported ? 'exported' : 'local   '}  ${row.name} @ ${row.where}`
  )
  for (const site of row.callSites) console.log(`      call  ${site}`)
  for (const site of row.valueRefs) console.log(`      value ${site}`)
}

console.log('\nUNRESOLVED MATCHING CALLS')
console.log(`${unresolvedCalls} of ${matchingCalls}`)
for (const [name, count] of [...unresolvedNames].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)} ${name}`)
}

const controlProblems: string[] = []
for (const root of SOURCE_ROOTS) {
  if (counts[root] === 0) controlProblems.push(`scanned zero files under ${root}/`)
}
const canonicalControl = rows.find(
  row => row.name === 'calculateKalchm' && row.where.startsWith('lib/thermodynamics/kalchm.ts:')
)
if (!canonicalControl) {
  controlProblems.push('did not find the known calculateKalchm declaration')
} else if (
  !canonicalControl.callSites.some(site => site.startsWith('lib/agents/alchemical-profiles.ts:'))
) {
  controlProblems.push('did not resolve the known cross-file calculateKalchm call')
}
const valueControl = rows.find(
  row =>
    row.name === 'kalchmValueReferenceControl' &&
    row.where.startsWith('scripts/fixtures/thermo-value-reference-control.ts:')
)
if (!valueControl) {
  controlProblems.push('did not find the value-reference control declaration')
} else if (valueControl.callSites.length !== 0 || valueControl.valueRefs.length === 0) {
  controlProblems.push('value-reference control was not classified as zero-call but live')
}

console.log('\nCONTROLS')
if (controlProblems.length > 0) {
  for (const problem of controlProblems) console.error(`✗ ${problem}`)
  process.exitCode = 1
} else {
  console.log('✓ source-tree coverage is non-zero')
  console.log('✓ known cross-file import alias resolves to canonical calculateKalchm')
  console.log('✓ zero-call function value is classified as live')
}

if (jsonPath) {
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      rows.map(({ node: _node, callerFiles, ...row }) => ({
        ...row,
        callerFiles: [...callerFiles].sort(),
      })),
      null,
      2
    )
  )
  console.log(`\nfull map written to ${jsonPath}`)
}
