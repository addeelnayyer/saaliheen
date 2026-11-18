// The seeded list (#147): the Word locations the site tests' Postgres is
// seeded with before the build (../allah-references.json, through
// features/site/start-test-database.ts), so the Words every other feature
// reads in Surah 1, 12 and 112 include Allah references drawn in Allah
// reference colour.

import fs from "node:fs";
import path from "node:path";

/** The file the site tests' Postgres is seeded with. */
const SEEDED_LIST = path.join(__dirname, "..", "allah-references.json");

/** The Word locations in the seeded list. */
export const seededAllahReferences = (): string[] => JSON.parse(fs.readFileSync(SEEDED_LIST, "utf8"));

/** Whether the Word at `location` is an Allah reference in the seeded list. */
let seededSet: Set<string> | undefined;
export const isSeededAllahReference = (location: string) => (seededSet ??= new Set(seededAllahReferences())).has(location);

/**
 * The least contrast an Allah reference's Arabic keeps with what is drawn
 * behind it: WCAG's minimum for large text, which Quranic Arabic always is.
 * #147 fixes Allah reference colour (#A87A0A on light), which keeps 3.5 to 1
 * on the light Phrase colours, short of the 4.5 to 1 the rest of the Arabic keeps.
 */
export const ALLAH_REFERENCE_CONTRAST = 3;
