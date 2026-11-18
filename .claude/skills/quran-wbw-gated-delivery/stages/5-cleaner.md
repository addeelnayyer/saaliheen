# Stage 5 — Cleaner

Drive every function this issue changed to CRAP 6 or below. You move structure; behaviour stays
identical, and the scenarios prove it after every step.

`CRAP(f) = complexity² × (1 − coverage)³ + complexity`. So 6 or below means a function is either
simple, or covered and near-simple. Code with a Vitest seam (the website's `src/dataset/`, the
mobile app's `src/` outside `src/screens/`) has two levers, cover it or split it; screens, pages,
components and Route Handlers, scored on complexity alone (`CONTRACT.md` § Ground rules), have
one: split it.

## Measure

Run `CONTRACT.md` § The CRAP gate for each app (and package) the issue changed. Every run
exiting 0 is the gate. `--changed-since` keeps the gate on this branch's files.

## Refactor

Take the worst score first. Per function, in this order:

1. **Cover it** (code with a Vitest seam only). An uncovered branch cubes the score, and a missing
   scenario is often the whole fix: the refusal when a source is missing, a Word with no Root, the
   message when a Surah is not downloaded. Add it as a scenario on that code's seam
   (`apps/web/features/dataset/`, `apps/mobile/features/`), tagged with the ledger row it serves; a branch no row asks for gets a scenario tagged with the nearest row and a line in
   `NOTES`. Never a unit test of a private helper.
2. **Split it.** Extract the branch cluster into a named function that does one thing. Guard
   clauses over nesting; a lookup record over an `if`/`switch` chain on Language, Script or
   revelation place. In components, move derivation into a plain function and keep JSX for
   rendering; a conditional block of JSX becomes its own small component.
3. **Flatten the defaults.** Long `??`/`?.` chains and `||` fallbacks each count as a branch. Parse
   a source record or an API response once into a typed shape at the edge, and read stored
   preferences once into a defaults object, rather than defaulting at every use.

Re-measure and run the scenarios after each function. A red scenario means you changed behaviour:
revert that step and take a smaller one. Write the changes through the `implement` skill, and
commit once per function cleaned, `Reduce <function>'s complexity (#<n>)`, so a bad step is one
revert. After builder changes, the import scenarios (`PORT=3<nnn> pnpm --dir apps/web test:import`) must stay green.

## Gate

Both `crap.mjs` runs exit 0; repo checks green; both domain gates PASS; every `TEST`, `PAGE` and
`CHECK` evidence line that passed at stage 4 still passes; no assertion loosened.

`TOOL:` the coverage runs, every `crap.mjs` command, the repo checks, the gates, the evidence
commands. `NUMBERS:` functions scored, worst remaining score in each run, before / after of the top
offenders, scenarios added. `NOTES:` the functions you split and the scenarios you added, so the
judge knows where the new boundaries are.
