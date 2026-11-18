# Stage 1 — Specifier

Turn the issue into executable evidence before any product code exists: Gherkin scenarios, tagged
with the ledger rows they prove, whose steps go red for the missing behaviour, and a named command
for every row a scenario cannot hold. You write features, step definitions and test
infrastructure, never production code.

## Steps

1. Read `DELIVERY/issue.md`, `DELIVERY/ledger.md`, the parent spec's **Testing Decisions** and the
   sections the issue leans on, `CONTEXT.md`, the ADRs, and the existing features and steps on the
   seams the issue touches (`apps/web/features/{dataset,site,api}/`, `apps/mobile/features/`) —
   reuse a step that already says what you need before writing a new one, and read the prior-art
   feature files the issue names. Open `DELIVERY/mockup.html`, when there is one, for any row about
   what a page looks like.
2. Run the repo checks (`CONTRACT.md` § Checks) on the untouched branch. A red baseline is
   `STATUS: FAIL` with the failure in `NOTES`; do not absorb it into this issue.
3. **The harness** exists for all four seams (`CONTRACT.md` § Seams). An issue that needs a seam
   no package has yet — a new package in `packages/` with behaviour of its own, a first test of
   the mobile app against a new API route — gets it now as test infrastructure, copied from the
   nearest existing seam (its config, `support` module and script), with its output folders in
   `.gitignore` so the dataset gate keeps a clean tree. A stub entry point that throws
   `not implemented` is allowed so the suite compiles.
4. Where one ledger row carries two separately checkable things, append rows rather than blur
   them: `- AC-<next>: <text> (split from AC-<n>)`. Never renumber.
5. Write the scenarios, one `.feature` per capability, named in the glossary's words
   (`features/dataset/themes.feature`, `features/site/theme-page.feature`,
   `features/api/reading-places.feature`, `apps/mobile/features/offline-surahs.feature`), on the
   seam where a user or client would see the behaviour. Each scenario
   is tagged with every row it proves, `@AC-3 @AC-4`, and says exactly what its row says: the Word
   location, both Scripts' text, the Urdu **and** English Word meaning, the counts, the order of
   Lemmas and Spellings, the `dir` value, the setting still applied **after a reload**, Escape
   closing the dialog.
   - Rows with *every*, *each*, *all* or *both* enumerate their members — a `Scenario Outline`
     whose `Examples` hold both Languages, both Scripts, both themes; all 114 Surahs, or all 258
     Themes, as a data table read from the source rather than typed.
   - Expected Arabic and meanings are read from the sources by the step, or taken from the issue's
     own words; never typed from memory into a feature or step.
6. Write the step definitions.
   - Dataset steps call the builder's entry point once per feature (in `BeforeAllScenarios`) and
     assert on the dataset and report it returns.
   - API steps call `/api/v1/...` and `/data/v1/...` over HTTP against the run's server and
     Postgres (`features/api/serve-api.ts`), as a client would — status, JSON shape, what a second
     device then reads — never the database directly except to arrange a precondition.
   - Mobile steps drive the app's logic in `src/` through `features/support.ts`, against the data
     and API the website serves; they assert what the screen would show (the Ayah list, the
     message, the prompt), not a module's internals.
   - Site steps locate by role, label and visible text, never by CSS class or test-only markup
     beyond a `data-location` the user-facing deep link already implies. Theme, Script and
     translation steps start from cleared storage and check the value before a reload and after it;
     the no-flash step reads `<html>`'s data attributes from the server response before scripts run.
7. Map every row to its evidence in `DELIVERY/evidence.md`, one line per proof:
   - `` - AC-<n> — TEST: `cd apps/web && pnpm exec vitest run features/dataset/<file>.spec.ts -t "<scenario>"` — <what it asserts> ``
   - `` - AC-<n> — PAGE: `cd apps/web && pnpm exec bddgen && PORT=3<nnn> pnpm exec playwright test --grep @AC-<n>` — <what a user sees or does> ``
   - `` - AC-<n> — TEST: `cd apps/web && PORT=3<nnn> pnpm test:api -t "<scenario>"` — <what the API answers> ``
   - `` - AC-<n> — TEST: `cd apps/mobile && pnpm exec vitest run features/<file>.spec.ts -t "<scenario>"` — <what the app shows> ``
   - `` - AC-<n> — SIM: <screen and steps on the iOS simulator> — <what a person sees> `` — a row
     about how a mobile screen looks or responds to touch; stage 6 takes the screenshots. Give it
     a mobile scenario too wherever it has logic behind it.
   - `` - AC-<n> — HAND: <device or condition> — <steps and what to see> `` — only for a row no
     simulator can show (Android, a real device, lock-screen or background audio, airplane mode);
     copy it into `DELIVERY/by-hand.md`.
   - `` - AC-<n> — CHECK: `<command>` — <expected> `` — only for a property of the repository or
     build output that no user, client or dataset could observe: a file in `docs/adr/`, a term in
     `CONTEXT.md` (`grep -q '^\*\*Theme\*\*' CONTEXT.md`), pages generated in `.next`, a gate
     script's line.
   One line may prove several rows: `- AC-3, AC-4 — PAGE: …`.
8. Run the feature gate with the `CHECK`, `HAND` and scenario-less `SIM` rows as `--exempt`, then the new scenarios. Missing
   behaviour must fail for the intended reason (a step's assertion, not an undefined step, a
   harness error or an import typo). A row already satisfied may be green if its evidence is
   explicit.
9. Commit the features, steps and harness by explicit path.

## Gate

Baseline checks green before your change; `parse-features.mjs` exits 0 with every scenario tagged
and every non-`CHECK` row carried by a scenario; every ledger row appears in `evidence.md` with a
command; every new scenario red for the reason its row names, or green with the reason why; `git
diff <base-sha>..HEAD --stat` touches no production file (`apps/*/src/`, `apps/*/app/`,
`packages/*/src/`, `next.config.ts`) beyond harness wiring and a stub entry point.

```bash
for r in $(grep -oE '^- AC-[0-9]+' DELIVERY/ledger.md | cut -c3-); do
  grep -qE "^- (AC-[0-9]+, )*${r}[ ,]" DELIVERY/evidence.md || echo "UNMAPPED $r"; done
grep -E '^- AC-' DELIVERY/evidence.md | grep -vE '`|— (SIM|HAND):' | sed 's/^/NO COMMAND /'
```

prints nothing. `TOOL:` baseline checks, the feature gate, that loop, the new-scenario runs.
`NUMBERS:` baseline tests, features / scenarios / steps per seam, rows mapped (TEST / PAGE / SIM /
HAND / CHECK),
scenarios red as intended, already green, rows appended. `NOTES:` the row-to-scenario map in one
line per row.
