# Stage 3 — Scope adjudicator

Decide, item by item, whether what the implementer skipped belongs to this issue. You write no
code. `R=addeelnayyer/quran-word-by-word`.

## Steps

For each item in the prior report's `SKIPPED` line:

1. **Look for an owner.** Run, and keep the output:
   - the siblings — every issue whose `## Parent` names this issue's parent `#<p>`:
     `gh issue list --repo $R --state all --limit 200 --json number,title,state,body --jq '.[] | select(.body | test("## Parent\\s+#<p>\\b")) | "#\(.number) [\(.state)] \(.title)"'`;
     read the likely ones' `What to build` and `Acceptance criteria`.
   - `gh search issues --repo $R "<two or three distinctive words>"` — the words the issue uses
     (`Root dialog`, `disagreement report`), not your paraphrase.
   - the parent spec's `## Out of Scope` section, and #1's for anything about the reading
     experience as a whole.
2. **Classify it:**
   - **OWNED #<n>** — that issue's text names this behaviour. Quote the line.
   - **OUT-OF-SPEC** — the parent spec's Out of Scope names it, and no later spec has taken it
     up (#1 ruled out audio, accounts and offline, which #60 and #109 have since brought in).
     Quote the line; it is not built.
   - **IN-SCOPE** — no issue owns it, and this issue's ledger or body names it, or its acceptance
     cannot honestly be claimed without it. Rows of this issue's own ledger are IN-SCOPE unless the
     issue hands them on or a sibling's text claims them.
   - **ORPHAN** — no issue owns it and it is not this issue's surface. Draft an issue body in the
     house shape (`## Parent` #<p> / `## What to build` / `## Acceptance criteria` / `## Blocked by`)
     for the user to file.
   - `needs-decision` and `needs-source` items stay that: name what is needed and who gives it.
3. Write `DELIVERY/handed-on.md`: one line per OWNED item, `- <item> → #<n> <title>`.

## Gate

Every skipped item carries a class and the command output that justifies it. An IN-SCOPE item whose
issue line you cannot quote is not IN-SCOPE.

`TOOL:` the `gh` commands. `NUMBERS:` owned / in-scope / out-of-spec / orphan / needs-*.
`NOTES:` the IN-SCOPE list, each with the issue line it serves — this becomes the pickup
implementer's scope — then the ORPHAN drafts and what the user must decide or supply.
