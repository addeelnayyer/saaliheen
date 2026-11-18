// A Supplication's Openings and kinds (#199, #200, #201): plain lists, read
// in the browser too (the Supplication editor's form), so nothing here
// reaches the database.

/** How a Supplication calls on Allah, in the order its Openings are written. */
export const OPENINGS = ["rabbana", "rabbi", "other"] as const;
export type Opening = (typeof OPENINGS)[number];

/** "supplication" for a Supplication; any other kind is Other words to Allah, named by its label's slug. */
export const SUPPLICATION_KINDS = [
  "supplication",
  "plea-at-the-judgment",
  "request-for-this-world-only",
  "complaint",
  "mockery",
  "hypothetical",
  "reported-words",
] as const;
export type SupplicationKind = (typeof SUPPLICATION_KINDS)[number];
