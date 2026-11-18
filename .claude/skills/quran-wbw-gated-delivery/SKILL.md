---
name: quran-wbw-gated-delivery
description: 'Ship one ready-for-agent addeelnayyer/quran-word-by-word (Saaliheen) issue — website, API or mobile app — through an eight-stage subagent relay with Saaliheen gates (Gherkin scenarios on the dataset, the site, the API and the mobile app, CRAP ≤ 6, frozen QUL sources, glossary and ADRs kept current), ending in an open PR.'
disable-model-invocation: true
---

Deliver one GitHub issue of **addeelnayyer/quran-word-by-word** (clone at
`~/repos/quran-word-by-word`) through a **relay**: one fresh subagent per stage, each held behind a
**gate** that a command run in the delivery worktree decides, ending in an open PR against `main`
whose body carries the evidence.

You are the relay runner. You qualify the issue, provision the worktree, dispatch, read verdicts,
loop, and land. You write no product code or tests yourself.

`<skill-dir>` is this skill's base directory (`<clone>/.claude/skills/quran-wbw-gated-delivery`).
`R=addeelnayyer/quran-word-by-word`. `W=~/repos/quran-word-by-word-worktrees`.

Invoking this skill on an issue authorises, for that issue only: assigning it to `@me`, commenting
on it, installing dev dependencies, Playwright's Chromium and the mobile app's simulator build in
its worktree, running it on an iOS simulator, adding or amending terms in `CONTEXT.md` and ADRs in
`docs/adr/` on its branch, pushing its `issue-<n>-<slug>` branch (`--force-with-lease` after a
rebase), opening its PR against `main` and replacing that PR's body. It does not authorise merging
the PR, closing the issue, changing labels, filing new issues, editing the QUL sources or
`roots.json`, or touching a production database — ask for those.

## 0. Choosing the issue

Only when the user hands you several issues or asks which is next. Run §1's intake for each (it
reads; it claims nothing), then put a table in front of the user — number, app (web, API, mobile),
`INTAKE`, blockers, ledger rows — unblocked first. Issues with no open blocker between them may run
as parallel relays in separate worktrees. Delivery is still one issue per relay.

## 1. Intake

```bash
cd ~/repos/quran-word-by-word && git fetch origin main
node <skill-dir>/scripts/gh-issue.mjs <n> --out $W/.delivery/<n>
```

That directory is **DELIVERY**, outside git so nothing in it reaches the PR. It holds `issue.md`
and `ledger.md`, the **acceptance ledger**: one `AC-<n>` row per checklist line of the issue (a
nested checklist becomes one row per leaf, prefixed with its parent line). Every stage cites the
ledger; stage 1 may append rows, nobody renumbers or deletes one.

`INTAKE: FAIL` stops the relay: closed, blocked by an open issue, labelled
`needs-triage`/`needs-info`/`ready-for-human`/`wontfix`, or no checklist. A parent spec (Problem
Statement, User Stories, no checklist — #124, #128) fails for that last reason: offer its open
children instead. `READY-LABEL: no` — ask the user before going on.

Read `issue.md`, its **parent spec** (the issue under `## Parent`: its Implementation and Testing
Decisions, and the sections the issue leans on), `CONTEXT.md`, `docs/agents/domain.md` and every
ADR in `docs/adr/`. Then:

- **Which apps** it touches — website pages, the API, the dataset, the mobile app — from its words
  and its parent. Record it; stages read it from your prompt.
- **Design.** For an issue that changes how a website page looks, read the Option B mockup with the
  `Artifact` tool (`action: read`, `https://claude.ai/artifact/HVSdvmHvfUsK7aQHTaq8Wg`) and copy
  the saved HTML file to `DELIVERY/mockup.html`; stages cannot reach the artifact. Prior art in the
  site itself (an existing page the issue names) outranks the mockup.
- **Sources outside the repo** the issue names (`quran-says` for Themes): check the path exists
  and is readable; a missing one stops the relay with the user told.
- **Reconcile** the issue with `origin/main`: for each thing it says to create, replace or remove,
  look (`git grep <symbol> origin/main`, `git log --oneline -10 origin/main -- <path>`). An issue
  written before its siblings landed can name a module, script or path that has since moved.
- **Data direction.** ADR 0011 moves every kind of data from static JSON into Neon behind the
  versioned API, one kind at a time. Note an issue that adds new static JSON data (it will need
  moving), and for an issue that moves a kind of data, which one and the API shapes it must keep.
- **Glossary and ADR rows.** Note the ledger rows that ask for a `CONTEXT.md` term or an ADR; the
  relay writes them (stage 2, checked by stage 4).

Put what is already done, any premise that no longer holds, and the notes above in front of the
user before dispatch. Claim it: `gh issue edit <n> --repo $R --add-assignee @me`.

**Done when:** `INTAKE: PASS`, the apps are recorded, `DELIVERY/mockup.html` exists if the issue
changes a page's look, the user has the reconcile findings, and the issue is assigned.

## 2. Worktree

Reuse before creating:

```bash
git -C ~/repos/quran-word-by-word worktree list | grep -e 'issue-<n>-'
git -C ~/repos/quran-word-by-word branch -a --list '*issue-<n>-*'
gh pr list --repo $R --state all --head issue-<n>-<slug> --json number,state,url
```

- **Nothing found:** `git -C ~/repos/quran-word-by-word worktree add $W/<n>-<slug> -b issue-<n>-<slug> origin/main`.
- **A branch, no worktree:** add the worktree on it (`--track -b` from `origin/issue-<n>-<slug>` if only remote).
- **A worktree:** `git -C <worktree> status --porcelain` must print nothing. Uncommitted work there
  is someone's: stop and ask.

A branch with no open PR is rebased onto `origin/main`; one whose commits conflict goes to a fresh
agent on `stages/resolver.md` before stage 1. `<slug>` is the title lower-cased with
non-alphanumerics collapsed to `-`, cut to five words. Record the absolute worktree path and the
**base SHA**, `git -C <worktree> merge-base HEAD origin/main`. Then, in the worktree,
`pnpm install --frozen-lockfile` and `pnpm --filter @saaliheen/web exec playwright install chromium`.
The issue's **port** is `3<nnn>`, its number zero-padded to three digits (#73 → `3073`), so
parallel relays never collide.

For a mobile issue, open the simulator panel early (`mcp__Claude_Code_iOS_Simulator__control`,
`action: attach`) so the user can watch and grant device access while stages work; if no simulator
is booted, say so and carry on — stage 6 builds and boots it.

**Resume, don't restart.** A branch with commits of its own, or an open PR, is an issue in flight.
Run the relay over it anyway with stage 1's scope set to the rows not yet evidenced; at §5 the open
PR is updated, not replaced.

**Done when:** `git -C <worktree> status --short --branch` names `issue-<n>-<slug>` with no changes
and, unless a PR is open, `git -C <worktree> merge-base --is-ancestor origin/main HEAD` succeeds.

## 3. The relay

| # | Stage | Brief | Gate |
|---|---|---|---|
| 1 | Specifier | `stages/1-specifier.md` | Baseline checks green; every ledger row carried by an `@AC`-tagged Gherkin scenario on its seam (dataset, site, API, mobile), a repo `CHECK`, or a `HAND` line for a simulator or by-hand check; `parse-features` exits 0; absent behaviour red for the intended reason; production code unchanged |
| 2 | Implementer | `stages/implementer.md` | Repo checks green; every ledger row delivered on its evidence or `SKIPPED` with a category; glossary terms and ADRs the issue asks for written |
| 3 | Scope adjudicator | `stages/3-adjudicator.md` | Every skipped item OWNED / IN-SCOPE / OUT-OF-SPEC / ORPHAN with `gh` evidence |
| 4 | Domain steward | `stages/4-steward.md` | `check-invariants` PASS; every REVIEW line settled; glossary and ADRs current with the change; repo checks green; behaviour unchanged |
| 5 | Cleaner | `stages/5-cleaner.md` | Every changed function CRAP ≤ 6 in each app changed (logic on Vitest coverage, screens, pages and handlers on complexity alone); scenarios still green |
| 6 | Acceptance judge | `stages/6-acceptance-judge.md` | Every ledger row MET on evidence the judge re-ran — the production build for the website, the simulator for the mobile app — with screenshots for every row a person sees; `BY HAND` rows written up for the user |
| 7 | Simplifier | `stages/7-simplifier.md` | `/simplify` applied over base..HEAD; scenarios, CRAP and domain gates still green; no assertion edited |
| 8 | Landing | §5, `stages/resolver.md` | Branch pushed, PR open with the evidence; every PR check green; merged only on the user's yes |

Stage 3 runs only on a non-empty `SKIPPED` line.

Dispatch each stage with the `Agent` tool, `subagent_type: general-purpose`, a fresh agent every
time. The stage reads its brief; the brief never enters your context. Prompt shape:

```
Worktree: <abs path>. Base: main @ <sha>. Port: <3nnn>. Work only there.
Issue: #<n> — <title>. Parent: #<p>. Apps: <web pages | API | dataset | mobile>. DELIVERY: <abs path>.
Skill directory: <skill-dir>. External sources (read only): <paths, or none>.
Read <skill-dir>/stages/CONTRACT.md, then <skill-dir>/stages/<brief>, and follow both.
Scope: <ledger rows, skipped items, blockers, review threads, or check failure this agent owns>.
Prior stage report: <verdict block(s) this stage consumes, or "none">.
```

Report each verdict block to the user as it lands. Keep every `DECISIONS:` line; they go into the
PR.

## 4. Hold the gates, run the loops

Read `STATUS: PASS` as FAIL when `TOOL` is empty, names a command not run in the worktree, or its
numbers do not support the gate. On FAIL, dispatch a **fresh** agent for the same stage with the
failing verdict as its prior report. Never advance past a FAIL.

- **After stage 2**: stage 3 runs on its `SKIPPED` line; `SKIPPED: none` goes straight to stage 4.
  Stage 3's IN-SCOPE items go to a fresh **implementer** with exactly those items as scope, then a
  fresh stage 3 on its new `SKIPPED` line, until nothing IN-SCOPE remains. ORPHAN drafts go to the
  user; filing them is the user's call.
- **Stage 4 or 5 FAIL on behaviour** (a boundary fix or a split turned a scenario red): fresh
  implementer with the verdict as scope, then fresh stages 4 and 5.
- **Stage 6 → blockers**: every UNMET or UNCOVERED row goes to a fresh **implementer** with the
  judge's blocker list as scope (product fixes and missing or weak scenarios alike), then fresh
  stages 4, 5 and 6. A blocker marked `for the user` goes to the user. `BY HAND` rows (Android, a
  real device, background audio, airplane mode) do not block acceptance; they go into the PR for
  the user. Three rounds without `ACCEPTED: yes`: stop and put the remaining rows in front of the
  user.
- Stage 7 runs only after `ACCEPTED: yes`. If simplification turns anything red, a fresh stage 7
  repairs or reverts its own change; it never touches behaviour.

## 5. Land

```bash
git -C <worktree> fetch origin main
git -C <worktree> log --oneline <base-sha>..HEAD     # every subject ends "(#<n>)"
```

Branch behind `origin/main`: a fresh agent on `stages/resolver.md` first.

Write `<DELIVERY>/pr.md` (through the `pr` skill's house style) from the verdicts: one opening
sentence naming the issue, then `Closes #<n>.`; `## What it does`; `## Acceptance` (ledger rows →
scenario, check or by-hand line, from `acceptance.md`, with the feature files listed); `## Handed
on` (stage 3's OWNED items with their issue numbers); `## Needs the reviewer` (REVIEW lines the
steward justified, the disagreement report's totals if the dataset changed, the screenshot set in
`DELIVERY/screens/` — Arabic rendering in both Scripts is judged by a person — every drafted Urdu
name from `drafted-urdu.md` for the Scholar, and every `by-hand.md` step); `## Decisions` (each
glossary term and ADR this PR adds or supersedes, with its file, from the `DECISIONS:` lines; omit
when none); `## Checks` (commands and their numbers — scenarios passed per seam, worst CRAP score
per app — and the PR's Deploy check). End with the PR attribution line the session's system
reminder gives.

```bash
git -C <worktree> push -u origin issue-<n>-<slug>            # --force-with-lease after a rebase
gh pr create --repo $R --base main --head issue-<n>-<slug> \
  --title "<issue title> (#<n>)" --body-file <DELIVERY>/pr.md  # or: gh pr edit <pr> --body-file …
```

Then **watch** the PR's checks. `.github/workflows/deploy.yml` runs typecheck, lint and unit tests
and deploys a Vercel preview for every PR, linked from a PR comment. Read
`gh pr view <pr> --repo $R --json mergeable,mergeStateStatus,reviews,statusCheckRollup`; when the
session has the `ccd_pr` tools, bind the PR and let them report CI instead of polling.

| State | Do |
|---|---|
| `mergeable: CONFLICTING` | Fresh agent on `stages/resolver.md`; it rebases and force-pushes with lease. Watch again. |
| A check fails | `gh run view <run> --repo $R --log-failed` names the step. A fresh **implementer** gets that log tail as scope and commits the fix; push, watch again. An infrastructure, secret or auth failure goes to the user. |
| Review threads | `gh pr view <pr> --repo $R --comments`. Change requests go to a fresh **implementer** as its scope; questions go to the user. |
| Checks green | Tell the user the PR is ready, with the preview link, and ask whether to merge. Merge only on their yes: `gh pr merge <pr> --repo $R --merge --delete-branch`. |

After a merge: `git fetch origin main`; `git log --merges -1 origin/main` names this PR; `gh issue
view <n> --repo $R --json state` reads `CLOSED` (the PR's `Closes #<n>`). Then
`gh issue comment <n> --repo $R --body-file <DELIVERY>/closeout.md` — PR link, ledger totals,
handed-on and orphan items, by-hand checks still open.

**Done when:** the PR is open with the evidence and every check green, and — only if the user said
merge — the merge commit is on `origin/main` and the issue reads closed.

## 6. Budget

Each subagent holds under 150,000 tokens. One stage, one coherent slice. A large issue slices by
**seam**: the dataset builder and `features/dataset/`; the API, its tables and `features/api/`;
the website's pages and `features/site/`; the mobile app's logic, screens and `apps/mobile/features/`.
A stage facing more than roughly ten files splits into parallel same-stage agents, one slice each,
then one fresh merge agent reconciles their verdicts. A `NOTES: budget` verdict means re-slice as
proposed and re-dispatch.

## 7. Report

To the user: issue, branch and worktree, base SHA, PR link, every verdict block, ledger totals, the
handed-on, out-of-spec and orphan items, the glossary terms and ADRs written, the by-hand checks,
the screenshot folder, and the commits. Leave the worktree and DELIVERY in place; removing them is
the user's call.
