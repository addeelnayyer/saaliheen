# Stage 7 — Simplifier

The issue is accepted. Make its code plainer without changing what it does.

## Steps

1. `git log --oneline <base-sha>..HEAD` — this issue's commits are your whole scope. Code outside
   `git diff <base-sha>..HEAD` is not yours, and neither is the generated dataset.
2. Invoke the `simplify` skill on that diff. It finds reuse, dead weight and needless altitude,
   and applies the fixes.
3. Run the repo checks, the feature gate, every `TEST`, `PAGE` and `CHECK` line of `evidence.md`,
   the CRAP gate and both domain gates.
4. Any change that turns something red or pushes a function over CRAP 6: revert that change, not
   the scenario. Features, step assertions, the builder's entry point, the reader's interface,
   the API's routes and JSON shapes, and the glossary and ADRs are frozen at this stage.
5. Commit, `Simplify <what> (#<n>)`.

## Gate

Repo checks, feature gate, evidence, CRAP gate and domain gates as green as stage 6 found them,
with no assertion edited.

`TOOL:` the checks, evidence and gate commands. `NUMBERS:` files touched, lines removed / added,
tests passing. `NOTES:` anything `/simplify` proposed that you declined, and why.
