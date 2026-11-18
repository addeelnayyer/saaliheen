# Saaliheen

Saaliheen is a pnpm monorepo. Today it holds one app, the website, and the
shared packages it builds from:

| Path | What it is |
| --- | --- |
| `apps/web` | The website (`@saaliheen/web`), a [Next.js](https://nextjs.org) app: its sources (`src/`), the Quran dataset it is built from (`data/`), its scenarios (`features/`) and scripts (`scripts/`). |
| `packages/dataset` | The dataset build (`@saaliheen/dataset`): the QUL import, Surah parts and Roots, and the manifest of the published dataset. The Quran import (`pnpm db:migrate`) loads its Surahs, Recitations, Roots and Juz lists into Postgres; nothing writes a generated file (#173). |
| `packages/passages` | The Passage rules (`@saaliheen/passages`): every Ayah in exactly one Passage, no Passage crossing a Surah, and an Admin's edits to Passages. The dataset build and the admin area use it. |
| `packages/share` | The Share rules (`@saaliheen/share`): which Shared Ayahs may be shared, a Share page's address and link, and the text Share hands over. The website's Share pages and the mobile app's use it (ADR 0048). |

The packages ship their TypeScript sources: Next.js bundles them into the
website, and Node runs them for `pnpm db:migrate` with its type stripping. Their
scenarios run with the website's dataset scenarios (`apps/web/features/dataset/`),
on its committed sources. The mobile app joins them under `apps/`.

## The published dataset

Any client, the mobile app included, reads the dataset as static files the
website serves under `/data/v1` (ADR 0008), each made from Neon on its first
request and then served from the cache and the CDN (ADR 0020, ADR 0049):

| Address | What it holds |
| --- | --- |
| `/data/v1/manifest.json` | Every Surah file's address and SHA-256, the dataset version and the minimum supported app version |
| `/data/v1/surahs.json` | The Surah index: every Surah without its Passages and Ayahs |
| `/data/v1/surahs/<n>.json` | One Surah: its Words in both Scripts, Word meanings, Ayah translations and Passages in both Languages |
| `/data/v1/roots/<id>.json` | One Root, by QUL Root id: its Lemmas and Spellings |
| `/data/v1/particles/<id>.json` | One particle, numbered most frequent first: its kind, text, count and Spellings (ADR 0060) |
| `/data/v1/recitations/<n>.json` | One Surah's Recitation: its audio's address and its Word timings, Ayah by Ayah |
| `/data/v1/juz.json` | Each Script's 30 Juz: number, name and first and last Ayah |

Inside v1 the shapes only ever gain fields; their contracts are the scenarios
in `apps/web/features/site/published-dataset.feature`.

## Getting Started

Install once, from the root:

```bash
pnpm install
```

Then, from the root:

```bash
pnpm dev                 # the website on http://localhost:3000, on its own Postgres (below)
pnpm build               # build the website; it reads no database, so it builds without one
pnpm lint                # every workspace package
pnpm typecheck           # every workspace package
pnpm test                # every workspace package: the dataset scenarios (apps/web)
PORT=3002 pnpm test:e2e  # the site scenarios, against a production build
```

The root's scripts run the website's own (`apps/web/package.json`); inside
`apps/web` the same names work directly, as does `pnpm exec` for its tools
(`vitest`, `playwright`, `bddgen`). Local settings go in `apps/web/.env.local`,
where Next.js reads them.

`pnpm dev` needs Docker (ADR 0041). Before `next dev` starts it starts its own
Postgres, a `postgres:17` container `saaliheen-dev-db` on `127.0.0.1:55432`
keeping its data in the Docker volume `saaliheen-dev-db`
(`postgres://saaliheen:saaliheen-dev@127.0.0.1:55432/saaliheen_dev`), and runs
`pnpm db:migrate` on it, which loads the Themes once. Its data survives a
restart; `docker rm -f saaliheen-dev-db && docker volume rm saaliheen-dev-db`
starts it afresh. `DEV_DATABASE_NAME` and `DEV_DATABASE_PORT` rename and move
it. A `DATABASE_URL`, in the environment or in `apps/web/.env.local`, overrides
it: `pnpm dev` then starts no Postgres, migrates nothing, and serves that
database as it is.

## Deploy on Vercel

Every push to `main` is deployed to Vercel production by `.github/workflows/deploy.yml`, after typecheck, lint and unit tests pass. The workflow builds on GitHub (`vercel build`) and uploads the prebuilt output. Vercel's own Git deploys are switched off in `vercel.json`, so there are no preview deploys either.

The workflow installs the whole workspace from the root and runs the Vercel CLI in `apps/web`, so Vercel builds the website as its own app, with the project's Root Directory left unset.

After each `vercel deploy`, production's and each preview's, the workflow runs `pnpm --dir apps/web warm-up <deployment URL>` with the deployment's `DATABASE_URL`: it requests every Theme page and Surah page in Urdu and English, so each is cached before a reader asks, and fails the job naming any page that does not answer 200 (ADR 0041). For a preview behind Vercel's Deployment Protection, the optional repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` (Protection Bypass for Automation) lets it in.

One-time setup:

1. `vercel link` in `apps/web` creates or links the Vercel project and writes `apps/web/.vercel/project.json` (gitignored).
2. Add these repository secrets on GitHub: `VERCEL_TOKEN` (a token from vercel.com/account/tokens), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (from `apps/web/.vercel/project.json`).
3. Set the project's Node.js version to 24.x in Vercel.

To redeploy without a push, run the workflow from the Actions tab.

## App links

Share page links open the mobile app on a phone that has it (ADR 0048). The website serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, claiming only `/ur/share/` and `/en/share/`, from two optional Vercel settings read on each request: `APPLE_TEAM_ID`, the Apple team that signs `com.saaliheen.app`, and `ANDROID_SHA256`, the app's signing certificates' SHA-256 fingerprints, comma-separated. Unset, a file claims nothing and the links open the website. On a simulator, open `saaliheen://en/share/2/255-257/uthmani` with `xcrun simctl openurl booted <link>` instead.

## The Tafsir

The English al-Mukhtasar lives in Neon (ADR 0053), loaded from QUL's file (resource 266) by `DATABASE_URL=… TAFSIR_RELOAD_SECRET=… pnpm --dir apps/web db:load-tafsir <file> https://saaliheen.com`, which can be run again at any time: it replaces the English rows with the file's, then asks the deployment to refresh every Surah's Tafsir, so readers see it with no deploy (ADR 0054); if the refresh fails, run the load again. `TAFSIR_RELOAD_SECRET` is a Vercel setting of your choosing; unset, nothing can refresh the Tafsir and a load is seen after the next deploy. The Urdu edition is put into the `tafsir_entry` table directly, in the same shape.

## Quran Chat's index

Quran Chat finds what to answer from in an index in Neon of every Ayah translation and Tafsir entry, in both Languages, embedded with OpenAI's `text-embedding-3-small` into pgvector (ADR 0056). `pnpm db:migrate` (and so each deploy) and `pnpm db:load-tafsir` bring it to its sources when `OPENAI_API_KEY` is set, embedding only what is new or changed; without it they leave it as it is and say so. After putting the Urdu Tafsir in, or to finish an indexing that failed, run `DATABASE_URL=… OPENAI_API_KEY=… pnpm --dir apps/web db:index-quran-chat`. `OPENAI_API_KEY` is a Vercel setting, which the deploy's `db:migrate` reads as it reads `DATABASE_URL`. `pnpm dev`'s and the tests' Postgres is `pgvector/pgvector:pg17`, Postgres 17 with pgvector, as Neon has it.

## Admin sign-in

The admin area (`/admin`) is for Admins: Accounts whose verified email is on the Admin allow-list (`ADMIN_ALLOW_LIST`). Signed out, it sends the browser to the Sign-in page's Admin entry, which offers GitHub beside Google and Apple; [docs/admin-setup.md](docs/admin-setup.md) lists its settings.

## Accounts

Readers sign in to an Account with Google or Apple at `/<lang>/sign-in`; Accounts live in Neon Postgres (ADR 0008). Provisioning Neon from the Vercel Marketplace, `pnpm db:migrate`, the GitHub, Google and Apple credentials with their callback URLs, and the settings (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, the GitHub, Google and Apple ids and secrets) are in [docs/account-setup.md](docs/account-setup.md); `apps/web/scripts/setup-accounts.sh` walks through them.
