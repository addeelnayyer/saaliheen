// Release switches: build-time environment settings that hold back a feature
// until it is ready, on only when set to "on". Next.js inlines each
// NEXT_PUBLIC_ value into the build, so a switch's state is the build's.

/** Passage headings above the first Ayah of each Passage (#41), off until a Scholar has checked the Passage titles. */
export const PASSAGE_HEADINGS = process.env.NEXT_PUBLIC_PASSAGE_HEADINGS === "on";

/** Each Passage's Tafsir after its last Ayah, and al-Mukhtasar in the Credits (#234), off until the Passages have been redrawn around the Tafsir entries (#209). */
export const TAFSIR = process.env.NEXT_PUBLIC_TAFSIR === "on";
