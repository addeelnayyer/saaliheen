Builds on [0056](0056-quran-chats-sources-are-embedded-into-neon-and-follow-their-sources-on-each-load.md): the sources it finds are all a question is answered from. Departs from [0008](0008-reader-data-in-neon-behind-a-nextjs-api.md)'s plain JSON for one answer: `/api/v1/questions` streams newline-delimited JSON. Conversations (#79) and Question limits (#80) come after it: here each question is asked on its own.

# Quran Chat answers from Claude on the server, streaming cited text

A signed-in person asks Quran Chat a question at `/<lang>/quran-chat` (#78). `POST /api/v1/questions`, with `{question, language}` and the person's session cookie or token, finds the question's nearest sources (`QUESTION_SOURCES`, eight: Ayah translations in both Languages, Tafsir entries only in the Language asked for, so the edition credited is the one cited) and asks Claude Sonnet 5.5 (`claude-sonnet-5-5`) to answer from them and nothing else, in the Language asked for. Claude is called only from the server, with `ANTHROPIC_API_KEY` from the deployment's settings; no key reaches a browser or the app. Without `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` the route answers 503. Not signed in, it answers 401; a body without a question of 1–2,000 characters and a Language, 400.

**The answer streams.** A 200 is newline-delimited JSON (`application/x-ndjson`), one event a line, as `src/quran-chat/answer-text.ts` types them: `text` as Claude writes it, then `end`; or `declined` with what the person is told, then `end`; or `error` when Claude fails or refuses. The website reads the events as they arrive; the mobile app can read the same.

**Citations are text.** Each source is sent with the cite it is to be cited by, and Claude writes it in brackets: `[18:83]`, `[18:83–84]`, `[Tafsir 18:83–84]`. The page reads them out of the text (`answerParts`), shows each in parentheses as a link to its first Ayah on its Surah page, and credits al-Mukhtasar's edition in the page's Language beneath an answer that cites a Tafsir entry. A citation of a Surah or Ayah there cannot be (Surah 0, Surah 115) is shown as words; one within a Surah but beyond its last Ayah is still a link, as the page knows no Ayah counts. Asking for citations in the text, rather than through Claude's citations feature or tool calls, keeps the answer one stream of prose that any client can render.

**Rulings are declined.** The system prompt has Claude reply `[declined]` alone to a question asking for a ruling of Islamic law or a judgement between sects or schools. The server holds back an answer's first characters until they cannot be that marker; when they are, it stops Claude and sends `declined` with a fixed message in the person's Language pointing them to a Scholar. The decline is therefore always worded the same, and never half-shown.

**Tests.** The API contract's and the site's runs replace Claude with a fake of the Messages API (`features/api/fake-anthropic.ts`), reached through `ANTHROPIC_BASE_URL`. It streams fixed answers (`FIXED_ANSWERS`) to the questions the site scenarios ask, declines a question with "ruling" in it, and otherwise cites each source it was sent, recording each request so the contract can check what Claude was asked. The site's runs serve it, with the fake OpenAI, from `features/site/serve-fake-llm.ts`, on ports derived from `PORT`.

## Considered Options

- Claude's citations feature over document blocks: its citations point at character ranges of the sources, which the page would map back to Ayahs; citing by cite in the text is simpler and reads the same on every client.
- Server-sent events: newline-delimited JSON is read the same with `fetch`, needs no event names, and carries the same events.
- Letting Claude word its own decline: the wording would vary, and a ruling half-written before the decline would be shown.
- Another model: #78 names Sonnet 5.5; changing it is one constant in `src/quran-chat/answer.ts`.
