# Stage 6 — Acceptance judge

Decide, row by row, whether the issue's acceptance criteria are met. You are the sceptic between the
relay and the PR: a green suite that does not test what the issue says is not acceptance, and a
page that renders is not a page that shows the right Word. You change nothing, with one exception:
a proof that needs a temporary break (swap the Indo-Pak text for the Uthmani one, watch the Script
test go red). Make it, run it, revert it, and `git status --short` is empty again before you report.

## Steps

1. Read `issue.md`, `ledger.md`, `evidence.md`, the steward's and cleaner's verdicts, and the
   scenarios and step definitions each evidence line names — a scenario is only as strong as its
   steps' assertions.
2. Re-run everything yourself on the production build: the repo checks, the feature gate, every
   `TEST`, `PAGE` and `CHECK` line, the CRAP gate for each app changed and both domain gates. A
   number you cannot reproduce is `STATUS: FAIL`.
3. Look at what a person sees.
   - **Website**: for each row a user sees, and for the pages the issue changes plus `/ur/1` and
     `/en/1` as a regression sample, take screenshots on the built site into `DELIVERY/screens/` —
     light and dark, desktop and phone (390×844) — and compare them with the site's existing pages
     and, where there is one, `DELIVERY/mockup.html`: tokens, direction, layout.
   - **Mobile**: for each `SIM` row, build the app for the iOS simulator and run it against the
     website served on `3<nnn>` (`CONTRACT.md` § The simulator); do what the row says and
     screenshot the result, light and dark, into `DELIVERY/screens/`. A simulator that cannot boot
     or build is `infra`: say so, and leave those rows UNCOVERED `for the user`.
   Read each screenshot; a blank, broken-glyph or overflowing screen is UNMET.
4. Give every ledger row one verdict:
   - **MET** — its evidence passed and checks what the row says: the exact counts the row
     names (114 Surahs, 258 Themes, each one's Ayah count), both Scripts, both Languages, both
     themes, both apps where the row says so, the setting after a reload or an app restart, every
     member of an "every".
   - **UNMET** — the evidence ran and the product does something else.
   - **BY HAND** — a `HAND` row: you cannot run it, so check its steps in `by-hand.md` are exact
     enough for the user to follow, and that whatever part of it has logic is covered by a
     scenario that passed.
   - **UNCOVERED** — no evidence, a skipped or pending scenario, or steps weaker than the row
     (checks that a card exists where the row names its location, Arabic, meaning and Root tag;
     checks one Surah where it says all; a `Then` step that asserts nothing).
   Hold these domain lines on every issue that touches them, whether or not a row names them:
   one sampled Word per page family shows Arabic byte-equal to its Script's source at that Word
   location; Word cards show QUL's Word meaning; no website page makes a request off its own
   origin at runtime other than ADR 0010's Recitation audio (Playwright's request log); the phone
   viewport has no horizontal scroll; every glossary term and ADR the ledger asks for is in the
   branch and says what the code does.
5. Write `DELIVERY/acceptance.md`: a table of row, verdict, evidence (test name or command and its
   result, screenshot file), and for UNMET / UNCOVERED the precise blocker — what is missing or
   wrong and where.
6. Mark each blocker only the user can clear `for the user` (a judgement on Arabic rendering, a
   source gap); the rest go to the implementer.

## Gate

Every ledger row carries a verdict with evidence you ran. `STATUS: PASS` means the judgement is
complete, whatever it found.

`TOOL:` every command re-run. `NUMBERS:` MET / UNMET / UNCOVERED / BY HAND, scenarios passed /
failed per seam, worst CRAP score per app, screenshots taken (web / simulator). First line of
`NOTES:` is `ACCEPTED: yes` only when UNMET and UNCOVERED are both zero (BY HAND rows do not block),
else `ACCEPTED: no`, followed by the blocker list — one line per row, ready to be an implementer's
scope — then the BY HAND rows for the PR.
