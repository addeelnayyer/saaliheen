#!/usr/bin/env node
// Intake: read one addeelnayyer/quran-word-by-word issue and write the delivery record.
//
//   node gh-issue.mjs <issue-number> --out <DELIVERY dir>
//
// Writes <out>/issue.md (body, labels, parent, blockers, comments) and
// <out>/ledger.md (the acceptance ledger: one AC-<n> row per checklist leaf
// under "## Acceptance criteria"). Reads only; changes nothing on GitHub.
// Prints ISSUE, LABELS, PARENT, BLOCKERS, LEDGER, READY-LABEL and
// INTAKE: PASS | FAIL — <reasons>. Exit 1 on FAIL.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = 'addeelnayyer/quran-word-by-word';
const args = process.argv.slice(2);
const n = args[0];
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
if (!/^\d+$/.test(n ?? '') || !out) die('usage: gh-issue.mjs <issue-number> --out <dir>');

const issue = gh(['issue', 'view', n, '--repo', REPO, '--json', 'number,title,state,body,labels,comments,assignees,url']);
const labels = issue.labels.map((l) => l.name);
const sections = split(issue.body);

const parent = [...(sections.get('parent') ?? '').matchAll(/#(\d+)/g)].map((m) => Number(m[1]))[0];
const blockedText = sections.get('blocked by') ?? '';
const blockers = /\bnone\b/i.test(blockedText) ? [] : [...new Set([...blockedText.matchAll(/#(\d+)/g)].map((m) => Number(m[1])))];
// GitHub native dependencies, where enabled (best effort).
const native = spawnSync('gh', ['api', `repos/${REPO}/issues/${n}/dependencies/blocked_by`, '--jq', '.[].number'], { encoding: 'utf8' });
if (native.status === 0) for (const x of native.stdout.split('\n').filter(Boolean)) if (!blockers.includes(Number(x))) blockers.push(Number(x));

const look = (id) => gh(['issue', 'view', String(id), '--repo', REPO, '--json', 'number,title,state']);
const parentRow = parent ? look(parent) : null;
const blockerRows = blockers.map(look);

// Checklist lines become rows; a line with nested items is a heading, and each
// leaf under it becomes its own row prefixed with that heading.
const items = (sections.get('acceptance criteria') ?? '')
  .split('\n')
  .map((l) => /^(\s*)[-*]\s*\[( |x|X)\]\s*(.+)$/.exec(l) ?? /^(\s*)[-*]\s+(?!\[)(.+)$/.exec(l))
  .filter(Boolean)
  .map((m) => ({ depth: m[1].length, done: m.length === 4 && /x/i.test(m[2]), text: (m[3] ?? m[2]).trim() }));
const ledger = [];
const heads = [];
items.forEach((it, k) => {
  while (heads.length && heads.at(-1).depth >= it.depth) heads.pop();
  if (items[k + 1]?.depth > it.depth) { heads.push(it); return; }
  const prefix = heads.map((h) => h.text.replace(/:\s*$/, '')).join(' — ');
  ledger.push({ done: it.done, text: prefix ? `${prefix} — ${it.text}` : it.text });
});

fs.mkdirSync(out, { recursive: true });
const row = (x) => `#${x.number} [${x.state}] ${x.title}`;
fs.writeFileSync(path.join(out, 'issue.md'), [
  `# #${issue.number} — ${issue.title}`, '',
  `- State: ${issue.state} · Labels: ${labels.join(', ') || 'none'} · Assignees: ${issue.assignees.map((a) => a.login).join(', ') || 'none'}`,
  `- Parent: ${parentRow ? row(parentRow) : 'none'}`,
  `- Blocked by: ${blockerRows.length ? blockerRows.map(row).join('; ') : 'none'}`,
  `- Link: ${issue.url}`, '',
  '## Body', '', issue.body, '',
  ...(issue.comments.length ? ['## Comments', ...issue.comments.flatMap((c) => [`### @${c.author.login} · ${c.createdAt.slice(0, 10)}`, c.body, ''])] : []),
].join('\n'));
fs.writeFileSync(path.join(out, 'ledger.md'), [
  `# Acceptance ledger — #${issue.number}`, '',
  'One row per checklist leaf of the issue\'s Acceptance criteria. Every stage cites these ids.', '',
  ...ledger.map((r, k) => `- AC-${k + 1}: ${r.text}${r.done ? ' (ticked on the issue)' : ''}`), '',
].join('\n'));

const problems = [];
if (issue.state !== 'OPEN') problems.push(`issue is ${issue.state.toLowerCase()}`);
for (const b of blockerRows) if (b.state !== 'CLOSED') problems.push(`blocked by open ${row(b)}`);
for (const l of ['needs-triage', 'needs-info', 'ready-for-human', 'wontfix']) if (labels.includes(l)) problems.push(`labelled ${l}`);
if (!ledger.length) problems.push('no checklist under "## Acceptance criteria": the issue states nothing checkable');

console.log(`ISSUE: #${issue.number} ${issue.title}`);
console.log(`LABELS: ${labels.join(', ') || 'none'}`);
console.log(`PARENT: ${parentRow ? row(parentRow) : 'none'}`);
console.log(`BLOCKERS: ${blockerRows.length ? blockerRows.map(row).join('; ') : 'none'}`);
console.log(`LEDGER: ${ledger.length} rows (${ledger.filter((r) => r.done).length} ticked)`);
console.log(`READY-LABEL: ${labels.includes('ready-for-agent') ? 'yes' : 'no'}`);
console.log(`WROTE: ${path.join(out, 'issue.md')}, ${path.join(out, 'ledger.md')}`);
console.log(`INTAKE: ${problems.length ? `FAIL — ${problems.join('; ')}` : 'PASS'}`);
process.exit(problems.length ? 1 : 0);

function split(body) {
  const map = new Map();
  let cur = 'intro';
  for (const line of body.split(/\r?\n/)) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) { cur = h[1].toLowerCase(); map.set(cur, ''); continue; }
    map.set(cur, `${map.get(cur) ?? ''}${line}\n`);
  }
  return map;
}

function gh(argv) {
  const r = spawnSync('gh', argv, { encoding: 'utf8' });
  if (r.status !== 0) die((r.stderr || r.stdout || `gh ${argv.join(' ')} failed`).trim());
  return JSON.parse(r.stdout);
}

function die(msg) { console.error(msg); process.exit(2); }
