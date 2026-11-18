#!/usr/bin/env node
// CRAP score gate for TypeScript / TSX. Adapted from ~/.agents/shared/ts-gates
// for quran-word-by-word: --exclude, and --complexity-only for UI code that #1
// tests only through Playwright (no Vitest coverage exists for it).
//
//   CRAP(f) = complexity^2 * (1 - coverage)^3 + complexity
//
// Complexity comes from the TypeScript AST (the repo's own `typescript`
// package, resolved from the working directory). Coverage comes from an
// istanbul-shaped coverage-final.json, which vitest emits with:
//
//   pnpm vitest run --coverage --coverage.reporter=json
//
// Run it from the website's own directory (apps/web, #63): paths, --include
// and --changed-since are all taken relative to the working directory.
//
// Usage:
//   node ~/.agents/shared/ts-gates/crap.mjs \
//     [--coverage coverage/coverage-final.json] \
//     [--include src/] [--exclude <prefix>] [--max 6] [--changed-since <git-ref>]
//     [--complexity-only] [--top 20] [--json]
//
// --complexity-only scores every function under --include by cyclomatic
// complexity alone (no coverage file read), walking the files on disk.
//
// Exit 0 when every scored function is at or under --max. Exit 1 otherwise.

import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"

const cwd = process.cwd()

// Resolve the package's own typescript, else the website's (one per monorepo is enough to parse).
let ts
for (const from of [cwd, path.join(gitRoot(), "apps/web")]) {
  try {
    ts = createRequire(path.join(from, "package.json"))("typescript")
    break
  } catch {}
}
if (!ts) fail("typescript is not resolvable from " + cwd + " — run `pnpm install` in the worktree")

function gitRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()
  } catch {
    return cwd
  }
}

const args = parseArgs(process.argv.slice(2))
const coveragePath = path.resolve(cwd, args.coverage ?? "coverage/coverage-final.json")
const includePrefix = args.include ?? "src/"
const excludePrefix = typeof args.exclude === "string" ? args.exclude : null
const complexityOnly = Boolean(args["complexity-only"])
const max = Number(args.max ?? 6)
const top = Number(args.top ?? 20)

if (!complexityOnly && !fs.existsSync(coveragePath)) {
  fail(
    `no coverage json at ${coveragePath}\n` +
      `run: pnpm vitest run --coverage --coverage.reporter=json`,
  )
}

const coverage = complexityOnly
  ? Object.fromEntries(walk(includePrefix).map((f) => [f, null]))
  : JSON.parse(fs.readFileSync(coveragePath, "utf8"))
const changed = args["changed-since"] ? changedFiles(args["changed-since"]) : null

const rows = []
for (const [absFile, entry] of Object.entries(coverage)) {
  const rel = path.relative(cwd, path.resolve(cwd, absFile))
  if (!rel.startsWith(includePrefix)) continue
  if (excludePrefix && rel.startsWith(excludePrefix)) continue
  if (changed && !changed.has(rel)) continue
  if (!/\.(ts|tsx|mts|cts)$/.test(rel)) continue
  if (/\.(test|spec|stories)\.(ts|tsx)$/.test(rel)) continue
  if (!fs.existsSync(rel)) continue

  const source = fs.readFileSync(rel, "utf8")
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, scriptKind(rel))
  const statements = entry ? statementOffsets(sf, entry) : []

  for (const fn of collectFunctions(ts, sf)) {
    const complexity = cyclomatic(ts, fn.node)
    const cov = complexityOnly ? { ratio: 1, total: 0, covered: 0 } : functionCoverage(statements, fn.start, fn.end)
    const crap = complexity * complexity * Math.pow(1 - cov.ratio, 3) + complexity
    rows.push({
      file: rel,
      line: sf.getLineAndCharacterOfPosition(fn.start).line + 1,
      name: fn.name,
      complexity,
      coverage: Number(cov.ratio.toFixed(4)),
      statements: cov.total,
      uncovered: cov.total - cov.covered,
      crap: Number(crap.toFixed(2)),
    })
  }
}

rows.sort((a, b) => b.crap - a.crap)
const offenders = rows.filter((r) => r.crap > max)

if (args.json) {
  console.log(JSON.stringify({ max, scored: rows.length, offenders: offenders.length, rows }, null, 2))
} else {
  if (rows.length === 0) {
    console.log(`no functions scored under ${includePrefix} — check --include and the coverage report`)
  }
  const shown = (offenders.length ? offenders : rows).slice(0, top)
  for (const r of shown) {
    console.log(
      `${r.crap.toFixed(2).padStart(8)}  cc=${String(r.complexity).padStart(3)}  ` +
        `${complexityOnly ? "" : `cov=${(r.coverage * 100).toFixed(0).padStart(3)}%  `}${r.file}:${r.line}  ${r.name}`,
    )
  }
  console.log(
    `\nscored ${rows.length} functions · worst ${rows.length ? rows[0].crap.toFixed(2) : "n/a"} · ` +
      `over ${max}: ${offenders.length}` + (complexityOnly ? " (complexity only)" : ""),
  )
}

process.exit(offenders.length ? 1 : 0)

// ---------------------------------------------------------------- helpers

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) out[key] = true
    else {
      out[key] = next
      i++
    }
  }
  return out
}

function fail(message) {
  console.error(message)
  process.exit(2)
}

function changedFiles(ref) {
  const out = execFileSync("git", ["diff", "--name-only", "--relative", `${ref}...HEAD`], { encoding: "utf8" })
  return new Set(out.split("\n").filter(Boolean))
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  if (fs.statSync(dir).isFile()) return [dir]
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => walk(path.join(dir, e.name)))
}

function scriptKind(rel) {
  return rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
}

// istanbul statementMap is line/column based; convert to absolute offsets once.
function statementOffsets(sf, entry) {
  const list = []
  for (const [id, loc] of Object.entries(entry.statementMap ?? {})) {
    const start = safePosition(sf, loc.start)
    if (start == null) continue
    list.push({ start, hits: entry.s?.[id] ?? 0 })
  }
  return list
}

function safePosition(sf, loc) {
  if (!loc || loc.line == null) return null
  try {
    return ts.getPositionOfLineAndCharacter(sf, Math.max(0, loc.line - 1), Math.max(0, loc.column ?? 0))
  } catch {
    return null
  }
}

function functionCoverage(statements, start, end) {
  let total = 0
  let covered = 0
  for (const s of statements) {
    if (s.start < start || s.start >= end) continue
    total++
    if (s.hits > 0) covered++
  }
  // A function with no statements attributed to it is treated as covered:
  // an empty body cannot hide behaviour.
  return { total, covered, ratio: total === 0 ? 1 : covered / total }
}

function collectFunctions(ts, sf) {
  const found = []
  const visit = (node) => {
    if (isFunctionLike(ts, node)) {
      found.push({
        node,
        name: functionName(ts, node, sf),
        start: node.getStart(sf),
        end: node.end,
      })
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(sf, visit)
  return found
}

function isFunctionLike(ts, node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  )
}

function functionName(ts, node, sf) {
  if (node.name && ts.isIdentifier(node.name)) return node.name.text
  if (ts.isConstructorDeclaration(node)) return "constructor"
  const parent = node.parent
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  if (parent && ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  if (parent && ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text
  if (parent && ts.isCallExpression(parent) && ts.isIdentifier(parent.expression)) {
    return `${parent.expression.text}(...)`
  }
  const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
  return `<anonymous>@${line}`
}

// Cyclomatic complexity: 1 + decision points, counting only the nodes that
// belong to this function (nested functions are scored on their own).
function cyclomatic(ts, fn) {
  let complexity = 1
  const walk = (node) => {
    if (node !== fn && isFunctionLike(ts, node)) return
    if (
      ts.isIfStatement(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isCatchClause(node)
    ) {
      complexity++
    } else if (ts.isCaseClause(node)) {
      complexity++
    } else if (ts.isBinaryExpression(node)) {
      const kind = node.operatorToken.kind
      if (
        kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        kind === ts.SyntaxKind.BarBarToken ||
        kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        complexity++
      }
    }
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) &&
      node.questionDotToken
    ) {
      complexity++
    }
    ts.forEachChild(node, walk)
  }
  ts.forEachChild(fn, walk)
  return complexity
}
