/**
 * CI gate: absence of a Monica value must remain null, never become a plausible
 * number. It also rejects `||` fallback because zero is a valid computed value.
 *
 * Legal lookalikes such as `monica?: number`, `monica?.toFixed(2)`, and
 * `monica ?? null` are covered by the control fixture.
 *
 * Usage:
 *   bun run scripts/checkNoFabricatedMonicaFallback.ts [--list]
 */
import fs from 'node:fs'
import path from 'node:path'
import * as ts from 'typescript'

const ROOT = process.cwd()
const LIST_ONLY = process.argv.includes('--list')
const CONTROL_FILE = 'scripts/fixtures/monica-fallback-control.ts'
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
const relative = (file: string) => path.relative(ROOT, file).split(path.sep).join('/')
const inScope = (file: string) =>
  SOURCE_ROOTS.some(root => file.startsWith(`${root}/`)) || file === 'server.ts'
const text = (node: ts.Node, source: ts.SourceFile) => node.getText(source)
const METRIC_NAMES = new Set(['monica', 'monicaconstant', 'livemc', 'birthmc'])
const THERMODYNAMIC_PROPERTY_NAMES = new Set([...METRIC_NAMES, 'kalchm'])
function isPropertyKey(identifier: ts.Identifier, parent: ts.Node | undefined): boolean {
  if (!parent) return false
  return (
    ((ts.isPropertyAssignment(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent)) &&
      parent.name === identifier) ||
    (ts.isBindingElement(parent) && parent.propertyName === identifier)
  )
}
function mentionsMonicaMetric(node: ts.Node): boolean {
  let found = false
  const visit = (candidate: ts.Node, parent?: ts.Node) => {
    if (
      ts.isIdentifier(candidate) &&
      METRIC_NAMES.has(candidate.text.toLowerCase()) &&
      !isPropertyKey(candidate, parent)
    ) {
      found = true
      return
    }
    ts.forEachChild(candidate, child => visit(child, candidate))
  }
  visit(node)
  return found
}
function isDirectMetricReference(node: ts.Node): boolean {
  if (ts.isParenthesizedExpression(node)) return isDirectMetricReference(node.expression)
  if (ts.isIdentifier(node)) return METRIC_NAMES.has(node.text.toLowerCase())
  if (ts.isPropertyAccessExpression(node)) {
    return METRIC_NAMES.has(node.name.text.toLowerCase())
  }
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
    return METRIC_NAMES.has(node.argumentExpression.text.toLowerCase())
  }
  return false
}
function isBooleanLike(node: ts.Node): boolean {
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    return true
  }
  if (ts.isBinaryExpression(node)) {
    if (
      node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken
    ) {
      return isBooleanLike(node.left) && isBooleanLike(node.right)
    }
    return [
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.LessThanEqualsToken,
      ts.SyntaxKind.GreaterThanToken,
      ts.SyntaxKind.GreaterThanEqualsToken,
    ].includes(node.operatorToken.kind)
  }
  if (ts.isCallExpression(node)) {
    const name = ts.isIdentifier(node.expression)
      ? node.expression.text
      : ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name.text
        : ''
    return /^(?:is|has|can|should|includes$)/i.test(name)
  }
  return false
}
function isFormattedMetric(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'toFixed'
  )
}
const isNumeric = (node: ts.Node): boolean =>
  ts.isNumericLiteral(node) ||
  (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand))

function functionLikeName(node: ts.Node): string {
  if (
    (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
    node.name &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text
  }
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
  ) {
    return node.name.text
  }
  return ''
}

function containsNumericLiteral(node: ts.Node): boolean {
  if (isNumeric(node)) return true
  let found = false
  ts.forEachChild(node, child => {
    if (!found && containsNumericLiteral(child)) found = true
  })
  return found
}

function propertyName(node: ts.PropertyName): string {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text.toLowerCase()
  }
  return ''
}

function containsFabricatedThermodynamicProperty(node: ts.Node): boolean {
  let found = false
  const visit = (candidate: ts.Node) => {
    if (found) return
    if (ts.isPropertyAssignment(candidate)) {
      const name = propertyName(candidate.name)
      if (
        (THERMODYNAMIC_PROPERTY_NAMES.has(name) && containsNumericLiteral(candidate.initializer)) ||
        (name === 'esms' && containsNumericLiteral(candidate.initializer))
      ) {
        found = true
        return
      }
    }
    ts.forEachChild(candidate, visit)
  }
  visit(node)
  return found
}

function isInsideMonicaOperation(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent
  while (current && !ts.isStatement(current)) {
    if (ts.isCallExpression(current)) {
      const callee = text(current.expression, current.getSourceFile())
      if (/monica/i.test(callee)) return true
    }
    current = current.parent
  }
  return false
}

interface Hit {
  file: string
  line: number
  kind: string
  text: string
}

const hits: Hit[] = []
function addHit(node: ts.Node, source: ts.SourceFile, kind: string) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
  hits.push({
    file: relative(source.fileName),
    line: line + 1,
    kind,
    text: text(node, source).replace(/\s+/g, ' ').slice(0, 240),
  })
}

for (const source of program.getSourceFiles()) {
  const file = relative(source.fileName)
  if (source.isDeclarationFile || !inScope(file)) continue
  const visit = (node: ts.Node) => {
    const candidateFunctionName = functionLikeName(node)
    if (
      /(?:fallback|default)/i.test(candidateFunctionName) &&
      (containsFabricatedThermodynamicProperty(node) ||
        (/^(?:generate|create|build)/i.test(candidateFunctionName) &&
          mentionsMonicaMetric(node) &&
          containsNumericLiteral(node)))
    ) {
      addHit(node, source, 'numeric fallback generator')
    }

    if (
      /chart.*to.*(?:agent|profile)/i.test(candidateFunctionName) &&
      containsFabricatedThermodynamicProperty(node)
    ) {
      addHit(node, source, 'numeric chart-to-agent metric')
    }

    if (
      ts.isBinaryExpression(node) &&
      (mentionsMonicaMetric(node.left) || isInsideMonicaOperation(node))
    ) {
      if (
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
        !isBooleanLike(node.left) &&
        !isBooleanLike(node.right) &&
        !isFormattedMetric(node.left) &&
        (isNumeric(node.right) ||
          mentionsMonicaMetric(node.right) ||
          node.right.kind === ts.SyntaxKind.NullKeyword)
      ) {
        addHit(node, source, 'truthiness fallback')
      } else if (
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
        isNumeric(node.right)
      ) {
        addHit(node, source, 'numeric nullish fallback')
      }
    }

    if (
      ts.isConditionalExpression(node) &&
      isDirectMetricReference(node.condition) &&
      (isNumeric(node.whenTrue) || isNumeric(node.whenFalse))
    ) {
      addHit(node, source, 'numeric conditional fallback')
    }

    if (
      (ts.isBindingElement(node) || ts.isParameter(node)) &&
      !file.startsWith('test/') &&
      node.name &&
      mentionsMonicaMetric(node.name) &&
      node.initializer &&
      isNumeric(node.initializer)
    ) {
      addHit(node, source, 'numeric default initializer')
    }

    if (ts.isCallExpression(node) && node.arguments.length >= 2) {
      const fallback = node.arguments[node.arguments.length - 1]
      const valueArguments = node.arguments.slice(0, -1)
      if (
        isNumeric(fallback) &&
        valueArguments.some(argument => mentionsMonicaMetric(argument)) &&
        /^(safe|first|fallback|default|coalesce)/i.test(
          ts.isIdentifier(node.expression)
            ? node.expression.text
            : ts.isPropertyAccessExpression(node.expression)
              ? node.expression.name.text
              : ''
        )
      ) {
        addHit(node, source, 'numeric helper fallback')
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(source)
}

const scanned = program
  .getSourceFiles()
  .map(source => relative(source.fileName))
  .filter(inScope)
const missingRoots = SOURCE_ROOTS.filter(root => !scanned.some(file => file.startsWith(`${root}/`)))
if (missingRoots.length > 0) {
  console.error(`✗ COVERAGE FAILED: zero files scanned under ${missingRoots.join(', ')}`)
  process.exit(1)
}

const controlHits = hits.filter(hit => hit.file === CONTROL_FILE)
const controlKinds = new Set(controlHits.map(hit => hit.kind))
if (
  controlHits.length !== 3 ||
  !controlKinds.has('numeric nullish fallback') ||
  !controlKinds.has('numeric fallback generator') ||
  !controlKinds.has('numeric chart-to-agent metric') ||
  !controlHits.some(hit => hit.text.includes('1.618'))
) {
  console.error(
    `✗ CONTROL FAILED: expected nullish, fallback-object, and chart-adapter defects, found ${JSON.stringify(controlHits)}`
  )
  process.exit(1)
}

const sourceHits = hits.filter(hit => hit.file !== CONTROL_FILE)
if (LIST_ONLY) {
  for (const hit of sourceHits) {
    console.log(`${hit.file}:${hit.line} [${hit.kind}] ${hit.text}`)
  }
  console.log(
    `\n✓ controls distinguished 3 bad constructions from optional property, optional chaining, and ?? null`
  )
  console.log(`✓ scanned ${scanned.length} files; ${sourceHits.length} source hit(s)`)
  process.exit(0)
}

if (sourceHits.length > 0) {
  console.error(`✗ ${sourceHits.length} fabricated Monica fallback(s)\n`)
  for (const hit of sourceHits) {
    console.error(`${hit.file}:${hit.line} [${hit.kind}] ${hit.text}`)
  }
  console.error('\nPropagate null and handle absence explicitly at the display/consumer boundary.')
  process.exit(1)
}

console.log('✓ no fabricated Monica numeric or truthiness fallbacks')
console.log('✓ nullish/fallback-object/chart-adapter controls and legal lookalikes passed')
