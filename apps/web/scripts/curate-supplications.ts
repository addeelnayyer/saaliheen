// The one-off build of the curated Supplications (#199, #195, ADR 0027): it
// turns the raw, hand-categorised list (data/quran_supplications_categorized.json,
// one row per Ayah) into data/supplications/supplications.json, the file the
// content migration loads into Neon once (scripts/content/supplications.ts).
// After that load Neon is the only copy, and both files are frozen inputs: run
// this again only to rebuild the file before it has shipped.
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning scripts/curate-supplications.ts
//
// What it does, following #195's Implementation Decisions:
// - Each raw speaker (`entity`) becomes one Speaker, with a clean English name,
//   a drafted Urdu name for a Scholar to check, and its Prophet mark (SPEAKERS).
// - The runs start from consecutive Ayahs of one Surah with one raw speaker;
//   then by hand 28:16 and 28:17 are two, and 14:35–41 is one, taking in 14:39,
//   which the raw list leaves out (RUNS_BY_HAND).
// - A run's Openings are its rows' invocation forms, a `continuation` taking
//   its run's, written rabbana, rabbi, other.
// - A run's kind is its rows' context type, as KIND_OF maps them.
// - `attribution_basis` is provenance only and is not carried over.

import fs from "node:fs";
import { fileURLToPath } from "node:url";

const RAW = fileURLToPath(new URL("../data/quran_supplications_categorized.json", import.meta.url));
const CURATED = fileURLToPath(new URL("../data/supplications/supplications.json", import.meta.url));

type Opening = "rabbana" | "rabbi" | "other";
const OPENINGS: readonly Opening[] = ["rabbana", "rabbi", "other"];

interface RawRow {
  surah: number;
  ayah: number;
  entity: string;
  context_type: string;
  invocation_form: Opening | "continuation";
}

/** Each raw context type's kind: "supplication" marks a Supplication, any other slug Other words to Allah. */
const KIND_OF: Record<string, string> = {
  supplication: "supplication",
  intercession: "supplication",
  judgment_statement: "plea-at-the-judgment",
  worldly_request: "request-for-this-world-only",
  complaint: "complaint",
  mocking_demand: "mockery",
  hypothetical_statement: "hypothetical",
  reported_statement: "reported-words",
  non_invocative_reference: "reported-words",
};

/**
 * Each raw speaker's Speaker: [English name, drafted Urdu name, includes a
 * Prophet]. Every Urdu name is drafted for a Scholar to check; the Prophet
 * marks follow #195, and those of "The Prophet and believers with him" (66:8),
 * "Believers who fought alongside prophets" (3:147) and "Believer praying for
 * parents" (17:24) are put to a Scholar.
 */
const SPEAKERS: Record<string, readonly [nameEn: string, nameUr: string, includesProphet: boolean]> = {
  "A group commanded to fight who feared people": ["Those commanded to fight who feared people", "قتال کا حکم پا کر لوگوں سے ڈرنے والے", false],
  "Adam and his wife Hawwa": ["Adam and Hawwa", "آدم اور حوا", true],
  "Angels bearing and surrounding the Throne": ["The angels who bear the Throne and those around it", "عرش اٹھانے والے اور اس کے گرد کے فرشتے", false],
  Ayyub: ["Ayyub", "ایوب", true],
  "Believer at maturity (model invocation)": ["A believer come of age", "پختہ عمر کو پہنچا ہوا مومن", false],
  "Believer praying for parents (commanded invocation)": ["A believer praying for parents", "والدین کے لیے دعا کرنے والا مومن", false],
  "Believers who fought alongside prophets": ["Believers who fought alongside Prophets", "انبیا کے ساتھ لڑنے والے مومن", false],
  "Believing followers of Musa": ["The believing followers of Musa", "موسیٰ کے مومن پیروکار", false],
  "Believing servants of Allah": ["Allah’s believing servants", "اللہ کے مومن بندے", false],
  "Companions of the Cave": ["The Companions of the Cave", "اصحابِ کہف", false],
  "Condemned wrongdoers in Hell": ["Condemned wrongdoers in Hell", "جہنم میں سزا پانے والے ظالم", false],
  "Disbelievers asking to see their misleaders": ["Disbelievers asking to see those who misled them", "اپنے گمراہ کرنے والوں کو دیکھنا چاہنے والے کافر", false],
  "Disciples of Isa (the Hawariyyun)": ["The disciples of Isa", "عیسیٰ کے حواری", false],
  "God-fearing believers": ["God-fearing believers", "متقی مومن", false],
  "Human allies of the jinn": ["Human allies of the jinn", "جنوں کے انسانی دوست", false],
  "Hypothetical objectors who would complain before revelation": ["Objectors who would have complained had no revelation come", "وحی نہ آنے پر شکایت کرنے والے فرضی معترض", false],
  "Hypothetical people protesting lack of a messenger": ["People who would have protested that no Messenger came", "رسول نہ آنے پر احتجاج کرنے والے فرضی لوگ", false],
  Ibrahim: ["Ibrahim", "ابراہیم", true],
  "Ibrahim and Ismail": ["Ibrahim and Ismail", "ابراہیم اور اسماعیل", true],
  "Ibrahim and the believers with him": ["Ibrahim and the believers with him", "ابراہیم اور ان کے ساتھی مومن", true],
  "Isa ibn Maryam": ["Isa son of Maryam", "عیسیٰ ابن مریم", true],
  "Later believers praying for earlier believers": ["Later believers praying for earlier believers", "پہلے مومنوں کے لیے دعا کرنے والے بعد کے مومن", false],
  "Later generations of the people of Hell": ["Later generations of the people of Hell", "جہنم والوں کی بعد کی نسلیں", false],
  "Leaders against whom judgment is confirmed": ["Leaders against whom judgment is confirmed", "وہ سردار جن پر فیصلہ ثابت ہو گیا", false],
  Lut: ["Lut", "لوط", true],
  "Mockers who demand their judgment hastened": ["Mockers who demand their judgment hastened", "اپنا فیصلہ جلد مانگنے والے ٹھٹھا کرنے والے", false],
  "Muhammad (commanded to say)": ["The Prophet Muhammad ﷺ, commanded to say", "نبی محمد ﷺ، جنہیں کہنے کا حکم ہوا", true],
  Musa: ["Musa", "موسیٰ", true],
  "Musa and Harun": ["Musa and Harun", "موسیٰ اور ہارون", true],
  Nuh: ["Nuh", "نوح", true],
  "Oppressed believing men, women and children": ["Oppressed believing men, women and children", "کمزور مومن مرد، عورتیں اور بچے", false],
  "People firmly grounded in knowledge": ["Those firmly grounded in knowledge", "علم میں پختہ لوگ", false],
  "People of Hell admitting their wrongdoing": ["People of Hell admitting their wrongdoing", "اپنے گناہوں کا اقرار کرنے والے جہنمی", false],
  "People of Hell blaming those who led them astray": ["People of Hell blaming those who led them astray", "گمراہ کرنے والوں کو الزام دینے والے جہنمی", false],
  "People of Hell seeking another chance": ["People of Hell seeking another chance", "دوسرا موقع مانگنے والے جہنمی", false],
  "People of Hell who followed leaders": ["People of Hell who followed their leaders", "اپنے سرداروں کی پیروی کرنے والے جہنمی", false],
  "People of Paradise": ["The people of Paradise", "جنت والے", false],
  "People of Saba": ["The people of Saba", "قومِ سبا", false],
  "People of the Heights (al-Araf)": ["The people of the Heights", "اصحابِ اعراف", false],
  "People of understanding (ulu al-albab)": ["People of understanding", "عقل والے", false],
  "People seeking good in this world and the Hereafter": ["People seeking good in this world and the Hereafter", "دنیا اور آخرت کی بھلائی مانگنے والے", false],
  "People seeking only worldly benefit": ["People seeking only this world’s good", "صرف دنیا مانگنے والے", false],
  "Pharaoh’s magicians who believed": ["Pharaoh’s magicians who believed", "فرعون کے جادوگر جو ایمان لائے", false],
  "Polytheists seeing their alleged partners": ["Polytheists seeing the partners they ascribed", "اپنے ٹھہرائے ہوئے شریکوں کو دیکھنے والے مشرک", false],
  "Prophet sent to a denying community (name not stated in immediate passage)": ["A Prophet sent to a denying people", "جھٹلانے والی قوم کی طرف بھیجے گئے نبی", true],
  "Servants of the Most Merciful (ibad al-Rahman)": ["The servants of the Most Merciful", "رحمٰن کے بندے", false],
  "Shuayb and the believers with him": ["Shuayb and the believers with him", "شعیب اور ان کے ساتھی مومن", true],
  "Sinners at the Judgment": ["Sinners at the Judgment", "قیامت کے دن مجرم", false],
  Sulayman: ["Sulayman", "سلیمان", true],
  "Talut’s believing soldiers": ["Talut’s believing soldiers", "طالوت کے مومن سپاہی", false],
  "The Messenger and the believers": ["The Messenger and the believers", "رسول اور اہلِ ایمان", true],
  "The Prophet and believers with him": ["The Prophet and the believers with him", "نبی اور ان کے ساتھی مومن", true],
  "The believers": ["The believers", "مومن", false],
  "The disbeliever’s companion (qarin)": ["The disbeliever’s companion", "کافر کا ہم نشین", false],
  "Those who do not expect to meet Allah": ["Those who do not expect to meet Allah", "اللہ سے ملنے کی امید نہ رکھنے والے", false],
  "Truth-recognizing listeners from earlier scripture communities": ["People of earlier Scripture who knew the truth", "حق پہچاننے والے اہلِ کتاب", false],
  "Wife of Imran (mother of Maryam)": ["The wife of Imran", "عمران کی بیوی", false],
  "Wife of Pharaoh": ["The wife of Pharaoh", "فرعون کی بیوی", false],
  "Wrongdoers requesting respite at Judgment": ["Wrongdoers asking for respite at the Judgment", "قیامت کو مہلت مانگنے والے ظالم", false],
  "Yunus (Dhu al-Nun)": ["Yunus", "یونس", true],
  Yusuf: ["Yusuf", "یوسف", true],
  Zakariya: ["Zakariya", "زکریا", true],
};

/** A run's place: Ayahs `ayahFrom` to `ayahTo` of `surah`. */
interface Span {
  surah: number;
  ayahFrom: number;
  ayahTo: number;
}

interface Run extends Span {
  rows: RawRow[];
}

interface ByHand {
  replace: string[];
  by: Span[];
}

/** The runs written by hand over the raw runs: each raw run (by "s:from–to") replaced by these. */
const RUNS_BY_HAND: ByHand[] = [
  // Two prayers of Musa: forgiveness for the man he struck, then his vow.
  { replace: ["28:16–17"], by: [{ surah: 28, ayahFrom: 16, ayahTo: 16 }, { surah: 28, ayahFrom: 17, ayahTo: 17 }] },
  // Ibrahim's one prayer, which the raw list breaks at 14:39 (his thanks for Ismail and Ishaq).
  { replace: ["14:35–38", "14:40–41"], by: [{ surah: 14, ayahFrom: 35, ayahTo: 41 }] },
];

const runKey = (r: Span) => `${r.surah}:${r.ayahFrom}–${r.ayahTo}`;
const quranOrder = (a: { surah: number; ayahFrom: number }, b: typeof a) => a.surah - b.surah || a.ayahFrom - b.ayahFrom;

/** A Speaker's id: its English name as a slug. */
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Whether `row` is the Ayah after `run`'s last, from the same raw speaker. */
const followsInSurah = (run: Run, row: RawRow) => run.ayahTo + 1 === row.ayah && run.rows[0].entity === row.entity;

/** Whether `row` carries on `run`: the next Ayah of its Surah, from its raw speaker. */
const carriesOn = (run: Run, row: RawRow) => run.surah === row.surah && followsInSurah(run, row);

/** Whether there is a run before `row` and `row` carries it on. */
const joins = (run: Run | undefined, row: RawRow): run is Run => run !== undefined && carriesOn(run, row);

/** `runs` with `row` added: to the last run when it carries that on, else as a run of its own. */
function addRow(runs: Run[], row: RawRow): Run[] {
  const last = runs.at(-1);
  if (joins(last, row)) {
    last.ayahTo = row.ayah;
    last.rows.push(row);
  } else runs.push({ surah: row.surah, ayahFrom: row.ayah, ayahTo: row.ayah, rows: [row] });
  return runs;
}

/** The raw list's runs: consecutive Ayahs of one Surah with one raw speaker. */
const rawRuns = (rows: RawRow[]): Run[] => rows.reduce(addRow, []);

/** The raw runs with RUNS_BY_HAND applied, in Quran order. */
function curatedRuns(rows: RawRow[]): Run[] {
  const runs = new Map(rawRuns(rows).map((run) => [runKey(run), run]));
  for (const byHand of RUNS_BY_HAND) applyByHand(runs, rows, byHand);
  return [...runs.values()].toSorted(quranOrder);
}

/** `runs` with one RUNS_BY_HAND entry applied: its raw runs dropped, its own runs set from `rows`. */
function applyByHand(runs: Map<string, Run>, rows: RawRow[], { replace, by }: ByHand) {
  replace.forEach((key) => dropRawRun(runs, key));
  by.forEach((run) => runs.set(runKey(run), { ...run, rows: rows.filter((r) => isInside(run, r)) }));
}

function dropRawRun(runs: Map<string, Run>, key: string) {
  if (!runs.delete(key)) throw new Error(`curate-supplications: ${key} is not a raw run`);
}

/** Whether `ayah` falls between `run`'s first and last Ayah. */
const spans = (run: Span, ayah: number) => run.ayahFrom <= ayah && ayah <= run.ayahTo;

/** Whether `row` is one of `run`'s Ayahs. */
const isInside = (run: Span, row: RawRow) => row.surah === run.surah && spans(run, row.ayah);

/** The one value `of` gives every row of `run`. */
function oneOf(run: Run, what: string, of: (row: RawRow) => string): string {
  const values = [...new Set(run.rows.map(of))];
  if (values.length !== 1) throw new Error(`curate-supplications: ${runKey(run)} has ${values.length} ${what}s`);
  return values[0];
}

function speakerOf(entity: string) {
  const speaker = SPEAKERS[entity];
  if (!speaker) throw new Error(`curate-supplications: no Speaker for the raw speaker "${entity}"`);
  const [nameEn, nameUr, includesProphet] = speaker;
  return { id: slug(nameEn), nameEn, nameUr, includesProphet };
}

function supplicationOf(run: Run) {
  const contextType = oneOf(run, "context type", (r) => r.context_type);
  const kind = KIND_OF[contextType];
  if (!kind) throw new Error(`curate-supplications: no kind for the context type "${contextType}"`);
  return {
    surah: run.surah,
    ayahFrom: run.ayahFrom,
    ayahTo: run.ayahTo,
    speakerId: speakerOf(oneOf(run, "speaker", (r) => r.entity)).id,
    openings: OPENINGS.filter((o) => run.rows.some((r) => r.invocation_form === o)),
    kind,
  };
}

const rows = (JSON.parse(fs.readFileSync(RAW, "utf8")) as RawRow[]).toSorted((a, b) => a.surah - b.surah || a.ayah - b.ayah);
const entities = [...new Set(rows.map((r) => r.entity))].toSorted();
const curated = {
  speakers: entities.map(speakerOf).toSorted((a, b) => a.id.localeCompare(b.id)),
  supplications: curatedRuns(rows).map(supplicationOf),
};
fs.mkdirSync(fileURLToPath(new URL("../data/supplications/", import.meta.url)), { recursive: true });
fs.writeFileSync(CURATED, `${JSON.stringify(curated, null, 2)}\n`);
const count = curated.supplications.filter((s) => s.kind === "supplication").length;
console.log(`curate-supplications: ${curated.speakers.length} Speakers, ${count} Supplications, ${curated.supplications.length - count} Other words to Allah`);
