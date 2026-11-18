Builds on [0057](0057-quran-chat-answers-from-claude-on-the-server-streaming-cited-text.md): a question is counted before Claude is asked. Conversations (#79) come after it, and do not change what is counted.

# Question limits are read from the Plan's row and counted by asked-question rows

Every Account is on the Free Plan, the only Plan for now (#80). The content migration `0018-create-plan-and-asked-question` makes two tables:

- **`plan`**: one row per Plan, its `daily_question_limit` and `monthly_question_limit`; today only `free`, first set to 20 a day and 300 a month. The limits are read from the row on every question, never cached, so the owner changes them in Neon (`update plan set daily_question_limit = 30 where name = 'free'`) with no deploy, and the next question meets the change, even partway through a day. Lowering a limit below what an Account has asked leaves it 0 left, not less.
- **`asked_question`**: one row per question an Account asked, `"userId"` and `asked_at`, deleted with the Account, as every table tied to an Account is (#68).

Neither is Saaliheen's own content, so neither is in the content audit. No Account names its Plan yet: the code takes the Free Plan for everyone. A paid Plan will add that link, not rework the limits.

**Counting.** A day and a month are calendar ones in UTC: an Account's questions with `asked_at` in the current UTC day, and in the current UTC month, are counted against the Plan's two limits. Every question counts, whatever it is about and however it is answered (a declined one too), and whatever Conversation, device or credential it is asked from. `POST /api/v1/questions` counts a question after checking it is one and before asking Claude, in a transaction holding an advisory lock on the Account, so two questions asked at once cannot both take the last one left.

**Refusal.** A question past a limit is not counted and Claude is not asked: the API answers 429 with `{ error, limit, resetsAt }`, `limit` being `"daily"` or `"monthly"` (the monthly when both are reached, as it resets no sooner) and `resetsAt` the ISO time the next UTC day or month starts, with `Retry-After` in seconds until then.

**Reading the limits.** `GET /api/v1/question-limits` answers `{ plan, daily, monthly }`, each limit as `{ limit, asked, left, resetsAt }`. Quran Chat reads it on opening and after each question: with fewer than five left today (the fewer of the two limits' `left`) it says how many, and with a limit reached it says which, and when it resets in UTC, and offers no way to ask until then.

**Tests control the clock.** A request's `Test-Now` header (`src/test-clock.ts`) is the time the server takes for now in answering it, only under the test configuration (`ACCOUNT_TEST_SIGN_IN=on`, never on a Vercel deployment). The API contract sends it with each request, and the site tests set it on the browser, which sends it with every request; both put earlier questions in `asked_question` themselves. The API contract also changes the Free Plan's row, which is safe as its features run one at a time; the site tests only read it.

## Considered Options

- A counter per Account per day and month: fewer rows, but it must be reset or rolled over, and a change of calendar would need new counters; counting rows by time needs neither, and the index keeps the count cheap.
- Limits in environment variables: changing them would need a redeploy, which #80 rules out.
- Counting only questions answered in full: a question costs the embedding and Claude's tokens however it ends, so a decline or a failure would cost without counting.
- Faking the server's clock with an environment variable: one clock for every scenario at once; a header gives each scenario its own.
