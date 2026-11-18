// The Account database (#66, ADR 0008): the site's one Postgres pool
// (../database.ts), shared by Better Auth (./auth-options.ts), the Account's
// synced settings (./synced-settings.ts), its Reading places
// (./synced-reading-places.ts) and its Known words (./synced-known-words.ts).

export { database as accountDatabase } from "../database.ts";
