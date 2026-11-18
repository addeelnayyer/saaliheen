#!/usr/bin/env node
// Gherkin parse gate — zero dependencies, no network.
//
// Copied from ~/.agents/shared/ts-gates and extended for quran-word-by-word:
// --ledger checks acceptance-ledger tags.
//
// Usage:
//   node parse-features.mjs [dir-or-file ...] [--ledger DELIVERY/ledger.md [--exempt AC-1,AC-12]]
//
// Default target: features/ . Exits 1 on any parse error, 0 with counts.
// With --ledger, every scenario must carry at least one @AC-<n> tag naming a
// ledger row, and every ledger row not in --exempt (rows proven by a CHECK
// line instead) must be tagged on some scenario; each miss is an error.
//
// Accepts: Feature, Background, Rule, Scenario, Scenario Outline / Scenario
// Template, Examples, Given/When/Then/And/But, tags, docstrings ("""/```),
// data tables (| … |), comments (#).

import fs from "node:fs"
import path from "node:path"

const argv = process.argv.slice(2)
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null)
const ledgerPath = flag("--ledger")
const exempt = new Set((flag("--exempt") ?? "").split(",").map((x) => x.trim()).filter(Boolean))
const positional = argv.filter((a, i) => !a.startsWith("--") && !["--ledger", "--exempt"].includes(argv[i - 1]))
const targets = positional.length ? positional : ["features"]
const tagged = new Map() // AC-n -> [file:line scenario]
const files = targets.flatMap(collect)

if (files.length === 0) {
  console.error(`no .feature files found under: ${targets.join(", ")}`)
  process.exit(1)
}

let features = 0
let scenarios = 0
let steps = 0
let examples = 0
const errors = []

for (const file of files) {
  const result = parseFeature(file)
  errors.push(...result.errors)
  features += result.features
  scenarios += result.scenarios
  steps += result.steps
  examples += result.examples
  console.log(
    `${result.errors.length ? "FAIL" : "ok  "}  ${file}  ` +
      `scenarios=${result.scenarios} steps=${result.steps} examples=${result.examples}`,
  )
}

if (ledgerPath) {
  const rows = [...fs.readFileSync(ledgerPath, "utf8").matchAll(/^- (AC-\d+):/gm)].map((m) => m[1])
  for (const [tag, where] of tagged) {
    if (!rows.includes(tag)) errors.push(`${where[0]}: @${tag} names no ledger row`)
  }
  for (const r of rows) {
    if (exempt.has(r)) continue
    if (tagged.has(r)) console.log(`${r}  ${tagged.get(r).join("; ")}`)
    else errors.push(`${r}: no scenario tagged @${r} (and not exempted as a CHECK row)`)
  }
}

if (errors.length) {
  console.error("\nparse errors:")
  for (const e of errors) console.error(`  ${e}`)
}

console.log(
  `\nfiles=${files.length} features=${features} scenarios=${scenarios} ` +
    `steps=${steps} exampleRows=${examples} errors=${errors.length}`,
)

process.exit(errors.length ? 1 : 0)

// ---------------------------------------------------------------- helpers

function collect(target) {
  if (!fs.existsSync(target)) return []
  const stat = fs.statSync(target)
  if (stat.isFile()) return target.endsWith(".feature") ? [target] : []
  return fs
    .readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collect(path.join(target, entry.name)))
}

function parseFeature(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/)
  const errors = []
  const counts = { features: 0, scenarios: 0, steps: 0, examples: 0 }

  let inDocString = null
  let sawFeature = false
  let currentScenario = null
  let currentScenarioIsOutline = false
  let currentScenarioSawExamples = false
  let stepsInScenario = 0
  let inExamplesTable = false
  let exampleHeaderSeen = false
  let pendingTags = []
  let featureTags = []

  const at = (i) => `${file}:${i + 1}`

  const closeScenario = (i) => {
    if (!currentScenario) return
    if (stepsInScenario === 0) errors.push(`${at(i)}: scenario "${currentScenario}" has no steps`)
    if (currentScenarioIsOutline && !currentScenarioSawExamples) {
      errors.push(`${at(i)}: scenario outline "${currentScenario}" has no Examples table`)
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()

    if (inDocString) {
      if (line === inDocString) inDocString = null
      continue
    }
    if (line === '"""' || line === "```") {
      if (!currentScenario) errors.push(`${at(i)}: docstring outside a scenario`)
      inDocString = line
      continue
    }

    if (line === "" || line.startsWith("#")) continue
    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).filter((t) => t.startsWith("@")).map((t) => t.slice(1)))
      continue
    }

    if (/^Feature:/.test(line)) {
      if (sawFeature) errors.push(`${at(i)}: second Feature: in one file`)
      if (!line.slice("Feature:".length).trim()) errors.push(`${at(i)}: Feature has no name`)
      sawFeature = true
      featureTags = pendingTags
      pendingTags = []
      counts.features++
      inExamplesTable = false
      continue
    }

    if (!sawFeature) {
      errors.push(`${at(i)}: content before Feature: — "${truncate(line)}"`)
      sawFeature = true // report once, keep parsing
      continue
    }

    if (/^(Rule|Background):/.test(line)) {
      pendingTags = []
      closeScenario(i)
      currentScenario = null
      inExamplesTable = false
      continue
    }

    if (/^(Scenario Outline|Scenario Template|Scenario|Example):/.test(line)) {
      closeScenario(i)
      const name = line.slice(line.indexOf(":") + 1).trim()
      if (!name) errors.push(`${at(i)}: scenario has no name`)
      currentScenario = name || "<unnamed>"
      if (ledgerPath) {
        const acs = [...featureTags, ...pendingTags].filter((t) => /^AC-\d+$/.test(t))
        if (!acs.length) errors.push(`${at(i)}: scenario "${currentScenario}" has no @AC-<n> tag`)
        for (const t of acs) tagged.set(t, [...(tagged.get(t) ?? []), `${at(i)} ${currentScenario}`])
      }
      currentScenarioIsOutline = /^Scenario (Outline|Template):/.test(line)
      currentScenarioSawExamples = false
      stepsInScenario = 0
      inExamplesTable = false
      pendingTags = []
      counts.scenarios++
      continue
    }

    if (/^(Examples|Scenarios):/.test(line)) {
      pendingTags = []
      if (!currentScenarioIsOutline) errors.push(`${at(i)}: Examples outside a Scenario Outline`)
      currentScenarioSawExamples = true
      inExamplesTable = true
      exampleHeaderSeen = false
      continue
    }

    if (line.startsWith("|")) {
      if (!inExamplesTable) continue // step data table — structural check is enough
      if (!exampleHeaderSeen) exampleHeaderSeen = true
      else counts.examples++
      continue
    }

    if (/^(Given|When|Then|And|But|\*)\s+\S/.test(line)) {
      if (!currentScenario && !isBackgroundContext(lines, i)) {
        errors.push(`${at(i)}: step outside a scenario — "${truncate(line)}"`)
      }
      stepsInScenario++
      counts.steps++
      inExamplesTable = false
      continue
    }

    // Free description text under Feature/Scenario is legal Gherkin; only flag
    // lines that look like a mistyped keyword.
    if (/^(Given|When|Then|And|But|Feature|Scenario|Examples|Background|Rule)\b/.test(line)) {
      errors.push(`${at(i)}: malformed keyword line — "${truncate(line)}"`)
    }
  }

  if (inDocString) errors.push(`${file}: unterminated docstring`)
  closeScenario(lines.length - 1)
  if (!counts.features) errors.push(`${file}: no Feature:`)
  if (!counts.scenarios) errors.push(`${file}: no scenarios`)

  return { ...counts, errors }
}

function isBackgroundContext(lines, index) {
  for (let i = index - 1; i >= 0; i--) {
    const line = lines[i].trim()
    if (/^(Scenario Outline|Scenario Template|Scenario|Example):/.test(line)) return false
    if (/^(Background|Rule|Feature):/.test(line)) return /^Background:/.test(line)
  }
  return false
}

function truncate(text) {
  return text.length > 60 ? `${text.slice(0, 57)}...` : text
}
