// The Supplications as the tests expect them (#199, #195, ADR 0027), read from
// the files committed in the repo, never typed into a test: the raw list
// (data/quran_supplications_categorized.json, one row per Ayah) and the curated
// file built from it (data/supplications/supplications.json), which the content
// migrations load into Neon. Both the API features (features/api/) and the
// site steps (features/site/steps/) read them through this module.
//
// The curated file's shape (PROPOSED, #199 stage 1, following #195's
// Implementation Decisions):
//
//   {
//     "speakers": [
//       { "id": "musa", "nameEn": "Musa", "nameUr": "…", "includesProphet": true }, …
//     ],
//     "supplications": [
//       { "surah": 2, "ayahFrom": 127, "ayahTo": 129, "speakerId": "…",
//         "openings": ["rabbana"], "kind": "supplication" }, …
//     ]
//   }
//
// - A Speaker's id is a slug; `includesProphet` is its Prophet mark.
// - A Supplication's `openings` is a non-empty set of "rabbana", "rabbi" and
//   "other", written in that order; its `kind` is "supplication" for a
//   Supplication, or one of KINDS' other slugs for Other words to Allah.
// - "supplications" holds the Supplications and the Other words to Allah alike,
//   in Quran order (by Surah, then first Ayah).

import fs from "node:fs";
import path from "node:path";

// The app's own folder: both the site tests (Playwright, CommonJS) and the API
// tests (Vitest, ES modules) run from it, so neither __dirname nor
// import.meta is needed to find it.
const APP = process.cwd();
/** The raw list, as it arrived (#195). */
export const RAW_FILE = "data/quran_supplications_categorized.json";
/** The curated file built from it, beside it in the dataset's `data/supplications/` folder (ADR 0027). */
export const CURATED_FILE = "data/supplications/supplications.json";

export type Opening = "rabbana" | "rabbi" | "other";
export const OPENINGS: Opening[] = ["rabbana", "rabbi", "other"];

/** Openings or their names as a scenario writes them, "rabbana, rabbi", as a list. */
export const openingsIn = (written: string) => written.split(",").map((o) => o.trim()).filter(Boolean);

/**
 * Each kind: its slug, as the curated file and GET /api/v1/supplications write
 * it, and its label, in #195's words. "supplication" marks a Supplication; any
 * other marks Other words to Allah.
 */
export const KINDS = [
  { slug: "supplication", label: "Supplication" },
  { slug: "plea-at-the-judgment", label: "Plea at the Judgment" },
  { slug: "request-for-this-world-only", label: "Request for this world only" },
  { slug: "complaint", label: "Complaint" },
  { slug: "mockery", label: "Mockery" },
  { slug: "hypothetical", label: "Hypothetical" },
  { slug: "reported-words", label: "Reported words" },
] as const;
export type Kind = (typeof KINDS)[number]["slug"];
/** A kind's label, as the page shows it. */
export const labelOfKind = (kind: Kind) => KINDS.find((k) => k.slug === kind)!.label;

export const kindOfLabel = (label: string): Kind => {
  const found = KINDS.find((k) => k.label === label);
  if (!found) throw new Error(`no kind labelled "${label}"`);
  return found.slug;
};

/** One row of the raw list: one Ayah. */
export interface RawRow {
  surah: number;
  ayah: number;
  entity: string;
  context_type: string;
  invocation_form: "rabbana" | "rabbi" | "other" | "continuation";
}

export interface CuratedSpeaker {
  id: string;
  nameEn: string;
  nameUr: string;
  includesProphet: boolean;
}
export interface CuratedSupplication {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  speakerId: string;
  openings: Opening[];
  kind: Kind;
}
export interface Curated {
  speakers: CuratedSpeaker[];
  supplications: CuratedSupplication[];
}

/** Whether the curated file is committed yet. */
export const curatedFileExists = () => fs.existsSync(path.join(APP, CURATED_FILE));

/** The raw list's rows, in Quran order. */
export function rawRows(): RawRow[] {
  const rows = JSON.parse(fs.readFileSync(path.join(APP, RAW_FILE), "utf8")) as RawRow[];
  return rows.toSorted((a, b) => a.surah - b.surah || a.ayah - b.ayah);
}

let curatedFile: Curated | undefined;

/** The curated file, read once; it must be committed. */
export function curated(): Curated {
  const file = path.join(APP, CURATED_FILE);
  if (!fs.existsSync(file)) throw new Error(`the curated file ${CURATED_FILE} is not committed`);
  return (curatedFile ??= JSON.parse(fs.readFileSync(file, "utf8")) as Curated);
}

/** The curated file's entry at `surah:ayahFrom–ayahTo`, if it has one. */
export const curatedAt = ({ surah, ayahFrom, ayahTo }: { surah: number; ayahFrom: number; ayahTo: number }) =>
  curated().supplications.find((c) => c.surah === surah && c.ayahFrom === ayahFrom && c.ayahTo === ayahTo);

/** The curated file's Supplications alone, Other words to Allah left out, in Quran order. */
export const curatedSupplicationsOnly = () =>
  curated()
    .supplications.filter((s) => s.kind === "supplication")
    .toSorted(quranOrder);

/** The Supplications page's choices (#200), as its link carries them: `?opening=rabbana|rabbi|other`, `?prophets=1`, `?others=1`. */
export interface Choices {
  opening: string | null;
  prophets: boolean;
  others: boolean;
}

/** The choices a link carries; any `opening` is kept as written. */
export const choicesIn = (query: URLSearchParams): Choices => ({
  opening: query.get("opening"),
  prophets: query.get("prophets") === "1",
  others: query.get("others") === "1",
});

/**
 * The curated file's entries the switches keep, in Quran order, before any
 * Opening narrows them, by #195's rules: "Prophets only" keeps those whose
 * Speaker includes a Prophet; the Other words to Allah are kept only when shown.
 */
export function keptBySwitches({ prophets, others }: Pick<Choices, "prophets" | "others">): CuratedSupplication[] {
  const { speakers, supplications } = curated();
  const prophet = new Set(speakers.filter((s) => s.includesProphet).map((s) => s.id));
  return supplications
    .filter((s) => others || s.kind === "supplication")
    .filter((s) => !prophets || prophet.has(s.speakerId))
    .toSorted(quranOrder);
}

/** The entries one of whose Openings is `opening`; all of them for `null` (All). */
export const withOpening = (entries: CuratedSupplication[], opening: string | null) =>
  opening === null ? entries : entries.filter((s) => (s.openings as string[]).includes(opening));

/** The curated file's entries for the choices, in Quran order: with none, its Supplications only. */
export const curatedEntriesFor = (choices: Choices) => withOpening(keptBySwitches(choices), choices.opening);

/** Quran order: by Surah, then first Ayah, then last. */
export const quranOrder = (a: { surah: number; ayahFrom: number; ayahTo: number }, b: typeof a) =>
  a.surah - b.surah || a.ayahFrom - b.ayahFrom || a.ayahTo - b.ayahTo;

/** A run as a scenario writes it: "2:127–129", or "28:16". */
export const runOf = (s: { surah: number; ayahFrom: number; ayahTo: number }) =>
  s.ayahFrom === s.ayahTo ? `${s.surah}:${s.ayahFrom}` : `${s.surah}:${s.ayahFrom}–${s.ayahTo}`;

/** "2:127–129" (en dash or hyphen) or "28:16" as a run. */
export function parseRun(run: string): { surah: number; ayahFrom: number; ayahTo: number } {
  const m = run.match(/^(\d+):(\d+)(?:[–-](\d+))?$/);
  if (!m) throw new Error(`not a run: "${run}"`);
  return { surah: Number(m[1]), ayahFrom: Number(m[2]), ayahTo: Number(m[3] ?? m[2]) };
}

/** Every Ayah ("s:a") of a run, in order. */
export const ayahsOf = (s: { surah: number; ayahFrom: number; ayahTo: number }) =>
  Array.from({ length: s.ayahTo - s.ayahFrom + 1 }, (_, n) => `${s.surah}:${s.ayahFrom + n}`);

/** Whether a run holds `surah:ayah`. */
export const holds = (s: { surah: number; ayahFrom: number; ayahTo: number }, surah: number, ayah: number) =>
  s.surah === surah && s.ayahFrom <= ayah && ayah <= s.ayahTo;

/**
 * The raw list's runs: consecutive Ayahs of one Surah with the same raw
 * speaker, as #195's grouping starts from (94 of them).
 */
export function rawRuns(): { surah: number; ayahFrom: number; ayahTo: number; entity: string }[] {
  const runs: { surah: number; ayahFrom: number; ayahTo: number; entity: string }[] = [];
  for (const r of rawRows()) {
    const last = runs.at(-1);
    if (last && last.surah === r.surah && last.ayahTo + 1 === r.ayah && last.entity === r.entity) last.ayahTo = r.ayah;
    else runs.push({ surah: r.surah, ayahFrom: r.ayah, ayahTo: r.ayah, entity: r.entity });
  }
  return runs;
}
