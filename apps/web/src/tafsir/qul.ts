// QUL's Tafsir format read into Tafsir entries (#233, ADR 0053, ADR 0054):
// a JSON object keyed by Ayah ("s:a"), each key holding either the entry that
// begins there, { text, ayah_keys }, its Ayahs in order, or the key of the
// entry it belongs to. The text is kept exactly as published, its bold and
// italic markup with it. A file breaking the format, or giving an Ayah no
// Surah has, is refused whole, naming the key.

/** One Tafsir entry: the Ayahs it was written for, consecutive in one Surah, and its text as published. */
export interface TafsirEntry {
  surah: number;
  firstAyah: number;
  lastAyah: number;
  text: string;
}

/** Why a file could not be read as Tafsir entries. */
export class TafsirRefused extends Error {}

/** The Surah and Ayah Ayah key `key` names, when it is written "s:a" in whole numbers. */
function ayahOf(key: string): [number, number] | undefined {
  const match = /^([1-9]\d{0,2}):([1-9]\d{0,2})$/.exec(key);
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

/** The entry key `key` holds, `holding`, checked against the Surahs' lengths. */
function entryOf(key: string, holding: unknown, ayahCount: (surah: number) => number): TafsirEntry {
  const { text, ayah_keys: keys } = holding as { text?: unknown; ayah_keys?: unknown };
  if (typeof text !== "string" || !text.trim()) throw new TafsirRefused(`${key} holds no text`);
  if (!Array.isArray(keys) || keys.length === 0) throw new TafsirRefused(`${key} holds no ayah_keys`);
  const [surah, firstAyah] = ayahOf(key)!;
  keys.forEach((other, i) => {
    if (other !== `${surah}:${firstAyah + i}`) throw new TafsirRefused(`${key}'s ayah_keys are not consecutive Ayahs of Surah ${surah}: ${JSON.stringify(keys)}`);
  });
  const lastAyah = firstAyah + keys.length - 1;
  if (lastAyah > ayahCount(surah)) throw new TafsirRefused(`${key}'s ayah_keys run past Surah ${surah}'s last Ayah`);
  return { surah, firstAyah, lastAyah, text };
}

/**
 * The Tafsir entries QUL's file `qul` holds, in Quran order; TafsirRefused,
 * naming the key, when it breaks the format: a key that is no Ayah of the
 * Quran (by `ayahCount`, each Surah's Ayahs), an entry whose Ayahs do not run
 * on from its own key within its Surah, a blank text, a pointer to a key that
 * holds no entry covering it, or an Ayah in two entries.
 */
export function tafsirEntriesOf(qul: unknown, ayahCount: (surah: number) => number): TafsirEntry[] {
  if (typeof qul !== "object" || qul === null || Array.isArray(qul)) throw new TafsirRefused("the file is not a JSON object keyed by Ayah");
  const held = qul as Record<string, unknown>;
  for (const key of Object.keys(held)) {
    const ayah = ayahOf(key);
    if (!ayah || ayah[1] > ayahCount(ayah[0])) throw new TafsirRefused(`${key} is no Ayah of the Quran`);
  }
  const entries = Object.entries(held)
    .filter(([, holding]) => typeof holding !== "string")
    .map(([key, holding]) => entryOf(key, holding, ayahCount));
  const covered = new Map<string, TafsirEntry>();
  for (const entry of entries)
    for (let ayah = entry.firstAyah; ayah <= entry.lastAyah; ayah++) {
      const key = `${entry.surah}:${ayah}`;
      if (covered.has(key)) throw new TafsirRefused(`${key} is in more than one entry`);
      covered.set(key, entry);
    }
  for (const [key, holding] of Object.entries(held)) {
    if (typeof holding !== "string") continue;
    const entry = covered.get(key);
    if (!entry || `${entry.surah}:${entry.firstAyah}` !== holding) throw new TafsirRefused(`${key} points to ${holding}, which holds no entry covering ${key}`);
  }
  return entries.sort((a, b) => a.surah - b.surah || a.firstAyah - b.firstAyah);
}
