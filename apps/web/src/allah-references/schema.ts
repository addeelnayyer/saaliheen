// Allah references' two tables (#147, ADR 0012, ADR 0014), declared through
// Better Auth's schema like the synced settings' and Reading places', so
// `pnpm db:migrate` creates them in the Account database with the Account
// tables, and running it again changes nothing.

import type { BetterAuthPlugin } from "better-auth";

/** The table of Allah references: one row per Word location. */
export const REFERENCES = "allahReference";
/** The table of Allah reference revisions: one row per publish or seed. */
export const REVISIONS = "allahReferenceRevision";

/** Who a seed revision names as its author, where a publish names the Admin's Account. */
export const SEED_AUTHOR = "seed";

/**
 * "allahReference": `location` (`s:a:w`, unique) and its `surah`, kept to read
 * a Surah's at once. "allahReferenceRevision": the `surah` it changed, its
 * `author` (an Admin's Account id, or "seed"), when it was made
 * (`createdAt`), the Word locations it `added` and `removed` (JSON arrays),
 * the `base` version it was made against and the `version` it made, one more
 * than its base. A Surah's version is its latest revision's, 0 before any.
 */
export const allahReferencesSchema = () =>
  ({
    id: "allah-references",
    schema: {
      [REFERENCES]: {
        fields: {
          location: { type: "string", required: true, unique: true },
          surah: { type: "number", required: true, index: true },
        },
      },
      [REVISIONS]: {
        fields: {
          surah: { type: "number", required: true, index: true },
          author: { type: "string", required: true },
          createdAt: { type: "date", required: true },
          added: { type: "json", required: true },
          removed: { type: "json", required: true },
          base: { type: "number", required: true },
          version: { type: "number", required: true },
        },
      },
    },
  }) satisfies BetterAuthPlugin;
