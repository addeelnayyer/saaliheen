# Stage 4 — Domain steward

Make the change belong in Saaliheen without changing what it does: the glossary's words, the ADRs'
decisions, the module boundaries, and Quran text quoted exactly — and leave the glossary and the
ADRs saying what the code now does. You may refactor production code, rename things and write
`CONTEXT.md` and `docs/adr/`; tests' assertions stay as they are.

## Steps

1. Read `git diff <base-sha>..HEAD`, `CONTEXT.md`, every ADR, and the parent spec's
   **Implementation Decisions**.
2. Run the domain gates (`CONTRACT.md` § Checks) and keep their output:
   ```bash
   node <skill-dir>/scripts/check-invariants.mjs <base-sha>
   ```
3. Clear every `FAIL`. Settle every `REVIEW` line: fix it, or give it one line in `NOTES` saying
   why it stands.
4. Review what the scripts cannot see:
   - **Vocabulary** in identifiers, feature and scenario names, step text, UI copy (both
     Languages, both apps) and commit subjects: `CONTEXT.md`'s terms, never its `_Avoid_` words.
   - **Glossary current.** Every concept the change introduces has its `CONTEXT.md` entry, in the
     file's format and section, with its `_Avoid_` words; an entry the change made wrong is
     amended. Write what is missing yourself, through the `domain-modeling` skill.
   - **ADRs current.** Every decision the change rests on that no ADR states — a table, a route's
     version, a file layout, a storage key, a sort tie-break, a data move — has an ADR. One that
     reverses an earlier ADR supersedes it (`CONTRACT.md` § Ground rules); an accepted ADR's body is
     never rewritten. Write what is missing yourself.
   - **The ADRs in force** (read them; the latest on a subject wins):
     - **0011 (superseding 0001, 0006, part of 0008) — where data lives.** Every kind of data
       moves into Neon behind the versioned API, one kind at a time; a kind not yet moved keeps
       its JSON file and 0001's rules. Nothing calls Quran.com or QUL at runtime. Moved data is
       loaded by an idempotent import from the committed sources, reached through the versioned
       API (mobile) or the server-side data layer (pages), cached and revalidated on publish, with
       tables changed only by migrations under `pnpm db:migrate`.
     - **0002**: each Script's Arabic comes from its own source text and renders in its own font;
       the builder refuses mismatched Word locations; switching Script changes only the Arabic.
     - **0003**: Root, Lemma and counts come from QUL; `roots.json` touches only Spelling meanings;
       Word cards show QUL's Word meaning; the disagreement report lists, not resolves.
     - **0004**: no static text is selectable; inputs are.
     - **0005**: anything that opens in parts reuses the Surah-part mechanism; a direct load gets
       the whole page.
     - **0007**: no Link preview draws Arabic.
     - **0009**: Phrases never overlap and are hand-marked.
     - **0010**: Recitation timings come from the dataset; only the audio streams from Tarteel.
   - **Modules**: the builder is deep — one entry point hiding the sources, SQLite and grouping;
     pages reach data through the reader or the data layer; the API is versioned plain JSON in its
     own route group; the mobile app is a client of the API and the versioned data; code both apps
     share lives in `packages/`, not copied.
   - **Determinism**: every list the builder makes has a total order; the import scenarios prove it.
   - **Design**: website tokens and layouts match the site's existing ones (and
     `DELIVERY/mockup.html` where there is one); the mobile app follows `src/theme.ts`; no Tailwind.
   - **Versions**: Next.js 16 and Expo APIs used as their installed docs describe them, with no
     deprecated one.
   - **Scenarios** read as a user, client or dataset reader would say them: no CSS class,
     component name or function name in a step, and every scenario's tags still name the rows it
     proves. Rewording a step is yours; changing what it asserts is not.
5. Where the change contradicts an ADR and the issue did not ask for that, fix the code. Where the
   issue asks for it, the change needs a superseding ADR: write it, and name it in `NOTES` so the
   runner tells the user.
6. Refactor only to clear a finding. Run the repo checks after each coherent change; commit by
   explicit path, glossary and ADR files with the change they describe. A clean review reports
   `COMMIT: none`.

## Gate

Both domain gates print PASS; every REVIEW line is fixed or justified in `NOTES`; the glossary and
ADRs say what the code does, with no ADR contradicted unless superseded; repo checks green; every
`TEST`, `PAGE` and `CHECK` evidence line that passed at stage 2 still passes; the feature gate
exits 0.

`TOOL:` the two gates, the repo checks, the evidence commands. `NUMBERS:` the gates' summary lines,
REVIEW lines settled, glossary terms and ADRs written or amended, renames and refactors made,
tests passed / failed. `DECISIONS:` every glossary term and ADR now in the branch, with its file.
`NOTES:` each settled line, each ADR touched and how it holds, each superseded ADR.
