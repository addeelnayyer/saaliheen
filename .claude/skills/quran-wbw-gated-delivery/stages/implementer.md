# Implementer

Used for every code-writing dispatch: stage 2, stage 3's IN-SCOPE pickup, stage 4's behaviour
repair, stage 6's blockers, a failing PR check, and a reviewer's requested changes. The **Scope**
line of your prompt says which.

## Steps

1. Read `DELIVERY/issue.md`, `DELIVERY/ledger.md`, `DELIVERY/evidence.md`, then your scope and
   prior report.
   - Stage 2: the scope is the whole ledger; make stage 1's evidence pass. On a resumed issue, run
     the evidence already green and build only the rest.
   - Pickup: the IN-SCOPE items stage 3 listed, with the issue lines they quote.
   - Blockers: the judge's rows, each with what was observed. A missing or weak scenario is a
     scenario to write or sharpen; a wrong behaviour is product code to fix — never a step to
     loosen.
   - PR check or review: the failing step's log tail or the reviewer's thread. Reproduce locally
     first.
2. Read the code the scope touches and the tests beside it, and the Next.js guide in
   `node_modules/next/dist/docs/` for each API you will use. Match the code's layout and vocabulary.
3. Invoke the `implement` skill with the scope as the spec, stage 1's scenarios as the tests it
   works against. It works test-first at the seam, reviews with `/code-review`, and commits. A new
   test it needs is a scenario tagged with its row, in the right `features/` folder; a step that
   does not exist yet is added beside the others. Hold to this repository's decisions while it does:
   - **Module boundaries.** The dataset **builder** is the only code that reads `data/qul/` or
     `data/roots.json` or opens SQLite; one entry point takes the sources and returns the dataset
     and report. Pages get Quran data through the **reader** (or, once data has moved, through the
     data layer behind the API), never the builder or the sources. The **API** (`/api/v1/`,
     `/data/v1/`) is versioned plain JSON in its own route group; a breaking change is a new
     version, never an edit of a shipped one. The **mobile app** is a client of that API and the
     versioned data, never of the database or the sources. Code both apps need goes in `packages/`.
   - **Data in Neon.** Tables change only through a migration run by `pnpm db:migrate`; never edit
     a production database. Reader data is keyed to the Account (ADR 0008). An issue that moves
     a kind of static data into Neon follows ADR 0011: an idempotent import from the committed
     sources, the same API shapes the clients read today, pages through the server-side data
     layer with cache revalidation, and Admin publishes as one transaction with a revision.
   - **Glossary and ADRs.** Every term the issue introduces goes into `CONTEXT.md`, and every
     decision the work rests on into a new ADR, through the `domain-modeling` skill
     (`CONTRACT.md` § Ground rules), committed with the code it explains.
   - The builder is deterministic: every list it writes has a total order (Lemmas and Spellings by
     occurrence count, then a stable key), and running it twice writes the same bytes.
   - Pages that read no reader data are statically generated; a page that opens in parts follows
     ADR 0005's mechanism rather than a second one.
   - Reader settings are put on `<html>` before first paint by the small, synchronous pre-paint
     script, which reads storage defensively.
   - Website styling: CSS Modules and the custom-property tokens already in the site (and
     `DELIVERY/mockup.html` where the issue changes a page's look). Right-to-left for Urdu,
     left-to-right for English. Mobile styling follows `apps/mobile/src/theme.ts`.
   - Long lists stay fast: off-screen Ayahs use `content-visibility: auto` or equivalent on the
     website, and virtualised lists on mobile.
   - Small functions from the start: stage 5 holds every changed function to CRAP 6, and screens,
     pages and handlers to complexity 6 — derivation in plain functions, one job per component.
4. Run `PORT=3<nnn> pnpm --dir apps/web test:import` after any builder change. Then run
   the repo checks and the feature gate from `CONTRACT.md`, and every `TEST`, `PAGE` and `CHECK`
   line of `evidence.md` in your scope. Red is not done.
5. Account for the ledger. Every row in your scope is either delivered — name the evidence line
   that now passes — or `SKIPPED` with one reason category:
   - `owned-elsewhere #<n>` — another issue's text names it
   - `blocked-by #<n>` — needs something that has not landed
   - `needs-decision` — the issue contradicts itself, an ADR, `CONTEXT.md` or its parent spec, and no superseding ADR would settle it
   - `needs-source` — needs data the committed sources (or the named sibling repo) do not hold
   - `judged-out-of-scope` — your call, argued in one line

   A skip with no category, or a row missing from both lists, fails the gate.

## Gate

Repo checks green; every scoped row delivered on a passing evidence line or `SKIPPED` with a
category.

`TOOL:` the checks, feature gate and evidence commands. `NUMBERS:` scenarios passed / failed per
seam (dataset, site, API, mobile), rows delivered / skipped, build result.
`DECISIONS:` each `CONTEXT.md` term and ADR written, with its file. `SKIPPED:` one line per item —
stage 3 reads this line and nothing else. `NOTES:` the production modules changed and anything the
steward should look at first.
