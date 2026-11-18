# Account setup

This guide sets up everything Accounts need: the Neon Postgres database that
holds them, provisioned from the Vercel Marketplace, its schema, Better Auth's
secret and address, and the GitHub, Google and Apple sign-in credentials.

A reader signs in to an Account on the Sign-in page (`/en/sign-in`,
`/ur/sign-in`) with Google or Apple, sees that they are signed in, and signs
out. Reading never needs an Account, and an anonymous reader gets no cookie.
Accounts and their sign-ins live in Neon Postgres, and sign-in runs on Better
Auth inside the Next.js app at `/api/v1/auth` (ADR 0008). Admins sign in to
their Account too (#67): the Sign-in page's Admin entry, which the admin area
sends a signed-out visitor to, also offers GitHub, and a GitHub sign-in by
anyone not on the Admin allow-list is refused ([docs/admin-setup.md](admin-setup.md)).

The build needs none of these settings: they are read while the site serves a
request, so the same build runs with or without them. Set them on the Vercel
project (Settings → Environment Variables), then redeploy.

`apps/web/scripts/setup-accounts.sh` walks you through all of it: it opens the
Vercel Marketplace, Neon, GitHub, Google and Apple pages, says what to fill in, runs
`pnpm db:migrate`, signs Apple's client secret, and sets the values on Vercel
Production (and, if you say so, Preview) and in `apps/web/.env.local`. It works
in `apps/web`, which `vercel link` links to the project (it offers to run it),
wherever it is run from. It needs the Vercel CLI (signed in), Node, pnpm and
openssl:

```bash
apps/web/scripts/setup-accounts.sh
```

## Settings

| Setting | What it is |
| --- | --- |
| `DATABASE_URL` | The Account database: a Postgres connection string, `postgresql://…`. In production, Neon's, which the Vercel Marketplace integration sets on the project. |
| `BETTER_AUTH_SECRET` | The secret Better Auth signs and encrypts Account sessions with: at least 32 characters, e.g. from `openssl rand -base64 32`. Changing it signs every reader out. |
| `BETTER_AUTH_URL` | This site's address, used to build the callback URLs: `https://saaliheen.com` in production, `http://localhost:3000` locally. When it is `https`, the session cookie is a Secure one. Not set on Preview: without it, the address is the one the browser asked for, as the proxy in front (Vercel's) says, and the cookie is Secure on any Vercel deployment. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The GitHub OAuth app's Client ID and a client secret. For Admins only. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google OAuth client's Client ID and Client secret. Admins sign in with it too. |
| `ADMIN_ALLOW_LIST` | The Admin allow-list (see [docs/admin-setup.md](admin-setup.md)): who is an Admin, and who may sign in with GitHub. |
| `APPLE_CLIENT_ID` | The Sign in with Apple Services ID's identifier, e.g. `com.saaliheen.signin`. |
| `APPLE_CLIENT_SECRET` | A JWT signed with the Apple key (`.p8`); it **expires within 6 months**. See [Apple's client secret](#apples-client-secret). |
| `ACCOUNT_TEST_SIGN_IN` | Only for the site tests: `on` turns on the [test-only sign-in](#the-test-only-sign-in). **Never set it on Vercel**, or anywhere but the site tests' configuration. |

A sign-in method works only when both its id and its secret are set; without
them, choosing it on the Sign-in page says "Sign-in didn't start". The same
person, by their verified email, is one Account whichever method they sign in
with: GitHub, Google and Apple are all trusted to link, but GitHub only for an
email on the Admin allow-list.

## Neon from the Vercel Marketplace

1. Vercel → Marketplace → [Neon](https://vercel.com/marketplace/neon) →
   Install. Pick the team, a plan (Free is enough to start) and the region
   nearest the site's functions (e.g. Washington, D.C., `iad1`), and name the
   database `saaliheen`.
2. Connect it to the saaliheen project for Production, Preview and
   Development. Leave the custom prefix empty, so the variable is called
   exactly `DATABASE_URL`. Optionally tick "Create database branch for
   deployment", so each Preview gets its own Neon branch instead of
   production's Accounts.
3. `DATABASE_URL` now lands in the Vercel project's environment variables. You
   don't set it by hand.

To read it locally, pull the project's variables to a scratch file in
`apps/web` (any `.env*` file is gitignored), take `DATABASE_URL` from it and
delete the file:

```bash
cd apps/web
vercel env pull .env.vercel-production.local --environment=production
```

Don't pull straight into `.env.local`: `vercel env pull` replaces the whole
file. If the value comes back empty (a sensitive variable), copy it from Vercel
→ Storage → saaliheen → `.env.local` tab, or the Neon console → Connect.

## The Account tables

`pnpm db:migrate` creates or updates the Account tables in the database
`DATABASE_URL` names: Better Auth's schema for the options the site runs with
(`apps/web/scripts/db-migrate.ts`), then Saaliheen's own content tables and
data, such as the Iltifat, each content migration run once per database (ADR
0015). It does not read `.env.local`, so pass the
URL. Run it in `apps/web` (or `pnpm --filter @saaliheen/web db:migrate` from the
root):

```bash
cd apps/web
DATABASE_URL='postgresql://…' pnpm db:migrate
```

The Deploy workflow runs it against production's database before every
production deploy, with the `DATABASE_URL` it pulls from Vercel, so a release
that changes the Account schema brings its tables with it. Run it by hand
against any other database (a preview's or your local one); it prints how many
tables it created and altered.

## Secret and address

- `BETTER_AUTH_SECRET`: `openssl rand -base64 32`. Use a different one for
  Production, Preview and local development.
- `BETTER_AUTH_URL`: `https://saaliheen.com` on Production,
  `http://localhost:3000` in `apps/web/.env.local`, unset on Preview.

## GitHub

GitHub is offered to Admins only, on the Sign-in page's Admin entry.

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   (`https://github.com/settings/applications/new`).
2. Application name `Saaliheen`, Homepage URL `https://saaliheen.com`.
   Authorization callback URL: `https://saaliheen.com/api/v1/auth/callback/github`.
3. Copy the Client ID into `GITHUB_CLIENT_ID`; generate a client secret into
   `GITHUB_CLIENT_SECRET`.

A GitHub OAuth app allows only one callback URL, so local development needs a
second app with the callback `http://localhost:3000/api/v1/auth/callback/github`.
The site signs in with the GitHub account's primary email, and only when GitHub
has verified it.

## Google

1. Google Cloud console → Google Auth Platform: set it up (Audience: External).
   On Branding, set the home page to `https://saaliheen.com` and add
   `saaliheen.com` under Authorised domains; then Audience → Publish app (the
   site asks only for the openid, email and profile scopes). Admins sign in
   with this client too.
2. Google Auth Platform → Clients → Create client → Web application (or open
   an existing client and add the URIs below to it).
3. Authorized JavaScript origins: `https://saaliheen.com` and
   `http://localhost:3000`.
4. Authorized redirect URIs, `https://<origin>/api/v1/auth/callback/google`:
   - `https://saaliheen.com/api/v1/auth/callback/google`
   - `http://localhost:3000/api/v1/auth/callback/google`
5. Copy the Client ID into `GOOGLE_CLIENT_ID` and the Client secret into
   `GOOGLE_CLIENT_SECRET`. Google shows a new client's secret only once; for a
   reused client whose secret you no longer have, add a secret and copy that.

## Apple

Sign in with Apple needs a paid Apple Developer Program membership. In Apple
Developer → Certificates, Identifiers & Profiles:

1. **App ID**: Identifiers → + → App IDs → App. Description `Saaliheen`, an
   explicit Bundle ID such as `com.saaliheen.app`, and tick the **Sign in with
   Apple** capability. Note your **Team ID** (top right, or Membership details).
2. **Services ID**: Identifiers → + → Services IDs. Description `Saaliheen`,
   Identifier such as `com.saaliheen.signin`: this identifier is
   `APPLE_CLIENT_ID`. Open it, tick Sign in with Apple → Configure:
   - Primary App ID: the App ID above.
   - Domains and Subdomains: `saaliheen.com`.
   - Return URLs, `https://<origin>/api/v1/auth/callback/apple`:
     `https://saaliheen.com/api/v1/auth/callback/apple`.

   Apple accepts only `https` return URLs on a real domain, so Sign in with
   Apple works on production, never on `localhost` or a Preview address. Apple
   answers by posting a form back from `https://appleid.apple.com`, which the
   site trusts as an origin.
3. **Key**: Keys → + → tick Sign in with Apple → Configure → the App ID above
   → Register. Download the `.p8` file (only once) and note its **Key ID**.
   Keep the `.p8` safe, e.g. in a password manager; never commit it.

### Apple's client secret

`APPLE_CLIENT_SECRET` is not a fixed string: it is a JWT signed ES256 with the
`.p8` key, with header `kid` = the Key ID and claims `iss` = the Team ID,
`sub` = the Services ID (`APPLE_CLIENT_ID`), `aud` = `https://appleid.apple.com`,
`iat` = now and `exp` at most **6 months** later (Apple's limit). The wizard
signs one valid for 180 days and prints its expiry date. Before that date,
generate a new one, set it on Vercel and redeploy, or Sign in with Apple stops
working. Re-running the wizard does it, or by hand in `apps/web`:

```bash
TEAM=<team id> KID=<key id> CID=<services id> P8=/path/to/AuthKey_XXXXXXXXXX.p8 node -e '
  const crypto = require("crypto"), fs = require("fs");
  const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = part({ alg: "ES256", kid: process.env.KID });
  const body = part({ iss: process.env.TEAM, iat: now, exp: now + 180 * 86400, aud: "https://appleid.apple.com", sub: process.env.CID });
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key: fs.readFileSync(process.env.P8), dsaEncoding: "ieee-p1363" }).toString("base64url");
  console.log(head + "." + body + "." + sig);' | vercel env add APPLE_CLIENT_SECRET production --force --sensitive
```

## Vercel

| Setting | Production | Preview |
| --- | --- | --- |
| `DATABASE_URL` | set by the Neon integration | set by the Neon integration (a branch, if chosen) |
| `BETTER_AUTH_SECRET` | its own, sensitive | its own, sensitive |
| `BETTER_AUTH_URL` | `https://saaliheen.com` | not set |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | set (secret sensitive) | optional, the same |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | set (secret sensitive) | optional, the same |
| `ADMIN_ALLOW_LIST` | set | optional, the same |
| `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | set (secret sensitive) | optional, the same |
| `ACCOUNT_TEST_SIGN_IN` | never | never |

Previews get a new address on every deploy, which no Google client or Apple
Services ID can list as a callback, so sign-in itself is checked on production;
on a Preview, the Sign-in page loads and reading works signed out. Vercel reads
new variables only on a new deployment: run Actions → Deploy for `main` (or
`gh workflow run deploy.yml --ref main`).

## Local development

In `apps/web/.env.local`: a `DATABASE_URL` of its own (a Neon branch such as
`dev`, from the Neon console → Branches, or any Postgres) with
`pnpm db:migrate` run against it, a local `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL=http://localhost:3000`, the Google client's id and
secret, and, for the admin area, `ADMIN_ALLOW_LIST` and the local GitHub app's
id and secret. Restart `pnpm dev` after changing it. Google sign-in works at
`http://localhost:3000/en/sign-in`; Apple does not work locally.

## Checking it by hand

The site scenarios sign in with the test-only sign-in. That real Google and
Apple sign-ins work is checked by hand, once the settings are on Vercel
Production and deployed, at `https://saaliheen.com/en/sign-in`:

1. Sign in with Google: you are back on the Sign-in page, signed in as your
   Google email. Sign out: the Google and Apple buttons show again.
2. Sign in with Apple, with an Apple ID that shares the same email (and share
   it, rather than "Hide My Email"): you are the same Account, signed in as that
   email. Sign out.
3. Open a Surah signed out in a fresh private window: it reads as before, and
   DevTools → Application → Cookies shows no cookie set.

If a sign-in fails, the usual causes are a redirect URI or return URL that
doesn't match exactly, a missing id or secret, an expired `APPLE_CLIENT_SECRET`,
or the Account tables not migrated. Vercel's runtime logs for the
`/api/v1/auth/...` request show the error.

## The test-only sign-in

The site tests sign in at `/<lang>/test-sign-in` without GitHub, Google or
Apple, readers and Admins alike, giving an email, a method and optionally the
name a provider would give (it becomes the Account's name). A GitHub test
sign-in meets the same allow-list refusal as a real one. It
exists only when `ACCOUNT_TEST_SIGN_IN=on`, which only the site tests'
configuration (`apps/web/features/site/account-settings.ts`) sets, and never on
a Vercel deployment (`VERCEL=1`): there the address is not found. Never set
`ACCOUNT_TEST_SIGN_IN` on Vercel or anywhere
else.
