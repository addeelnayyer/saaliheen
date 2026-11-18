# Relay contract

Binds every stage of `quran-wbw-gated-delivery`.

## Ground rules

- Work only in the dispatched worktree; run git there. Scratch output goes in DELIVERY. A sibling
  repository the issue names as a source (`~/repos/quran-says` for Themes) may be **read**, never
  written; what you take from it is committed into this repo.
- `DELIVERY/issue.md` is the issue and `DELIVERY/ledger.md` its acceptance ledger. Cite rows as
  `AC-<n>`. Only stage 1 appends rows; nobody renumbers or deletes one.
- The issue's own words win over your reading of them. Where it points elsewhere — its parent
  spec (the issue under `## Parent`, with its Implementation and Testing Decisions), an ADR, a
  sibling issue — read that source. An ADR outranks the issue unless the issue itself asks to
  change that decision; then the change is a new ADR (below), not a quiet departure.
- **Versions** have moved past what you remember: **Next.js 16** and **Expo SDK 57 / React Native
  0.86**. Before writing or reviewing website code, read the guide for what you touch in
  `apps/web/node_modules/next/dist/docs/` and heed its deprecation notices; for the mobile app, read
  the installed package's own docs and types in `apps/mobile/node_modules/` rather than recalling
  an older API.
- **Vocabulary**: use `CONTEXT.md`'s terms in code, tests, UI copy and commits, and never its
  `_Avoid_` words (`verse`, `chapter`, `token`, `gloss`, `font` for a Script, `locale` for a
  Language, and the rest it lists).
- **The glossary and the ADRs are the relay's to keep.** When the issue introduces a term, or the
  work rests on a decision no ADR states (a file layout, a table shape, a storage key, a sort
  tie-break), write it — through the `domain-modeling` skill, in the house format:
  - a term goes into `CONTEXT.md` in its section, with its `_Avoid_` words;
  - a decision is a new `docs/adr/<next number>-<slug>.md`;
  - a decision that reverses an earlier one is a new ADR that names the one it supersedes, and the
    old ADR gets one line at its top, `Superseded by [00NN](00NN-<slug>.md).` — never rewrite an
    accepted ADR's body.
  Commit each with the code it explains, and list it on your verdict's `DECISIONS:` line.
- **The sources stay unedited**: everything in `apps/web/data/qul/` (texts, translations,
  metadata, the SQLite databases, `fonts/`) and `apps/web/data/roots.json`. `check-invariants`
  fails any change to them.
- **Settled decisions.** `docs/adr/` on `origin/main` is the authority; read every ADR before you
  work and follow the latest one on each subject. In short, as of this skill's writing:
  - **0001** Quran data is a static, repo-owned dataset built from QUL, with no runtime calls to
    Quran.com or QUL. **0006** Passages are a file in the repo, and an Admin's edits are commits.
    **0008** Reader data (Accounts, synced Script and Language, Reading places, Conversations, Quran
    Chat limits) lives in Neon Postgres behind the versioned `/api/v1/...` Route Handlers in the
    Next.js app; the mobile app is one more client of that API.
  - **0011** supersedes 0001 and 0006 and part of 0008: every kind of data — the Quran dataset,
    Passages, Phrases, Themes, Recitation timings — moves into Neon behind the same versioned API.
    The QUL sources stay in the repo and an idempotent import loads them before each deploy; pages
    read through one server-side data layer, cached and revalidated on publish; Admin publishes
    write rows in one transaction and keep a revision per publish. The move goes one kind of data
    at a time behind the existing API shapes; a kind not yet moved keeps its JSON file and 0001's
    rules. An issue that adds *new* static JSON data is still built as it asks; say in `NOTES`
    that it will need moving.
  - **0002** Each Script shows its own font-matched text by Word location (Uthmani from QPC Hafs,
    Indo-Pak from Digital Khatt Indopak); a mismatch of Word locations fails the build.
  - **0003** QUL owns Root, Lemma and every count; `roots.json` supplies only Spelling meanings;
    Word cards show QUL's Word meaning; disagreements are reported, never silently resolved.
  - **0004** Static text is unselectable; only what a person types can be selected.
  - **0005** Surahs open in parts inside the app; a direct load, reload or crawl gets the whole
    page. Reuse that mechanism for anything else that opens in parts.
  - **0007** Link previews show no Arabic.
  - **0009** Phrases are hand-marked by Admins and never overlap.
  - **0010** Recitation timings are imported; the audio streams from Tarteel's CDN.
  - Website styling is CSS Modules plus custom-property tokens; Tailwind never comes back. Arabic
    fonts load with `next/font/local`, Noto Nastaliq Urdu and IBM Plex Sans with
    `next/font/google`, self-hosted at build.
  - Language comes from the URL on the website (`/ur`, `/en`). The other reader settings are kept
    per device and put on `<html>` before first paint; Script and Language also sync to an Account
    (#70).
- **Layout and commands.** A pnpm monorepo: the website is `apps/web` (`@saaliheen/web`), the
  mobile app `apps/mobile` (`@saaliheen/mobile`, Expo), shared code in `packages/` (`dataset`,
  `passages`, `reading-places`). From the root, `pnpm dev`, `dataset`, `build`, `start`,
  `test:e2e` and `test:api` run the website's script; `pnpm lint`, `typecheck` and `test` run in
  every package. `pnpm exec <tool>` (vitest, playwright, bddgen) runs from the app's own directory.
  - Website: `src/dataset/` is the builder and the reader, `src/account/` the reader data,
    `src/app/` the pages, layouts and Route Handlers (`api/v1/`, `data/v1/`, `parts/`).
  - Mobile: `src/` is the app's logic (Quran Analysis, Recitation, Reading places), `src/screens/`
    and `app/` (expo-router) are its screens.
- **Seams, written as Gherkin.** Every acceptance test is a scenario in a `.feature` file, tagged
  with the ledger rows it proves (`@AC-3 @AC-4`):
  - `apps/web/features/dataset/` — Vitest through `@amiceli/vitest-cucumber`, on the builder's
    entry point and the real committed sources.
  - `apps/web/features/site/` — Playwright through `playwright-bdd`, driving the production build
    as a user does (step definitions in `features/site/steps/`).
  - `apps/web/features/api/` — Vitest through vitest-cucumber over HTTP against the production
    build and the run's own Postgres (`pnpm test:api`); the API contract both apps rely on.
  - `apps/mobile/features/` — Vitest through vitest-cucumber in Node, driving the app's logic in
    `src/` against the data and API the website serves (`features/support.ts`). The screens have
    no automated seam: what a person sees on them is checked on a simulator (below).
  - Steps speak the glossary and what a user sees: `Given I open Surah 1 in Urdu`, `Then the Word
    card at 1:5:2 shows its Urdu Word meaning`. Nothing tests component internals or private
    helpers.
- **CRAP ≤ 6** for every function this issue changes, where
  `CRAP = complexity² × (1 − coverage)³ + complexity`. Code with a Vitest seam — the website's
  `src/dataset/`, the mobile app's `src/` outside `src/screens/` — is scored on Vitest coverage.
  Screens, pages, components and Route Handlers are held to cyclomatic complexity ≤ 6.
- **Scripture is quoted, never composed.** Arabic in a scenario, a step or a fixture is read from
  the sources (or a generated file as last committed, from git), never typed from memory. The only Arabic you may type is a
  Root's spaced letters or a Word the issue itself quotes. Urdu names and titles an issue asks you
  to *draft* (Theme names, Passage titles) are not scripture: draft them, and list every one in
  `DELIVERY/drafted-urdu.md` for the Scholar.
- pnpm only (`pnpm-lock.yaml`). Commit subjects are imperative sentences ending `(#<n>)`
  (`Build the Surah dataset from QUL (#2)`). Stage files by explicit path; never `git add -A` or
  `git commit -a`. End each commit message with the attribution trailer the session's system
  reminder gives.
- Your final response is the verdict block and nothing else.

## Checks

The **repo checks**, run from the worktree root:

```bash
pnpm lint
pnpm typecheck
pnpm test                                        # every package, mobile included
pnpm build                                       # the website; reads no database
PORT=3<nnn> pnpm test:e2e                        # site scenarios, both release switches, then the API features
```

- `<nnn>` is the issue number zero-padded to three digits. Never use another relay's port.
- `test:e2e` ends with `pnpm test:api`, which starts its own Postgres for the run. A first
  `pnpm build` that cannot fetch the Google fonts, or a Postgres that cannot start, is `infra`, not
  red: say so in `NOTES`.
- A failure already on `origin/main` is not this issue's: name it in `NOTES` with the proof that
  main fails it too, and do not absorb it.

**The built site**, for evidence a person sees on the website: after `pnpm build`,
`pnpm start -p 3<nnn>` in the background, then Playwright or `curl -s http://127.0.0.1:3<nnn>/<path>`.
Stop that server before you report; never stop one you did not start. Screenshots go in
`DELIVERY/screens/`, named `AC-<n>-<what>-<light|dark>-<desktop|phone>.png`; the phone viewport is
390×844.

**The simulator**, for evidence a person sees in the mobile app: build and run the app on an iOS
simulator (`mcp__Claude_Code_iOS_Simulator__control`, or `pnpm --filter @saaliheen/mobile ios`)
against the website served on `3<nnn>`, drive it, and save screenshots as
`DELIVERY/screens/AC-<n>-<what>-<light|dark>-ios.png`. A row that needs Android, a real device,
lock-screen or background audio, airplane mode, or an app-store build is `for the user`: write the
steps in `DELIVERY/by-hand.md` (what to do, what to see) and leave the row for them.

**The feature gate**, every stage that touches a `features/` folder runs it over the folders the
issue touches:

```bash
node <skill-dir>/scripts/parse-features.mjs apps/web/features apps/mobile/features --ledger DELIVERY/ledger.md --exempt <CHECK, HAND and scenario-less SIM rows>
```

It parses every `.feature`, fails a scenario with no `@AC-<n>` tag, and fails a ledger row that no
scenario carries unless `evidence.md` proves it with a `CHECK`, `HAND` or `SIM` line (pass those
as `--exempt`). Evidence lines are `TEST`, `PAGE`, `SIM`, `HAND` and `CHECK` (stage 1 § 7).

**The CRAP gate**, stages 5 and 7 run it, from each app the issue changed:

```bash
cd apps/web
pnpm exec vitest run --coverage --coverage.reporter=json
node <skill-dir>/scripts/crap.mjs --include src/dataset/ --max 6 --changed-since <base-sha>
node <skill-dir>/scripts/crap.mjs --include src/ --exclude src/dataset/ --complexity-only --max 6 --changed-since <base-sha>

cd apps/mobile
pnpm exec vitest run --coverage --coverage.reporter=json
node <skill-dir>/scripts/crap.mjs --include src/ --exclude src/screens/ --max 6 --changed-since <base-sha>
node <skill-dir>/scripts/crap.mjs --include src/screens/ --complexity-only --max 6 --changed-since <base-sha>
node <skill-dir>/scripts/crap.mjs --include app/ --complexity-only --max 6 --changed-since <base-sha>
```

A `packages/*` change is scored by complexity alone from that package's directory
(`--include src/ --complexity-only`) until the package has tests of its own.

**The domain gates**, stages 4 to 7 run these:

```bash
node <skill-dir>/scripts/check-invariants.mjs <base-sha>    # sources frozen, module boundaries, no third-party Quran API, commit subjects
```

## Verdict block

```text
ISSUE: #<n>
STAGE: <n> <name>
STATUS: PASS | FAIL
TOOL: <exact commands run>
NUMBERS: <the counts this stage's gate reads>
LEDGER: <every AC row -> evidence, or the stage that owns it next; ranges allowed: AC-1..AC-4 -> ...>
SKIPPED: <item — reason category — one-line why; or "none">
CHANGED: <files, or none>
COMMIT: <shas, or none>
DECISIONS: <glossary terms and ADRs this stage wrote, with their files, and any it judged needed but left; or "none">
NOTES: <what the next stage or the runner needs>
```

`STATUS: PASS` needs non-empty `TOOL`, and `LEDGER` must account for every row.

## Budget

Keep one dispatch under 150,000 tokens. The sources are large (the two Quran texts are 8 MB each):
read them with `jq`, `sqlite3` or a short script that prints the slice you need, never whole. If
the slice passes roughly ten files, or the test loop keeps widening, stop and return
`STATUS: FAIL` with `NOTES: budget — split as <coherent slices>`.
