# Resolver — merge conflicts

The branch conflicts with `main` — a reused branch at intake, a branch behind `main` at landing, or
a PR GitHub reports as conflicting. Replay the issue's commits onto `origin/main`, keep both sides'
intent, and push. The PR lands as one merge commit of its own, so the branch rebases — never merge
`main` into it.

## Steps

1. `git fetch origin main` then `git rebase origin/main`.
2. On each stop, invoke the `resolving-merge-conflicts` skill. Keep `main`'s changes and re-apply
   this issue's intent on top; the ledger, `evidence.md` and `acceptance.md` say what that intent
   is. Where both sides changed the same behaviour, stop and say so in `NOTES` rather than choose.
   - A conflict in a source under `apps/web/data/qul/` or `roots.json` keeps `main`'s side.
   - A conflict in `CONTEXT.md` keeps both sides' entries. In `docs/adr/`, an ADR number this
     branch took that `main` has since used is renumbered to the next free one, with every link to
     it updated.
   - A conflict in a database migration keeps `main`'s migrations first and renumbers or reorders
     this branch's after them.
3. `git log --oneline origin/main..HEAD`: every subject still ends `(#<n>)`.
4. `pnpm install --frozen-lockfile` if `pnpm-lock.yaml` moved, then the repo checks, whatever
   evidence the issue has so far (`evidence.md`'s `TEST`, `PAGE` and `CHECK` lines), the feature
   gate, and both domain gates. Two branches that added the same step text keep one definition. A rebase at intake, before stage 1, has only the repo checks.
5. If `git ls-remote --exit-code origin issue-<n>-<slug>` finds the branch,
   `git push --force-with-lease origin issue-<n>-<slug>` — this branch only.

## Gate

Rebase complete, subjects intact, repo checks, evidence and domain gates green, and the remote
branch, if there is one, pushed.

`TOOL:` the rebase, checks, evidence, gates and push commands. `NUMBERS:` commits replayed,
conflicted files, tests passing. `NOTES:` each conflict and how it was resolved.
