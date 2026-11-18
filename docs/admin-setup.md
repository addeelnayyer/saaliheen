# Admin setup

This guide sets up everything the admin area needs: sign-in (the Admin
allow-list, and GitHub beside Accounts' Google and Apple), publishing (to
Neon, which needs nothing of its own), and the release switch that holds back
Passage headings.

The admin area (`/admin`) is for a few named Admins. Admins sign in to their
Account on the same Sign-in page as everyone else (#67): Admin is a role an
Account holds, decided on every request from the Admin allow-list by the
Account's verified email, so a change to the list applies at once. Opening
`/admin` or `/admin/<Surah>` signed out sends the browser to the Sign-in page's
Admin entry (`/en/sign-in?admin=/admin…`), which offers **GitHub** beside Google
and Apple and comes back to the admin page asked for. The plain Sign-in page
never offers GitHub, and a GitHub sign-in whose verified email is not on the
allow-list is refused before any Account is made or linked. The reading site
never links to the admin area, and every admin page says `noindex`.

Sign-in itself is Accounts': the database, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL` and the Google and Apple apps are set up in
[docs/account-setup.md](account-setup.md), and so is the GitHub OAuth app
Admins sign in with ([GitHub](account-setup.md#github)).
`apps/web/scripts/setup-accounts.sh` walks through all of it, the allow-list
included.

The build needs none of these settings: they are read while the site serves a
request, so the same build runs with or without them. Set them on the Vercel
project (Settings → Environment Variables) for Production, then redeploy.

## Settings

| Setting | What it is |
| --- | --- |
| `ADMIN_ALLOW_LIST` | The Admin allow-list: verified email addresses, comma-separated, e.g. `a@example.com,b@example.com`. One list for every sign-in method, so the same person is the same Admin through any of them. Case and spaces are ignored. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The GitHub OAuth app's Client ID and a client secret, with the callback `https://<site>/api/v1/auth/callback/github`. See [GitHub](account-setup.md#github). |

Admins sign in with Google through Accounts' Google client (`GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`); there is no separate Admin app.

Publishing needs no setting of its own. The Passage editor reads a Surah's
Passages, Passage titles, Phrases and Allah references from Neon, through the
same `DATABASE_URL` as Accounts, and Publish writes them back there (see
[Publishing](#publishing)).

The release switches are different: they are read while the site **builds**.

| Setting | What it is |
| --- | --- |
| `NEXT_PUBLIC_PASSAGE_HEADINGS` | The release switch for Passage headings on the reading site. `on` shows them; anything else, or unset, hides them. Next.js inlines it into the build, so changing it needs a new build. See [Release switch](#release-switch). |
| `NEXT_PUBLIC_TAFSIR` | The release switch for each Passage's Tafsir on the reading site, and al-Mukhtasar's entry in the Credits. `on` shows them; anything else, or unset, hides them. Inlined into the build like the Passage headings' switch. See [Release switch](#release-switch). |

## Publishing

A Surah's Passages, Passage titles and Phrases live in Neon, in the `passage`
and `phrase` tables, with one Passage revision per Publish in
`passage_revision` (ADR 0047); its Allah references are in their own tables
(ADR 0014). The Passage editor reads them uncached on each request, with the
version of each, and keeps an Admin's Unpublished changes in the browser under
the Surah and that version.

The bar's one Publish sends the Passage, Phrase and Allah reference changes
together to `POST /api/v1/passages/<Surah>`, which writes them in one
transaction, with a Passage revision naming the Admin's Account, or writes
nothing. Readers see the change on their next load: the Surah's pages, parts,
Share pages, `/data/v1` file and the Theme pages that use its Passages are
refreshed and the Surah's pages warmed again, with no commit, no rebuild and no
deploy. If another Admin published the Surah first, the editor says "Someone
published first", shows the latest, and sets the outdated Unpublished changes
aside.

The Passages and Phrases were loaded into Neon once, by the content migration
`0013-load-passages-and-phrases-files`, from its own input
(`apps/web/scripts/content/0013-load-passages-and-phrases-files.json`, never
edited); `apps/web/data/passages.json` and `phrases.json` are gone. Publishing
used to commit those files through a GitHub App (ADR 0019), which nothing
uses any more. By hand: uninstall that App from the repo and delete it (GitHub
→ Settings → Developer settings → GitHub Apps), and remove its settings from
the Vercel project, which is every GitHub setting but the sign-in app's two
above.

## Release switch

`NEXT_PUBLIC_PASSAGE_HEADINGS` holds back Passage headings on the reading site
until a Scholar has checked the Passage titles. It is `off` (unset) until then.
The Passage editor and Publish work either way; the switch only decides whether
readers see the headings.

The site is built in GitHub Actions, not by Vercel (Vercel's Git deployments
are off in `vercel.json`): the Deploy workflow runs `vercel pull`, which
fetches the Vercel project's variables, then `vercel build`. So the switch is
set in Vercel and takes effect through GitHub:

1. **Vercel**: Settings → Environment Variables → `NEXT_PUBLIC_PASSAGE_HEADINGS`
   = `on`, for Production (and Preview, to see the headings on pull request
   previews first). Or from a linked checkout:

   ```bash
   printf on | vercel env add NEXT_PUBLIC_PASSAGE_HEADINGS production --force --yes
   ```

2. **GitHub**: the value is baked in at build time, so it applies from the
   next build. Run one: Actions → Deploy → Run workflow on `main`
   (`gh workflow run deploy.yml --ref main`). No GitHub secret or variable is
   needed; the workflow reads the value from Vercel.

To turn headings off again, remove the variable (or set it to anything but
`on`) and run Deploy again. Locally, put `NEXT_PUBLIC_PASSAGE_HEADINGS=on` in
`apps/web/.env.local` and restart `pnpm dev`. The site tests run once with it
off and once with it on (`apps/web/playwright.config.ts`).

`NEXT_PUBLIC_TAFSIR` holds back the Tafsir in the same way: with it `on`, each
Passage's Tafsir (al-Mukhtasar, in the reader's Language) is shown after its
last Ayah in Study and Flowing, and the Credits name al-Mukhtasar. It stays
off until the Passages have been redrawn around the Tafsir entries (#209). It
is set, and turned off again, exactly as above. The site tests' second run
sets both switches `on` together.

## Checking sign-in by hand

With the settings in place, open `https://<site>/admin` in a fresh private
window:

- You are sent to the Sign-in page's Admin entry, offering GitHub, Google and
  Apple. Sign in with GitHub as an email on the allow-list: you are back at
  `/admin`, the Surah picker named as that email. Sign out: you are on the
  Admin entry again.
- Open `/admin/18` and sign in with Google as the same email: you are back at
  Surah 18's Passage editor, the same Account.
- Sign in with GitHub as an account whose email is not on the list: the
  sign-in is refused and no Account is made. Sign in with Google as a
  non-Admin instead: you see the "not an Admin" page.
- The plain Sign-in page (`/en/sign-in`) offers only Google and Apple.

Locally, GitHub sign-in needs a second GitHub OAuth app (an OAuth app allows
only one callback URL) with the callback
`http://localhost:3000/api/v1/auth/callback/github`; see
[docs/account-setup.md](account-setup.md#local-development).

## Checking a publish by hand

The site tests publish against their own Postgres. That a Publish reaches
Neon and readers in production is checked by hand:

1. Sign in at `https://<site>/admin` as an Admin, open a Surah in the Passage
   editor, and make one small change, e.g. add a word to one Passage title.
   Publish.
2. You see "Published. Readers see it on their next load." and the
   Unpublished changes count goes back to none.
3. Open that Surah on the reading site: the new title shows (with the release
   switch on; with it off, check the title in the editor after a reload
   instead). Its `/data/v1/surahs/<Surah>.json` file carries it too.
4. In Neon, the Surah's latest row in `passage_revision` names your Account id
   as `author`, holds the edit, and is one version on from the one before.
5. Undo it: edit the title back in the Passage editor and publish again.

If Publish is refused, the Unpublished changes are kept and the editor says
why. Vercel's runtime logs for the `POST /api/v1/passages/<Surah>` request
show a write the database refused.

## The test-only sign-in

The site tests sign Admins in with Accounts' test-only sign-in at
`/<lang>/test-sign-in`, as if through GitHub, Google or Apple, with an optional
name; a GitHub test sign-in meets the same allow-list refusal as a real one. It
exists only when `ACCOUNT_TEST_SIGN_IN=on`, which only the site tests'
configuration (`apps/web/features/site/account-settings.ts`, with
`admin-settings.ts` adding the allow-list) sets, and never on a Vercel
deployment (`VERCEL=1`): there the address is not found. See
[docs/account-setup.md](account-setup.md#the-test-only-sign-in).
