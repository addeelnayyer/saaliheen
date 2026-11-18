// The Languages a Passage title is written in (CONTEXT.md, Language): Urdu and
// English, in the order Saaliheen lists them. They live here, the lowest of the
// shared packages, because every Passage carries a title in each; the dataset
// package's types re-export them.

export type Language = "ur" | "en";

export const LANGUAGES: readonly Language[] = ["ur", "en"];
