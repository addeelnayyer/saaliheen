#!/usr/bin/env node
// Domain gate: the QUL sources frozen, the module boundary (only the builder
// reads the sources), no third-party Quran API at runtime, Script text rules
// (ADR 0002), the stack and commit subjects — over what base..working tree adds.
//
// CONTEXT.md and docs/adr/ are not frozen: the relay writes the glossary
// entries and ADRs its issue needs. Quran data is moving into Neon behind the
// versioned API, so a database driver or a route handler is no longer a finding.
//
//   node check-invariants.mjs <base-sha>
//
// Run from the worktree root. FAIL lines fail the gate. REVIEW lines need a
// rename or a one-line justification in the stage's NOTES.
// Prints INVARIANTS: PASS | FAIL; exit 1 on FAIL.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) { console.error('usage: check-invariants.mjs <base-sha>'); process.exit(2); }
const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const root = git(['rev-parse', '--show-toplevel']).trim();
process.chdir(root);
const fails = [];
const reviews = [];
// The website is apps/web in the pnpm monorepo (#63); git names its files from the repo root.
const APP = 'apps/web';

// ---- Frozen: the sources are QUL's and roots.json's, never edited by hand.
const FROZEN = [`${APP}/data/qul`, `${APP}/data/roots.json`];
// A source moved unchanged (R100, as #63 moved data/ into apps/web) is not an edit.
const BEFORE_APP = ['data/qul', 'data/roots.json'];
const touched = [
  ...git(['diff', '--name-status', '-M', base, '--', ...FROZEN, ...BEFORE_APP]).split('\n')
    .filter((l) => l && !l.startsWith('R100\t')).map((l) => l.split('\t').at(-1)),
  ...git(['ls-files', '--others', '--exclude-standard', '--', ...FROZEN]).split('\n'),
].filter(Boolean);
for (const f of new Set(touched)) fails.push(`${f}: frozen — the sources change only by the reviewer`);

// ---- Commit subjects: imperative, ending (#<n>).
for (const s of git(['log', '--format=%s', `${base}..HEAD`]).split('\n').filter(Boolean)) {
  if (!/\(#\d+\)$/.test(s)) fails.push(`commit "${s}": subject must end "(#<n>)"`);
}

// ---- Added lines, working tree included.
const added = new Map();
let file = null;
let lineNo = 0;
for (const raw of git(['diff', '-U0', '--no-color', '--no-ext-diff', base, '--']).split('\n')) {
  if (raw.startsWith('+++ ')) { file = raw === '+++ /dev/null' ? null : raw.slice(6); if (file) added.set(file, added.get(file) ?? []); continue; }
  const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
  if (h) { lineNo = Number(h[1]); continue; }
  if (file && raw.startsWith('+')) { added.get(file).push({ line: lineNo, text: raw.slice(1) }); lineNo += 1; }
}
for (const f of git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
  if (!fs.statSync(f).isFile() || fs.readFileSync(f).subarray(0, 8000).includes(0)) continue;
  added.set(f, fs.readFileSync(f, 'utf8').split('\n').map((text, k) => ({ line: k + 1, text })));
}

// Sources, the generated dataset, static assets and our own docs carry Quran
// text and translations; no gate reads their lines.
const skip = (f) => /^(apps\/web\/)?(data|public|node_modules|\.next)\//.test(f) || /^\.claude\//.test(f)
  || /^(CONTEXT\.md|docs\/adr\/)/.test(f)
  || /(^|\/)pnpm-lock\.yaml$/.test(f)
  || /\.(png|jpe?g|gif|ico|svg|woff2?|otf|ttf|db|pdf)$/i.test(f);
const isTest = (f) => /(^|\/)(__tests__|tests?|e2e|fixtures?|features)\//.test(f) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(f);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|css|feature)$/;
// UI: the website's pages, layouts and components, and the mobile app's routes
// and screens. The builder is the code that opens the sources.
const isWebUi = (f) => /^apps\/web\/src\/(app|components)\//.test(f) && !/(^|\/)route\.[cm]?[jt]sx?$/.test(f) && !isTest(f);
const isMobile = (f) => /^apps\/mobile\/(app|src)\//.test(f) && !isTest(f);
const isUi = (f) => isWebUi(f) || isMobile(f);
// A database driver belongs in server code (route handlers, src/account/,
// the data layer, scripts), never in a client component or the mobile app.
const DB = /['"`](pg|postgres|@neondatabase\/serverless|drizzle-orm[^'"`]*|@prisma\/client|@vercel\/postgres)['"`]/;

const rules = [
  // Module boundary (#1): only the builder reads the sources or opens SQLite.
  { re: /['"`](better-sqlite3|sqlite3?|node:sqlite|sql\.js)['"`]/, why: 'the UI never opens SQLite; only the dataset builder reads the sources', where: isUi },
  { re: /data\/qul|roots\.json/, why: 'the UI never reads the sources; pages get data from the dataset reader', where: isUi },
  { re: /from\s+['"`][^'"`]*\bbuild(er)?\b[^'"`]*['"`]/i, why: 'the UI imports the dataset reader, never the builder', where: isUi },
  // Quran data is Saaliheen's own: served from its own API and files, never a third party's
  // (Recitation audio from Tarteel's CDN is ADR 0010's exception and does not match these).
  { re: /api\.quran\.com|qurancdn|quran\.com\/api|qul\.tarteel\.ai|api\.alquran\.cloud|tanzil\.net/i, why: 'no Quran data fetched from a third-party API at runtime; it comes from our own API and database', where: (f) => !isTest(f) },
  { re: /fetch\(\s*['"`]https?:/, why: 'the website fetches its own origin (relative URLs), never an absolute address', where: (f) => /^apps\/web\/src\//.test(f) && !isTest(f) },
  { re: DB, why: 'a database driver belongs in server code, never in the mobile app', where: isMobile },
  { re: /['"`](mysql2?|mongodb|mongoose|@vercel\/(kv|blob))['"`]/, why: 'the database is Neon Postgres (ADR 0008)', where: (f) => !isTest(f) },
  // ADR 0002 and the dropped font.
  { re: /uthman[\s_-]?taha|UthmanTN/i, why: 'ADR 0002: Uthman Taha is not used; Uthmani is QPC Hafs', where: () => true },
  // Stack (#1): CSS Modules and tokens; Tailwind removed.
  { re: /@tailwind\b|@import\s+['"]tailwindcss|['"`](tailwindcss|@tailwindcss\/[a-z-]+)['"`]/, why: 'Tailwind is removed; style with CSS Modules and the mockup tokens', where: () => true },
  { re: /fonts\.(googleapis|gstatic)\.com/, why: 'Google fonts load through next/font/google (self-hosted at build), never by URL', where: (f) => /^apps\/web\/src\//.test(f) },
];
const reviewRules = [
  { re: DB, why: 'a page or component opening the database directly; say why it does not go through the data layer or the API', where: isWebUi },
];

let scanned = 0;
for (const [f, lines] of added) {
  if (skip(f)) continue;
  scanned += 1;
  for (const r of reviewRules.filter((r) => r.file && r.where(f) && r.re.test(f))) reviews.push(`${f}: ${r.why}`);
  if (!CODE.test(f) && !/\.(md|json)$/.test(f)) continue;
  for (const { line, text } of lines) {
    const at = `${f}:${line}`;
    for (const r of rules) if (r.where(f) && r.re.test(text)) fails.push(`${at}: ${r.why}`);
    for (const r of reviewRules) if (!r.file && r.where(f) && r.re.test(text)) reviews.push(`${at}: ${r.why}`);
  }
}
for (const x of fails) console.log(`FAIL ${x}`);
for (const x of reviews) console.log(`REVIEW ${x}`);
console.log(`SUMMARY: ${scanned} files scanned, ${fails.length} FAIL, ${reviews.length} REVIEW`);
console.log(`INVARIANTS: ${fails.length ? 'FAIL' : 'PASS'}`);
process.exit(fails.length ? 1 : 0);
