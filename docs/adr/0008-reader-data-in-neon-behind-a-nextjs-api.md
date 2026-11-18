Partly superseded by [0011](0011-all-data-in-neon-behind-the-versioned-api.md): the Quran dataset and Passages move into Neon too; reader data and the versioned API stand.

# Reader data lives in Neon Postgres behind a versioned API in the Next.js app

Accounts, Quran Chat and the mobile app bring data that belongs to one person or is computed per request: Accounts and their sign-ins, synced Script and Language, Reading places, Conversations and Quran Chat limits. That data lives in Neon Postgres, reached through a versioned JSON API (`/api/v1/...`) served by Route Handlers in the same Next.js app on Vercel that serves the website; the mobile app is just another client of it. This amends [0001](0001-static-quran-dataset.md)'s "we don't run a database" for reader data only: the Quran text, Word meanings, Roots and Passages stay a static, repo-owned dataset ([0001](0001-static-quran-dataset.md), [0006](0006-admin-edits-to-passages-are-commits.md)), served to the mobile app as versioned static files (`/data/v1/...`) with a manifest of content hashes so an installed app knows which of its offline Surahs are stale. Both are versioned because installed apps lag behind deploys for months, and the server can name a minimum app version it still supports.

## Considered Options

- A separate API service outside Next.js: rejected because React Native only needs HTTP, the site's Admin sign-in already lives here, and one deploy is simpler. The API keeps to its own route group and plain JSON, so it can move out later without the app noticing.
- Cloudflare Workers with D1: cheaper at scale and our DNS is already there, but a second deploy target and a second runtime for no present need.
- Supabase or Firebase called directly from both apps: rejected to keep the data rules on our own server and the database plain Postgres.
- Moving the Quran dataset into Postgres too: rejected because it never changes at runtime and is served faster and cheaper from the CDN.
